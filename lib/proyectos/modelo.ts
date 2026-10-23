/**
 * Operaciones sobre un proyecto, puras y sin navegador.
 *
 * Todo lo que transforma el modelo vive acá y devuelve objetos nuevos; el
 * almacén sólo lee y escribe. Separarlo es lo que permite testear el
 * comportamiento —que renombrar no pierda cálculos, que importar un archivo
 * roto no rompa nada— sin montar un localStorage falso.
 */

import {
  CLASES_IFC,
  MATERIALES_POR_DEFECTO,
  MODOS_PILOTES,
  PIEZAS_CAD,
  VERSION_FORMATO,
  type ArchivoProyectos,
  type CalculoGuardado,
  type ClaseIfc,
  type ElementoProyecto,
  type OrigenCad,
  type PiezaCad,
  type Proyecto,
  type SeccionIfc,
} from "@/lib/proyectos/tipos";
import type { IdVerificacion } from "@/lib/verificaciones/registry";

/**
 * Verificaciones que dejaron de existir y cómo se leen ahora sus cálculos
 * guardados. Sin esto, un proyecto viejo abriría con un cálculo que no apunta a
 * ninguna página.
 *
 * La zapata de medianería pasó a ser la zapata aislada con el pilar
 * descentrado (2026-10-06): la distancia del pilar al límite es la distancia
 * de su cara al borde de inicio en A, y en B el pilar queda centrado.
 */
function convertirCalculo(c: CalculoGuardado): CalculoGuardado {
  if ((c.verificacion as string) !== "zapata-medianeria") return c;
  const numero = (nombre: string, porDefecto: number) => {
    const n = Number((c.campos[nombre] ?? "").replace(",", "."));
    return Number.isFinite(n) && (c.campos[nombre] ?? "") !== "" ? n : porDefecto;
  };
  const centroB = (numero("B", 1.2) - numero("anchoPilarB", 0.4)) / 2;
  const { distanciaColumnaLimite, ...resto } = c.campos;
  return {
    ...c,
    verificacion: "zapatas",
    campos: {
      ...resto,
      posicionPilar: "Ubicación libre",
      distanciaBordeA: distanciaColumnaLimite ?? "0.7",
      distanciaBordeB: String(Math.round(Math.max(centroB, 0) * 1000) / 1000),
    },
  };
}

/** Pasa los cálculos de verificaciones retiradas a la que las reemplaza. */
export function convertirRetirados(proyectos: Proyecto[]): Proyecto[] {
  const hayQueConvertir = proyectos.some((p) =>
    p.elementos.some((e) => e.calculos.some((c) => (c.verificacion as string) === "zapata-medianeria"))
  );
  if (!hayQueConvertir) return proyectos;
  return proyectos.map((p) => ({
    ...p,
    elementos: p.elementos.map((e) => ({ ...e, calculos: e.calculos.map(convertirCalculo) })),
  }));
}

function ahora(): string {
  return new Date().toISOString();
}

/**
 * Id estable. `crypto.randomUUID` está en todo navegador actual y en Node 19+;
 * el respaldo existe para no caerse en un contexto sin crypto, no por precisión.
 */
function nuevoId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function crearProyecto(nombre: string): Proyecto {
  const momento = ahora();
  return {
    id: nuevoId(),
    nombre: nombre.trim() || "Proyecto sin nombre",
    materiales: { ...MATERIALES_POR_DEFECTO },
    elementos: [],
    creado: momento,
    editado: momento,
  };
}

export function crearElemento(nombre: string, ubicacion?: string): ElementoProyecto {
  const momento = ahora();
  return {
    id: nuevoId(),
    nombre: nombre.trim() || "Elemento sin nombre",
    ubicacion: ubicacion?.trim() || undefined,
    calculos: [],
    creado: momento,
    editado: momento,
  };
}

export function crearCalculo(
  verificacion: IdVerificacion,
  campos: Record<string, string>
): CalculoGuardado {
  const momento = ahora();
  return { id: nuevoId(), verificacion, campos: { ...campos }, creado: momento, editado: momento };
}

