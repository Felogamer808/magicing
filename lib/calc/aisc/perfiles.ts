/**
 * Tabla de perfiles laminados y sus propiedades de sección.
 *
 * Los perfiles simples se guardan con los valores del catálogo de ArcelorMittal
 * "Perfiles y barras" (dimensiones según EN 10365:2017), en las unidades en que
 * el catálogo los publica —mm, cm², cm³, cm⁴—, y se convierten a SI al leerlos.
 * Se guardan tabulados y no calculados porque el redondeo de las alas inclinadas
 * y los radios de acuerdo no se reproduce con geometría simple: el PNI tiene alas
 * con 14 % de conicidad.
 *
 *   PNI  perfil normal I, alas inclinadas   (IPN en el catálogo)
 *   PNC  perfil normal U, alas inclinadas   (UPN en el catálogo)
 *   HEB  perfil de ala ancha, serie B       (HE B en el catálogo)
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
  /** Altura libre entre caras interiores de alas, h − 2·tf. */
  hiM: number;
  /**
   * Altura recta del alma: entre alas y descontando los acuerdos de laminación.
   * Es la `h` de AISC en las relaciones h/tw de los artículos B4.1 y G2, y la
   * columna `d` del catálogo. Es menor que `hiM`.
   */
  hAlmaM: number;
  areaM2: number;
  ixM4: number;
  sxM3: number;
  zxM3: number;
  rxM: number;
  iyM4: number;
  syM3: number;
  zyM3: number;
  ryM: number;
  /** Constante de torsión de Saint-Venant (It del catálogo). */
  jM4: number;
  /** Constante de alabeo (Iw del catálogo). */
  cwM6: number;
  /** Sección doblemente simétrica: define el coeficiente c de la ec. F2-8. */
  doblementeSimetrica: boolean;
}

/**
 * Fila del catálogo: dimensiones en mm, área en cm², inercias en cm⁴, módulos en
 * cm³ y la constante de alabeo en 10⁹ mm⁶, tal como las publica ArcelorMittal.
 * Se transcribe en esas unidades para poder cotejar contra el catálogo sin
 * convertir de cabeza.
 */
interface FilaCatalogo {
  h: number;
  b: number;
  tw: number;
  tf: number;
  /** Columna `d` del catálogo: altura recta del alma, en mm. */
  d: number;
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
  /** Iw en 10⁹ mm⁶. */
  iw: number;
  /**
   * Solo en perfiles U: distancia del dorso del alma al centro de gravedad, en cm
   * (columna `ys` del catálogo). Hace falta para componer el 2PNC con Steiner.
   */
  ys?: number;
}

