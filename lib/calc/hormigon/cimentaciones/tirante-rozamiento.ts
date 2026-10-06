import { GAMMA_F } from "@/lib/calc/hormigon/comun/coeficientes";
import type { MaterialesDerivados } from "@/lib/calc/hormigon/comun/types";

/**
 * Par tirante–terreno: otra forma de equilibrar la zapata con el pilar
 * descentrado, típicamente la de medianería. El momento de la excentricidad no
 * lo toma el terreno con una presión desigual: lo toma un par formado por un
 * tirante arriba (la armadura de la losa o del forjado) y el rozamiento en la
 * base de la zapata. La presión queda uniforme.
 *
 * Dos normas, cada una en lo suyo, como prevé el propio DB SE-C (art. 4.1.1
 * (6), pág. 25: "introducción de tirantes, contribución de forjados"):
 * - el terreno, por el CTE DB SE-C: deslizamiento con γR = 1,5 y acciones sin
 *   mayorar (tabla 2.1, pág. 12), rozamiento δ = 3/4·φ sin adherencia (art.
 *   4.2.3.1 (4), pág. 34), y área de la zapata la real (art. 4.3.1.3 (6), pág. 36);
 * - la armadura del tirante, por el Anejo 19: tracción de cálculo γF·Tk sobre fyd.
 *
 * El brazo es la distancia del eje del tirante a la base de la zapata
 * (criterio del Jiménez Montoya, decidido por el usuario el 2026-10-06).
 */

/** Coeficiente de resistencia al deslizamiento, situación persistente (DB SE-C, tabla 2.1). */
export const GAMMA_R_DESLIZAMIENTO = 1.5;

export interface DatosTiranteRozamiento {
  /** Carga vertical característica del pilar (kN). */
  nkKN: number;
  /** Peso propio de la zapata (kN). Suma al rozamiento resistente. */
  pesoZapataKN: number;
  /**
   * Momento característico respecto del centro de la base, sin el tirante
   * (kN·m): el de la excentricidad del pilar más el que baja por él. Positivo
   * hacia el borde final, como el `MkA` de la zapata aislada.
   */
  momentoCentroKNm: number;
  /** Momento característico que baja por el pilar, mismo signo (kN·m). */
  mkPilarKNm: number;
  /** Distancia del eje del tirante a la base de la zapata (m). */
  brazoM: number;
  /** Canto de la zapata (m). */
  cantoZapataM: number;
  /** Ángulo de rozamiento interno efectivo del terreno, φ' (grados). */
  phiGrados: number;
}

export interface ResultadoTiranteRozamiento {
  /** Tracción característica del tirante, positiva hacia el borde final (kN). */
  tkKN: number;
  /** Tracción de cálculo, γF·|Tk| (kN). */
  tdKN: number;
  /** Armadura necesaria en el tirante, Td/fyd (cm²). */
  asTiranteCm2: number;
  /** δ = 3/4·φ (grados). */
  deltaGrados: number;
  /** Rozamiento resistente de cálculo, (Nk + peso)·tan δ / γR (kN). */
  rozamientoResistenteKN: number;
  verificaDeslizamiento: boolean;
  /** Cortante característico en el pilar entre el tirante y la zapata, |Tk| (kN). */
  vPilarKN: number;
  /**
   * Momento característico en el arranque del pilar, sobre la zapata (kN·m),
   * Mk + Tk·(h − H). Es lo que el pilar le pasa a la zapata y lo que hay que
   * verificar aparte en el pilar. Mismo signo que `mkPilarKNm`.
   */
  mPilarArranqueKNm: number;
  /** Falso si el brazo no supera el canto: el tirante no tiene palanca. */
  geometriaValida: boolean;
}

export function calcularTiranteRozamiento(
  materiales: MaterialesDerivados,
  datos: DatosTiranteRozamiento
): ResultadoTiranteRozamiento {
  const { nkKN, pesoZapataKN, momentoCentroKNm, mkPilarKNm, brazoM, cantoZapataM, phiGrados } = datos;
  const geometriaValida = brazoM > cantoZapataM;

  // Momentos respecto del centro de la base: el rozamiento está en la base y no
  // tiene brazo, así que el tirante solo anula todo el momento.
  //   momentoCentro + Tk·h = 0
  const tkKN = geometriaValida ? -momentoCentroKNm / brazoM : 0;
  const tdKN = GAMMA_F * Math.abs(tkKN);
  const asTiranteCm2 = (tdKN * 1000) / materiales.fyd / 100;

  const deltaGrados = 0.75 * phiGrados;
  const rozamientoResistenteKN =
    ((nkKN + pesoZapataKN) * Math.tan((deltaGrados * Math.PI) / 180)) / GAMMA_R_DESLIZAMIENTO;

  return {
    tkKN,
    tdKN,
    asTiranteCm2,
    deltaGrados,
    rozamientoResistenteKN,
    verificaDeslizamiento: geometriaValida && Math.abs(tkKN) <= rozamientoResistenteKN,
    vPilarKN: Math.abs(tkKN),
    // El pilar va del tirante a la cara superior de la zapata: la fuerza del
    // tirante tiene brazo h − H sobre el arranque.
    mPilarArranqueKNm: mkPilarKNm + tkKN * (brazoM - cantoZapataM),
    geometriaValida,
  };
}
