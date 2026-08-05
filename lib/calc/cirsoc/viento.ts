/**
 * Acción del viento sobre un edificio, según el planteo de CIRSOC 102 que usa la
 * planilla: velocidad característica corregida por topografía, altura,
 * dimensiones y período de retorno; presión dinámica; y coeficientes de presión
 * exterior e interior combinados en un coeficiente total de arrastre.
 */

export type TipoTopografia = "Normal" | "Expuesto" | "Protegido";
export type TipoTerreno = "I" | "II" | "III" | "IV";
export type TipoVelocidad = "Costero" | "Continental";

export interface DatosViento {
  /** Altura total del edificio (m) */
  alturaM: number;
  /** Lado a de la planta (m) */
  aM: number;
  /** Lado b de la planta (m) */
  bM: number;
  velocidad: TipoVelocidad;
  topografia: TipoTopografia;
  terreno: TipoTerreno;
  /** Coeficiente de dimensiones Kd */
  kd: number;
  /** Período de retorno considerado (años): 20 o 50 */
  periodoRetornoAnios: number;
  /** Coeficiente γ leído del gráfico de la norma, según la relación de dimensiones */
  gamma: number;
}

export interface NivelViento {
  nombre: string;
  /** Cota del nivel sobre el terreno (m) */
  zM: number;
}

export interface ResultadoNivelViento extends NivelViento {
  /** Coeficiente de altura en ese nivel */
  kz: number;
  /** Velocidad de cálculo (m/s) */
  vcMs: number;
  /** Presión dinámica (kg/m²) */
  qKgM2: number;
  /** Presión de viento (kN/m²) */
  pcKNm2: number;
  /** Altura de influencia del nivel (m) */
  hInflM: number;
  /** Carga lineal sobre el nivel (kN/m) */
  pcKNm: number;
}

export interface CoeficientesPresion {
  /** Presión exterior en barlovento */
  ceBarlovento: number;
  /** Presión exterior en sotavento */
  ceSotavento: number;
  /** Presión exterior en caras laterales y techos */
  ceOtrasCaras: number;
  /** Presión interior, valor de succión */
  ciSuccion: number;
  /** Presión interior, valor de presión */
  ciPresion: number;
  /** Coeficiente total de arrastre, barlovento menos sotavento */
  cTotal: number;
}

export interface ResultadoViento {
  /** Velocidad característica de la zona (m/s) */
  vkMs: number;
  kt: number;
  kk: number;
  /** Coeficiente de altura en la coronación */
  kzCoronacion: number;
  lambdaA: number;
  lambdaB: number;
  relacionAB: number;
  coeficientes: CoeficientesPresion;
  niveles: ResultadoNivelViento[];
  /** Resultante total del viento sobre una cara (kN) */
  resultanteTotalKN: number;
}

const VELOCIDAD_CARACTERISTICA: Record<TipoVelocidad, number> = { Costero: 43.9, Continental: 37.5 };
const FACTOR_TOPOGRAFICO: Record<TipoTopografia, number> = { Normal: 1, Expuesto: 1.1, Protegido: 0.9 };

/** Coeficiente de altura kz según la rugosidad del terreno. */
export function coeficienteAltura(terreno: TipoTerreno, zM: number): number {
  const z = Math.max(zM, 0.01) / 10;
  switch (terreno) {
    case "I":
      return z ** 0.1;
    case "II":
      return 0.9 * z ** 0.13;
    case "III":
      return 0.75 * z ** 0.17;
    case "IV":
      return 0.6 * z ** 0.22;
  }
}

/**
 * Coeficientes de presión para un edificio cerrado (permeabilidad ≤ 5%).
 *
 * Los topes de la presión interior están escritos como comparaciones encadenadas
 * en la planilla (`-0,2 < x < 0`), que Excel evalúa de izquierda a derecha y por
 * lo tanto nunca cumple. Acá se aplica el tope que la fórmula pretendía.
 */
export function calcularCoeficientesPresion(gamma: number): CoeficientesPresion {
  const ceBarlovento = 0.8;
  const ceSotavento = -(1.3 * gamma - 0.8);
  const ceOtrasCaras = -0.5;

  const base = 0.6 * (1.3 * gamma - 0.8);
  const ciSuccion = Math.min(-base, -0.2);
  const ciPresion = base > 0 && base < 0.15 ? 0.15 : base;

  // La presión interior se cancela al restar barlovento menos sotavento; queda
  // como tope el valor mínimo de succión que fija la norma.
  const cTotal = ceBarlovento + ciPresion - Math.min(ceSotavento + ciPresion, -0.3);

  return { ceBarlovento, ceSotavento, ceOtrasCaras, ciSuccion, ciPresion, cTotal };
}

/** Alturas de influencia: media distancia a cada nivel vecino. */
function alturasInfluencia(niveles: NivelViento[]): number[] {
  return niveles.map((nivel, i) => {
    const anterior = niveles[i - 1];
    const siguiente = niveles[i + 1];
    const mitadInferior = anterior ? (nivel.zM - anterior.zM) / 2 : 0;
    const mitadSuperior = siguiente ? (siguiente.zM - nivel.zM) / 2 : 0;
    return mitadInferior + mitadSuperior;
  });
}

export function calcularViento(datos: DatosViento, niveles: NivelViento[]): ResultadoViento {
  const { alturaM, aM, bM, velocidad, topografia, terreno, kd, periodoRetornoAnios, gamma } = datos;

  const vkMs = VELOCIDAD_CARACTERISTICA[velocidad];
  const kt = FACTOR_TOPOGRAFICO[topografia];
  const kk = periodoRetornoAnios >= 50 ? 1.15 : 1;

  const coeficientes = calcularCoeficientesPresion(gamma);
  const hInfl = alturasInfluencia(niveles);

  const nivelesCalculados = niveles.map((nivel, i) => {
    const kz = coeficienteAltura(terreno, nivel.zM);
    const vcMs = vkMs * kt * kd * kk * kz;
    const qKgM2 = vcMs ** 2 / 16.3;
    const pcKNm2 = (qKgM2 * coeficientes.cTotal) / 100;
    return {
      ...nivel,
      kz,
      vcMs,
      qKgM2,
      pcKNm2,
      hInflM: hInfl[i],
      pcKNm: pcKNm2 * hInfl[i],
    };
  });

  // Resultante sobre una cara: la carga lineal de cada nivel por el ancho expuesto.
  const anchoExpuestoM = aM;
  const resultanteTotalKN = nivelesCalculados.reduce((acc, n) => acc + n.pcKNm * anchoExpuestoM, 0);

  return {
    vkMs,
    kt,
    kk,
    kzCoronacion: coeficienteAltura(terreno, alturaM),
    lambdaA: alturaM / aM,
    lambdaB: alturaM / bM,
    relacionAB: aM / bM,
    coeficientes,
    niveles: nivelesCalculados,
    resultanteTotalKN,
  };
}

/** Genera niveles equiespaciados entre una cota inicial y la coronación. */
export function generarNiveles(zInicialM: number, zFinalM: number, cantidad: number): NivelViento[] {
  if (cantidad < 2) return [{ nombre: "N1", zM: zFinalM }];
  const paso = (zFinalM - zInicialM) / (cantidad - 1);
  return Array.from({ length: cantidad }, (_, i) => ({
    nombre: `N${i + 1}`,
    zM: zInicialM + i * paso,
  }));
}
