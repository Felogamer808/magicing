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
 * Para la viga que llega a otra se cuelga el 100 %, que es lo que pide el
 * art. 9.2.5(1). Para el pilar que apoya con las barras ancladas abajo
 * (`calcularCuelguePilar`) se cuelga lo que llevan las barras, calculado por
 * `repartoAxilPilar` o impuesto: es criterio, no artículo.
 */

import { GAMMA_S } from "@/lib/calc/hormigon/comun/coeficientes";
import { areaBarraCm2 } from "@/lib/calc/armaduras";
import { repartoAxilPilar, type ResultadoRepartoPilar } from "@/lib/calc/hormigon/comun/reparto-pilar";

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

/** Cercos que cuelgan una fuerza: As·fyd ≥ Rd, art. 6.5.3(1), con fyd = fyk/γs. */
function dimensionarCercos(fykMPa: number, reaccionKN: number, diametroEstriboMm: number, numeroRamas: number) {
  const fydMPa = fykMPa / GAMMA_S;
  // Rd(kN)·1000 / fyd(N/mm²) da mm²; /100 pasa a cm².
  const asNecesariaCm2 = (reaccionKN * 10) / fydMPa;
  const areaPorEstriboCm2 = numeroRamas * areaBarraCm2(diametroEstriboMm);
  const cantidadEstribos = areaPorEstriboCm2 > 0 ? Math.ceil(asNecesariaCm2 / areaPorEstriboCm2) : 0;
  return { fydMPa, asNecesariaCm2, areaPorEstriboCm2, cantidadEstribos };
}

export function calcularCuelgue(
  materiales: MaterialesCuelgue,
  geometria: GeometriaCuelgue,
  datos: DatosCuelgue
): ResultadoCuelgue {
  const cercos = dimensionarCercos(materiales.fykMPa, datos.reaccionKN, datos.diametroEstriboMm, datos.numeroRamas);
  const cantoMinimoM = 1.2 * geometria.aM;

  return {
    ...cercos,
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

// ------------------------------------------------------------------ pilar

/**
 * Pilar que apoya sobre la viga con sus barras bajando ancladas hasta la cara
 * inferior. Lo que lleva el hormigón entra arriba, en la cabeza comprimida, y
 * no se cuelga; lo que llevan las barras entra abajo, por adherencia, y se sube
 * con cercos. La fracción calculada sale de `repartoAxilPilar`; usar otra es
 * criterio del proyectista, y por eso se puede imponer.
 */
export interface DatosCuelguePilar {
  /** Axil de cálculo del pilar (kN). */
  ndPilarKN: number;
  fckMPa: number;
  fykMPa: number;
  /** Canto de la viga que recibe (m). */
  hVigaM: number;
  /** Lado del pilar en el plano de la viga (m). */
  ladoPilarM: number;
  /** Lado del pilar transversal a la viga (m). */
  anchoPilarM: number;
  /** Armadura longitudinal total del pilar (cm²). */
  asPilarCm2: number;
  /** Fracción de Nd a colgar impuesta (0 a 1). Si se omite, la calculada. */
  fraccionImpuesta?: number;
  diametroEstriboMm: number;
  numeroRamas: number;
  /**
   * Distancia del eje del pilar al borde (extremo) de la viga (m). De ese lado
   * la zona de cercos no pasa del borde. Si se omite o es 0, no hay borde cerca.
   */
  distanciaBordeM?: number;
  /** Recubrimiento al cerco (m): con el borde, el eje del último cerco queda a rg + Ø/2. */
  recubrimientoM?: number;
}

export interface ResultadoCuelguePilar {
  reparto: ResultadoRepartoPilar;
  fraccionCalculada: number;
  fraccionAdoptada: number;
  /** La impuesta queda por debajo de lo que llevan las barras: aviso. */
  fraccionMenorQueCalculada: boolean;
  cargaColgadaKN: number;
  fydMPa: number;
  asNecesariaCm2: number;
  areaPorEstriboCm2: number;
  cantidadEstribos: number;
  /**
   * Ancho a cada lado del eje del pilar en que se reparten los cercos (m):
   * máx(lado del pilar; h/2), el mismo criterio que la viga de apeo. El Anejo
   * no trae zona para este caso —la figura A19.9.7 es de viga sobre viga—, así
   * que se informa y no entra en el cumple.
   */
  anchoZonaM: number;
  /** Lado hacia el borde de la viga: el ancho, recortado por el borde si lo hay (m). */
  zonaLadoBordeM: number;
  /** Lado opuesto: el ancho entero (m). */
  zonaLadoOpuestoM: number;
  /** El borde recorta la zona de ese lado. */
  recortadaPorBorde: boolean;
  /** Largo total en que se reparten los cercos (m). */
  largoZonaM: number;
  /**
   * Separación entre cercos (m): largo / n, redondeada hacia abajo al
   * centímetro, el mismo reparto uniforme que la viga de apeo (As real =
   * ramas·área·largo/s). Dimensionamiento, no verificación.
   */
  separacionM: number;
}

export function calcularCuelguePilar(d: DatosCuelguePilar): ResultadoCuelguePilar {
  const reparto = repartoAxilPilar({
    fckMPa: d.fckMPa,
    fykMPa: d.fykMPa,
    bM: d.anchoPilarM,
    hM: d.ladoPilarM,
    asCm2: d.asPilarCm2,
  });
  const fraccionCalculada = reparto.fraccionArmadura;
  const fraccionAdoptada = d.fraccionImpuesta ?? fraccionCalculada;
  const cargaColgadaKN = fraccionAdoptada * d.ndPilarKN;
  const cercos = dimensionarCercos(d.fykMPa, cargaColgadaKN, d.diametroEstriboMm, d.numeroRamas);

  const anchoZonaM = Math.max(d.ladoPilarM, d.hVigaM / 2);
  const hayBorde = (d.distanciaBordeM ?? 0) > 0;
  const hastaBordeM = hayBorde
    ? (d.distanciaBordeM ?? 0) - (d.recubrimientoM ?? 0) - d.diametroEstriboMm / 2000
    : Infinity;
  const zonaLadoBordeM = Math.max(Math.min(anchoZonaM, hastaBordeM), 0);
  const largoZonaM = zonaLadoBordeM + anchoZonaM;
  const separacionM =
    cercos.cantidadEstribos > 0 ? Math.floor((largoZonaM / cercos.cantidadEstribos) * 100 + 1e-9) / 100 : 0;

  return {
    reparto,
    fraccionCalculada,
    fraccionAdoptada,
    fraccionMenorQueCalculada: fraccionAdoptada < fraccionCalculada - 1e-9,
    cargaColgadaKN,
    ...cercos,
    anchoZonaM,
    zonaLadoBordeM,
    zonaLadoOpuestoM: anchoZonaM,
    recortadaPorBorde: hastaBordeM < anchoZonaM,
    largoZonaM,
    separacionM,
  };
}
