/**
 * Uniones con medios de fijación de tipo clavija: art. 8.2 (teoría de
 * Johansen), con fh,0,k y My,Rk del art. 8.5 para pernos.
 *
 * El método consiste en escribir todos los modos de fallo posibles y quedarse
 * con el menor. Eso hace que **omitir un modo sea siempre inseguro**: el mínimo
 * de menos candidatos nunca es más chico. Es la trampa principal del artículo,
 * y la razón de que este módulo escriba los seis modos de la ec. (8.6) aunque
 * en la mayoría de los casos gobierne siempre el mismo.
 *
 * La nota del art. 8.2.2(1) lo dice: con medios de fijación esbeltos —que es lo
 * normal— gobiernan los modos (f) y (k), los de doble rótula plástica. Son
 * justamente los que más se olvidan al armar la planilla a mano, porque no
 * tienen forma de «tensión por área» sino de raíz de un producto.
 */

/** Especie a efectos de k90, ec. (8.33). */
export type EspecieUnion = "conifera" | "lvl" | "frondosa";

export const NOMBRE_ESPECIE_UNION: Record<EspecieUnion, string> = {
  conifera: "Conífera",
  lvl: "Microlaminada (LVL)",
  frondosa: "Frondosa",
};

/**
 * Ec. (8.33). El diámetro va en milímetros: es el error de unidades más fácil
 * de cometer en todo el capítulo, porque el resto del cálculo trabaja en metros.
 */
export function k90(especie: EspecieUnion, diametroMm: number): number {
  const base = especie === "conifera" ? 1.35 : especie === "lvl" ? 1.3 : 0.9;
  return base + 0.015 * diametroMm;
}

/**
 * Resistencia al aplastamiento paralela a la fibra, ec. (8.32).
 *
 *     fh,0,k = 0,082 · (1 − 0,01·d) · ρk
 *
 * **d en milímetros.** Con d en metros el paréntesis vale prácticamente 1 y la
 * resistencia sale un 10-15 % alta, que es exactamente lo que pasa en una de
 * las columnas de la planilla original.
 */
export function fh0k(diametroMm: number, densidadKgM3: number): number {
  return 0.082 * (1 - 0.01 * diametroMm) * densidadKgM3;
}

/** Ec. (8.31): la resistencia cae al cargar en ángulo con la fibra. */
export function fhAlphaK(
  fh0kMPa: number,
  k90Valor: number,
  anguloGrados: number
): number {
  const a = (anguloGrados * Math.PI) / 180;
  return fh0kMPa / (k90Valor * Math.sin(a) ** 2 + Math.cos(a) ** 2);
}

/**
 * Momento plástico del perno, ec. (8.30). Devuelve N·mm.
 *
 *     My,Rk = 0,3 · fu,k · d^2,6
 *
 * fu,k es la resistencia a **tracción** del acero del perno, no su límite
 * elástico. Usar fy,k acá subestima la capacidad de los modos dúctiles.
 */
export function myRkNmm(fukMPa: number, diametroMm: number): number {
  return 0.3 * fukMPa * Math.pow(diametroMm, 2.6);
}

export interface ModoFallo {
  /** Letra con que la norma lo identifica en las figuras 8.2 y 8.3. */
  letra: string;
  /** Descripción corta de qué pasa físicamente. */
  descripcion: string;
  /**
   * true si el modo implica al menos una rótula plástica en la clavija.
   *
   * Va como dato y no se deduce de la letra a propósito: la misma letra
   * significa cosas distintas según la configuración —la (h) es aplastamiento
   * de la pieza central en la ec. (8.7) y doble rótula en la (8.11)—, así que
   * cualquier regla basada en la letra se equivoca en algún caso.
   *
   * Importa porque decide qué hacer si la unión no verifica: con modo dúctil,
   * engrosar la madera no cambia nada y hay que ir a una clavija mayor; con
   * modo de aplastamiento, al revés.
   */
  ductil: boolean;
  /** Capacidad de ese modo, en kN por plano de cortadura y por medio. */
  valorKN: number;
}

export interface ResultadoUnion {
  modos: ModoFallo[];
  /** El menor de todos: es el que gobierna. */
  gobierna: ModoFallo;
  /** Parte de Johansen, sin efecto soga. */
  johansenKN: number;
  /** Aporte del efecto soga ya topado por el art. 8.2.2(2). */
  efectoSogaKN: number;
  /** Fv,Rk por plano y por medio, en kN. */
  fvRkKN: number;
}

/**
 * Tope del efecto soga como porcentaje de la parte de Johansen, art. 8.2.2(2).
 *
 * Los pasadores tienen 0 %: sin cabeza ni rosca no hay nada que tire. Es la
 * diferencia práctica entre pasador y perno, y por eso conviene declararla.
 */
