/**
 * Catálogo de secciones: cada perfil es su contorno, nada más.
 *
 * Toda la aritmética la hace `calcularPropiedadesSeccion`, así que acá no hay
 * una sola fórmula de inercia. Un perfil nuevo se agrega describiendo por dónde
 * pasa su borde, y las propiedades salen solas ya verificadas por el motor.
 *
 * El catálogo es declarativo —cada entrada trae sus parámetros con etiqueta,
 * unidad y valor por defecto— para que la página se arme desde acá y no haya
 * que escribir un formulario por perfil.
 */

import type { Punto } from "./poligono";

export interface ParametroSeccion {
  clave: string;
  etiqueta: string;
  /** Valor por defecto, en cm. Se guarda como texto en el formulario. */
  porDefecto: number;
  /**
   * Unidad que muestra el formulario. Casi todos los parámetros son longitudes,
   * así que si falta se asume cm; los dos que no lo son —el ángulo del sector y
   * el número de lados— la declaran vacía. Va acá y no en la página para que
   * agregar una sección no obligue a tocar el formulario.
   */
  unidad?: string;
  ayuda?: string;
}

export interface ContornoSeccion {
  lleno: Punto[];
  huecos: Punto[][];
}

export interface DefinicionSeccion {
  id: string;
  nombre: string;
  familia: FamiliaSeccion;
  descripcion: string;
  parametros: ParametroSeccion[];
  contorno: (p: Record<string, number>) => ContornoSeccion;
  /** Se valida antes de dibujar: devuelve el motivo si los datos no cierran. */
  validar?: (p: Record<string, number>) => string | null;
}

export type FamiliaSeccion = "simples" | "huecas" | "perfiles";

export const FAMILIAS: { id: FamiliaSeccion; nombre: string }[] = [
  { id: "simples", nombre: "Secciones simples" },
  { id: "huecas", nombre: "Secciones huecas" },
  { id: "perfiles", nombre: "Perfiles estructurales" },
];

const p = (xCm: number, yCm: number): Punto => ({ xCm, yCm });

/**
 * Los círculos se resuelven como polígonos de muchos lados en vez de meter una
 * rama con fórmula cerrada: así el motor sigue siendo uno solo, porque una
 * fórmula cerrada aparte sería una segunda fuente de verdad que nadie vuelve a
 * verificar.
 *
 * El precio es un error de discretización, y conviene decirlo con el número
 * medido y no con un "despreciable": el polígono va inscripto, así que siempre
 * queda **por debajo** del círculo. Con 720 lados el defecto es de 1,3·10⁻⁵ en
 * área y 2,5·10⁻⁵ en inercia —o sea 0,0013 % y 0,0025 %—, dos órdenes de
 * magnitud por debajo del último decimal que se muestra en pantalla. El test
 * `error de discretización` lo mide y falla si alguien baja este número.
 */
const LADOS_CIRCULO = 720;

function arco(
  rCm: number,
  desdeGrados: number,
  hastaGrados: number,
  lados = LADOS_CIRCULO,
  cx = 0,
  cy = 0
): Punto[] {
  const n = Math.max(3, Math.round((lados * Math.abs(hastaGrados - desdeGrados)) / 360));
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = ((desdeGrados + ((hastaGrados - desdeGrados) * i) / n) * Math.PI) / 180;
    return p(cx + rCm * Math.cos(t), cy + rCm * Math.sin(t));
  });
}

function circulo(rCm: number, cx = 0, cy = 0): Punto[] {
  return Array.from({ length: LADOS_CIRCULO }, (_, i) => {
    const t = (2 * Math.PI * i) / LADOS_CIRCULO;
    return p(cx + rCm * Math.cos(t), cy + rCm * Math.sin(t));
  });
}

function rect(x0: number, y0: number, bCm: number, hCm: number): Punto[] {
  return [p(x0, y0), p(x0 + bCm, y0), p(x0 + bCm, y0 + hCm), p(x0, y0 + hCm)];
}

const sinHuecos = (lleno: Punto[]): ContornoSeccion => ({ lleno, huecos: [] });

