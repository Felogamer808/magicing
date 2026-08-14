/**
 * Flexión: art. 6.1.6 (simple y esviada) y art. 6.3.3 (vuelco lateral).
 *
 * Son dos comprobaciones distintas sobre la misma pieza y conviene no
 * confundirlas: la del 6.1.6 agota el material, la del 6.3.3 la vuelca de
 * costado antes de agotarlo. Una viga de canto puede pasar holgada la primera
 * y no llegar a la mitad en la segunda.
 */

import { propiedades, tensionFlexionMPa, type SeccionRectangular } from "@/lib/calc/madera/seccion";

/* ------------------------------------------------------------------ *
 * 6.1.6 — Flexión simple y esviada
 * ------------------------------------------------------------------ */

export interface ResultadoFlexionEsviada {
  sigmaMYdMPa: number;
  sigmaMZdMPa: number;
  /** Ec. (6.11): σm,y/fm,y + km·σm,z/fm,z. */
  aprovechamiento611: number;
  /** Ec. (6.12): km·σm,y/fm,y + σm,z/fm,z. */
  aprovechamiento612: number;
  /** El mayor de los dos, que es el que manda. */
  aprovechamiento: number;
  verifica: boolean;
}

/**
 * Ecs. (6.11) y (6.12).
 *
 * Hay que escribir las dos y quedarse con la peor. No es simetría redundante:
 * km sólo afecta a uno de los dos sumandos por expresión, así que cuál de las
 * dos gobierna depende de cuál flexión sea la grande. Con km = 0,7 y momentos
 * parecidos las dos dan lo mismo; con uno dominante, difieren.
 */
export function flexionEsviada(
  sigmaMYdMPa: number,
  sigmaMZdMPa: number,
  fmYdMPa: number,
  fmZdMPa: number,
  km: number
): ResultadoFlexionEsviada {
  const ry = fmYdMPa > 0 ? sigmaMYdMPa / fmYdMPa : Infinity;
  const rz = fmZdMPa > 0 ? sigmaMZdMPa / fmZdMPa : Infinity;

  const aprovechamiento611 = ry + km * rz;
  const aprovechamiento612 = km * ry + rz;
  const aprovechamiento = Math.max(aprovechamiento611, aprovechamiento612);

  return {
    sigmaMYdMPa,
    sigmaMZdMPa,
    aprovechamiento611,
    aprovechamiento612,
    aprovechamiento,
    verifica: aprovechamiento <= 1,
  };
}

/* ------------------------------------------------------------------ *
 * 6.3.3 — Vuelco lateral
 * ------------------------------------------------------------------ */

/** Tabla 6.1: tipo de viga y de carga que fijan la relación lef/l. */
export type CasoVuelco =
  | "apoyada-momento-constante"
  | "apoyada-distribuida"
  | "apoyada-puntual-centro"
  | "voladizo-distribuida"
  | "voladizo-puntual-extremo";

/** Dónde se aplica la carga respecto al centro de gravedad, nota a la tabla 6.1. */
export type BordeCarga = "comprimido" | "centro-gravedad" | "traccionado";

export const RELACION_LEF: Record<CasoVuelco, number> = {
  "apoyada-momento-constante": 1.0,
  "apoyada-distribuida": 0.9,
  "apoyada-puntual-centro": 0.8,
  "voladizo-distribuida": 0.5,
  "voladizo-puntual-extremo": 0.8,
};

export const NOMBRE_CASO_VUELCO: Record<CasoVuelco, string> = {
  "apoyada-momento-constante": "Simplemente apoyada · momento constante",
  "apoyada-distribuida": "Simplemente apoyada · carga uniformemente distribuida",
  "apoyada-puntual-centro": "Simplemente apoyada · carga concentrada en el centro",
  "voladizo-distribuida": "Voladizo · carga uniformemente distribuida",
  "voladizo-puntual-extremo": "Voladizo · carga concentrada en el extremo",
};

/**
 * Longitud eficaz de vuelco, tabla 6.1 y su nota.
 *
 * El corrimiento por el borde de aplicación es lo que más mueve el resultado y
 * lo que más se olvida: colgar la carga del borde comprimido suma 2h a la
 * longitud eficaz —en una viga de 1,25 m de canto son 2,5 m— porque la carga
 * acompaña al giro y lo amplifica. Aplicada en el borde traccionado, en cambio,
 * endereza la viga y se descuentan 0,5h.
 */
export function longitudEficazM(
  luzM: number,
  caso: CasoVuelco,
  borde: BordeCarga,
  cantoM: number
): number {
  const base = RELACION_LEF[caso] * luzM;
  if (borde === "comprimido") return base + 2 * cantoM;
  if (borde === "traccionado") return Math.max(base - 0.5 * cantoM, 0);
  return base;
}

