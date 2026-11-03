import { GAMMA_G } from "@/lib/calc/hormigon/comun/coeficientes";
import type { MaterialesDerivados } from "@/lib/calc/hormigon/comun/types";

/**
 * Cabezal sobre un pilote.
 *
 * El Anejo 19 deja los encepados fuera de su ámbito (art. 9.8.1, pág. 152:
 * "las cimentaciones profundas quedan fuera del ámbito de este Código
 * Estructural"), así que no hay artículo del elemento ni cuantías mínimas
 * propias. Se resuelve, como el de dos pilotes, con el articulado general:
 *
 * - Compresión localizada en las dos caras: el pilar sobre el cabezal y el
 *   cabezal sobre la cabeza del pilote (art. 6.7, ec. 6.63, pág. 101).
 * - Tracción transversal por el ensanche del campo de compresiones (art. 6.5.3,
 *   ec. 6.58 y 6.59, fig. A19.6.25, pág. 97), que toman los cercos
 *   horizontales.
 *
 * La fig. A19.6.25 supone el mismo ancho cargado en los dos extremos; acá
 * arriba carga el pilar y abajo el pilote. Criterio del usuario (2026-10-19):
 * cada mitad del canto se resuelve por separado, con z = h/2, la superior con
 * el pilar y la inferior con el pilote, y los cercos de cada mitad cubren su T.
 * Si a > H/2 la (6.59) queda fuera de su rango (a ≤ h): se toma con a topado
 * en h, y como el campo ya casi no se abre cuando a se acerca a b, T no pasa
 * de la (6.58) con b = lado del cabezal (criterio del usuario, 2026-11-03).
 *
 * Estribos verticales (criterio del usuario, 2026-11-02): en cada dirección,
 * un modelo de bielas y tirantes plano. La carga del pilar entra en dos
 * mitades a a/4 de su eje y sale por el pilote en dos mitades a b/4 (b =
 * 0,886·D, el cuadrado de igual área). Si el pilar es más ancho, las bielas se
 * cierran hacia abajo y el tirante queda arriba, con Nd; si es más angosto, se
 * abren y el tirante queda abajo, con la reacción del pilote. T = (F/2)·|a − b|/4
 * / z, con z = H − 2·d' y d' = recubrimiento + Ø/2. Lo toma la rama horizontal
 * de los estribos verticales que caen dentro del ancho de la biela. Como
 * mínimo, la malla de vigas de gran canto del art. 9.7 por analogía (pág. 152).
 *
 * Supone el pilar centrado sobre el pilote y el cabezal: la excentricidad
 * accidental la toman las vigas de atado, que se verifican aparte.
 */

export interface GeometriaCabezalUnPilote {
  /** Lado del pilar en x (m) */
  pilarXM: number;
  /** Lado del pilar en y (m) */
  pilarYM: number;
  /** Lado del cabezal en x (m) */
  ladoXM: number;
  /** Lado del cabezal en y (m) */
  ladoYM: number;
  /** Canto del cabezal (m) */
  hM: number;
  /** Diámetro del pilote (m) */
  diametroPiloteM: number;
}

export interface CercosHorizontales {
  /** Cercos cerrados en esa mitad del canto */
  numero: number;
  diametroMm: number;
}

/** Estribos verticales cerrados de una dirección: en planos paralelos a ella. */
export interface EstribosVerticales {
  diametroMm: number;
  /** Separación entre estribos, medida en la dirección perpendicular (m) */
  separacionM: number;
}

export interface DatosCabezalUnPilote {
  /** Carga de cálculo del pilar (kN) */
  ndPilarKN: number;
  /** Recubrimiento de los estribos verticales (m) */
  recubrimientoM: number;
  /** Estribos en planos xz (su rama horizontal va en x) */
  estribosX: EstribosVerticales;
  /** Estribos en planos yz (su rama horizontal va en y) */
  estribosY: EstribosVerticales;
  /** Cercos en la mitad superior del canto */
  cercosSuperiores: CercosHorizontales;
  /** Cercos en la mitad inferior del canto */
  cercosInferiores: CercosHorizontales;
}

/** Compresión localizada sobre una cara — art. 6.7, ec. (6.63). */
export interface ResultadoCompresionLocalizada {
  /** Área cargada A_c0 (m²) */
  areaCargadaM2: number;
  /** √(A_c1/A_c0): cuánto se agranda el lado de A_c0 hasta A_c1, ≤ 3 */
  factorK: number;
  /** Área de distribución A_c1 (m²) */
  areaDistribucionM2: number;
  /** Lo que limita A_c1: el triple, el canto o el lado del cabezal */
  limitaPor: "triple" | "canto" | "cabezal";
  fEdKN: number;
  fRduKN: number;
  verifica: boolean;
}

