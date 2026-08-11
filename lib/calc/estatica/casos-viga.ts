/**
 * Los casos del formulario de vigas, como datos.
 *
 * Cada entrada de acá dice qué apoyos y qué cargas tiene el caso, y nada más:
 * las reacciones, el cortante, el momento y la flecha las saca
 * `calcularVigaContinua`. Por eso agregar un caso nuevo es agregar unas líneas
 * de datos y no cinco fórmulas más para revisar.
 *
 * `normalizacion` es lo que permite contrastar contra cualquier manual sin
 * volver a hacer la cuenta: con ella la pantalla muestra M_max como coeficiente
 * de q·L², y ese número se compara de un vistazo contra el 1/8 o el 9/128 que
 * traiga la tabla que uno tenga a mano.
 */

import type {
  CargaDistribuida,
  CargaPuntual,
  CargaViga,
  EntradaViga,
  NodoViga,
  TipoApoyo,
} from "./viga-continua";

export type FamiliaCaso = "un-tramo" | "voladizo" | "hiperestatica" | "continua";

export interface FamiliaCasoDef {
  id: FamiliaCaso;
  nombre: string;
}

export const FAMILIAS_CASO: readonly FamiliaCasoDef[] = [
  { id: "un-tramo", nombre: "Un tramo apoyado" },
  { id: "voladizo", nombre: "Voladizos y volados" },
  { id: "hiperestatica", nombre: "Con empotramientos" },
  { id: "continua", nombre: "Vigas continuas" },
];

export interface ParametroCaso {
  clave: string;
  etiqueta: string;
  porDefecto: number;
  /** Si falta se asume metros. */
  unidad?: string;
  ayuda?: string;
}

/**
 * Con qué magnitud se adimensionaliza cada resultado. Con carga repartida los
 * momentos van con q·L² y las flechas con q·L⁴/EI; con carga puntual, con P·L y
 * P·L³/EI. Es la forma en que están escritas todas las tablas.
 */
export interface NormalizacionCaso {
  patron: "uniforme" | "puntual";
  claveCarga: string;
  claveLuz: string;
}

export interface CasoViga {
  id: string;
  familia: FamiliaCaso;
  nombre: string;
  descripcion: string;
  parametros: readonly ParametroCaso[];
  normalizacion?: NormalizacionCaso;
  validar?: (v: Record<string, number>) => string | null;
  armar: (v: Record<string, number>) => Pick<EntradaViga, "largoM" | "nodos" | "cargas">;
}

// -------------------------------------------------------------- atajos
const nodo = (xM: number, apoyo: TipoApoyo): NodoViga => ({ xM, apoyo });

const uniforme = (desdeM: number, hastaM: number, q: number): CargaDistribuida => ({
  tipo: "distribuida",
  desdeM,
  hastaM,
  qInicialKNm: q,
  qFinalKNm: q,
});

const triangular = (desdeM: number, hastaM: number, qI: number, qF: number): CargaDistribuida => ({
  tipo: "distribuida",
  desdeM,
  hastaM,
  qInicialKNm: qI,
  qFinalKNm: qF,
});

const puntual = (xM: number, pKN: number): CargaPuntual => ({ tipo: "puntual", xM, pKN });

const L = (porDefecto = 6): ParametroCaso => ({ clave: "L", etiqueta: "Luz L", porDefecto });
const Q = (porDefecto = 15): ParametroCaso => ({
  clave: "q",
  etiqueta: "Carga repartida q",
  porDefecto,
  unidad: "kN/m",
});
const P = (porDefecto = 40): ParametroCaso => ({
  clave: "P",
  etiqueta: "Carga puntual P",
  porDefecto,
  unidad: "kN",
});

/** El caso más repetido: la carga tiene que caer dentro de la luz. */
const dentroDeLaLuz =
  (claveA: string, claveL: string) => (v: Record<string, number>) =>
    v[claveA] <= 0 || v[claveA] >= v[claveL]
      ? "La carga tiene que estar dentro de la luz, sin apoyarse en un apoyo."
      : null;

