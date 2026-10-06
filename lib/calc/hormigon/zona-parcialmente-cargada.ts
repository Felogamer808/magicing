import type { MaterialesDerivados } from "@/lib/calc/hormigon/comun/types";

/**
 * Zona parcialmente cargada: una carga concentrada que entra en un bloque de
 * hormigón más grande que el área cargada (apoyo de viga sobre pilar, placa de
 * anclaje, aparato de apoyo).
 *
 * Es una región D: el art. 6.7 (1) pide dos cosas y las dos se resuelven acá.
 *
 * 1. **Aplastamiento local**, ec. (6.63): el hormigón alrededor confina al que
 *    está bajo la carga, y la resistencia sube con √(Ac1/Ac0) hasta 3·fcd·Ac0.
 *    Ac1 es un área "de forma similar" a la cargada y centrada en su línea de
 *    acción, así que se toma homotética: un solo factor k = b2/b1 = d2/d1, el
 *    menor que permiten la figura A19.6.29 (b2 ≤ 3b1, h ≥ b2 − b1) y los bordes.
 * 2. **Tracciones transversales**, art. 6.7 (4) → 6.5.3 ec. (6.58)/(6.59): al
 *    abrirse, las bielas empujan hacia afuera y hace falta armadura que lo tome.
 *    Se calcula en cada dirección con el ancho total de la pieza, que en
 *    discontinuidad parcial es el lado conservador (T crece con b).
 *
 * Referencias:
 * - Anejo 19 (RD 470/2021), art. 6.7, ec. (6.63) y fig. A19.6.29, pág. 101.
 * - Anejo 19, art. 6.5.3 (3), ec. (6.58) y (6.59), fig. A19.6.25, págs. 97-98.
 */

/** Datos de una de las dos direcciones en planta (b o d de la fig. A19.6.29). */
export interface DireccionZonaCargada {
  /** Dimensión del área cargada en esta dirección: b1 o d1 (m). */
  cargadaM: number;
  /** Ancho total de la pieza en esta dirección (m). */
  anchoPiezaM: number;
  /** Distancia del centro de la carga al borde más cercano en esta dirección (m). */
  distanciaBordeM: number;
}

export interface DatosZonaCargada {
  /** Esfuerzo de compresión de cálculo sobre el área cargada (kN). */
  nEdKN: number;
  direccionB: DireccionZonaCargada;
  direccionD: DireccionZonaCargada;
  /** Longitud de la pieza en la dirección de la carga: h de la fig. A19.6.29 y H de la A19.6.25 (m). */
  alturaM: number;
}

/** Qué limita el factor k del área de distribución. */
export type LimiteDistribucion =
  | "3 veces el área cargada"
  | "altura en la dirección b"
  | "altura en la dirección d"
  | "borde en la dirección b"
  | "borde en la dirección d";

export interface TraccionTransversal {
  /** Discontinuidad parcial (b ≤ H/2) o total (b > H/2). */
  tipo: "parcial" | "total";
  /** Ecuación aplicada. */
  ecuacion: "(6.58)" | "(6.59)";
  /** Ancho de la pieza usado como b (m). */
  bM: number;
  /** Ancho cargado a (m). */
  aM: number;
  /** T (kN). */
  tKN: number;
  /** Armadura transversal necesaria As = T/fyd (cm²). */
  asNecCm2: number;
  /** En discontinuidad total la figura A19.6.25 b) supone a ≤ h = H/2. */
  fueraDeRango: boolean;
}

export interface ResultadoZonaCargada {
  ac0M2: number;
  /** Factor homotético k = b2/b1 = d2/d1. */
  k: number;
  limite: LimiteDistribucion;
  b2M: number;
  d2M: number;
  ac1M2: number;
  /** Resistencia a compresión concentrada FRdu (kN). */
  fRduKN: number;
  aprovechamiento: number;
  verificaAplastamiento: boolean;
  traccionB: TraccionTransversal;
  traccionD: TraccionTransversal;
}

function traccionTransversal(
  a: number,
  b: number,
  alturaH: number,
  fuerzaKN: number,
  fydMPa: number
): TraccionTransversal {
  // Anejo 19, art. 6.5.3 (3), fig. A19.6.25: discontinuidad parcial si b ≤ H/2.
  if (b <= alturaH / 2) {
    // ec. (6.58)
    const tKN = 0.25 * ((b - a) / b) * fuerzaKN;
    return { tipo: "parcial", ecuacion: "(6.58)", bM: b, aM: a, tKN, asNecCm2: (tKN / fydMPa) * 10, fueraDeRango: false };
  }
  // ec. (6.59), con h = H/2 (fig. A19.6.25 b).
  const h = alturaH / 2;
  const tKN = 0.25 * (1 - (0.7 * a) / h) * fuerzaKN;
  return {
    tipo: "total",
    ecuacion: "(6.59)",
    bM: b,
    aM: a,
    tKN,
    asNecCm2: (tKN / fydMPa) * 10,
    fueraDeRango: a > h,
  };
}

export function calcularZonaCargada(
  materiales: MaterialesDerivados,
  datos: DatosZonaCargada
): ResultadoZonaCargada {
  const { direccionB: b, direccionD: d, alturaM: h, nEdKN } = datos;
  const b1 = b.cargadaM;
  const d1 = d.cargadaM;
  const ac0M2 = b1 * d1;

  // Fig. A19.6.29: b2 ≤ 3b1, d2 ≤ 3d1, h ≥ b2 − b1 y h ≥ d2 − d1. Ac1 centrada
  // en la línea de acción (art. 6.7 (3)): no puede pasar el borde más cercano.
  // Homotética: un solo k para las dos direcciones.
  const candidatos: [number, LimiteDistribucion][] = [
    [3, "3 veces el área cargada"],
    [(b1 + h) / b1, "altura en la dirección b"],
    [(d1 + h) / d1, "altura en la dirección d"],
    [(2 * b.distanciaBordeM) / b1, "borde en la dirección b"],
    [(2 * d.distanciaBordeM) / d1, "borde en la dirección d"],
  ];
  const [k, limite] = candidatos.reduce((min, c) => (c[0] < min[0] ? c : min));

  const b2M = k * b1;
  const d2M = k * d1;
  const ac1M2 = b2M * d2M;

  // ec. (6.63): FRdu = Ac0·fcd·√(Ac1/Ac0) ≤ 3·fcd·Ac0. Con Ac1 homotética,
  // √(Ac1/Ac0) = k, y k ≤ 3 deja el tope cumplido por construcción.
  const fRduKN = ac0M2 * materiales.fcd * Math.sqrt(ac1M2 / ac0M2) * 1000;

  return {
    ac0M2,
    k,
    limite,
    b2M,
    d2M,
    ac1M2,
    fRduKN,
    aprovechamiento: nEdKN / fRduKN,
    verificaAplastamiento: nEdKN <= fRduKN,
    traccionB: traccionTransversal(b1, b.anchoPiezaM, h, nEdKN, materiales.fyd),
    traccionD: traccionTransversal(d1, d.anchoPiezaM, h, nEdKN, materiales.fyd),
  };
}
