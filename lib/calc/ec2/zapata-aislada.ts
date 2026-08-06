import { factorEscalaK, tensionCortanteResistente } from "./cortante";
import type { MaterialesDerivados } from "./types";

export interface GeometriaZapataAislada {
  /** Dimensión de la zapata en dirección A (m) */
  A: number;
  /** Dimensión de la zapata en dirección B (m) */
  B: number;
  /** Canto/espesor de la zapata (m) */
  H: number;
  /** Ancho del pilar en dirección A (m) */
  anchoPilarA: number;
  /** Ancho del pilar en dirección B (m) */
  anchoPilarB: number;
  /** Recubrimiento de la armadura de fundación (m) */
  recubrimiento: number;
}

export interface CargasZapata {
  /** Carga vertical característica (kN) */
  Nk: number;
  /** Momento característico según eje A (kN·m) */
  MkA: number;
  /** Momento característico según eje B (kN·m) */
  MkB: number;
}

export interface ArmadoDireccion {
  numero: number;
  diametroMm: number;
}

export interface DatosZapataAislada {
  cargas: CargasZapata;
  armadoA: ArmadoDireccion;
  armadoB: ArmadoDireccion;
}

export interface ResultadoGeotecnico {
  pesoPropioKN: number;
  /** Presión de contacto por el método del área efectiva (kN/m²) */
  sigmaKPa: number;
  verificaTension: boolean;
}

export interface ResultadoArmadoDireccion {
  sigmaMaxKPa: number;
  sigmaMinKPa: number;
  /** Presión en la sección crítica de flexión (kN/m²) */
  sigmaCriticaKPa: number;
  /** Vuelo desde la sección crítica (cara del pilar reducida 1/4 de su ancho) hasta el borde (m) */
  lM: number;
  dM: number;
  /** Tracción de cálculo Td = M/(0.85d) (kN) */
  tdKN: number;
  asCalculadoCm2: number;
  asMinMecanicoCm2: number;
  asMinGeometricoCm2: number;
  asNecCm2: number;
  asRealCm2: number;
  verificaAs: boolean;
  lbIMm: number;
  dmMm: number;
  /** Cortante de cálculo a d de la cara del pilar, EC2 6.2.2 (kN). 0 si la sección crítica cae dentro del pilar. */
  vEdKN: number;
  /** Resistencia a cortante sin armadura transversal, EC2 6.2.2 (kN) */
  vRdCKN: number;
  verificaCorte: boolean;
}

export interface ResultadoPunzonamiento {
  dPromedioM: number;
  /** Perímetro de control básico u1, a 2d de la cara del pilar, EC2 6.4.2 (m) */
  u1M: number;
  /** Cortante de punzonamiento neto (descontando la reacción del suelo dentro del perímetro de control), EC2 6.4.3 (kN) */
  vEdKN: number;
  vRdCKN: number;
  verificaPunzonamiento: boolean;
}

export interface ResultadoZapataAislada {
  /** Mayor vuelo de la zapata respecto del pilar, en A o en B (m) */
  vueloMaxM: number;
  /** Clasificación informativa: vuelo ≤ 2H (método simplificado válido para zapatas rígidas) */
  esRigida: boolean;
  geotecnico: ResultadoGeotecnico;
  direccionA: ResultadoArmadoDireccion;
  direccionB: ResultadoArmadoDireccion;
  punzonamiento: ResultadoPunzonamiento;
}

export interface ResultadoCorteUnidireccional {
  vEdKN: number;
  vRdCKN: number;
  verificaCorte: boolean;
}

/**
 * Cortante unidireccional (EC2 6.2.2) en una sección genérica: se le pasan ya
 * calculadas la presión en la sección crítica y en el borde traccionado, y el
 * vuelo entre ambas. Independiente de si la distribución de presiones es
 * centrada (zapata aislada) o no (zapata de medianería).
 */
export function calcularCorteUnidireccional(
  materiales: MaterialesDerivados,
  dimPerpendicular: number,
  d: number,
  sigmaSeccionKPa: number,
  sigmaBordeKPa: number,
  vueloCorteM: number,
  asRealCm2: number
): ResultadoCorteUnidireccional {
  if (vueloCorteM <= 0) {
    return { vEdKN: 0, vRdCKN: 0, verificaCorte: true };
  }
  const { fck } = materiales;
  const vEdKN = ((sigmaSeccionKPa + sigmaBordeKPa) / 2) * dimPerpendicular * vueloCorteM;
  const k = factorEscalaK(d);
  const rhoL = asRealCm2 / (100 ** 2 * dimPerpendicular * d);
  const vRdCKN = tensionCortanteResistente(k, rhoL, fck) * dimPerpendicular * d * 1000;
  return { vEdKN, vRdCKN, verificaCorte: vEdKN <= vRdCKN };
}

