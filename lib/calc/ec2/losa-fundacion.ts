import type { MaterialesDerivados } from "./types";
import {
  calcularVigaSobreTerreno,
  type ArmadoPrincipalCombinada,
  type ArmadoSecundarioCombinada,
  type ColumnaCombinada,
  type ResultadoVigaSobreTerreno,
} from "./zapata-combinada";

export type { ArmadoPrincipalCombinada, ArmadoSecundarioCombinada, ColumnaCombinada };

export interface GeometriaFranjaLosa {
  /** Longitud de la franja, de punta a punta (m) */
  longitudM: number;
  /** Ancho tributario de la franja (m), típicamente la distancia entre ejes vecinos */
  anchoTributarioM: number;
  H: number;
  recubrimiento: number;
}

export interface DatosFranjaLosa {
  /** Pilares a lo largo de la franja, dos o más, con su posición desde un extremo */
  columnas: ColumnaCombinada[];
  armadoInferior: ArmadoPrincipalCombinada;
  armadoSuperior: ArmadoPrincipalCombinada;
  armadoSecundario: ArmadoSecundarioCombinada;
}

export type ResultadoFranjaLosa = ResultadoVigaSobreTerreno;

/**
 * Verificación simplificada de una losa de fundación por el "método de las
 * franjas": se analiza una franja representativa (una línea de pilares) como
 * una viga sobre el terreno, igual que una zapata combinada pero con el ancho
 * tributario de esa franja en vez del ancho real de una zapata aislada. Para
 * verificar toda la losa hay que repetir esto por cada línea de pilares, en
 * ambas direcciones. Es un método preliminar de mano — no reemplaza un
 * análisis de placa (elementos finitos) para el diseño final.
 */
export function calcularFranjaLosa(
  materiales: MaterialesDerivados,
  geometria: GeometriaFranjaLosa,
  sigmaAdmisibleKPa: number,
  datos: DatosFranjaLosa
): ResultadoFranjaLosa {
  const { longitudM, anchoTributarioM, H, recubrimiento } = geometria;
  const { columnas, armadoInferior, armadoSuperior, armadoSecundario } = datos;
  return calcularVigaSobreTerreno(
    materiales,
    longitudM,
    anchoTributarioM,
    H,
    recubrimiento,
    sigmaAdmisibleKPa,
    columnas,
    armadoInferior,
    armadoSuperior,
    armadoSecundario
  );
}
