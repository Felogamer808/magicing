/**
 * Viga libre: la que se arma a mano, tramo por tramo, como en el Ftool.
 *
 * El formulario de vigas trae veinte esquemas cerrados. Éste no trae ninguno:
 * se dan las luces, el apoyo de cada nudo y las cargas donde caigan, y el motor
 * de rigidez (`viga-continua.ts`) resuelve lo que salga. Un voladizo es un
 * tramo cuyo extremo queda libre.
 *
 * Cada carga va etiquetada G (permanente) o Q (variable), así la misma viga da
 * los esfuerzos característicos y los de cálculo sin volver a cargarla.
 * `calcularVigaLibre` carga todos los tramos a la vez; la envolvente con la
 * sobrecarga alternada, que es la que da el máximo negativo en apoyos y el
 * positivo en vanos, es `calcularEnvolventeVigaLibre`.
 *
 * Las posiciones de las cargas se miden desde el extremo izquierdo de la viga,
 * no del tramo: así una carga puede cruzar un apoyo sin partirla en dos.
 */

import { GAMMA_G, GAMMA_Q } from "@/lib/calc/hormigon/comun/coeficientes";
import {
  calcularVigaContinua,
  type CargaViga,
  type EntradaViga,
  type ResultadoViga,
  type TipoApoyo,
} from "./viga-continua";

export type CasoCarga = "G" | "Q";

/** Una carga del motor con su caso de carga. */
export type CargaLibre = CargaViga & { caso: CasoCarga };

export interface DatosVigaLibre {
  /** Luz de cada tramo, de izquierda a derecha (m). */
  lucesM: readonly number[];
  /** Apoyo de cada nudo: uno más que tramos. "libre" en un extremo es un voladizo. */
  apoyos: readonly TipoApoyo[];
  cargas: readonly CargaLibre[];
  /** Rigidez a flexión E·I (kN·m²), constante en toda la viga. */
  eiKNm2: number;
}

export type IdCombinacionLibre = "G" | "Q" | "servicio" | "elu";

export interface CombinacionLibre {
  id: IdCombinacionLibre;
  nombre: string;
  factorG: number;
  factorQ: number;
  /** La flecha sólo tiene sentido con cargas de servicio. */
  flechaConSentido: boolean;
}

export const COMBINACIONES_LIBRE: readonly CombinacionLibre[] = [
  { id: "elu", nombre: `ELU · ${GAMMA_G.toString().replace(".", ",")}·G + ${GAMMA_Q.toString().replace(".", ",")}·Q`, factorG: GAMMA_G, factorQ: GAMMA_Q, flechaConSentido: false },
  { id: "servicio", nombre: "Servicio · G + Q", factorG: 1, factorQ: 1, flechaConSentido: true },
  { id: "G", nombre: "Sólo G", factorG: 1, factorQ: 0, flechaConSentido: true },
  { id: "Q", nombre: "Sólo Q", factorG: 0, factorQ: 1, flechaConSentido: true },
];

/** Abscisa de cada nudo, desde el extremo izquierdo (m). */
export function abscisasNudos(lucesM: readonly number[]): number[] {
  const xs = [0];
  for (const l of lucesM) xs.push(xs[xs.length - 1] + l);
  return xs;
}

function escalar(carga: CargaLibre | CargaViga, f: number): CargaViga {
  switch (carga.tipo) {
    case "puntual":
      return { tipo: "puntual", xM: carga.xM, pKN: carga.pKN * f };
    case "momento":
      return { tipo: "momento", xM: carga.xM, mKNm: carga.mKNm * f };
    case "distribuida":
      return {
        tipo: "distribuida",
        desdeM: carga.desdeM,
        hastaM: carga.hastaM,
        qInicialKNm: carga.qInicialKNm * f,
        qFinalKNm: carga.qFinalKNm * f,
      };
  }
}

