/**
 * Viga continua de Euler-Bernoulli: reacciones, cortante, momento y flecha.
 *
 * El formulario de vigas clásico son unos treinta casos tabulados —simplemente
 * apoyada con carga uniforme, empotrada-apoyada con puntual, dos tramos, voladizo,
 * …— cada uno con sus cuatro o cinco fórmulas. Transcribirlos es transcribir
 * ciento cincuenta expresiones que después nadie vuelve a revisar, y que además
 * no cubren el caso de al lado: la carga que no está centrada, el voladizo que
 * el cuadro no trae, los tres tramos desiguales.
 *
 * Acá hay un solo método —rigidez directa con elementos de viga— y los casos de
 * la tabla son datos de entrada, no código. La tabla pasa a ser lo que
 * verifica el motor, no lo que lo implementa: los tests contrastan contra
 * wL²/8, 5wL⁴/384EI, 9wL²/128 y compañía.
 *
 * Nada de esto es normativo. Es estática lineal: no mayora ni minora nada, y el
 * resultado tiene el mismo carácter que la carga que se le dio de comer.
 *
 * Convenios, que es donde se pierde media hora si no están escritos:
 *  - x crece hacia la derecha, en metros, desde el extremo izquierdo.
 *  - Las cargas se cargan **positivas hacia abajo** (que es como se piensan).
 *  - La flecha es positiva hacia arriba, así que una viga cargada da negativo.
 *  - El momento es positivo cuando tracciona la fibra inferior (flexión
 *    positiva, la de la viga simplemente apoyada).
 *  - Los momentos aplicados y las reacciones de empotramiento son positivos
 *    antihorarios.
 */

export type TipoApoyo = "libre" | "simple" | "empotrado";

export interface NodoViga {
  xM: number;
  apoyo: TipoApoyo;
}

export interface CargaPuntual {
  tipo: "puntual";
  xM: number;
  /** Positiva hacia abajo. */
  pKN: number;
}

export interface CargaMomento {
  tipo: "momento";
  xM: number;
  /** Positivo antihorario. */
  mKNm: number;
}

/** Trapecial: con q inicial igual a la final queda uniforme, y con una en cero, triangular. */
export interface CargaDistribuida {
  tipo: "distribuida";
  desdeM: number;
  hastaM: number;
  qInicialKNm: number;
  qFinalKNm: number;
}

export type CargaViga = CargaPuntual | CargaMomento | CargaDistribuida;

export interface EntradaViga {
  largoM: number;
  /** Al menos los dos extremos. Se ordenan solos. */
  nodos: NodoViga[];
  cargas: CargaViga[];
  /** Rigidez a flexión E·I, en kN·m². */
  eiKNm2: number;
  /** Puntos por tramo en que se muestrean los diagramas. */
  muestrasPorTramo?: number;
}

export interface PuntoViga {
  xM: number;
  cortanteKN: number;
  momentoKNm: number;
  /** Positiva hacia arriba; una viga cargada da negativo. */
  flechaMm: number;
}

export interface ReaccionViga {
  xM: number;
  tipo: TipoApoyo;
  /** Positiva hacia arriba. */
  rKN: number;
  /** Sólo en empotramientos; positivo antihorario. */
  mKNm: number;
}

export interface ExtremoViga {
  xM: number;
  valor: number;
}

export interface ResultadoViga {
  reacciones: ReaccionViga[];
  puntos: PuntoViga[];
  cortanteMax: ExtremoViga;
  momentoMax: ExtremoViga;
  momentoMin: ExtremoViga;
  /** Flecha más desfavorable, en mm y con su signo. */
  flechaMax: ExtremoViga;
  /** Relación L/δ con la flecha máxima en valor absoluto. Infinity si no flecta. */
  relacionLSobreFlecha: number;
  /** Comprobación interna: suma de reacciones menos carga total, en kN. */
  desequilibrioKN: number;
}

// --------------------------------------------------------------------------
// Cuadratura e interpolación
// --------------------------------------------------------------------------

/**
 * Gauss-Legendre de 4 puntos sobre [0,1]. Integra exacto hasta grado 7, que
 * cubre de sobra lo que se necesita acá (el producto de una carga lineal por
 * una función de forma cúbica es grado 4).
 *
 * Los nodos y pesos no se dan por buenos de memoria: el test `cuadratura`
 * verifica que integre exacto x⁰ … x⁷.
 */
