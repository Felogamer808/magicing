/**
 * Acción del viento sobre construcciones prismáticas de base rectangular,
 * según UNIT 50-84 (capítulos 6 y 8): velocidad de cálculo, presión
 * dinámica, y coeficientes de presión exterior/interior para los tres
 * estados de permeabilidad de la Tabla 8.2 (cerrada, con una pared abierta,
 * con dos paredes opuestas abiertas), en las dos direcciones de viento
 * (lado A y lado B).
 *
 * No cubre cubiertas: los coeficientes de las figuras 8.7/8.8 dependen de la
 * flecha y el ángulo de la cubierta, un capítulo aparte de la norma. El
 * coeficiente "lateralYTecho" es el que la Tabla 8.1 define para α=0°, que
 * es válido tanto para las caras laterales como para techos planos o de
 * pendiente baja (f ≤ h/2, ver 8.2.3.1) — el caso de cubierta que cubre esta
 * verificación.
 */

export type TipoTopografia = "Normal" | "Expuesto" | "Protegido";
export type TipoTerreno = "I" | "II" | "III" | "IV";
export type TipoVelocidad = "Costero" | "Continental";

/** Grupos de la Tabla 6.3 que tienen Kk propio en el método de estados límite. */
export type GrupoSeguridad = "A" | "B" | "C" | "D" | "E1" | "E2";
export type MetodoCalculo = "estados-limite" | "tensiones-admisibles";

export type CasoApertura =
  | "cerrada"
  | "una-abierta-barlovento"
  | "una-abierta-sotavento"
  | "dos-opuestas-direccion-viento"
  | "dos-opuestas-paralelas-viento";

export const METODOS_CALCULO: { id: MetodoCalculo; nombre: string }[] = [
  { id: "estados-limite", nombre: "Estados límite" },
  { id: "tensiones-admisibles", nombre: "Tensiones admisibles" },
];

export const GRUPOS_SEGURIDAD: GrupoSeguridad[] = ["A", "B", "C", "D", "E1", "E2"];

export const CASOS_APERTURA: { id: CasoApertura; nombre: string }[] = [
  { id: "cerrada", nombre: "Cerrada (μ ≤ 5% en todas las paredes)" },
  { id: "una-abierta-barlovento", nombre: "Una pared abierta, a barlovento" },
  { id: "una-abierta-sotavento", nombre: "Una pared abierta, a sotavento" },
  { id: "dos-opuestas-direccion-viento", nombre: "Dos paredes opuestas abiertas, en la dirección del viento" },
  { id: "dos-opuestas-paralelas-viento", nombre: "Dos paredes opuestas abiertas, paralelas a la dirección del viento" },
];

/**
 * Factor de forma γ0 para construcciones apoyadas en el suelo (e=0), fig. 8.2.
 *
 * La norma sólo da esta fig. en forma de ábaco. Acá se digitalizaron las dos
 * ramas "simples" (λa<0,5 en función de λb, y λb<1 en función de λa): son
 * curvas de un solo tramo, lineales entre dos puntos leídos del gráfico. El
 * quiebre de la rama λa<0,5 se calibró contra dos casos reales, no sólo
 * contra la lectura visual del ábaco: el ejemplo 4 de la norma (13.13.2, pág.
 * 105-107, λa=0,1875 → γ0=0,85 y λb=0,5 → γ0=1) y la planilla "VIENTO2025"
 * (77×35×14 m, λb=0,4 → γ0,a=0,94), que fijan el quiebre en λb=0,25 en vez
 * del 0,2 que parecía a simple vista en el escaneo.
 *
 * Las ramas "λa≥0,5" y "λb≥1" (ábacos de 8 curvas superpuestas, uno por cada
 * λ entero de 3 a 10) no están digitalizadas: son edificios altos en relación
 * a su planta, un caso que no se da en la práctica de obra en Uruguay. Para
 * esos casos la función devuelve null y hay que leer γ0 de la fig. 8.2
 * directamente.
 */
function gammaOLadoA(lambdaB: number): number {
  if (lambdaB <= 0.25) return 0.85;
  if (lambdaB >= 0.5) return 1.0;
  return 0.85 + ((lambdaB - 0.25) / (0.5 - 0.25)) * (1.0 - 0.85);
}

function gammaOLadoB(lambdaA: number): number {
  if (lambdaA <= 0.2) return 0.85;
  if (lambdaA >= 0.3) return 1.0;
  return 0.85 + ((lambdaA - 0.2) / (0.3 - 0.2)) * (1.0 - 0.85);
}

export interface FactorFormaGamma0 {
  /** γ0 para viento ⊥ Sa (usa λa<0,5, en función de λb). null si λa≥0,5: hay que leer la fig. 8.2. */
  ladoA: number | null;
  /** γ0 para viento ⊥ Sb (usa λb<1, en función de λa). null si λb≥1: hay que leer la fig. 8.2. */
  ladoB: number | null;
}

export function calcularFactorFormaGamma0(lambdaA: number, lambdaB: number): FactorFormaGamma0 {
  return {
    ladoA: lambdaA < 0.5 ? gammaOLadoA(lambdaB) : null,
    ladoB: lambdaB < 1 ? gammaOLadoB(lambdaA) : null,
  };
}

