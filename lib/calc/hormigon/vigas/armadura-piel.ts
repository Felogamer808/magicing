import { areaBarraCm2 } from "@/lib/calc/armaduras";
import { estadoSinFisurar, franjasSeccion, type AlaServicio } from "@/lib/calc/hormigon/comun/seccion-franjas";

/**
 * Armadura de piel en las caras laterales de una viga, Anejo 19.
 *
 * Dos motivos distintos, cada uno con su artículo:
 *
 * - Fisuración en las caras, art. 7.3.3 (3), pág. 114: con h ≥ 1000 mm. Área
 *   mínima de la ec. (7.1) con k = 0,5 y σs = fyk; kc = 0,4 de la ec. (7.2) en
 *   flexión simple (σc = 0). Va entre la armadura de tracción y la fibra
 *   neutra, dentro de los cercos. La separación sale de la tabla A19.7.3 con la
 *   simplificación del mismo artículo: tracción pura y la mitad de la tensión
 *   asignada a la armadura principal.
 * - Desconchamiento, Apéndice J.1, con barras de más de Ø32: 0,01·Act,ext en
 *   las dos direcciones, por fuera de los cercos y a no más de 150 mm.
 *
 * Criterios del usuario (2026-11-17):
 * - Desde h = 600 mm y hasta 1000 mm se da igual, con el mismo cálculo, como
 *   piel constructiva: el Anejo 19 no la pide ahí.
 * - El área de la (7.1) es el total de la zona traccionada del alma: mitad por
 *   cara.
 * - Tensión asignada a la principal = fyk (la de la ec. (7.1)), así que la
 *   tabla A19.7.3 entra con fyk/2 y wk = 0,3 mm. Basta cumplir la tabla de
 *   separaciones (art. 7.3.3 (2): la A19.7.2 "o" la A19.7.3).
 */

/** Desde este canto la exige el art. 7.3.3 (3). */
export const CANTO_PIEL_EXIGIDA_M = 1.0;
/** Desde este canto se da como constructiva (criterio del usuario). */
export const CANTO_PIEL_CONSTRUCTIVA_M = 0.6;
/** Diámetro a partir del cual el Apéndice J.1 pide piel contra el desconchamiento (mm). */
export const DIAMETRO_DESCONCHAMIENTO_MM = 32;

const K_PIEL = 0.5;
const KC_FLEXION_SIMPLE = 0.4;
const DIAMETROS_PIEL_MM = [8, 10, 12, 16] as const;

/** Tabla A19.7.3, columna wk = 0,3 mm: separación máxima (mm) según σs (MPa). */
const SEPARACION_WK03: readonly [number, number][] = [
  [160, 300], [200, 250], [240, 200], [280, 150], [320, 100], [360, 50],
];

/** Separación máxima de la tabla A19.7.3 (wk = 0,3 mm), interpolada linealmente. */
export function separacionMaximaTablaMm(sigmaSMPa: number): number {
  const t = SEPARACION_WK03;
  if (sigmaSMPa <= t[0][0]) return t[0][1];
  for (let i = 1; i < t.length; i++) {
    const [s1, v1] = t[i];
    const [s0, v0] = t[i - 1];
    if (sigmaSMPa <= s1) return v0 + ((v1 - v0) * (sigmaSMPa - s0)) / (s1 - s0);
  }
  return NaN; // fuera de tabla: con σs > 360 MPa no hay separación que sirva
}

export interface DatosPiel {
  /** Ancho del alma (m) */
  anchoAlmaM: number;
  /** Canto total (m) */
  cantoM: number;
  /** Canto útil de la armadura de tracción (m) */
  dM: number;
  /** Ala de la T con b_eff, para la fibra neutra sin fisurar; sin ella, rectángulo */
  ala?: AlaServicio;
  /** Recubrimiento geométrico hasta el estribo (m) */
  recubrimientoM: number;
  fctmMPa: number;
  fykMPa: number;
  /** Mayor diámetro de la armadura principal de tracción (mm) */
  diametroMaximoMm: number;
  /** Fibra neutra de ELU de la flexión (m), para Act,ext del Apéndice J */
  xEluM: number;
}

export interface PropuestaPiel {
  diametroMm: number;
  /** Barras por cara */
  barrasPorCara: number;
  /** Separación entre barras (mm) */
  separacionMm: number;
  /** Área dispuesta por cara (cm²) */
  areaPorCaraCm2: number;
}

export type MotivoFisuracion = "exigida" | "constructiva" | "no-requiere";