const GAUSS_NODOS = [
  -0.8611363115940526, -0.3399810435848563, 0.3399810435848563, 0.8611363115940526,
];
const GAUSS_PESOS = [
  0.3478548451374538, 0.6521451548625461, 0.6521451548625461, 0.3478548451374538,
];

/** Integra f sobre [0,1] con la regla de arriba. */
function integrar01(f: (t: number) => number): number {
  let s = 0;
  for (let i = 0; i < GAUSS_NODOS.length; i++) {
    // De [-1,1] a [0,1]: el cambio de variable divide el peso por dos.
    s += (GAUSS_PESOS[i] / 2) * f((GAUSS_NODOS[i] + 1) / 2);
  }
  return s;
}

/**
 * Funciones de forma de Hermite del elemento de viga, en la coordenada
 * adimensional t = x/L y para el vector [v_i, θ_i, v_j, θ_j].
 *
 * Son la única fuente de verdad del elemento: de acá salen tanto la matriz de
 * rigidez como el vector de cargas equivalentes, por integración. No hay una
 * matriz 4×4 transcripta ni una tabla de momentos de empotramiento perfecto,
 * que son justamente los dos lugares donde se cuela un signo cambiado.
 */
function formas(t: number, largo: number): number[] {
  const t2 = t * t;
  const t3 = t2 * t;
  return [
    1 - 3 * t2 + 2 * t3,
    largo * (t - 2 * t2 + t3),
    3 * t2 - 2 * t3,
    largo * (t3 - t2),
  ];
}

/** Derivada segunda respecto de x (de ahí el 1/L²). */
function formasSegunda(t: number, largo: number): number[] {
  return [
    (-6 + 12 * t) / (largo * largo),
    (-4 + 6 * t) / largo,
    (6 - 12 * t) / (largo * largo),
    (-2 + 6 * t) / largo,
  ];
}

/** Derivada primera respecto de x, para las cargas de momento concentrado. */
function formasPrimera(t: number, largo: number): number[] {
  const t2 = t * t;
  return [
    (-6 * t + 6 * t2) / largo,
    1 - 4 * t + 3 * t2,
    (6 * t - 6 * t2) / largo,
    -2 * t + 3 * t2,
  ];
}

// --------------------------------------------------------------------------
// Álgebra
// --------------------------------------------------------------------------

/** Gauss con pivoteo parcial. Devuelve null si el sistema es singular. */
function resolver(a: number[][], b: number[]): number[] | null {
  const n = b.length;
  const m = a.map((fila, i) => [...fila, b[i]]);
  const escala = Math.max(1, ...m.flat().map(Math.abs));

  for (let col = 0; col < n; col++) {
    let mejor = col;
    for (let f = col + 1; f < n; f++) {
      if (Math.abs(m[f][col]) > Math.abs(m[mejor][col])) mejor = f;
    }
    if (Math.abs(m[mejor][col]) < 1e-12 * escala) return null;
    [m[col], m[mejor]] = [m[mejor], m[col]];

    for (let f = col + 1; f < n; f++) {
      const factor = m[f][col] / m[col][col];
      if (factor === 0) continue;
      for (let c = col; c <= n; c++) m[f][c] -= factor * m[col][c];
    }
  }

  const x = new Array<number>(n).fill(0);
  for (let f = n - 1; f >= 0; f--) {
    let s = m[f][n];
    for (let c = f + 1; c < n; c++) s -= m[f][c] * x[c];
    x[f] = s / m[f][f];
  }
  return x;
}

// --------------------------------------------------------------------------
// Armado
// --------------------------------------------------------------------------

/** Con qué holgura se consideran iguales dos abscisas. Una sola para todo. */
const TOL_X = 1e-7;

/**
 * Carga repartida en los dos extremos de un elemento.
 *
 * Como los elementos se cortan justo donde arranca y donde termina cada
 * trapecio, un trapecio o cubre el elemento entero o no lo toca. Eso evita
 * tener que decidir de qué lado del borde se está, que es donde se cuela un
 * error del orden del salto de carga.
 */
