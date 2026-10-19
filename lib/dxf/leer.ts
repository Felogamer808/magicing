/**
 * Lectura de un DXF: las entidades del espacio modelo, sin interpretar nada.
 *
 * Un DXF es una lista de pares "código de grupo / valor", uno por línea. Se
 * lee de a una línea para aguantar archivos enormes en el navegador: una
 * planta de fundaciones real pesaba 332 MB por bloques de instalaciones y
 * paisajismo que no usa, con sólo 1467 entidades dibujadas. La sección BLOCKS
 * se recorre sin guardar nada.
 *
 * No calcula ni decide qué es cada cosa: eso es de `lib/cad-revit/`. Acá sólo
 * se separa lo dibujado de lo que no, y se limpia el formato de los textos.
 */

export type Punto = [number, number];

export type EntidadDxf =
  | { tipo: "linea"; capa: string; a: Punto; b: Punto }
  | { tipo: "polilinea"; capa: string; puntos: Punto[]; cerrada: boolean; conArcos: boolean }
  | { tipo: "circulo"; capa: string; centro: Punto; radio: number }
  | { tipo: "texto"; capa: string; posicion: Punto; texto: string; rotacionGrados: number }
  | { tipo: "bloque"; capa: string; nombre: string; posicion: Punto };

export interface LecturaDxf {
  entidades: EntidadDxf[];
  /**
   * Lo que declara `$INSUNITS`. Ojo: una planta real decía metros y estaba
   * dibujada en milímetros, así que esto es un dato del archivo, no una verdad.
   */
  unidadDeclarada: string | null;
  /** Entidades del espacio modelo que no se leen (HATCH, DIMENSION…), por tipo. */
  ignoradas: Record<string, number>;
}

const UNIDADES: Record<string, string> = {
  "0": "sin unidad",
  "1": "pulgadas",
  "2": "pies",
  "4": "milímetros",
  "5": "centímetros",
  "6": "metros",
};

const TIPOS_LEIDOS = new Set(["LINE", "LWPOLYLINE", "CIRCLE", "TEXT", "MTEXT", "INSERT"]);

/**
 * Lector incremental: se le pasan las líneas del archivo en orden, con
 * `agregar`, y al final `resultado`. Así sirve igual para un texto entero
 * (tests) y para un archivo que llega por partes (navegador).
 */
export class LectorDxf {
  private codigo: string | null = null;
  private seccion: string | null = null;
  private esperandoNombreSeccion = false;
  private variable: string | null = null;
  private unidad: string | null = null;
  private actual: { tipo: string; grupos: [string, string][] } | null = null;
  private entidades: EntidadDxf[] = [];
  private ignoradas: Record<string, number> = {};

  agregar(linea: string) {
    if (this.codigo === null) {
      this.codigo = linea.trim();
      return;
    }
    const codigo = this.codigo;
    this.codigo = null;
    this.par(codigo, linea.trim());
  }

  resultado(): LecturaDxf {
    this.cerrarEntidad();
    return {
      entidades: this.entidades,
      unidadDeclarada: this.unidad === null ? null : (UNIDADES[this.unidad] ?? `código ${this.unidad}`),
      ignoradas: this.ignoradas,
    };
  }

  private par(codigo: string, valor: string) {
    if (codigo === "0") {
      this.cerrarEntidad();
      if (valor === "SECTION") this.esperandoNombreSeccion = true;
      else if (valor === "ENDSEC") this.seccion = null;
      else if (this.seccion === "ENTITIES") this.actual = { tipo: valor, grupos: [] };
      return;
    }
    if (this.esperandoNombreSeccion && codigo === "2") {
      this.seccion = valor;
      this.esperandoNombreSeccion = false;
      return;
    }
    if (this.seccion === "HEADER") {
      if (codigo === "9") this.variable = valor;
      else if (this.variable === "$INSUNITS" && codigo === "70") this.unidad = valor;
      return;
    }
    this.actual?.grupos.push([codigo, valor]);
  }

  private cerrarEntidad() {
    const e = this.actual;
    this.actual = null;
    if (!e) return;
    const grupos = e.grupos;
    // Código 67 = 1: la entidad está en un espacio papel (una lámina), no en el modelo.
    if (grupos.some(([c, v]) => c === "67" && v === "1")) return;
    if (!TIPOS_LEIDOS.has(e.tipo)) {
      this.ignoradas[e.tipo] = (this.ignoradas[e.tipo] ?? 0) + 1;
      return;
    }
    const entidad = convertir(e.tipo, grupos);
    if (entidad) this.entidades.push(entidad);
  }
}

