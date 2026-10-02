/**
 * Cuantía mínima de la armadura de tracción, común a vigas y losas.
 *
 * Vive acá y no en cada elemento porque el Anejo 19 la define una sola vez
 * (art. 9.2.1.1 (1)) y las losas la toman tal cual (art. 9.3.1.1 (1)): dos
 * copias son dos sitios donde equivocarse, como ya pasó con el cortante.
 */

/**
 * Resistencia media a flexotracción, Anejo 19, art. 3.1.8 (1), ec. (3.23),
 * pág. 31: fctm,fl = máx{(1,6 − h/1000)·fctm; fctm}, con h en mm.
 */
export function resistenciaFlexotraccionMPa(fctmMPa: number, hM: number): number {
  return Math.max((1.6 - hM) * fctmMPa, fctmMPa);
}

/**
 * Armadura mínima de tracción de una sección rectangular de ancho b y canto
 * h, Anejo 19, art. 9.2.1.1 (1), ec. (9.1), pág. 140:
 *
 *   As,min = (W / z) · fctm,fl / fyd,  con W = b·h²/6 y z ≈ 0,8·h
 *
 * que para un rectángulo queda b·h·fctm,fl / (4,8·fyd). En losas se usa con
 * b = 1 m para obtenerla por metro de ancho.
 *
 * Es la única cuantía mínima del Anejo 19 para estos elementos. La planilla
 * sumaba un mínimo geométrico y uno mecánico de la EHE‑08 (art. 42.3).
 */
export function armaduraMinimaTraccionCm2(bM: number, hM: number, fctmFlMPa: number, fydMPa: number): number {
  const moduloResistente = (bM * hM ** 2) / 6;
  const brazo = 0.8 * hM;
  return 100 ** 2 * (moduloResistente / brazo) * (fctmFlMPa / fydMPa);
}
