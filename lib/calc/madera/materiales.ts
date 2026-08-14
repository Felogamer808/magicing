/**
 * Base de materiales del Eurocódigo 5 (UNE-EN 1995-1-1:2016).
 *
 * Todo el articulado de madera cuelga de una sola expresión, la (2.14):
 *
 *     Xd = kmod · Xk / γM
 *
 * y lo que cuesta trabajo no es esa división sino elegir kmod, que sale de
 * cruzar la clase de servicio con la clase de duración de la carga en la tabla
 * 3.1. En la planilla original kmod se teclea a mano en cada hoja —y hay hojas
 * donde quedó distinto para el mismo caso—, así que acá se tabula y se elige
 * con dos desplegables.
 *
 * La otra trampa que resuelve este módulo es que kmod depende de la acción de
 * MENOR duración de la combinación, art. 3.1.3(2), no de la dominante: una
 * combinación de permanente más viento se verifica con el kmod del viento.
 */

/**
 * Los tres materiales que usa la planilla. La tabla 3.1 da los mismos kmod para
 * los tres, pero γM (tabla 2.3), kh (ecs. 3.1/3.2/3.3), kcr (art. 6.1.7) y βc
 * (ec. 6.29) sí los distinguen, así que el tipo tiene que viajar entero.
 */
export type TipoMadera = "maciza" | "MLE" | "LVL";

/** Art. 2.3.1.3. Del ambiente en que vive la pieza, no de la carga. */
export type ClaseServicio = 1 | 2 | 3;

/** Tabla 2.1. */
export type DuracionCarga = "permanente" | "larga" | "media" | "corta" | "instantanea";

export const NOMBRE_MADERA: Record<TipoMadera, string> = {
  maciza: "Madera maciza",
  MLE: "Laminada encolada (MLE)",
  LVL: "Microlaminada (LVL)",
};

export const NOMBRE_DURACION: Record<DuracionCarga, string> = {
  permanente: "Permanente (más de 10 años)",
  larga: "Larga (6 meses a 10 años)",
  media: "Media (1 semana a 6 meses)",
  corta: "Corta (menos de una semana)",
  instantanea: "Instantánea",
};

/** Tabla 2.2, para poder decir en pantalla qué acción cae en cada clase. */
export const EJEMPLOS_DURACION: Record<DuracionCarga, string> = {
  permanente: "peso propio",
  larga: "almacenamiento",
  media: "sobrecarga de uso, nieve",
  corta: "nieve, viento",
  instantanea: "viento, acciones accidentales",
};

export const DESCRIPCION_SERVICIO: Record<ClaseServicio, string> = {
  1: "20 °C y humedad relativa por encima del 65 % sólo unas pocas semanas al año. En coníferas la humedad media no pasa del 12 %.",
  2: "20 °C y humedad relativa por encima del 85 % sólo unas pocas semanas al año. En coníferas la humedad media no pasa del 20 %.",
  3: "Condiciones que llevan a humedades mayores que las de la clase 2: intemperie, contacto con el terreno.",
};

/**
 * Tabla 2.3, combinaciones fundamentales. Los tableros derivados llevan otros
 * valores; cuando entren, se agregan acá.
 */
export const GAMMA_M: Record<TipoMadera, number> = {
  maciza: 1.3,
  MLE: 1.25,
  LVL: 1.2,
};

/** Tabla 2.3, uniones. No sigue al material de las piezas que une. */
export const GAMMA_M_UNIONES = 1.3;

/**
 * Tabla 2.3, combinaciones accidentales. El incendio entra por acá: γM = 1,0,
 * no el del material. Es lo que hace que una sección quemada verifique con
 * tensiones que en frío serían inadmisibles.
 */
export const GAMMA_M_ACCIDENTAL = 1.0;

/**
 * Tabla 3.1. Las tres maderas comparten fila, así que se tabula una sola vez
 * por clase de servicio y se comparte; separarlas sería copiar tres veces lo
 * mismo y dar lugar a que una quede desincronizada.
 */
const KMOD_POR_SERVICIO: Record<ClaseServicio, Record<DuracionCarga, number>> = {
  1: { permanente: 0.6, larga: 0.7, media: 0.8, corta: 0.9, instantanea: 1.1 },
  2: { permanente: 0.6, larga: 0.7, media: 0.8, corta: 0.9, instantanea: 1.1 },
  3: { permanente: 0.5, larga: 0.55, media: 0.65, corta: 0.7, instantanea: 0.9 },
};

/** Tabla 3.2, madera maciza, MLE y LVL. */
const KDEF_POR_SERVICIO: Record<ClaseServicio, number> = { 1: 0.6, 2: 0.8, 3: 2.0 };

