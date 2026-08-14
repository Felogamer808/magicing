/**
 * Geometría de la sección rectangular, compartida por todas las verificaciones
 * de madera.
 *
 * Se usa la notación de ejes del Eurocódigo 5 y no la de la planilla: **y es el
 * eje fuerte** (flexión que moviliza el canto) y **z el débil**. La planilla los
 * llama x e y, y al pasar a las fórmulas de la norma —donde λrel,z gobierna el
 * pandeo y My,crit el vuelco— esa traducción es justo donde se cuelan los
 * errores. Mejor hablar el idioma del articulado y aclararlo en pantalla.
 */

export interface SeccionRectangular {
  /** Anchura b: la dimensión menor en una viga de canto. */
  anchoM: number;
  /** Canto h: la dimensión paralela al plano de carga principal. */
  cantoM: number;
}

export interface PropiedadesSeccion {
  areaM2: number;
  /** Inercia respecto al eje fuerte y. */
  iyM4: number;
  /** Inercia respecto al eje débil z. */
  izM4: number;
  /** Módulo resistente respecto a y. */
  wyM3: number;
  /** Módulo resistente respecto a z. */
  wzM3: number;
  /** Radio de giro respecto a y. */
  radioGiroYM: number;
  /** Radio de giro respecto a z. */
  radioGiroZM: number;
  /** Módulo de torsión Itor de la sección rectangular. */
  itorM4: number;
}

export function propiedades({ anchoM: b, cantoM: h }: SeccionRectangular): PropiedadesSeccion {
  const areaM2 = b * h;
  const iyM4 = (b * h ** 3) / 12;
  const izM4 = (h * b ** 3) / 12;

  /*
   * Módulo de torsión de la sección rectangular estrecha, con el término de
   * Saint-Venant (1 − 0,63·b/h). No es el momento polar: usar Iy + Iz acá
   * sobrestima la rigidez torsional y, con ella, la tensión crítica de vuelco.
   */
  const itorM4 = ((h * b ** 3) / 3) * (1 - (0.63 * b) / h);

  return {
    areaM2,
    iyM4,
    izM4,
    wyM3: (b * h ** 2) / 6,
    wzM3: (h * b ** 2) / 6,
    radioGiroYM: Math.sqrt(iyM4 / areaM2),
    radioGiroZM: Math.sqrt(izM4 / areaM2),
    itorM4,
  };
}

/** Tensión normal de flexión, en MPa, con el momento en kN·m y W en m³. */
export function tensionFlexionMPa(momentoKNm: number, wM3: number): number {
  return wM3 > 0 ? momentoKNm / (wM3 * 1000) : Infinity;
}

/** Tensión normal de axil, en MPa, con la fuerza en kN y el área en m². */
export function tensionAxilMPa(fuerzaKN: number, areaM2: number): number {
  return areaM2 > 0 ? fuerzaKN / (areaM2 * 1000) : Infinity;
}
