/**
 * Lectura de un IFC: qué elementos estructurales trae, en qué nivel está cada
 * uno y qué sección se le puede leer sin adivinar.
 *
 * Corre igual en el navegador y en Node (los tests): web-ifc elige su wasm
 * según dónde corre. En el navegador se sirve desde `/web-ifc/`, copiado de
 * node_modules por `scripts/copiar-web-ifc.mjs` antes de `dev` y `build`.
 *
 * Nada de esto se guarda: el IFC puede pesar decenas de MB y no entra en
 * localStorage. Lo que queda en el proyecto es lo que devuelve esta lectura.
 */

import {
  IFCAXIS2PLACEMENT3D,
  IFCBEAM,
  IFCBOOLEANCLIPPINGRESULT,
  IFCBOOLEANRESULT,
  IFCBUILDINGSTOREY,
  IFCCARTESIANTRANSFORMATIONOPERATOR3D,
  IFCCIRCLEPROFILEDEF,
  IFCCOLUMN,
  IFCCONVERSIONBASEDUNIT,
  IFCELEMENT,
  IFCEXTRUDEDAREASOLID,
  IFCFEATUREELEMENT,
  IFCFOOTING,
  IFCLOCALPLACEMENT,
  IFCMAPPEDITEM,
  IFCMEMBER,
  IFCPILE,
  IFCPROPERTYSET,
  IFCPROPERTYSINGLEVALUE,
  IFCRECTANGLEPROFILEDEF,
  IFCRELCONTAINEDINSPATIALSTRUCTURE,
  IFCRELDEFINESBYPROPERTIES,
  IFCSIUNIT,
  IFCSLAB,
  IFCUNITASSIGNMENT,
  IFCWALL,
  IfcAPI,
} from "web-ifc";
import type { ElementoIfcLeido } from "@/lib/proyectos/modelo";
import { CLASES_IFC, type ClaseIfc, type SeccionIfc } from "@/lib/proyectos/tipos";

const TIPO_DE_CLASE: Record<ClaseIfc, number> = {
  IfcBeam: IFCBEAM,
  IfcColumn: IFCCOLUMN,
  IfcSlab: IFCSLAB,
  IfcWall: IFCWALL,
  IfcFooting: IFCFOOTING,
  IfcPile: IFCPILE,
  IfcMember: IFCMEMBER,
};

/** Un elemento leído, con su id dentro del archivo para encontrarlo en la geometría. */
export interface ElementoIfcConId extends ElementoIfcLeido {
  expressId: number;
}

export interface LecturaIfc {
  elementos: ElementoIfcConId[];
  /** Elementos que no son estructura, por clase: `{ IfcDoor: 3 }`. */
  salteados: Record<string, number>;
  /** No se pudieron leer las unidades de longitud: no se informa ninguna sección. */
  sinUnidades: boolean;
}

let motor: Promise<IfcAPI> | null = null;

/**
 * El motor de web-ifc, iniciado una sola vez. Un solo hilo a propósito: la
 * versión multihilo pide cabeceras de aislamiento (COOP/COEP) que el sitio no
 * manda, y para leer un edificio no hace falta.
 */
export function iniciarIfc(): Promise<IfcAPI> {
  if (!motor) {
    motor = (async () => {
      const api = new IfcAPI();
      if (typeof window !== "undefined") api.SetWasmPath("/web-ifc/", true);
      await api.Init(undefined, true);
      return api;
    })().catch((e: unknown) => {
      motor = null; // que el próximo intento vuelva a probar
      throw e;
    });
  }
  return motor;
}

/** Lee un IFC entero y lo cierra. */
export async function leerIfc(bytes: Uint8Array): Promise<LecturaIfc> {
  const api = await iniciarIfc();
  const modelo = api.OpenModel(bytes);
  if (modelo < 0) throw new Error("web-ifc no pudo abrir el archivo.");
  try {
    return leerModelo(api, modelo);
  } finally {
    api.CloseModel(modelo);
  }
}

