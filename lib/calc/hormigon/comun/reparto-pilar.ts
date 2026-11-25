/**
 * Reparto del axil de un pilar entre el hormigón y sus barras, por el Anejo 19.
 *
 * Sirve para el pilar que apoya sobre una viga con las barras bajando ancladas
 * hasta la cara inferior: lo que lleva el hormigón entra por arriba, en la
 * cabeza comprimida, y no hay que colgarlo; lo que llevan las barras entra por
 * adherencia a lo largo del anclaje, por debajo, y hay que subirlo con cercos.
 *
 * En compresión centrada hormigón y acero se acortan juntos, y la deformación
 * media se limita a εc2 (art. 6.1(5), pág. 74). Con esa deformación:
 * - el hormigón está en fcd = αcc·fck/γc, con αcc = 1,00 (art. 3.1.6(1),
 *   ec. (3.15), pág. 29);
 * - el acero está en σs = mín(fyd; Es·εc2), con Es = 200 000 MPa
 *   (art. 3.2.7(4), pág. 35): 400 MPa con fck ≤ 50, sin llegar a fyd.
 * εc2 sale de la tabla A19.3.1 (pág. 24): 2,0 ‰ hasta C50 y
 * 2,0 + 0,085·(fck − 50)^0,53 ‰ por encima.
 *
 * La fracción de las barras es As·σs / (Ac,neta·fcd + As·σs). Con la cuantía
 * máxima del pilar, As = 0,04·Ac (art. 9.5.2(3), pág. 150), y HA-25 da ≈ 50 %.
 *
 * Que esa parte haya que colgarla es criterio del proyectista, no un artículo:
 * el Anejo sólo pide colgar la reacción entera en el apoyo indirecto
 * (art. 9.2.5(1), pág. 145). Por eso la fracción se ofrece como valor por
 * defecto y se deja editar.
 */

import { ES_MPA, GAMMA_C, GAMMA_S } from "@/lib/calc/hormigon/comun/coeficientes";

export interface DatosRepartoPilar {
  fckMPa: number;
  fykMPa: number;
  /** Lados de la sección rectangular del pilar (m). */
  bM: number;
  hM: number;
  /** Armadura longitudinal total del pilar (cm²). */
  asCm2: number;
}

export interface ResultadoRepartoPilar {
  epsilonC2: number;
  fcdMPa: number;
  fydMPa: number;
  /** Tensión del acero con el acortamiento εc2 (MPa). */
  sigmaSMPa: number;
  /** Área de hormigón descontadas las barras (m²). */
  acNetaM2: number;
  capacidadHormigonKN: number;
  capacidadAceroKN: number;
  /** Parte del axil que llevan las barras, 0 a 1. */
  fraccionArmadura: number;
  /** As/Ac, para compararla con el 4 % del art. 9.5.2(3). */
  cuantiaGeometrica: number;
  /** As ≤ 0,04·Ac fuera de solapes, art. 9.5.2(3), pág. 150. Informativo. */
  cumpleCuantiaMaxima: boolean;
}

/** Cuantía geométrica máxima fuera de solapes, art. 9.5.2(3), pág. 150. */
export const CUANTIA_MAXIMA_PILAR = 0.04;

/** εc2 de la tabla A19.3.1, pág. 24 (adimensional). */
export function epsilonC2(fckMPa: number): number {
  return fckMPa <= 50 ? 0.002 : (2.0 + 0.085 * (fckMPa - 50) ** 0.53) / 1000;
}

export function repartoAxilPilar(d: DatosRepartoPilar): ResultadoRepartoPilar {
  const eps = epsilonC2(d.fckMPa);
  const fcdMPa = d.fckMPa / GAMMA_C;
  const fydMPa = d.fykMPa / GAMMA_S;
  const sigmaSMPa = Math.min(fydMPa, ES_MPA * eps);

  const acBrutaM2 = d.bM * d.hM;
  const asM2 = d.asCm2 / 1e4;
  const acNetaM2 = Math.max(acBrutaM2 - asM2, 0);

  // MPa = MN/m² = 1000 kN/m².
  const capacidadHormigonKN = acNetaM2 * fcdMPa * 1000;
  const capacidadAceroKN = asM2 * sigmaSMPa * 1000;
  const total = capacidadHormigonKN + capacidadAceroKN;
  const cuantiaGeometrica = acBrutaM2 > 0 ? asM2 / acBrutaM2 : 0;

  return {
    epsilonC2: eps,
    fcdMPa,
    fydMPa,
    sigmaSMPa,
    acNetaM2,
    capacidadHormigonKN,
    capacidadAceroKN,
    fraccionArmadura: total > 0 ? capacidadAceroKN / total : 0,
    cuantiaGeometrica,
    cumpleCuantiaMaxima: cuantiaGeometrica <= CUANTIA_MAXIMA_PILAR + 1e-12,
  };
}
