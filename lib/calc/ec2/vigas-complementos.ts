import type { ArmaduraElegida, GeometriaViga, MaterialesDerivados } from "./types";

/** Recubrimiento del estribo asumido en la planilla al medir separaciones (m). */
const DIAMETRO_ESTRIBO_CALADO_M = 0.006;

export interface ResultadoArmaduraSecundaria {
  /** As necesaria de armadura secundaria: 30% del mínimo geométrico (cm²) */
  asNecCm2: number;
  asRealCm2: number;
  verificaAs: boolean;
  /** Momento que es capaz de absorber la armadura secundaria (kN·m) */
  momentoKNm: number;
}

/**
 * Armadura secundaria (de reparto en el alma). La planilla la dimensiona como el
 * 30% de la cuantía geométrica mínima y calcula, a título informativo, el momento
 * que esa armadura puede absorber.
 */
export function calcularArmaduraSecundaria(
  materiales: MaterialesDerivados,
  geometria: GeometriaViga,
  d: number,
  armadura: ArmaduraElegida
): ResultadoArmaduraSecundaria {
  const { b, h } = geometria;
  const { fcd, fyd } = materiales;

  const asMinGeometricoCm2 = 100 ** 2 * (2.8 / 1000) * b * h;
  const asNecCm2 = 0.3 * asMinGeometricoCm2;
  const asRealCm2 = (100 ** 2 * armadura.numero * Math.PI * (armadura.diametroMm / 1000) ** 2) / 4;

  const omega = (asRealCm2 / 100 ** 2) * (fyd / (b * d * fcd));
  const momentoKNm = (omega * (1 - omega / 2) * b * d ** 2 * fcd * 10 ** 6) / 1000;

  return { asNecCm2, asRealCm2, verificaAs: asRealCm2 >= asNecCm2, momentoKNm };
}

export interface ResultadoArmaduraPiel {
  /** As de piel necesaria por cara (cm²) */
  asNecCm2: number;
  asRealCm2: number;
  verificaAs: boolean;
}

/**
 * Armadura de piel, dimensionada como el 0,05% de la sección b·d por cara.
 * En vigas con torsión hay que sumarle además Al/4 (la parte de la armadura
 * longitudinal de torsión que corresponde a cada cara lateral).
 */
export function calcularArmaduraPiel(
  geometria: GeometriaViga,
  d: number,
  /** Barras por cara */
  numeroPorCara: number,
  diametroMm: number,
  asAdicionalPorTorsionCm2 = 0
): ResultadoArmaduraPiel {
  const { b } = geometria;
  const asNecCm2 = (0.05 * b * d) / 100 * 100 ** 2 + asAdicionalPorTorsionCm2;
  const asRealCm2 = (100 ** 2 * numeroPorCara * Math.PI * (diametroMm / 1000) ** 2) / 4;
  return { asNecCm2, asRealCm2, verificaAs: asRealCm2 >= asNecCm2 };
}

/**
 * Longitud básica de anclaje en posición II (mm), según el criterio de la
 * planilla: el mayor entre 1,4·1,3·φ² y fyk·φ/14, redondeado hacia arriba.
 */
export function calcularAnclajeMm(materiales: MaterialesDerivados, diametroMm: number): number {
  return Math.ceil(Math.max(1.4 * 1.3 * diametroMm ** 2, (materiales.fyk * diametroMm) / 14));
}

export interface ResultadoDeformaciones {
  /** Flecha instantánea de entrada (mm) */
  fInstMm: number;
  /** Flecha total a largo plazo: 2,5 veces la instantánea (mm) */
  fTotalMm: number;
  /** Flecha admisible: mín(L/250, L/500 + 10 mm) (mm) */
  fAdmMm: number;
  verificaFlecha: boolean;
}

export function calcularDeformaciones(luzM: number, flechaInstantaneaMm: number): ResultadoDeformaciones {
  const fTotalMm = 2.5 * flechaInstantaneaMm;
  const fAdmMm = Math.min(luzM / 250, luzM / 500 + 0.01) * 1000;
  return { fInstMm: flechaInstantaneaMm, fTotalMm, fAdmMm, verificaFlecha: fAdmMm >= fTotalMm };
}

/**
 * Separación entre ejes de barras de una fila (cm). Devuelve null si hay una
 * sola barra (no hay separación que medir).
 */
export function calcularSeparacionBarrasCm(
  geometria: GeometriaViga,
  armadura: ArmaduraElegida,
  diametroEstriboMm: number
): number | null {
  const { b, recubrimiento } = geometria;
  const { numero, diametroMm } = armadura;
  if (numero <= 1) return null;
  const anchoUtilM = b - 2 * recubrimiento - diametroMm / 1000 - (2 * diametroEstriboMm) / 1000;
  return (100 * anchoUtilM) / (numero - 1);
}

export { DIAMETRO_ESTRIBO_CALADO_M };
