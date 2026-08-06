/**
 * Tabla de perfiles laminados y sus propiedades de sección.
 *
 * Los perfiles simples se guardan con los valores tabulados de la norma que los
 * define, en las unidades en que esa norma los publica (mm y cm), y se convierten
 * a SI al leerlos. Se guardan tabulados y no calculados porque el redondeo de las
 * alas inclinadas y los radios de acuerdo no se reproduce con geometría simple:
 * el PNI tiene alas con 14 % de conicidad.
 *
 *   PNI  (perfil normal I)     DIN 1025-1
 *   PNC  (perfil normal U)     DIN 1026-1
 *   HEB  (perfil de ala ancha) EN 10365
 *
 * El 2PNC en cambio **se calcula** a partir del PNC simple, porque sus propiedades
 * dependen de la separación entre perfiles, que es un dato de proyecto y no algo
 * que se pueda tabular. Ver `componerDoblePNC`.
 */

/** Propiedades de una sección, ya en SI. */
export interface PropiedadesSeccion {
  /** Altura total del perfil. */
  hM: number;
  /** Ancho del ala. */
  bM: number;
  /** Espesor del alma. */
  twM: number;
  /** Espesor del ala. */
  tfM: number;
  /** Altura libre del alma entre alas. */
  dM: number;
  areaM2: number;
  ixM4: number;
  sxM3: number;
  zxM3: number;
  rxM: number;
  iyM4: number;
  syM3: number;
  zyM3: number;
  ryM: number;
  /** Constante de torsión de Saint-Venant. */
  jM4: number;
}

/**
 * Fila de la tabla, en unidades de catálogo: dimensiones en mm, áreas en cm²,
 * inercias en cm⁴ y módulos en cm³. Se transcribe así, en las mismas unidades
 * que la norma, para poder cotejar contra el catálogo sin convertir de cabeza.
 */
interface FilaCatalogo {
  h: number;
  b: number;
  tw: number;
  tf: number;
  area: number;
  ix: number;
  sx: number;
  zx: number;
  rx: number;
  iy: number;
  sy: number;
  zy: number;
  ry: number;
  j: number;
  /**
   * Solo en perfiles U: distancia del dorso del alma al centro de gravedad,
   * en cm. Hace falta para componer el 2PNC con el teorema de Steiner.
   */
  e?: number;
}

/** DIN 1025-1 — perfil normal I, alas con 14 % de conicidad. */
const PNI: Record<number, FilaCatalogo> = {
  80: { h: 80, b: 42, tw: 3.9, tf: 5.9, area: 7.57, ix: 77.8, sx: 19.5, zx: 22.8, rx: 3.2, iy: 6.29, sy: 3.0, zy: 5.0, ry: 0.91, j: 0.87 },
  100: { h: 100, b: 50, tw: 4.5, tf: 6.8, area: 10.6, ix: 171, sx: 34.2, zx: 39.8, rx: 4.01, iy: 12.2, sy: 4.88, zy: 8.1, ry: 1.07, j: 1.6 },
  120: { h: 120, b: 58, tw: 5.1, tf: 7.7, area: 14.2, ix: 328, sx: 54.7, zx: 63.6, rx: 4.81, iy: 21.5, sy: 7.41, zy: 12.4, ry: 1.23, j: 2.71 },
  140: { h: 140, b: 66, tw: 5.7, tf: 8.6, area: 18.2, ix: 573, sx: 81.9, zx: 95.4, rx: 5.61, iy: 35.2, sy: 10.7, zy: 17.9, ry: 1.4, j: 4.32 },
  160: { h: 160, b: 74, tw: 6.3, tf: 9.5, area: 22.8, ix: 935, sx: 117, zx: 136, rx: 6.4, iy: 54.7, sy: 14.8, zy: 24.9, ry: 1.55, j: 6.57 },
  180: { h: 180, b: 82, tw: 6.9, tf: 10.4, area: 27.9, ix: 1450, sx: 161, zx: 187, rx: 7.2, iy: 81.3, sy: 19.8, zy: 33.2, ry: 1.71, j: 9.58 },
  200: { h: 200, b: 90, tw: 7.5, tf: 11.3, area: 33.4, ix: 2140, sx: 214, zx: 250, rx: 8.0, iy: 117, sy: 26.0, zy: 43.5, ry: 1.87, j: 13.5 },
  220: { h: 220, b: 98, tw: 8.1, tf: 12.2, area: 39.5, ix: 3060, sx: 278, zx: 324, rx: 8.8, iy: 162, sy: 33.1, zy: 55.7, ry: 2.02, j: 18.6 },
  240: { h: 240, b: 106, tw: 8.7, tf: 13.1, area: 46.1, ix: 4250, sx: 354, zx: 412, rx: 9.59, iy: 221, sy: 41.7, zy: 70.0, ry: 2.2, j: 25.0 },
  260: { h: 260, b: 113, tw: 9.4, tf: 14.1, area: 53.3, ix: 5740, sx: 442, zx: 514, rx: 10.4, iy: 288, sy: 51.0, zy: 85.9, ry: 2.32, j: 33.5 },
  280: { h: 280, b: 119, tw: 10.1, tf: 15.2, area: 61.0, ix: 7590, sx: 542, zx: 632, rx: 11.1, iy: 364, sy: 61.2, zy: 103, ry: 2.45, j: 44.2 },
  300: { h: 300, b: 125, tw: 10.8, tf: 16.2, area: 69.0, ix: 9800, sx: 653, zx: 762, rx: 11.9, iy: 451, sy: 72.2, zy: 121, ry: 2.56, j: 56.8 },
};