export interface DatosLado {
  /** Coeficiente γ₀ leído de la fig. 8.2, según λ y a/b para esta cara expuesta. */
  gamma: number;
  /** Ce de caras laterales y techo (α=0°, Tabla 8.1), leído de la fig. 8.6 según γ. */
  ceLateralYTecho: number;
  /** Kd de este lado (fig. 6.2, Kd=f1/f2), según el área de influencia expuesta en esta dirección. */
  kd: number;
}

export interface DatosViento {
  alturaM: number;
  aM: number;
  bM: number;
  velocidad: TipoVelocidad;
  topografia: TipoTopografia;
  terreno: TipoTerreno;
  metodo: MetodoCalculo;
  /** Sólo se usa si metodo="estados-limite": en tensiones admisibles Kk=1 (7.3.1). */
  grupo: GrupoSeguridad;
  ladoA: DatosLado;
  ladoB: DatosLado;
}

export interface NivelViento {
  nombre: string;
  /** Cota del nivel sobre el terreno (m) */
  zM: number;
}

export interface ResultadoNivelViento extends NivelViento {
  kz: number;
  /** Velocidad de cálculo (m/s), ya con el Kd de este lado. */
  vcMs: number;
  qKgM2: number;
  /** Altura de influencia del nivel (m) */
  hInflM: number;
}

const VELOCIDAD_CARACTERISTICA: Record<TipoVelocidad, number> = { Costero: 43.9, Continental: 37.5 };
const FACTOR_TOPOGRAFICO: Record<TipoTopografia, number> = { Normal: 1, Expuesto: 1.1, Protegido: 0.9 };

/**
 * Tabla 6.3, columna Kk — sólo el método de estados límite distingue por
 * grupo (7.3.1). El valor de E2 (andamios, encofrados) es un piso mínimo en
 * la norma ("≥ 0,80"), no un valor fijo: la tabla deja el ajuste fino a
 * criterio de obra según la importancia de un eventual colapso.
 */
const KK_POR_GRUPO: Record<GrupoSeguridad, number> = {
  A: 1.28,
  B: 1.15,
  C: 1.08,
  D: 0.93,
  E1: 0.97,
  E2: 0.8,
};

/** Coeficiente de altura kz según la rugosidad del terreno (Tabla 6.2). */
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

export function coeficienteSeguridad(metodo: MetodoCalculo, grupo: GrupoSeguridad): number {
  return metodo === "tensiones-admisibles" ? 1 : KK_POR_GRUPO[grupo];
}

/**
 * Tope del coeficiente de presión interior (8.3.1): los valores flojos se
 * empujan hasta el límite de su propio signo, no se recortan hacia cero.
 */
function conLimiteCi(ci: number): number {
  if (ci >= -0.2 && ci <= 0) return -0.2;
  if (ci >= 0 && ci <= 0.15) return 0.15;
  return ci;
}

/**
 * Tope del coeficiente resultante ce−ci (8.4): mismo criterio que 8.3.1 pero
 * sobre la combinación ya hecha, con el límite en 0,3 en vez de 0,2/0,15.
 */
function conLimiteResultante(c: number): number {
  if (c >= -0.3 && c <= 0) return -0.3;
  if (c >= 0 && c <= 0.3) return 0.3;
  return c;
}

export interface CoeficientesInteriores {
  /**
   * Ci sobre las caras genéricas del caso (Tabla 8.2). Uno o dos candidatos
   * según la norma dé un solo valor o un "o bien" sobrepresión/succión — se
   * evalúan todos y el que gobierna cada cara se decide al combinar con ce.
   */
  general: number[];
  /**
   * Sólo en los casos de una pared abierta: ci sobre la cara interior de la
   * pared perforada (μ ≥ 35%), que la norma da como valor único y no se
   * combina con un ce propio.
   */
  paredAbierta?: number;
}

/**
 * Coeficientes de presión interior por caso de apertura (Tabla 8.2), para
 * construcción cerrada o parcialmente abierta con μ ≤ 5% ó μ ≥ 35% exactos
 * (no cubre la interpolación de la última fila de la tabla, para
 * permeabilidades intermedias).
 */
export function coeficientesInterioresPorCaso(caso: CasoApertura, gamma: number): CoeficientesInteriores {
  switch (caso) {
    case "cerrada":
    case "dos-opuestas-direccion-viento":
      return {
        general: [conLimiteCi(0.6 * (1.8 - 1.3 * gamma)), conLimiteCi(-0.6 * (1.3 * gamma - 0.8))],
      };
    case "dos-opuestas-paralelas-viento":
      return {
        general: [conLimiteCi(0.6 * (1.8 - 1.3 * gamma)), conLimiteCi(-(1.3 * gamma - 0.8))],
      };
    case "una-abierta-barlovento":
      // Ci=+0,8 es un valor fijo de la norma, no depende de γ.
      return { general: [0.8], paredAbierta: conLimiteCi(-0.6 * (1.3 * gamma - 0.8)) };
    case "una-abierta-sotavento":
      return {
        general: [conLimiteCi(-(1.3 * gamma - 0.8))],
        paredAbierta: conLimiteCi(0.6 * (1.8 - 1.3 * gamma)),
      };
  }
}