/** Todo positivo: el error más común es dejar un campo en cero. */
function todosPositivos(p: Record<string, number>, claves: string[]): string | null {
  for (const c of claves) {
    if (!(p[c] > 0)) return "Todas las dimensiones tienen que ser mayores que cero.";
  }
  return null;
}

export const CATALOGO_SECCIONES: DefinicionSeccion[] = [
  // ------------------------------------------------------------- simples
  {
    id: "rectangulo",
    nombre: "Rectángulo",
    familia: "simples",
    descripcion: "La sección de referencia: dos ejes de simetría y Ixy nulo.",
    parametros: [
      { clave: "b", etiqueta: "Ancho b", porDefecto: 20 },
      { clave: "h", etiqueta: "Alto h", porDefecto: 40 },
    ],
    validar: (v) => todosPositivos(v, ["b", "h"]),
    contorno: (v) => sinHuecos(rect(0, 0, v.b, v.h)),
  },
  {
    id: "triangulo",
    nombre: "Triángulo",
    familia: "simples",
    descripcion:
      "Base apoyada y vértice desplazable: el centroide queda a h/3 sea cual sea el desplazamiento.",
    parametros: [
      { clave: "b", etiqueta: "Base b", porDefecto: 30 },
      { clave: "h", etiqueta: "Altura h", porDefecto: 24 },
      {
        clave: "d",
        etiqueta: "Vértice desde la izquierda",
        porDefecto: 15,
        ayuda: "Con b/2 es isósceles; con 0 es rectángulo.",
      },
    ],
    validar: (v) => todosPositivos(v, ["b", "h"]),
    contorno: (v) => sinHuecos([p(0, 0), p(v.b, 0), p(v.d, v.h)]),
  },
  {
    id: "trapecio",
    nombre: "Trapecio",
    familia: "simples",
    descripcion: "Isósceles, con las dos bases centradas entre sí.",
    parametros: [
      { clave: "bInf", etiqueta: "Base inferior", porDefecto: 30 },
      { clave: "bSup", etiqueta: "Base superior", porDefecto: 16 },
      { clave: "h", etiqueta: "Altura h", porDefecto: 20 },
    ],
    validar: (v) =>
      !(v.h > 0) || !(v.bInf > 0) || !(v.bSup >= 0)
        ? "La altura y la base inferior tienen que ser mayores que cero."
        : null,
    contorno: (v) => {
      const o = (v.bInf - v.bSup) / 2;
      return sinHuecos([p(0, 0), p(v.bInf, 0), p(o + v.bSup, v.h), p(o, v.h)]);
    },
  },
  {
    id: "circulo",
    nombre: "Círculo",
    familia: "simples",
    descripcion: "Cualquier eje que pase por el centro es principal: Ix = Iy.",
    parametros: [{ clave: "d", etiqueta: "Diámetro", porDefecto: 30 }],
    validar: (v) => todosPositivos(v, ["d"]),
    contorno: (v) => sinHuecos(circulo(v.d / 2)),
  },
  {
    id: "semicirculo",
    nombre: "Medio círculo",
    familia: "simples",
    descripcion: "Diámetro apoyado abajo. El centroide sube 4r/3π sobre la base.",
    parametros: [{ clave: "d", etiqueta: "Diámetro", porDefecto: 30 }],
    validar: (v) => todosPositivos(v, ["d"]),
    contorno: (v) => sinHuecos(arco(v.d / 2, 0, 180)),
  },
  {
    id: "sector",
    nombre: "Sector circular",
    familia: "simples",
    descripcion: "Porción de círculo medida desde la horizontal, con vértice en el centro.",
    parametros: [
      { clave: "d", etiqueta: "Diámetro", porDefecto: 30 },
      { clave: "ang", etiqueta: "Ángulo abarcado", porDefecto: 90, unidad: "°" },
    ],
    validar: (v) =>
      !(v.d > 0) || !(v.ang > 0) || v.ang >= 360
        ? "El ángulo tiene que estar entre 0° y 360°."
        : null,
    contorno: (v) => sinHuecos([p(0, 0), ...arco(v.d / 2, 0, v.ang)]),
  },
  {
    id: "poligono-regular",
    nombre: "Polígono regular",
    familia: "simples",
    descripcion:
      "Inscripto en la circunferencia dada. Con seis o más lados Ix e Iy coinciden en cualquier dirección.",
    parametros: [
      { clave: "n", etiqueta: "Número de lados", porDefecto: 6, unidad: "" },
      { clave: "d", etiqueta: "Diámetro circunscripto", porDefecto: 30 },
    ],
    validar: (v) =>
      !(v.d > 0) || !(v.n >= 3) ? "Necesita al menos tres lados y diámetro positivo." : null,
    contorno: (v) => {
      const n = Math.round(v.n);
      const r = v.d / 2;
      return sinHuecos(
        Array.from({ length: n }, (_, i) => {
          // Se arranca en −90° para que el polígono apoye en un lado plano y no
          // en un vértice: es como se dibuja un hexágono a mano.
          const t = (2 * Math.PI * i) / n - Math.PI / 2 + Math.PI / n;
          return p(r * Math.cos(t), r * Math.sin(t));
        })
      );
    },
  },

  // -------------------------------------------------------------- huecas
  {
    id: "rectangulo-hueco",
    nombre: "Rectángulo hueco",
    familia: "huecas",
    descripcion: "Tubo rectangular de espesor constante.",
    parametros: [
      { clave: "b", etiqueta: "Ancho exterior b", porDefecto: 20 },
      { clave: "h", etiqueta: "Alto exterior h", porDefecto: 40 },
      { clave: "e", etiqueta: "Espesor de pared", porDefecto: 2 },
    ],
    validar: (v) =>
      !(v.b > 0) || !(v.h > 0) || !(v.e > 0)
        ? "Todas las dimensiones tienen que ser mayores que cero."
        : 2 * v.e >= Math.min(v.b, v.h)
          ? "El espesor se come toda la sección: tiene que ser menor que la mitad del lado más chico."
          : null,
    contorno: (v) => ({
      lleno: rect(0, 0, v.b, v.h),
      huecos: [rect(v.e, v.e, v.b - 2 * v.e, v.h - 2 * v.e)],
    }),
  },
  {
    id: "circulo-hueco",
    nombre: "Círculo hueco",
    familia: "huecas",
    descripcion: "Tubo circular. La inercia va con la cuarta potencia del diámetro.",
    parametros: [
      { clave: "d", etiqueta: "Diámetro exterior", porDefecto: 30 },
      { clave: "e", etiqueta: "Espesor de pared", porDefecto: 2 },
    ],
    validar: (v) =>
      !(v.d > 0) || !(v.e > 0)
        ? "El diámetro y el espesor tienen que ser mayores que cero."
        : 2 * v.e >= v.d
          ? "El espesor no puede llegar al centro: tiene que ser menor que el radio."
          : null,
    contorno: (v) => ({
      lleno: circulo(v.d / 2),
      huecos: [circulo(v.d / 2 - v.e)],
    }),
  },

  // ------------------------------------------------------------ perfiles
  {
    id: "perfil-t",
    nombre: "Perfil T",
    familia: "perfiles",
    descripcion:
      "Un solo eje de simetría: el centroide sube hacia el ala y los dos módulos resistentes salen distintos.",
    parametros: [
      { clave: "bAla", etiqueta: "Ancho del ala", porDefecto: 30 },
      { clave: "eAla", etiqueta: "Espesor del ala", porDefecto: 8 },
      { clave: "hTotal", etiqueta: "Altura total", porDefecto: 40 },
      { clave: "eAlma", etiqueta: "Espesor del alma", porDefecto: 10 },
    ],
    validar: (v) =>
      todosPositivos(v, ["bAla", "eAla", "hTotal", "eAlma"]) ??
      (v.eAla >= v.hTotal
        ? "El ala no puede ocupar toda la altura."
        : v.eAlma > v.bAla
          ? "El alma no puede ser más ancha que el ala."
          : null),
    contorno: (v) => {
      const x0 = (v.bAla - v.eAlma) / 2;
      const hAlma = v.hTotal - v.eAla;
      return sinHuecos([
        p(x0, 0),
        p(x0 + v.eAlma, 0),
        p(x0 + v.eAlma, hAlma),
        p(v.bAla, hAlma),
        p(v.bAla, v.hTotal),
        p(0, v.hTotal),
        p(0, hAlma),
        p(x0, hAlma),
      ]);
    },
  },
  {
    id: "perfil-i",
    nombre: "Perfil I (doble T)",
    familia: "perfiles",
    descripcion: "Alas iguales arriba y abajo: doble simetría, Ixy nulo.",
    parametros: [
      { clave: "bAla", etiqueta: "Ancho de las alas", porDefecto: 20 },
      { clave: "eAla", etiqueta: "Espesor de las alas", porDefecto: 3 },
      { clave: "hTotal", etiqueta: "Altura total", porDefecto: 40 },
      { clave: "eAlma", etiqueta: "Espesor del alma", porDefecto: 2 },
    ],
    validar: (v) =>
      todosPositivos(v, ["bAla", "eAla", "hTotal", "eAlma"]) ??
      (2 * v.eAla >= v.hTotal
        ? "Las dos alas se tocan: no queda alma."
        : v.eAlma > v.bAla
          ? "El alma no puede ser más ancha que el ala."
          : null),
    contorno: (v) => {
      const x0 = (v.bAla - v.eAlma) / 2;
      const yAlmaInf = v.eAla;
      const yAlmaSup = v.hTotal - v.eAla;
      return sinHuecos([
        p(0, 0),
        p(v.bAla, 0),
        p(v.bAla, yAlmaInf),
        p(x0 + v.eAlma, yAlmaInf),
        p(x0 + v.eAlma, yAlmaSup),
        p(v.bAla, yAlmaSup),
        p(v.bAla, v.hTotal),
        p(0, v.hTotal),
        p(0, yAlmaSup),
        p(x0, yAlmaSup),
        p(x0, yAlmaInf),
        p(0, yAlmaInf),
      ]);
    },
  },
  {
    id: "perfil-i-asimetrico",
    nombre: "Perfil I de alas desiguales",
    familia: "perfiles",
    descripcion:
      "Alas distintas: el centroide se corre hacia el ala grande. Es el caso de la viga armada de chapa.",
    parametros: [
      { clave: "bInf", etiqueta: "Ancho del ala inferior", porDefecto: 30 },
      { clave: "eInf", etiqueta: "Espesor del ala inferior", porDefecto: 3 },
      { clave: "bSup", etiqueta: "Ancho del ala superior", porDefecto: 18 },
      { clave: "eSup", etiqueta: "Espesor del ala superior", porDefecto: 2.5 },
      { clave: "hTotal", etiqueta: "Altura total", porDefecto: 45 },
      { clave: "eAlma", etiqueta: "Espesor del alma", porDefecto: 2 },
    ],
    validar: (v) =>
      todosPositivos(v, ["bInf", "eInf", "bSup", "eSup", "hTotal", "eAlma"]) ??
      (v.eInf + v.eSup >= v.hTotal
        ? "Las dos alas se tocan: no queda alma."
        : v.eAlma > Math.min(v.bInf, v.bSup)
          ? "El alma no puede ser más ancha que el ala más angosta."
          : null),
    contorno: (v) => {
      const bMax = Math.max(v.bInf, v.bSup);
      const xInf = (bMax - v.bInf) / 2;
      const xSup = (bMax - v.bSup) / 2;
      const xAlma = (bMax - v.eAlma) / 2;
      const yAlmaInf = v.eInf;
      const yAlmaSup = v.hTotal - v.eSup;
      return sinHuecos([
        p(xInf, 0),
        p(xInf + v.bInf, 0),
        p(xInf + v.bInf, yAlmaInf),
        p(xAlma + v.eAlma, yAlmaInf),
        p(xAlma + v.eAlma, yAlmaSup),
        p(xSup + v.bSup, yAlmaSup),
        p(xSup + v.bSup, v.hTotal),
        p(xSup, v.hTotal),
        p(xSup, yAlmaSup),
        p(xAlma, yAlmaSup),
        p(xAlma, yAlmaInf),
        p(xInf, yAlmaInf),
      ]);
    },
  },
  {
    id: "perfil-c",
    nombre: "Perfil C (canal)",
    familia: "perfiles",
    descripcion:
      "Simétrico respecto del eje horizontal nada más: el centroide se corre hacia el alma.",
    parametros: [
      { clave: "bAla", etiqueta: "Ancho de las alas", porDefecto: 10 },
      { clave: "eAla", etiqueta: "Espesor de las alas", porDefecto: 2 },
      { clave: "hTotal", etiqueta: "Altura total", porDefecto: 30 },
      { clave: "eAlma", etiqueta: "Espesor del alma", porDefecto: 2 },
    ],
    validar: (v) =>
      todosPositivos(v, ["bAla", "eAla", "hTotal", "eAlma"]) ??
      (2 * v.eAla >= v.hTotal
        ? "Las dos alas se tocan: no queda alma."
        : v.eAlma > v.bAla
          ? "El alma no puede ser más ancha que el ala."
          : null),
    contorno: (v) =>
      sinHuecos([
        p(0, 0),
        p(v.bAla, 0),
        p(v.bAla, v.eAla),
        p(v.eAlma, v.eAla),
        p(v.eAlma, v.hTotal - v.eAla),
        p(v.bAla, v.hTotal - v.eAla),
        p(v.bAla, v.hTotal),
        p(0, v.hTotal),
      ]),
  },
  {
    id: "perfil-l",
    nombre: "Perfil L (ángulo)",
    familia: "perfiles",
    descripcion:
      "Sin ningún eje de simetría cuando las alas son desiguales: Ixy no se anula y los ejes principales aparecen girados. Es el perfil donde eso importa de verdad.",
    parametros: [
      { clave: "bH", etiqueta: "Ala horizontal", porDefecto: 20 },
      { clave: "bV", etiqueta: "Ala vertical", porDefecto: 25 },
      { clave: "e", etiqueta: "Espesor", porDefecto: 4 },
    ],
    validar: (v) =>
      todosPositivos(v, ["bH", "bV", "e"]) ??
      (v.e >= Math.min(v.bH, v.bV) ? "El espesor no puede llegar al extremo del ala." : null),
    contorno: (v) =>
      sinHuecos([
        p(0, 0),
        p(v.bH, 0),
        p(v.bH, v.e),
        p(v.e, v.e),
        p(v.e, v.bV),
        p(0, v.bV),
      ]),
  },
  {
    id: "perfil-z",
    nombre: "Perfil Z",
    familia: "perfiles",
    descripcion:
      "Simétrico respecto de un punto, no de un eje. Ixy es grande y los ejes principales quedan bien girados.",
    parametros: [
      { clave: "bAla", etiqueta: "Ancho de las alas", porDefecto: 10 },
      { clave: "eAla", etiqueta: "Espesor de las alas", porDefecto: 2 },
      { clave: "hTotal", etiqueta: "Altura total", porDefecto: 30 },
      { clave: "eAlma", etiqueta: "Espesor del alma", porDefecto: 2 },
    ],
    validar: (v) =>
      todosPositivos(v, ["bAla", "eAla", "hTotal", "eAlma"]) ??
      (2 * v.eAla >= v.hTotal ? "Las dos alas se tocan: no queda alma." : null),
    contorno: (v) => {
      const xa = v.bAla;
      const yTop = v.hTotal;
      return sinHuecos([
        p(0, 0),
        p(xa + v.eAlma, 0),
        p(xa + v.eAlma, yTop - v.eAla),
        p(xa + v.eAlma + xa, yTop - v.eAla),
        p(xa + v.eAlma + xa, yTop),
        p(xa, yTop),
        p(xa, v.eAla),
        p(0, v.eAla),
      ]);
    },
  },
];

export function seccionPorId(id: string): DefinicionSeccion | undefined {
  return CATALOGO_SECCIONES.find((s) => s.id === id);
}

export function valoresPorDefecto(def: DefinicionSeccion): Record<string, number> {
  return Object.fromEntries(def.parametros.map((q) => [q.clave, q.porDefecto]));
}