/** DIN 1026-1 — perfil normal U. `e` es el dorso del alma al centro de gravedad. */
const PNC: Record<number, FilaCatalogo> = {
  80: { h: 80, b: 45, tw: 6, tf: 8, area: 11.0, ix: 106, sx: 26.5, zx: 31.8, rx: 3.1, iy: 19.4, sy: 6.36, zy: 12.1, ry: 1.33, j: 2.16, e: 1.45 },
  100: { h: 100, b: 50, tw: 6, tf: 8.5, area: 13.5, ix: 206, sx: 41.2, zx: 49.0, rx: 3.91, iy: 29.3, sy: 8.49, zy: 16.2, ry: 1.47, j: 2.81, e: 1.55 },
  120: { h: 120, b: 55, tw: 7, tf: 9, area: 17.0, ix: 364, sx: 60.7, zx: 72.6, rx: 4.62, iy: 43.2, sy: 11.1, zy: 21.2, ry: 1.59, j: 4.15, e: 1.6 },
  140: { h: 140, b: 60, tw: 7, tf: 10, area: 20.4, ix: 605, sx: 86.4, zx: 103, rx: 5.45, iy: 62.7, sy: 14.8, zy: 28.3, ry: 1.75, j: 6.14, e: 1.75 },
  160: { h: 160, b: 65, tw: 7.5, tf: 10.5, area: 24.0, ix: 925, sx: 116, zx: 138, rx: 6.21, iy: 85.3, sy: 18.3, zy: 35.2, ry: 1.89, j: 8.13, e: 1.84 },
  180: { h: 180, b: 70, tw: 8, tf: 11, area: 28.0, ix: 1350, sx: 150, zx: 179, rx: 6.95, iy: 114, sy: 22.4, zy: 42.9, ry: 2.02, j: 10.5, e: 1.92 },
  200: { h: 200, b: 75, tw: 8.5, tf: 11.5, area: 32.2, ix: 1910, sx: 191, zx: 228, rx: 7.7, iy: 148, sy: 27.0, zy: 51.8, ry: 2.14, j: 13.3, e: 2.01 },
  220: { h: 220, b: 80, tw: 9, tf: 12.5, area: 37.4, ix: 2690, sx: 245, zx: 292, rx: 8.48, iy: 197, sy: 33.6, zy: 64.1, ry: 2.3, j: 18.6, e: 2.14 },
  240: { h: 240, b: 85, tw: 9.5, tf: 13, area: 42.3, ix: 3600, sx: 300, zx: 358, rx: 9.22, iy: 248, sy: 39.6, zy: 75.7, ry: 2.42, j: 22.1, e: 2.23 },
  260: { h: 260, b: 90, tw: 10, tf: 14, area: 48.3, ix: 4820, sx: 371, zx: 442, rx: 9.99, iy: 317, sy: 47.7, zy: 91.6, ry: 2.56, j: 28.8, e: 2.36 },
  280: { h: 280, b: 95, tw: 10, tf: 15, area: 53.3, ix: 6280, sx: 448, zx: 532, rx: 10.9, iy: 399, sy: 57.2, zy: 109, ry: 2.74, j: 37.4, e: 2.53 },
  300: { h: 300, b: 100, tw: 10, tf: 16, area: 58.8, ix: 8030, sx: 535, zx: 632, rx: 11.7, iy: 495, sy: 67.8, zy: 130, ry: 2.9, j: 47.9, e: 2.7 },
};