function qDelElemento(
  cargas: readonly CargaViga[],
  x0: number,
  x1: number
): [number, number] {
  let q0 = 0;
  let q1 = 0;
  for (const c of cargas) {
    if (c.tipo !== "distribuida") continue;
    if (c.desdeM > x0 + TOL_X || c.hastaM < x1 - TOL_X) continue;
    const largo = c.hastaM - c.desdeM;
    if (largo < TOL_X) continue;
    const en = (x: number) =>
      c.qInicialKNm + ((c.qFinalKNm - c.qInicialKNm) * (x - c.desdeM)) / largo;
    q0 += en(x0);
    q1 += en(x1);
  }
  return [q0, q1];
}

/**
 * Abscisas donde la viga tiene que cortarse en elementos: apoyos, cargas
 * puntuales, momentos aplicados y arranque y fin de cada trapecio.
 *
 * Cortando ahí, dentro de cada elemento la carga distribuida es exactamente
 * lineal, y entonces el método deja de ser aproximado: la solución del elemento
 * de viga es la solución exacta de la ecuación diferencial.
 */
function abscisasDeCorte(entrada: EntradaViga): number[] {
  const xs = [0, entrada.largoM];
  for (const n of entrada.nodos) xs.push(n.xM);
  for (const c of entrada.cargas) {
    if (c.tipo === "distribuida") xs.push(c.desdeM, c.hastaM);
    else xs.push(c.xM);
  }

  const dentro = xs.filter((x) => x >= -TOL_X && x <= entrada.largoM + TOL_X);
  const ordenadas = [...dentro].sort((a, b) => a - b);
  const unicas: number[] = [];
  for (const x of ordenadas) {
    if (unicas.length === 0 || x - unicas[unicas.length - 1] > TOL_X) unicas.push(x);
  }
  return unicas;
}

interface Elemento {
  i: number;
  j: number;
  x0: number;
  largo: number;
  q0: number;
  q1: number;
}

