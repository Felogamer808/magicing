import type { FormaAnclaje } from "@/lib/calc/hormigon/comun/anclaje";
import type { MaterialesDerivados } from "@/lib/calc/hormigon/comun/types";
import {
  calcularVuelosDireccion,
  distribucionPresiones,
  type DistribucionPresiones,
  type ResultadoDireccionZapata,
  type VuelosDireccion,
} from "@/lib/calc/hormigon/cimentaciones/zapata-aislada";
import { calcularTiranteRozamiento, type ResultadoTiranteRozamiento } from "@/lib/calc/hormigon/cimentaciones/tirante-rozamiento";

/**
 * Zapata corrida bajo muro, por metro corrido, según el Anejo 19.
 *
 * Es la rebanada de 1 m de una zapata aislada: el art. 9.8.2 trata igual las
 * "zapatas de pilares y muros", así que los vuelos se arman con el mismo
 * modelo (art. 9.8.2.2, e = 0,15·b dentro de la cara del muro), la misma
 * cuantía mínima (art. 9.2.1.1) y el mismo cortante (art. 6.2.2). El muro puede
 * caer en cualquier posición, incluido contra la medianera. No hay
 * punzonamiento: el muro corre a lo largo de toda la zapata.
 *
 * Reemplaza al cálculo heredado de la planilla (brazo 0,85·d, fyd limitado y
 * mínimos de la EHE-08), por decisión del usuario el 2026-10-06.
 */

/** Todo se calcula por metro corrido de zapata. */
const ANCHO_REFERENCIA_M = 1;

export interface GeometriaZapataCorrida {
  /** Ancho transversal de la zapata (m) */
  A: number;
  /** Canto/espesor (m) */
  H: number;
  /** Espesor del muro (m) */
  anchoPilar: number;
  /** Recubrimiento de la armadura de fundación (m) */
  recubrimiento: number;
  /**
   * Distancia de la cara del muro al borde de inicio de la zapata (m). Si
   * falta, el muro está centrado. 0 = muro contra la medianera.
   */
  distanciaBorde?: number;
}

export interface CargaZapataCorrida {
  /** Carga vertical característica por metro corrido (kN/m) */
  Nk: number;
  /** Momento característico por metro corrido, positivo hacia el borde final (kN·m/m) */
  MkA: number;
}

export interface ArmadoPrincipalCorrida {
  diametroMm: number;
  /** Separación entre barras (m) */
  separacionM: number;
}

export interface ArmadoSecundarioCorrida {
  /** Barras a lo largo del muro, en todo el ancho A */
  numero: number;
  diametroMm: number;
}

export interface DatosZapataCorrida {
  carga: CargaZapataCorrida;
  armadoPrincipal: ArmadoPrincipalCorrida;
  armadoSecundario: ArmadoSecundarioCorrida;
  /** Extremo de las barras principales. Recta si falta. */
  formaAnclaje?: FormaAnclaje;
  /** Par tirante–terreno: la losa tira del muro arriba y el rozamiento lo frena en la base. */
  tirante?: { brazoM: number; phiGrados: number };
}

export interface ResultadoGeotecnicoCorrida {
  /** Peso propio por metro corrido (kN/m) */
  pesoPropioKN: number;
  /** Excentricidad de la resultante, peso propio incluido, positiva hacia el borde final (m). */
  excentricidadM: number;
  /** e ≤ A/6: la zapata apoya entera. */
  dentroDelNucleo: boolean;
  /** Tensión sobre el área eficaz (A − 2e)·1 (kN/m²). */
  sigmaKPa: number;
  verificaTension: boolean;
  /** Presiones características con peso propio, para dibujar. */
  distribucion: DistribucionPresiones;
}

export interface ResultadoArmadoSecundarioCorrida {
  /** Reparto: 20 % de la principal en todo el ancho A, art. 9.3.1.1 (2) (cm²). */
  asNecCm2: number;
  asRealCm2: number;
  verificaAs: boolean;
}

export interface ResultadoZapataCorrida {
  vueloMaxM: number;
  esRigida: boolean;
  muroCentrado: boolean;
  geotecnico: ResultadoGeotecnicoCorrida;
  /** Los dos vuelos, por metro corrido. */
  vuelos: VuelosDireccion;
  /** El vuelo que gobierna (el de mayor momento). */
  principal: ResultadoDireccionZapata;
  /** Armadura principal real (cm²/m). */
  asRealPrincipalCm2PorM: number;
  secundario: ResultadoArmadoSecundarioCorrida;
  /** Sólo con tirante. */
  tirante?: ResultadoTiranteRozamiento;
}

