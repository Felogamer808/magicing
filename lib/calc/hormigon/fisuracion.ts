import type { MaterialesDerivados } from "@/lib/calc/hormigon/comun/types";

/**
 * Abertura característica de fisura en Estado Límite de Servicio —
 * Anejo 19, art. 7.3.4, ec. (7.8) a (7.14), págs. 113-116:
 *
 *   wk = s_r,max · (εsm − εcm)
 *
 * Antes este módulo implementaba el método del art. 49.2.4 de la EHE-08
 * (wk = β·sm·εsm, con sm = 2c + 0,2s + 0,4·k1·φ·Ac,eficaz/As). No era un
 * coeficiente distinto: era otro método completo, con otra área eficaz y otro
 * piso para la deformación media (0,4·σs/Es en vez de 0,6·σs/Es). La página
 * declaraba EC2 y calculaba con la norma derogada.
 */

/** Coeficientes de la ec. (7.11). */
const K1_ADHERENCIA_ALTA = 0.8;
const K3 = 3.4;
const K4 = 0.425;

/**
 * kt de la ec. (7.9). Se fija en 0,4 —cargas de mucha duración— porque el dato
 * que entra es el momento en combinación **cuasipermanente**: por definición es
 * la parte de la carga que actúa de forma sostenida.
 */
const KT_CARGA_MANTENIDA = 0.4;

export interface ParametrosFisuracion {
  /** Recubrimiento geométrico, hasta la superficie de la barra (m) */
  recubrimientoM: number;
  /** k2 de la ec. (7.11): 0,5 para flexión, 1,0 para tracción pura */
  k2: number;
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
  /** Barras de la primera familia en el ancho bM */
  n1: number;
  /** Diámetro de la primera familia (mm) */
  diametro1Mm: number;
  /** Barras de la segunda familia en el ancho bM (0 si no hay) */
  n2: number;
  /** Diámetro de la segunda familia (mm) */
  diametro2Mm: number;
  /** Momento en combinación cuasipermanente (kN·m) */
  mqpKNm: number;
}

export interface ResultadoFisuracion {
  /** Canto útil (m) */
  dM: number;
  /** Profundidad de la fibra neutra en sección fisurada (m) */
  xM: number;
  /** Diámetro equivalente de la ec. (7.12) (mm) */
  diametroEqMm: number;
  /** Separación entre barras (mm) */
  sMm: number;
  /** Canto del área eficaz, mín(2,5(h−d), (h−x)/3, h/2) (m) */
  hcEfM: number;
  /** Área eficaz de hormigón traccionado (m²) */
  acEficazM2: number;
  /** Área total de armadura (m²) */
  asM2: number;
  /** Cuantía eficaz ρp,ef de la ec. (7.10) */
  rhoPEf: number;
  /** Relación de módulos Es/Ecm */
  alphaE: number;
  /** Tensión del acero en servicio, sección fisurada (MPa) */
  sigmaSMPa: number;
  /** Deformación media relativa, ec. (7.9) */
  epsilonSmMenosCm: number;
  /** Separación máxima entre fisuras (mm) */
  srMaxMm: number;
  /** True si la armadura está tan separada que se aplicó el tope de la ec. (7.14) */
  usaTopeSeparacionAmplia: boolean;
  /** Abertura característica de fisura (mm) */
  wkMm: number;
  verifica: boolean;
}

/** Módulo secante del hormigón, art. 3.1.3: Ecm = 22·((fck+8)/10)^0,3, en GPa. */
function moduloSecanteGPa(fckMPa: number): number {
  return 22 * ((fckMPa + 8) / 10) ** 0.3;
}

