/**
 * Losa mixta con chapa colaborante (steel deck): rasante entre la chapa y el
 * hormigón, EN 1994-1-1 §9.7.3 (método m-k), separando el camino resistente
 * de la chapa del que aportan las barras longitudinales adicionales por
 * nervio.
 *
 * El método m-k es estrictamente sobre la chapa sola: Vl,Rd sale de un ensayo
 * de la conexión mecánica chapa-hormigón y las barras no entran en la
 * fórmula. Lo que sí puede hacerse, y es lo que pide separar acá, es un
 * chequeo mecánico complementario: si las barras tienen anclaje propio,
 * puede suponerse que se llevan una fracción de la tracción total y por lo
 * tanto de la demanda de rasante, aliviando a la chapa. Ese reparto (α) no
 * es una modificación formal del m-k —la norma no lo prevé así— así que se
 * reporta aparte del chequeo estricto, nunca en su lugar.
 */

import { GAMMA_S } from "@/lib/calc/hormigon/comun/coeficientes";

/**
 * γ de la chapa, mismo criterio que el módulo de flexión (EN 1993-1-1 usaría
 * γM0 = 1,0; la planilla original adopta 1,15). Sólo se usa acá para el
 * anclaje de extremo, que sí necesita el valor de cálculo.
 */
const GAMMA_CHAPA = 1.15;

export interface MaterialesSteelDeckRasante {
  /** Límite elástico característico de la chapa (MPa). */
  fypMPa: number;
  /** Límite elástico de la armadura adicional (MPa). */
  fykBarrasMPa: number;
}

export interface GeometriaSteelDeckRasante {
  /** Luz del tramo (m). Caso base: simplemente apoyada. */
  luzM: number;
  /** Ancho tributario considerado (m). */
  anchoM: number;
  /** Distancia desde la cara superior del hormigón al centroide de la chapa (m). */
  dpM: number;
  /** Área de chapa por metro, de catálogo (mm²/m). */
  apMm2PorM: number;
  diametroBarraMm: number;
  separacionBarraMm: number;
}

export interface DatosMk {
  /** Coeficiente m del ensayo de la chapa (N/mm²). */
  mMPa: number;
  /** Coeficiente k del ensayo de la chapa (N/mm²). */
  kMPa: number;
  /** Coeficiente parcial de la conexión, γVS. */
  gammaVs: number;
  /** Ls/L: para carga uniforme y apoyo simple, Ls = L/4. */
  lsSobreL: number;
}

export interface AccionesRasante {
  /** Peso propio de losa + chapa (kN/m²). */
  gPpKNm2: number;
  /** Permanentes adicionales: carpeta, terminaciones, tabiques (kN/m²). */
  gAddKNm2: number;
  /** Sobrecarga de uso (kN/m²). */
  qKNm2: number;
  gammaG: number;
  gammaQ: number;
}

/** Anclaje de extremo con pernos conectores, EN 1994-1-1 §9.7.4. Opcional. */
export interface AnclajeExtremo {
  presente: boolean;
  espesorChapaMm: number;
  diametroPernoMm: number;
  numeroPernos: number;
  separacionPernosM: number;
}

export interface ResultadoAcciones {
  wEdKNm2: number;
  vEdKN: number;
  vEdPorAnchoKNporM: number;
  lsM: number;
}

export interface ResultadoRasante {
  asBarrasMm2PorM: number;
  fydBarrasMPa: number;
  /** Tracción que desarrolla la chapa si plastifica (kN/m). */
  tChapaKN: number;
  /** Tracción que desarrollan las barras si plastifican (kN/m). */
  tBarrasKN: number;
  /** Fracción de la tracción total atribuida a la chapa. */
  alfaChapa: number;
  /** Demanda de rasante atribuida exclusivamente a la chapa (kN/m). */
  vEdChapaKNporM: number;
  /** Flujo de rasante de control, ql ≈ Vp/dp (kN/m²). */
  flujoRasanteKNm2: number;
  /** Resistencia longitudinal de la conexión chapa-hormigón, Vl,Rd (kN/m). */
  vlRdKNporM: number;
  /** Utilización del método m-k estricto: VEd total / Vl,Rd. */
  utilizacionEstricta: number;
  verificaEstricta: boolean;
  /** Utilización del chequeo complementario: VEd atribuido a la chapa / Vl,Rd. */
  utilizacionChapaExclusiva: number;
  verificaChapaExclusiva: boolean;
}

export interface ResultadoAnclajeExtremo {
  dd0Mm: number;
  aMm: number;
  kPhi: number;
  /** Resistencia al aplastamiento local de la chapa en el perno, Ppb,Rd (kN/m). */
  ppbRdKNporM: number;
}

export interface ResultadoSteelDeckRasante {
  acciones: ResultadoAcciones;
  rasante: ResultadoRasante;
  anclajeExtremo: ResultadoAnclajeExtremo | null;
}