export function calcularZapataCorrida(
  materiales: MaterialesDerivados,
  geometria: GeometriaZapataCorrida,
  sigmaAdmisibleKPa: number,
  datos: DatosZapataCorrida
): ResultadoZapataCorrida {
  const { A, H, anchoPilar, recubrimiento } = geometria;
  const { carga, armadoPrincipal, armadoSecundario } = datos;
  const { Nk, MkA } = carga;

  const borde = geometria.distanciaBorde ?? (A - anchoPilar) / 2;
  const e0 = borde + anchoPilar / 2 - A / 2;
  const muroCentrado = Math.abs(e0) < 1e-9;

  const vueloMaxM = Math.max(borde, A - borde - anchoPilar);
  const esRigida = vueloMaxM <= 2 * H;

  const pesoPropioKN = 25 * A * ANCHO_REFERENCIA_M * H;
  const cargaTotalKN = Nk + pesoPropioKN;

  const tirante = datos.tirante
    ? calcularTiranteRozamiento(materiales, {
        nkKN: Nk, pesoZapataKN: pesoPropioKN, momentoCentroKNm: Nk * e0 + MkA, mkPilarKNm: MkA,
        brazoM: datos.tirante.brazoM, cantoZapataM: H, phiGrados: datos.tirante.phiGrados,
      })
    : undefined;

  // Con tirante el par toma todo el momento y la resultante queda centrada.
  const excentricidadM = tirante ? 0 : cargaTotalKN !== 0 ? (Nk * e0 + MkA) / cargaTotalKN : 0;
  const dentroDelNucleo = Math.abs(excentricidadM) <= A / 6;
  const anchoEficazM = A - 2 * Math.abs(excentricidadM);
  const sigmaKPa = anchoEficazM > 0 ? cargaTotalKN / (anchoEficazM * ANCHO_REFERENCIA_M) : Infinity;
  // Como en la aislada: la resultante tiene que quedar dentro del núcleo central.
  const verificaTension = sigmaKPa <= sigmaAdmisibleKPa && dentroDelNucleo;

  // La armadura principal entra como separación: en la rebanada de 1 m son
  // 1/s barras, con la separación real para el α2 del anclaje.
  const armado = {
    numero: ANCHO_REFERENCIA_M / armadoPrincipal.separacionM,
    diametroMm: armadoPrincipal.diametroMm,
    separacionM: armadoPrincipal.separacionM,
  };
  const d = H - recubrimiento - armadoPrincipal.diametroMm / 2000;
  const vuelos = calcularVuelosDireccion(
    materiales, A, ANCHO_REFERENCIA_M, H, anchoPilar, borde, d, recubrimiento,
    Nk, tirante ? -Nk * e0 : MkA, armado, datos.formaAnclaje ?? "recta"
  );
  const principal = vuelos.fin.momentoKNm >= vuelos.inicio.momentoKNm ? vuelos.fin : vuelos.inicio;
  const asRealPrincipalCm2PorM = principal.asRealCm2;

  // Reparto a lo largo del muro: el 20 % de la principal (art. 9.3.1.1 (2)),
  // el mismo criterio que en la viga centradora.
  const asNecSecundarioCm2 = 0.2 * asRealPrincipalCm2PorM * A;
  const asRealSecundarioCm2 = (armadoSecundario.numero * Math.PI * (armadoSecundario.diametroMm / 10) ** 2) / 4;

  return {
    vueloMaxM,
    esRigida,
    muroCentrado,
    geotecnico: {
      pesoPropioKN,
      excentricidadM,
      dentroDelNucleo,
      sigmaKPa,
      verificaTension,
      distribucion: distribucionPresiones(cargaTotalKN, A, ANCHO_REFERENCIA_M, excentricidadM),
    },
    vuelos,
    principal,
    asRealPrincipalCm2PorM,
    secundario: {
      asNecCm2: asNecSecundarioCm2,
      asRealCm2: asRealSecundarioCm2,
      verificaAs: asRealSecundarioCm2 >= asNecSecundarioCm2,
    },
    tirante,
  };
}
