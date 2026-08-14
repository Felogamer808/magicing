/**
 * Losa mixta con chapa colaborante (steel deck): momento resistente a flexión
 * positiva, en frío y en situación de incendio.
 *
 * El camino resistente en frío sigue EN 1994-1-1 §9.7.2: la chapa y la
 * armadura longitudinal adicional del nervio se tratan como un único acero
 * traccionado (ambos plastificados) que equilibra un bloque rectangular de
 * hormigón comprimido, art. 3.1.7 de EN 1992-1-1. A diferencia de la chapa
 * sola, acá hay dos aceros a distinta profundidad: el brazo de palanca se
 * obtiene ponderando por la FUERZA de cada uno (Np,chapa·dp + Np,barras·dBarras)
 * y no por su área, que es lo mecánicamente correcto cuando cada acero
 * plastifica a una tensión de cálculo distinta.
 *
 * El incendio se resuelve con el método de la isoterma 500 °C de EC2-1-2,
 * Anexo B.1, pero sin perfiles de temperatura: en vez de leerlos de un
 * gráfico, la temperatura crítica real de la armadura sale de invertir la
 * ecuación (5.3) de EC2-1-2 §5.2(7)(c) contra las combinaciones (bmin, a) de
 * la Tabla 5.5 (vigas simplemente apoyadas — el nervio se trata como el alma
 * de una viga, art. 5.7.5(1)). La chapa se considera con resistencia nula en
 * el incendio: es un perfil de menos de 1,5 mm, alcanza la temperatura del
 * gas en pocos minutos de curva normalizada y despreciarla es el criterio
 * conservador habitual en la práctica (ver también la separación de caminos
 * resistentes del módulo de rasante).
 */

import { GAMMA_C, GAMMA_S } from "../hormigon/comun/coeficientes";

/**
 * γ de la chapa. EN 1993-1-1 usaría γM0 = 1,0 para un perfil conformado en
 * frío, pero la planilla original adopta 1,15 (el mismo valor que el acero de
 * armar) y se mantiene por trazabilidad contra ella.
 */
const GAMMA_CHAPA = 1.15;

export type ResistenciaFuego = "R60" | "R90" | "R120" | "R180" | "R240";

/**
 * Tabla 5.5 de EC2-1-2 — vigas simplemente apoyadas: combinaciones posibles
 * de (bmin, a) para cada resistencia al fuego normalizada. El nervio de la
 * losa mixta se trata como el alma de una viga, art. 5.7.5(1).
 */
const TABLA_5_5: Record<ResistenciaFuego, { bMinMm: number; aMm: number }[]> = {
  R60: [
    { bMinMm: 120, aMm: 40 },
    { bMinMm: 160, aMm: 35 },
    { bMinMm: 200, aMm: 30 },
    { bMinMm: 300, aMm: 25 },
  ],
  R90: [
    { bMinMm: 150, aMm: 55 },
    { bMinMm: 200, aMm: 45 },
    { bMinMm: 300, aMm: 40 },
    { bMinMm: 400, aMm: 35 },
  ],
  R120: [
    { bMinMm: 200, aMm: 65 },
    { bMinMm: 240, aMm: 60 },
    { bMinMm: 300, aMm: 55 },
    { bMinMm: 500, aMm: 50 },
  ],
  R180: [
    { bMinMm: 240, aMm: 80 },
    { bMinMm: 300, aMm: 70 },
    { bMinMm: 400, aMm: 65 },
    { bMinMm: 600, aMm: 60 },
  ],
  R240: [
    { bMinMm: 280, aMm: 90 },
    { bMinMm: 350, aMm: 80 },
    { bMinMm: 500, aMm: 75 },
    { bMinMm: 700, aMm: 70 },
  ],
};

/** Tabla 5.8 de EC2-1-2, columna 2 — espesor mínimo de losa (función separadora). */
const TABLA_5_8_ESPESOR_MM: Record<ResistenciaFuego, number> = {
  R60: 80,
  R90: 100,
  R120: 120,
  R180: 150,
  R240: 175,
};

/**
 * a mínimo tabulado (mm) para un ancho de nervio dado, por interpolación
 * lineal entre las combinaciones (bmin, a) de la Tabla 5.5. Por debajo del
 * primer par no hay dato tabulado (el nervio es más angosto que lo que cubre
 * la tabla); por encima del último se adopta su `a`, del lado seguro.
 */
export function aMinTabuladoMm(resistenciaFuego: ResistenciaFuego, bMinRealMm: number): number | null {
  const combos = TABLA_5_5[resistenciaFuego];
  if (bMinRealMm < combos[0].bMinMm) return null;
  if (bMinRealMm >= combos[combos.length - 1].bMinMm) return combos[combos.length - 1].aMm;

  for (let i = 1; i < combos.length; i++) {
    const a0 = combos[i - 1];
    const a1 = combos[i];
    if (bMinRealMm <= a1.bMinMm) {
      const t = (bMinRealMm - a0.bMinMm) / (a1.bMinMm - a0.bMinMm);
      return a0.aMm + t * (a1.aMm - a0.aMm);
    }
  }
  return combos[combos.length - 1].aMm;
}