/**
 * Por qué la viga no se puede armar, o null. Lo que el motor ya rechaza (sin
 * apoyos, mecanismo, carga fuera) lo sigue diciendo él; acá va lo propio de
 * cargarla por tramos.
 */
export function validarVigaLibre(datos: DatosVigaLibre): string | null {
  if (datos.lucesM.length === 0) return "Hace falta al menos un tramo.";
  if (datos.lucesM.some((l) => !(l > 0))) return "Cada tramo tiene que tener una luz mayor que cero.";
  if (datos.apoyos.length !== datos.lucesM.length + 1) return "Cada nudo tiene que tener su apoyo.";
  for (const c of datos.cargas) {
    if (c.tipo === "distribuida" && !(c.hastaM > c.desdeM)) {
      return "En una carga distribuida el final tiene que estar después del inicio.";
    }
  }
  return null;
}

/** La viga lista para el motor, con las cargas de una combinación ya mayoradas. */
export function armarVigaLibre(datos: DatosVigaLibre, combinacion: CombinacionLibre): EntradaViga {
  const xs = abscisasNudos(datos.lucesM);
  const cargas: CargaViga[] = [];
  for (const c of datos.cargas) {
    const f = c.caso === "G" ? combinacion.factorG : combinacion.factorQ;
    if (f !== 0) cargas.push(escalar(c, f));
  }
  return {
    largoM: xs[xs.length - 1],
    nodos: xs.map((xM, i) => ({ xM, apoyo: datos.apoyos[i] })),
    cargas,
    eiKNm2: datos.eiKNm2,
  };
}

export interface ResultadoVigaLibre {
  entrada: EntradaViga;
  resultado: ResultadoViga;
}

/** Lanza con el motivo si la viga no se puede resolver. */
export function calcularVigaLibre(datos: DatosVigaLibre, combinacion: CombinacionLibre): ResultadoVigaLibre {
  const motivo = validarVigaLibre(datos);
  if (motivo) throw new Error(motivo);
  const entrada = armarVigaLibre(datos, combinacion);
  return { entrada, resultado: calcularVigaContinua(entrada) };
}

// --------------------------------------------------------------------------
// Envolvente con alternancia de la sobrecarga
// --------------------------------------------------------------------------

/**
 * La Q de un solo tramo: la distribuida se recorta a sus extremos (con q
 * interpolada en el corte) y la puntual o el momento van al tramo que los
 * contiene. Un punto justo sobre un nudo va al tramo de la derecha, salvo el
 * extremo final, que es del último.
 */
function qDelTramo(cargas: readonly CargaLibre[], desde: number, hasta: number, esUltimo: boolean): CargaViga[] {
  const salida: CargaViga[] = [];
  for (const c of cargas) {
    if (c.caso !== "Q") continue;
    if (c.tipo === "distribuida") {
      const a = Math.max(c.desdeM, desde);
      const b = Math.min(c.hastaM, hasta);
      if (!(b > a)) continue;
      const q = (x: number) => c.qInicialKNm + ((c.qFinalKNm - c.qInicialKNm) * (x - c.desdeM)) / (c.hastaM - c.desdeM);
      salida.push({ tipo: "distribuida", desdeM: a, hastaM: b, qInicialKNm: q(a), qFinalKNm: q(b) });
    } else if (c.xM >= desde && (c.xM < hasta || (esUltimo && c.xM <= hasta))) {
      salida.push(escalar(c, 1));
    }
  }
  return salida;
}

/** Abscisas donde corta alguna carga: con todas cargadas en cero, los casos comparten malla. */
function cortesComunes(cargas: readonly CargaLibre[]): CargaViga[] {
  const xs = cargas.flatMap((c) => (c.tipo === "distribuida" ? [c.desdeM, c.hastaM] : [c.xM]));
  return xs.map((xM) => ({ tipo: "puntual", xM, pKN: 0 }));
}

export interface CurvaEnvolvente {
  max: number[];
  min: number[];
}

