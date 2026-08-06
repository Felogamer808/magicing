/**
 * Interacción de flexión y compresión — AISC 360-16, artículo H1.1, por el
 * método ASD.
 *
 * No introduce resistencias nuevas: toma la axial admisible del capítulo E y las
 * dos flexionales del capítulo F, y las combina. Por eso este módulo se apoya en
 * `compresion.ts` y `flexion.ts` en lugar de recalcular nada.
 *
 * La ecuación cambia de forma según cuánto pese la axial: con Pr/Pc ≥ 0,2 manda
 * la ec. H1-1a, con el término de flexión afectado por 8/9; por debajo, la
 * H1-1b, donde la axial entra a la mitad. Las dos son continuas en 0,2.
 */

import { calcularCompresion } from "./compresion";
import {
  calcularFlexionSegunSeccion,
  momentoAdmisibleEjeDebil,
} from "./seleccion-articulo";
import { type Familia, type ParametrosPerfil } from "./perfiles";

export interface DatosFlexoCompresion {
  familia: Familia;
  params: ParametrosPerfil;
  /** Longitud efectiva de pandeo, eje fuerte, en metros. */
  lcxM: number;
  /** Longitud efectiva de pandeo, eje débil, en metros. */
  lcyM: number;
  /** Longitud sin arriostrar para pandeo lateral-torsional, en metros. */
  lbM: number;
  cb: number;
  fyPa: number;
  ePa: number;
  /** Compresión requerida, en kN. */
  pRequeridaKN: number;
  /** Momento requerido alrededor del eje fuerte, en kN·m. */
  mrxKNm: number;
  /** Momento requerido alrededor del eje débil, en kN·m. */
  mryKNm: number;
}

export interface ResultadoFlexoCompresion {
  designacion: string;
  /** Axial admisible del capítulo E, Pc = Pn/Ωc, en kN. */
  pcKN: number;
  /** Momento admisible eje fuerte, Mcx = Mnx/Ωb, en kN·m. */
  mcxKNm: number;
  /** Momento admisible eje débil, Mcy = Mny/Ωb, en kN·m. */
  mcyKNm: number;
  /** Relación Pr/Pc, la que decide qué ecuación aplica. */
  relacionAxial: number;
  ecuacion: "H1-1a" | "H1-1b";
  /** Valor de la interacción: verifica si es ≤ 1. */
  interaccion: number;
  /** Aporte de cada término, para ver qué está mandando. */
  terminos: { axial: number; flexionX: number; flexionY: number };
  verifica: boolean;
  /** Eje de compresión que gobierna, informativo. */
  gobiernaCompresion: "fuerte" | "débil";
  /** Artículo del capítulo F del que salió Mcx. */
  articuloFlexion: "F2" | "F7" | "F8";
  zonaFlexion: string;
}

export function calcularFlexoCompresion(
  datos: DatosFlexoCompresion
): ResultadoFlexoCompresion {
  const comun = {
    familia: datos.familia,
    params: datos.params,
    fyPa: datos.fyPa,
    ePa: datos.ePa,
  };

  const compresion = calcularCompresion({
    ...comun,
    lcxM: datos.lcxM,
    lcyM: datos.lcyM,
  });
  const flexionX = calcularFlexionSegunSeccion({ ...comun, lbM: datos.lbM, cb: datos.cb });
  const mcyKNm = momentoAdmisibleEjeDebil({ ...comun, lbM: datos.lbM, cb: datos.cb });

  const pcKN = compresion.admisibleKN;
  const mcxKNm = flexionX.admisibleKNm;

  const relacionAxial = datos.pRequeridaKN / pcKN;
  const flexionTotal = datos.mrxKNm / mcxKNm + datos.mryKNm / mcyKNm;

  let ecuacion: "H1-1a" | "H1-1b";
  let terminoAxial: number;
  let factorFlexion: number;

  if (relacionAxial >= 0.2) {
    // (H1-1a)
    ecuacion = "H1-1a";
    terminoAxial = relacionAxial;
    factorFlexion = 8 / 9;
  } else {
    // (H1-1b)
    ecuacion = "H1-1b";
    terminoAxial = relacionAxial / 2;
    factorFlexion = 1;
  }
  const interaccion = terminoAxial + factorFlexion * flexionTotal;

  return {
    designacion: compresion.designacion,
    pcKN,
    mcxKNm,
    mcyKNm,
    relacionAxial,
    ecuacion,
    interaccion,
    terminos: {
      axial: terminoAxial,
      flexionX: (factorFlexion * datos.mrxKNm) / mcxKNm,
      flexionY: (factorFlexion * datos.mryKNm) / mcyKNm,
    },
    verifica: interaccion <= 1,
    gobiernaCompresion: compresion.gobierna,
    articuloFlexion: flexionX.articulo,
    // Qué gobierna la flexión: la zona de pandeo lateral-torsional en F2, el
    // estado límite más chico en F7, la clase de pared en F8.
    zonaFlexion:
      flexionX.articulo === "F2"
        ? flexionX.zona
        : flexionX.articulo === "F7"
          ? flexionX.gobierna
          : `pared ${flexionX.clase}`,
  };
}
