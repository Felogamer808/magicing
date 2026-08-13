/**
 * Esfuerzo axil: tracción (6.1.2), compresión paralela con pandeo (6.1.4 y
 * 6.3.2), compresión perpendicular (6.1.5) y compresión en ángulo con la fibra
 * (6.2.2).
 *
 * La madera es el material donde más se separan las dos compresiones: fc,90,k
 * anda por 2,5 MPa contra 24 MPa de fc,0,k, un factor diez. Por eso el apoyo de
 * una viga —que trabaja perpendicular— suele decidir el canto antes que la
 * flexión, y por eso el art. 6.1.5 se toma el trabajo de definir un área eficaz
 * mayor que la de contacto: sin ese ensanchamiento casi ningún apoyo pasaría.
 */

import { BETA_C, type TipoMadera } from "./materiales";

/* ------------------------------------------------------------------ *
 * 6.1.2 — Tracción paralela a la fibra
 * ------------------------------------------------------------------ */

export interface ResultadoTraccion {
  sigmaT0dMPa: number;
  ft0dMPa: number;
  aprovechamiento: number;
  verifica: boolean;
}

/** Ec. (6.1). */
export function verificarTraccion(
  axilKN: number,
  areaM2: number,
  ft0dMPa: number
): ResultadoTraccion {
  const sigmaT0dMPa = areaM2 > 0 ? axilKN / (areaM2 * 1000) : Infinity;
  const aprovechamiento = ft0dMPa > 0 ? sigmaT0dMPa / ft0dMPa : Infinity;
  return { sigmaT0dMPa, ft0dMPa, aprovechamiento, verifica: aprovechamiento <= 1 };
}

/* ------------------------------------------------------------------ *
 * 6.3.2 — Columnas: esbeltez y factor de pandeo
 * ------------------------------------------------------------------ */

export interface PandeoEje {
  /** Esbeltez mecánica λ = lk/i. */
  lambda: number;
  /** Esbeltez relativa, ecs. (6.21) y (6.22). */
  lambdaRel: number;
  /** k, ecs. (6.27) y (6.28). */
  k: number;
  /** kc, ecs. (6.25) y (6.26). */
  kc: number;
}

/**
 * Factor de pandeo de un eje.
 *
 * Por debajo de λrel = 0,3 la norma no reduce nada: art. 6.3.2(2). Ese umbral
 * no es cosmético —es el que decide si la pieza se verifica por el 6.2.4 o por
 * el 6.3.2— y hay que declararlo, porque la expresión de kc devuelve valores
 * ligeramente menores que 1 en esa zona y aplicarla igual sería penalizar una
 * pieza que la norma considera corta.
 */
export function pandeoEje(
  lambda: number,
  fc0kMPa: number,
  e005GPa: number,
  tipo: TipoMadera
): PandeoEje {
  const lambdaRel = (lambda / Math.PI) * Math.sqrt(fc0kMPa / (e005GPa * 1000));

  if (lambdaRel <= 0.3) {
    return { lambda, lambdaRel, k: NaN, kc: 1 };
  }

  const betaC = BETA_C[tipo];
  const k = 0.5 * (1 + betaC * (lambdaRel - 0.3) + lambdaRel ** 2);
  const radicando = k ** 2 - lambdaRel ** 2;
  const kc = radicando >= 0 ? 1 / (k + Math.sqrt(radicando)) : 1 / k;

  return { lambda, lambdaRel, k, kc };
}

export interface ResultadoCompresion {
  ejeY: PandeoEje;
  ejeZ: PandeoEje;
  /** El menor de los dos kc: el pandeo lo decide el eje más débil. */
  kc: number;
  /** true si los dos λrel ≤ 0,3 y corresponde ir por el art. 6.2.4. */
  sinInestabilidad: boolean;
  sigmaC0dMPa: number;
  /** kc·fc,0,d. */
  resistenciaReducidaMPa: number;
  aprovechamiento: number;
  verifica: boolean;
}

