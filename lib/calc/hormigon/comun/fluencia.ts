/**
 * Coeficiente de fluencia φ(∞,t0) — Anejo 19, Apéndice B.1, ec. (B.1) a (B.9),
 * págs. 187-188.
 *
 * Vive en comun y no dentro de deformaciones porque es una propiedad del
 * hormigón y del ambiente, no de una verificación: la fluencia entra en la
 * flecha, pero también en el pandeo de segundo orden y en las pérdidas de
 * pretensado.
 *
 * Se calcula a tiempo infinito, que es lo que pide la comprobación de flecha
 * del art. 7.4.1: en la ec. (B.1), βc(t,t0) tiende a 1 cuando t→∞, así que
 * φ(∞,t0) se reduce al coeficiente básico φ0 de la ec. (B.2). Por eso acá no
 * aparecen ni βc ni βH.
 *
 * Dos cosas que el articulado aclara y conviene tener presentes:
 *
 *  - El Apéndice B avisa que sus φ "deberán estar asociados al módulo de
 *    elasticidad tangente Ec", mientras que la ec. (7.20) arma el módulo
 *    efectivo con el secante Ecm. Es una inconsistencia del propio Eurocódigo;
 *    acá se sigue la (7.20) tal cual está escrita, que es la práctica habitual.
 *  - La corrección por temperatura de la ec. (B.10) no se aplica: se supone
 *    curado a temperatura ambiente normal, o sea t0,T = t0. Fuera de eso hay
 *    que corregir la edad a mano antes de cargarla.
 */

export type ClaseCemento = "S" | "N" | "R";

/**
 * Exponente α de la ec. (B.9), que corrige la edad de puesta en carga según el
 * tipo de cemento. Verificado contra el PDF del BOE (pág. 944): en el texto de
 * la skill esta definición se perdió en el OCR y sólo quedaba la fórmula.
 */
export const ALPHA_CEMENTO: Record<ClaseCemento, number> = { S: -1, N: 0, R: 1 };

export const NOMBRE_CEMENTO: Record<ClaseCemento, string> = {
  S: "Clase S — endurecimiento lento",
  N: "Clase N — endurecimiento normal",
  R: "Clase R — endurecimiento rápido",
};

/** Cómo está expuesta la sección al ambiente, que es lo que fija u en la ec. (B.6). */
export type ExposicionSeccion = "cuatro-caras" | "tres-caras" | "losa";

export const NOMBRE_EXPOSICION: Record<ExposicionSeccion, string> = {
  "cuatro-caras": "Viga exenta — seca por las cuatro caras",
  "tres-caras": "Viga con losa encima — seca por tres caras",
  losa: "Losa — seca por arriba y por abajo",
};

/**
 * Perímetro en contacto con la atmósfera (m) de una sección rectangular b×h.
 * Es el dato que más mueve h0 y el que más se presta a cargarse mal: una viga
 * con la losa encima no seca por la cara superior.
 */
export function perimetroExpuestoM(
  exposicion: ExposicionSeccion,
  bM: number,
  hM: number
): number {
  switch (exposicion) {
    case "cuatro-caras":
      return 2 * (bM + hM);
    case "tres-caras":
      return bM + 2 * hM;
    case "losa":
      // Sólo las dos caras grandes: los bordes no cuentan en una losa corrida.
      // Da h0 = 2·(b·h)/(2·b) = h, el resultado clásico para losas.
      return 2 * bM;
  }
}

/** Tamaño teórico h0 = 2·Ac/u, ec. (B.6), en mm. */
export function tamanoTeoricoMm(acM2: number, uM: number): number {
  return uM > 0 ? ((2 * acM2) / uM) * 1000 : 0;
}

export interface DatosFluencia {
  fckMPa: number;
  /** Humedad relativa del ambiente (%) */
  hrPct: number;
  /** Edad de puesta en carga (días) */
  t0Dias: number;
  claseCemento: ClaseCemento;
  /** Tamaño teórico de la sección (mm), ec. (B.6) */
  h0Mm: number;
}

export interface ResultadoFluencia {
  /** fcm = fck + 8 (Tabla A19.3.1) */
  fcmMPa: number;
  /** Edad de puesta en carga corregida por tipo de cemento, ec. (B.9) */
  t0CorregidoDias: number;
  /** φHR, ec. (B.3a) o (B.3b) */
  phiHR: number;
  /** True si mandó la (B.3b), es decir fcm > 35 */
  usaHormigonResistente: boolean;
  /** β(fcm), ec. (B.4) */
  betaFcm: number;
  /** β(t0), ec. (B.5) */
  betaT0: number;
  /** φ(∞,t0) = φ0, ec. (B.2) */
  phi: number;
}

export function calcularFluencia(datos: DatosFluencia): ResultadoFluencia {
  const { fckMPa, hrPct, t0Dias, claseCemento, h0Mm } = datos;

  const fcmMPa = fckMPa + 8;

  // ec. (B.9): el cemento no cambia la fluencia directamente, la mete
  // corriendo la edad de puesta en carga. Con clase N el exponente es 0 y la
  // corrección desaparece.
  const alpha = ALPHA_CEMENTO[claseCemento];
  const t0CorregidoDias = Math.max(
    t0Dias * (9 / (2 + t0Dias ** 1.2) + 1) ** alpha,
    0.5
  );

  // ec. (B.3a/b)
  const raizCubicaH0 = Math.cbrt(h0Mm);
  const terminoHumedad = raizCubicaH0 > 0 ? (1 - hrPct / 100) / (0.1 * raizCubicaH0) : 0;
  const usaHormigonResistente = fcmMPa > 35;
  const alpha1 = (35 / fcmMPa) ** 0.7;
  const alpha2 = (35 / fcmMPa) ** 0.2;
  const phiHR = usaHormigonResistente
    ? (1 + terminoHumedad * alpha1) * alpha2
    : 1 + terminoHumedad;

  const betaFcm = 16.8 / Math.sqrt(fcmMPa); // ec. (B.4)
  const betaT0 = 1 / (0.1 + t0CorregidoDias ** 0.2); // ec. (B.5)

  return {
    fcmMPa,
    t0CorregidoDias,
    phiHR,
    usaHormigonResistente,
    betaFcm,
    betaT0,
    // ec. (B.2), con βc(∞,t0)=1 de la (B.1)
    phi: phiHR * betaFcm * betaT0,
  };
}
