import type { ReactNode } from "react";
import type { IdVerificacion } from "@/lib/verificaciones/registry";

/**
 * Cómo se presenta un cálculo guardado dentro de la memoria.
 *
 * Hace falta un presentador por verificación y no hay forma de evitarlo: cada
 * una tiene sus propios datos, sus propias comprobaciones y sus propios
 * rótulos, y deducirlos del nombre del campo daría una memoria con números bien
 * calculados y mal etiquetados, que es peor que no tenerla.
 *
 * Lo que sí se evita es recalcular distinto: el presentador no reimplementa
 * nada, llama al mismo resolver que usa la pantalla. Un documento que se firma
 * no puede discrepar de la herramienta con la que se hizo.
 */

export interface DatoMemoria {
  etiqueta: string;
  /** Ya formateado, con su unidad: "0,90 m", "30 MPa". */
  valor: string;
}

export interface ComprobacionMemoria {
  etiqueta: string;
  verifica: boolean;
  /** La comparación que la sostiene: "As real 7,85 cm² / As nec 17,64 cm²". */
  detalle?: string;
}

export interface FilaFormula {
  etiqueta: string;
  formula?: string;
  sustitucion?: string;
  valor: string;
}

export interface CapituloCalculo {
  /** Agrupaciones de datos de entrada, en el orden en que se cargan. */
  datos: { titulo: string; filas: DatoMemoria[] }[];
  comprobaciones: ComprobacionMemoria[];
  formulas: FilaFormula[];
  croquis?: ReactNode;
}

/** Devuelve null si los campos guardados no alcanzan para resolver el cálculo. */
export type Presentador = (campos: Record<string, string>) => CapituloCalculo | null;

export type RegistroPresentadores = Partial<Record<IdVerificacion, Presentador>>;