/** Lee un modelo ya abierto. Lo usa también el visor, que necesita el modelo abierto para la geometría. */
export function leerModelo(api: IfcAPI, modelo: number): LecturaIfc {
  const escala = escalaLongitud(api, modelo);
  const nivelDe = niveles(api, modelo);
  const marcaDe = marcas(api, modelo);
  const elementos: ElementoIfcConId[] = [];
  const estructurales = new Set<number>();

  for (const clase of CLASES_IFC) {
    for (const id of ids(api.GetLineIDsWithType(modelo, TIPO_DE_CLASE[clase], true))) {
      estructurales.add(id);
      const l = linea(api, modelo, id);
      const globalId = texto(l?.GlobalId);
      if (!l || !globalId) continue;
      const seccion = escala === null ? undefined : leerSeccion(api, modelo, l, clase, escala);
      const nivel = nivelDe.get(id);
      elementos.push({
        expressId: id,
        globalId,
        clase,
        nombre: marcaDe.get(id) ?? texto(l.Name) ?? texto(l.Tag) ?? `${clase} #${id}`,
        ...(nivel ? { nivel } : {}),
        ...(seccion ? { seccion } : {}),
      });
    }
  }

  // Lo que se saltea es lo que el modelo trae como elemento y no es estructura.
  // Las aberturas (IfcOpeningElement y demás IfcFeatureElement) no cuentan: no
  // son piezas que alguien busque en el resumen.
  const aberturas = new Set(ids(api.GetLineIDsWithType(modelo, IFCFEATUREELEMENT, true)));
  const salteados: Record<string, number> = {};
  for (const id of ids(api.GetLineIDsWithType(modelo, IFCELEMENT, true))) {
    if (estructurales.has(id) || aberturas.has(id)) continue;
    const clase = api.GetNameFromTypeCode(api.GetLineType(modelo, id));
    salteados[clase] = (salteados[clase] ?? 0) + 1;
  }

  elementos.sort((a, b) => a.expressId - b.expressId);
  return { elementos, salteados, sinUnidades: escala === null };
}

// ---------------------------------------------------------------------------
// Unidades y niveles
// ---------------------------------------------------------------------------

const PREFIJOS: Record<string, number> = { "": 1, KILO: 1000, DECI: 0.1, CENTI: 0.01, MILLI: 0.001 };

/**
 * Metros por unidad de longitud del archivo. Revit exporta en mm, pero un IFC
 * en pies existe: sin esto una viga de 0,20 m se leería como de 200 m o de
 * 0,20 pies. `null` si no se puede saber, y entonces no se informa sección.
 */
function escalaLongitud(api: IfcAPI, modelo: number): number | null {
  for (const idAsignacion of ids(api.GetLineIDsWithType(modelo, IFCUNITASSIGNMENT))) {
    for (const ref of lista(linea(api, modelo, idAsignacion)?.Units)) {
      const unidad = linea(api, modelo, ref);
      if (!unidad || enumerado(unidad.UnitType) !== "LENGTHUNIT") continue;
      if (unidad.type === IFCSIUNIT) return escalaSI(unidad);
      if (unidad.type === IFCCONVERSIONBASEDUNIT) {
        const medida = linea(api, modelo, unidad.ConversionFactor);
        const factor = numero(medida?.ValueComponent);
        const base = linea(api, modelo, medida?.UnitComponent);
        const escalaBase = base?.type === IFCSIUNIT ? escalaSI(base) : null;
        return factor !== undefined && escalaBase !== null ? factor * escalaBase : null;
      }
    }
  }
  return null;
}

function escalaSI(unidad: Linea): number | null {
  if (enumerado(unidad.Name) !== "METRE") return null;
  return PREFIJOS[enumerado(unidad.Prefix) ?? ""] ?? null;
}

