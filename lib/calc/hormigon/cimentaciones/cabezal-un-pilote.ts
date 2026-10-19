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

export interface DatosCabezalUnPilote {
  /** Carga de cálculo del pilar (kN) */
  ndPilarKN: number;
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
  /** Parcial con b ≤ H/2 (ec. 6.58); total con b > H/2 (ec. 6.59) */
  discontinuidad: "parcial" | "total";
  /**
   * La ec. (6.59) exige a ≤ h = H/2 (fig. A19.6.25b). Fuera de eso no hay T
   * citable: la zona no verifica (criterio del usuario, 2026-10-19).
   */
  fueraDeRango: boolean;
  tKN: number;
  asNecCm2: number;
  /** Dos ramas por cerco en cada dirección (cm²) */
  asRealCm2: number;
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
  let discontinuidad: "parcial" | "total";
  let tKN: number;
  let fueraDeRango = false;

  if (bM <= mitad) {
    // Anejo 19, art. 6.5.3 (3) a), ec. (6.58): T = ¼·(b − a)/b·F.
    discontinuidad = "parcial";
    tKN = Math.max(0, 0.25 * ((bM - aM) / bM) * fKN);
  } else {
    // Anejo 19, art. 6.5.3 (3) b), ec. (6.59): T = ¼·(1 − 0,7·a/h)·F, con h = H/2 y a ≤ h.
    discontinuidad = "total";
    fueraDeRango = aM > mitad;
    tKN = Math.max(0, 0.25 * (1 - (0.7 * aM) / mitad) * fKN);
  }

  // Art. 6.5.3 (1) remite al 3.2: fyd = fyk/γs, sin el tope de 0,8·fyk de los
  // estribos de cortante.
  const asNecCm2 = (tKN * 10) / fyd;

  return {
    fKN,
    aM,
    bM,
    discontinuidad,
    fueraDeRango,
    tKN,
    asNecCm2,
    asRealCm2,
    verifica: !fueraDeRango && asRealCm2 >= asNecCm2,
  };
}

export function calcularCabezalUnPilote(
  materiales: MaterialesDerivados,
  geometria: GeometriaCabezalUnPilote,
  datos: DatosCabezalUnPilote
): ResultadoCabezalUnPilote {
  const { pilarXM, pilarYM, ladoXM, ladoYM, hM, diametroPiloteM } = geometria;
  const { ndPilarKN, cercosSuperiores, cercosInferiores } = datos;
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

  const verifica =
    compresionPilar.verifica &&
    compresionPilote.verifica &&
    superior.x.verifica &&
    superior.y.verifica &&
    inferior.x.verifica &&
    inferior.y.verifica;

  return { pesoPropioKN, ndPiloteKN, compresionPilar, compresionPilote, superior, inferior, verifica };
}
