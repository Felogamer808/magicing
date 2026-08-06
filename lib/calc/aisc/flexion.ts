/**
 * Flexión de vigas de acero respecto del eje fuerte — AISC 360-16, artículo F2:
 * perfiles I doblemente simétricos y compactos, por el método ASD.
 *
 * Los dos estados límite del artículo son la plastificación (F2-1) y el pandeo
 * lateral-torsional (F2-2 y F2-3), y manda el menor de los dos.
 *
 * Alcance: solo secciones doblemente simétricas (PNI, HEB y 2PNC). El PNC simple
 * es un canal, y aunque F2 los cubre, su coeficiente `c` (ec. F2-8b) necesita la
 * constante de alabeo Cw, que no está en el catálogo: se rechaza en lugar de
 * inventarla.
 */

import { propiedades, type Familia } from "./perfiles";

/** Coeficiente de seguridad para flexión, AISC 360-16 art. F1. */
export const OMEGA_B = 1.67;

export interface DatosFlexion {
  familia: Familia;
  altura: number;
  separacionM?: number;
  /** Longitud sin arriostrar del ala comprimida, Lb, en metros. */
  lbM: number;
  /** Factor de modificación por diagrama de momentos, Cb. Conservador: 1. */
  cb: number;
  fyPa: number;
  ePa: number;
  /** Momento requerido, en kN·m. Opcional: solo para verificar. */
  mRequeridoKNm?: number;
}

export interface ResultadoFlexion {
  designacion: string;
  /** Momento plástico Mp = Fy·Zx, en kN·m (ec. F2-1). */
  mpKNm: number;
  /** Longitud límite de plastificación, en m (ec. F2-5). */
  lpM: number;
  /** Longitud límite de pandeo lateral-torsional inelástico, en m (ec. F2-6). */
  lrM: number;
  /** Radio de giro efectivo de la zona comprimida, en m (ec. F2-7). */
  rtsM: number;
  /** Distancia entre baricentros de alas, en m. */
  hoM: number;
  zona: "plastificación (Lb ≤ Lp)" | "inelástica (Lp < Lb ≤ Lr)" | "elástica (Lb > Lr)";
  /** Tensión crítica de pandeo lateral-torsional, en Pa (ec. F2-4). Nula si no aplica. */
  fcrPa: number | null;
  /** Resistencia nominal, en kN·m. */
  mnKNm: number;
  /** Resistencia admisible Mn/Ωb, en kN·m. */
  admisibleKNm: number;
  compacta: { alma: boolean; ala: boolean; esbeltezAla: number; esbeltezAlma: number };
  verifica: boolean | null;
  aprovechamiento: number | null;
}

/** Familias doblemente simétricas, únicas admitidas por este módulo. */
const DOBLEMENTE_SIMETRICAS: Familia[] = ["PNI", "HEB", "2PNC"];

export function calcularFlexion(datos: DatosFlexion): ResultadoFlexion {
  if (!DOBLEMENTE_SIMETRICAS.includes(datos.familia)) {
    throw new Error(
      `${datos.familia} no es doblemente simétrica: F2 necesita Cw para el coeficiente c (ec. F2-8b).`
    );
  }

  const p = propiedades(datos.familia, datos.altura, datos.separacionM ?? 0);
  const { fyPa, ePa, lbM, cb } = datos;

  // Distancia entre baricentros de alas.
  const hoM = p.hM - p.tfM;

  // Compacidad, art. B4.1 tabla B4.1b. Fuera de estos límites F2 no aplica.
  const esbeltezAla = p.bM / 2 / p.tfM;
  const esbeltezAlma = p.dM / p.twM;
  const compacta = {
    ala: esbeltezAla <= 0.38 * Math.sqrt(ePa / fyPa),
    alma: esbeltezAlma <= 3.76 * Math.sqrt(ePa / fyPa),
    esbeltezAla,
    esbeltezAlma,
  };

  const mpNm = fyPa * p.zxM3; // (F2-1)

  // En sección doblemente simétrica con alas rectangulares, Cw = Iy·ho²/4, y la
  // ec. F2-7 se reduce a rts² = Iy·ho/(2·Sx). El coeficiente c vale 1 (ec. F2-8a).
  const rtsM = Math.sqrt((p.iyM4 * hoM) / (2 * p.sxM3));
  const c = 1;

  const lpM = 1.76 * p.ryM * Math.sqrt(ePa / fyPa); // (F2-5)

  // (F2-6)
  const jc = p.jM4 * c;
  const termino = jc / (p.sxM3 * hoM);
  const lrM =
    1.95 *
    rtsM *
    (ePa / (0.7 * fyPa)) *
    Math.sqrt(termino + Math.sqrt(termino ** 2 + 6.76 * ((0.7 * fyPa) / ePa) ** 2));

  let zona: ResultadoFlexion["zona"];
  let mnNm: number;
  let fcrPa: number | null = null;

  if (lbM <= lpM) {
    // (a) El pandeo lateral-torsional no aplica: manda la plastificación.
    zona = "plastificación (Lb ≤ Lp)";
    mnNm = mpNm;
  } else if (lbM <= lrM) {
    // (b) Interpolación lineal entre Mp y 0,7·Fy·Sx (ec. F2-2), acotada por Mp.
    zona = "inelástica (Lp < Lb ≤ Lr)";
    const mr = 0.7 * fyPa * p.sxM3;
    mnNm = Math.min(cb * (mpNm - (mpNm - mr) * ((lbM - lpM) / (lrM - lpM))), mpNm);
  } else {
    // (c) Pandeo elástico (ec. F2-3 con F2-4), acotado por Mp.
    zona = "elástica (Lb > Lr)";
    const relacion = lbM / rtsM;
    fcrPa =
      ((cb * Math.PI ** 2 * ePa) / relacion ** 2) *
      Math.sqrt(1 + 0.078 * termino * relacion ** 2); // (F2-4)
    mnNm = Math.min(fcrPa * p.sxM3, mpNm); // (F2-3)
  }

  const mnKNm = mnNm / 1000;
  const admisibleKNm = mnKNm / OMEGA_B;
  const requerido = datos.mRequeridoKNm;

  return {
    designacion: `${datos.familia}${datos.altura}`,
    mpKNm: mpNm / 1000,
    lpM,
    lrM,
    rtsM,
    hoM,
    zona,
    fcrPa,
    mnKNm,
    admisibleKNm,
    compacta,
    verifica: requerido === undefined ? null : requerido <= admisibleKNm,
    aprovechamiento: requerido === undefined ? null : requerido / admisibleKNm,
  };
}