export function calcularVigaContinua(entrada: EntradaViga): ResultadoViga {
  const { largoM, eiKNm2, cargas } = entrada;

  if (!(largoM > 0)) throw new Error("La luz total tiene que ser mayor que cero.");
  if (!(eiKNm2 > 0)) throw new Error("La rigidez EI tiene que ser mayor que cero.");
  for (const c of entrada.cargas) {
    const xs = c.tipo === "distribuida" ? [c.desdeM, c.hastaM] : [c.xM];
    if (xs.some((x) => x < -TOL_X || x > largoM + TOL_X)) {
      throw new Error("Hay una carga fuera de la viga.");
    }
  }

  const xs = abscisasDeCorte(entrada);
  const nNodos = xs.length;

  // Apoyo de cada nodo. El que no coincide con ninguno declarado queda libre.
  const apoyos: TipoApoyo[] = xs.map((x) => {
    const n = entrada.nodos.find((nd) => Math.abs(nd.xM - x) < TOL_X);
    return n ? n.apoyo : "libre";
  });
  if (!apoyos.some((a) => a !== "libre")) {
    throw new Error("La viga no tiene ningún apoyo.");
  }

  const elementos: Elemento[] = [];
  for (let e = 0; e < nNodos - 1; e++) {
    const x0 = xs[e];
    const x1 = xs[e + 1];
    const [q0, q1] = qDelElemento(cargas, x0, x1);
    elementos.push({ i: e, j: e + 1, x0, largo: x1 - x0, q0, q1 });
  }

  const nGdl = 2 * nNodos;
  const K: number[][] = Array.from({ length: nGdl }, () => new Array<number>(nGdl).fill(0));
  const F = new Array<number>(nGdl).fill(0);

  const gdlDe = (el: Elemento) => [2 * el.i, 2 * el.i + 1, 2 * el.j, 2 * el.j + 1];

  const rigidezElemento = (el: Elemento) =>
    Array.from({ length: 4 }, (_, a) =>
      Array.from({ length: 4 }, (_, b) =>
        // K_ab = ∫ EI·N''_a·N''_b dx, con dx = L·dt.
        el.largo * eiKNm2 * integrar01((t) => {
          const n2 = formasSegunda(t, el.largo);
          return n2[a] * n2[b];
        })
      )
    );

  /**
   * Cargas nodales equivalentes de la carga repartida. Signo negativo porque la
   * carga se da hacia abajo y el grado de libertad es positivo hacia arriba.
   */
  const cargaElemento = (el: Elemento) =>
    Array.from({ length: 4 }, (_, a) =>
      -el.largo * integrar01((t) => {
        const q = el.q0 + (el.q1 - el.q0) * t;
        return q * formas(t, el.largo)[a];
      })
    );

  const rigideces = elementos.map(rigidezElemento);
  const fuerzas = elementos.map(cargaElemento);

  elementos.forEach((el, e) => {
    const g = gdlDe(el);
    for (let a = 0; a < 4; a++) {
      F[g[a]] += fuerzas[e][a];
      for (let b = 0; b < 4; b++) K[g[a]][g[b]] += rigideces[e][a][b];
    }
  });

  // Cargas concentradas: van directo al nodo, que por construcción existe.
  const nodoEn = (x: number) => xs.findIndex((xn) => Math.abs(xn - x) < TOL_X);
  for (const c of cargas) {
    if (c.tipo === "puntual") F[2 * nodoEn(c.xM)] -= c.pKN;
    else if (c.tipo === "momento") F[2 * nodoEn(c.xM) + 1] += c.mKNm;
  }

  // Condiciones de apoyo: se eliminan los grados de libertad restringidos.
  const fijo = new Array<boolean>(nGdl).fill(false);
  apoyos.forEach((a, n) => {
    if (a === "simple" || a === "empotrado") fijo[2 * n] = true;
    if (a === "empotrado") fijo[2 * n + 1] = true;
  });

  const libres: number[] = [];
  for (let g = 0; g < nGdl; g++) if (!fijo[g]) libres.push(g);

  const solucion = resolver(
    libres.map((a) => libres.map((b) => K[a][b])),
    libres.map((a) => F[a])
  );
  if (!solucion) {
    throw new Error(
      "La viga es un mecanismo: con los apoyos declarados puede desplazarse o girar sin deformarse."
    );
  }

  const d = new Array<number>(nGdl).fill(0);
  libres.forEach((g, k) => (d[g] = solucion[k]));

  // ---------------------------------------------------------------- reacciones
  const reacciones: ReaccionViga[] = [];
  apoyos.forEach((tipo, n) => {
    if (tipo === "libre") return;
    const fuerza = K[2 * n].reduce((s, k, c) => s + k * d[c], 0) - F[2 * n];
    const momento =
      tipo === "empotrado" ? K[2 * n + 1].reduce((s, k, c) => s + k * d[c], 0) - F[2 * n + 1] : 0;
    reacciones.push({ xM: xs[n], tipo, rKN: fuerza, mKNm: momento });
  });

  // ------------------------------------------------- esfuerzos y deformada
  const muestras = Math.max(8, entrada.muestrasPorTramo ?? 60);
  const puntos: PuntoViga[] = [];
  let cortanteMax: ExtremoViga = { xM: 0, valor: 0 };
  let momentoMax: ExtremoViga = { xM: 0, valor: 0 };
  let momentoMin: ExtremoViga = { xM: 0, valor: 0 };
  let flechaMax: ExtremoViga = { xM: 0, valor: 0 };

  elementos.forEach((el, e) => {
    const g = gdlDe(el);
    const de = g.map((gg) => d[gg]);
    // Fuerzas en los extremos de la barra: rigidez por desplazamiento, menos lo
    // que ya se había repartido como carga nodal equivalente.
    const s = Array.from({ length: 4 }, (_, a) =>
      rigideces[e][a].reduce((acc, k, b) => acc + k * de[b], 0) - fuerzas[e][a]
    );

    const v0 = s[0]; // cortante justo a la derecha del nodo i
    const m0 = -s[1]; // momento flector ahí mismo, con tracción abajo positiva
    const giro0 = de[1];
    const flecha0 = de[0];
    const { q0, q1, largo: L } = el;
    const dq = q1 - q0;

    // Integración exacta de V' = −q, M' = V, EI·θ' = M, v' = θ para q lineal.
    const cortante = (x: number) => v0 - q0 * x - (dq * x * x) / (2 * L);
    const momento = (x: number) => m0 + v0 * x - (q0 * x * x) / 2 - (dq * x ** 3) / (6 * L);
    const giro = (x: number) =>
      giro0 +
      (m0 * x + (v0 * x * x) / 2 - (q0 * x ** 3) / 6 - (dq * x ** 4) / (24 * L)) / eiKNm2;
    const flecha = (x: number) =>
      flecha0 +
      giro0 * x +
      ((m0 * x * x) / 2 + (v0 * x ** 3) / 6 - (q0 * x ** 4) / 24 - (dq * x ** 5) / (120 * L)) /
        eiKNm2;

    for (let k = 0; k <= muestras; k++) {
      // El primer punto de cada elemento se repite con el último del anterior a
      // propósito: es donde el cortante salta, y el salto tiene que verse.
      const x = (L * k) / muestras;
      puntos.push({
        xM: el.x0 + x,
        cortanteKN: cortante(x),
        momentoKNm: momento(x),
        flechaMm: flecha(x) * 1000,
      });
    }

    const anotar = (x: number) => {
      const xg = el.x0 + x;
      const v = cortante(x);
      const m = momento(x);
      const f = flecha(x) * 1000;
      if (superaEnModulo(v, cortanteMax.valor)) cortanteMax = { xM: xg, valor: v };
      if (m > momentoMax.valor) momentoMax = { xM: xg, valor: m };
      if (m < momentoMin.valor) momentoMin = { xM: xg, valor: m };
      if (superaEnModulo(f, flechaMax.valor)) flechaMax = { xM: xg, valor: f };
    };

    anotar(0);
    anotar(L);
    // El momento es cúbico: sus extremos están donde el cortante (cuadrático) se
    // anula, y ahí se calculan exactos en vez de buscarlos por muestreo.
    for (const x of raicesCuadratica(-dq / (2 * L), -q0, v0, L)) anotar(x);
    // La flecha extrema está donde el giro se anula; el giro es un polinomio de
    // grado cuatro, así que se lo busca por cambio de signo y bisección.
    for (const x of ceros(giro, L, muestras)) anotar(x);
  });

  const cargaTotal =
    cargas.reduce((s, c) => {
      if (c.tipo === "puntual") return s + c.pKN;
      if (c.tipo !== "distribuida") return s;
      return s + ((c.qInicialKNm + c.qFinalKNm) / 2) * (c.hastaM - c.desdeM);
    }, 0);
  const desequilibrioKN = reacciones.reduce((s, r) => s + r.rKN, 0) - cargaTotal;

  return {
    reacciones,
    puntos,
    cortanteMax,
    momentoMax,
    momentoMin,
    flechaMax,
    relacionLSobreFlecha:
      Math.abs(flechaMax.valor) < 1e-12 ? Infinity : (largoM * 1000) / Math.abs(flechaMax.valor),
    desequilibrioKN,
  };
}

