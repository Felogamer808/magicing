import { calcularAnclaje, type FormaAnclaje, type SituacionAdherencia } from "@/lib/calc/hormigon/comun/anclaje";
import { GAMMA_F } from "@/lib/calc/hormigon/comun/coeficientes";
import type { MaterialesDerivados } from "@/lib/calc/hormigon/comun/types";
import { GAMMA_R_DESLIZAMIENTO } from "@/lib/calc/hormigon/cimentaciones/estabilidad-zapata";

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

export { GAMMA_R_DESLIZAMIENTO };

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
  /**
   * Horizontal característica en el arranque del pilar, en la dirección del
   * tirante, + hacia el borde final (kN). Tiene brazo H hasta la base, así que
   * entra en el momento que toma el par, y la base tiene que frenarla junto con
   * el tirante. Si falta, 0.
   */
  hkKN?: number;
  /**
   * Carga vertical que se cuenta para el rozamiento: la permanente del pilar
   * (kN). Lo que puede faltar no frena. Si falta, `nkKN`.
   */
  nkEstabilizanteKN?: number;
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
  /** Horizontal que la base tiene que frenar en esta dirección, Tk + Hk (kN). */
  horizontalBaseKN: number;
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
  const hkKN = datos.hkKN ?? 0;
  const nkEstabilizanteKN = datos.nkEstabilizanteKN ?? nkKN;
  const geometriaValida = brazoM > cantoZapataM;

  // Momentos respecto del centro de la base: el rozamiento está en la base y no
  // tiene brazo, así que el tirante solo anula todo el momento, incluido el de
  // la horizontal del pilar, que llega con brazo H.
  //   momentoCentro + Hk·H + Tk·h = 0
  const tkKN = geometriaValida ? -(momentoCentroKNm + hkKN * cantoZapataM) / brazoM : 0;
  const tdKN = GAMMA_F * Math.abs(tkKN);
  const asTiranteCm2 = (tdKN * 1000) / materiales.fyd / 100;

  const deltaGrados = 0.75 * phiGrados;
  const rozamientoResistenteKN =
    ((nkEstabilizanteKN + pesoZapataKN) * Math.tan((deltaGrados * Math.PI) / 180)) / GAMMA_R_DESLIZAMIENTO;
  // Equilibrio horizontal: la base frena al tirante y a la horizontal juntos.
  const horizontalBaseKN = tkKN + hkKN;

  return {
    tkKN,
    tdKN,
    asTiranteCm2,
    deltaGrados,
    rozamientoResistenteKN,
    horizontalBaseKN,
    verificaDeslizamiento: geometriaValida && Math.abs(horizontalBaseKN) <= rozamientoResistenteKN,
    // Entre el tirante y la zapata el pilar lleva el tirante y la horizontal.
    vPilarKN: Math.abs(horizontalBaseKN),
    // El pilar va del tirante a la cara superior de la zapata: la fuerza del
    // tirante tiene brazo h − H sobre el arranque.
    mPilarArranqueKNm: mkPilarKNm + tkKN * (brazoM - cantoZapataM),
    geometriaValida,
  };
}

export interface DatosArmaduraTirante {
  /** Tracción de cálculo del tirante, Td (kN, o kN/m en la corrida). */
  tdKN: number;
  diametroMm: number;
  /** Área real de las barras del tirante (cm², o cm²/m en la corrida). */
  asRealCm2: number;
  /** Ancho del pilar o espesor del muro en la dirección del tirante (m). */
  anchoApoyoM: number;
  /** Recubrimiento de las barras del tirante (m). */
  recubrimientoM: number;
  /** Separación entre barras (m), si se conoce: entra en el cd del α2. */
  separacionM?: number;
  forma: FormaAnclaje;
  /** Largo de la pata que baja dentro del pilar o muro, sólo con patilla (mm). */
  pataMm: number;
  situacion: SituacionAdherencia;
}

export interface ResultadoArmaduraTirante {
  asNecCm2: number;
  asRealCm2: number;
  verificaAs: boolean;
  /** σsd en la cara interior del pilar: Td/As real, sin pasar de fyd (MPa). */
  sigmaSdMPa: number;
  lbdMm: number;
  /**
   * Largo para anclar desde la cara interior del pilar o muro, sobre el eje
   * de la barra: ancho − recubrimiento y, con patilla, la pata (mm).
   */
  disponibleMm: number;
  verificaAnclaje: boolean;
}

/**
 * Armadura del tirante: área (Td/fyd) y anclaje en el pilar o muro de
 * medianera (art. 8.4). La tracción tiene que estar anclada al llegar a la
 * cara interior del pilar, la del lado del edificio; del otro lado la losa
 * sigue continua y no se comprueba. Criterio del usuario, 2026-10-06.
 */
export function verificarArmaduraTirante(
  materiales: MaterialesDerivados,
  datos: DatosArmaduraTirante
): ResultadoArmaduraTirante {
  const { tdKN, diametroMm, asRealCm2, anchoApoyoM, recubrimientoM, separacionM, forma, pataMm, situacion } = datos;
  const { fck, fyk, fyd } = materiales;

  const asNecCm2 = (tdKN * 1000) / fyd / 100;
  const sigmaSdMPa = asRealCm2 > 0 ? Math.min((tdKN * 10) / asRealCm2, fyd) : fyd;

  // cd (fig. A19.8.3): el menor entre el recubrimiento y la mitad de la luz
  // libre entre barras, cuando se conoce la separación.
  const cdMm =
    separacionM !== undefined
      ? Math.min(recubrimientoM * 1000, (separacionM * 1000 - diametroMm) / 2)
      : recubrimientoM * 1000;
  const { lbdMm } = calcularAnclaje(
    { fckMPa: fck, fykMPa: fyk },
    { diametroMm, situacion, forma, esfuerzo: "traccion", recubrimientoMm: cdMm, sigmaSdMPa }
  );

  // Sobre el eje de la barra (art. 8.4.3 (3)): el tramo dentro del pilar y,
  // con patilla, la pata que baja.
  const disponibleMm = (anchoApoyoM - recubrimientoM) * 1000 + (forma === "gancho" ? pataMm : 0);

  return {
    asNecCm2,
    asRealCm2,
    verificaAs: asRealCm2 >= asNecCm2,
    sigmaSdMPa,
    lbdMm,
    disponibleMm,
    verificaAnclaje: lbdMm <= disponibleMm,
  };
}