export interface ExtremoEnvolvente {
  xM: number;
  valor: number;
  /** Tramos (numerados desde 1) con Q cargada en la disposición que da este valor. */
  tramosConQ: number[];
}

export interface ReaccionEnvolvente {
  xM: number;
  tipo: TipoApoyo;
  rMaxKN: number;
  rMinKN: number;
  mMaxKNm: number;
  mMinKNm: number;
}

export interface EnvolventeVigaLibre {
  xs: number[];
  cortante: CurvaEnvolvente;
  momento: CurvaEnvolvente;
  flecha: CurvaEnvolvente;
  reacciones: ReaccionEnvolvente[];
  momentoMax: ExtremoEnvolvente;
  momentoMin: ExtremoEnvolvente;
  /** El de mayor módulo, con su signo. */
  cortanteMax: ExtremoEnvolvente;
  flechaMax: ExtremoEnvolvente;
  /** La viga con todos los tramos cargados: para dibujar las cargas. */
  todoCargado: ResultadoVigaLibre;
}

/**
 * Envolvente de la combinación con Q alternada tramo por tramo (voladizos
 * incluidos) y G con el mismo coeficiente en toda la viga.
 *
 * Probar las 2ⁿ disposiciones no hace falta: todo es lineal, así que se
 * resuelve G sola y la Q de cada tramo sola (n + 1 cálculos, todos sobre la
 * misma malla) y en cada punto el máximo es G más las Q que suman, y el mínimo
 * G más las que restan. Eso es exactamente el peor de los 2ⁿ casos.
 *
 * Es la que pide el Anejo 19, art. 5.1.3 (1), pág. 45: las hipótesis de carga
 * tienen que dar las condiciones críticas en todas las secciones.
 */
