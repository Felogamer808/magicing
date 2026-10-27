/**
 * La viga libre tal como se edita y se guarda: textos, porque los campos
 * aceptan coma decimal y quedan a medio escribir. Viaja en un solo campo
 * persistido por el mismo motivo que el formulario de vigas: `useCampo` no se
 * puede llamar sobre una lista que cambia de largo.
 */

import type { CasoCarga, DatosVigaLibre, CargaLibre } from "@/lib/calc/estatica/viga-libre";
import type { TipoApoyo } from "@/lib/calc/estatica/viga-continua";
import { aNumero } from "@/lib/verificaciones/formato";

export type TipoCargaLibre = CargaLibre["tipo"];

export interface FilaTramo {
  luz: string;
  /** Apoyo del nudo derecho del tramo. */
  apoyoFinal: TipoApoyo;
  /** Ancho de ese apoyo (m), para llevar M y V a la cara. Opcional: en blanco es el eje. */
  anchoFinal?: string;
}

/**
 * Los cuatro textos sirven a los tres tipos: la distribuida usa todos (desde,
 * hasta, q inicial, q final); la puntual y el momento, sólo x1 y v1.
 */
export interface FilaCarga {
  tipo: TipoCargaLibre;
  caso: CasoCarga;
  x1: string;
  x2: string;
  v1: string;
  v2: string;
}

export interface ModeloVigaLibre {
  apoyoInicial: TipoApoyo;
  anchoInicial?: string;
  tramos: FilaTramo[];
  cargas: FilaCarga[];
}

export const MODELO_POR_DEFECTO: ModeloVigaLibre = {
  apoyoInicial: "simple",
  tramos: [
    { luz: "5", apoyoFinal: "simple" },
    { luz: "5", apoyoFinal: "simple" },
  ],
  cargas: [
    { tipo: "distribuida", caso: "G", x1: "0", x2: "10", v1: "20", v2: "20" },
    { tipo: "distribuida", caso: "Q", x1: "0", x2: "10", v1: "8", v2: "8" },
  ],
};

export function leerModelo(crudo: string): ModeloVigaLibre {
  try {
    const o = JSON.parse(crudo) as Partial<ModeloVigaLibre> | null;
    if (o && Array.isArray(o.tramos) && Array.isArray(o.cargas) && o.apoyoInicial) {
      return o as ModeloVigaLibre;
    }
  } catch {
    // Si lo guardado quedó corrupto se vuelve al modelo por defecto en vez de romper la página.
  }
  return MODELO_POR_DEFECTO;
}

/** Ancho de cada nudo (m); 0 donde no hay dato o el nudo es libre. */
export function anchosDelModelo(modelo: ModeloVigaLibre): number[] {
  const textos = [modelo.anchoInicial, ...modelo.tramos.map((t) => t.anchoFinal)];
  const apoyos = [modelo.apoyoInicial, ...modelo.tramos.map((t) => t.apoyoFinal)];
  return textos.map((t, i) => {
    const a = aNumero(t ?? "");
    return apoyos[i] !== "libre" && Number.isFinite(a) && a > 0 ? a : 0;
  });
}

/** Los datos para el motor, o el motivo por el que todavía no se pueden armar. */
export function datosDelModelo(
  modelo: ModeloVigaLibre,
  eiKNm2: number
): { ok: true; datos: DatosVigaLibre } | { ok: false; motivo: string } {
  const lucesM = modelo.tramos.map((t) => aNumero(t.luz));
  const cargas: CargaLibre[] = modelo.cargas.map((c) => {
    const x1 = aNumero(c.x1);
    const v1 = aNumero(c.v1);
    if (c.tipo === "puntual") return { tipo: "puntual", caso: c.caso, xM: x1, pKN: v1 };
    if (c.tipo === "momento") return { tipo: "momento", caso: c.caso, xM: x1, mKNm: v1 };
    return { tipo: "distribuida", caso: c.caso, desdeM: x1, hastaM: aNumero(c.x2), qInicialKNm: v1, qFinalKNm: aNumero(c.v2) };
  });
  const numeros = [
    ...lucesM,
    ...cargas.flatMap((c) =>
      c.tipo === "distribuida" ? [c.desdeM, c.hastaM, c.qInicialKNm, c.qFinalKNm] : c.tipo === "puntual" ? [c.xM, c.pKN] : [c.xM, c.mKNm]
    ),
  ];
  if (numeros.some((v) => !Number.isFinite(v))) return { ok: false, motivo: "Hay un campo vacío o que no es un número." };
  if (!Number.isFinite(eiKNm2) || eiKNm2 <= 0) {
    return { ok: false, motivo: "El módulo E y la inercia I tienen que ser números positivos." };
  }
  return {
    ok: true,
    datos: { lucesM, apoyos: [modelo.apoyoInicial, ...modelo.tramos.map((t) => t.apoyoFinal)], cargas, eiKNm2 },
  };
}