/** Ecs. (6.2) y (6.23)/(6.24) con los momentos nulos. */
export function verificarCompresion(opciones: {
  axilKN: number;
  areaM2: number;
  radioGiroYM: number;
  radioGiroZM: number;
  longitudPandeoYM: number;
  longitudPandeoZM: number;
  fc0kMPa: number;
  fc0dMPa: number;
  e005GPa: number;
  tipo: TipoMadera;
}): ResultadoCompresion {
  const {
    axilKN, areaM2, radioGiroYM, radioGiroZM,
    longitudPandeoYM, longitudPandeoZM, fc0kMPa, fc0dMPa, e005GPa, tipo,
  } = opciones;

  const ejeY = pandeoEje(radioGiroYM > 0 ? longitudPandeoYM / radioGiroYM : Infinity, fc0kMPa, e005GPa, tipo);
  const ejeZ = pandeoEje(radioGiroZM > 0 ? longitudPandeoZM / radioGiroZM : Infinity, fc0kMPa, e005GPa, tipo);

  const kc = Math.min(ejeY.kc, ejeZ.kc);
  const sigmaC0dMPa = areaM2 > 0 ? axilKN / (areaM2 * 1000) : Infinity;
  const resistenciaReducidaMPa = kc * fc0dMPa;
  const aprovechamiento =
    resistenciaReducidaMPa > 0 ? sigmaC0dMPa / resistenciaReducidaMPa : Infinity;

  return {
    ejeY,
    ejeZ,
    kc,
    sinInestabilidad: ejeY.lambdaRel <= 0.3 && ejeZ.lambdaRel <= 0.3,
    sigmaC0dMPa,
    resistenciaReducidaMPa,
    aprovechamiento,
    verifica: aprovechamiento <= 1,
  };
}

/* ------------------------------------------------------------------ *
 * 6.1.5 — Compresión perpendicular a la fibra
 * ------------------------------------------------------------------ */

/** Figura 6.2: apoyo corrido bajo la pieza o apoyos aislados. */
export type TipoApoyo = "continuo" | "aislado";

/**
 * kc,90 según el art. 6.1.5(2) a (4).
 *
 * En la planilla es un dato que se teclea con la nota «poner 1,5 si
 * corresponde», y ahí se pierde: kc,90 vale 1,0 salvo que se cumplan las
 * condiciones del articulado, y una de ellas —ℓ1 ≥ 2h— depende de la separación
 * a las cargas vecinas, que es un dato de la estructura y no del apoyo. Se
 * calcula, y si no se cumple la condición se devuelve 1 diciendo por qué.
 *
 * Los valores mayores que 1 sólo están tabulados para coníferas. Con frondosas
 * la norma no da valor, así que se queda en 1.
 */
export interface ResultadoKc90 {
  kc90: number;
  /** Motivo por el que quedó ese valor, para poder mostrarlo. */
  motivo: string;
}