const positivos =
  (...claves: string[]) =>
  (v: Record<string, number>) =>
    claves.some((c) => v[c] <= 0) ? "Las luces tienen que ser mayores que cero." : null;

// -------------------------------------------------------------- catálogo
export const CASOS_VIGA: readonly CasoViga[] = [
  // ------------------------------------------------------------ un tramo
  {
    id: "simple-uniforme",
    familia: "un-tramo",
    nombre: "Apoyada, carga uniforme",
    descripcion:
      "El caso de referencia de toda la tabla: dos apoyos simples y carga repartida en toda la luz.",
    parametros: [L(), Q()],
    normalizacion: { patron: "uniforme", claveCarga: "q", claveLuz: "L" },
    validar: positivos("L"),
    armar: (v) => ({
      largoM: v.L,
      nodos: [nodo(0, "simple"), nodo(v.L, "simple")],
      cargas: [uniforme(0, v.L, v.q)],
    }),
  },
  {
    id: "simple-puntual-centro",
    familia: "un-tramo",
    nombre: "Apoyada, puntual centrada",
    descripcion: "Dos apoyos simples y una carga concentrada en el centro de la luz.",
    parametros: [L(), P()],
    normalizacion: { patron: "puntual", claveCarga: "P", claveLuz: "L" },
    validar: positivos("L"),
    armar: (v) => ({
      largoM: v.L,
      nodos: [nodo(0, "simple"), nodo(v.L, "simple")],
      cargas: [puntual(v.L / 2, v.P)],
    }),
  },
  {
    id: "simple-puntual",
    familia: "un-tramo",
    nombre: "Apoyada, puntual descentrada",
    descripcion:
      "La carga a una distancia a del apoyo izquierdo. La flecha máxima no cae bajo la carga: se corre hacia el centro.",
    parametros: [L(), { clave: "a", etiqueta: "Distancia a al apoyo izquierdo", porDefecto: 2 }, P()],
    normalizacion: { patron: "puntual", claveCarga: "P", claveLuz: "L" },
    validar: dentroDeLaLuz("a", "L"),
    armar: (v) => ({
      largoM: v.L,
      nodos: [nodo(0, "simple"), nodo(v.L, "simple")],
      cargas: [puntual(v.a, v.P)],
    }),
  },
  {
    id: "simple-dos-puntuales",
    familia: "un-tramo",
    nombre: "Apoyada, dos puntuales simétricas",
    descripcion:
      "Dos cargas iguales a distancia a de cada apoyo. Entre ellas el cortante se anula y el momento es constante: es el ensayo de flexión de cuatro puntos.",
    parametros: [L(), { clave: "a", etiqueta: "Distancia a a cada apoyo", porDefecto: 2 }, P()],
    normalizacion: { patron: "puntual", claveCarga: "P", claveLuz: "L" },
    validar: (v) =>
      v.a <= 0 || 2 * v.a >= v.L ? "Las dos cargas se cruzan: hace falta 2·a < L." : null,
    armar: (v) => ({
      largoM: v.L,
      nodos: [nodo(0, "simple"), nodo(v.L, "simple")],
      cargas: [puntual(v.a, v.P), puntual(v.L - v.a, v.P)],
    }),
  },
  {
    id: "simple-triangular",
    familia: "un-tramo",
    nombre: "Apoyada, carga triangular",
    descripcion:
      "Repartida creciente de 0 en el apoyo izquierdo a q en el derecho. Es el empuje de tierras o de agua tumbado.",
    parametros: [L(), { clave: "q", etiqueta: "Carga máxima q", porDefecto: 15, unidad: "kN/m" }],
    normalizacion: { patron: "uniforme", claveCarga: "q", claveLuz: "L" },
    validar: positivos("L"),
    armar: (v) => ({
      largoM: v.L,
      nodos: [nodo(0, "simple"), nodo(v.L, "simple")],
      cargas: [triangular(0, v.L, 0, v.q)],
    }),
  },
  {
    id: "simple-parcial",
    familia: "un-tramo",
    nombre: "Apoyada, uniforme parcial",
    descripcion: "Repartida sólo en el tramo entre a y b. El resto de la luz queda descargado.",
    parametros: [
      L(),
      { clave: "a", etiqueta: "Comienzo a", porDefecto: 1.5 },
      { clave: "b", etiqueta: "Fin b", porDefecto: 4.5 },
      Q(),
    ],
    validar: (v) =>
      v.a < 0 || v.b > v.L || v.b <= v.a ? "Hace falta 0 ≤ a < b ≤ L." : null,
    armar: (v) => ({
      largoM: v.L,
      nodos: [nodo(0, "simple"), nodo(v.L, "simple")],
      cargas: [uniforme(v.a, v.b, v.q)],
    }),
  },
  {
    id: "simple-momento",
    familia: "un-tramo",
    nombre: "Apoyada, momento aplicado",
    descripcion:
      "Un momento concentrado en x = a, positivo antihorario. El diagrama de flectores salta M entero en ese punto.",
    parametros: [
      L(),
      { clave: "a", etiqueta: "Posición a", porDefecto: 3 },
      { clave: "M", etiqueta: "Momento aplicado M", porDefecto: 50, unidad: "kN·m" },
    ],
    validar: dentroDeLaLuz("a", "L"),
    armar: (v) => ({
      largoM: v.L,
      nodos: [nodo(0, "simple"), nodo(v.L, "simple")],
      cargas: [{ tipo: "momento", xM: v.a, mKNm: v.M }],
    }),
  },

  // ------------------------------------------------------------ voladizos
  {
    id: "voladizo-uniforme",
    familia: "voladizo",
    nombre: "Voladizo, carga uniforme",
    descripcion: "Empotrado a la izquierda y libre a la derecha, con repartida en todo el vuelo.",
    parametros: [{ clave: "L", etiqueta: "Vuelo L", porDefecto: 2.5 }, Q()],
    normalizacion: { patron: "uniforme", claveCarga: "q", claveLuz: "L" },
    validar: positivos("L"),
    armar: (v) => ({
      largoM: v.L,
      nodos: [nodo(0, "empotrado"), nodo(v.L, "libre")],
      cargas: [uniforme(0, v.L, v.q)],
    }),
  },
  {
    id: "voladizo-puntual-punta",
    familia: "voladizo",
    nombre: "Voladizo, puntual en la punta",
    descripcion: "El caso más desfavorable por unidad de carga: todo el brazo trabaja.",
    parametros: [{ clave: "L", etiqueta: "Vuelo L", porDefecto: 2.5 }, P(25)],
    normalizacion: { patron: "puntual", claveCarga: "P", claveLuz: "L" },
    validar: positivos("L"),
    armar: (v) => ({
      largoM: v.L,
      nodos: [nodo(0, "empotrado"), nodo(v.L, "libre")],
      cargas: [puntual(v.L, v.P)],
    }),
  },
  {
    id: "voladizo-triangular",
    familia: "voladizo",
    nombre: "Voladizo, carga triangular",
    descripcion:
      "Máxima en el empotramiento y nula en la punta. Es la marquesina que apoya sobre el muro.",
    parametros: [
      { clave: "L", etiqueta: "Vuelo L", porDefecto: 2.5 },
      { clave: "q", etiqueta: "Carga máxima q en el empotramiento", porDefecto: 15, unidad: "kN/m" },
    ],
    normalizacion: { patron: "uniforme", claveCarga: "q", claveLuz: "L" },
    validar: positivos("L"),
    armar: (v) => ({
      largoM: v.L,
      nodos: [nodo(0, "empotrado"), nodo(v.L, "libre")],
      cargas: [triangular(0, v.L, v.q, 0)],
    }),
  },
  {
    id: "apoyada-con-volado",
    familia: "voladizo",
    nombre: "Apoyada con volado en un extremo",
    descripcion:
      "El volado levanta el diagrama del vano: el momento del apoyo interior descarga el centro de la luz. Es el que explica por qué conviene prolongar la losa.",
    parametros: [
      L(),
      { clave: "c", etiqueta: "Volado c", porDefecto: 1.8 },
      Q(),
    ],
    validar: (v) => (v.c <= 0 || v.L <= 0 ? "La luz y el volado tienen que ser positivos." : null),
    armar: (v) => ({
      largoM: v.L + v.c,
      nodos: [nodo(0, "simple"), nodo(v.L, "simple"), nodo(v.L + v.c, "libre")],
      cargas: [uniforme(0, v.L + v.c, v.q)],
    }),
  },
  {
    id: "apoyada-dos-volados",
    familia: "voladizo",
    nombre: "Apoyada con volados en los dos extremos",
    descripcion:
      "Con volados de L/(2√2) ≈ 0,354·L medidos contra la luz entre apoyos, el momento de apoyo iguala al de vano: es el óptimo de armadura. Contra la longitud total ese mismo óptimo es el 0,207 que suele citar la tabla.",
    parametros: [
      { clave: "c1", etiqueta: "Volado izquierdo c₁", porDefecto: 1.2 },
      L(),
      { clave: "c2", etiqueta: "Volado derecho c₂", porDefecto: 1.2 },
      Q(),
    ],
    validar: (v) =>
      v.c1 <= 0 || v.c2 <= 0 || v.L <= 0 ? "Los tres tramos tienen que ser positivos." : null,
    armar: (v) => ({
      largoM: v.c1 + v.L + v.c2,
      nodos: [
        nodo(0, "libre"),
        nodo(v.c1, "simple"),
        nodo(v.c1 + v.L, "simple"),
        nodo(v.c1 + v.L + v.c2, "libre"),
      ],
      cargas: [uniforme(0, v.c1 + v.L + v.c2, v.q)],
    }),
  },

  // ------------------------------------------------------ con empotramientos
  {
    id: "empotrada-apoyada-uniforme",
    familia: "hiperestatica",
    nombre: "Empotrada-apoyada, carga uniforme",
    descripcion:
      "Empotrada a la izquierda y con apoyo simple a la derecha. Un grado hiperestático: el momento de empotramiento depende de la rigidez, no sólo del equilibrio.",
    parametros: [L(), Q()],
    normalizacion: { patron: "uniforme", claveCarga: "q", claveLuz: "L" },
    validar: positivos("L"),
    armar: (v) => ({
      largoM: v.L,
      nodos: [nodo(0, "empotrado"), nodo(v.L, "simple")],
      cargas: [uniforme(0, v.L, v.q)],
    }),
  },
  {
    id: "empotrada-apoyada-puntual",
    familia: "hiperestatica",
    nombre: "Empotrada-apoyada, puntual",
    descripcion: "Carga concentrada a distancia a del empotramiento.",
    parametros: [L(), { clave: "a", etiqueta: "Distancia a al empotramiento", porDefecto: 3 }, P()],
    normalizacion: { patron: "puntual", claveCarga: "P", claveLuz: "L" },
    validar: dentroDeLaLuz("a", "L"),
    armar: (v) => ({
      largoM: v.L,
      nodos: [nodo(0, "empotrado"), nodo(v.L, "simple")],
      cargas: [puntual(v.a, v.P)],
    }),
  },
  {
    id: "biempotrada-uniforme",
    familia: "hiperestatica",
    nombre: "Biempotrada, carga uniforme",
    descripcion:
      "Los dos extremos empotrados. El momento de apoyo duplica al de vano, y la flecha cae a la quinta parte de la simplemente apoyada.",
    parametros: [L(), Q()],
    normalizacion: { patron: "uniforme", claveCarga: "q", claveLuz: "L" },
    validar: positivos("L"),
    armar: (v) => ({
      largoM: v.L,
      nodos: [nodo(0, "empotrado"), nodo(v.L, "empotrado")],
      cargas: [uniforme(0, v.L, v.q)],
    }),
  },
  {
    id: "biempotrada-puntual",
    familia: "hiperestatica",
    nombre: "Biempotrada, puntual",
    descripcion: "Carga concentrada a distancia a del empotramiento izquierdo.",
    parametros: [L(), { clave: "a", etiqueta: "Distancia a al extremo izquierdo", porDefecto: 3 }, P(60)],
    normalizacion: { patron: "puntual", claveCarga: "P", claveLuz: "L" },
    validar: dentroDeLaLuz("a", "L"),
    armar: (v) => ({
      largoM: v.L,
      nodos: [nodo(0, "empotrado"), nodo(v.L, "empotrado")],
      cargas: [puntual(v.a, v.P)],
    }),
  },

  // ------------------------------------------------------------- continuas
  {
    id: "dos-tramos-uniforme",
    familia: "continua",
    nombre: "Dos tramos, carga uniforme",
    descripcion:
      "El apoyo central se lleva la peor parte: con tramos iguales toma 1,25·q·L, mucho más que la suma de las mitades.",
    parametros: [
      { clave: "L1", etiqueta: "Tramo 1", porDefecto: 5 },
      { clave: "L2", etiqueta: "Tramo 2", porDefecto: 5 },
      Q(20),
    ],
    validar: positivos("L1", "L2"),
    armar: (v) => ({
      largoM: v.L1 + v.L2,
      nodos: [nodo(0, "simple"), nodo(v.L1, "simple"), nodo(v.L1 + v.L2, "simple")],
      cargas: [uniforme(0, v.L1 + v.L2, v.q)],
    }),
  },
  {
    id: "dos-tramos-un-vano",
    familia: "continua",
    nombre: "Dos tramos, cargado sólo uno",
    descripcion:
      "La hipótesis alternada de sobrecarga: el vano descargado levanta el diagrama del cargado y se lleva momento del apoyo central.",
    parametros: [
      { clave: "L1", etiqueta: "Tramo 1 (cargado)", porDefecto: 5 },
      { clave: "L2", etiqueta: "Tramo 2 (descargado)", porDefecto: 5 },
      Q(20),
    ],
    validar: positivos("L1", "L2"),
    armar: (v) => ({
      largoM: v.L1 + v.L2,
      nodos: [nodo(0, "simple"), nodo(v.L1, "simple"), nodo(v.L1 + v.L2, "simple")],
      cargas: [uniforme(0, v.L1, v.q)],
    }),
  },
  {
    id: "tres-tramos-uniforme",
    familia: "continua",
    nombre: "Tres tramos, carga uniforme",
    descripcion:
      "Con tramos iguales los momentos de apoyo valen 0,100·q·L² y las reacciones interiores 1,10·q·L.",
    parametros: [
      { clave: "L1", etiqueta: "Tramo 1", porDefecto: 5 },
      { clave: "L2", etiqueta: "Tramo 2", porDefecto: 5 },
      { clave: "L3", etiqueta: "Tramo 3", porDefecto: 5 },
      Q(20),
    ],
    validar: positivos("L1", "L2", "L3"),
    armar: (v) => {
      const total = v.L1 + v.L2 + v.L3;
      return {
        largoM: total,
        nodos: [
          nodo(0, "simple"),
          nodo(v.L1, "simple"),
          nodo(v.L1 + v.L2, "simple"),
          nodo(total, "simple"),
        ],
        cargas: [uniforme(0, total, v.q)] as CargaViga[],
      };
    },
  },
  {
    id: "tres-tramos-alternada",
    familia: "continua",
    nombre: "Tres tramos, sobrecarga alternada",
    descripcion:
      "Extremos cargados y centro descargado: la hipótesis que da el máximo momento de vano en los tramos exteriores.",
    parametros: [
      { clave: "L1", etiqueta: "Tramo 1", porDefecto: 5 },
      { clave: "L2", etiqueta: "Tramo 2", porDefecto: 5 },
      { clave: "L3", etiqueta: "Tramo 3", porDefecto: 5 },
      Q(20),
    ],
    validar: positivos("L1", "L2", "L3"),
    armar: (v) => {
      const total = v.L1 + v.L2 + v.L3;
      return {
        largoM: total,
        nodos: [
          nodo(0, "simple"),
          nodo(v.L1, "simple"),
          nodo(v.L1 + v.L2, "simple"),
          nodo(total, "simple"),
        ],
        cargas: [uniforme(0, v.L1, v.q), uniforme(v.L1 + v.L2, total, v.q)] as CargaViga[],
      };
    },
  },
];

export function casoPorId(id: string): CasoViga {
  return CASOS_VIGA.find((c) => c.id === id) ?? CASOS_VIGA[0];
}
