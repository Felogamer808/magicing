import type { MaterialesDerivados } from "@/lib/calc/hormigon/comun/types";

export interface GeometriaLosa {
  /** Espesor de la losa (m) */
  e: number;
  /** Recubrimiento geométrico de la armadura positiva (m) */
  recubrimientoPositivo: number;
  /** Recubrimiento geométrico de la armadura negativa (m) */
  recubrimientoNegativo: number;
}

export interface ArmadoLosa {
  diametroMm: number;
  /** Separación adoptada entre barras (m) */
  separacionM: number;
}

export interface ResultadoDireccionLosa {
  /** Canto útil de esta dirección (m) */
  dM: number;
  mu: number;
  omega: number;
  asCalculadoCm2PorM: number;
  asMinMecanicoCm2PorM: number;
  asMinGeometricoCm2PorM: number;
  asNecCm2PorM: number;
  /** Separación que haría falta para cubrir As,nec con el diámetro elegido (m) */
  separacionNecM: number;
  /** Separación máxima admitida: mín(s nec, 3e, 30 cm), redondeada a múltiplos de 2 cm */
  separacionMaxM: number;
  asRealCm2PorM: number;
  aprovechamiento: number;
  verificaAs: boolean;
  /** Longitud básica de anclaje en posición II (mm) */
  lbIIMm: number;
  /** Longitud neta de anclaje (mm) */
  lbNetaMm: number;
}

export interface ResultadoLosa {
  asMinMecanicoCm2PorM: number;
  asMinGeometricoCm2PorM: number;
  positivo: { x: ResultadoDireccionLosa; y: ResultadoDireccionLosa };
  negativo: { x: ResultadoDireccionLosa; y: ResultadoDireccionLosa };
}

const areaBarraCm2 = (diametroMm: number) => (Math.PI * (diametroMm / 10) ** 2) / 4;

/** Redondeo de la planilla para la separación máxima: hacia abajo a múltiplos de 2 cm. */
function redondearSeparacionMaxM(valor: number): number {
  return Math.floor(valor / 2 / 0.01 + 1e-9) * 0.01 * 2;
}

function armarDireccion(
  materiales: MaterialesDerivados,
  e: number,
  d: number,
  momentoKNmPorM: number,
  armado: ArmadoLosa,
  /** Armadura de la malla general que también colabora en esta dirección (cm²/m) */
  asMallaAdicionalCm2PorM = 0
): ResultadoDireccionLosa {
  const { fcd, fyd, fyk } = materiales;

  const asMinMecanicoCm2PorM = (0.04 * e * fcd * 100 ** 2) / fyd;
  const asMinGeometricoCm2PorM = (1.8 / 1000) * e * 100 ** 2;

  const mu = momentoKNmPorM / (d ** 2 * fcd * 1000);
  const omega = 1 - Math.sqrt(1 - 2 * mu);
  const asCalculadoCm2PorM = ((omega * d * fcd) / fyd) * 100 ** 2;
  const asNecCm2PorM = Math.max(asCalculadoCm2PorM, asMinMecanicoCm2PorM, asMinGeometricoCm2PorM);

  const area = areaBarraCm2(armado.diametroMm);
  const separacionNecM = area / asNecCm2PorM;
  const separacionMaxM = redondearSeparacionMaxM(
    separacionNecM <= 0.1 ? 0.1 : Math.min(separacionNecM, 3 * e, 0.3)
  );

  const asRealCm2PorM = area / armado.separacionM + asMallaAdicionalCm2PorM;
  const verificaAs = asRealCm2PorM >= asNecCm2PorM;

  const lbIIMm = Math.max(1.4 * 1.2 * armado.diametroMm ** 2, (fyk * armado.diametroMm) / 14);
  const lbNetaMm = Math.max(
    (lbIIMm * 0.7 * asNecCm2PorM) / asRealCm2PorM,
    10 * armado.diametroMm,
    150
  );

  return {
    dM: d,
    mu,
    omega,
    asCalculadoCm2PorM,
    asMinMecanicoCm2PorM,
    asMinGeometricoCm2PorM,
    asNecCm2PorM,
    separacionNecM,
    separacionMaxM,
    asRealCm2PorM,
    aprovechamiento: asNecCm2PorM / asRealCm2PorM,
    verificaAs,
    lbIIMm,
    lbNetaMm,
  };
}