export function calcularEnvolventeVigaLibre(
  datos: DatosVigaLibre,
  combinacion: CombinacionLibre,
  /** Secciones donde se quiere el valor exacto y no interpolado (caras de apoyo, d del borde). */
  abscisasExtra: readonly number[] = []
): EnvolventeVigaLibre {
  const todoCargado = calcularVigaLibre(datos, combinacion);
  const base = todoCargado.entrada;
  const largo = base.largoM;
  const cortes = [
    ...cortesComunes(datos.cargas),
    ...abscisasExtra.filter((x) => x > 0 && x < largo).map((xM): CargaViga => ({ tipo: "puntual", xM, pKN: 0 })),
  ];
  const resolver = (cargas: CargaViga[]) => calcularVigaContinua({ ...base, cargas: [...cargas, ...cortes] });

  const soloG = resolver(
    combinacion.factorG === 0 ? [] : datos.cargas.filter((c) => c.caso === "G").map((c) => escalar(c, combinacion.factorG))
  );
  const xsNudos = abscisasNudos(datos.lucesM);
  const porTramo = datos.lucesM.map((_, i) => {
    const q = combinacion.factorQ === 0 ? [] : qDelTramo(datos.cargas, xsNudos[i], xsNudos[i + 1], i === datos.lucesM.length - 1);
    return resolver(q.map((c) => escalar(c, combinacion.factorQ)));
  });
  for (const r of porTramo) {
    if (r.puntos.length !== soloG.puntos.length) throw new Error("Los casos de la envolvente no comparten malla.");
  }

  const xs = soloG.puntos.map((p) => p.xM);
  const curva = (de: (p: ResultadoViga["puntos"][number]) => number): CurvaEnvolvente => {
    const max = soloG.puntos.map(de);
    const min = [...max];
    for (const r of porTramo) {
      r.puntos.forEach((p, k) => {
        const v = de(p);
        if (v > 0) max[k] += v;
        else min[k] += v;
      });
    }
    return { max, min };
  };
  const cortante = curva((p) => p.cortanteKN);
  const momento = curva((p) => p.momentoKNm);
  const flecha = curva((p) => p.flechaMm);

  // Qué tramos llevan Q en el punto k para empujar hacia el signo pedido.
  const tramosEn = (de: (p: ResultadoViga["puntos"][number]) => number, k: number, signo: 1 | -1) =>
    porTramo.flatMap((r, i) => (signo * de(r.puntos[k]) > 1e-9 ? [i + 1] : []));
  const extremo = (
    c: CurvaEnvolvente,
    de: (p: ResultadoViga["puntos"][number]) => number,
    criterio: "max" | "min" | "modulo"
  ): ExtremoEnvolvente => {
    let mejor = { k: 0, valor: 0, signo: 1 as 1 | -1 };
    xs.forEach((_, k) => {
      const candidatos: [number, 1 | -1][] =
        criterio === "max" ? [[c.max[k], 1]] : criterio === "min" ? [[c.min[k], -1]] : [[c.max[k], 1], [c.min[k], -1]];
      for (const [v, s] of candidatos) {
        const mejora = criterio === "max" ? v > mejor.valor : criterio === "min" ? v < mejor.valor : Math.abs(v) > Math.abs(mejor.valor);
        if (mejora) mejor = { k, valor: v, signo: s };
      }
    });
    return { xM: xs[mejor.k], valor: mejor.valor, tramosConQ: tramosEn(de, mejor.k, mejor.signo) };
  };

  const reacciones: ReaccionEnvolvente[] = soloG.reacciones.map((rg, j) => {
    const sumar = (de: (r: ResultadoViga["reacciones"][number]) => number, signo: 1 | -1) =>
      de(rg) + porTramo.reduce((s, r) => s + (signo * de(r.reacciones[j]) > 0 ? de(r.reacciones[j]) : 0), 0);
    return {
      xM: rg.xM,
      tipo: rg.tipo,
      rMaxKN: sumar((r) => r.rKN, 1),
      rMinKN: sumar((r) => r.rKN, -1),
      mMaxKNm: sumar((r) => r.mKNm, 1),
      mMinKNm: sumar((r) => r.mKNm, -1),
    };
  });

  return {
    xs,
    cortante,
    momento,
    flecha,
    reacciones,
    momentoMax: extremo(momento, (p) => p.momentoKNm, "max"),
    momentoMin: extremo(momento, (p) => p.momentoKNm, "min"),
    cortanteMax: extremo(cortante, (p) => p.cortanteKN, "modulo"),
    flechaMax: extremo(flecha, (p) => p.flechaMm, "modulo"),
    todoCargado,
  };
}

/**
 * La misma forma que la envolvente pero con Q en todos los tramos a la vez:
 * las dos curvas coinciden. Sirve para comparar contra la alternada.
 */
export function envolventeTodoCargado(datos: DatosVigaLibre, combinacion: CombinacionLibre): EnvolventeVigaLibre {
  const todoCargado = calcularVigaLibre(datos, combinacion);
  const r = todoCargado.resultado;
  const todos = datos.lucesM.map((_, i) => i + 1);
  const curva = (de: (p: ResultadoViga["puntos"][number]) => number): CurvaEnvolvente => {
    const v = r.puntos.map(de);
    return { max: v, min: [...v] };
  };
  const conTramos = (e: { xM: number; valor: number }): ExtremoEnvolvente => ({ ...e, tramosConQ: todos });
  return {
    xs: r.puntos.map((p) => p.xM),
    cortante: curva((p) => p.cortanteKN),
    momento: curva((p) => p.momentoKNm),
    flecha: curva((p) => p.flechaMm),
    reacciones: r.reacciones.map((x) => ({ xM: x.xM, tipo: x.tipo, rMaxKN: x.rKN, rMinKN: x.rKN, mMaxKNm: x.mKNm, mMinKNm: x.mKNm })),
    momentoMax: conTramos(r.momentoMax),
    momentoMin: conTramos(r.momentoMin),
    cortanteMax: conTramos(r.cortanteMax),
    flechaMax: conTramos(r.flechaMax),
    todoCargado,
  };
}