/** Tracción transversal en una mitad del canto y una dirección — art. 6.5.3. */
export interface ResultadoTraccionTransversal {
  /** Fuerza que atraviesa esa mitad (kN) */
  fKN: number;
  /** Ancho cargado a (m) */
  aM: number;
  /** Ancho del cabezal b (m) */
  bM: number;
  /** Parcial con b ≤ H/2; total con b > H/2 (fig. A19.6.25) */
  discontinuidad: "parcial" | "total";
  /**
   * La ecuación con que salió T. Con discontinuidad total y a > H/2 la (6.59)
   * se toma con a topado en h (fig. A19.6.25b, a ≤ h), y si la (6.58) con
   * b = lado del cabezal da menos, manda ésa (criterio del usuario, 2026-11-03).
   */
  ecuacion: "6.58" | "6.59";
  /** a > H/2: la (6.59) se toma con a = h */
  aSuperaMitad: boolean;
  tKN: number;
  asNecCm2: number;
  /** Dos ramas por cerco en cada dirección (cm²) */
  asRealCm2: number;
  verifica: boolean;
}

/** Tirante del modelo de bielas y tirantes en una dirección, y sus estribos. */
export interface ResultadoEstribosVerticales {
  /** Ancho del pilar a y del pilote b en esta dirección (m) */
  anchoPilarM: number;
  anchoPiloteM: number;
  /** Dónde queda el tirante; "ninguno" con a = b */
  tirante: "arriba" | "abajo" | "ninguno";
  /** Fuerza que baja por el modelo: Nd arriba, reacción del pilote abajo (kN) */
  fKN: number;
  /** Desvío horizontal de cada biela inclinada, |a − b|/4 (m) */
  desvioM: number;
  dPrimaM: number;
  zM: number;
  tKN: number;
  asNecCm2: number;
  /** Ancho de la biela en la dirección perpendicular, donde cuentan los estribos (m) */
  anchoBielaM: number;
  /** Estribos dentro del ancho de la biela, y en todo el cabezal con la misma separación */
  estribosEnBiela: number;
  estribosTotales: number;
  /** Una rama horizontal por estribo dentro de la biela (cm²) */
  asRealCm2: number;
  verificaTirante: boolean;
  /** Mínimo del art. 9.7 (1) por analogía: máx(0,001·espesor/2; 1,5 cm²/m) por cara (cm²/m) */
  asMinCm2PorM: number;
  asCm2PorM: number;
  separacionM: number;
  /** Separación máxima, art. 9.7 (2): mín(300 mm; 2·espesor) (m) */
  separacionMaxM: number;
  verificaMinimo: boolean;
  verifica: boolean;
}

export interface ResultadoZonaCabezalUnPilote {
  x: ResultadoTraccionTransversal;
  y: ResultadoTraccionTransversal;
}

export interface ResultadoCabezalUnPilote {
  /** Peso propio del cabezal, a 25 kN/m³ (kN) */
  pesoPropioKN: number;
  /** Carga de cálculo que baja al pilote: Nd + γG·peso propio (kN) */
  ndPiloteKN: number;
  /** Pilar sobre la cara superior */
  compresionPilar: ResultadoCompresionLocalizada;
  /** Pilote contra la cara inferior */
  compresionPilote: ResultadoCompresionLocalizada;
  /** Mitad superior, con el pilar */
  superior: ResultadoZonaCabezalUnPilote;
  /** Mitad inferior, con el pilote */
  inferior: ResultadoZonaCabezalUnPilote;
  /** Estribos verticales en cada dirección */
  estribosX: ResultadoEstribosVerticales;
  estribosY: ResultadoEstribosVerticales;
  verifica: boolean;
}

const PESO_HORMIGON_KN_M3 = 25;

const areaCm2 = (n: number, diametroMm: number) => (n * Math.PI * (diametroMm / 10) ** 2) / 4;

/**
 * A_c1 semejante a A_c0 (art. 6.7 (2)), con los topes de la fig. A19.6.29:
 * cada lado ≤ 3 veces el cargado, y el canto ≥ lo que crece cada lado
 * (h ≥ b2 − b1). Además tiene que caber en el cabezal. Como es semejante,
 * basta un único factor de escala k para los dos lados.
 */
