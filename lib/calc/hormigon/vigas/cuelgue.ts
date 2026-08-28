/**
 * Armadura de cuelgue para una carga colgada — Jiménez Montoya, 15ª ed.,
 * §24.9.1, pág. 397: el caso de una carga o reacción que actúa por debajo de
 * la zona comprimida (una viga secundaria que llega al alma de una viga
 * invertida, por ejemplo) y que hay que "colgar" del nudo correspondiente de
 * la celosía mediante estribos verticales anclados en la cabeza de
 * compresión, opuesta a la de actuación de la carga.
 *
 * El Anejo 19 exige esta armadura (art. 9.2.5, "Apoyos indirectos", pág. 146:
 * "se debe disponer la armadura necesaria para resistir la reacción mutua")
 * pero no fija el número. El dimensionado —"la capacidad mecánica de esta
 * armadura debe ser al menos igual al valor de cálculo de la carga que se
 * transmite", es decir As·fyd ≥ Rd— es el criterio de Montoya, no la norma
 * vigente: por eso la referencia numérica sale de ese manual.
 *
 * Es el caso simple, de carga totalmente colgada (100%). El intermedio de
 * "apoyo indirecto" —viga que apoya en el alma de otra, con un reparto entre
 * fracción directa y colgada— queda fuera a propósito.
 */

import { GAMMA_S } from "@/lib/calc/hormigon/comun/coeficientes";
import { areaBarraCm2 } from "@/lib/calc/armaduras";

export interface MaterialesCuelgue {
  fykMPa: number;
}

export interface GeometriaCuelgue {
  /** Canto de la viga que cuelga la carga (m). */
  hM: number;
  /** Ancho del apoyo o de la pieza colgada (m). */
  aM: number;
}

export interface DatosCuelgue {
  /** Reacción o carga colgada, de cálculo (kN). */
  reaccionKN: number;
  diametroEstriboMm: number;
  /** Ramas por estribo: 2 en un cerco simple, más si hay cercos superpuestos. */
  numeroRamas: number;
}

export interface ResultadoCuelgue {
  fydMPa: number;
  asNecesariaCm2: number;
  areaPorEstriboCm2: number;
  cantidadEstribos: number;
  /** Canto mínimo para que las bielas de compresión se formen: h ≥ 1,2·a. */
  cantoMinimoM: number;
  verificaCanto: boolean;
}

export function calcularCuelgue(
  materiales: MaterialesCuelgue,
  geometria: GeometriaCuelgue,
  datos: DatosCuelgue
): ResultadoCuelgue {
  const fydMPa = materiales.fykMPa / GAMMA_S;
  // Rd(kN)·1000 / fyd(N/mm²) da mm²; /100 pasa a cm².
  const asNecesariaCm2 = (datos.reaccionKN * 10) / fydMPa;

  const areaPorEstriboCm2 = datos.numeroRamas * areaBarraCm2(datos.diametroEstriboMm);
  const cantidadEstribos = areaPorEstriboCm2 > 0 ? Math.ceil(asNecesariaCm2 / areaPorEstriboCm2) : 0;

  const cantoMinimoM = 1.2 * geometria.aM;

  return {
    fydMPa,
    asNecesariaCm2,
    areaPorEstriboCm2,
    cantidadEstribos,
    cantoMinimoM,
    verificaCanto: geometria.hM >= cantoMinimoM,
  };
}