// --------------------------------------------------------------------------
// Esfuerzos de un tramo para la verificación de vigas
// --------------------------------------------------------------------------

/** Valor de una curva en x, interpolado; en un salto toma el lado de `lado`. */
function valorEn(xs: readonly number[], ys: readonly number[], x: number, lado: 1 | -1): number {
  for (let k = 0; k < xs.length - 1; k++) {
    const a = xs[k];
    const b = xs[k + 1];
    if (!(b > a)) continue;
    const dentro = lado === 1 ? x >= a && x < b : x > a && x <= b;
    if (dentro) return ys[k] + ((ys[k + 1] - ys[k]) * (x - a)) / (b - a);
  }
  return ys[lado === 1 ? 0 : ys.length - 1];
}

/** El mayor módulo de la envolvente de cortante en x. */
function cortanteEn(env: EnvolventeVigaLibre, x: number, lado: 1 | -1) {
  return Math.max(Math.abs(valorEn(env.xs, env.cortante.max, x, lado)), Math.abs(valorEn(env.xs, env.cortante.min, x, lado)));
}

/** Caras de apoyo y secciones a d del borde: donde `esfuerzosDeTramo` lee la envolvente. */
export function seccionesDeApoyo(lucesM: readonly number[], anchosApoyoM: readonly number[], dM: number): number[] {
  return abscisasNudos(lucesM).flatMap((x, i) => {
    const t = Math.max(anchosApoyoM[i] || 0, 0) / 2;
    return [x - t, x + t, x - t - dM, x + t + dM];
  });
}

export interface ExtremoTramo {
  /** Número de nudo (desde 1). */
  nudo: number;
  /** Momento negativo en la cara del apoyo, en módulo (kN·m). */
  momentoCaraKNm: number;
  /** 0,65 del momento de empotramiento perfecto del tramo en ese extremo (kN·m); 0 si no hay continuidad. */
  minimoEmpotramientoKNm: number;
  /** Cortante en el borde del apoyo y a d del borde, en módulo (kN). */
  vBordeKN: number;
  vdKN: number;
  /** Distancia del eje del apoyo a la sección del Vd: semiancho + d (m). */
  distanciaVdM: number;
}

export interface EsfuerzosTramo {
  tramo: number;
  luzM: number;
  momentoPosKNm: number;
  /** El mayor de los dos extremos, ya con el mínimo de 0,65 del empotramiento. */
  momentoNegKNm: number;
  vdKN: number;
  vBordeKN: number;
  vdCentroKN: number;
  /** Distancia del eje a la sección del Vd en el extremo que gobierna (m). */
  inicioLeyM: number;
  extremos: ExtremoTramo[];
}

/**
 * Lo que la verificación de vigas necesita de un tramo, sacado de la
 * envolvente con los criterios del usuario (2026-10-27):
 *  - M⁺: el máximo del tramo.
 *  - M⁻: en la cara de cada apoyo con continuidad, Anejo 19, art. 5.3.2.2 (3),
 *    pág. 50, sin bajar de 0,65 del momento de empotramiento perfecto (nota
 *    del mismo apartado). Gana el mayor de los dos extremos.
 *  - Vd: a d del borde de cada apoyo, art. 6.2.1 (8), pág. 75; se toma el
 *    mayor módulo desde ahí hasta el centro, así una puntual más adentro no
 *    queda afuera. El V del borde va aparte, para VRd,max.
 *
 * `anchosApoyoM` es el ancho de cada nudo (0 en un nudo libre o sin dato: la
 * cara queda en el eje). `dM` es el canto útil de la viga.
 */
