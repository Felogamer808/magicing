/**
 * Modelo de proyecto: la obra, sus elementos y los cálculos de cada uno.
 *
 * La forma sale de cómo se trabaja: no se calcula "una viga" en abstracto, se
 * calcula **la V-203 del nivel 4**, y esa viga necesita flexión y cortante,
 * puede necesitar fisuración y deformaciones, y mañana hay que poder volver a
 * abrirla para cambiarle la armadura. De ahí los tres niveles:
 *
 *     Proyecto  "Edificio Los Cedros"      — materiales y datos de obra
 *       └ Elemento  "V-203 · Nivel 4"      — lo que se nombra y se revisa
 *           └ Cálculo  flexión y cortante  — una verificación, con sus datos
 *
 * El elemento no declara de qué tipo es. Se sabe por los cálculos que tiene
 * colgando, y un dato que se puede deducir es un dato que puede contradecir a
 * la realidad: una viga marcada como "pilar" no la detecta nadie.
 *
 * La excepción es el elemento que viene de un modelo IFC: ahí la clase
 * (`IfcBeam`, `IfcColumn`…) no la escribe nadie, la trae el archivo. Se guarda
 * en `ifc.clase` como dato de origen —lo que dice el modelo—, no como un tipo
 * declarado, y por eso puede contrastarse contra los cálculos en vez de
 * reemplazarlos.
 */

import type { IdVerificacion } from "@/lib/verificaciones/registry";

/**
 * Materiales de la obra, cargados una vez y heredados por los elementos.
 *
 * Es lo que evita el error más caro y más difícil de ver: media estructura
 * calculada con un fck y la otra media con otro, sin que nada lo delate. Un
 * elemento puede pisarlos, y cuando lo hace queda marcado como excepción.
 */
export interface MaterialesProyecto {
  fckMPa: number;
  fykMPa: number;
  /** Recubrimiento nominal, m. */
  recubrimientoM: number;
}

export interface CalculoGuardado {
  id: string;
  /** Qué verificación es, por su id en el registro. */
  verificacion: IdVerificacion;
  /**
   * Los campos tal como los escribe `useCampo`: nombre del campo → texto.
   *
   * Se guarda el texto y no el número ya convertido, por dos motivos. Es
   * exactamente lo que hay que volver a poner en los campos para reabrir el
   * cálculo y seguir editándolo, que es lo que se pidió. Y preserva lo que la
   * persona escribió —"0,30" y no 0.3— sin pasar por una conversión de ida y
   * otra de vuelta.
   */
  campos: Record<string, string>;
  /** ISO. */
  creado: string;
  editado: string;
}

/** Clases IFC que se leen como estructura. Sus subtipos (`IfcBeamStandardCase`…) entran como la clase madre. */
export const CLASES_IFC = [
  "IfcBeam",
  "IfcColumn",
  "IfcSlab",
  "IfcWall",
  "IfcFooting",
  "IfcPile",
  "IfcMember",
] as const;

export type ClaseIfc = (typeof CLASES_IFC)[number];

/**
 * Dimensiones que se pudieron leer del modelo, en m. Sólo se muestran: no
 * entran en los campos de ninguna verificación, porque el IFC de Revit es el
 * modelo físico y la sección que trae no es necesariamente la de cálculo.
 */
export type SeccionIfc =
  | { tipo: "rectangular"; anchoM: number; altoM: number }
  | { tipo: "circular"; diametroM: number }
  | { tipo: "espesor"; espesorM: number };

/** Vínculo del elemento con el modelo del que se importó. */
export interface OrigenIfc {
  /**
   * GlobalId del IFC: 22 caracteres, estable entre exportaciones del mismo
   * modelo. Es lo que permite volver a importar sin duplicar elementos.
   */
  globalId: string;
  clase: ClaseIfc;
  seccion?: SeccionIfc;
}

/** Qué pieza de una planta de fundaciones es, al traerla desde CAD → Revit. */
export const PIEZAS_CAD = ["cabezal", "nodo", "viga", "pilote"] as const;
export type PiezaCad = (typeof PIEZAS_CAD)[number];