function compresionLocalizada(
  ladosCargadosM: number[],
  ladosCabezalM: number[],
  areaCargadaM2: number,
  hM: number,
  fEdKN: number,
  fcd: number
): ResultadoCompresionLocalizada {
  const kCanto = Math.min(...ladosCargadosM.map((l) => (l + hM) / l));
  const kCabezal = Math.min(...ladosCargadosM.map((l, i) => ladosCabezalM[i] / l));
  const factorK = Math.max(1, Math.min(3, kCanto, kCabezal));
  const limitaPor = factorK === 3 ? "triple" : factorK === kCanto ? "canto" : "cabezal";

  // Anejo 19, art. 6.7 (2), ec. (6.63): F_Rdu = A_c0·fcd·√(A_c1/A_c0) ≤ 3·fcd·A_c0.
  // El tope de 3 ya lo da k ≤ 3.
  const fRduKN = areaCargadaM2 * fcd * factorK * 1000;

  return {
    areaCargadaM2,
    factorK,
    areaDistribucionM2: areaCargadaM2 * factorK ** 2,
    limitaPor,
    fEdKN,
    fRduKN,
    verifica: fEdKN <= fRduKN,
  };
}

function traccionTransversal(
  fKN: number,
  aM: number,
  bM: number,
  cantoM: number,
  asRealCm2: number,
  fyd: number
): ResultadoTraccionTransversal {
  const mitad = cantoM / 2;
  const discontinuidad: "parcial" | "total" = bM <= mitad ? "parcial" : "total";
  const aSuperaMitad = aM > mitad;
  // Anejo 19, art. 6.5.3 (3) a), ec. (6.58): T = ¼·(b − a)/b·F.
  const t658 = Math.max(0, 0.25 * ((bM - aM) / bM) * fKN);
  // Anejo 19, art. 6.5.3 (3) b), ec. (6.59): T = ¼·(1 − 0,7·a/h)·F, con h = H/2
  // y a ≤ h (fig. A19.6.25b). Fuera de rango no se extrapola, que daría cada vez
  // menos T: a se topa en h. Y como con a cerca de b el campo casi no se abre,
  // T no pasa de la (6.58) (criterio del usuario, 2026-11-03).
  const t659 = 0.25 * (1 - (0.7 * Math.min(aM, mitad)) / mitad) * fKN;
  const ecuacion: "6.58" | "6.59" =
    discontinuidad === "parcial" || (aSuperaMitad && t658 < t659) ? "6.58" : "6.59";
  const tKN = ecuacion === "6.58" ? t658 : t659;

  // Art. 6.5.3 (1) remite al 3.2: fyd = fyk/γs, sin el tope de 0,8·fyk de los
  // estribos de cortante.
  const asNecCm2 = (tKN * 10) / fyd;

  return {
    fKN,
    aM,
    bM,
    discontinuidad,
    ecuacion,
    aSuperaMitad,
    tKN,
    asNecCm2,
    asRealCm2,
    verifica: asRealCm2 >= asNecCm2,
  };
}

/**
 * Una dirección del modelo de bielas y tirantes. `ladoM` es el lado del cabezal
 * en esta dirección (el espesor de la viga de gran canto que forman las ramas
 * verticales sobre esas caras) y `ladoPerpM` el perpendicular, donde se
 * reparten los estribos.
 */
function estribosVerticales(
  anchoPilarM: number,
  anchoPilarPerpM: number,
  anchoPiloteM: number,
  ladoM: number,
  ladoPerpM: number,
  hM: number,
  ndPilarKN: number,
  ndPiloteKN: number,
  recubrimientoM: number,
  estribos: EstribosVerticales,
  fyd: number
): ResultadoEstribosVerticales {
  const { diametroMm, separacionM } = estribos;
  const diferencia = anchoPilarM - anchoPiloteM;
  const tirante = Math.abs(diferencia) < 1e-9 ? "ninguno" : diferencia > 0 ? "arriba" : "abajo";
  const fKN = tirante === "abajo" ? ndPiloteKN : ndPilarKN;
  const desvioM = Math.abs(diferencia) / 4;
  const dPrimaM = recubrimientoM + diametroMm / 2000;
  const zM = hM - 2 * dPrimaM;
  // Cada mitad de la carga baja por una biela que se desvía |a − b|/4 en z.
  const tKN = tirante === "ninguno" ? 0 : (fKN / 2) * (desvioM / zM);
  const asNecCm2 = (tKN * 10) / fyd;

  // La biela entra con el ancho del pilar (tirante arriba) o del pilote (abajo).
  const anchoBielaM = tirante === "abajo" ? anchoPiloteM : anchoPilarPerpM;
  const disponibleM = Math.max(ladoPerpM - 2 * dPrimaM, 0);
  const estribosTotales = Math.floor(disponibleM / separacionM + 1e-9) + 1;
  const estribosEnBiela = Math.min(Math.floor(anchoBielaM / separacionM + 1e-9) + 1, estribosTotales);
  const asRealCm2 = areaCm2(estribosEnBiela, diametroMm);

  // Art. 9.7 (1) y (2), por analogía: las ramas verticales son la malla de las
  // caras de una viga de gran canto de espesor igual al lado del cabezal. El
  // 0,001·Ac se toma como el total de la sección, mitad en cada cara (criterio
  // del usuario, 2026-11-02); los 150 mm²/m sí son por cara, como dice el texto.
  const asMinCm2PorM = Math.max((0.001 * ladoM * 1e4) / 2, 1.5);
  const asCm2PorM = areaCm2(1, diametroMm) / separacionM;
  const separacionMaxM = Math.min(0.3, 2 * ladoM);
  const verificaMinimo = asCm2PorM >= asMinCm2PorM && separacionM <= separacionMaxM + 1e-9;
  const verificaTirante = asRealCm2 >= asNecCm2;

  return {
    anchoPilarM,
    anchoPiloteM,
    tirante,
    fKN,
    desvioM,
    dPrimaM,
    zM,
    tKN,
    asNecCm2,
    anchoBielaM,
    estribosEnBiela,
    estribosTotales,
    asRealCm2,
    verificaTirante,
    asMinCm2PorM,
    asCm2PorM,
    separacionM,
    separacionMaxM,
    verificaMinimo,
    verifica: verificaTirante && verificaMinimo,
  };
}

