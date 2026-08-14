/**
 * Cortante (art. 6.1.7), entalladura en el apoyo (art. 6.5.2) y torsión
 * (art. 6.1.8).
 *
 * Las tres comparten resistencia —fv,d— y por eso van juntas: la madera falla a
 * rasante por el mismo plano de fibra, venga el esfuerzo de un cortante, de una
 * concentración en la entalladura o de un momento torsor.
 */

import type { TipoMadera } from "@/lib/calc/madera/materiales";

/* ------------------------------------------------------------------ *
 * 6.1.7 — Cortante
 * ------------------------------------------------------------------ */

export interface ResultadoCortante {
  /** bef = kcr·b, ec. (6.13a). */
  anchoEficazM: number;
  /** τd = 1,5·V/(bef·h) para sección rectangular. */
  tauDMPa: number;
  fvdMPa: number;
  aprovechamiento: number;
  verifica: boolean;
}

export function verificarCortante(
  cortanteKN: number,
  anchoM: number,
  cantoM: number,
  kcr: number,
  fvdMPa: number
): ResultadoCortante {
  const anchoEficazM = kcr * anchoM;
  const areaM2 = anchoEficazM * cantoM;
  const tauDMPa = areaM2 > 0 ? (1.5 * cortanteKN) / (areaM2 * 1000) : Infinity;
  const aprovechamiento = fvdMPa > 0 ? tauDMPa / fvdMPa : Infinity;
  return { anchoEficazM, tauDMPa, fvdMPa, aprovechamiento, verifica: aprovechamiento <= 1 };
}

/* ------------------------------------------------------------------ *
 * 6.5.2 — Vigas con entalladura en el apoyo
 * ------------------------------------------------------------------ */

/** Ec. (6.63). */
export const KN: Record<TipoMadera, number> = {
  LVL: 4.5,
  maciza: 5,
  MLE: 6.5,
};

/** De qué lado está la entalladura respecto del apoyo, figura 6.11. */
export type LadoEntalladura = "mismo-lado" | "lado-opuesto";

export interface ResultadoEntalladura {
  /** α = hef/h. */
  alpha: number;
  /** Inclinación i de la entalladura, adimensional (1:i). */
  inclinacion: number;
  kv: number;
  anchoEficazM: number;
  tauDMPa: number;
  /** kv·fv,d, que es contra lo que se compara. */
  resistenciaReducidaMPa: number;
  aprovechamiento: number;
  verifica: boolean;
}

/**
 * Factor kv de la entalladura, ec. (6.62).
 *
 * Es el coeficiente más severo del capítulo: una entalladura recta y profunda
 * puede dejar kv en 0,3 y con eso la viga pierde dos tercios de su resistencia a
 * cortante justo donde el cortante es máximo. Lo que lo salva es la inclinación:
 * el término 1,1·i^1,5 premia el corte en pendiente, que es la razón por la que
 * las entalladuras se hacen achaflanadas y no a escuadra.
 *
 * Entalladura en la cara opuesta al apoyo: kv = 1, ec. (6.61). No hay
 * concentración porque la fibra traccionada no se corta.
 */
export function kvEntalladura(opciones: {
  tipo: TipoMadera;
  cantoM: number;
  cantoEficazM: number;
  /** Proyección horizontal de la entalladura, en metros. Cero si es a escuadra. */
  proyeccionM: number;
  /** Distancia del eje del apoyo al arranque de la entalladura, en metros. */
  distanciaApoyoM: number;
  lado: LadoEntalladura;
}): { kv: number; alpha: number; inclinacion: number } {
  const { tipo, cantoM: h, cantoEficazM: hef, proyeccionM, distanciaApoyoM: x, lado } = opciones;

  const alpha = h > 0 ? hef / h : 0;
  // i es la inclinación 1:i, o sea proyección horizontal sobre altura cortada.
  const alturaCortada = h - hef;
  const inclinacion = alturaCortada > 0 ? proyeccionM / alturaCortada : 0;

  if (lado === "lado-opuesto") return { kv: 1, alpha, inclinacion };
  if (alpha <= 0 || alpha >= 1) return { kv: 1, alpha, inclinacion };

  const hMm = h * 1000;
  const raizH = Math.sqrt(hMm);

  const numerador = KN[tipo] * (1 + (1.1 * inclinacion ** 1.5) / raizH);
  const denominador =
    raizH * (Math.sqrt(alpha * (1 - alpha)) + 0.8 * (x / h) * Math.sqrt(1 / alpha - alpha ** 2));

  return { kv: Math.min(1, numerador / denominador), alpha, inclinacion };
}