/** IPN — perfil normal I, alas con 14 % de conicidad. */
const PNI: Record<number, FilaCatalogo> = {
  80: { h: 80, b: 42, tw: 3.9, tf: 5.9, d: 59, area: 7.6, ix: 77.8, sx: 19.5, zx: 22.8, rx: 3.2, iy: 6.29, sy: 3.0, zy: 5.0, ry: 0.91, j: 0.87, iw: 0.09 },
  100: { h: 100, b: 50, tw: 4.5, tf: 6.8, d: 75.7, area: 10.6, ix: 171, sx: 34.2, zx: 39.8, rx: 4.01, iy: 12.2, sy: 4.88, zy: 8.1, ry: 1.07, j: 1.6, iw: 0.27 },
  120: { h: 120, b: 58, tw: 5.1, tf: 7.7, d: 92.4, area: 14.2, ix: 328, sx: 54.7, zx: 63.6, rx: 4.81, iy: 21.5, sy: 7.41, zy: 12.4, ry: 1.23, j: 2.71, iw: 0.69 },
  140: { h: 140, b: 66, tw: 5.7, tf: 8.6, d: 109.1, area: 18.2, ix: 573, sx: 81.9, zx: 95.4, rx: 5.61, iy: 35.2, sy: 10.7, zy: 17.9, ry: 1.4, j: 4.32, iw: 1.54 },
  160: { h: 160, b: 74, tw: 6.3, tf: 9.5, d: 125.8, area: 22.8, ix: 935, sx: 117, zx: 136, rx: 6.4, iy: 54.7, sy: 14.8, zy: 24.9, ry: 1.55, j: 6.57, iw: 3.14 },
  180: { h: 180, b: 82, tw: 6.9, tf: 10.4, d: 142.4, area: 27.9, ix: 1450, sx: 161, zx: 187, rx: 7.2, iy: 81.3, sy: 19.8, zy: 33.2, ry: 1.71, j: 9.58, iw: 5.92 },
  200: { h: 200, b: 90, tw: 7.5, tf: 11.3, d: 159.1, area: 33.4, ix: 2140, sx: 214, zx: 250, rx: 8.0, iy: 117, sy: 26.0, zy: 43.5, ry: 1.87, j: 13.5, iw: 10.5 },
  220: { h: 220, b: 98, tw: 8.1, tf: 12.2, d: 175.8, area: 39.5, ix: 3060, sx: 278, zx: 324, rx: 8.8, iy: 162, sy: 33.1, zy: 55.7, ry: 2.02, j: 18.6, iw: 17.8 },
  240: { h: 240, b: 106, tw: 8.7, tf: 13.1, d: 192.5, area: 46.1, ix: 4250, sx: 354, zx: 412, rx: 9.59, iy: 221, sy: 41.7, zy: 70.0, ry: 2.2, j: 25.0, iw: 28.7 },
  260: { h: 260, b: 113, tw: 9.4, tf: 14.1, d: 208.9, area: 53.3, ix: 5740, sx: 442, zx: 514, rx: 10.4, iy: 288, sy: 51.0, zy: 85.9, ry: 2.32, j: 33.5, iw: 44.1 },
  280: { h: 280, b: 119, tw: 10.1, tf: 15.2, d: 225.1, area: 61.0, ix: 7590, sx: 542, zx: 632, rx: 11.1, iy: 364, sy: 61.2, zy: 103, ry: 2.45, j: 44.2, iw: 64.6 },
  300: { h: 300, b: 125, tw: 10.8, tf: 16.2, d: 241.6, area: 69.0, ix: 9800, sx: 653, zx: 762, rx: 11.9, iy: 451, sy: 72.2, zy: 121, ry: 2.56, j: 56.8, iw: 91.8 },
};