/** expressID del elemento → nombre del nivel que lo contiene. */
function niveles(api: IfcAPI, modelo: number): Map<number, string> {
  const nivelDe = new Map<number, string>();
  for (const id of ids(api.GetLineIDsWithType(modelo, IFCRELCONTAINEDINSPATIALSTRUCTURE))) {
    const rel = linea(api, modelo, id);
    const estructura = linea(api, modelo, rel?.RelatingStructure);
    // Lo que cuelga del edificio o del sitio no tiene nivel: queda sin ubicación.
    if (!rel || estructura?.type !== IFCBUILDINGSTOREY) continue;
    const nombre = texto(estructura.Name) ?? texto(estructura.LongName) ?? "Nivel sin nombre";
    for (const ref of lista(rel.RelatedElements)) {
      const idElemento = referencia(ref);
      if (idElemento !== undefined) nivelDe.set(idElemento, nombre);
    }
  }
  return nivelDe;
}

/** Propiedades que guardan la Marca de Revit: "Mark" en inglés, "Marca" en español. */
const NOMBRES_MARCA = new Set(["mark", "marca"]);

/**
 * expressID del elemento → su Marca ("VR4", "CT5").
 *
 * Es como se nombra la pieza en los planos. El Name que exporta Revit es
 * "Familia:Tipo:Id", que no sirve para encontrarla, y el Tag es el Id. La
 * Marca llega sólo si se exporta con "Exportar conjuntos de propiedades de
 * Revit"; si no viene, se usa el Name.
 */
function marcas(api: IfcAPI, modelo: number): Map<number, string> {
  const marcaDe = new Map<number, string>();
  for (const id of ids(api.GetLineIDsWithType(modelo, IFCRELDEFINESBYPROPERTIES))) {
    const rel = linea(api, modelo, id);
    const conjunto = linea(api, modelo, rel?.RelatingPropertyDefinition);
    if (!rel || conjunto?.type !== IFCPROPERTYSET) continue;
    let marca: string | undefined;
    for (const ref of lista(conjunto.HasProperties)) {
      const p = linea(api, modelo, ref);
      const nombre = texto(p?.Name)?.toLowerCase();
      if (p?.type === IFCPROPERTYSINGLEVALUE && nombre && NOMBRES_MARCA.has(nombre)) marca = texto(p.NominalValue);
    }
    if (!marca) continue;
    for (const ref of lista(rel.RelatedObjects)) {
      const idElemento = referencia(ref);
      if (idElemento !== undefined && !marcaDe.has(idElemento)) marcaDe.set(idElemento, marca);
    }
  }
  return marcaDe;
}

// ---------------------------------------------------------------------------
// Sección
// ---------------------------------------------------------------------------

/**
 * La sección que se puede leer sin interpretar: el cuerpo es un único sólido
 * extruido —quizás recortado— y su perfil es un rectángulo o un círculo.
 * Cualquier otra cosa (varios sólidos, perfiles I, Brep) queda sin sección
 * antes que con una equivocada.
 *
 * Losas y zapatas dan su espesor (lo que se extruye). Los muros, el menor lado
 * del rectángulo: el mayor es su largo. Vigas y miembros, ancho × alto según
 * qué lado del perfil queda vertical. Pilares y pilotes, el perfil tal cual:
 * en una pieza vertical no hay un lado "alto".
 */
