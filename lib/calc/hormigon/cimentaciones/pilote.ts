import { GAMMA_F } from "@/lib/calc/hormigon/comun/coeficientes";
import type { MaterialesDerivados } from "@/lib/calc/hormigon/comun/types";

export interface GeometriaPilote {
  /** Diámetro del pilote, circular (m) */
  diametroM: number;
  /** Longitud embebida en el terreno (m) */
  longitudM: number;
}

export interface ParametrosGeotecnicosPilote {
  /** Resistencia unitaria por fuste, promedio en toda la longitud (kN/m²) */
  friccionKPa: number;
  /** Resistencia unitaria de punta (kN/m²) */
  puntaKPa: number;
  /** Factor de seguridad geotécnico global (típico 2 a 3) */
  factorSeguridad: number;
}

export interface ArmaduraPilote {
  numero: number;
  diametroMm: number;
  /** Diámetro de la armadura de zunchado/espiral (informativo, no se computa su efecto de confinamiento) */
  diametroEstriboMm: number;
}

export interface CargaPilote {
  Nk: number;
}

export interface ResultadoGeotecnicoPilote {
  perimetroM: number;
  areaTipM2: number;
  qSkinKN: number;
  qTipKN: number;
  qUltKN: number;
  qAdmisibleKN: number;
  verificaCapacidad: boolean;
}

export interface ResultadoEstructuralPilote {
  areaConcretoCm2: number;
  areaAceroCm2: number;
  nRdKN: number;
  ndKN: number;
  verificaEstructural: boolean;
  asMinCm2: number;
  verificaAsMin: boolean;
}

export interface ResultadoPilote {
  geotecnico: ResultadoGeotecnicoPilote;
  estructural: ResultadoEstructuralPilote;
}

/**
 * Verificación simplificada de un pilote aislado bajo carga axial de compresión:
 * capacidad geotécnica por fuste + punta (fórmula estática clásica, con los
 * valores unitarios de fuste/punta como dato de entrada — no se derivan de
 * ensayos SPT/CPT) y capacidad estructural de la sección de hormigón armado a
 * compresión simple. No incluye pandeo, flexión ni grupo de pilotes (efecto de
 * solape entre pilotes cercanos).
 */
export function calcularPilote(
  materiales: MaterialesDerivados,
  geometria: GeometriaPilote,
  geotecnia: ParametrosGeotecnicosPilote,
  armadura: ArmaduraPilote,
  carga: CargaPilote
): ResultadoPilote {
  const { diametroM, longitudM } = geometria;
  const { friccionKPa, puntaKPa, factorSeguridad } = geotecnia;
  const { numero, diametroMm } = armadura;
  const { Nk } = carga;
  const { fcd, fyd } = materiales;

  const perimetroM = Math.PI * diametroM;
  const areaTipM2 = (Math.PI * diametroM ** 2) / 4;

  const qSkinKN = friccionKPa * perimetroM * longitudM;
  const qTipKN = puntaKPa * areaTipM2;
  const qUltKN = qSkinKN + qTipKN;
  const qAdmisibleKN = qUltKN / factorSeguridad;
  const verificaCapacidad = Nk <= qAdmisibleKN;

  const areaConcretoCm2 = areaTipM2 * 10000;
  const areaAceroCm2 = (numero * Math.PI * (diametroMm / 10) ** 2) / 4;

  // Compresión simple: Nrd = 0.85·fcd·(Ac−As) + fyd·As. Áreas en cm², fcd/fyd en
  // MPa → fuerza en kN mediante el factor 0.1 (1 MPa·1 cm² = 0.1 kN).
  const nRdKN = (0.85 * fcd * (areaConcretoCm2 - areaAceroCm2) + fyd * areaAceroCm2) * 0.1;
  const ndKN = GAMMA_F * Nk;
  const verificaEstructural = ndKN <= nRdKN;

  // EC2 9.5.2(2): As,min = max(0.10·NEd/fyd, 0.002·Ac).
  const asMinCm2 = Math.max(ndKN / fyd, 0.002 * areaConcretoCm2);
  const verificaAsMin = areaAceroCm2 >= asMinCm2;

  return {
    geotecnico: { perimetroM, areaTipM2, qSkinKN, qTipKN, qUltKN, qAdmisibleKN, verificaCapacidad },
    estructural: { areaConcretoCm2, areaAceroCm2, nRdKN, ndKN, verificaEstructural, asMinCm2, verificaAsMin },
  };
}
