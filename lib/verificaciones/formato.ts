/**
 * Conversión y formato de números compartidos por las páginas de verificación.
 *
 * Estaban copiados íntegros en las dieciséis páginas: además de duplicar código,
 * hacían que cualquier lectura de una página arrancara con treinta líneas de
 * andamiaje ya conocido.
 */

/**
 * Texto de un campo a número. Acepta coma decimal, que es como se escribe acá.
 * Devuelve NaN si no es un número, y quien llama decide qué hacer con eso.
 */
export function aNumero(texto: string): number {
  const n = Number(texto.replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Número para mostrar, con coma decimal y punto de miles.
 * Se usa siempre junto a `tabular-nums` para que no cambie de ancho al
 * recalcular mientras se tipea.
 */
export function fmt(n: number, decimales = 2): string {
  return n.toLocaleString("es-AR", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}

/** Describe en cuántas filas quedó repartida una armadura. */
export function describirCapas(capas: number[]): string {
  return capas.length <= 1 ? `1 fila de ${capas[0]}` : `${capas.length} filas: ${capas.join("+")}`;
}
