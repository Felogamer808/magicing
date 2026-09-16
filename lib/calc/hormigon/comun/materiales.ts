import { GAMMA_C, GAMMA_S } from "@/lib/calc/hormigon/comun/coeficientes";
import type { Materiales, MaterialesDerivados } from "@/lib/calc/hormigon/comun/types";

/**
 * fyd de estribos por defecto: min(fyd, 400 MPa), práctica habitual de oficina
 * para limitar la fisuración por cortante.
 */
/**
 * Módulo secante del hormigón, Anejo 19 art. 3.1.3, tabla A19.3.1:
 * Ecm = 22·((fck+8)/10)^0,3, en GPa.
 *
 * Vive acá y no dentro de una verificación porque lo usan varias (fisuración y
 * deformaciones, las dos de ELS) y es la misma expresión del articulado: tenerla
 * dos veces es tener dos sitios donde equivocarse.
 */
export function moduloSecanteGPa(fckMPa: number): number {
  return 22 * ((fckMPa + 8) / 10) ** 0.3;
}

export function derivarMateriales(materiales: Materiales): MaterialesDerivados {
  const { fck, fyk } = materiales;
  const fcd = fck / GAMMA_C;
  const fctm = 0.3 * Math.pow(fck, 2 / 3);
  const fyd = fyk / GAMMA_S;
  const fydEstribos = materiales.fydEstribos ?? Math.min(fyd, 400);

  return { fck, fyk, fcd, fctm, fyd, fydEstribos };
}
