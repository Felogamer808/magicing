import type { MaterialesDerivados } from "./types";

/**
 * Abertura característica de fisura en estado límite de servicio, por el método
 * de la separación media de fisuras (EHE art. 49.2.4, equivalente al de EC2 7.3.4):
 *
 *   wk = β · sm · εsm
 *
 * donde sm es la separación media entre fisuras y εsm el alargamiento medio de
 * la armadura, ya descontada la colaboración del hormigón entre fisuras.
 */

export interface ParametrosFisuracion {
  /** Recubrimiento geométrico (m) */
  recubrimientoM: number;
  /** Coeficiente k2: 0,5 para carga mantenida o repetida, 1,0 para carga instantánea */
  k2: number;
  /** Coeficiente β que pasa de abertura media a característica. Habitualmente 1,7. */
  beta: number;
  /** Abertura de fisura admisible (mm) */
  wAdmMm: number;
  /** Módulo de elasticidad del acero (GPa) */
  esGPa: number;
}

export interface ZonaFisuracion {
  /** Canto total de la sección (m) */
  hM: number;
  /** Ancho de la sección (m) */
  bM: number;
  /** Barras por metro de la primera familia */
  n1: number;
  /** Diámetro de la primera familia (mm) */
  diametro1Mm: number;
  /** Barras por metro de la segunda familia (0 si no hay) */
  n2: number;
  /** Diámetro de la segunda familia (mm) */
  diametro2Mm: number;
  /** Momento en combinación cuasipermanente (kN·m) */
  mqpKNm: number;
}

export interface ResultadoFisuracion {
  /** Canto útil (m) */
  dM: number;
  /** Recubrimiento hasta el centro de la armadura (mm) */
  cMm: number;
  /** Separación entre barras considerada (mm) */
  sMm: number;
  /** Diámetro de referencia, el mayor de las dos familias (mm) */
  diametroMm: number;
  /** Área eficaz de hormigón traccionado (m²) */
  acEficazM2: number;
  /** Área total de armadura (m²) */
  asM2: number;
  /** Separación media entre fisuras (mm) */
  smMm: number;
  /** Tensión del acero en servicio (MPa) */
  sigmaSMPa: number;
  /** Momento de fisuración (kN·m) */
  mFisKNm: number;
  /** Tensión del acero al fisurar la sección (MPa) */
  sigmaSrMPa: number;
  /** Alargamiento medio de la armadura */
  epsilonSm: number;
  /** Abertura característica de fisura (mm) */
  wkMm: number;
  verifica: boolean;
}

/** Coeficiente k1 de la fórmula de separación media: 0,125 para flexión simple. */
const K1_FLEXION = 0.125;

export function calcularFisuracion(
  materiales: MaterialesDerivados,
  parametros: ParametrosFisuracion,
  zona: ZonaFisuracion
): ResultadoFisuracion {
  const { fctm } = materiales;
  const { recubrimientoM, k2, beta, wAdmMm, esGPa } = parametros;
  const { hM, bM, n1, diametro1Mm, n2, diametro2Mm, mqpKNm } = zona;

  const diametroMm = Math.max(diametro1Mm, diametro2Mm);
  const dM = hM - recubrimientoM - diametroMm / 2000;
  const cMm = (hM - dM) * 1000;

  // Si una de las dos familias no existe, la separación se limita con el
  // diámetro de la que sí está colocada.
  const diametroMenorMm = Math.min(diametro1Mm, diametro2Mm);
  const diametroLimiteMm = diametroMenorMm === 0 ? diametro1Mm : diametroMenorMm;
  const sMm = Math.min((bM * 1000) / Math.max(n1, n2), 15 * diametroLimiteMm);

  const acEficazM2 = (15 * diametroMm * hM) / 4000;
  const asM2 =
    (n1 * Math.PI * diametro1Mm ** 2) / 4 / 1000 ** 2 +
    (n2 * Math.PI * diametro2Mm ** 2) / 4 / 1000 ** 2;

  const smMm = 2 * cMm + 0.2 * sMm + (0.4 * K1_FLEXION * diametroMm * acEficazM2) / asM2;

  const esMPa = esGPa * 1000;
  const sigmaSMPa = mqpKNm / (1000 * 0.8 * dM * asM2);
  const mFisKNm = (fctm * 1000 * bM * hM ** 2) / 6;
  const sigmaSrMPa = mFisKNm / (1000 * 0.8 * dM * asM2);

  const epsilonSm = Math.max(
    (sigmaSMPa / esMPa) * (1 - k2 * (sigmaSrMPa / sigmaSMPa) ** 2),
    (0.4 * sigmaSMPa) / esMPa
  );

  const wkMm = beta * smMm * epsilonSm;

  return {
    dM,
    cMm,
    sMm,
    diametroMm,
    acEficazM2,
    asM2,
    smMm,
    sigmaSMPa,
    mFisKNm,
    sigmaSrMPa,
    epsilonSm,
    wkMm,
    verifica: wAdmMm >= wkMm,
  };
}

/** Barras por metro a partir de una separación dada (m). Devuelve 0 si no hay armadura. */
export function barrasPorMetro(anchoM: number, separacionM: number): number {
  return separacionM === 0 ? 0 : anchoM / separacionM;
}
