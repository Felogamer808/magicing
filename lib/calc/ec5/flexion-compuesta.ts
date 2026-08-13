/**
 * Flexión compuesta: arts. 6.2.3, 6.2.4, 6.3.2 y 6.3.3(6).
 *
 * Cuatro pares de expresiones para lo que parece un solo problema. Cuál se
 * aplica no lo elige el proyectista: lo decide el signo del axil y la esbeltez
 * de la pieza, y el art. 6.3.2(2) lo dice explícitamente —con λrel,y y λrel,z
 * por debajo de 0,3 se va por el 6.2.4, y en todos los demás casos por el
 * 6.3.2—. Este módulo hace ese despacho en vez de dejarlo a criterio de quien
 * carga los datos, que es como la planilla original reparte el problema en dos
 * hojas sin decir cuándo corresponde cada una.
 *
 * El detalle que más se escapa: **el término de axil está al cuadrado en las
 * ecs. (6.19) y (6.20) y es lineal en las (6.23) y (6.24)**. No es un descuido
 * de la norma. En la pieza corta el axil casi no interactúa con la flexión y la
 * parábola lo refleja; en la esbelta el axil amplifica la flecha y con ella el
 * momento, así que penaliza en proporción directa. Elevar al cuadrado en el
 * caso esbelto deja la verificación del lado inseguro.
 */

export type ModoFlexionCompuesta =
  /** Ecs. (6.17) y (6.18): axil de tracción. */
  | "flexotraccion"
  /** Ecs. (6.19) y (6.20): axil de compresión en pieza corta. */
  | "flexocompresion-corta"
  /** Ecs. (6.23) y (6.24): axil de compresión en pieza esbelta. */
  | "flexocompresion-pandeo"
  /** Ec. (6.35): flexión respecto al eje fuerte con vuelco, más compresión. */
  | "vuelco-con-compresion";

export const NOMBRE_MODO: Record<ModoFlexionCompuesta, string> = {
  flexotraccion: "Flexotracción · ecs. (6.17) y (6.18)",
  "flexocompresion-corta": "Flexocompresión sin inestabilidad · ecs. (6.19) y (6.20)",
  "flexocompresion-pandeo": "Flexocompresión con pandeo · ecs. (6.23) y (6.24)",
  "vuelco-con-compresion": "Vuelco lateral con compresión · ec. (6.35)",
};

export interface EntradaFlexionCompuesta {
  /** Positivo si la pieza está traccionada. */
  sigmaT0dMPa: number;
  /** Positivo si la pieza está comprimida. Sólo uno de los dos puede serlo. */
  sigmaC0dMPa: number;
  sigmaMYdMPa: number;
  sigmaMZdMPa: number;
  ft0dMPa: number;
  fc0dMPa: number;
  fmYdMPa: number;
  fmZdMPa: number;
  km: number;
  /** kc del eje y. Sólo se usa en el modo con pandeo. */
  kcY: number;
  /** kc del eje z. */
  kcZ: number;
  /** kcrit del vuelco. Sólo se usa en el modo (6.35). */
  kcrit: number;
  /** true si los dos λrel ≤ 0,3, art. 6.3.2(2). */
  sinInestabilidad: boolean;
  /**
   * Fuerza el modo de la ec. (6.35). Corresponde cuando la pieza es una viga
   * comprimida cuyo problema es el vuelco y no el pandeo de columna.
   */
  verificarVuelco?: boolean;
}

export interface ResultadoFlexionCompuesta {
  modo: ModoFlexionCompuesta;
  /** Primera de las dos expresiones del par. */
  expresionA: number;
  /** Segunda. En el modo (6.35) no hay segunda y vale NaN. */
  expresionB: number;
  aprovechamiento: number;
  verifica: boolean;
  /** Qué expresión gobernó, para poder decirlo en pantalla. */
  gobierna: string;
}

export function verificarFlexionCompuesta(e: EntradaFlexionCompuesta): ResultadoFlexionCompuesta {
  const rmy = e.fmYdMPa > 0 ? e.sigmaMYdMPa / e.fmYdMPa : Infinity;
  const rmz = e.fmZdMPa > 0 ? e.sigmaMZdMPa / e.fmZdMPa : Infinity;

  // Modo (6.35): la viga comprimida que vuelca. Una sola expresión.
  if (e.verificarVuelco) {
    const flexion = e.kcrit * e.fmYdMPa > 0 ? e.sigmaMYdMPa / (e.kcrit * e.fmYdMPa) : Infinity;
    const axil = e.kcZ * e.fc0dMPa > 0 ? e.sigmaC0dMPa / (e.kcZ * e.fc0dMPa) : Infinity;
    const total = flexion ** 2 + axil;
    return {
      modo: "vuelco-con-compresion",
      expresionA: total,
      expresionB: NaN,
      aprovechamiento: total,
      verifica: total <= 1,
      gobierna: "Ec. (6.35)",
    };
  }

  if (e.sigmaT0dMPa > 0) {
    const axil = e.ft0dMPa > 0 ? e.sigmaT0dMPa / e.ft0dMPa : Infinity;
    const a = axil + rmy + e.km * rmz;
    const b = axil + e.km * rmy + rmz;
    return armar("flexotraccion", a, b, "(6.17)", "(6.18)");
  }

  if (e.sinInestabilidad) {
    // Ecs. (6.19) y (6.20): el axil entra al cuadrado.
    const axil = e.fc0dMPa > 0 ? (e.sigmaC0dMPa / e.fc0dMPa) ** 2 : Infinity;
    const a = axil + rmy + e.km * rmz;
    const b = axil + e.km * rmy + rmz;
    return armar("flexocompresion-corta", a, b, "(6.19)", "(6.20)");
  }

  // Ecs. (6.23) y (6.24): el axil entra lineal, y cada expresión con su kc.
  const axilY = e.kcY * e.fc0dMPa > 0 ? e.sigmaC0dMPa / (e.kcY * e.fc0dMPa) : Infinity;
  const axilZ = e.kcZ * e.fc0dMPa > 0 ? e.sigmaC0dMPa / (e.kcZ * e.fc0dMPa) : Infinity;
  const a = axilY + rmy + e.km * rmz;
  const b = axilZ + e.km * rmy + rmz;
  return armar("flexocompresion-pandeo", a, b, "(6.23)", "(6.24)");
}

function armar(
  modo: ModoFlexionCompuesta,
  a: number,
  b: number,
  nombreA: string,
  nombreB: string
): ResultadoFlexionCompuesta {
  const aprovechamiento = Math.max(a, b);
  return {
    modo,
    expresionA: a,
    expresionB: b,
    aprovechamiento,
    verifica: aprovechamiento <= 1,
    gobierna: a >= b ? `Ec. ${nombreA}` : `Ec. ${nombreB}`,
  };
}
