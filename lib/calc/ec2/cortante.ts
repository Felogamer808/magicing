/**
 * Cortante en piezas sin armadura transversal — Anejo 19, art. 6.2.2,
 * ecuaciones (6.2.a) y (6.2.b), pág. 76 (equivale a EC2 6.2.2(1)).
 *
 * Vive en su propio archivo porque lo usan tanto las vigas como las
 * cimentaciones: estuvo duplicado y las dos copias se fueron con coeficientes
 * distintos, que es exactamente el error que este módulo evita.
 */

/** Factor de escala por tamaño: k = 1 + √(200/d) ≤ 2, con d en mm. */
export function factorEscalaK(dM: number): number {
  return Math.min(1 + Math.sqrt(200 / (dM * 1000)), 2);
}

/**
 * Término principal de la (6.2.a), en MPa: C_Rd,c · k · (100·ρl·fck)^(1/3),
 * con C_Rd,c = 0,18/γc y la cuantía topada en 0,02 como pide el articulado.
 *
 * Sin el término k1·σcp: el motor no contempla axil ni pretensado, y omitirlo
 * queda del lado seguro porque en compresión ese término suma.
 */
export function tensionCortanteBase(k: number, rhoL: number, fckMPa: number): number {
  const CRdC = 0.18 / 1.5;
  return CRdC * k * (100 * Math.min(rhoL, 0.02) * fckMPa) ** (1 / 3);
}

/** Mínimo de la (6.2.b), en MPa: v_min = 0,035 · k^(3/2) · √fck. */
export function tensionCortanteMinima(k: number, fckMPa: number): number {
  return 0.035 * k ** 1.5 * Math.sqrt(fckMPa);
}

/** Resistencia adoptada: el mayor entre la (6.2.a) y su mínimo (6.2.b), en MPa. */
export function tensionCortanteResistente(k: number, rhoL: number, fckMPa: number): number {
  return Math.max(tensionCortanteBase(k, rhoL, fckMPa), tensionCortanteMinima(k, fckMPa));
}
