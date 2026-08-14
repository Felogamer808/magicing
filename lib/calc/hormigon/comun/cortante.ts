/**
 * Cortante en piezas sin armadura transversal — Anejo 19, art. 6.2.2,
 * ecuaciones (6.2.a) y (6.2.b), pág. 76 (equivale a EC2 6.2.2(1)).
 *
 * Vive en su propio archivo porque lo usan tanto las vigas como las
 * cimentaciones: estuvo duplicado y las dos copias se fueron con coeficientes
 * distintos, que es exactamente el error que este módulo evita.
 */

import { GAMMA_C } from "@/lib/calc/hormigon/comun/coeficientes";

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
  const CRdC = 0.18 / GAMMA_C;
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

/**
 * Agotamiento por compresión oblicua del alma — art. 6.2.3(3), ec. (6.9),
 * pág. 79:
 *
 *     V_Rd,max = α_cw · b_w · z · ν1 · f_cd / (cotθ + tanθ)
 *
 * Con α_cw = 1 (sin pretensado), θ = 45° y z = 0,9·d queda 0,27·f_cd·b·d.
 *
 * La planilla traía 0,30·f_cd·b·d, que es la Vu1 de la EHE-08: misma expresión
 * pero con el canto útil d donde el articulado usa el brazo mecánico z = 0,9d.
 * De ahí sale exactamente el 11 % de diferencia.
 *
 * Sobre ν1: se puede usar 0,6 en vez de 0,6·(1 − f_ck/250) sólo si la armadura
 * transversal trabaja a f_ywd ≤ 0,8·f_ywk (nota del art. 6.2.3(3)). El motor
 * topa fydEstribos en 400 MPa, que para f_yk = 500 es justo 0,8·f_yk: ese tope
 * no es un capricho de la planilla, es lo que habilita ν1 = 0,6. Si se levanta,
 * hay que bajar ν1 acá.
 */
export function cortanteMaximoBielas(fcdMPa: number, bM: number, dM: number): number {
  const alphaCw = 1;
  const nu1 = 0.6;
  const z = 0.9 * dM;
  const cotMasTan = 2; // θ = 45°
  return (alphaCw * bM * z * nu1 * fcdMPa * 1000) / cotMasTan;
}