function leerSeccion(
  api: IfcAPI,
  modelo: number,
  elemento: Linea,
  clase: ClaseIfc,
  escala: number
): SeccionIfc | undefined {
  const cuerpo = solidoExtruido(api, modelo, elemento);
  if (!cuerpo) return undefined;
  const { solido, giro } = cuerpo;
  const m = (v: number | undefined) =>
    v !== undefined && v > 0 ? Math.round(v * escala * 1e4) / 1e4 : undefined;

  if (clase === "IfcSlab" || clase === "IfcFooting") {
    const espesorM = m(numero(solido.Depth));
    return espesorM ? { tipo: "espesor", espesorM } : undefined;
  }

  const perfil = linea(api, modelo, solido.SweptArea);
  if (perfil?.type === IFCRECTANGLEPROFILEDEF) {
    const x = m(numero(perfil.XDim));
    const y = m(numero(perfil.YDim));
    if (!x || !y) return undefined;
    if (clase === "IfcWall") return { tipo: "espesor", espesorM: Math.min(x, y) };
    if (clase === "IfcBeam" || clase === "IfcMember") {
      // XDim corre por el eje X del perfil y YDim por el Y. Cuál de los dos es
      // la altura depende de cómo quedó apoyado el perfil en el mundo: Revit
      // pone el X vertical, otros exportadores el Y. Se mira, no se supone.
      const mundo = componer(giroDeUbicacion(api, modelo, elemento.ObjectPlacement), giro, giroDeEjes(api, modelo, solido.Position));
      const zX = Math.abs(mundo[2][0]);
      const zY = Math.abs(mundo[2][1]);
      if (Math.max(zX, zY) < 0.5) return undefined; // perfil girado: no hay un lado claramente vertical
      return zX > zY ? { tipo: "rectangular", anchoM: y, altoM: x } : { tipo: "rectangular", anchoM: x, altoM: y };
    }
    return { tipo: "rectangular", anchoM: x, altoM: y };
  }
  if (perfil?.type === IFCCIRCLEPROFILEDEF && clase !== "IfcWall") {
    const r = numero(perfil.Radius);
    const diametroM = m(r === undefined ? undefined : 2 * r);
    return diametroM ? { tipo: "circular", diametroM } : undefined;
  }
  return undefined;
}

/**
 * El único sólido extruido de la representación 'Body', con el giro que le
 * agrega un IfcMappedItem si lo hay.
 *
 * Un recorte (IfcBooleanClippingResult: Revit recorta las vigas donde se unen
 * a otra pieza) no cambia la sección: se toma el sólido de base, que es su
 * primer operando, por más recortes que tenga encima.
 */