export function kc90(opciones: {
  tipo: TipoMadera;
  conifera: boolean;
  apoyo: TipoApoyo;
  /** Longitud de contacto ℓ, en metros. */
  longitudContactoM: number;
  /** Distancia ℓ1 a la carga o apoyo vecino, en metros. */
  distanciaVecinaM: number;
  cantoM: number;
}): ResultadoKc90 {
  const { tipo, conifera, apoyo, longitudContactoM, distanciaVecinaM, cantoM } = opciones;

  if (!conifera) {
    return { kc90: 1, motivo: "Los valores mayores que 1 sólo están tabulados para coníferas." };
  }
  if (tipo === "LVL") {
    return { kc90: 1, motivo: "El articulado sólo da valores para madera maciza y laminada." };
  }
  if (distanciaVecinaM < 2 * cantoM) {
    // Con coma decimal, como el resto de la aplicación: el motivo se muestra tal
    // cual junto a números que sí pasan por el formateador.
    const m = (v: number) =>
      v.toLocaleString("es-AR", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
    return {
      kc90: 1,
      motivo: `Hace falta ℓ1 ≥ 2h = ${m(2 * cantoM)} m y hay ${m(distanciaVecinaM)} m.`,
    };
  }

  if (apoyo === "continuo") {
    return tipo === "MLE"
      ? { kc90: 1.5, motivo: "Apoyo continuo, laminada de coníferas, art. 6.1.5(3)." }
      : { kc90: 1.25, motivo: "Apoyo continuo, maciza de coníferas, art. 6.1.5(3)." };
  }

  // Apoyos aislados, art. 6.1.5(4).
  if (tipo === "MLE") {
    return longitudContactoM <= 0.4
      ? { kc90: 1.75, motivo: "Apoyos aislados, laminada de coníferas con ℓ ≤ 400 mm, art. 6.1.5(4)." }
      : { kc90: 1.5, motivo: "Apoyos aislados, laminada: con ℓ > 400 mm no se llega a 1,75." };
  }
  return { kc90: 1.5, motivo: "Apoyos aislados, maciza de coníferas, art. 6.1.5(4)." };
}

export interface ResultadoCompresionPerpendicular {
  /** Ensanchamiento del lado del extremo de la pieza, en metros. */
  incrementoExtremoM: number;
  /** Ensanchamiento del lado interior, en metros. */
  incrementoInteriorM: number;
  longitudEficazM: number;
  areaEficazM2: number;
  sigmaC90dMPa: number;
  kc90: number;
  /** kc,90·fc,90,d. */
  resistenciaReducidaMPa: number;
  aprovechamiento: number;
  verifica: boolean;
}

/**
 * Ecs. (6.3) y (6.4), con el área eficaz del art. 6.1.5(1).
 *
 * La longitud de contacto real crece 30 mm a cada lado, pero acotada por lo que
 * hay disponible: del lado del extremo, por el vuelo `a`; del lado interior,
 * por la mitad de la distancia a la carga vecina. Es la parte del articulado
 * que la planilla resuelve con un MIN de cuatro términos difícil de auditar.
 */
export function verificarCompresionPerpendicular(opciones: {
  cargaKN: number;
  anchoApoyoM: number;
  longitudContactoM: number;
  /** Vuelo a: del extremo de la pieza al arranque del apoyo. */
  vueloM: number;
  /** Distancia ℓ1 al apoyo o carga vecina. */
  distanciaVecinaM: number;
  fc90dMPa: number;
  kc90: number;
}): ResultadoCompresionPerpendicular {
  const {
    cargaKN, anchoApoyoM, longitudContactoM: l, vueloM, distanciaVecinaM, fc90dMPa,
  } = opciones;

  const ENSANCHE = 0.03;
  const incrementoExtremoM = Math.max(0, Math.min(ENSANCHE, vueloM, l));
  const incrementoInteriorM = Math.max(0, Math.min(ENSANCHE, distanciaVecinaM / 2, l));

  const longitudEficazM = l + incrementoExtremoM + incrementoInteriorM;
  const areaEficazM2 = anchoApoyoM * longitudEficazM;
  const sigmaC90dMPa = areaEficazM2 > 0 ? cargaKN / (areaEficazM2 * 1000) : Infinity;

  const resistenciaReducidaMPa = opciones.kc90 * fc90dMPa;
  const aprovechamiento =
    resistenciaReducidaMPa > 0 ? sigmaC90dMPa / resistenciaReducidaMPa : Infinity;

  return {
    incrementoExtremoM,
    incrementoInteriorM,
    longitudEficazM,
    areaEficazM2,
    sigmaC90dMPa,
    kc90: opciones.kc90,
    resistenciaReducidaMPa,
    aprovechamiento,
    verifica: aprovechamiento <= 1,
  };
}

/* ------------------------------------------------------------------ *
 * 6.2.2 — Compresión en ángulo con la fibra
 * ------------------------------------------------------------------ */

/**
 * Ec. (6.16): resistencia a compresión con un ángulo α respecto a la fibra.
 *
 * Interpola entre fc,0,d y kc,90·fc,90,d, y no linealmente: el denominador
 * pondera con sen²α y cos²α, de modo que apenas la carga se sale de la
 * dirección de la fibra la resistencia se desploma hacia el valor
 * perpendicular. A 30° ya se perdió la mayor parte del camino.
 */
export function resistenciaEnAnguloMPa(
  fc0dMPa: number,
  fc90dMPa: number,
  kc90Valor: number,
  anguloGrados: number
): number {
  const a = (anguloGrados * Math.PI) / 180;
  const denominador =
    (fc0dMPa / (kc90Valor * fc90dMPa)) * Math.sin(a) ** 2 + Math.cos(a) ** 2;
  return denominador > 0 ? fc0dMPa / denominador : 0;
}
