/**
 * Operaciones sobre un proyecto, puras y sin navegador.
 *
 * Todo lo que transforma el modelo vive acá y devuelve objetos nuevos; el
 * almacén sólo lee y escribe. Separarlo es lo que permite testear el
 * comportamiento —que renombrar no pierda cálculos, que importar un archivo
 * roto no rompa nada— sin montar un localStorage falso.
 */

import {
  MATERIALES_POR_DEFECTO,
  VERSION_FORMATO,
  type ArchivoProyectos,
  type CalculoGuardado,
  type ElementoProyecto,
  type Proyecto,
} from "@/lib/proyectos/tipos";
import type { IdVerificacion } from "@/lib/verificaciones/registry";

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

  const proyectos = crudo.proyectos.filter(esProyecto);
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
  return v.elementos.every(esElemento);
}

function esElemento(v: unknown): v is ElementoProyecto {
  if (!esObjeto(v)) return false;
  if (typeof v.id !== "string" || typeof v.nombre !== "string") return false;
  if (!Array.isArray(v.calculos)) return false;
  return v.calculos.every((c) => {
    if (!esObjeto(c)) return false;
    if (typeof c.id !== "string" || typeof c.verificacion !== "string") return false;
    return esObjeto(c.campos);
  });
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