export interface DatosLosa {
  /** Momentos positivos de cálculo en cada dirección (kN·m/m) */
  momentoPositivoX: number;
  momentoPositivoY: number;
  /** Momentos negativos de cálculo en cada dirección (kN·m/m) */
  momentoNegativoX: number;
  momentoNegativoY: number;
  armadoPositivoX: ArmadoLosa;
  armadoPositivoY: ArmadoLosa;
  armadoNegativoX: ArmadoLosa;
  armadoNegativoY: ArmadoLosa;
  /**
   * Si la armadura en X se cuenta como malla general (la de Y) más un refuerzo
   * adicional en X, tal como lo hace la planilla en el armado positivo.
   */
  xIncluyeMallaEnY?: boolean;
}

/**
 * Losa armada en dos direcciones. Las barras de una dirección se apoyan sobre
 * las de la otra, así que el canto útil no es el mismo en X que en Y: la
 * dirección Y queda en la capa exterior (más cerca de la cara traccionada) y la
 * X por dentro, apoyada sobre ella.
 */
export function calcularLosa(
  materiales: MaterialesDerivados,
  geometria: GeometriaLosa,
  datos: DatosLosa
): ResultadoLosa {
  const { e, recubrimientoPositivo, recubrimientoNegativo } = geometria;
  const { fcd, fyd } = materiales;
  const xIncluyeMallaEnY = datos.xIncluyeMallaEnY ?? true;

  const dPosY = e - recubrimientoPositivo - datos.armadoPositivoY.diametroMm / 2000;
  const dPosX =
    e -
    recubrimientoPositivo -
    datos.armadoPositivoY.diametroMm / 1000 -
    datos.armadoPositivoX.diametroMm / 2000;

  const dNegY = e - recubrimientoNegativo - datos.armadoNegativoY.diametroMm / 2000;
  const dNegX =
    e -
    recubrimientoNegativo -
    datos.armadoNegativoY.diametroMm / 1000 -
    datos.armadoNegativoX.diametroMm / 2000;

  const posY = armarDireccion(materiales, e, dPosY, datos.momentoPositivoY, datos.armadoPositivoY);
  const posX = armarDireccion(
    materiales,
    e,
    dPosX,
    datos.momentoPositivoX,
    datos.armadoPositivoX,
    xIncluyeMallaEnY ? posY.asRealCm2PorM : 0
  );

  const negY = armarDireccion(materiales, e, dNegY, datos.momentoNegativoY, datos.armadoNegativoY);
  const negX = armarDireccion(materiales, e, dNegX, datos.momentoNegativoX, datos.armadoNegativoX);

  return {
    asMinMecanicoCm2PorM: (0.04 * e * fcd * 100 ** 2) / fyd,
    asMinGeometricoCm2PorM: (1.8 / 1000) * e * 100 ** 2,
    positivo: { x: posX, y: posY },
    negativo: { x: negX, y: negY },
  };
}

/**
 * Momento que resiste una losa con un armado dado (φ a una separación s).
 * Sirve para responder rápido "¿cuánto aguanta esta malla?" sin partir de un
 * momento de cálculo.
 */
export function calcularMomentoResistenteLosa(
  materiales: MaterialesDerivados,
  e: number,
  recubrimiento: number,
  armado: ArmadoLosa
): { dM: number; asRealCm2PorM: number; momentoKNmPorM: number } {
  const { fcd, fyd } = materiales;
  const asRealCm2PorM = areaBarraCm2(armado.diametroMm) / armado.separacionM;
  const dM = e - recubrimiento - armado.diametroMm / 2000;
  const omega = ((asRealCm2PorM / 100 ** 2) * fyd) / (dM * fcd);
  const momentoKNmPorM = omega * (1 - omega / 2) * dM ** 2 * fcd * 1000;
  return { dM, asRealCm2PorM, momentoKNmPorM };
}