function calcularAcciones(geometria: GeometriaSteelDeckRasante, acciones: AccionesRasante): ResultadoAcciones {
  const { luzM, anchoM } = geometria;
  const { gPpKNm2, gAddKNm2, qKNm2, gammaG, gammaQ } = acciones;

  const wEdKNm2 = (gPpKNm2 + gAddKNm2) * gammaG + qKNm2 * gammaQ;
  const vEdKN = (wEdKNm2 * luzM * anchoM) / 2;
  const vEdPorAnchoKNporM = vEdKN / anchoM;

  return { wEdKNm2, vEdKN, vEdPorAnchoKNporM, lsM: 0 };
}

function calcularRasante(
  materiales: MaterialesSteelDeckRasante,
  geometria: GeometriaSteelDeckRasante,
  mk: DatosMk,
  vEdPorAnchoKNporM: number
): ResultadoRasante {
  const { fypMPa, fykBarrasMPa } = materiales;
  const { anchoM, dpM, apMm2PorM, diametroBarraMm, separacionBarraMm } = geometria;
  const { mMPa, kMPa, gammaVs, lsSobreL } = mk;

  const asBarrasMm2PorM =
    separacionBarraMm > 0 ? ((Math.PI * diametroBarraMm ** 2) / 4) * (1000 / separacionBarraMm) : 0;
  const fydBarrasMPa = fykBarrasMPa / GAMMA_S;

  const tChapaKN = (apMm2PorM * fypMPa) / 1000;
  const tBarrasKN = (asBarrasMm2PorM * fydBarrasMPa) / 1000;
  const alfaChapa = tChapaKN + tBarrasKN > 0 ? tChapaKN / (tChapaKN + tBarrasKN) : 1;
  const vEdChapaKNporM = vEdPorAnchoKNporM * alfaChapa;
  const flujoRasanteKNm2 = dpM > 0 ? vEdChapaKNporM / (dpM * 1000) : 0;

  const lsMm = geometria.luzM * lsSobreL * 1000;
  const apTotalMm2 = apMm2PorM * anchoM;
  const vlRdN =
    gammaVs > 0
      ? ((anchoM * 1000 * (dpM * 1000)) / gammaVs) * ((mMPa * apTotalMm2) / (anchoM * 1000 * lsMm) + kMPa)
      : 0;
  const vlRdKNporM = vlRdN / 1000 / anchoM;

  const utilizacionEstricta = vlRdKNporM > 0 ? vEdPorAnchoKNporM / vlRdKNporM : Infinity;
  const utilizacionChapaExclusiva = vlRdKNporM > 0 ? vEdChapaKNporM / vlRdKNporM : Infinity;

  return {
    asBarrasMm2PorM,
    fydBarrasMPa,
    tChapaKN,
    tBarrasKN,
    alfaChapa,
    vEdChapaKNporM,
    flujoRasanteKNm2,
    vlRdKNporM,
    utilizacionEstricta,
    verificaEstricta: utilizacionEstricta <= 1,
    utilizacionChapaExclusiva,
    verificaChapaExclusiva: utilizacionChapaExclusiva <= 1,
  };
}

/**
 * Resistencia al aplastamiento local de la chapa en el perno conector,
 * EN 1994-1-1 §9.7.4, para losas con anclaje de extremo.
 */
function calcularAnclajeExtremo(
  materiales: MaterialesSteelDeckRasante,
  anclaje: AnclajeExtremo
): ResultadoAnclajeExtremo | null {
  if (!anclaje.presente) return null;

  const { espesorChapaMm, diametroPernoMm, numeroPernos, separacionPernosM } = anclaje;
  const fypdMPa = materiales.fypMPa / GAMMA_CHAPA;

  const dd0Mm = 1.1 * diametroPernoMm;
  const aMm = 2 * dd0Mm;
  const kPhi = Math.min(6, 1 + aMm / dd0Mm);
  const separacionPernosMm = separacionPernosM * 1000;

  // kφ·dd0(mm)·t(mm)·fypd(N/mm²) da un resultado en N; dividido por la
  // separación en mm da N/mm, que numéricamente ya es kN/m (1 N/mm = 1 kN/m):
  // no hace falta una conversión aparte.
  const ppbRdKNporM =
    separacionPernosMm > 0 ? (kPhi * dd0Mm * espesorChapaMm * fypdMPa * numeroPernos) / separacionPernosMm : 0;

  return { dd0Mm, aMm, kPhi, ppbRdKNporM };
}

export function calcularSteelDeckRasante(
  materiales: MaterialesSteelDeckRasante,
  geometria: GeometriaSteelDeckRasante,
  mk: DatosMk,
  acciones: AccionesRasante,
  anclajeExtremo: AnclajeExtremo
): ResultadoSteelDeckRasante {
  const resultadoAcciones = calcularAcciones(geometria, acciones);
  const rasante = calcularRasante(materiales, geometria, mk, resultadoAcciones.vEdPorAnchoKNporM);
  return {
    acciones: resultadoAcciones,
    rasante,
    anclajeExtremo: calcularAnclajeExtremo(materiales, anclajeExtremo),
  };
}
