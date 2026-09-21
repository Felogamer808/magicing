/**
 * Deformaciones diferidas del hormigón: fluencia φ(∞,t0) y retracción εcs —
 * Anejo 19, art. 3.1.4 y Apéndice B, págs. 27-28 y 187-188.
 *
 * Van juntas porque comparten casi todos los datos de entrada —el ambiente, el
 * cemento y el tamaño teórico de la sección— y porque las dos salen del mismo
 * sitio del articulado. Viven en comun y no dentro de deformaciones porque son
 * propiedades del hormigón y del ambiente, no de una verificación: las mismas
 * entran en el pandeo de segundo orden y en las pérdidas de pretensado.
 *
 * Todo se calcula a tiempo infinito, que es lo que pide la comprobación de
 * flecha del art. 7.4.1: los factores de evolución βc (ec. B.1), βds (ec. 3.10)
 * y βas (ec. 3.13) tienden a 1 cuando t→∞, así que desaparecen y con ellos la
 * edad del hormigón en el momento considerado.
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

/** αds1 y αds2 de la ec. (B.11), pág. 188. */
const ALPHA_DS1: Record<ClaseCemento, number> = { S: 3, N: 4, R: 6 };
const ALPHA_DS2: Record<ClaseCemento, number> = { S: 0.13, N: 0.12, R: 0.11 };

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

/**
 * kh de la tabla A19.3.3, pág. 28, interpolando entre sus cuatro puntos.
 *
 * La tabla da 1,00 / 0,85 / 0,75 / 0,70 para h0 = 100 / 200 / 300 / ≥500. Por
 * debajo de 100 se mantiene en 1,00: la tabla no baja de ahí y extrapolar hacia
 * arriba no tendría apoyo.
 */
const TABLA_KH: readonly { h0Mm: number; kh: number }[] = [
  { h0Mm: 100, kh: 1.0 },
  { h0Mm: 200, kh: 0.85 },
  { h0Mm: 300, kh: 0.75 },
  { h0Mm: 500, kh: 0.7 },
];

export function coeficienteKh(h0Mm: number): number {
  if (h0Mm <= TABLA_KH[0].h0Mm) return TABLA_KH[0].kh;
  const ultimo = TABLA_KH[TABLA_KH.length - 1];
  if (h0Mm >= ultimo.h0Mm) return ultimo.kh;
  for (let i = 1; i < TABLA_KH.length; i++) {
    const a = TABLA_KH[i - 1];
    const b = TABLA_KH[i];
    if (h0Mm <= b.h0Mm) {
      return a.kh + ((h0Mm - a.h0Mm) / (b.h0Mm - a.h0Mm)) * (b.kh - a.kh);
    }
  }
  return ultimo.kh;
}

export interface DatosRetraccion {
  fckMPa: number;
  /** Humedad relativa del ambiente (%) */
  hrPct: number;
  claseCemento: ClaseCemento;
  /** Tamaño teórico de la sección (mm), ec. (B.6) */
  h0Mm: number;
}

export interface ResultadoRetraccion {
  /** βHR de la ec. (B.12) */
  betaHR: number;
  /** Retracción básica por secado εcd,0, ec. (B.11) */
  epsilonCd0: number;
  /** kh de la tabla A19.3.3 */
  kh: number;
  /** Retracción por secado a tiempo infinito: kh·εcd,0 */
  epsilonCd: number;
  /** Retracción autógena εca(∞), ec. (3.12) */
  epsilonCa: number;
  /** Retracción total εcs = εcd + εca */
  epsilonCs: number;
}

/**
 * Retracción total a tiempo infinito, art. 3.1.4(6): εcs = εcd + εca, con la
 * parte por secado de la ec. (B.11) y la autógena de la (3.12).
 *
 * La de secado depende del ambiente y del espesor —tarda porque es migración
 * de agua—; la autógena sólo de la resistencia, y se desarrolla en los primeros
 * días. A tiempo infinito las dos están completas y se suman.
 */
export function calcularRetraccion(datos: DatosRetraccion): ResultadoRetraccion {
  const { fckMPa, hrPct, claseCemento, h0Mm } = datos;

  const fcmMPa = fckMPa + 8;
  const FCM0 = 10;

  // ec. (B.12): se anula en HR=100 %, o sea que sumergido no hay retracción por
  // secado, y crece hacia ambientes secos.
  const betaHR = 1.55 * (1 - (hrPct / 100) ** 3);

  // ec. (B.11)
  const epsilonCd0 =
    0.85 *
    ((220 + 110 * ALPHA_DS1[claseCemento]) *
      Math.exp(-ALPHA_DS2[claseCemento] * (fcmMPa / FCM0))) *
    1e-6 *
    betaHR;

  const kh = coeficienteKh(h0Mm);
  const epsilonCd = kh * epsilonCd0;

  // ec. (3.12). El tope en cero es por si entra un fck por debajo de 10 MPa,
  // que daría una retracción autógena negativa sin sentido.
  const epsilonCa = Math.max(2.5 * (fckMPa - 10) * 1e-6, 0);

  return { betaHR, epsilonCd0, kh, epsilonCd, epsilonCa, epsilonCs: epsilonCd + epsilonCa };
}
