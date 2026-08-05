/**
 * Diámetros de barra que se fabrican, en mm. Sirven de sugerencia al cargar
 * armadura: nada impide escribir otro valor, pero un φ13 no se puede comprar y
 * conviene que la herramienta lo insinúe antes de que llegue al plano.
 */
export const DIAMETROS_ARMADURA = [6, 8, 10, 12, 14, 16, 20, 25, 32, 40] as const;

/** Área de una barra, en cm². */
export function areaBarraCm2(diametroMm: number): number {
  return (Math.PI * (diametroMm / 10) ** 2) / 4;
}

/** Indica si el diámetro pertenece a la serie comercial. */
export function esDiametroComercial(diametroMm: number): boolean {
  return (DIAMETROS_ARMADURA as readonly number[]).includes(diametroMm);
}
