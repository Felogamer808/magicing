/**
 * Corte en el alma de una T — AISC 360-16, art. G3 (angulares simples y tes),
 * por el método ASD.
 *
 *   Vn = 0,6·Fy·b·t·Cv2      (G3-1)
 *
 * con b = d el alto total de la T, t = tw, kv = 1,2 y Cv2 de las ecs. (G2-9) a
 * (G2-11) con h/tw = d/tw. Ωv = 1,67 (art. G1).
 *
 * Pendiente: contrastar contra el texto de AISC 360-16, que no está en el
 * proyecto.
 */

import { designacion, propiedades, type Familia, type ParametrosPerfil } from "@/lib/calc/acero/perfiles";
import { SeccionFueraDeAlcance } from "@/lib/calc/acero/flexion";

export interface DatosCorteTe {
  familia: Familia;
  params: ParametrosPerfil;
  fyPa: number;
  ePa: number;
  vRequeridoKN?: number;
}

export interface ResultadoG3 {
  articulo: "G3";
  designacion: string;
  /** b·t = d·tw. */
  awM2: number;
  /** d/tw. */
  esbeltezAlma: number;
  kv: number;
  cv2: number;
  omegaV: number;
  vnKN: number;
  admisibleKN: number;
  verifica: boolean | null;
  aprovechamiento: number | null;
}

/** Coeficiente de pandeo por corte del alma de una T, art. G3. */
export const KV_TE = 1.2;

/** Cv2 de las ecs. (G2-9) a (G2-11). */
export function coeficienteCv2(esbeltez: number, kv: number, fyPa: number, ePa: number): number {
  const base = Math.sqrt((kv * ePa) / fyPa);
  if (esbeltez <= 1.1 * base) return 1; // (G2-9)
  if (esbeltez <= 1.37 * base) return (1.1 * base) / esbeltez; // (G2-10)
  return (1.51 * kv * ePa) / (esbeltez ** 2 * fyPa); // (G2-11)
}

export function calcularG3(datos: DatosCorteTe): ResultadoG3 {
  const p = propiedades(datos.familia, datos.params);
  if (!p.te) {
    throw new SeccionFueraDeAlcance("G2", "El artículo G3 es para tes y angulares; esta sección va por otro artículo del capítulo G.");
  }
  const awM2 = p.hM * p.twM;
  const esbeltezAlma = p.hM / p.twM;
  const cv2 = coeficienteCv2(esbeltezAlma, KV_TE, datos.fyPa, datos.ePa);
  const omegaV = 1.67;
  const vnKN = (0.6 * datos.fyPa * awM2 * cv2) / 1000; // (G3-1)
  const admisibleKN = vnKN / omegaV;
  const requerido = datos.vRequeridoKN;

  return {
    articulo: "G3",
    designacion: designacion(datos.familia, datos.params),
    awM2,
    esbeltezAlma,
    kv: KV_TE,
    cv2,
    omegaV,
    vnKN,
    admisibleKN,
    verifica: requerido === undefined ? null : requerido <= admisibleKN,
    aprovechamiento: requerido === undefined ? null : requerido / admisibleKN,
  };
}