/** UPN — perfil normal U. `ys` es el dorso del alma al centro de gravedad. */
const PNC: Record<number, FilaCatalogo> = {
  80: { h: 80, b: 45, tw: 6, tf: 8, d: 47, area: 11.0, ix: 106, sx: 26.5, zx: 32.3, rx: 3.1, iy: 19.4, sy: 6.36, zy: 11.9, ry: 1.33, j: 2.2, iw: 0.18, ys: 1.45 },
  100: { h: 100, b: 50, tw: 6, tf: 8.5, d: 64, area: 13.5, ix: 206, sx: 41.2, zx: 49.0, rx: 3.91, iy: 29.3, sy: 8.49, zy: 16.2, ry: 1.47, j: 2.81, iw: 0.41, ys: 1.55 },
  120: { h: 120, b: 55, tw: 7, tf: 9, d: 82, area: 17.0, ix: 364, sx: 60.7, zx: 72.6, rx: 4.62, iy: 43.2, sy: 11.1, zy: 21.2, ry: 1.59, j: 4.15, iw: 0.9, ys: 1.6 },
  140: { h: 140, b: 60, tw: 7, tf: 10, d: 98, area: 20.4, ix: 605, sx: 86.4, zx: 103, rx: 5.45, iy: 62.7, sy: 14.8, zy: 28.3, ry: 1.75, j: 5.68, iw: 1.8, ys: 1.75 },
  160: { h: 160, b: 65, tw: 7.5, tf: 10.5, d: 115, area: 24.0, ix: 925, sx: 116, zx: 138, rx: 6.21, iy: 85.3, sy: 18.3, zy: 35.2, ry: 1.89, j: 7.39, iw: 3.26, ys: 1.84 },
  180: { h: 180, b: 70, tw: 8, tf: 11, d: 133, area: 28.0, ix: 1350, sx: 150, zx: 179, rx: 6.95, iy: 114, sy: 22.4, zy: 42.9, ry: 2.02, j: 9.55, iw: 5.57, ys: 1.92 },
  200: { h: 200, b: 75, tw: 8.5, tf: 11.5, d: 151, area: 32.2, ix: 1910, sx: 191, zx: 228, rx: 7.7, iy: 148, sy: 27.0, zy: 51.8, ry: 2.14, j: 11.9, iw: 9.07, ys: 2.01 },
  220: { h: 220, b: 80, tw: 9, tf: 12.5, d: 167, area: 37.4, ix: 2690, sx: 245, zx: 292, rx: 8.48, iy: 197, sy: 33.6, zy: 64.1, ry: 2.3, j: 16.0, iw: 14.6, ys: 2.14 },
  240: { h: 240, b: 85, tw: 9.5, tf: 13, d: 184, area: 42.3, ix: 3600, sx: 300, zx: 358, rx: 9.22, iy: 248, sy: 39.6, zy: 75.7, ry: 2.42, j: 19.7, iw: 22.1, ys: 2.23 },
  260: { h: 260, b: 90, tw: 10, tf: 14, d: 200, area: 48.3, ix: 4820, sx: 371, zx: 442, rx: 9.99, iy: 317, sy: 47.7, zy: 91.6, ry: 2.56, j: 25.5, iw: 33.3, ys: 2.36 },
  280: { h: 280, b: 95, tw: 10, tf: 15, d: 216, area: 53.3, ix: 6280, sx: 448, zx: 532, rx: 10.9, iy: 399, sy: 57.2, zy: 109, ry: 2.74, j: 31.0, iw: 48.5, ys: 2.53 },
  300: { h: 300, b: 100, tw: 10, tf: 16, d: 232, area: 58.8, ix: 8030, sx: 535, zx: 632, rx: 11.7, iy: 495, sy: 67.8, zy: 130, ry: 2.9, j: 37.4, iw: 69.1, ys: 2.7 },
};