export type TipoClavija = "perno" | "pasador" | "clavo-circular" | "tirafondo";

export const TOPE_SOGA: Record<TipoClavija, number> = {
  perno: 0.25,
  pasador: 0,
  "clavo-circular": 0.15,
  tirafondo: 1.0,
};

export const NOMBRE_CLAVIJA: Record<TipoClavija, string> = {
  perno: "Perno",
  pasador: "Pasador (sin efecto soga)",
  "clavo-circular": "Clavo de sección circular",
  tirafondo: "Tirafondo",
};

/** Aplica el mínimo, el efecto soga y su tope. */
function componer(
  modos: ModoFallo[],
  faxRkKN: number,
  tipo: TipoClavija
): ResultadoUnion {
  const gobierna = modos.reduce((a, b) => (b.valorKN < a.valorKN ? b : a));
  const johansenKN = gobierna.valorKN;

  const aporte = faxRkKN / 4;
  const efectoSogaKN = Math.min(aporte, TOPE_SOGA[tipo] * johansenKN);

  return {
    modos,
    gobierna,
    johansenKN,
    efectoSogaKN,
    fvRkKN: johansenKN + efectoSogaKN,
  };
}

/* ------------------------------------------------------------------ *
 * 8.2.2 — Madera-madera y tablero-madera
 * ------------------------------------------------------------------ */

export interface EntradaMaderaMadera {
  /** Diámetro, en mm. */
  dMm: number;
  /** Espesor o penetración de la pieza 1, en mm. */
  t1Mm: number;
  /** Espesor de la pieza 2 (central en doble cortadura), en mm. */
  t2Mm: number;
  fh1kMPa: number;
  fh2kMPa: number;
  myRkNmm: number;
  faxRkKN: number;
  tipo: TipoClavija;
}

/**
 * Cortadura simple madera-madera, ec. (8.6). Seis modos.
 *
 * Los seis hacen falta. La planilla original escribe sólo tres —(a), (b) y una
 * versión de (c)— y con eso el mínimo se toma sobre menos candidatos, o sea que
 * devuelve una capacidad mayor que la real siempre que gobierne uno de los que
 * faltan. Y falta justamente el (f), que según la nota del art. 8.2.2(1) es el
 * determinante en medios de fijación esbeltos.
 */
export function cortaduraSimpleMaderaMadera(e: EntradaMaderaMadera): ResultadoUnion {
  const { dMm: d, t1Mm: t1, t2Mm: t2, fh1kMPa: fh1, fh2kMPa: fh2, myRkNmm: my } = e;
  const beta = fh1 > 0 ? fh2 / fh1 : 0;
  const r = t1 > 0 ? t2 / t1 : 0;

  // Las expresiones dan newtons; se pasa a kN al armar cada modo.
  const kN = (n: number) => n / 1000;

  const a = fh1 * t1 * d;
  const b = fh2 * t2 * d;

  const radicandoC = beta + 2 * beta ** 2 * (1 + r + r ** 2) + beta ** 3 * r ** 2;
  const c =
    ((fh1 * t1 * d) / (1 + beta)) *
    (Math.sqrt(Math.max(radicandoC, 0)) - beta * (1 + r));

  const radicandoD = 2 * beta * (1 + beta) + (4 * beta * (2 + beta) * my) / (fh1 * d * t1 ** 2);
  const dModo =
    ((1.05 * fh1 * t1 * d) / (2 + beta)) * (Math.sqrt(Math.max(radicandoD, 0)) - beta);

  const radicandoE = 2 * beta ** 2 * (1 + beta) + (4 * beta * (1 + 2 * beta) * my) / (fh1 * d * t2 ** 2);
  const eModo =
    ((1.05 * fh1 * t2 * d) / (1 + 2 * beta)) * (Math.sqrt(Math.max(radicandoE, 0)) - beta);

  const f = 1.15 * Math.sqrt((2 * beta) / (1 + beta)) * Math.sqrt(2 * my * fh1 * d);

  const modos: ModoFallo[] = [
    { letra: "a", descripcion: "Aplastamiento de la pieza 1, sin rótula", ductil: false, valorKN: kN(a) },
    { letra: "b", descripcion: "Aplastamiento de la pieza 2, sin rótula", ductil: false, valorKN: kN(b) },
    { letra: "c", descripcion: "Giro de la clavija, sin rótula plástica", ductil: false, valorKN: kN(c) },
    { letra: "d", descripcion: "Una rótula plástica, en la pieza 2", ductil: true, valorKN: kN(dModo) },
    { letra: "e", descripcion: "Una rótula plástica, en la pieza 1", ductil: true, valorKN: kN(eModo) },
    { letra: "f", descripcion: "Dos rótulas plásticas en la clavija", ductil: true, valorKN: kN(f) },
  ];

  return componer(modos, e.faxRkKN, e.tipo);
}

