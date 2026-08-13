/**
 * Situación de incendio: método de la sección reducida, UNE-EN 1995-1-2:2015
 * art. 4.2.2.
 *
 * La madera es el único material estructural que se verifica a fuego quitando
 * material en vez de bajando tensiones admisibles. La lógica es que la capa
 * carbonizada no resiste pero sí protege: por dentro de la línea de
 * carbonización la madera sigue fría y conserva íntegras su resistencia y su
 * rigidez. Por eso una viga de escuadría generosa aguanta 60 minutos sin
 * ninguna protección, cosa que un perfil de acero desnudo no hace.
 *
 * Las tres piezas del método:
 *
 * 1. **dchar,n = βn·t**, ec. (3.2). Lo que se quemó.
 * 2. **def = dchar,n + k0·d0**, ec. (4.1), con d0 = 7 mm. Además de lo quemado
 *    se descuenta una capa de 7 mm que no está carbonizada pero está caliente,
 *    y a la que se le supone resistencia y rigidez nulas.
 * 3. Sobre la sección que queda se verifica con **kmod,fi = 1,0 y γM,fi = 1,0**,
 *    art. 4.2.2(5) y tabla 2.3 del EC5-1-1: combinación accidental. Y con
 *    resistencias elevadas por kfi, ec. (2.4), que lleva el valor característico
 *    del 5 % al percentil 20.
 *
 * El resultado combinado es contraintuitivo y conviene tenerlo presente: la
 * tensión resistente de cálculo en incendio es bastante **mayor** que en frío
 * —para maciza, 1,25/1,0 contra 0,8/1,3, o sea 2,0 veces— y lo que hace fallar
 * a la pieza es la pérdida de sección, no la pérdida de resistencia del
 * material.
 */

import type { TipoMadera } from "./materiales";

/** Tabla 3.1: velocidad de carbonización ficticia βn, en mm/min. */
export type EspecieFuego =
  | "conifera"
  | "frondosa-ligera"
  | "frondosa-densa"
  | "lvl";

export const BETA_N: Record<EspecieFuego, number> = {
  /** Coníferas y haya: maciza 0,8 y laminada 0,7 (se resuelve en betaN()). */
  conifera: 0.8,
  /** Frondosas con ρk = 290 kg/m³. */
  "frondosa-ligera": 0.7,
  /** Frondosas con ρk ≥ 450 kg/m³. */
  "frondosa-densa": 0.55,
  lvl: 0.7,
};

export const NOMBRE_ESPECIE_FUEGO: Record<EspecieFuego, string> = {
  conifera: "Conífera o haya",
  "frondosa-ligera": "Frondosa, ρk ≈ 290 kg/m³",
  "frondosa-densa": "Frondosa, ρk ≥ 450 kg/m³",
  lvl: "Microlaminada (LVL)",
};

/**
 * Velocidad de carbonización ficticia de la tabla 3.1.
 *
 * La distinción que más se pasa por alto: en coníferas, la **maciza carboniza
 * a 0,8 mm/min y la laminada a 0,7**. Encolar reduce las fendas por las que
 * progresa el frente de llama. Usar 0,7 en una viga de maciza subestima la
 * profundidad carbonizada un 14 %, y eso va directo a agrandar la sección
 * eficaz: del lado inseguro.
 */
export function betaN(tipo: TipoMadera, especie: EspecieFuego): number {
  if (especie === "conifera") return tipo === "maciza" ? 0.8 : 0.7;
  return BETA_N[especie];
}

/** Tabla 2.1 del EC5-1-2. */
export const KFI: Record<TipoMadera, number> = {
  maciza: 1.25,
  MLE: 1.15,
  LVL: 1.15,
};

/** Profundidad de la capa sin resistencia, art. 4.2.2(1). */
export const D0_MM = 7;

/** Tabla 4.1, superficies sin proteger. */
export function k0(tiempoMin: number): number {
  return tiempoMin < 20 ? tiempoMin / 20 : 1;
}

