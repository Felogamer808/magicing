/**
 * Viga libre: la que se arma a mano, tramo por tramo, como en el Ftool.
 *
 * El formulario de vigas trae veinte esquemas cerrados. Éste no trae ninguno:
 * se dan las luces, el apoyo de cada nudo y las cargas donde caigan, y el motor
 * de rigidez (`viga-continua.ts`) resuelve lo que salga. Un voladizo es un
 * tramo cuyo extremo queda libre.
 *
 * Cada carga va etiquetada G (permanente) o Q (variable), así la misma viga da
 * los esfuerzos característicos y los de cálculo sin volver a cargarla. Las
 * combinaciones cargan todos los tramos a la vez: la alternancia de la
 * sobrecarga, que es la que da el máximo negativo en apoyos y el positivo en
 * vanos, todavía no está.
 *
 * Las posiciones de las cargas se miden desde el extremo izquierdo de la viga,
 * no del tramo: así una carga puede cruzar un apoyo sin partirla en dos.
 */

import { GAMMA_G, GAMMA_Q } from "@/lib/calc/hormigon/comun/coeficientes";
import {
  calcularVigaContinua,
  type CargaViga,
  type EntradaViga,
  type ResultadoViga,
  type TipoApoyo,
} from "./viga-continua";

export type CasoCarga = "G" | "Q";

/** Una carga del motor con su caso de carga. */
export type CargaLibre = CargaViga & { caso: CasoCarga };

export interface DatosVigaLibre {
  /** Luz de cada tramo, de izquierda a derecha (m). */
  lucesM: readonly number[];
  /** Apoyo de cada nudo: uno más que tramos. "libre" en un extremo es un voladizo. */
  apoyos: readonly TipoApoyo[];
  cargas: readonly CargaLibre[];
  /** Rigidez a flexión E·I (kN·m²), constante en toda la viga. */
  eiKNm2: number;
}

export type IdCombinacionLibre = "G" | "Q" | "servicio" | "elu";

export interface CombinacionLibre {
  id: IdCombinacionLibre;
  nombre: string;
  factorG: number;
  factorQ: number;
  /** La flecha sólo tiene sentido con cargas de servicio. */
  flechaConSentido: boolean;
}

export const COMBINACIONES_LIBRE: readonly CombinacionLibre[] = [
  { id: "elu", nombre: `ELU · ${GAMMA_G.toString().replace(".", ",")}·G + ${GAMMA_Q.toString().replace(".", ",")}·Q`, factorG: GAMMA_G, factorQ: GAMMA_Q, flechaConSentido: false },
  { id: "servicio", nombre: "Servicio · G + Q", factorG: 1, factorQ: 1, flechaConSentido: true },
  { id: "G", nombre: "Sólo G", factorG: 1, factorQ: 0, flechaConSentido: true },
  { id: "Q", nombre: "Sólo Q", factorG: 0, factorQ: 1, flechaConSentido: true },
];

/** Abscisa de cada nudo, desde el extremo izquierdo (m). */
export function abscisasNudos(lucesM: readonly number[]): number[] {
  const xs = [0];
  for (const l of lucesM) xs.push(xs[xs.length - 1] + l);
  return xs;
}

function escalar(carga: CargaLibre, f: number): CargaViga {
  switch (carga.tipo) {
    case "puntual":
      return { tipo: "puntual", xM: carga.xM, pKN: carga.pKN * f };
    case "momento":
      return { tipo: "momento", xM: carga.xM, mKNm: carga.mKNm * f };
    case "distribuida":
      return {
        tipo: "distribuida",
        desdeM: carga.desdeM,
        hastaM: carga.hastaM,
        qInicialKNm: carga.qInicialKNm * f,
        qFinalKNm: carga.qFinalKNm * f,
      };
  }
}

/**
 * Por qué la viga no se puede armar, o null. Lo que el motor ya rechaza (sin
 * apoyos, mecanismo, carga fuera) lo sigue diciendo él; acá va lo propio de
 * cargarla por tramos.
 */
export function validarVigaLibre(datos: DatosVigaLibre): string | null {
  if (datos.lucesM.length === 0) return "Hace falta al menos un tramo.";
  if (datos.lucesM.some((l) => !(l > 0))) return "Cada tramo tiene que tener una luz mayor que cero.";
  if (datos.apoyos.length !== datos.lucesM.length + 1) return "Cada nudo tiene que tener su apoyo.";
  for (const c of datos.cargas) {
    if (c.tipo === "distribuida" && !(c.hastaM > c.desdeM)) {
      return "En una carga distribuida el final tiene que estar después del inicio.";
    }
  }
  return null;
}

/** La viga lista para el motor, con las cargas de una combinación ya mayoradas. */
export function armarVigaLibre(datos: DatosVigaLibre, combinacion: CombinacionLibre): EntradaViga {
  const xs = abscisasNudos(datos.lucesM);
  const cargas: CargaViga[] = [];
  for (const c of datos.cargas) {
    const f = c.caso === "G" ? combinacion.factorG : combinacion.factorQ;
    if (f !== 0) cargas.push(escalar(c, f));
  }
  return {
    largoM: xs[xs.length - 1],
    nodos: xs.map((xM, i) => ({ xM, apoyo: datos.apoyos[i] })),
    cargas,
    eiKNm2: datos.eiKNm2,
  };
}

export interface ResultadoVigaLibre {
  entrada: EntradaViga;
  resultado: ResultadoViga;
}

/** Lanza con el motivo si la viga no se puede resolver. */
export function calcularVigaLibre(datos: DatosVigaLibre, combinacion: CombinacionLibre): ResultadoVigaLibre {
  const motivo = validarVigaLibre(datos);
  if (motivo) throw new Error(motivo);
  const entrada = armarVigaLibre(datos, combinacion);
  return { entrada, resultado: calcularVigaContinua(entrada) };
}
