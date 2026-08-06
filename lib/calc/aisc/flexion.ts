/**
 * Flexión de vigas de acero — AISC 360-16, por el método ASD:
 *
 *   art. F2  eje fuerte, perfiles I y canales compactos
 *   art. F6  eje débil, perfiles I y canales
 *
 * En F2 los dos estados límite son la plastificación (F2-1) y el pandeo
 * lateral-torsional (F2-2 y F2-3), y manda el menor. En F6 son la plastificación
 * (F6-1) y el pandeo local del ala (F6-2 y F6-3): alrededor del eje débil no hay
 * pandeo lateral-torsional, porque ya se está flexionando por el eje flexible.
 */

import { propiedades, type Familia, type PropiedadesSeccion } from "./perfiles";

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

export interface Compacidad {
  ala: boolean;
  alma: boolean;
  esbeltezAla: number;
  esbeltezAlma: number;
  limiteAlaCompacta: number;
  limiteAlaNoCompacta: number;
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
  /** Coeficiente c: 1 en secciones doblemente simétricas, ec. F2-8b en canales. */
  c: number;
  /** Distancia entre baricentros de alas, en m. */
  hoM: number;
  zona: "plastificación (Lb ≤ Lp)" | "inelástica (Lp < Lb ≤ Lr)" | "elástica (Lb > Lr)";
  /** Tensión crítica de pandeo lateral-torsional, en Pa (ec. F2-4). Nula si no aplica. */
  fcrPa: number | null;
  mnKNm: number;
  admisibleKNm: number;
  compacta: Compacidad;
  verifica: boolean | null;
  aprovechamiento: number | null;
}

export interface ResultadoFlexionEjeDebil {
  designacion: string;
  /** Mp = Fy·Zy, acotado por 1,6·Fy·Sy (ec. F6-1). */
  mpKNm: number;
  /** true si el tope de 1,6·Fy·Sy fue el que mandó. */
  limitadoPorSy: boolean;
  estado: "plastificación" | "ala no compacta (F6-2)" | "ala esbelta (F6-3)";
  mnKNm: number;
  admisibleKNm: number;
  compacta: Compacidad;
  verifica: boolean | null;
  aprovechamiento: number | null;
}

/**
 * Compacidad del ala y del alma, art. B4.1 tabla B4.1b.
 *
 * En perfiles I el ala trabaja como placa apoyada en un borde con media ala en
 * voladizo, y λ vale bf/2tf; en canales el ala entera vuela desde el alma, así
 * que λ vale bf/tf.
 */
function compacidad(p: PropiedadesSeccion, fyPa: number, ePa: number): Compacidad {
  const raiz = Math.sqrt(ePa / fyPa);
  const esbeltezAla = p.doblementeSimetrica ? p.bM / 2 / p.tfM : p.bM / p.tfM;
  const esbeltezAlma = p.hAlmaM / p.twM;

  const limiteAlaCompacta = 0.38 * raiz;
  const limiteAlaNoCompacta = 1.0 * raiz;

  return {
    ala: esbeltezAla <= limiteAlaCompacta,
    alma: esbeltezAlma <= 3.76 * raiz,
    esbeltezAla,
    esbeltezAlma,
    limiteAlaCompacta,
    limiteAlaNoCompacta,
  };
}

export function calcularFlexion(datos: DatosFlexion): ResultadoFlexion {
  const p = propiedades(datos.familia, datos.altura, datos.separacionM ?? 0);
  const { fyPa, ePa, lbM, cb } = datos;

  const hoM = p.hM - p.tfM;
  const compacta = compacidad(p, fyPa, ePa);
  const mpNm = fyPa * p.zxM3; // (F2-1)

  // (F2-7) en su forma general: rts² = √(Iy·Cw)/Sx, con el Cw tabulado.
  const rtsM = Math.sqrt(Math.sqrt(p.iyM4 * p.cwM6) / p.sxM3);
  // (F2-8a) para secciones doblemente simétricas, (F2-8b) para canales.
  const c = p.doblementeSimetrica ? 1 : (hoM / 2) * Math.sqrt(p.iyM4 / p.cwM6);

  const lpM = 1.76 * p.ryM * Math.sqrt(ePa / fyPa); // (F2-5)

  const termino = (p.jM4 * c) / (p.sxM3 * hoM);
  const lrM =
    1.95 *
    rtsM *
    (ePa / (0.7 * fyPa)) *
    Math.sqrt(termino + Math.sqrt(termino ** 2 + 6.76 * ((0.7 * fyPa) / ePa) ** 2)); // (F2-6)

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
    c,
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

/** Flexión alrededor del eje débil, art. F6. No depende de Lb ni de Cb. */
export function calcularFlexionEjeDebil(
  datos: Omit<DatosFlexion, "lbM" | "cb">
): ResultadoFlexionEjeDebil {
  const p = propiedades(datos.familia, datos.altura, datos.separacionM ?? 0);
  const { fyPa, ePa } = datos;

  const compacta = compacidad(p, fyPa, ePa);

  // (F6-1): el tope de 1,6·Fy·Sy limita la reserva plástica admitida.
  const plastico = fyPa * p.zyM3;
  const tope = 1.6 * fyPa * p.syM3;
  const mpNm = Math.min(plastico, tope);

  let mnNm = mpNm;
  let estado: ResultadoFlexionEjeDebil["estado"] = "plastificación";

  if (!compacta.ala) {
    const { esbeltezAla, limiteAlaCompacta, limiteAlaNoCompacta } = compacta;
    if (esbeltezAla <= limiteAlaNoCompacta) {
      // (F6-2) ala no compacta: interpolación hasta 0,7·Fy·Sy.
      estado = "ala no compacta (F6-2)";
      mnNm =
        mpNm -
        (mpNm - 0.7 * fyPa * p.syM3) *
          ((esbeltezAla - limiteAlaCompacta) / (limiteAlaNoCompacta - limiteAlaCompacta));
    } else {
      // (F6-3) con (F6-4) ala esbelta: pandeo local elástico.
      estado = "ala esbelta (F6-3)";
      const fcrPa = (0.69 * ePa) / esbeltezAla ** 2;
      mnNm = fcrPa * p.syM3;
    }
  }

  const mnKNm = mnNm / 1000;
  const admisibleKNm = mnKNm / OMEGA_B;
  const requerido = datos.mRequeridoKNm;

  return {
    designacion: `${datos.familia}${datos.altura}`,
    mpKNm: mpNm / 1000,
    limitadoPorSy: tope < plastico,
    estado,
    mnKNm,
    admisibleKNm,
    compacta,
    verifica: requerido === undefined ? null : requerido <= admisibleKNm,
    aprovechamiento: requerido === undefined ? null : requerido / admisibleKNm,
  };
}