/** Marca el proyecto como editado recién ahora. Se aplica en toda operación que lo cambie. */
function tocado(proyecto: Proyecto): Proyecto {
  return { ...proyecto, editado: ahora() };
}

export function actualizarProyecto(proyecto: Proyecto, cambios: Partial<Proyecto>): Proyecto {
  return tocado({ ...proyecto, ...cambios });
}

export function agregarElemento(proyecto: Proyecto, elemento: ElementoProyecto): Proyecto {
  return tocado({ ...proyecto, elementos: [...proyecto.elementos, elemento] });
}

export function actualizarElemento(
  proyecto: Proyecto,
  idElemento: string,
  cambios: Partial<Omit<ElementoProyecto, "id" | "calculos">>
): Proyecto {
  return tocado({
    ...proyecto,
    elementos: proyecto.elementos.map((e) =>
      e.id === idElemento ? { ...e, ...cambios, editado: ahora() } : e
    ),
  });
}

export function eliminarElemento(proyecto: Proyecto, idElemento: string): Proyecto {
  return tocado({ ...proyecto, elementos: proyecto.elementos.filter((e) => e.id !== idElemento) });
}

/**
 * Guarda un cálculo dentro de un elemento.
 *
 * Si el elemento ya tiene un cálculo de esa misma verificación, lo reemplaza en
 * su lugar en vez de agregar uno nuevo. Es lo que corresponde al trabajo real:
 * se vuelve a la V-203, se le cambia la armadura y se guarda otra vez. Acumular
 * versiones dejaría la viga con cuatro "flexión y cortante" y ninguna forma de
 * saber cuál es la buena.
 */
export function guardarCalculoEnElemento(
  proyecto: Proyecto,
  idElemento: string,
  calculo: CalculoGuardado
): Proyecto {
  return tocado({
    ...proyecto,
    elementos: proyecto.elementos.map((e) => {
      if (e.id !== idElemento) return e;
      const existente = e.calculos.find((c) => c.verificacion === calculo.verificacion);
      const calculos = existente
        ? e.calculos.map((c) =>
            c.verificacion === calculo.verificacion
              ? { ...calculo, id: c.id, creado: c.creado, editado: ahora() }
              : c
          )
        : [...e.calculos, calculo];
      return { ...e, calculos, editado: ahora() };
    }),
  });
}

export function eliminarCalculo(
  proyecto: Proyecto,
  idElemento: string,
  idCalculo: string
): Proyecto {
  return tocado({
    ...proyecto,
    elementos: proyecto.elementos.map((e) =>
      e.id === idElemento
        ? { ...e, calculos: e.calculos.filter((c) => c.id !== idCalculo), editado: ahora() }
        : e
    ),
  });
}

// ---------------------------------------------------------------------------
// Elementos importados de un IFC
// ---------------------------------------------------------------------------

/** Un elemento tal como sale de leer el IFC, antes de entrar al proyecto. */
export interface ElementoIfcLeido {
  globalId: string;
  clase: ClaseIfc;
  nombre: string;
  /** Nombre del IfcBuildingStorey que lo contiene, si lo hay. */
  nivel?: string;
  seccion?: SeccionIfc;
}

export interface ResultadoIncorporacion {
  proyecto: Proyecto;
  /** Elementos nuevos, por clase. */
  creados: Partial<Record<ClaseIfc, number>>;
  /** Ya estaban en el proyecto con el mismo GlobalId: no se tocan. */
  yaEstaban: number;
  /** Aparecen más de una vez en el archivo con el mismo GlobalId: se toma la primera. */
  repetidos: number;
}

/**
 * Suma al proyecto los elementos leídos de un IFC.
 *
 * El GlobalId decide si un elemento es nuevo. Uno que ya está no se pisa: pudo
 * haberse renombrado o tener cálculos, y volver a importar el mismo modelo
 * tiene que ser inocuo. Un GlobalId repetido dentro del mismo archivo entra
 * una sola vez.
 */