/**
 * ks(θ): reducción de la resistencia característica del acero para
 * armaduras pasivas (laminado en caliente), EC2-1-2 §5.2(6)(i) / fig. 5.1
 * curva 1. Distinta de la tabla 3.2a: ésta es la curva de referencia con la
 * que se calibraron las tablas del Capítulo 5, no la de cálculo general.
 */
export function ksArmaduraPasiva(thetaC: number): number {
  if (thetaC <= 350) return 1.0;
  if (thetaC <= 500) return 1.0 - (0.4 * (thetaC - 350)) / 150;
  if (thetaC <= 700) return 0.61 - (0.5 * (thetaC - 500)) / 200;
  if (thetaC <= 1200) return Math.max(0, 0.1 - (0.1 * (thetaC - 700)) / 500);
  return 0;
}

export interface MaterialesSteelDeckFlexion {
  /** Límite elástico característico de la chapa (MPa). */
  fypkMPa: number;
  /** Resistencia característica del hormigón (MPa). */
  fckMPa: number;
  /** Límite elástico característico de la armadura adicional (MPa). */
  fykBarrasMPa: number;
}

export interface GeometriaSteelDeckFlexion {
  /** Espesor total de la losa, chapa incluida (m). */
  espesorTotalM: number;
  /** Altura del perfil de chapa (m): separa el hormigón sobre cresta del que rellena el nervio. */
  alturaNervioM: number;
  /** Área de la chapa por metro de losa, de catálogo (mm²/m). */
  apMm2PorM: number;
  /** Distancia desde la cara superior del hormigón al centroide de la chapa (m). */
  dpM: number;
  /** Diámetro de la barra adicional por nervio (mm). */
  diametroBarraMm: number;
  /** Separación entre barras adicionales (mm). */
  separacionBarraMm: number;
  /** Distancia desde la cara inferior de la losa hasta el eje de las barras (m). */
  recubrimientoBarraM: number;
  /** Ancho del nervio en su base, para el chequeo tabulado a fuego (m). */
  anchoNervioM: number;
}

export interface ResultadoFlexionFrio {
  asBarrasMm2PorM: number;
  fydBarrasMPa: number;
  fypdMPa: number;
  fcdMPa: number;
  npChapaKN: number;
  npBarrasKN: number;
  npKN: number;
  /** Profundidad desde la cara superior hasta el eje de las barras (m). */
  dBarrasM: number;
  /** Espesor de hormigón sobre la cresta del nervio (m). */
  hcM: number;
  /** Profundidad del bloque de compresión equivalente (m). */
  xplM: number;
  /** El bloque comprimido queda por encima de la cresta del nervio. */
  bloqueDentroDeHc: boolean;
  /** Brazo mecánico entre el bloque de compresión y la resultante de tracción (m). */
  zM: number;
  mPlRdKNm: number;
  mEdKNm: number;
  verificaFlexion: boolean;
  aprovechamiento: number;
}

export interface DatosFuegoSteelDeck {
  resistenciaFuego: ResistenciaFuego;
  /**
   * Coeficiente de reducción del nivel de carga en incendio, EC2-1-2 §2.4.2
   * ec. (2.4)/(2.5). 0,7 es el valor recomendado como simplificación (Nota 2).
   */
  etaFi: number;
}

export interface ResultadoFlexionFuego {
  /** a mínimo tabulado (Tabla 5.5) para el ancho de nervio real (mm). null si el nervio es más angosto de lo que cubre la tabla. */
  aMinTabMm: number | null;
  /** a real hasta el eje de las barras (mm). */
  aRealMm: number;
  /** Temperatura crítica de la armadura, ec. (5.3) de EC2-1-2, invertida contra el a real. */
  thetaCrC: number;
  /** La temperatura crítica cae dentro del rango de validez de la ec. (5.3): 350 °C – 700 °C. */
  thetaCrEnRangoValido: boolean;
  ksTheta: number;
  fsdFiMPa: number;
  npFiKN: number;
  xplFiM: number;
  zFiM: number;
  mFiRdKNm: number;
  mEdFiKNm: number;
  verificaFuego: boolean;
  aprovechamientoFuego: number;
  /** Espesor mínimo de ala tabulado para la función separadora (Tabla 5.8, col. 2), a título informativo. */
  espesorAlaMinMm: number;
  verificaEspesorAla: boolean;
}

export interface ResultadoSteelDeckFlexion {
  frio: ResultadoFlexionFrio;
  fuego: ResultadoFlexionFuego;
}

