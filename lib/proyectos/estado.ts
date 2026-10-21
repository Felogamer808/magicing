/**
 * Estado de un elemento según sus cálculos: se deriva cada vez, no se guarda.
 *
 * Guardarlo sería guardar un resultado congelado: el motor cambia (una
 * corrección del lado inseguro, un artículo mal leído) y un "verifica" escrito
 * hace un mes seguiría pintando de verde una pieza que hoy no cumple. Como los
 * campos se guardan tal cual se cargaron, recalcular es barato y siempre dice
 * lo que dice el motor de hoy.
 *
 * No calcula nada propio. Usa el mismo resolver por campos que la página y el
 * servidor MCP (`calcularCimentacion`), que completa con los valores por
 * defecto lo que falte. Hoy eso existe sólo para cimentaciones: un cálculo de
 * otra familia queda "no evaluable" hasta que su módulo de recomendaciones
 * exporte su comprobación (ver TODO.md).
 */

import { calcularCimentacion, esCimentacion } from "@/lib/mcp/cimentaciones";
import type { CalculoGuardado, ElementoProyecto } from "@/lib/proyectos/tipos";

/** Un cálculo verifica, no verifica, o no hay con qué saberlo. */
export type EstadoCalculo = "verifica" | "no-verifica" | "no-evaluable";

export type EstadoElemento = "sin-verificar" | EstadoCalculo;

export const ROTULO_ESTADO: Record<EstadoElemento, string> = {
  "sin-verificar": "Sin verificar",
  verifica: "Verifica",
  "no-verifica": "No verifica",
  "no-evaluable": "No evaluable",
};

/**
 * `no-evaluable` cubre dos casos que para el color son lo mismo: una
 * verificación sin resolver por campos todavía, y datos con los que la página
 * tampoco calcularía (un campo vacío, un pilar fuera de la zapata).
 */
export function estadoDeCalculo(calculo: CalculoGuardado): EstadoCalculo {
  if (!esCimentacion(calculo.verificacion)) return "no-evaluable";
  // La página guarda también la norma elegida ("norma"), que no es un dato
  // del cálculo: cada verificación de cimentaciones calcula con su única norma
  // y el selector sólo la muestra en la revisión. completarCampos rechaza las
  // claves que no conoce, así que con la norma adentro todo cálculo guardado
  // desde la página quedaba "no evaluable".
  const campos = Object.fromEntries(Object.entries(calculo.campos).filter(([clave]) => clave !== "norma"));
  const r = calcularCimentacion(calculo.verificacion, campos);
  if (!r.ok) return "no-evaluable";
  return r.cumple ? "verifica" : "no-verifica";
}

/**
 * Sin cálculos, sin verificar. Con alguno que falla, no verifica, aunque haya
 * otros sin evaluar: lo que falla ya falla. Si no falla ninguno pero hay
 * alguno sin evaluar, no se puede decir que verifica.
 */
export function estadoDeElemento(elemento: ElementoProyecto): EstadoElemento {
  // Una pieza del CAD que no tiene verificación (cabezal de un pilote, viga
  // centradora sobre pilotes) no está pendiente: no hay con qué evaluarla.
  if (elemento.calculos.length === 0) return elemento.cad?.sinVerificacion ? "no-evaluable" : "sin-verificar";
  const estados = elemento.calculos.map(estadoDeCalculo);
  if (estados.includes("no-verifica")) return "no-verifica";
  if (estados.includes("no-evaluable")) return "no-evaluable";
  return "verifica";
}