/** Cortadura doble madera-madera, ec. (8.7). Cuatro modos. */
export function cortaduraDobleMaderaMadera(e: EntradaMaderaMadera): ResultadoUnion {
  const { dMm: d, t1Mm: t1, t2Mm: t2, fh1kMPa: fh1, fh2kMPa: fh2, myRkNmm: my } = e;
  const beta = fh1 > 0 ? fh2 / fh1 : 0;
  const kN = (n: number) => n / 1000;

  const g = fh1 * t1 * d;
  const h = 0.5 * fh2 * t2 * d;

  const radicandoJ = 2 * (1 + beta) + (4 * beta * (2 + beta) * my) / (fh1 * d * t1 ** 2);
  const j = ((1.05 * fh1 * t1 * d) / (2 + beta)) * (Math.sqrt(Math.max(radicandoJ, 0)) - beta);

  const k = 1.15 * Math.sqrt((2 * beta) / (1 + beta)) * Math.sqrt(2 * my * fh1 * d);

  const modos: ModoFallo[] = [
    { letra: "g", descripcion: "Aplastamiento de las piezas laterales", ductil: false, valorKN: kN(g) },
    { letra: "h", descripcion: "Aplastamiento de la pieza central", ductil: false, valorKN: kN(h) },
    { letra: "j", descripcion: "Una rótula plástica en cada plano", ductil: true, valorKN: kN(j) },
    { letra: "k", descripcion: "Dos rótulas plásticas en la clavija", ductil: true, valorKN: kN(k) },
  ];

  return componer(modos, e.faxRkKN, e.tipo);
}

/* ------------------------------------------------------------------ *
 * 8.2.3 — Acero-madera
 * ------------------------------------------------------------------ */

/**
 * Clasificación de la chapa, art. 8.2.3(1).
 *
 * Delgada: espesor ≤ 0,5·d. Gruesa: espesor ≥ d con tolerancia de agujero
 * menor que 0,1·d. Entre las dos, la norma manda **interpolar linealmente**,
 * cosa que la planilla original no hace: clasifica con un IF y salta de un
 * régimen al otro. Entre 0,5·d y d el salto llega al 30 %.
 */
export type ClaseChapa = "delgada" | "gruesa" | "intermedia";

export function clasificarChapa(espesorMm: number, dMm: number): ClaseChapa {
  if (espesorMm <= 0.5 * dMm) return "delgada";
  if (espesorMm >= dMm) return "gruesa";
  return "intermedia";
}

export interface EntradaAceroMadera {
  dMm: number;
  /** Espesor de la pieza de madera relevante, en mm. */
  tMm: number;
  fhkMPa: number;
  myRkNmm: number;
  faxRkKN: number;
  tipo: TipoClavija;
  espesorChapaMm: number;
}

/** Ec. (8.12) y (8.13): chapas exteriores en cortadura doble. */
export function chapasExterioresDoble(e: EntradaAceroMadera): ResultadoUnion {
  const { dMm: d, tMm: t, fhkMPa: fh, myRkNmm: my } = e;
  const kN = (n: number) => n / 1000;
  const clase = clasificarChapa(e.espesorChapaMm, d);

  const aplastamiento = 0.5 * fh * t * d;
  const delgadaDuctil = 1.15 * Math.sqrt(2 * my * fh * d);
  const gruesaDuctil = 2.3 * Math.sqrt(my * fh * d);

  // La interpolación del art. 8.2.3(1) se hace sobre el modo dúctil, que es el
  // único que cambia entre los dos regímenes.
  const fraccion =
    clase === "delgada" ? 0 : clase === "gruesa" ? 1 : (e.espesorChapaMm - 0.5 * d) / (0.5 * d);
  const ductil = delgadaDuctil + fraccion * (gruesaDuctil - delgadaDuctil);

  const modos: ModoFallo[] = [
    {
      letra: clase === "gruesa" ? "l" : "j",
      descripcion: "Aplastamiento de la madera",
      ductil: false,
      valorKN: kN(aplastamiento),
    },
    {
      letra: clase === "gruesa" ? "m" : "k",
      ductil: true,
      descripcion:
        clase === "intermedia"
          ? "Rótulas plásticas, interpolado entre chapa delgada y gruesa"
          : "Rótulas plásticas en la clavija",
      valorKN: kN(ductil),
    },
  ];

  return componer(modos, e.faxRkKN, e.tipo);
}