export function incorporarIfc(proyecto: Proyecto, leidos: ElementoIfcLeido[]): ResultadoIncorporacion {
  const enProyecto = new Set(
    proyecto.elementos.map((e) => e.ifc?.globalId).filter((g): g is string => Boolean(g))
  );
  const enArchivo = new Set<string>();
  const creados: Partial<Record<ClaseIfc, number>> = {};
  const nuevos: ElementoProyecto[] = [];
  let yaEstaban = 0;
  let repetidos = 0;

  for (const l of leidos) {
    // Se distinguen para el resumen: "ya estaba" es lo esperable al
    // reimportar; "repetido" es un defecto del archivo exportado.
    if (enArchivo.has(l.globalId)) {
      repetidos++;
      continue;
    }
    enArchivo.add(l.globalId);
    if (enProyecto.has(l.globalId)) {
      yaEstaban++;
      continue;
    }
    nuevos.push({
      ...crearElemento(l.nombre, l.nivel),
      ifc: { globalId: l.globalId, clase: l.clase, ...(l.seccion ? { seccion: l.seccion } : {}) },
    });
    creados[l.clase] = (creados[l.clase] ?? 0) + 1;
  }

  return {
    proyecto: nuevos.length ? tocado({ ...proyecto, elementos: [...proyecto.elementos, ...nuevos] }) : proyecto,
    creados,
    yaEstaban,
    repetidos,
  };
}

// ---------------------------------------------------------------------------
// Elementos traídos de una planta de CAD (página CAD → Revit)
// ---------------------------------------------------------------------------

/** Una pieza de la planta interpretada, lista para entrar al proyecto. */
export interface PiezaPlantaLeida {
  origen: Omit<OrigenCad, "archivo">;
  /** La verificación que le corresponde, si hay una. */
  verificacion?: IdVerificacion;
  /** Campos que salen del dibujo: se reescriben cada vez que se trae la planta. */
  geometria: Record<string, string>;
  /**
   * Campos que se cargan a mano (cargas, armadura, suelo). Entran vacíos: si
   * faltaran, la verificación los completaría con su valor por defecto y la
   * pieza diría "verifica" con una armadura que nadie cargó.
   */
  aMano: readonly string[];
  /** Campos de materiales del proyecto (fck, fyk, recubrimiento): sólo al crear. */
  materiales: Record<string, string>;
}

export interface ResultadoPlanta {
  proyecto: Proyecto;
  creados: Partial<Record<PiezaCad, number>>;
  /** Ya estaban (misma marca): se les actualizó la geometría, no lo cargado a mano. */
  actualizados: number;
  /** Elementos del CAD que ya no aparecen en esta planta: no se borran. */
  yaNoEstan: string[];
}

/**
 * Suma o actualiza en el proyecto las piezas de una planta de CAD.
 *
 * La marca decide si una pieza es nueva. A una que ya está se le reescribe
 * sólo la geometría —el plano pudo cambiar de revisión—; las cargas y la
 * armadura cargadas a mano quedan como estaban. Lo que ya no aparece en la
 * planta no se borra (pudo tener cálculos): se informa.
 */
