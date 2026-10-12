/**
 * Rótulos de las opciones de las zapatas, tal como se guardan en los campos.
 *
 * Viven acá y no en las páginas porque los resolvers los leen para decidir el
 * caso, y un resolver no puede importar un componente de cliente. Cambiar un
 * texto cambia el valor guardado: los datos viejos dejan de reconocerse.
 */

export const EXTREMOS_TIRANTE = ["Barra recta", "Patilla a 90°"] as const;
export const ADHERENCIAS_TIRANTE = ["Buena", "Mala"] as const;
export const EQUILIBRIOS = ["Lo toma el terreno", "Par tirante–terreno"] as const;

/** Dónde cae el pilar de la zapata aislada. "Contra la medianera" es un atajo hacia ubicación libre. */
export const POSICIONES_AISLADA = ["Centrado", "Ubicación libre", "Contra la medianera (borde en A)"] as const;
export const POSICIONES_CORRIDA = ["Centrado", "Ubicación libre", "Contra la medianera"] as const;
export const POSICIONES_COMBINADA = ["Centrados", "Ubicación libre", "Contra la medianera"] as const;
