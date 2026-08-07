import { GAMMA_C, GAMMA_S } from "./coeficientes";
import type { Materiales, MaterialesDerivados } from "./types";

/**
 * fyd de estribos por defecto: min(fyd, 400 MPa), práctica habitual de oficina
 * para limitar la fisuración por cortante.
 */
export function derivarMateriales(materiales: Materiales): MaterialesDerivados {
  const { fck, fyk } = materiales;
  const fcd = fck / GAMMA_C;
  const fctm = 0.3 * Math.pow(fck, 2 / 3);
  const fyd = fyk / GAMMA_S;
  const fydEstribos = materiales.fydEstribos ?? Math.min(fyd, 400);

  return { fck, fyk, fcd, fctm, fyd, fydEstribos };
}