export function incorporarPlanta(proyecto: Proyecto, piezas: PiezaPlantaLeida[], archivo: string): ResultadoPlanta {
  const porMarca = new Map(proyecto.elementos.filter((e) => e.cad).map((e) => [e.cad!.marca, e]));
  const marcas = new Set(piezas.map((p) => p.origen.marca));
  const creados: Partial<Record<PiezaCad, number>> = {};
  const nuevos: ElementoProyecto[] = [];
  const cambiados = new Map<string, ElementoProyecto>();

  for (const p of piezas) {
    const cad: OrigenCad = { ...p.origen, archivo };
    const existente = porMarca.get(p.origen.marca);
    if (!existente) {
      const vacios = Object.fromEntries(p.aMano.map((k) => [k, ""]));
      nuevos.push({
        ...crearElemento(p.origen.marca, "Fundaciones"),
        cad,
        calculos: p.verificacion ? [crearCalculo(p.verificacion, { ...p.materiales, ...vacios, ...p.geometria })] : [],
      });
      creados[p.origen.pieza] = (creados[p.origen.pieza] ?? 0) + 1;
      continue;
    }
    let calculos = existente.calculos;
    if (p.verificacion) {
      const previo = calculos.find((c) => c.verificacion === p.verificacion);
      calculos = previo
        ? calculos.map((c) => (c === previo ? { ...c, campos: { ...c.campos, ...p.geometria }, editado: ahora() } : c))
        : [
            ...calculos,
            crearCalculo(p.verificacion, {
              ...p.materiales,
              ...Object.fromEntries(p.aMano.map((k) => [k, ""])),
              ...p.geometria,
            }),
          ];
    }
    cambiados.set(existente.id, { ...existente, cad, calculos, editado: ahora() });
  }

  const yaNoEstan = proyecto.elementos.filter((e) => e.cad && !marcas.has(e.cad.marca)).map((e) => e.nombre);
  if (nuevos.length === 0 && cambiados.size === 0) return { proyecto, creados, actualizados: 0, yaNoEstan };
  return {
    proyecto: tocado({
      ...proyecto,
      elementos: [...proyecto.elementos.map((e) => cambiados.get(e.id) ?? e), ...nuevos],
    }),
    creados,
    actualizados: cambiados.size,
    yaNoEstan,
  };
}

/** Cuántos cálculos tiene el proyecto, sumando los de todos sus elementos. */
export function contarCalculos(proyecto: Proyecto): number {
  return proyecto.elementos.reduce((total, e) => total + e.calculos.length, 0);
}

// ---------------------------------------------------------------------------
// Archivo de proyecto
// ---------------------------------------------------------------------------

export function armarArchivo(proyectos: Proyecto[]): ArchivoProyectos {
  return { formato: "magicing-proyectos", version: VERSION_FORMATO, proyectos };
}

export interface ResultadoImportacion {
  ok: boolean;
  proyectos: Proyecto[];
  /** Qué pasó, en una frase que se le pueda mostrar a quien importó. */
  mensaje: string;
}

function esObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Lee un archivo exportado y lo valida antes de dejarlo entrar.
 *
 * Se valida de verdad en vez de confiar en el JSON.parse: el archivo pudo
 * editarse a mano, truncarse al copiarlo o venir de una versión futura. Un
 * proyecto a medio leer que entra al almacén rompe la pantalla sin decir por
 * qué, y el dato queda corrupto para siempre.
 */
export function leerArchivo(texto: string): ResultadoImportacion {
  let crudo: unknown;
  try {
    crudo = JSON.parse(texto);
  } catch {
    return { ok: false, proyectos: [], mensaje: "El archivo no es un JSON válido." };
  }

  if (!esObjeto(crudo) || crudo.formato !== "magicing-proyectos") {
    return {
      ok: false,
      proyectos: [],
      mensaje: "El archivo no es una exportación de proyectos de MagicIng.",
    };
  }

  if (typeof crudo.version !== "number" || crudo.version > VERSION_FORMATO) {
    return {
      ok: false,
      proyectos: [],
      mensaje: `El archivo se exportó con una versión más nueva (${String(crudo.version)}). Actualizá MagicIng para abrirlo.`,
    };
  }

  if (!Array.isArray(crudo.proyectos)) {
    return { ok: false, proyectos: [], mensaje: "El archivo no trae ninguna lista de proyectos." };
  }

  const proyectos = convertirRetirados(crudo.proyectos.filter(esProyecto));
  if (proyectos.length === 0) {
    return { ok: false, proyectos: [], mensaje: "El archivo no trae ningún proyecto legible." };
  }

  const descartados = crudo.proyectos.length - proyectos.length;
  return {
    ok: true,
    proyectos,
    mensaje:
      descartados > 0
        ? `Se importaron ${proyectos.length} proyectos y se descartaron ${descartados} por venir incompletos.`
        : `Se importaron ${proyectos.length} ${proyectos.length === 1 ? "proyecto" : "proyectos"}.`,
  };
}

