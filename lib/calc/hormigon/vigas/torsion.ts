import type {
  ArmaduraElegida,
  DatosCortante,
  DatosFlexion,
  GeometriaViga,
  MaterialesDerivados,
  ResultadoCortante,
  ResultadoFlexion,
} from "@/lib/calc/hormigon/comun/types";
import { calcularCantoUtil, calcularCortante, calcularFlexion } from "@/lib/calc/hormigon/vigas/flexion-cortante";

/**
 * En la hoja de torsión la separación de estribos se redondea a centímetros
 * enteros, no a múltiplos de 5 cm como en la hoja de vigas simples.
 */
const PASO_SEPARACION_TORSION_M = 0.01;

export interface DatosTorsion {
  /** Momento torsor de cálculo (kN·m) */
  td: number;
  /** Coeficiente de reducción de la resistencia de las bielas. Por defecto 0.6. */
  alpha?: number;
  /** Ángulo de las bielas comprimidas (grados). Por defecto 45. */
  thetaGrados?: number;
}

export interface ResultadoTorsion {
  /** Espesor eficaz de la sección hueca equivalente, t = A/u (m) */
  tM: number;
  /** Perímetro de la línea media de la sección hueca equivalente (m) */
  ueM: number;
  /** Área encerrada por la línea media (m²) */
  aeM2: number;
  /** Resistencia a compresión oblicua del hormigón en torsión (MPa) */
  f1cdMPa: number;
  /** Máximo torsor que resisten las bielas comprimidas (kN·m) */
  tu1KNm: number;
  verificaBielas: boolean;
  /** Armadura transversal necesaria por torsión (cm²/m) */
  atCm2PorM: number;
  /** Armadura longitudinal total necesaria por torsión, repartida en el perímetro (cm²) */
  alCm2: number;
  /** Parte de la armadura longitudinal de torsión que corresponde a cada cara (cm²) */
  alPorCaraCm2: number;
}

export interface ResultadoVigaTorsion {
  d: number;
  torsion: ResultadoTorsion;
  flexionPositiva: ResultadoFlexion;
  flexionNegativa: ResultadoFlexion;
  cortante: ResultadoCortante;
  /** Td/Tu1 + Vd/VRd,max — art. 6.3.2(4), ec. (6.29). No debe pasar de 1. */
  interaccionBielas: number;
  verificaInteraccionBielas: boolean;
}

/**
 * Torsión según el modelo de sección hueca equivalente (EHE art. 45 / EC2 6.3):
 * se sustituye la sección maciza por un tubo de pared delgada de espesor
 * t = A/u, y se verifican por separado las bielas comprimidas (Tu1), la
 * armadura transversal (Tu2) y la longitudinal (Tu3).
 */
export function calcularTorsion(
  materiales: MaterialesDerivados,
  geometria: GeometriaViga,
  datos: DatosTorsion
): ResultadoTorsion {
  const { b, h } = geometria;
  const { fcd, fydEstribos } = materiales;
  const { td, alpha = 0.6, thetaGrados = 45 } = datos;

  const theta = (thetaGrados * Math.PI) / 180;
  const cot = 1 / Math.tan(theta);

  const tM = (b * h) / (2 * b + 2 * h);
  const ueM = 2 * (b - tM) + 2 * (h - tM);
  const aeM2 = (b - tM) * (h - tM);

  const f1cdMPa = 0.6 * fcd;
  const tu1KNm = (2 * alpha * f1cdMPa * 1000 * aeM2 * tM * cot) / (1 + cot ** 2);

  const atCm2PorM = (td / (2 * aeM2 * fydEstribos * 1000 * cot)) * 100 ** 2;
  const alCm2 = ((td * ueM) / (2 * aeM2 * fydEstribos * 1000 * Math.tan(theta))) * 100 ** 2;

  return {
    tM,
    ueM,
    aeM2,
    f1cdMPa,
    tu1KNm,
    verificaBielas: td <= tu1KNm,
    atCm2PorM,
    alCm2,
    alPorCaraCm2: alCm2 / 4,
  };
}

/**
 * Viga sometida a flexión, cortante y torsión concomitantes. La torsión se
 * calcula primero y sus aportes se suman a la armadura de flexión (un cuarto de
 * Al en cada cara) y a la transversal de cortante (At sobre A90).
 */
export function calcularVigaConTorsion(
  materiales: MaterialesDerivados,
  geometria: GeometriaViga,
  datos: {
    torsion: DatosTorsion;
    armaduraPositiva: ArmaduraElegida;
    armaduraNegativa: ArmaduraElegida;
    momentoPositivo: number;
    momentoNegativo: number;
    cortante: Omit<DatosCortante, "a90AdicionalCm2PorM" | "pasoSeparacionM">;
  }
): ResultadoVigaTorsion {
  const torsion = calcularTorsion(materiales, geometria, datos.torsion);
  // Esta hoja sigue con un solo diámetro por cara: se envuelve en un arreglo
  // de un elemento porque el motor de flexión ahora admite varios grupos
  // (capas de Ø distinto), pero acá no hace falta esa opción.
  const d = calcularCantoUtil(geometria, [datos.armaduraPositiva]);

  const comunes: Pick<DatosFlexion, "asAdicionalCm2"> = { asAdicionalCm2: torsion.alPorCaraCm2 };

  const flexionPositiva = calcularFlexion(materiales, geometria, d, {
    momento: datos.momentoPositivo,
    armaduraReal: [datos.armaduraPositiva],
    ...comunes,
  });
  const flexionNegativa = calcularFlexion(materiales, geometria, d, {
    momento: datos.momentoNegativo,
    armaduraReal: [datos.armaduraNegativa],
    ...comunes,
  });

  const cortante = calcularCortante(materiales, geometria, d, flexionNegativa.asRealCm2, {
    ...datos.cortante,
    a90AdicionalCm2PorM: torsion.atCm2PorM,
    pasoSeparacionM: PASO_SEPARACION_TORSION_M,
  });

  // Las bielas comprimidas son las mismas para los dos esfuerzos, así que no
  // alcanza con que cada uno verifique por separado: el articulado pide que la
  // suma de los dos aprovechamientos no pase de 1 (art. 6.3.2(4), ec. (6.29),
  // pág. 86). Una viga al 90 % en cada uno pasa las dos comprobaciones sueltas y
  // suma 1,8, y es un caso corriente porque torsión y cortante suelen ser
  // máximos en la misma sección de apoyo.
  //
  // Se usa el Tu1 que ya calcula y muestra el motor, que es el de la EHE-08 y
  // vale un 68 % del T_Rd,max del articulado: la comprobación queda del lado
  // seguro y coherente con el número que ve el usuario en pantalla.
  const interaccionBielas =
    torsion.tu1KNm > 0 && cortante.vRdMax > 0
      ? datos.torsion.td / torsion.tu1KNm + datos.cortante.vd / cortante.vRdMax
      : 0;

  return {
    d,
    torsion,
    flexionPositiva,
    flexionNegativa,
    cortante,
    interaccionBielas,
    verificaInteraccionBielas: interaccionBielas <= 1,
  };
}
