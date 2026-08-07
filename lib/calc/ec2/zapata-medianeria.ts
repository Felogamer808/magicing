import { GAMMA_F } from "./coeficientes";
import type { MaterialesDerivados } from "./types";
import {
  calcularArmadoDesdePresion,
  calcularArmadoDireccion,
  calcularCorteUnidireccional,
  type ArmadoDireccion,
  type CargasZapata,
  type ResultadoArmadoDireccion,
} from "./zapata-aislada";

export type { ArmadoDireccion, CargasZapata };

export interface GeometriaZapataMedianeria {
  /** Dimensión total de la zapata en la dirección restringida por el límite (m) */
  A: number;
  /** Dimensión perpendicular, libre (m) */
  B: number;
  H: number;
  anchoPilarA: number;
  anchoPilarB: number;
  recubrimiento: number;
  /** Separación entre el límite de propiedad y la cara del pilar más cercana (m). 0 = pilar al ras del límite. */
  distanciaColumnaLimite: number;
}

export interface DatosZapataMedianeria {
  cargas: CargasZapata;
  armadoA: ArmadoDireccion;
  armadoB: ArmadoDireccion;
}

export interface ResultadoGeotecnicoMedianeria {
  pesoPropioKN: number;
  sigmaKPa: number;
  verificaTension: boolean;
}

export interface ResultadoZapataMedianeria {
  /** Excentricidad total del pilar respecto del centro de la zapata (geométrica + Mk/Nk), en m. */
  excentricidadM: number;
  /** e ≤ A/6: la distribución lineal de presiones sigue siendo válida (sin tracciones en el suelo). */
  dentroDelNucleo: boolean;
  vueloMaxM: number;
  esRigida: boolean;
  geotecnico: ResultadoGeotecnicoMedianeria;
  /** Armado del lado que da al límite de propiedad (vuelo corto). */
  ladoLimite: ResultadoArmadoDireccion;
  /** Armado del lado interior (vuelo largo). */
  ladoInterior: ResultadoArmadoDireccion;
  /** Armado en la dirección perpendicular, con el pilar centrado como en una zapata aislada normal. */
  direccionB: ResultadoArmadoDireccion;
}

export function calcularZapataMedianeria(
  materiales: MaterialesDerivados,
  geometria: GeometriaZapataMedianeria,
  sigmaAdmisibleKPa: number,
  datos: DatosZapataMedianeria
): ResultadoZapataMedianeria {
  const { A, B, H, anchoPilarA, anchoPilarB, recubrimiento, distanciaColumnaLimite } = geometria;
  const { cargas, armadoA, armadoB } = datos;
  const { Nk, MkA, MkB } = cargas;

  const xColumnaM = distanciaColumnaLimite + anchoPilarA / 2;
  // Excentricidad geométrica (pilar no centrado) + la que aporta el momento aplicado.
  const e0M = xColumnaM - A / 2;
  const excentricidadM = e0M + (Nk !== 0 ? MkA / Nk : 0);
  const dentroDelNucleo = Math.abs(excentricidadM) <= A / 6;

  const pesoPropioKN = 25 * A * B * H;
  const anchoEfectivoM = Math.max(A - 2 * Math.abs(excentricidadM), 0.01);
  const sigmaKPa = (Nk + pesoPropioKN) / (anchoEfectivoM * B);
  const verificaTension = sigmaKPa <= sigmaAdmisibleKPa && dentroDelNucleo;

  const dA = H - recubrimiento - armadoA.diametroMm / 2000;
  const dB = H - recubrimiento - armadoB.diametroMm / 2000 - armadoA.diametroMm / 1000;

  // Distribución de presiones (lineal, N/A ± M/W) usando el momento total respecto
  // del centro de la zapata: el geométrico (Nk·e0) más el aplicado (MkA).
  const momentoTotalKNm = Nk * e0M + MkA;
  const w = (B * A ** 2) / 6;
  const sigmaLimiteKPa = (GAMMA_F * Nk) / (A * B) - (GAMMA_F * momentoTotalKNm) / w; // borde en el límite (x=0)
  const sigmaInteriorKPa = (GAMMA_F * Nk) / (A * B) + (GAMMA_F * momentoTotalKNm) / w; // borde interior (x=A)

  const vueloLimiteM = distanciaColumnaLimite + anchoPilarA / 4;
  const vueloInteriorM = A - xColumnaM - anchoPilarA / 4;
  const vueloMaxM = Math.max(vueloLimiteM, vueloInteriorM, (B - anchoPilarB) / 2);
  const esRigida = vueloMaxM <= 2 * H;

  const sigmaCriticaLimiteKPa = sigmaLimiteKPa + ((sigmaInteriorKPa - sigmaLimiteKPa) / A) * (distanciaColumnaLimite + anchoPilarA / 4);
  const sigmaCriticaInteriorKPa = sigmaLimiteKPa + ((sigmaInteriorKPa - sigmaLimiteKPa) / A) * (xColumnaM + anchoPilarA / 4);

  const flexionLimite = calcularArmadoDesdePresion(materiales, B, H, dA, sigmaLimiteKPa, sigmaCriticaLimiteKPa, vueloLimiteM, armadoA);
  const flexionInterior = calcularArmadoDesdePresion(materiales, B, H, dA, sigmaInteriorKPa, sigmaCriticaInteriorKPa, vueloInteriorM, armadoA);

  // Cortante a d de cada cara del pilar (EC2 6.2.2), independiente a cada lado.
  const vueloCorteLimiteM = distanciaColumnaLimite - dA;
  const sigmaCorteLimiteKPa = sigmaLimiteKPa + ((sigmaInteriorKPa - sigmaLimiteKPa) / A) * (distanciaColumnaLimite - dA);
  const corteLimite = calcularCorteUnidireccional(materiales, B, dA, sigmaCorteLimiteKPa, sigmaLimiteKPa, vueloCorteLimiteM, flexionLimite.asRealCm2);

  const vueloCorteInteriorM = A - (xColumnaM + anchoPilarA / 2 + dA);
  const sigmaCorteInteriorKPa =
    sigmaLimiteKPa + ((sigmaInteriorKPa - sigmaLimiteKPa) / A) * (xColumnaM + anchoPilarA / 2 + dA);
  const corteInterior = calcularCorteUnidireccional(
    materiales,
    B,
    dA,
    sigmaCorteInteriorKPa,
    sigmaInteriorKPa,
    vueloCorteInteriorM,
    flexionInterior.asRealCm2
  );

  const ladoLimite: ResultadoArmadoDireccion = { ...flexionLimite, ...corteLimite };
  const ladoInterior: ResultadoArmadoDireccion = { ...flexionInterior, ...corteInterior };

  // Dirección B: el pilar sí está centrado en este eje, como en una zapata aislada normal.
  const direccionB = calcularArmadoDireccion(materiales, B, A, H, anchoPilarB, dB, cargas, MkB, armadoB);

  return {
    excentricidadM,
    dentroDelNucleo,
    vueloMaxM,
    esRigida,
    geotecnico: { pesoPropioKN, sigmaKPa, verificaTension },
    ladoLimite,
    ladoInterior,
    direccionB,
  };
}