export function calcularFisuracion(
  materiales: MaterialesDerivados,
  parametros: ParametrosFisuracion,
  zona: ZonaFisuracion
): ResultadoFisuracion {
  const { fck, fctm } = materiales;
  const { recubrimientoM, k2, wAdmMm, esGPa } = parametros;
  const { hM, bM, n1, diametro1Mm, n2, diametro2Mm, mqpKNm } = zona;

  // Diámetro equivalente de la ec. (7.12): pondera por área, no por cantidad,
  // así que una familia fina no diluye a una gruesa.
  const sumaAreas = n1 * diametro1Mm ** 2 + n2 * diametro2Mm ** 2;
  const sumaPerimetros = n1 * diametro1Mm + n2 * diametro2Mm;
  const diametroEqMm = sumaPerimetros > 0 ? sumaAreas / sumaPerimetros : 0;

  const diametroMayorMm = Math.max(diametro1Mm, diametro2Mm);
  const dM = hM - recubrimientoM - diametroMayorMm / 2000;

  const asM2 =
    (n1 * Math.PI * diametro1Mm ** 2) / 4 / 1000 ** 2 +
    (n2 * Math.PI * diametro2Mm ** 2) / 4 / 1000 ** 2;

  const esMPa = esGPa * 1000;
  const alphaE = esMPa / (moduloSecanteGPa(fck) * 1000);

  // Fibra neutra de la sección fisurada, con armadura sólo traccionada:
  // b·x²/2 = αe·As·(d − x). Hace falta tanto para el área eficaz como para el
  // brazo mecánico.
  const aeAs = alphaE * asM2;
  const xM = bM > 0 ? (-aeAs + Math.sqrt(aeAs ** 2 + 2 * bM * aeAs * dM)) / bM : 0;

  const hcEfM = Math.min(2.5 * (hM - dM), (hM - xM) / 3, hM / 2);
  const acEficazM2 = bM * hcEfM;
  const rhoPEf = acEficazM2 > 0 ? asM2 / acEficazM2 : 0;

  // Brazo mecánico de la sección fisurada, no el 0,8·d aproximado que usaba la
  // versión anterior: ya se tiene x, así que no hace falta aproximar.
  const zM = dM - xM / 3;
  const sigmaSMPa = asM2 > 0 && zM > 0 ? mqpKNm / (1000 * zM * asM2) : 0;

  const epsilonSmMenosCm = Math.max(
    (sigmaSMPa - (KT_CARGA_MANTENIDA * fctm * (1 + alphaE * rhoPEf)) / rhoPEf) / esMPa,
    (0.6 * sigmaSMPa) / esMPa
  );

  const sMm = Math.max(n1, n2) > 0 ? (bM * 1000) / Math.max(n1, n2) : 0;
  const recubrimientoMm = recubrimientoM * 1000;

  // La ec. (7.11) vale mientras las barras estén lo bastante juntas como para
  // que sus zonas de influencia se solapen. Si no, la fisura no la gobierna la
  // armadura sino el canto traccionado.
  const separacionLimiteMm = 5 * (recubrimientoMm + diametroEqMm / 2);
  const usaTopeSeparacionAmplia = sMm > separacionLimiteMm;

  // Ec. (7.14), pág. 117: contrastada contra el PDF del BOE porque en el OCR de
  // la skill esta ecuación quedó como imagen y sólo sobrevivió su etiqueta.
  //
  // Ojo al usarla: las dos expresiones no empalman en el límite. Justo al pasar
  // de 5(c+φ/2) el s_r,max puede más que duplicarse, y con él la abertura. No es
  // un error de implementación, es una discontinuidad del propio articulado: la
  // (7.14) es un *límite superior* para cuando las barras están tan separadas
  // que ya no gobiernan la fisura.
  const srMaxMm = usaTopeSeparacionAmplia
    ? 1.3 * (hM - xM) * 1000
    : K3 * recubrimientoMm + (K1_ADHERENCIA_ALTA * k2 * K4 * diametroEqMm) / rhoPEf;

  const wkMm = srMaxMm * epsilonSmMenosCm;

  return {
    dM,
    xM,
    diametroEqMm,
    sMm,
    hcEfM,
    acEficazM2,
    asM2,
    rhoPEf,
    alphaE,
    sigmaSMPa,
    epsilonSmMenosCm,
    srMaxMm,
    usaTopeSeparacionAmplia,
    wkMm,
    verifica: wAdmMm >= wkMm,
  };
}

/** Barras por metro a partir de una separación dada (m). Devuelve 0 si no hay armadura. */
export function barrasPorMetro(anchoM: number, separacionM: number): number {
  return separacionM === 0 ? 0 : anchoM / separacionM;
}