export interface SeccionReducida {
  /** dchar,n = βn·t, ec. (3.2), en metros. */
  profundidadCarbonizadaM: number;
  k0: number;
  /** def = dchar,n + k0·d0, ec. (4.1), en metros. */
  profundidadEficazM: number;
  anchoEficazM: number;
  cantoEficazM: number;
  areaEficazM2: number;
  /** Fracción de área que queda respecto de la sección fría. */
  fraccionAreaRestante: number;
  /** true si la sección se consumió: no queda material que verificar. */
  agotada: boolean;
}

/**
 * Caras expuestas al fuego.
 *
 * En la práctica manda el caso de tres caras: una viga con la losa encima sólo
 * arde por abajo y por los dos costados. Cuatro caras es el pilar exento; dos
 * caras opuestas en anchura, una vigueta empotrada entre forjados.
 */
export interface CarasExpuestas {
  /** Cuántas de las dos caras de la anchura arden: 0, 1 o 2. */
  enAnchura: 0 | 1 | 2;
  /** Ídem para el canto. */
  enCanto: 0 | 1 | 2;
}

export const TRES_CARAS: CarasExpuestas = { enAnchura: 2, enCanto: 1 };
export const CUATRO_CARAS: CarasExpuestas = { enAnchura: 2, enCanto: 2 };

export function seccionReducida(
  anchoM: number,
  cantoM: number,
  tiempoMin: number,
  velocidadMmMin: number,
  caras: CarasExpuestas
): SeccionReducida {
  const factorK0 = k0(tiempoMin);
  const profundidadCarbonizadaM = (velocidadMmMin * tiempoMin) / 1000;
  const profundidadEficazM = profundidadCarbonizadaM + (factorK0 * D0_MM) / 1000;

  const anchoEficazM = anchoM - caras.enAnchura * profundidadEficazM;
  const cantoEficazM = cantoM - caras.enCanto * profundidadEficazM;

  const agotada = anchoEficazM <= 0 || cantoEficazM <= 0;
  const areaEficazM2 = agotada ? 0 : anchoEficazM * cantoEficazM;

  return {
    profundidadCarbonizadaM,
    k0: factorK0,
    profundidadEficazM,
    anchoEficazM: Math.max(anchoEficazM, 0),
    cantoEficazM: Math.max(cantoEficazM, 0),
    areaEficazM2,
    fraccionAreaRestante: anchoM * cantoM > 0 ? areaEficazM2 / (anchoM * cantoM) : 0,
    agotada,
  };
}

/**
 * Resistencia de cálculo en incendio, ecs. (2.4) y (2.6) del EC5-1-2.
 *
 *     fd,fi = kmod,fi · kfi · fk / γM,fi ,  con kmod,fi = γM,fi = 1,0
 *
 * kfi lleva el valor característico —que es el percentil 5— al percentil 20,
 * porque en una situación accidental la probabilidad de que coincidan el
 * incendio y la pieza más floja del lote es despreciable. No es un premio
 * gratuito: es el mismo razonamiento por el que γM baja a 1,0.
 */
export function resistenciaEnIncendioMPa(xkMPa: number, tipo: TipoMadera): number {
  return KFI[tipo] * xkMPa;
}

/**
 * Cuánto sube la tensión resistente al pasar de frío a incendio.
 *
 * Sirve para ponerlo en pantalla, porque es el dato que ordena el resto: si la
 * resistencia sube y la pieza igual falla, el problema es de sección y la
 * solución es engrosar, no cambiar de clase resistente.
 */
export function relacionIncendioFrio(
  tipo: TipoMadera,
  kmodFrio: number,
  gammaMFrio: number
): number {
  const enFrio = kmodFrio / gammaMFrio;
  return enFrio > 0 ? KFI[tipo] / enFrio : Infinity;
}