/** EN 10365 — perfil de ala ancha serie B. */
const HEB: Record<number, FilaCatalogo> = {
  100: { h: 100, b: 100, tw: 6, tf: 10, area: 26.0, ix: 450, sx: 89.9, zx: 104, rx: 4.16, iy: 167, sy: 33.5, zy: 51.4, ry: 2.53, j: 9.25 },
  120: { h: 120, b: 120, tw: 6.5, tf: 11, area: 34.0, ix: 864, sx: 144, zx: 165, rx: 5.04, iy: 318, sy: 52.9, zy: 81.0, ry: 3.06, j: 13.8 },
  140: { h: 140, b: 140, tw: 7, tf: 12, area: 43.0, ix: 1510, sx: 216, zx: 245, rx: 5.93, iy: 550, sy: 78.5, zy: 120, ry: 3.58, j: 20.1 },
  160: { h: 160, b: 160, tw: 8, tf: 13, area: 54.3, ix: 2490, sx: 311, zx: 354, rx: 6.78, iy: 889, sy: 111, zy: 170, ry: 4.05, j: 31.2 },
  180: { h: 180, b: 180, tw: 8.5, tf: 14, area: 65.3, ix: 3830, sx: 426, zx: 482, rx: 7.66, iy: 1360, sy: 151, zy: 231, ry: 4.57, j: 42.2 },
  200: { h: 200, b: 200, tw: 9, tf: 15, area: 78.1, ix: 5700, sx: 570, zx: 643, rx: 8.54, iy: 2000, sy: 200, zy: 306, ry: 5.07, j: 59.3 },
  220: { h: 220, b: 220, tw: 9.5, tf: 16, area: 91.0, ix: 8090, sx: 736, zx: 827, rx: 9.43, iy: 2840, sy: 258, zy: 394, ry: 5.59, j: 76.6 },
  240: { h: 240, b: 240, tw: 10, tf: 17, area: 106, ix: 11260, sx: 938, zx: 1050, rx: 10.3, iy: 3920, sy: 327, zy: 498, ry: 6.08, j: 103 },
  260: { h: 260, b: 260, tw: 10, tf: 17.5, area: 118, ix: 14920, sx: 1150, zx: 1280, rx: 11.2, iy: 5130, sy: 395, zy: 602, ry: 6.58, j: 124 },
  280: { h: 280, b: 280, tw: 10.5, tf: 18, area: 131, ix: 19270, sx: 1380, zx: 1530, rx: 12.1, iy: 6590, sy: 471, zy: 718, ry: 7.09, j: 144 },
  300: { h: 300, b: 300, tw: 11, tf: 19, area: 149, ix: 25170, sx: 1680, zx: 1870, rx: 13.0, iy: 8560, sy: 571, zy: 870, ry: 7.58, j: 185 },
};

const CATALOGOS = { PNI, PNC, HEB } as const;

export type FamiliaSimple = keyof typeof CATALOGOS;
export type Familia = FamiliaSimple | "2PNC";

export const familias: Familia[] = ["PNI", "PNC", "HEB", "2PNC"];