/**
 * Tensión crítica de vuelco.
 *
 * Ec. (6.32) es la simplificación para coníferas de sección rectangular, que es
 * lo que usa la planilla. Ec. (6.31) es la general, que sirve para cualquier
 * sección y para frondosas, y se calcula igual para poder contrastarlas: si la
 * simplificada se aleja de la general, es señal de que la pieza está fuera del
 * campo donde vale.
 */
export interface TensionCritica {
  /** Ec. (6.32), 0,78·b²·E0,05/(h·lef). */
  simplificadaMPa: number;
  /** Ec. (6.31), √(E0,05·Iz·G0,05·Itor)/(lef·Wy). */
  generalMPa: number;
}

export function tensionCritica(
  seccion: SeccionRectangular,
  longitudEficazMetros: number,
  e005GPa: number,
  g005GPa: number
): TensionCritica {
  const { izM4, itorM4, wyM3 } = propiedades(seccion);
  const { anchoM: b, cantoM: h } = seccion;

  // Los módulos entran en GPa y salen tensiones en MPa: el factor 1000 es el
  // cambio de GPa a MPa, con las longitudes ya en metros.
  const simplificadaMPa =
    longitudEficazMetros > 0 ? ((0.78 * b ** 2) / (h * longitudEficazMetros)) * e005GPa * 1000 : Infinity;

  const generalMPa =
    longitudEficazMetros > 0 && wyM3 > 0
      ? (Math.sqrt(e005GPa * 1000 * izM4 * g005GPa * 1000 * itorM4) * Math.PI) /
        (longitudEficazMetros * wyM3)
      : Infinity;

  return { simplificadaMPa, generalMPa };
}

/** Ec. (6.34). */
export function kcrit(lambdaRelM: number): number {
  if (lambdaRelM <= 0.75) return 1;
  if (lambdaRelM <= 1.4) return 1.56 - 0.75 * lambdaRelM;
  return 1 / lambdaRelM ** 2;
}

export interface ResultadoVuelco {
  longitudEficazM: number;
  sigmaCritMPa: number;
  /** Ec. (6.30). */
  lambdaRelM: number;
  kcrit: number;
  /** kcrit·fm,d, que es contra lo que se compara. */
  resistenciaReducidaMPa: number;
  sigmaMdMPa: number;
  aprovechamiento: number;
  verifica: boolean;
  /** true cuando λrel,m ≤ 0,75 y el vuelco no reduce nada. */
  sinReduccion: boolean;
}

/**
 * Comprobación de vuelco, ec. (6.33).
 *
 * `arriostrado` cubre el art. 6.3.3(5): si el borde comprimido está impedido en
 * toda su longitud y los apoyos no giran, kcrit = 1 sin más cuenta. Es la
 * situación de una viga con la losa clavada encima, y conviene poder decirlo en
 * vez de fabricar una longitud eficaz corta para simularlo.
 */
export function verificarVuelco(opciones: {
  seccion: SeccionRectangular;
  luzM: number;
  caso: CasoVuelco;
  borde: BordeCarga;
  e005GPa: number;
  g005GPa: number;
  fmkMPa: number;
  fmdMPa: number;
  sigmaMdMPa: number;
  arriostrado?: boolean;
  usarGeneral?: boolean;
}): ResultadoVuelco {
  const { seccion, luzM, caso, borde, e005GPa, g005GPa, fmkMPa, fmdMPa, sigmaMdMPa } = opciones;

  const lef = longitudEficazM(luzM, caso, borde, seccion.cantoM);
  const critica = tensionCritica(seccion, lef, e005GPa, g005GPa);
  const sigmaCritMPa = opciones.usarGeneral ? critica.generalMPa : critica.simplificadaMPa;

  const lambdaRelM = sigmaCritMPa > 0 ? Math.sqrt(fmkMPa / sigmaCritMPa) : Infinity;
  const factor = opciones.arriostrado ? 1 : kcrit(lambdaRelM);
  const resistenciaReducidaMPa = factor * fmdMPa;
  const aprovechamiento =
    resistenciaReducidaMPa > 0 ? sigmaMdMPa / resistenciaReducidaMPa : Infinity;

  return {
    longitudEficazM: lef,
    sigmaCritMPa,
    lambdaRelM,
    kcrit: factor,
    resistenciaReducidaMPa,
    sigmaMdMPa,
    aprovechamiento,
    verifica: aprovechamiento <= 1,
    sinReduccion: factor >= 1,
  };
}

/** Atajo para la flexión recta: tensión y comprobación en un paso. */
export function verificarFlexionSimple(
  momentoKNm: number,
  seccion: SeccionRectangular,
  fmdMPa: number
): { sigmaMdMPa: number; aprovechamiento: number; verifica: boolean } {
  const { wyM3 } = propiedades(seccion);
  const sigmaMdMPa = tensionFlexionMPa(momentoKNm, wyM3);
  const aprovechamiento = fmdMPa > 0 ? sigmaMdMPa / fmdMPa : Infinity;
  return { sigmaMdMPa, aprovechamiento, verifica: aprovechamiento <= 1 };
}
