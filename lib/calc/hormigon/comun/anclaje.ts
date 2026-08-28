/**
 * Longitud de anclaje y de solape de armaduras pasivas, Anejo 19 art. 8.4 y
 * 8.7. Generaliza lo que ya resolvían `mensula-corta.ts` y `apeo-bielas.ts`
 * cada uno por su lado, para una herramienta de referencia rápida que no está
 * atada a la geometría de ningún elemento en particular.
 *
 * σsd se toma siempre en fluencia plena (σsd = fyd): es la hipótesis más
 * conservadora —la barra ancla la fuerza que sería capaz de desarrollar al
 * 100%— y la que no exige conocer As necesaria/As real de una sección
 * concreta. Da la longitud más larga posible, del lado seguro.
 *
 * Los coeficientes α3 (confinamiento por armadura transversal) y α5 (presión
 * transversal) se toman en 1,0 a propósito, igual que en `mensula-corta.ts`:
 * contarlos exige justificar armadura o presión que esta herramienta no
 * conoce. El resultado es conservador, nunca inseguro.
 */

import { GAMMA_C } from "@/lib/calc/hormigon/comun/coeficientes";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";

export type SituacionAdherencia = "buena" | "mala";
export type FormaAnclaje = "recta" | "gancho";
export type TipoEsfuerzo = "traccion" | "compresion";

export interface MaterialesAnclaje {
  fckMPa: number;
  fykMPa: number;
}

export interface DatosAnclaje {
  diametroMm: number;
  situacion: SituacionAdherencia;
  forma: FormaAnclaje;
  esfuerzo: TipoEsfuerzo;
  /** cd: mínimo entre a/2, c1 y c — fig. A19.8.3 (mm). */
  recubrimientoMm: number;
}

export interface ResultadoAnclaje {
  fctdMPa: number;
  fbdMPa: number;
  eta1: number;
  eta2: number;
  fydMPa: number;
  sigmaSdMPa: number;
  lbRqdMm: number;
  alfa1: number;
  alfa2: number;
  lbMinMm: number;
  lbdMm: number;
  mandrilMinMm: number;
}

const acotar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Tabla A19.8.1: diámetro mínimo de mandril para patillas, ganchos y ganchos en U. */
export function mandrilMinimoMm(diametroMm: number): number {
  return diametroMm <= 16 ? 4 * diametroMm : 7 * diametroMm;
}

export function calcularAnclaje(materiales: MaterialesAnclaje, datos: DatosAnclaje): ResultadoAnclaje {
  const { fckMPa, fykMPa } = materiales;
  const { diametroMm: phi, situacion, forma, esfuerzo, recubrimientoMm: cd } = datos;

  const { fctm: fctmMPa, fyd: fydMPa } = derivarMateriales({ fck: fckMPa, fyk: fykMPa });
  // fctk,0.05 = 0,7·fctm (tabla A19.3.1); fctd = fctk,0.05/γc (ec. 3.16, αct=1,0).
  const fctdMPa = (0.7 * fctmMPa) / GAMMA_C;

  const eta1 = situacion === "buena" ? 1.0 : 0.7;
  const eta2 = phi <= 32 ? 1.0 : (132 - phi) / 100;
  const fbdMPa = 2.25 * eta1 * eta2 * fctdMPa;

  const sigmaSdMPa = fydMPa;
  const lbRqdMm = (phi / 4) * (sigmaSdMPa / fbdMPa);

  /*
   * Tabla A19.8.2. Los ganchos y patillas no cuentan en compresión (8.4.1(3)):
   * se tratan como si fueran rectos, es decir α1=1,0, que es lo que ya da la
   * rama "compresion" de abajo.
   */
  let alfa1: number;
  let alfa2: number;
  if (esfuerzo === "compresion") {
    alfa1 = 1.0;
    alfa2 = 1.0;
  } else if (forma === "recta") {
    alfa1 = 1.0;
    alfa2 = acotar(1 - (0.15 * (cd - phi)) / phi, 0.7, 1.0);
  } else {
    alfa1 = cd > 3 * phi ? 0.7 : 1.0;
    alfa2 = acotar(1 - (0.15 * (cd - 3 * phi)) / phi, 0.7, 1.0);
  }

  const factorMin = esfuerzo === "traccion" ? 0.3 : 0.6;
  const lbMinMm = Math.max(factorMin * lbRqdMm, 10 * phi, 100);
  const lbdMm = Math.max(lbMinMm, alfa1 * alfa2 * lbRqdMm);

  return {
    fctdMPa,
    fbdMPa,
    eta1,
    eta2,
    fydMPa,
    sigmaSdMPa,
    lbRqdMm,
    alfa1,
    alfa2,
    lbMinMm,
    lbdMm,
    mandrilMinMm: mandrilMinimoMm(phi),
  };
}

export interface ResultadoSolape {
  /** α6 = (ρ1/25)^0,5, acotado entre 1,0 y 1,5 — tabla A19.8.3. */
  alfa6: number;
  l0MinMm: number;
  l0Mm: number;
}

/**
 * Longitud de solape, art. 8.7.3, ec. (8.10)-(8.11). Reutiliza α1 y α2 del
 * anclaje recto/gancho ya calculado; α3 y α5 en 1,0 por el mismo motivo que
 * en `calcularAnclaje`.
 */
export function calcularSolape(
  anclaje: Pick<ResultadoAnclaje, "alfa1" | "alfa2" | "lbRqdMm">,
  diametroMm: number,
  porcentajeSolapado: number
): ResultadoSolape {
  const alfa6 = acotar(Math.sqrt(porcentajeSolapado / 25), 1.0, 1.5);
  const l0MinMm = Math.max(0.3 * alfa6 * anclaje.lbRqdMm, 15 * diametroMm, 200);
  const l0Mm = Math.max(l0MinMm, anclaje.alfa1 * anclaje.alfa2 * alfa6 * anclaje.lbRqdMm);
  return { alfa6, l0MinMm, l0Mm };
}

/** Tabla A19.8.3, para mostrar el escalón normativo junto al valor interpolado que usa el cálculo. */
export const TABLA_ALFA6: readonly { porcentaje: number; alfa6: number }[] = [
  { porcentaje: 25, alfa6: 1.0 },
  { porcentaje: 33, alfa6: 1.15 },
  { porcentaje: 50, alfa6: 1.4 },
  { porcentaje: 100, alfa6: 1.5 },
];