/** Alturas disponibles de una familia, en mm y de menor a mayor. */
export function alturasDisponibles(familia: Familia): number[] {
  const catalogo = familia === "2PNC" ? PNC : CATALOGOS[familia];
  return Object.keys(catalogo)
    .map(Number)
    .sort((a, b) => a - b);
}

/** Pasa una fila de catálogo (mm, cm², cm³, cm⁴) a SI. */
function aSI(f: FilaCatalogo): PropiedadesSeccion {
  return {
    hM: f.h / 1000,
    bM: f.b / 1000,
    twM: f.tw / 1000,
    tfM: f.tf / 1000,
    dM: (f.h - 2 * f.tf) / 1000,
    areaM2: f.area / 1e4,
    ixM4: f.ix / 1e8,
    sxM3: f.sx / 1e6,
    zxM3: f.zx / 1e6,
    rxM: f.rx / 100,
    iyM4: f.iy / 1e8,
    syM3: f.sy / 1e6,
    zyM3: f.zy / 1e6,
    ryM: f.ry / 100,
    jM4: f.j / 1e8,
  };
}

/**
 * Compone dos PNC adosados por el dorso del alma, con las alas hacia afuera.
 *
 * El eje x (el fuerte de cada perfil) simplemente se duplica. El eje y es el que
 * depende del armado: cada perfil aporta su propia inercia más el traslado de
 * Steiner hasta el eje de simetría del conjunto, a una distancia `separacion/2 + e`,
 * donde `e` es el dorso del alma al centro de gravedad del perfil simple.
 *
 * Por eso `Iy` nunca puede ser igual a `Ix`, ni siquiera con los perfiles en
 * contacto: son secciones distintas alrededor de ejes distintos.
 *
 * @param separacionM Luz libre entre los dorsos de alma. 0 = perfiles en contacto.
 */
export function componerDoblePNC(altura: number, separacionM = 0): PropiedadesSeccion {
  const fila = PNC[altura];
  if (!fila) throw new Error(`No hay PNC de altura ${altura} mm en el catálogo.`);
  const simple = aSI(fila);
  const e = (fila.e as number) / 100;

  // Distancia del eje de simetría del conjunto al baricentro de cada perfil.
  const brazo = separacionM / 2 + e;
  // Fibra extrema en y: la punta del ala, al otro lado del alma.
  const cY = separacionM / 2 + simple.bM;

  const areaM2 = 2 * simple.areaM2;
  const iyM4 = 2 * (simple.iyM4 + simple.areaM2 * brazo ** 2);

  return {
    hM: simple.hM,
    bM: 2 * simple.bM + separacionM,
    twM: simple.twM,
    tfM: simple.tfM,
    dM: simple.dM,
    areaM2,
    ixM4: 2 * simple.ixM4,
    sxM3: 2 * simple.sxM3,
    zxM3: 2 * simple.zxM3,
    rxM: simple.rxM,
    iyM4,
    syM3: iyM4 / cY,
    // Cada perfil queda entero de un lado del eje: su aporte plástico es A·brazo exacto.
    zyM3: 2 * simple.areaM2 * brazo,
    ryM: Math.sqrt(iyM4 / areaM2),
    // Suma de constantes de torsión: dos secciones abiertas independientes.
    jM4: 2 * simple.jM4,
  };
}

/**
 * Propiedades de un perfil por familia y altura. Para 2PNC, `separacionM` es la
 * luz entre dorsos de alma (0 = en contacto).
 */
export function propiedades(
  familia: Familia,
  altura: number,
  separacionM = 0
): PropiedadesSeccion {
  if (familia === "2PNC") return componerDoblePNC(altura, separacionM);
  const fila = CATALOGOS[familia][altura];
  if (!fila) throw new Error(`No hay ${familia} de altura ${altura} mm en el catálogo.`);
  return aSI(fila);
}

/** Etiqueta comercial: "PNI160", "2PNC180". */
export function designacion(familia: Familia, altura: number) {
  return `${familia}${altura}`;
}
