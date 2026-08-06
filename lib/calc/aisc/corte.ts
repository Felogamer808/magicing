/**
 * Corte en el alma — AISC 360-16, artículo G2 (perfiles I y canales), por el
 * método ASD, sin acción de campo tensional.
 *
 * El artículo tiene una particularidad que conviene no perder de vista: el
 * coeficiente de seguridad no es siempre 1,67. Las almas robustas de perfiles I
 * laminados —las que cumplen h/tw ≤ 2,24·√(E/Fy)— usan Ωv = 1,50, porque su
 * plastificación por corte está mucho mejor respaldada por ensayos. Es el único
 * lugar del capítulo con ese tratamiento (art. G1).
 */

import { propiedades, type Familia } from "./perfiles";

export interface DatosCorte {
  familia: Familia;
  altura: number;
  separacionM?: number;
  fyPa: number;
  ePa: number;
  /**
   * Separación libre entre rigidizadores transversales, en metros.
   * Sin rigidizadores, dejar en `undefined`.
   */
  separacionRigidizadoresM?: number;
  /** Corte requerido, en kN. Opcional: solo para verificar. */
  vRequeridoKN?: number;
}

export interface ResultadoCorte {
  designacion: string;
  /** Área del alma, Aw = d·tw con d la altura total (art. G2.1). */
  awM2: number;
  /** Esbeltez del alma h/tw, con h el alma recta. */
  esbeltezAlma: number;
  /** Coeficiente de pandeo por corte del alma, kv. */
  kv: number;
  /** Coeficiente de resistencia al corte del alma, Cv1. */
  cv1: number;
  /** Coeficiente de seguridad aplicado: 1,50 o 1,67 según el art. G1. */
  omegaV: number;
  /** true si entró por la excepción del art. G2.1(a). */
  almaRobusta: boolean;
  /** Resistencia nominal Vn = 0,6·Fy·Aw·Cv1, en kN (ec. G2-1). */
  vnKN: number;
  admisibleKN: number;
  verifica: boolean | null;
  aprovechamiento: number | null;
}

export function calcularCorte(datos: DatosCorte): ResultadoCorte {
  const p = propiedades(datos.familia, datos.altura, datos.separacionM ?? 0);
  const { fyPa, ePa } = datos;

  // Aw = altura total por espesor de alma. En el 2PNC son dos almas.
  const almas = datos.familia === "2PNC" ? 2 : 1;
  const awM2 = almas * p.hM * p.twM;

  const esbeltezAlma = p.hAlmaM / p.twM;
  const raiz = Math.sqrt(ePa / fyPa);

  // (G2.1a) Solo para perfiles I laminados: los canales van siempre por (b).
  const esPerfilI = datos.familia === "PNI" || datos.familia === "HEB";
  const almaRobusta = esPerfilI && esbeltezAlma <= 2.24 * raiz;

  let kv: number;
  let cv1: number;
  let omegaV: number;

  if (almaRobusta) {
    kv = 5.34;
    cv1 = 1.0; // (G2-2)
    omegaV = 1.5; // art. G1(a)
  } else {
    omegaV = 1.67;
    // (G2-5) kv = 5,34 sin rigidizadores, o si quedan muy separados.
    if (datos.separacionRigidizadoresM === undefined) {
      kv = 5.34;
    } else {
      const relacion = datos.separacionRigidizadoresM / p.hAlmaM;
      kv = relacion > 3 ? 5.34 : 5 + 5 / relacion ** 2;
    }
    const limite = 1.1 * Math.sqrt((kv * ePa) / fyPa);
    // (G2-3) y (G2-4)
    cv1 = esbeltezAlma <= limite ? 1.0 : limite / esbeltezAlma;
  }

  const vnKN = (0.6 * fyPa * awM2 * cv1) / 1000; // (G2-1)
  const admisibleKN = vnKN / omegaV;
  const requerido = datos.vRequeridoKN;

  return {
    designacion: `${datos.familia}${datos.altura}`,
    awM2,
    esbeltezAlma,
    kv,
    cv1,
    omegaV,
    almaRobusta,
    vnKN,
    admisibleKN,
    verifica: requerido === undefined ? null : requerido <= admisibleKN,
    aprovechamiento: requerido === undefined ? null : requerido / admisibleKN,
  };
}