export function calcularCabezalUnPilote(
  materiales: MaterialesDerivados,
  geometria: GeometriaCabezalUnPilote,
  datos: DatosCabezalUnPilote
): ResultadoCabezalUnPilote {
  const { pilarXM, pilarYM, ladoXM, ladoYM, hM, diametroPiloteM } = geometria;
  const { ndPilarKN, cercosSuperiores, cercosInferiores, recubrimientoM } = datos;
  const { fcd, fyd } = materiales;

  const pesoPropioKN = ladoXM * ladoYM * hM * PESO_HORMIGON_KN_M3;
  const ndPiloteKN = ndPilarKN + GAMMA_G * pesoPropioKN;

  const compresionPilar = compresionLocalizada(
    [pilarXM, pilarYM],
    [ladoXM, ladoYM],
    pilarXM * pilarYM,
    hM,
    ndPilarKN,
    fcd
  );

  const ladoMenorCabezal = Math.min(ladoXM, ladoYM);
  const compresionPilote = compresionLocalizada(
    [diametroPiloteM],
    [ladoMenorCabezal],
    (Math.PI * diametroPiloteM ** 2) / 4,
    hM,
    ndPiloteKN,
    fcd
  );

  // Ancho del pilote en la ec. (6.58/6.59): el cuadrado de igual área,
  // √(π/4)·D ≈ 0,886·D. Criterio del usuario (2026-10-19): da una T algo mayor.
  const anchoPiloteM = Math.sqrt(Math.PI / 4) * diametroPiloteM;

  // Un cerco cerrado pone dos ramas en cada dirección.
  const asSupCm2 = 2 * areaCm2(cercosSuperiores.numero, cercosSuperiores.diametroMm);
  const asInfCm2 = 2 * areaCm2(cercosInferiores.numero, cercosInferiores.diametroMm);

  const superior = {
    x: traccionTransversal(ndPilarKN, pilarXM, ladoXM, hM, asSupCm2, fyd),
    y: traccionTransversal(ndPilarKN, pilarYM, ladoYM, hM, asSupCm2, fyd),
  };
  const inferior = {
    x: traccionTransversal(ndPiloteKN, anchoPiloteM, ladoXM, hM, asInfCm2, fyd),
    y: traccionTransversal(ndPiloteKN, anchoPiloteM, ladoYM, hM, asInfCm2, fyd),
  };

  const estribosX = estribosVerticales(
    pilarXM, pilarYM, anchoPiloteM, ladoXM, ladoYM, hM, ndPilarKN, ndPiloteKN, recubrimientoM, datos.estribosX, fyd
  );
  const estribosY = estribosVerticales(
    pilarYM, pilarXM, anchoPiloteM, ladoYM, ladoXM, hM, ndPilarKN, ndPiloteKN, recubrimientoM, datos.estribosY, fyd
  );

  const verifica =
    estribosX.verifica &&
    estribosY.verifica &&
    compresionPilar.verifica &&
    compresionPilote.verifica &&
    superior.x.verifica &&
    superior.y.verifica &&
    inferior.x.verifica &&
    inferior.y.verifica;

  return { pesoPropioKN, ndPiloteKN, compresionPilar, compresionPilote, superior, inferior, estribosX, estribosY, verifica };
}