/** Vínculo del elemento con la planta del CAD de la que salió. */
export interface OrigenCad {
  /**
   * La marca de la pieza en Revit ("CT9-1", "VR4", "CT9-1-P2"): es lo que
   * permite volver a traer la planta —otra revisión del mismo plano— sin
   * duplicar elementos.
   */
  marca: string;
  pieza: PiezaCad;
  /** El DXF del que salió la última vez. */
  archivo: string;
  /**
   * Por qué no tiene verificación: no hay una para esta pieza todavía (un
   * cabezal de un pilote, una viga centradora sobre pilotes). El estado es
   * "no evaluable" y no "sin verificar", porque no falta nada por hacer.
   */
  sinVerificacion?: string;
  /** Viga: la marca de la pieza en cada extremo (cabezal o nodo), o null. */
  extremos?: [string | null, string | null];
  /** Pilote: la marca de la pieza que tiene encima. */
  bajo?: string;
  /** Cabezal: lados y canto, m (para el peso propio que baja a los pilotes). */
  medidasM?: [number, number, number];
}

/**
 * El pilar que descarga en un cabezal o en un nodo de una planta de CAD. Los
 * pilares no se dibujan: sus cargas y su sección se cargan a mano. Cargas
 * características, sin mayorar (cada verificación combina a su manera). Cada
 * dato es opcional porque se cargan de a uno; se deriva sólo con los que hacen
 * falta en cada caso.
 */
export interface PilarCargado {
  gKN?: number;
  qKN?: number;
  /**
   * Nd cargado a mano, kN: la envolvente ELU del modelo (Robot), que incluye
   * las combinaciones con viento. Si está, gana sobre γG·G + γQ·Q en todo lo
   * que usa el Nd (cabezales y vigas de atado). El Nk de los pilotes sigue
   * saliendo de G + Q.
   */
  ndKN?: number;
  /** Lado del pilar en la dirección que une los pilotes, m. */
  ladoPilotesM?: number;
  /** Lado transversal, m. */
  ladoTransversalM?: number;
}

/** Datos del terreno para los pilotes: uno solo para todo el proyecto. */
export interface SueloPilotes {
  friccionKNm2?: number;
  puntaKNm2?: number;
  factorSeguridad?: number;
}

export interface ElementoProyecto {
  id: string;
  /** Como se lo llama en los planos: "V-203", "P12", "Z-4". */
  nombre: string;
  /**
   * Dónde está: "Nivel 4", "Planta baja". Opcional porque no toda obra los
   * numera. Al importar un IFC es el nombre de su IfcBuildingStorey.
   */
  ubicacion?: string;
  nota?: string;
  /** Sólo en los elementos importados de un IFC. */
  ifc?: OrigenIfc;
  /** Sólo en los elementos traídos de una planta de CAD (página CAD → Revit). */
  cad?: OrigenCad;
  /** Cabezal o nodo de una planta de CAD: el pilar que tiene encima. */
  pilar?: PilarCargado;
  calculos: CalculoGuardado[];
  creado: string;
  editado: string;
}

export interface Proyecto {
  id: string;
  nombre: string;
  comitente?: string;
  ubicacion?: string;
  /** Quien firma. Va a la portada de la memoria. */
  autor?: string;
  materiales: MaterialesProyecto;
  /** Terreno para los pilotes de una planta de CAD. */
  suelo?: SueloPilotes;
  elementos: ElementoProyecto[];
  creado: string;
  editado: string;
}

/**
 * Lo que se guarda y lo que se exporta a un archivo.
 *
 * Lleva versión desde el primer día. El formato va a cambiar —van a aparecer
 * campos que hoy no se nos ocurren— y sin un número acá, un archivo exportado
 * hoy se vuelve ilegible más adelante sin forma de saber por qué.
 *
 * El campo `ifc` del elemento no la sube: es opcional y un archivo sin él se
 * lee igual. Se sube una sola vez, cuando entren los vínculos entre elementos
 * (ver TODO.md), y esa conversión desde 1 deja el `ifc` tal como está.
 */
export const VERSION_FORMATO = 1;

export interface ArchivoProyectos {
  formato: "magicing-proyectos";
  version: number;
  proyectos: Proyecto[];
}

export const MATERIALES_POR_DEFECTO: MaterialesProyecto = {
  fckMPa: 30,
  fykMPa: 500,
  recubrimientoM: 0.03,
};