/** Lee un DXF que ya está entero en memoria. */
export function leerDxf(texto: string): LecturaDxf {
  const lector = new LectorDxf();
  for (const linea of texto.split(/\r?\n/)) lector.agregar(linea);
  return lector.resultado();
}

/**
 * Lee un DXF que llega por partes, sin tenerlo entero en memoria.
 *
 * Los DXF de AutoCAD 2007 en adelante van en UTF-8: leerlos como Latin-1
 * convierte "LÍMITE" en "LÃMITE".
 */
export async function leerDxfPorPartes(partes: AsyncIterable<Uint8Array>): Promise<LecturaDxf> {
  const lector = new LectorDxf();
  const decodificador = new TextDecoder("utf-8");
  let resto = "";
  for await (const parte of partes) {
    const lineas = (resto + decodificador.decode(parte, { stream: true })).split(/\r?\n/);
    resto = lineas.pop() ?? "";
    for (const linea of lineas) lector.agregar(linea);
  }
  resto += decodificador.decode();
  if (resto) lector.agregar(resto);
  return lector.resultado();
}

// ---------------------------------------------------------------------------

function convertir(tipo: string, grupos: [string, string][]): EntidadDxf | null {
  const uno = (c: string) => grupos.find(([k]) => k === c)?.[1];
  const num = (c: string) => {
    const n = Number(uno(c));
    return Number.isFinite(n) ? n : undefined;
  };
  const capa = uno("8") ?? "0";
  const punto = (cx: string, cy: string): Punto | null => {
    const x = num(cx);
    const y = num(cy);
    return x === undefined || y === undefined ? null : [x, y];
  };

  switch (tipo) {
    case "LINE": {
      const a = punto("10", "20");
      const b = punto("11", "21");
      return a && b ? { tipo: "linea", capa, a, b } : null;
    }
    case "LWPOLYLINE": {
      // Los vértices vienen como 10/20 repetidos, en orden; el 42 (bulge) de
      // un vértice dice si el tramo que sale de él es un arco.
      const puntos: Punto[] = [];
      let conArcos = false;
      let x: number | null = null;
      for (const [c, v] of grupos) {
        if (c === "10") x = Number(v);
        else if (c === "20" && x !== null) {
          puntos.push([x, Number(v)]);
          x = null;
        } else if (c === "42" && Number(v) !== 0) conArcos = true;
      }
      if (puntos.length < 2) return null;
      return { tipo: "polilinea", capa, puntos, cerrada: ((num("70") ?? 0) & 1) === 1, conArcos };
    }
    case "CIRCLE": {
      const centro = punto("10", "20");
      const radio = num("40");
      return centro && radio ? { tipo: "circulo", capa, centro, radio } : null;
    }
    case "TEXT":
    case "MTEXT": {
      const posicion = punto("10", "20");
      // MTEXT parte el texto largo en grupos 3 y termina con el 1.
      const crudo = [...grupos.filter(([c]) => c === "3").map(([, v]) => v), uno("1") ?? ""].join("");
      if (!posicion || !crudo) return null;
      return { tipo: "texto", capa, posicion, texto: limpiarTexto(crudo), rotacionGrados: num("50") ?? 0 };
    }
    case "INSERT": {
      const posicion = punto("10", "20");
      const nombre = uno("2");
      return posicion && nombre ? { tipo: "bloque", capa, nombre, posicion } : null;
    }
  }
  return null;
}

/**
 * Saca los códigos de formato de un MTEXT y deja el texto como se lee.
 * "{\H0.2x;LÍMITE}" → "LÍMITE"; "CT9 (1800x800x750)\PN.S.C.:" → dos renglones.
 */
export function limpiarTexto(crudo: string): string {
  return crudo
    .replace(/\\U\+([0-9A-Fa-f]{4})/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\P/g, "\n")
    .replace(/\\[~]/g, " ")
    .replace(/\\[A-Za-z][^;\\{}]*;/g, "")
    .replace(/\\[LlOoKk]/g, "")
    .replace(/[{}]/g, "")
    .replace(/%%[cC]/g, "Ø")
    .trim();
}
