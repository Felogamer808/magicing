import { GAMMA_C, GAMMA_C_ACCIDENTAL, GAMMA_S, GAMMA_S_ACCIDENTAL } from "@/lib/calc/hormigon/comun/coeficientes";
import type { Materiales, MaterialesDerivados } from "@/lib/calc/hormigon/comun/types";

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
  const { fck, fyk, gammaC = GAMMA_C, gammaS = GAMMA_S } = materiales;
  const fcd = fck / gammaC;
  const fctm = 0.3 * Math.pow(fck, 2 / 3);
  const fyd = fyk / gammaS;
  // fyd de los estribos: mín(fyd; 0,8·fyk). Es la condición de la nota del
  // art. 6.2.3(3), pág. 79, para poder tomar ν1 = 0,6 en VRd,max, que es lo que
  // usa cortanteMaximoBielas. Con B500 da 400 MPa; con B400, 320.
  const fydEstribos = materiales.fydEstribos ?? Math.min(fyd, 0.8 * fyk);

  return { fck, fyk, fcd, fctm, fyd, fydEstribos, gammaC, gammaS };
}

/**
 * Los mismos materiales con los coeficientes de la situación accidental:
 * γc = 1,3 y γs = 1,0 (Anejo 19, tabla A19.2.1, pág. 20).
 */
export function materialesAccidentales(materiales: MaterialesDerivados): MaterialesDerivados {
  return derivarMateriales({ fck: materiales.fck, fyk: materiales.fyk, gammaC: GAMMA_C_ACCIDENTAL, gammaS: GAMMA_S_ACCIDENTAL });
}
