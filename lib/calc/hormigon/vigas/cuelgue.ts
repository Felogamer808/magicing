/**
 * Armadura de cuelgue para una carga colgada, por el Anejo 19: el caso de una
 * carga o reacción que actúa por debajo de la zona comprimida (una viga
 * secundaria que llega al alma de otra, o a una viga invertida) y que hay que
 * "colgar" con cercos anclados en la cabeza de compresión opuesta.
 *
 * - El art. 9.2.5(1), pág. 145, exige "la armadura necesaria para resistir la
 *   reacción mutua", que se añade a la necesaria por otros motivos.
 * - Esos cercos son el tirante vertical del modelo de bielas y tirantes, y la
 *   resistencia de un tirante es la de la armadura, art. 6.5.3(1), pág. 97:
 *   As·fyd ≥ Rd, con fyd = fyk/γs.
 * - La zona en que se reparten los cercos es la de la figura A19.9.7,
 *   pág. 146: hasta h1/3 de la cara de la viga que llega, y h1/2 de su eje,
 *   dentro de la que recibe; hasta h2/3 y h2/2, de la cara y del eje de la que
 *   recibe, dentro de la que llega. Se informa: no entra en el cumple.
 *
 * El canto mínimo h ≥ 1,2·a para que se formen las bielas es criterio de
 * Jiménez Montoya (§24.9.1), sin equivalente en el Anejo: queda como aviso.
 *
 * Es el caso de carga totalmente colgada (100 %), que es lo que pide el
 * art. 9.2.5(1).
 */

import { GAMMA_S } from "@/lib/calc/hormigon/comun/coeficientes";
import { areaBarraCm2 } from "@/lib/calc/armaduras";

export interface MaterialesCuelgue {
  fykMPa: number;
}

export interface GeometriaCuelgue {
  /** Canto h1 de la viga que recibe y cuelga la carga (m). */
  hM: number;
  /** Canto h2 de la viga o pieza que llega (m). La figura A19.9.7 supone h1 ≥ h2. */
  h2M: number;
  /** Ancho de la pieza colgada (m): sólo para el aviso de Montoya. */
  aM: number;
}

export interface DatosCuelgue {
  /** Reacción o carga colgada, de cálculo (kN). */
  reaccionKN: number;
  diametroEstriboMm: number;
  /** Ramas por estribo: 2 en un cerco simple, más si hay cercos superpuestos. */
  numeroRamas: number;
}

/** Zona de reparto de los cercos de la figura A19.9.7 (m), medida en planta. */
export interface ZonaCuelgue {
  /** Dentro de la viga que recibe, desde la cara de la que llega: ≤ h1/3. */
  recibeDesdeCaraM: number;
  /** Dentro de la viga que recibe, desde el eje de la que llega: ≤ h1/2. */
  recibeDesdeEjeM: number;
  /** Dentro de la viga que llega, desde la cara de la que recibe: ≤ h2/3. */
  llegaDesdeCaraM: number;
  /** Dentro de la viga que llega, desde el eje de la que recibe: ≤ h2/2. */
  llegaDesdeEjeM: number;
}

export interface ResultadoCuelgue {
  fydMPa: number;
  asNecesariaCm2: number;
  areaPorEstriboCm2: number;
  cantidadEstribos: number;
  zona: ZonaCuelgue;
  /** h1 ≥ h2, como supone la figura A19.9.7. */
  cantosComoLaFigura: boolean;
  /** Aviso de Montoya §24.9.1, no del Anejo: h ≥ 1,2·a. No entra en el cumple. */
  cantoMinimoM: number;
  cumpleAvisoCantoMinimo: boolean;
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
    zona: {
      recibeDesdeCaraM: geometria.hM / 3,
      recibeDesdeEjeM: geometria.hM / 2,
      llegaDesdeCaraM: geometria.h2M / 3,
      llegaDesdeEjeM: geometria.h2M / 2,
    },
    cantosComoLaFigura: geometria.hM >= geometria.h2M,
    cantoMinimoM,
    cumpleAvisoCantoMinimo: geometria.hM >= cantoMinimoM,
  };
}