export interface ResultadoPiel {
  motivo: MotivoFisuracion;
  /** Fibra neutra de la sección sin fisurar, desde la cara comprimida (m) */
  xSinFisurarM: number;
  /** Act = bw·(h − x), zona traccionada del alma (m²) */
  actM2: number;
  /** Área de la ec. (7.1), total de las dos caras (cm²) */
  areaTotalCm2: number;
  areaPorCaraCm2: number;
  /** Altura donde va la piel: de la armadura de tracción a la fibra neutra (m) */
  alturaZonaM: number;
  /** σs con que entra la tabla A19.7.3 (MPa) */
  sigmaTablaMPa: number;
  separacionMaximaMm: number;
  propuesta: PropuestaPiel | null;
  /** Apéndice J.1, sólo con barras de más de Ø32 */
  desconchamiento: {
    actExtM2: number;
    /** 0,01·Act,ext en cada dirección (cm²) */
    areaMinimaCm2: number;
  } | null;
}

/**
 * Barras por cara: para cada diámetro, las que pide el área y las que pide la
 * separación, y queda el que menos acero pone (a igualdad, el más fino).
 */
function proponer(areaPorCaraCm2: number, alturaZonaMm: number, separacionMaximaMm: number): PropuestaPiel | null {
  if (!(alturaZonaMm > 0) || !(separacionMaximaMm > 0)) return null;
  let mejor: PropuestaPiel | null = null;
  for (const diametroMm of DIAMETROS_PIEL_MM) {
    const area = areaBarraCm2(diametroMm);
    const porSeparacion = Math.ceil(alturaZonaMm / separacionMaximaMm - 1e-9);
    const porArea = Math.ceil(areaPorCaraCm2 / area - 1e-9);
    const barrasPorCara = Math.max(porSeparacion, porArea, 1);
    const p = { diametroMm, barrasPorCara, separacionMm: alturaZonaMm / barrasPorCara, areaPorCaraCm2: barrasPorCara * area };
    if (!mejor || p.areaPorCaraCm2 < mejor.areaPorCaraCm2 - 1e-9) mejor = p;
  }
  return mejor;
}

export function calcularArmaduraPiel(datos: DatosPiel): ResultadoPiel {
  const { anchoAlmaM, cantoM, dM, ala, recubrimientoM, fctmMPa, fykMPa, diametroMaximoMm, xEluM } = datos;

  // Fibra neutra de la sección bruta sin fisurar: Act es "la parte calculada
  // para estar traccionada justo antes de que se forme la primera fisura".
  const xSinFisurarM = estadoSinFisurar(franjasSeccion(anchoAlmaM, cantoM, ala), dM, 0, 0, 0, 1).xM;
  const actM2 = anchoAlmaM * Math.max(cantoM - xSinFisurarM, 0);
  // ec. (7.1): As·σs = kc·k·fct,eff·Act, con σs = fyk
  const areaTotalCm2 = ((KC_FLEXION_SIMPLE * K_PIEL * fctmMPa * actM2) / fykMPa) * 1e4;

  const motivo: MotivoFisuracion =
    cantoM >= CANTO_PIEL_EXIGIDA_M - 1e-9 ? "exigida" : cantoM >= CANTO_PIEL_CONSTRUCTIVA_M - 1e-9 ? "constructiva" : "no-requiere";

  const alturaZonaM = Math.max(dM - xSinFisurarM, 0);
  const sigmaTablaMPa = fykMPa / 2;
  const separacionMaximaMm = separacionMaximaTablaMm(sigmaTablaMPa);

  // Apéndice J.1, fig. A19.J.1: el recubrimiento por fuera de los cercos, en
  // el fondo y en las dos caras hasta la fibra neutra de ELU.
  const desconchamiento =
    diametroMaximoMm > DIAMETRO_DESCONCHAMIENTO_MM
      ? (() => {
          const actExtM2 = recubrimientoM * (anchoAlmaM + 2 * Math.max(cantoM - xEluM, 0));
          return { actExtM2, areaMinimaCm2: 0.01 * actExtM2 * 1e4 };
        })()
      : null;

  return {
    motivo,
    xSinFisurarM,
    actM2,
    areaTotalCm2,
    areaPorCaraCm2: areaTotalCm2 / 2,
    alturaZonaM,
    sigmaTablaMPa,
    separacionMaximaMm,
    propuesta: motivo === "no-requiere" ? null : proponer(areaTotalCm2 / 2, alturaZonaM * 1000, separacionMaximaMm),
    desconchamiento,
  };
}