/**
 * Arma una dirección de flexión a partir de una distribución de presiones ya
 * calculada (sección crítica y vuelo hasta el borde traccionado). Se separa de
 * {@link calcularArmadoDireccion} para poder reutilizarla con distribuciones no
 * centradas (p. ej. zapata de medianería).
 */
export function calcularArmadoDesdePresion(
  materiales: MaterialesDerivados,
  dimPerpendicular: number,
  H: number,
  d: number,
  sigmaMaxKPa: number,
  sigmaCriticaKPa: number,
  lM: number,
  armadura: ArmadoDireccion
): ResultadoArmadoDireccion {
  const { fcd, fyd, fydEstribos } = materiales;

  const tdKN =
    (sigmaCriticaKPa * dimPerpendicular * lM * (lM / 2) +
      (sigmaMaxKPa - sigmaCriticaKPa) * dimPerpendicular * (lM / 2) * ((2 * lM) / 3)) /
    (0.85 * d);

  // La planilla usa el fyd limitado ("fyd ByT", el mismo criterio que los estribos de vigas)
  // para pasar de tracción de cálculo a área de acero, no el fyd pleno.
  const asCalculadoCm2 = (tdKN / (fydEstribos * 1000)) * 100 ** 2;
  const asMinMecanicoCm2 = (100 ** 2 * 0.04 * dimPerpendicular * H * fcd) / fyd;
  const asMinGeometricoCm2 = (100 ** 2 * 0.9 * dimPerpendicular * H) / 1000;
  const asNecCm2 = Math.max(asCalculadoCm2, asMinMecanicoCm2, asMinGeometricoCm2);

  const asRealCm2 = (armadura.numero * Math.PI * (armadura.diametroMm / 10) ** 2) / 4;
  const verificaAs = asRealCm2 >= asNecCm2;

  const lbIMm = Math.max(1.3 * armadura.diametroMm ** 2, (materiales.fyk * armadura.diametroMm) / 20);
  const dmMm = 12 * armadura.diametroMm;

  return {
    sigmaMaxKPa,
    sigmaMinKPa: sigmaCriticaKPa,
    sigmaCriticaKPa,
    lM,
    dM: d,
    tdKN,
    asCalculadoCm2,
    asMinMecanicoCm2,
    asMinGeometricoCm2,
    asNecCm2,
    asRealCm2,
    verificaAs,
    lbIMm,
    dmMm,
    vEdKN: 0,
    vRdCKN: 0,
    verificaCorte: true,
  };
}

/** Arma una dirección de flexión asumiendo el pilar centrado en `dim` (caso general, zapata aislada). */
export function calcularArmadoDireccion(
  materiales: MaterialesDerivados,
  /** Dimensión propia de esta dirección (a lo largo de la cual varía la presión) */
  dim: number,
  /** Dimensión perpendicular (ancho que recibe la flexión) */
  dimPerpendicular: number,
  H: number,
  anchoPilar: number,
  d: number,
  cargas: CargasZapata,
  mk: number,
  armadura: ArmadoDireccion
): ResultadoArmadoDireccion {
  const { Nk } = cargas;

  const w = (dimPerpendicular * dim ** 2) / 6;
  const sigmaMaxKPa = (1.5 * Nk) / (dim * dimPerpendicular) + (1.5 * mk) / w;
  const sigmaMinKPa = (1.5 * Nk) / (dim * dimPerpendicular) - (1.5 * mk) / w;

  const lM = dim / 2 - anchoPilar / 4;
  const sigmaCriticaKPa = ((sigmaMaxKPa - sigmaMinKPa) / dim) * (dim / 2 + anchoPilar / 4) + sigmaMinKPa;

  const flexion = calcularArmadoDesdePresion(materiales, dimPerpendicular, H, d, sigmaMaxKPa, sigmaCriticaKPa, lM, armadura);

  // Cortante unidireccional (EC2 6.2.2), sección crítica a d de la cara del pilar.
  const vueloCorteM = dim / 2 - anchoPilar / 2 - d;
  const sigmaCorteKPa = ((sigmaMaxKPa - sigmaMinKPa) / dim) * (dim / 2 + anchoPilar / 2 + d) + sigmaMinKPa;
  const corte = calcularCorteUnidireccional(materiales, dimPerpendicular, d, sigmaCorteKPa, sigmaMaxKPa, vueloCorteM, flexion.asRealCm2);

  return { ...flexion, sigmaMinKPa, ...corte };
}