export function kmod(_tipo: TipoMadera, clase: ClaseServicio, duracion: DuracionCarga): number {
  return KMOD_POR_SERVICIO[clase][duracion];
}

export function kdef(_tipo: TipoMadera, clase: ClaseServicio): number {
  return KDEF_POR_SERVICIO[clase];
}

/**
 * Art. 2.3.2.1(2), ec. (2.6). Cuando la unión junta dos maderas con
 * comportamientos distintos en el tiempo, el kmod de la unión no es ninguno de
 * los dos sino su media geométrica.
 */
export function kmodUnion(kmod1: number, kmod2: number): number {
  return Math.sqrt(kmod1 * kmod2);
}

/**
 * Factor de altura kh, ecs. (3.1) para maciza y (3.2) para MLE.
 *
 * Sube fm,k y ft,0,k en piezas chicas, porque el valor característico está
 * referido a un canto patrón —150 mm en maciza, 600 mm en MLE— y una pieza más
 * chica tiene menos probabilidad de contener el defecto que gobierna la rotura.
 *
 * Los topes son distintos y no intercambiables: 1,3 en maciza y **1,1** en MLE.
 * La planilla original usa 1,3 para las dos, lo que sobrestima fm,k hasta un
 * 4,5 % en laminada de canto menor que 231 mm (que es donde (600/h)^0,1 pasa
 * de 1,1). Va del lado inseguro, así que acá se respeta cada tope.
 *
 * En LVL el exponente s lo declara el fabricante según EN 14374, así que no se
 * puede tabular: hay que pasarlo. Sin él se devuelve 1,0, que es conservador.
 */
export function kh(tipo: TipoMadera, cantoM: number, exponenteLVL?: number): number {
  const hMm = cantoM * 1000;
  if (hMm <= 0) return 1;

  if (tipo === "maciza") {
    return hMm >= 150 ? 1 : Math.min(1.3, Math.pow(150 / hMm, 0.2));
  }
  if (tipo === "MLE") {
    return hMm >= 600 ? 1 : Math.min(1.1, Math.pow(600 / hMm, 0.1));
  }
  // LVL, ec. (3.3): el valor de referencia es 300 mm y el tope 1,2.
  if (exponenteLVL === undefined) return 1;
  return Math.min(1.2, Math.pow(300 / hMm, exponenteLVL));
}

/**
 * Factor de anchura eficaz frente a fendas, art. 6.1.7(2), ec. (6.13a).
 *
 * Es el coeficiente que más silenciosamente cambia un resultado: recorta un
 * tercio del ancho al verificar cortante en maciza y en laminada. La planilla
 * original lo pone en 1,0 en la comprobación normal y en 0,67 en la de
 * entalladura, con lo cual la primera sobrestima la resistencia un 49 %.
 */
export const KCR: Record<TipoMadera, number> = {
  maciza: 0.67,
  MLE: 0.67,
  LVL: 1.0,
};

/** Art. 6.6(2). Sólo si hay un sistema continuo capaz de repartir la carga. */
export const KSYS_COMPARTIDA = 1.1;

/** Ec. (6.29), factor de imperfección de las columnas. */
export const BETA_C: Record<TipoMadera, number> = {
  maciza: 0.2,
  MLE: 0.1,
  LVL: 0.1,
};

/** Art. 6.1.6(2), factor de redistribución en flexión esviada. */
export const KM_RECTANGULAR = 0.7;
export const KM_OTRAS_SECCIONES = 1.0;

export interface ResistenciaCalculo {
  /** kmod aplicado, de la tabla 3.1. */
  kmod: number;
  /** γM aplicado, de la tabla 2.3. */
  gammaM: number;
  /** Producto de los factores de tamaño y sistema que multiplican a Xk. */
  factores: number;
  /** Xd = kmod · (kh · ksys · Xk) / γM. */
  valor: number;
}

/**
 * Ec. (2.14) con los factores que multiplican al valor característico.
 *
 * kh y ksys se pasan aparte de Xk y no premultiplicados, para que el desarrollo
 * en pantalla pueda mostrar de dónde sale cada uno: en una memoria de cálculo
 * el número solo no sirve, hay que poder rehacer el renglón.
 */
export function resistenciaDeCalculo(
  xkMPa: number,
  opciones: { kmod: number; gammaM: number; kh?: number; ksys?: number }
): ResistenciaCalculo {
  const { kmod: km, gammaM, kh: factorAltura = 1, ksys = 1 } = opciones;
  const factores = factorAltura * ksys;
  return {
    kmod: km,
    gammaM,
    factores,
    valor: (km * factores * xkMPa) / gammaM,
  };
}