/** Ec. (8.11): chapa central de cualquier espesor en cortadura doble. */
export function chapaCentralDoble(e: EntradaAceroMadera): ResultadoUnion {
  const { dMm: d, tMm: t1, fhkMPa: fh, myRkNmm: my } = e;
  const kN = (n: number) => n / 1000;

  const f = fh * t1 * d;
  const g = fh * t1 * d * (Math.sqrt(Math.max(2 + (4 * my) / (fh * d * t1 ** 2), 0)) - 1);
  const h = 2.3 * Math.sqrt(my * fh * d);

  const modos: ModoFallo[] = [
    { letra: "f", descripcion: "Aplastamiento de las piezas de madera", ductil: false, valorKN: kN(f) },
    { letra: "g", descripcion: "Una rótula plástica por plano", ductil: true, valorKN: kN(g) },
    { letra: "h", descripcion: "Dos rótulas plásticas en la clavija", ductil: true, valorKN: kN(h) },
  ];

  return componer(modos, e.faxRkKN, e.tipo);
}

/** Ecs. (8.9) y (8.10): cortadura simple contra chapa. */
export function cortaduraSimpleAcero(e: EntradaAceroMadera): ResultadoUnion {
  const { dMm: d, tMm: t1, fhkMPa: fh, myRkNmm: my } = e;
  const kN = (n: number) => n / 1000;
  const clase = clasificarChapa(e.espesorChapaMm, d);

  if (clase === "delgada") {
    return componer(
      [
        {
          letra: "a",
          descripcion: "Aplastamiento, chapa sin coaccionar la clavija",
          ductil: false,
          valorKN: kN(0.4 * fh * t1 * d),
        },
        {
          letra: "b",
          descripcion: "Una rótula plástica",
          ductil: true,
          valorKN: kN(1.15 * Math.sqrt(2 * my * fh * d)),
        },
      ],
      e.faxRkKN,
      e.tipo
    );
  }

  const c = fh * t1 * d;
  const dModo = fh * t1 * d * (Math.sqrt(Math.max(2 + (4 * my) / (fh * d * t1 ** 2), 0)) - 1);
  const eModo = 2.3 * Math.sqrt(my * fh * d);

  const modosGruesa: ModoFallo[] = [
    { letra: "c", descripcion: "Aplastamiento de la madera", ductil: false, valorKN: kN(c) },
    { letra: "d", descripcion: "Una rótula plástica", ductil: true, valorKN: kN(dModo) },
    { letra: "e", descripcion: "Dos rótulas plásticas en la clavija", ductil: true, valorKN: kN(eModo) },
  ];

  if (clase === "gruesa") return componer(modosGruesa, e.faxRkKN, e.tipo);

  // Intermedia: interpolar entre los dos regímenes completos.
  const delgada = componer(
    [
      { letra: "a", descripcion: "Chapa delgada", ductil: false, valorKN: kN(0.4 * fh * t1 * d) },
      {
        letra: "b",
        descripcion: "Chapa delgada, rótula",
        ductil: true,
        valorKN: kN(1.15 * Math.sqrt(2 * my * fh * d)),
      },
    ],
    0,
    e.tipo
  );
  const gruesa = componer(modosGruesa, 0, e.tipo);
  const fraccion = (e.espesorChapaMm - 0.5 * d) / (0.5 * d);
  const interpolado = delgada.johansenKN + fraccion * (gruesa.johansenKN - delgada.johansenKN);

  return componer(
    [
      {
        letra: "int",
        descripcion: "Interpolado entre chapa delgada y gruesa, art. 8.2.3(1)",
        // Hereda el carácter del régimen que gobierna en cada extremo.
        ductil: delgada.gobierna.ductil && gruesa.gobierna.ductil,
        valorKN: interpolado,
      },
    ],
    e.faxRkKN,
    e.tipo
  );
}

/* ------------------------------------------------------------------ *
 * 8.5.1.1(4) — Número eficaz de una fila
 * ------------------------------------------------------------------ */

/**
 * Ec. (8.34). Una fila de n pernos paralela a la fibra no vale n veces uno.
 *
 * El reparto de carga entre pernos alineados no es uniforme: los extremos
 * toman más y la madera se hiende antes de que los del medio lleguen a su
 * capacidad. nef puede quedar en 0,7·n, así que ignorarlo sobrestima la unión
 * un 40 %. Sólo aplica a la componente paralela a la fibra.
 */
export function numeroEficaz(n: number, separacionMm: number, dMm: number): number {
  if (n <= 1) return n;
  return Math.min(n, Math.pow(n, 0.9) * Math.pow(separacionMm / (13 * dMm), 0.25));
}