/** HE B — perfil de ala ancha, serie B. */
const HEB: Record<number, FilaCatalogo> = {
  100: { h: 100, b: 100, tw: 6, tf: 10, d: 56, area: 26.0, ix: 449.5, sx: 89.91, zx: 104.2, rx: 4.16, iy: 167.3, sy: 33.45, zy: 51.42, ry: 2.53, j: 9.25, iw: 3.38 },
  120: { h: 120, b: 120, tw: 6.5, tf: 11, d: 74, area: 34.0, ix: 864.4, sx: 144.1, zx: 165.2, rx: 5.04, iy: 317.5, sy: 52.92, zy: 80.97, ry: 3.06, j: 13.84, iw: 9.41 },
  140: { h: 140, b: 140, tw: 7, tf: 12, d: 92, area: 43.0, ix: 1509, sx: 215.6, zx: 245.4, rx: 5.93, iy: 549.7, sy: 78.52, zy: 119.8, ry: 3.58, j: 20.06, iw: 22.48 },
  160: { h: 160, b: 160, tw: 8, tf: 13, d: 104, area: 54.3, ix: 2492, sx: 311.5, zx: 354.0, rx: 6.78, iy: 889.2, sy: 111.2, zy: 170.0, ry: 4.05, j: 31.24, iw: 47.94 },
  180: { h: 180, b: 180, tw: 8.5, tf: 14, d: 122, area: 65.3, ix: 3831, sx: 425.7, zx: 481.4, rx: 7.66, iy: 1363, sy: 151.4, zy: 231.0, ry: 4.57, j: 42.16, iw: 93.75 },
  200: { h: 200, b: 200, tw: 9, tf: 15, d: 134, area: 78.1, ix: 5696, sx: 569.6, zx: 642.5, rx: 8.54, iy: 2003, sy: 200.3, zy: 305.8, ry: 5.07, j: 59.28, iw: 171.1 },
  220: { h: 220, b: 220, tw: 9.5, tf: 16, d: 152, area: 91.0, ix: 8091, sx: 735.5, zx: 827.0, rx: 9.43, iy: 2843, sy: 258.5, zy: 393.9, ry: 5.59, j: 76.57, iw: 295.4 },
  240: { h: 240, b: 240, tw: 10, tf: 17, d: 164, area: 106.0, ix: 11260, sx: 938.3, zx: 1053, rx: 10.31, iy: 3923, sy: 326.9, zy: 498.4, ry: 6.08, j: 102.7, iw: 486.9 },
  260: { h: 260, b: 260, tw: 10, tf: 17.5, d: 177, area: 118.4, ix: 14920, sx: 1148, zx: 1283, rx: 11.22, iy: 5135, sy: 395.0, zy: 602.2, ry: 6.58, j: 123.8, iw: 753.7 },
  280: { h: 280, b: 280, tw: 10.5, tf: 18, d: 196, area: 131.4, ix: 19270, sx: 1376, zx: 1534, rx: 12.11, iy: 6595, sy: 471.0, zy: 717.6, ry: 7.09, j: 143.7, iw: 1130 },
  300: { h: 300, b: 300, tw: 11, tf: 19, d: 208, area: 149.1, ix: 25170, sx: 1678, zx: 1869, rx: 12.99, iy: 8563, sy: 570.9, zy: 870.1, ry: 7.58, j: 185.0, iw: 1688 },
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

/** Pasa una fila de catálogo a SI. */
function aSI(f: FilaCatalogo, doblementeSimetrica: boolean): PropiedadesSeccion {
  return {
    hM: f.h / 1000,
    bM: f.b / 1000,
    twM: f.tw / 1000,
    tfM: f.tf / 1000,
    hiM: (f.h - 2 * f.tf) / 1000,
    hAlmaM: f.d / 1000,
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
    // Iw viene en 10⁹ mm⁶; 1 mm⁶ = 1e-18 m⁶.
    cwM6: (f.iw * 1e9) / 1e18,
    doblementeSimetrica,
  };
}

/**
 * Compone dos PNC adosados por el dorso del alma, con las alas hacia afuera.
 *
 * El eje x (el fuerte de cada perfil) simplemente se duplica. El eje y es el que
 * depende del armado: cada perfil aporta su propia inercia más el traslado de
 * Steiner hasta el eje de simetría del conjunto, a una distancia `separacion/2 + ys`,
 * donde `ys` es el dorso del alma al centro de gravedad del perfil simple.
 *
 * Por eso `Iy` nunca puede ser igual a `Ix`, ni siquiera con los perfiles en
 * contacto: son secciones distintas alrededor de ejes distintos.
 *
 * @param separacionM Luz libre entre los dorsos de alma. 0 = perfiles en contacto.
 */
export function componerDoblePNC(altura: number, separacionM = 0): PropiedadesSeccion {
  const fila = PNC[altura];
  if (!fila) throw new Error(`No hay PNC de altura ${altura} mm en el catálogo.`);
  const simple = aSI(fila, false);
  const ys = (fila.ys as number) / 100;

  // Distancia del eje de simetría del conjunto al baricentro de cada perfil.
  const brazo = separacionM / 2 + ys;
  // Fibra extrema en y: la punta del ala, al otro lado del alma.
  const cY = separacionM / 2 + simple.bM;

  const areaM2 = 2 * simple.areaM2;
  const iyM4 = 2 * (simple.iyM4 + simple.areaM2 * brazo ** 2);
  const hoM = simple.hM - simple.tfM;

  return {
    hM: simple.hM,
    bM: 2 * simple.bM + separacionM,
    twM: simple.twM,
    tfM: simple.tfM,
    hiM: simple.hiM,
    hAlmaM: simple.hAlmaM,
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
    // Ya compuesta es doblemente simétrica, con alabeo Iy·ho²/4 como cualquier
    // sección en I: el alabeo propio de cada canal deja de gobernar.
    cwM6: (iyM4 * hoM ** 2) / 4,
    doblementeSimetrica: true,
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
  // El PNC simple es el único de una sola simetría: el canal no lo es respecto de y.
  return aSI(fila, familia !== "PNC");
}

/** Etiqueta comercial: "PNI160", "2PNC180". */
export function designacion(familia: Familia, altura: number) {
  return `${familia}${altura}`;
}