export function calcularZapataAislada(
  materiales: MaterialesDerivados,
  geometria: GeometriaZapataAislada,
  sigmaAdmisibleKPa: number,
  datos: DatosZapataAislada
): ResultadoZapataAislada {
  const { A, B, H, anchoPilarA, anchoPilarB, recubrimiento } = geometria;
  const { cargas, armadoA, armadoB } = datos;
  const { Nk, MkA, MkB } = cargas;

  // Vuelo de la zapata respecto del pilar en cada dirección: si es mayor que 2H,
  // el método simplificado (rígido) que usa este cálculo deja de ser válido.
  const vueloMaxM = Math.max((A - anchoPilarA) / 2, (B - anchoPilarB) / 2);

  const pesoPropioKN = 25 * A * B * H;
  const excA = Nk !== 0 ? MkA / Nk : 0;
  const excB = Nk !== 0 ? MkB / Nk : 0;
  const sigmaKPa = (Nk + pesoPropioKN) / ((A - 2 * excA) * (B - 2 * excB));
  const verificaTension = sigmaKPa <= sigmaAdmisibleKPa;

  const dA = H - recubrimiento - armadoA.diametroMm / 2000;
  const dB = H - recubrimiento - armadoB.diametroMm / 2000 - armadoA.diametroMm / 1000;

  const direccionA = calcularArmadoDireccion(materiales, A, B, H, anchoPilarA, dA, cargas, MkA, armadoA);
  const direccionB = calcularArmadoDireccion(materiales, B, A, H, anchoPilarB, dB, cargas, MkB, armadoB);

  const punzonamiento = calcularPunzonamiento(materiales, geometria, cargas, dA, dB, direccionA.asRealCm2, direccionB.asRealCm2);

  return {
    vueloMaxM,
    esRigida: vueloMaxM <= 2 * H,
    geotecnico: { pesoPropioKN, sigmaKPa, verificaTension },
    direccionA,
    direccionB,
    punzonamiento,
  };
}

/**
 * Punzonamiento (EC2 6.4). Perímetro de control básico u1 a 2d de la cara del pilar,
 * con esquinas redondeadas. β=1.15 es el valor recomendado por EC2 6.4.3(3) para
 * columnas donde la estabilidad lateral no depende de la acción de pórtico y la
 * excentricidad de carga es aproximadamente simétrica.
 *
 * Simplificación: no se recorta el perímetro si se sale del borde de la zapata
 * (caso de zapatas muy delgadas en relación a su vuelo); en ese caso, revisar a mano.
 */
function calcularPunzonamiento(
  materiales: MaterialesDerivados,
  geometria: GeometriaZapataAislada,
  cargas: CargasZapata,
  dA: number,
  dB: number,
  asRealACm2: number,
  asRealBCm2: number
): ResultadoPunzonamiento {
  const { A, B, anchoPilarA, anchoPilarB } = geometria;
  const { fck } = materiales;
  const { Nk } = cargas;
  const BETA_COLUMNA_INTERIOR = 1.15;

  const dPromedioM = (dA + dB) / 2;
  const u1M = 2 * (anchoPilarA + anchoPilarB) + 2 * Math.PI * 2 * dPromedioM;
  const areaDentroPerimetroM2 =
    anchoPilarA * anchoPilarB + 2 * (anchoPilarA + anchoPilarB) * 2 * dPromedioM + Math.PI * (2 * dPromedioM) ** 2;

  const sigmaDesignKPa = (1.5 * Nk) / (A * B);
  const vEdKN = Math.max(BETA_COLUMNA_INTERIOR * (1.5 * Nk - sigmaDesignKPa * areaDentroPerimetroM2), 0);

  const rhoLA = asRealACm2 / (100 ** 2 * B * dA);
  const rhoLB = asRealBCm2 / (100 ** 2 * A * dB);
  const rhoL = Math.sqrt(Math.min(rhoLA, 0.02) * Math.min(rhoLB, 0.02));

  const k = factorEscalaK(dPromedioM);
  const vRdCKN = tensionCortanteResistente(k, rhoL, fck) * u1M * dPromedioM * 1000;

  return { dPromedioM, u1M, vEdKN, vRdCKN, verificaPunzonamiento: vEdKN <= vRdCKN };
}