function esProyecto(v: unknown): v is Proyecto {
  if (!esObjeto(v)) return false;
  if (typeof v.id !== "string" || typeof v.nombre !== "string") return false;
  if (!esObjeto(v.materiales)) return false;
  const m = v.materiales;
  if (typeof m.fckMPa !== "number" || typeof m.fykMPa !== "number") return false;
  if (typeof m.recubrimientoM !== "number") return false;
  if (!Array.isArray(v.elementos)) return false;
  if (v.suelo !== undefined && !soloNumeros(v.suelo)) return false;
  if (v.psi2 !== undefined && (typeof v.psi2 !== "number" || !Number.isFinite(v.psi2))) return false;
  if (v.pilotes !== undefined && !esPilotesProyecto(v.pilotes)) return false;
  if (v.planta !== undefined && !esPlantaGuardada(v.planta)) return false;
  return v.elementos.every(esElemento);
}

function esElemento(v: unknown): v is ElementoProyecto {
  if (!esObjeto(v)) return false;
  if (typeof v.id !== "string" || typeof v.nombre !== "string") return false;
  if (!Array.isArray(v.calculos)) return false;
  if (v.ifc !== undefined && !esOrigenIfc(v.ifc)) return false;
  if (v.cad !== undefined && !esOrigenCad(v.cad)) return false;
  if (v.pilar !== undefined && !soloNumeros(v.pilar)) return false;
  return v.calculos.every((c) => {
    if (!esObjeto(c)) return false;
    if (typeof c.id !== "string" || typeof c.verificacion !== "string") return false;
    return esObjeto(c.campos);
  });
}

function esOrigenIfc(v: unknown): boolean {
  if (!esObjeto(v) || typeof v.globalId !== "string" || v.globalId === "") return false;
  if (!(CLASES_IFC as readonly unknown[]).includes(v.clase)) return false;
  return v.seccion === undefined || (esObjeto(v.seccion) && typeof v.seccion.tipo === "string");
}

function esPlantaGuardada(v: unknown): boolean {
  if (!esObjeto(v) || typeof v.archivo !== "string" || typeof v.escala !== "number") return false;
  const r = v.interpretacion;
  if (!esObjeto(r) || !esObjeto(r.zona)) return false;
  return ["pilotes", "cabezales", "nodos", "vigas", "avisos", "dibujo"].every((k) => Array.isArray(r[k]));
}

function esPilotesProyecto(v: unknown): boolean {
  if (!esObjeto(v)) return false;
  if (v.modo !== undefined && !(MODOS_PILOTES as readonly unknown[]).includes(v.modo)) return false;
  return v.capacidades === undefined || (Array.isArray(v.capacidades) && v.capacidades.every(soloNumeros));
}

/** Un objeto cuyos valores son todos números finitos (pilar, suelo). */
function soloNumeros(v: unknown): boolean {
  return esObjeto(v) && Object.values(v).every((x) => typeof x === "number" && Number.isFinite(x));
}

function esOrigenCad(v: unknown): boolean {
  if (!esObjeto(v) || typeof v.marca !== "string" || v.marca === "") return false;
  if (!(PIEZAS_CAD as readonly unknown[]).includes(v.pieza)) return false;
  if (typeof v.archivo !== "string") return false;
  return v.sinVerificacion === undefined || typeof v.sinVerificacion === "string";
}

/**
 * Nombre de archivo para la exportación. Sin espacios ni tildes, porque termina
 * viajando por mail y por pendrive entre Windows y otras cosas.
 */
export function nombreDeArchivo(proyecto: Proyecto | null): string {
  const base = proyecto
    ? proyecto.nombre
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase()
    : "proyectos";
  const fecha = new Date().toISOString().slice(0, 10);
  return `magicing-${base || "proyecto"}-${fecha}.json`;
}