function solidoExtruido(
  api: IfcAPI,
  modelo: number,
  elemento: Linea
): { solido: Linea; giro: Giro } | null {
  const forma = linea(api, modelo, elemento.Representation);
  for (const ref of lista(forma?.Representations)) {
    const rep = linea(api, modelo, ref);
    if (!rep || texto(rep.RepresentationIdentifier) !== "Body") continue;
    let items = lista(rep.Items);
    if (items.length !== 1) return null;
    let item = linea(api, modelo, items[0]);
    let giro = IDENTIDAD;
    if (item?.type === IFCMAPPEDITEM) {
      const fuente = linea(api, modelo, item.MappingSource);
      giro = componer(giroDeOperador(api, modelo, item.MappingTarget), giroDeEjes(api, modelo, fuente?.MappingOrigin));
      items = lista(linea(api, modelo, fuente?.MappedRepresentation)?.Items);
      if (items.length !== 1) return null;
      item = linea(api, modelo, items[0]);
    }
    while (item && (item.type === IFCBOOLEANCLIPPINGRESULT || item.type === IFCBOOLEANRESULT)) {
      if (enumerado(item.Operator) !== "DIFFERENCE") return null;
      item = linea(api, modelo, item.FirstOperand);
    }
    return item?.type === IFCEXTRUDEDAREASOLID ? { solido: item, giro } : null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Giros: sólo hace falta saber hacia dónde apunta cada eje, no dónde está
// ---------------------------------------------------------------------------

/** Matriz 3×3 por filas: la columna j es el eje j local, escrito en el sistema de arriba. */
type Giro = number[][];

const IDENTIDAD: Giro = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

function componer(...giros: Giro[]): Giro {
  return giros.reduce((a, b) => a.map((fila) => [0, 1, 2].map((j) => fila.reduce((s, v, k) => s + v * b[k][j], 0))));
}

function normalizar(v: number[]): number[] {
  const n = Math.hypot(...v);
  return n > 0 ? v.map((x) => x / n) : v;
}

function vectorDe(api: IfcAPI, modelo: number, ref: unknown): number[] | undefined {
  const d = linea(api, modelo, ref);
  const r = lista(d?.DirectionRatios).map((x) => Number(typeof x === "number" ? x : valor(x)));
  return r.length >= 2 && r.every(Number.isFinite) ? [r[0], r[1], r[2] ?? 0] : undefined;
}

/** Giro de un IfcAxis2Placement3D: Axis es el Z local, RefDirection marca el X. */
function giroDeEjes(api: IfcAPI, modelo: number, ref: unknown): Giro {
  const ejes = linea(api, modelo, ref);
  if (!ejes || ejes.type !== IFCAXIS2PLACEMENT3D) return IDENTIDAD;
  const z = normalizar(vectorDe(api, modelo, ejes.Axis) ?? [0, 0, 1]);
  const ref0 = vectorDe(api, modelo, ejes.RefDirection) ?? [1, 0, 0];
  const p = ref0[0] * z[0] + ref0[1] * z[1] + ref0[2] * z[2];
  const x = normalizar(ref0.map((v, i) => v - p * z[i]));
  const y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
  return [0, 1, 2].map((i) => [x[i], y[i], z[i]]);
}

/** Giro de la cadena de IfcLocalPlacement, desde el elemento hasta la raíz. */
function giroDeUbicacion(api: IfcAPI, modelo: number, ref: unknown): Giro {
  const giros: Giro[] = [];
  let ubicacion = linea(api, modelo, ref);
  for (let i = 0; ubicacion?.type === IFCLOCALPLACEMENT && i < 64; i++) {
    giros.unshift(giroDeEjes(api, modelo, ubicacion.RelativePlacement));
    ubicacion = linea(api, modelo, ubicacion.PlacementRelTo);
  }
  return giros.length ? componer(...giros) : IDENTIDAD;
}

/** Giro de un IfcCartesianTransformationOperator3D (el destino de un IfcMappedItem). */
function giroDeOperador(api: IfcAPI, modelo: number, ref: unknown): Giro {
  const op = linea(api, modelo, ref);
  if (!op || op.type !== IFCCARTESIANTRANSFORMATIONOPERATOR3D) return IDENTIDAD;
  const x = normalizar(vectorDe(api, modelo, op.Axis1) ?? [1, 0, 0]);
  const z = normalizar(vectorDe(api, modelo, op.Axis3) ?? [0, 0, 1]);
  const y = normalizar(vectorDe(api, modelo, op.Axis2) ?? [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]]);
  return [0, 1, 2].map((i) => [x[i], y[i], z[i]]);
}

// ---------------------------------------------------------------------------
// Acceso a las líneas de web-ifc, que vienen sin tipar
// ---------------------------------------------------------------------------

type Linea = Record<string, unknown> & { expressID: number; type: number };

function ids(vector: { size(): number; get(i: number): number }): number[] {
  return Array.from({ length: vector.size() }, (_, i) => vector.get(i));
}

/** Id de una referencia `{ type: 5, value: id }`, o el número si ya es un id. */
function referencia(v: unknown): number | undefined {
  if (typeof v === "number") return v;
  if (typeof v === "object" && v !== null && (v as { type?: unknown }).type === 5) {
    const id = (v as { value?: unknown }).value;
    return typeof id === "number" ? id : undefined;
  }
  return undefined;
}

function linea(api: IfcAPI, modelo: number, ref: unknown): Linea | null {
  const id = referencia(ref);
  if (id === undefined) return null;
  const l: unknown = api.GetLine(modelo, id);
  return typeof l === "object" && l !== null ? (l as Linea) : null;
}

function valor(v: unknown): unknown {
  return typeof v === "object" && v !== null ? (v as { value?: unknown }).value : undefined;
}

function texto(v: unknown): string | undefined {
  const t = valor(v);
  return typeof t === "string" && t.trim() ? t.trim() : undefined;
}

const enumerado = texto;

function numero(v: unknown): number | undefined {
  const n = Number(valor(v));
  return Number.isFinite(n) ? n : undefined;
}

function lista(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}