/**
 * Si el candidato supera en módulo al que ya está guardado, con holgura.
 *
 * La holgura no es cosmética: en una viga simétrica el cortante vale +wL/2 en un
 * apoyo y −wL/2 en el otro, y sin margen el ruido del último bit decide cuál de
 * los dos se informa. Con margen gana el primero, que es reproducible.
 */
function superaEnModulo(candidato: number, actual: number): boolean {
  return Math.abs(candidato) > Math.abs(actual) * (1 + 1e-9) + 1e-12;
}

/** Raíces de a·x² + b·x + c dentro de [0, largo]. */
function raicesCuadratica(a: number, b: number, c: number, largo: number): number[] {
  const dentro = (x: number) => (x > 0 && x < largo ? [x] : []);
  if (Math.abs(a) < 1e-14) {
    return Math.abs(b) < 1e-14 ? [] : dentro(-c / b);
  }
  const disc = b * b - 4 * a * c;
  if (disc < 0) return [];
  const r = Math.sqrt(disc);
  return [...dentro((-b + r) / (2 * a)), ...dentro((-b - r) / (2 * a))];
}

/** Ceros de una función continua en (0, largo), por cambio de signo y bisección. */
function ceros(f: (x: number) => number, largo: number, pasos: number): number[] {
  const salida: number[] = [];
  let xa = 0;
  let fa = f(0);
  for (let k = 1; k <= pasos; k++) {
    const xb = (largo * k) / pasos;
    const fb = f(xb);
    if (fa === 0) salida.push(xa);
    else if (fa * fb < 0) {
      let lo = xa;
      let hi = xb;
      for (let it = 0; it < 60; it++) {
        const med = (lo + hi) / 2;
        if (f(lo) * f(med) <= 0) hi = med;
        else lo = med;
      }
      salida.push((lo + hi) / 2);
    }
    xa = xb;
    fa = fb;
  }
  return salida;
}

/** Se exporta sólo para que el test pueda verificar la cuadratura por su cuenta. */
export const _interno = { integrar01, formas, formasPrimera, formasSegunda };
