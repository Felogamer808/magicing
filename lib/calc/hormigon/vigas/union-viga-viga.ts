/**
 * Transmisión de cortante en una unión viga-viga con esperas: la viga apoyada
 * llega a la cara de la viga soporte por una junta vertical entre hormigones,
 * cosida por barras perpendiculares a ella (α = 90°). Es cortante-fricción:
 * la junta resiste por cohesión, por el rozamiento que activan las barras al
 * abrirse la junta y por la compresión que la cruza.
 *
 * Norma: EHE-08, art. 47 (rasante en juntas entre hormigones), y nada más.
 * La EHE-08 está derogada y no hay fuente de ella en el proyecto: las fórmulas
 * y los coeficientes salen de la especificación que trajo el usuario
 * (2026-11-25), que es la única fuente citada acá. No se toma nada del
 * Anejo 19 (su 6.2.5 es otro modelo, con otros coeficientes): no se mezclan.
 *
 * Unidades internas, por pedido del usuario: mm, N, MPa (N/mm²) y N·mm.
 *
 * Cálculo (especificación del usuario):
 * - γc = 1,5 y γs = 1,15, siempre (criterio del usuario): no son datos.
 * - fcd = fck/γc; fyd = mín(fyk/γs; 400); fct,d = 0,21·fck^(2/3)/γc (fck ≤ 50).
 * - As = suma de las barras que cosen la junta. Con momento, la armadura de
 *   flexión As,flex = Md/(z·fyd) se descuenta de las superiores (mínimo 0).
 * - Rugosidad baja: β = 0,2, μ = 0,3 (caso a) o 0,6 (caso b).
 *   Rugosidad alta: β = 0,4, μ = 0,6 (caso a) o 0,9 (caso b).
 * - τc = β·(1,3 − 0,30·fck/25)·fct,d. Con Nd de tracción, τc = 0 y Nd no
 *   aporta. Con carga dinámica, τc al 50 %.
 * - τd = Vd/Ac, Ac = b·h.
 * - Caso a, si τd ≤ 2,5·τc: V_Rd = τc·Ac + μa·As·fyd + μa·Nd.
 *   Caso b, si no:          V_Rd = μb·As·fyd + μb·Nd.
 * - Límite de bielas: V_Rd ≤ 0,25·fcd·Ac.
 * - Cuantía mínima As ≥ 0,001·Ac; si no se cumple, el acero no cuenta y queda
 *   sólo la cohesión: V_Rd = τc·Ac.
 * - Estribos de cuelgue en la viga soporte: Ash·fyd ≥ Vd, con fyd ≤ 400.
 *
 * Dos lecturas de la especificación, declaradas:
 * - La cuantía mínima se compara con el As efectivo, el que queda después de
 *   descontar la flexión: es el que cose la junta a cortante.
 * - "Sólo cohesión" es literal: sin acero tampoco se suma μ·Nd, porque el
 *   rozamiento de la especificación va siempre de la mano de la armadura.
 */

export type Rugosidad = "baja" | "alta";
export type PosicionBarras = "superior" | "inferior";
export type CasoJunta = "a" | "b";

/** Un grupo de barras iguales que cosen la junta. */
export interface GrupoBarras {
  numero: number;
  diametroMm: number;
  posicion: PosicionBarras;
}

export interface MaterialesUnion {
  fckMPa: number;
  fykMPa: number;
}

export interface DatosUnion {
  /** Ancho de la viga apoyada en la junta (mm) */
  bMm: number;
  /** Canto de la viga apoyada en la junta (mm) */
  hMm: number;
  grupos: GrupoBarras[];
  /** Cortante de cálculo en la junta (N) */
  vdN: number;
  /** Axil normal a la junta (N): positivo de compresión, negativo de tracción */
  ndN: number;
  rugosidad: Rugosidad;
  /** Momento en la junta (N·mm); 0 si la unión es articulada */
  mdNmm: number;
  /** Brazo mecánico de la flexión (mm); sólo se usa con momento */
  zMm: number;
  cargaDinamica: boolean;
}

export interface ResultadoUnion {
  fcdMPa: number;
  fydMPa: number;
  fctdMPa: number;
  acMm2: number;
  beta: number;
  /** μ del caso que gobierna */
  mu: number;
  muA: number;
  muB: number;
  /** τc ya con las reducciones por tracción o carga dinámica (MPa) */
  tauCMPa: number;
  tauDMPa: number;
  /** 2,5·τc: frontera entre el caso a y el b (MPa) */
  limiteCasoAMPa: number;
  caso: CasoJunta;
  /** Nd de tracción: τc = 0 y Nd no aporta */
  traccion: boolean;
  asSuperiorMm2: number;
  asInferiorMm2: number;
  asTotalMm2: number;
  /** Md/(z·fyd), 0 si la unión es articulada (mm²) */
  asFlexionMm2: number;
  /** Superiores menos la flexión, mínimo 0 (mm²) */
  asSuperiorEfectivaMm2: number;
  /** La que cose la junta: superiores efectivas + inferiores (mm²) */
  asEfectivaMm2: number;
  asMinimaMm2: number;
  cumpleCuantiaMinima: boolean;
  /** Lo que aporta el acero a V_Rd, 0 si no cumple la cuantía (N) */
  vAceroN: number;
  /** Lo que aporta la cohesión, 0 en el caso b (N) */
  vCohesionN: number;
  /** Lo que aporta Nd, 0 si es de tracción o no hay acero (N) */
  vAxilN: number;
  /** V_Rd antes del límite de bielas (N) */
  vRdJuntaN: number;
  /** 0,25·fcd·Ac (N) */
  vBielasN: number;
  limitaBielas: boolean;
  /** mín(V_Rd de la junta; bielas) (N) */
  vRdN: number;
  aprovechamiento: number;
  cumple: boolean;
  /** Estribos de cuelgue en la viga soporte: Vd/fyd (mm²) */
  ashNecesariaMm2: number;
}

