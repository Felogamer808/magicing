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

export interface ElementoProyecto {
  id: string;
  /** Como se lo llama en los planos: "V-203", "P12", "Z-4". */
  nombre: string;
  /** Dónde está: "Nivel 4", "Planta baja". Opcional porque no toda obra los numera. */
  ubicacion?: string;
  nota?: string;
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