export function esfuerzosDeTramo(
  datos: DatosVigaLibre,
  combinacion: CombinacionLibre,
  env: EnvolventeVigaLibre,
  indice: number,
  anchosApoyoM: readonly number[],
  dM: number
): EsfuerzosTramo {
  const xsNudos = abscisasNudos(datos.lucesM);
  const xi = xsNudos[indice];
  const xj = xsNudos[indice + 1];
  const luzM = xj - xi;
  const mitad = (xi + xj) / 2;

  // Empotramiento perfecto del tramo con todas sus cargas de la combinación.
  const enTramo = datos.cargas.flatMap((c): CargaLibre[] => {
    if (c.tipo !== "distribuida") return c.xM >= xi && c.xM <= xj ? [{ ...c, xM: c.xM - xi }] : [];
    const a = Math.max(c.desdeM, xi);
    const b = Math.min(c.hastaM, xj);
    if (!(b > a)) return [];
    const q = (x: number) => c.qInicialKNm + ((c.qFinalKNm - c.qInicialKNm) * (x - c.desdeM)) / (c.hastaM - c.desdeM);
    return [{ ...c, desdeM: a - xi, hastaM: b - xi, qInicialKNm: q(a), qFinalKNm: q(b) }];
  });
  const empotrado = calcularVigaLibre(
    { lucesM: [luzM], apoyos: ["empotrado", "empotrado"], cargas: enTramo, eiKNm2: datos.eiKNm2 },
    combinacion
  ).resultado.reacciones;

  let momentoPosKNm = 0;
  env.xs.forEach((x, k) => {
    if (x >= xi && x <= xj) momentoPosKNm = Math.max(momentoPosKNm, env.momento.max[k]);
  });

  const extremos: ExtremoTramo[] = [];
  for (const [nudo, xApoyo, lado] of [
    [indice, xi, 1],
    [indice + 1, xj, -1],
  ] as const) {
    if (datos.apoyos[nudo] === "libre") continue;
    const semiancho = Math.min(Math.max(anchosApoyoM[nudo] || 0, 0) / 2, luzM / 2);
    const xCara = xApoyo + lado * semiancho;
    const momentoCaraKNm = Math.max(-valorEn(env.xs, env.momento.min, xCara, lado), 0);
    // Continuidad: un nudo interior o un empotramiento. En un apoyo simple de
    // extremo el momento es cero y el mínimo no corresponde.
    const interior = nudo > 0 && nudo < datos.lucesM.length;
    const continuo = interior || datos.apoyos[nudo] === "empotrado";
    const minimoEmpotramientoKNm = continuo ? 0.65 * Math.abs(empotrado[lado === 1 ? 0 : 1].mKNm) : 0;

    const distanciaVdM = Math.min(semiancho + dM, luzM / 2);
    const desde = xApoyo + lado * distanciaVdM;
    let vdKN = cortanteEn(env, desde, lado);
    env.xs.forEach((x, k) => {
      const entre = lado === 1 ? x > desde && x <= mitad : x < desde && x >= mitad;
      if (entre) vdKN = Math.max(vdKN, Math.abs(env.cortante.max[k]), Math.abs(env.cortante.min[k]));
    });
    extremos.push({
      nudo: nudo + 1,
      momentoCaraKNm,
      minimoEmpotramientoKNm,
      vBordeKN: cortanteEn(env, xCara, lado),
      vdKN,
      distanciaVdM,
    });
  }

  const gobierna = extremos.reduce<ExtremoTramo | null>((g, e) => (!g || e.vdKN > g.vdKN ? e : g), null);
  return {
    tramo: indice + 1,
    luzM,
    momentoPosKNm,
    momentoNegKNm: Math.max(0, ...extremos.map((e) => Math.max(e.momentoCaraKNm, e.minimoEmpotramientoKNm))),
    vdKN: gobierna?.vdKN ?? 0,
    vBordeKN: Math.max(0, ...extremos.map((e) => e.vBordeKN)),
    vdCentroKN: Math.max(cortanteEn(env, mitad, 1), cortanteEn(env, mitad, -1)),
    inicioLeyM: gobierna?.distanciaVdM ?? 0,
    extremos,
  };
}