/**
 * Coeficientes de los materiales, fijos por criterio del usuario. Son propios
 * de este módulo y no los de `comun/coeficientes`, que son los del Anejo 19:
 * coinciden en valor, pero cada norma trae los suyos.
 */
export const GAMMA_C_UNION = 1.5;
export const GAMMA_S_UNION = 1.15;

/** fyd tope de la especificación: 400 MPa. */
export const FYD_MAXIMO_MPA = 400;

const COEFICIENTES: Record<Rugosidad, { beta: number; muA: number; muB: number }> = {
  baja: { beta: 0.2, muA: 0.3, muB: 0.6 },
  alta: { beta: 0.4, muA: 0.6, muB: 0.9 },
};

export function areaBarraMm2(diametroMm: number): number {
  return (Math.PI * diametroMm ** 2) / 4;
}

export function calcularUnionVigaViga(m: MaterialesUnion, d: DatosUnion): ResultadoUnion {
  if (m.fckMPa > 50) {
    // La expresión de fct,d de la especificación vale para fck ≤ 50.
    throw new RangeError("fct,d = 0,21·fck^(2/3)/γc vale sólo para fck ≤ 50 MPa.");
  }
  const fcdMPa = m.fckMPa / GAMMA_C_UNION;
  const fydMPa = Math.min(m.fykMPa / GAMMA_S_UNION, FYD_MAXIMO_MPA);
  const fctdMPa = (0.21 * m.fckMPa ** (2 / 3)) / GAMMA_C_UNION;
  const acMm2 = d.bMm * d.hMm;

  const { beta, muA, muB } = COEFICIENTES[d.rugosidad];
  const traccion = d.ndN < 0;
  let tauCMPa = traccion ? 0 : beta * (1.3 - (0.3 * m.fckMPa) / 25) * fctdMPa;
  if (d.cargaDinamica) tauCMPa *= 0.5;
  const ndUtilN = traccion ? 0 : d.ndN;

  const tauDMPa = d.vdN / acMm2;
  const limiteCasoAMPa = 2.5 * tauCMPa;
  const caso: CasoJunta = tauDMPa <= limiteCasoAMPa ? "a" : "b";
  const mu = caso === "a" ? muA : muB;

  const suma = (posicion: PosicionBarras) =>
    d.grupos.filter((g) => g.posicion === posicion).reduce((s, g) => s + g.numero * areaBarraMm2(g.diametroMm), 0);
  const asSuperiorMm2 = suma("superior");
  const asInferiorMm2 = suma("inferior");
  const asTotalMm2 = asSuperiorMm2 + asInferiorMm2;
  const asFlexionMm2 = d.mdNmm > 0 ? d.mdNmm / (d.zMm * fydMPa) : 0;
  const asSuperiorEfectivaMm2 = Math.max(0, asSuperiorMm2 - asFlexionMm2);
  const asEfectivaMm2 = asSuperiorEfectivaMm2 + asInferiorMm2;

  const asMinimaMm2 = 0.001 * acMm2;
  const cumpleCuantiaMinima = asEfectivaMm2 >= asMinimaMm2;

  let vCohesionN: number;
  let vAceroN: number;
  let vAxilN: number;
  if (!cumpleCuantiaMinima) {
    // El acero no cuenta: sólo cohesión.
    vCohesionN = tauCMPa * acMm2;
    vAceroN = 0;
    vAxilN = 0;
  } else {
    vCohesionN = caso === "a" ? tauCMPa * acMm2 : 0;
    vAceroN = mu * asEfectivaMm2 * fydMPa;
    vAxilN = mu * ndUtilN;
  }
  const vRdJuntaN = vCohesionN + vAceroN + vAxilN;
  const vBielasN = 0.25 * fcdMPa * acMm2;
  const limitaBielas = vRdJuntaN > vBielasN;
  const vRdN = Math.min(vRdJuntaN, vBielasN);
  const aprovechamiento = vRdN > 0 ? d.vdN / vRdN : Infinity;

  return {
    fcdMPa, fydMPa, fctdMPa, acMm2, beta, mu, muA, muB, tauCMPa, tauDMPa, limiteCasoAMPa, caso, traccion,
    asSuperiorMm2, asInferiorMm2, asTotalMm2, asFlexionMm2, asSuperiorEfectivaMm2, asEfectivaMm2,
    asMinimaMm2, cumpleCuantiaMinima, vAceroN, vCohesionN, vAxilN, vRdJuntaN, vBielasN, limitaBielas, vRdN,
    aprovechamiento,
    cumple: d.vdN <= vRdN,
    ashNecesariaMm2: d.vdN / fydMPa,
  };
}
