/**
 * La viga libre tal como se edita y se guarda: textos, porque los campos
 * aceptan coma decimal y quedan a medio escribir. Viaja en un solo campo
 * persistido por el mismo motivo que el formulario de vigas: `useCampo` no se
 * puede llamar sobre una lista que cambia de largo.
 */

import type { CasoCarga, DatosVigaLibre, CargaLibre } from "@/lib/calc/estatica/viga-libre";
import type { TipoApoyo } from "@/lib/calc/estatica/viga-continua";
import { moduloSecanteGPa } from "@/lib/calc/hormigon/comun/materiales";
import { propiedadesT, type TipoSeccion } from "@/lib/calc/hormigon/vigas/seccion-t";
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

/**
 * La sección de la viga, en los mismos campos y unidades que la verificación
 * de vigas, para mandarlos tal cual. Con T, b es el alma y el ala va aparte.
 */
export interface SeccionVigaLibre {
  tipoSeccion: TipoSeccion;
  b: string;
  h: string;
  anchoAla: string;
  espesorAla: string;
  fck: string;
}

export interface RigidezSeccion {
  /** Ecm, Anejo 19, art. 3.1.3, tabla A19.3.1 (GPa). */
  eGPa: number;
  /** Inercia bruta de la sección de hormigón, sin fisurar (m⁴). */
  inerciaM4: number;
  eiKNm2: number;
  /** Por qué no se puede calcular, o null. */
  motivo: string | null;
}

/**
 * EI de la viga con la sección bruta y Ecm (criterio del usuario, 2026-10-27).
 * Sólo escala la flecha: con EI constante, reacciones, V y M no dependen de
 * ella. La flecha con fisuración se verifica aparte, en deformaciones.
 */
export function rigidezDeSeccion(s: SeccionVigaLibre): RigidezSeccion {
  const b = aNumero(s.b);
  const h = aNumero(s.h);
  const fck = aNumero(s.fck);
  const ala = aNumero(s.anchoAla);
  const hf = aNumero(s.espesorAla);
  const conAla = s.tipoSeccion !== "rectangular";

  let motivo: string | null = null;
  if (!(b > 0 && h > 0)) motivo = "Falta b o h de la sección.";
  else if (conAla && !(ala >= b && hf > 0 && hf < h))
    motivo = "El ala tiene que ser al menos tan ancha como el alma, con hf entre 0 y h.";
  else if (!(fck > 0)) motivo = "Falta el fck del hormigón.";

  const inerciaM4 = motivo ? NaN : conAla ? propiedadesT(b, h, ala, hf).inerciaM4 : (b * h ** 3) / 12;
  const eGPa = fck > 0 ? moduloSecanteGPa(fck) : NaN;
  // E en GPa son 10⁶ kN/m².
  return { eGPa, inerciaM4, eiKNm2: eGPa * 1e6 * inerciaM4, motivo };
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