/** Ec. (6.60). El cortante se reparte sobre el canto reducido, no sobre el total. */
export function verificarEntalladura(opciones: {
  tipo: TipoMadera;
  cortanteKN: number;
  anchoM: number;
  cantoM: number;
  cantoEficazM: number;
  proyeccionM: number;
  distanciaApoyoM: number;
  lado: LadoEntalladura;
  kcr: number;
  fvdMPa: number;
}): ResultadoEntalladura {
  const { kv, alpha, inclinacion } = kvEntalladura(opciones);

  const anchoEficazM = opciones.kcr * opciones.anchoM;
  const areaM2 = anchoEficazM * opciones.cantoEficazM;
  const tauDMPa = areaM2 > 0 ? (1.5 * opciones.cortanteKN) / (areaM2 * 1000) : Infinity;
  const resistenciaReducidaMPa = kv * opciones.fvdMPa;
  const aprovechamiento =
    resistenciaReducidaMPa > 0 ? tauDMPa / resistenciaReducidaMPa : Infinity;

  return {
    alpha,
    inclinacion,
    kv,
    anchoEficazM,
    tauDMPa,
    resistenciaReducidaMPa,
    aprovechamiento,
    verifica: aprovechamiento <= 1,
  };
}

/* ------------------------------------------------------------------ *
 * 6.1.8 — Torsión
 * ------------------------------------------------------------------ */

/**
 * Coeficiente α1 de Saint-Venant para la sección rectangular: τmáx = T/(α1·h·b²).
 *
 * Es teoría de elasticidad, no articulado —la norma da kshape pero da por
 * sabida la tensión de torsión—, y en la planilla original se lee de una tabla
 * a mano. Se interpola linealmente entre los valores tabulados clásicos, que es
 * como se usa la tabla en papel.
 */
const ALPHA1: Array<[relacion: number, valor: number]> = [
  [1.0, 0.208],
  [1.2, 0.219],
  [1.5, 0.231],
  [2.0, 0.246],
  [2.5, 0.258],
  [3.0, 0.267],
  [4.0, 0.282],
  [5.0, 0.291],
  [6.0, 0.299],
  [10.0, 0.312],
];

/** Valor límite para h/b → ∞. */
const ALPHA1_LIMITE = 1 / 3;

export function alpha1Torsion(relacionHB: number): number {
  if (relacionHB <= ALPHA1[0][0]) return ALPHA1[0][1];
  if (relacionHB >= ALPHA1[ALPHA1.length - 1][0]) {
    // Más allá de h/b = 10 se interpola contra el límite teórico de 1/3.
    const [r0, v0] = ALPHA1[ALPHA1.length - 1];
    const t = Math.min(1, (relacionHB - r0) / (100 - r0));
    return v0 + t * (ALPHA1_LIMITE - v0);
  }
  for (let i = 1; i < ALPHA1.length; i++) {
    const [r1, v1] = ALPHA1[i];
    if (relacionHB <= r1) {
      const [r0, v0] = ALPHA1[i - 1];
      return v0 + ((relacionHB - r0) / (r1 - r0)) * (v1 - v0);
    }
  }
  return ALPHA1_LIMITE;
}

export type FormaSeccion = "rectangular" | "circular";

/**
 * Ec. (6.15).
 *
 * El tope de la sección rectangular es **1,3**. La planilla original lo pone en
 * 2, y con h/b = 2 las dos dan lo mismo por casualidad —1 + 0,15·2 = 1,3— así
 * que el error no se nota hasta que la pieza es más esbelta: con h/b = 4 la
 * norma sigue en 1,3 y la planilla llega a 1,6, un 23 % de sobrerresistencia.
 */
export function kshape(forma: FormaSeccion, relacionHB: number): number {
  if (forma === "circular") return 1.2;
  return Math.min(1.3, 1 + 0.15 * relacionHB);
}

export interface ResultadoTorsion {
  relacionHB: number;
  alpha1: number;
  kshape: number;
  tauTorDMPa: number;
  /** kshape·fv,d. */
  resistenciaReducidaMPa: number;
  aprovechamiento: number;
  verifica: boolean;
}

/** Ec. (6.14). */
export function verificarTorsion(opciones: {
  torsorKNm: number;
  anchoM: number;
  cantoM: number;
  forma: FormaSeccion;
  fvdMPa: number;
}): ResultadoTorsion {
  const { torsorKNm, anchoM: b, cantoM: h, forma, fvdMPa } = opciones;

  const relacionHB = b > 0 ? h / b : Infinity;
  const a1 = alpha1Torsion(relacionHB);

  const tauTorDMPa =
    forma === "circular"
      ? // Sección circular: τ = 16·T/(π·d³), con d tomado como la dimensión b.
        b > 0
        ? (16 * torsorKNm) / (Math.PI * b ** 3 * 1000)
        : Infinity
      : b > 0 && h > 0
        ? torsorKNm / (a1 * h * b ** 2 * 1000)
        : Infinity;

  const factor = kshape(forma, relacionHB);
  const resistenciaReducidaMPa = factor * fvdMPa;
  const aprovechamiento =
    resistenciaReducidaMPa > 0 ? tauTorDMPa / resistenciaReducidaMPa : Infinity;

  return {
    relacionHB,
    alpha1: a1,
    kshape: factor,
    tauTorDMPa,
    resistenciaReducidaMPa,
    aprovechamiento,
    verifica: aprovechamiento <= 1,
  };
}
