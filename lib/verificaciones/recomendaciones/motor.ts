/**
 * Recomendaciones para resolver una comprobación que no cumple o que queda
 * justa.
 *
 * Una recomendación no es texto: es un cambio concreto en los datos que se
 * vuelve a calcular entero, y se propone sólo si con ese cambio la
 * comprobación pasa. Así "H = 0,40 m" viene con la utilización que deja y con
 * lo que pasa con el resto de las comprobaciones, que es lo que decide si el
 * cambio sirve o sólo mueve el problema de lugar.
 *
 * Cada verificación declara sus palancas —qué dato se puede mover, en qué
 * pasos y en qué orden de efectividad— y este motor hace la búsqueda: por
 * cada palanca, el primer paso que alcanza. No sabe nada de hormigón.
 */

/**
 * Utilización desde la que una comprobación queda justa: cumple, pero un
 * cambio chico la deja al límite. Es el mismo umbral del aviso "queda poco
 * margen" de la barra de utilización.
 */
export const AL_LIMITE = 0.9;

export interface Recomendacion {
  /** El cambio, escrito con el valor nuevo y el de hoy: "H = 0,40 m (hoy 0,30 m)". */
  accion: string;
  /** Utilización de la comprobación con el cambio aplicado. */
  utilizacion: number;
  /**
   * Comprobaciones que hoy cumplen y con el cambio dejarían de cumplir. Las que
   * ya fallaban no cuentan: el cambio no las rompe, sólo no las arregla.
   */
  fallanOtras: string[];
  /** Lo que el cambio arrastra y no se ve en el número: más excavación, más acero. */
  efectoColateral?: string;
  /** Artículo de la norma del que depende el efecto. */
  cita?: string;
}

/** Un paso de una palanca: los datos con el cambio y cómo se dice. */
export interface Candidato<D> {
  datos: D;
  accion: string;
}

/** Un dato que se puede mover para resolver la comprobación. */
export interface Palanca<D> {
  /** Pasos en orden creciente de cambio: se propone el primero que alcanza. */
  candidatos: (datos: D) => Iterable<Candidato<D>>;
  efectoColateral?: string;
  cita?: string;
}

/** El cálculo completo de una verificación, visto desde el motor. */
export interface Problema<D, R, K extends string> {
  datos: D;
  /** El cálculo entero. `null` si los datos no son válidos. */
  calcular: (datos: D) => R | null;
  /**
   * Utilización de cada comprobación: demanda sobre capacidad, menor o igual
   * a 1 cuando cumple. Se omite la que no aplica con esos datos.
   */
  utilizaciones: (resultado: R) => Partial<Record<K, number>>;
  /** Nombre de cada comprobación, para decir cuáles fallan con el cambio. */
  nombres: Record<K, string>;
}

/** Cuántas propuestas se muestran por comprobación. */
const MAXIMO = 3;

/** Utilización que tiene que alcanzar el cambio: cumplir si falla, salir de la zona justa si está justa. */
function objetivo(utilizacionActual: number): (u: number) => boolean {
  return utilizacionActual > 1 ? (u) => u <= 1 : (u) => u < AL_LIMITE;
}

function calcularSeguro<D, R>(calcular: (d: D) => R | null, datos: D): R | null {
  try {
    return calcular(datos);
  } catch {
    return null;
  }
}

/**
 * Propuestas para una comprobación, recalculadas.
 *
 * Vacío si la comprobación cumple con margen, si no aplica, o si ninguna
 * palanca alcanza dentro de sus pasos. Primero van las que resuelven todo;
 * entre ellas, el orden de las palancas, que es el de efectividad que decidió
 * quien las declaró.
 */
export function recomendar<D, R, K extends string>(
  problema: Problema<D, R, K>,
  clave: K,
  palancas: readonly Palanca<D>[],
  resultadoActual?: R | null
): Recomendacion[] {
  const actual = resultadoActual ?? calcularSeguro(problema.calcular, problema.datos);
  if (!actual) return [];
  const us0 = problema.utilizaciones(actual);
  const u0 = us0[clave];
  if (u0 === undefined || !(u0 >= AL_LIMITE)) return [];
  const alcanza = objetivo(u0);

  const propuestas: Recomendacion[] = [];
  for (const palanca of palancas) {
    for (const candidato of palanca.candidatos(problema.datos)) {
      const r = calcularSeguro(problema.calcular, candidato.datos);
      if (!r) continue;
      const us = problema.utilizaciones(r);
      const u = us[clave];
      if (u === undefined || !Number.isFinite(u) || !alcanza(u)) continue;
      const fallanOtras = (Object.keys(us) as K[])
        .filter((k) => k !== clave && (us[k] ?? 0) > 1 && !((us0[k] ?? 0) > 1))
        .map((k) => problema.nombres[k]);
      propuestas.push({
        accion: candidato.accion,
        utilizacion: u,
        fallanOtras,
        ...(palanca.efectoColateral ? { efectoColateral: palanca.efectoColateral } : {}),
        ...(palanca.cita ? { cita: palanca.cita } : {}),
      });
      break;
    }
  }

  // Orden estable: las que no rompen nada primero, el resto como vinieron.
  return propuestas
    .map((p, i) => ({ p, i }))
    .sort((a, b) => Number(a.p.fallanOtras.length > 0) - Number(b.p.fallanOtras.length > 0) || a.i - b.i)
    .slice(0, MAXIMO)
    .map(({ p }) => p);
}

/** Valores de `desde + paso` a `hasta`, redondeados para no arrastrar 0,30000000000000004. */
export function* pasos(desde: number, paso: number, hasta: number, decimales = 3): Generator<number> {
  const f = 10 ** decimales;
  for (let i = 1; ; i++) {
    const v = Math.round((desde + i * paso) * f) / f;
    if (v > hasta + 1e-9) return;
    yield v;
  }
}

/** Clases resistentes habituales del hormigón, en MPa (Anejo 19, tabla 3.1). */
export const CLASES_FCK = [25, 30, 35, 40, 45, 50] as const;
