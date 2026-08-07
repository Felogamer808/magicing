import { GAMMA_F } from "./coeficientes";
import type { MaterialesDerivados } from "./types";

/** Todo se calcula por metro corrido de zapata. */
const ANCHO_REFERENCIA_M = 1;

export interface GeometriaZapataCorrida {
  /** Ancho transversal de la zapata (m) */
  A: number;
  /** Canto/espesor (m) */
  H: number;
  /** Ancho del muro o de la línea de pilares apoyados (m) */
  anchoPilar: number;
  /** Recubrimiento de la armadura de fundación (m) */
  recubrimiento: number;
}

export interface CargaZapataCorrida {
  /** Carga vertical característica por metro corrido (kN/m) */
  Nk: number;
  /** Momento característico por metro corrido (kN·m/m) */
  MkA: number;
}

export interface ArmadoPrincipalCorrida {
  diametroMm: number;
  /** Separación entre barras (m) */
  separacionM: number;
}

export interface ArmadoSecundarioCorrida {
  /** Barras por metro corrido */
  numero: number;
  diametroMm: number;
}

export interface DatosZapataCorrida {
  carga: CargaZapataCorrida;
  armadoPrincipal: ArmadoPrincipalCorrida;
  armadoSecundario: ArmadoSecundarioCorrida;
}

export interface ResultadoGeotecnicoCorrida {
  /** Peso propio por metro corrido (kN/m) */
  pesoPropioKN: number;
  sigmaKPa: number;
  verificaTension: boolean;
}

export interface ResultadoArmadoPrincipalCorrida {
  sigmaMaxKPa: number;
  sigmaMinKPa: number;
  sigmaCriticaKPa: number;
  lM: number;
  dM: number;
  /** Tracción de cálculo por metro corrido (kN) */
  tdKN: number;
  asCalculadoCm2PorM: number;
  asMinMecanicoCm2PorM: number;
  asMinGeometricoCm2PorM: number;
  asNecCm2PorM: number;
  asRealCm2PorM: number;
  verificaAs: boolean;
  lbIMm: number;
  dmMm: number;
}

export interface ResultadoArmadoSecundarioCorrida {
  /** Armadura de reparto: máx(mínimo geométrico, 20% de la principal) (cm², por metro corrido) */
  asNecCm2: number;
  asRealCm2: number;
  verificaAs: boolean;
}

export interface ResultadoZapataCorrida {
  vueloMaxM: number;
  esRigida: boolean;
  geotecnico: ResultadoGeotecnicoCorrida;
  principal: ResultadoArmadoPrincipalCorrida;
  secundario: ResultadoArmadoSecundarioCorrida;
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
  const { fcd, fyd, fydEstribos, fyk } = materiales;

  const vueloMaxM = (A - anchoPilar) / 2;
  const esRigida = vueloMaxM <= 2 * H;

  const pesoPropioKN = 25 * A * ANCHO_REFERENCIA_M * H;
  const excA = Nk !== 0 ? MkA / Nk : 0;
  const sigmaKPa = (Nk + pesoPropioKN) / ((A - 2 * excA) * ANCHO_REFERENCIA_M);
  const verificaTension = sigmaKPa <= sigmaAdmisibleKPa;

  const d = H - recubrimiento - armadoPrincipal.diametroMm / 2000;

  const w = (ANCHO_REFERENCIA_M * A ** 2) / 6;
  const sigmaMaxKPa = (GAMMA_F * Nk) / (A * ANCHO_REFERENCIA_M) + (GAMMA_F * MkA) / w;
  const sigmaMinKPa = (GAMMA_F * Nk) / (A * ANCHO_REFERENCIA_M) - (GAMMA_F * MkA) / w;
  const lM = A / 2 - anchoPilar / 4;
  const sigmaCriticaKPa = ((sigmaMaxKPa - sigmaMinKPa) / A) * (A / 2 + anchoPilar / 4) + sigmaMinKPa;

  const tdKN =
    (sigmaCriticaKPa * ANCHO_REFERENCIA_M * lM * (lM / 2) +
      (sigmaMaxKPa - sigmaCriticaKPa) * ANCHO_REFERENCIA_M * (lM / 2) * ((2 * lM) / 3)) /
    (0.85 * d);

  // Igual que en la zapata aislada: la tracción de cálculo se pasa a área con el
  // fyd limitado ("fyd ByT"), no con el fyd pleno.
  const asCalculadoCm2PorM = (tdKN / (fydEstribos * 1000)) * 100 ** 2;
  const asMinMecanicoCm2PorM = (100 ** 2 * 0.04 * ANCHO_REFERENCIA_M * H * fcd) / fyd;
  const asMinGeometricoCm2PorM = (100 ** 2 * 0.9 * ANCHO_REFERENCIA_M * H) / 1000;
  const asNecCm2PorM = Math.max(asCalculadoCm2PorM, asMinMecanicoCm2PorM, asMinGeometricoCm2PorM);

  const asRealCm2PorM = (Math.PI * (armadoPrincipal.diametroMm / 10) ** 2) / 4 / armadoPrincipal.separacionM;
  const verificaAsPrincipal = asRealCm2PorM >= asNecCm2PorM;

  const lbIMm = Math.max(1.3 * armadoPrincipal.diametroMm ** 2, (fyk * armadoPrincipal.diametroMm) / 20);
  const dmMm = 12 * armadoPrincipal.diametroMm;

  // Armadura de reparto (secundaria): al menos el mínimo geométrico o el 20% de la principal.
  const asGeoSecundarioCm2 = (100 ** 2 * 0.9 * A * H) / 1000;
  const asNecSecundarioCm2 = Math.max(asGeoSecundarioCm2, 0.2 * asRealCm2PorM * A);
  const asRealSecundarioCm2 = (armadoSecundario.numero * Math.PI * (armadoSecundario.diametroMm / 10) ** 2) / 4;
  const verificaSecundario = asRealSecundarioCm2 >= asNecSecundarioCm2;

  return {
    vueloMaxM,
    esRigida,
    geotecnico: { pesoPropioKN, sigmaKPa, verificaTension },
    principal: {
      sigmaMaxKPa,
      sigmaMinKPa,
      sigmaCriticaKPa,
      lM,
      dM: d,
      tdKN,
      asCalculadoCm2PorM,
      asMinMecanicoCm2PorM,
      asMinGeometricoCm2PorM,
      asNecCm2PorM,
      asRealCm2PorM,
      verificaAs: verificaAsPrincipal,
      lbIMm,
      dmMm,
    },
    secundario: {
      asNecCm2: asNecSecundarioCm2,
      asRealCm2: asRealSecundarioCm2,
      verificaAs: verificaSecundario,
    },
  };
}
