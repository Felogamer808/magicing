/**
 * Los casos del formulario de torsión, como datos — mismo espíritu que
 * `casos-viga.ts`: acá sólo se dice qué carga arma cada caso y con qué
 * condición de apoyo, y `calcularTorsionViga` hace la cuenta.
 *
 * Dos familias, según qué tan restringido está el giro en los extremos:
 *
 * - "voladizo": empotrada torsionalmente en x=0, libre de girar en x=L.
 *   Cualquier posición y cualquier carga vale, porque isostáticamente sale
 *   sola: todo lo aplicado tiene que llegar al único empotramiento.
 * - "apoyada": restringida en los dos extremos, pero sólo para cargas
 *   simétricas respecto del centro. El caso general con dos apoyos es
 *   indeterminado —hace falta la rigidez GJ de la pieza, que acá no se pide—
 *   y la simetría es la única forma de resolverlo sin ese dato.
 */

import type { CargaTorsion, CondicionApoyoTorsion, EntradaTorsion } from "./torsion-viga";

export type FamiliaTorsion = "voladizo" | "apoyada";

export interface FamiliaTorsionDef {
  id: FamiliaTorsion;
  nombre: string;
}

export const FAMILIAS_TORSION: readonly FamiliaTorsionDef[] = [
  { id: "voladizo", nombre: "Voladizo (empotrada-libre)" },
  { id: "apoyada", nombre: "Apoyada en los dos extremos" },
];

export interface ParametroCasoTorsion {
  clave: string;
  etiqueta: string;
  porDefecto: number;
  unidad?: string;
}

export interface CasoTorsion {
  id: string;
  familia: FamiliaTorsion;
  condicion: CondicionApoyoTorsion;
  nombre: string;
  descripcion: string;
  parametros: readonly ParametroCasoTorsion[];
  validar?: (v: Record<string, number>) => string | null;
  armar: (v: Record<string, number>) => EntradaTorsion;
}

const puntual = (xM: number, torsorKNm: number): CargaTorsion => ({ tipo: "puntual", xM, torsorKNm });
const repartida = (desdeM: number, hastaM: number, torsorPorMetroKNmM: number): CargaTorsion => ({
  tipo: "repartida",
  desdeM,
  hastaM,
  torsorPorMetroKNmM,
});

const L = (porDefecto = 4): ParametroCasoTorsion => ({ clave: "L", etiqueta: "Vuelo L", porDefecto });
const X1 = (porDefecto = 4): ParametroCasoTorsion => ({
  clave: "x1",
  etiqueta: "Posición x1",
  porDefecto,
});

const largoValido = (v: Record<string, number>) =>
  v.L <= 0 ? "El tramo tiene que ser mayor que cero." : null;

const posicionValida = (v: Record<string, number>) => {
  if (v.L <= 0) return "El vuelo tiene que ser mayor que cero.";
  if (v.x1 < 0 || v.x1 > v.L) return "x1 tiene que estar entre 0 y L.";
  return null;
};

const tramoValido = (v: Record<string, number>) => {
  if (v.L <= 0) return "El vuelo tiene que ser mayor que cero.";
  if (v.x1 < 0 || v.x2 > v.L || v.x2 <= v.x1) {
    return "El tramo [x1, x2] tiene que caer dentro de L, con x2 > x1.";
  }
  return null;
};

export const CASOS_TORSION: readonly CasoTorsion[] = [
  // ------------------------------------------------------------ voladizo
  {
    id: "par-puntual",
    familia: "voladizo",
    condicion: "empotrada-libre",
    nombre: "Par torsor puntual",
    descripcion: "Un par aplicado directamente en un punto del vuelo, empotrado en x=0.",
    parametros: [L(), X1(), { clave: "T0", etiqueta: "Par T0", porDefecto: 10, unidad: "kN·m" }],
    validar: posicionValida,
    armar: (v) => ({ largoM: v.L, cargas: [puntual(v.x1, v.T0)] }),
  },
  {
    id: "carga-puntual",
    familia: "voladizo",
    condicion: "empotrada-libre",
    nombre: "Carga excéntrica puntual",
    descripcion: "Una carga transversal aplicada fuera del eje de la pieza: T0 = P·e.",
    parametros: [
      L(),
      X1(),
      { clave: "P", etiqueta: "Carga P", porDefecto: 20, unidad: "kN" },
      { clave: "e", etiqueta: "Excentricidad e", porDefecto: 0.3, unidad: "m" },
    ],
    validar: posicionValida,
    armar: (v) => ({ largoM: v.L, cargas: [puntual(v.x1, v.P * v.e)] }),
  },
  {
    id: "carga-repartida",
    familia: "voladizo",
    condicion: "empotrada-libre",
    nombre: "Carga excéntrica repartida",
    descripcion: "Una carga repartida excéntrica en un tramo [x1, x2]: mt = q·e por metro.",
    parametros: [
      L(),
      { clave: "x1", etiqueta: "Desde x1", porDefecto: 0 },
      { clave: "x2", etiqueta: "Hasta x2", porDefecto: 4 },
      { clave: "q", etiqueta: "Carga repartida q", porDefecto: 10, unidad: "kN/m" },
      { clave: "e", etiqueta: "Excentricidad e", porDefecto: 0.3, unidad: "m" },
    ],
    validar: tramoValido,
    armar: (v) => ({ largoM: v.L, cargas: [repartida(v.x1, v.x2, v.q * v.e)] }),
  },
  // ------------------------------------------------------------- apoyada
  {
    id: "par-centro-apoyada",
    familia: "apoyada",
    condicion: "apoyada-simetrica",
    nombre: "Par torsor en el centro",
    descripcion:
      "Un par aplicado en el centro del tramo, con los dos extremos restringidos al giro. Por simetría cada apoyo toma la mitad, sin necesitar la rigidez de la pieza.",
    parametros: [L(6), { clave: "T0", etiqueta: "Par T0", porDefecto: 10, unidad: "kN·m" }],
    validar: largoValido,
    armar: (v) => ({ largoM: v.L, cargas: [puntual(v.L / 2, v.T0)] }),
  },
  {
    id: "carga-repartida-apoyada",
    familia: "apoyada",
    condicion: "apoyada-simetrica",
    nombre: "Carga excéntrica repartida en todo el tramo",
    descripcion:
      "Carga excéntrica en toda la luz, con los dos extremos restringidos al giro: mt = q·e por metro, repartido simétrico respecto del centro.",
    parametros: [
      L(6),
      { clave: "q", etiqueta: "Carga repartida q", porDefecto: 10, unidad: "kN/m" },
      { clave: "e", etiqueta: "Excentricidad e", porDefecto: 0.3, unidad: "m" },
    ],
    validar: largoValido,
    armar: (v) => ({ largoM: v.L, cargas: [repartida(0, v.L, v.q * v.e)] }),
  },
];
