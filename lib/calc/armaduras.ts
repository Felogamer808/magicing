/**
 * Diámetros de barra de la serie que se ofrece como desplegable, en mm. No
 * restringe: "Otro" en `CampoDiametro` sigue aceptando cualquier valor, un
 * Ø13 o un Ø32, para contrastar un cálculo aunque no sea de catálogo.
 */
export const DIAMETROS_ARMADURA = [6, 8, 10, 12, 16, 20, 25] as const;

/** Área de una barra, en cm². */
export function areaBarraCm2(diametroMm: number): number {
  return (Math.PI * (diametroMm / 10) ** 2) / 4;
}

/** Indica si el diámetro pertenece a la serie comercial. */
export function esDiametroComercial(diametroMm: number): boolean {
  return (DIAMETROS_ARMADURA as readonly number[]).includes(diametroMm);
}