function calcularFrio(
  materiales: MaterialesSteelDeckFlexion,
  geometria: GeometriaSteelDeckFlexion,
  mEdKNm: number
): ResultadoFlexionFrio {
  const { fypkMPa, fckMPa, fykBarrasMPa } = materiales;
  const { espesorTotalM, alturaNervioM, apMm2PorM, dpM, diametroBarraMm, separacionBarraMm, recubrimientoBarraM } =
    geometria;

  const fypdMPa = fypkMPa / GAMMA_CHAPA;
  // Sin αcc aparte: EN 1994-1-1 §9.7.2(5) ya trae su propio 0,85 en
  // Fc = 0,85·fcd·b·xpl (ver más abajo). Meter también un αcc = 0,85 acá
  // aplicaría el factor dos veces — es lo que hacía la primera versión de
  // este módulo, y no reproducía ninguna de las dos hojas del Excel.
  const fcdMPa = fckMPa / GAMMA_C;
  const asBarrasMm2PorM = separacionBarraMm > 0 ? ((Math.PI * diametroBarraMm ** 2) / 4) * (1000 / separacionBarraMm) : 0;
  const fydBarrasMPa = fykBarrasMPa / GAMMA_S;

  const npChapaKN = (apMm2PorM * fypdMPa) / 1000;
  const npBarrasKN = (asBarrasMm2PorM * fydBarrasMPa) / 1000;
  const npKN = npChapaKN + npBarrasKN;

  const dBarrasM = espesorTotalM - recubrimientoBarraM;
  const hcM = espesorTotalM - alturaNervioM;

  // Equilibrio Fc = Np con Fc = 0,85·fcd·b·xpl, EN 1994-1-1 §9.7.2(5).
  const xplM = npKN > 0 ? (npKN * 1000) / (0.85 * fcdMPa * 1e6) : 0;
  const bloqueDentroDeHc = xplM <= hcM;

  // Brazo de cada acero, ponderado por su fuerza (no por su área): cada uno
  // plastifica a una tensión de cálculo distinta.
  const dTraccionM = npKN > 0 ? (npChapaKN * dpM + npBarrasKN * dBarrasM) / npKN : dpM;
  const zM = dTraccionM - xplM / 2;
  const mPlRdKNm = npKN * zM;

  return {
    asBarrasMm2PorM,
    fydBarrasMPa,
    fypdMPa,
    fcdMPa,
    npChapaKN,
    npBarrasKN,
    npKN,
    dBarrasM,
    hcM,
    xplM,
    bloqueDentroDeHc,
    zM,
    mPlRdKNm,
    mEdKNm,
    verificaFlexion: mEdKNm <= mPlRdKNm,
    aprovechamiento: mPlRdKNm > 0 ? mEdKNm / mPlRdKNm : Infinity,
  };
}

function calcularFuego(
  materiales: MaterialesSteelDeckFlexion,
  geometria: GeometriaSteelDeckFlexion,
  frio: ResultadoFlexionFrio,
  datosFuego: DatosFuegoSteelDeck
): ResultadoFlexionFuego {
  const { fykBarrasMPa } = materiales;
  const { anchoNervioM, recubrimientoBarraM } = geometria;
  const { resistenciaFuego, etaFi } = datosFuego;

  const aRealMm = recubrimientoBarraM * 1000;
  const aMinTabMm = aMinTabuladoMm(resistenciaFuego, anchoNervioM * 1000);

  // ec. (5.3): Δa = 0,1·(500 − θcr) [mm], invertida contra el a real disponible.
  const deltaAMm = aMinTabMm !== null ? aRealMm - aMinTabMm : 0;
  const thetaCrC = 500 - 10 * deltaAMm;
  const thetaCrEnRangoValido = aMinTabMm !== null && thetaCrC >= 350 && thetaCrC <= 700;

  const ksTheta = ksArmaduraPasiva(thetaCrC);
  const fsdFiMPa = ksTheta * fykBarrasMPa; // γM,fi = 1,0 (EC2-1-2 §2.3, Nota 1)

  const npFiKN = (frio.asBarrasMm2PorM * fsdFiMPa) / 1000; // la chapa se descarta en incendio
  const xplFiM = npFiKN > 0 ? (npFiKN * 1000) / (0.85 * frio.fcdMPa * 1e6) : 0;
  const zFiM = frio.dBarrasM - xplFiM / 2;
  const mFiRdKNm = npFiKN * zFiM;

  const mEdFiKNm = etaFi * frio.mEdKNm;
  const espesorAlaMinMm = TABLA_5_8_ESPESOR_MM[resistenciaFuego];

  return {
    aMinTabMm,
    aRealMm,
    thetaCrC,
    thetaCrEnRangoValido,
    ksTheta,
    fsdFiMPa,
    npFiKN,
    xplFiM,
    zFiM,
    mFiRdKNm,
    mEdFiKNm,
    verificaFuego: mEdFiKNm <= mFiRdKNm,
    aprovechamientoFuego: mFiRdKNm > 0 ? mEdFiKNm / mFiRdKNm : Infinity,
    espesorAlaMinMm,
    verificaEspesorAla: frio.hcM * 1000 >= espesorAlaMinMm,
  };
}

export function calcularSteelDeckFlexion(
  materiales: MaterialesSteelDeckFlexion,
  geometria: GeometriaSteelDeckFlexion,
  mEdKNm: number,
  datosFuego: DatosFuegoSteelDeck
): ResultadoSteelDeckFlexion {
  const frio = calcularFrio(materiales, geometria, mEdKNm);
  const fuego = calcularFuego(materiales, geometria, frio, datosFuego);
  return { frio, fuego };
}