export interface CoeficientesExterioresLado {
  barlovento: number;
  sotavento: number;
  lateralYTecho: number;
}

/** Coeficientes de presión exterior de un lado (Tabla 8.1). */
export function coeficientesExterioresLado(gamma: number, ceLateralYTecho: number): CoeficientesExterioresLado {
  return { barlovento: 0.8, sotavento: -(1.3 * gamma - 0.8), lateralYTecho: ceLateralYTecho };
}

export type NombreCara = "barlovento" | "sotavento" | "lateralYTecho";

export interface ResultanteCara {
  cara: NombreCara;
  ce: number;
  /** ce−ci para cada candidato de ci.general, ya con el tope de 8.4 aplicado. */
  candidatos: number[];
  /** El de mayor magnitud: el que gobierna el dimensionado del paño. */
  gobernante: number;
}

export interface ResultadoCasoApertura {
  caso: CasoApertura;
  ci: CoeficientesInteriores;
  caras: ResultanteCara[];
  /** Coeficiente total (barlovento − sotavento) para el cálculo global de la estructura. */
  cTotalCandidatos: number[];
  cTotalGobernante: number;
}

function peorPorMagnitud(valores: number[]): number {
  return valores.reduce((peor, v) => (Math.abs(v) > Math.abs(peor) ? v : peor));
}

/**
 * Combina los coeficientes exteriores e interiores de un lado, para un caso
 * de apertura dado, en el coeficiente resultante de cada cara (8.4) y el
 * coeficiente total de arrastre para esa dirección.
 */
export function calcularCasoApertura(
  caso: CasoApertura,
  gamma: number,
  ceLateralYTecho: number
): ResultadoCasoApertura {
  const ce = coeficientesExterioresLado(gamma, ceLateralYTecho);
  const ci = coeficientesInterioresPorCaso(caso, gamma);

  const caras: ResultanteCara[] = (
    [
      ["barlovento", ce.barlovento],
      ["sotavento", ce.sotavento],
      ["lateralYTecho", ce.lateralYTecho],
    ] as [NombreCara, number][]
  ).map(([cara, ceCara]) => {
    const candidatos = ci.general.map((ciCandidato) => conLimiteResultante(ceCara - ciCandidato));
    return { cara, ce: ceCara, candidatos, gobernante: peorPorMagnitud(candidatos) };
  });

  const barlov = caras.find((c) => c.cara === "barlovento")!;
  const sotav = caras.find((c) => c.cara === "sotavento")!;
  const cTotalCandidatos = barlov.candidatos.map((c, i) => c - sotav.candidatos[i]);

  return { caso, ci, caras, cTotalCandidatos, cTotalGobernante: peorPorMagnitud(cTotalCandidatos) };
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

export interface ResultadoLado {
  gamma: number;
  ceLateralYTecho: number;
  kd: number;
  kzCoronacion: number;
  niveles: ResultadoNivelViento[];
}

export interface ResultadoViento {
  vkMs: number;
  kt: number;
  kk: number;
  lambdaA: number;
  lambdaB: number;
  relacionAB: number;
  ladoA: ResultadoLado;
  ladoB: ResultadoLado;
}

function calcularLado(
  datos: DatosLado,
  niveles: NivelViento[],
  terreno: TipoTerreno,
  alturaM: number,
  vkMs: number,
  kt: number,
  kk: number
): ResultadoLado {
  const hInfl = alturasInfluencia(niveles);
  const nivelesCalculados = niveles.map((nivel, i) => {
    const kz = coeficienteAltura(terreno, nivel.zM);
    const vcMs = vkMs * kt * datos.kd * kk * kz;
    return { ...nivel, kz, vcMs, qKgM2: vcMs ** 2 / 16.3, hInflM: hInfl[i] };
  });

  return {
    gamma: datos.gamma,
    ceLateralYTecho: datos.ceLateralYTecho,
    kd: datos.kd,
    kzCoronacion: coeficienteAltura(terreno, alturaM),
    niveles: nivelesCalculados,
  };
}

export function calcularViento(datos: DatosViento, niveles: NivelViento[]): ResultadoViento {
  const { alturaM, aM, bM, velocidad, topografia, terreno, metodo, grupo, ladoA, ladoB } = datos;

  const vkMs = VELOCIDAD_CARACTERISTICA[velocidad];
  const kt = FACTOR_TOPOGRAFICO[topografia];
  const kk = coeficienteSeguridad(metodo, grupo);

  return {
    vkMs,
    kt,
    kk,
    lambdaA: alturaM / aM,
    lambdaB: alturaM / bM,
    relacionAB: aM / bM,
    ladoA: calcularLado(ladoA, niveles, terreno, alturaM, vkMs, kt, kk),
    ladoB: calcularLado(ladoB, niveles, terreno, alturaM, vkMs, kt, kk),
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
