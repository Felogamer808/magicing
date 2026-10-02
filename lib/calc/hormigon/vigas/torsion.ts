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
import { GAMMA_C } from "@/lib/calc/hormigon/comun/coeficientes";

/**
 * En la hoja de torsión la separación de estribos se redondea a centímetros
 * enteros, no a múltiplos de 5 cm como en la hoja de vigas simples.
 */
const PASO_SEPARACION_TORSION_M = 0.01;

export interface DatosTorsion {
  /** Momento torsor de cálculo (kN·m) */
  td: number;
  /** Ángulo de las bielas comprimidas (grados). Por defecto 45. */
  thetaGrados?: number;
  /**
   * Distancia del borde exterior al eje de la armadura longitudinal (m). Fija
   * el espesor eficaz mínimo, 2 veces esta distancia (art. 6.3.2 (1)). Sin
   * ella el espesor es A/u a secas.
   */
  distanciaEjeArmaduraM?: number;
}

export interface ResultadoTorsion {
  /** Espesor eficaz adoptado: máx(A/u, 2·c) (m) */
  tM: number;
  /** A/u de la sección (m) */
  tAreaPerimetroM: number;
  /** Mínimo 2·c, dos veces la distancia del borde al eje de la armadura longitudinal (m); 0 si no se dio */
  tMinimoM: number;
  /** Perímetro de la línea media, uk (m) */
  ueM: number;
  /** Área encerrada por la línea media, Ak (m²) */
  aeM2: number;
  /** ν = 0,6·(1 − fck/250), ec. (6.6) */
  nu: number;
  /** TRd,max: máximo torsor que resisten las bielas, ec. (6.30) (kN·m) */
  tRdMaxKNm: number;
  verificaBielas: boolean;
  /** fctd = αct·fctk,0,05/γc, ec. (3.16) (MPa) */
  fctdMPa: number;
  /** TRd,c: torsor de fisuración, con τt = fctd (kN·m) */
  tRdCKNm: number;
  /** Armadura transversal necesaria por torsión (cm²/m) */
  atCm2PorM: number;
  /** Armadura longitudinal total necesaria por torsión, ec. (6.28) (cm²) */
  alCm2: number;
  /** Parte de la armadura longitudinal de torsión que corresponde a cada cara (cm²) */
  alPorCaraCm2: number;
}

export interface ResultadoVigaTorsion {
  /** Canto útil hasta la armadura inferior: momento positivo (m). */
  d: number;
  /** Canto útil hasta la armadura superior: momento negativo y cortante (m). */
  dNegativo: number;
  torsion: ResultadoTorsion;
  flexionPositiva: ResultadoFlexion;
  flexionNegativa: ResultadoFlexion;
  cortante: ResultadoCortante;
  /** Td/TRd,max + Vd/VRd,max — art. 6.3.2 (4), ec. (6.29). No debe pasar de 1. */
  interaccionBielas: number;
  verificaInteraccionBielas: boolean;
  /** Td/TRd,c + Vd/VRd,c — art. 6.3.2 (5), ec. (6.31). */
  interaccionFisuracion: number;
  /** Con la (6.31) ≤ 1 la sección rectangular sólo necesita la armadura mínima. */
  soloArmaduraMinima: boolean;
}

/**
 * Torsión según el modelo de sección hueca equivalente, Anejo 19, art. 6.3.2,
 * págs. 85-86: la sección maciza se sustituye por una de pared delgada de
 * espesor tef y se verifican las bielas (TRd,max) y las armaduras transversal
 * y longitudinal.
 *
 * La planilla seguía la EHE-08, art. 45: Tu1 con α·f1cd = 0,36·fcd, espesor
 * A/u sin mínimo y la longitudinal con la fyd de estribos. Eran otra norma
 * dentro de un módulo EC2; ahora es todo del articulado.
 */
export function calcularTorsion(
  materiales: MaterialesDerivados,
  geometria: GeometriaViga,
  datos: DatosTorsion
): ResultadoTorsion {
  const { b, h } = geometria;
  const { fck, fcd, fyd, fctm, fydEstribos } = materiales;
  const { td, thetaGrados = 45, distanciaEjeArmaduraM = 0 } = datos;

  const theta = (thetaGrados * Math.PI) / 180;
  const cot = 1 / Math.tan(theta);

  // Espesor eficaz: A/u, pero no menos del doble de la distancia del borde al
  // eje de la armadura longitudinal (art. 6.3.2 (1)).
  const tAreaPerimetroM = (b * h) / (2 * b + 2 * h);
  const tMinimoM = 2 * distanciaEjeArmaduraM;
  const tM = Math.max(tAreaPerimetroM, tMinimoM);
  const ueM = 2 * (b - tM) + 2 * (h - tM);
  const aeM2 = (b - tM) * (h - tM);

  // Bielas: TRd,max = 2·ν·αcw·fcd·Ak·tef·sinθ·cosθ, ec. (6.30), con ν de la
  // ec. (6.6) y αcw = 1 sin pretensado.
  const nu = 0.6 * (1 - fck / 250);
  const alphaCw = 1;
  const tRdMaxKNm = 2 * nu * alphaCw * fcd * 1000 * aeM2 * tM * Math.sin(theta) * Math.cos(theta);

  // Torsor de fisuración: τt = fctd en la (6.26), así TRd,c = 2·Ak·tef·fctd.
  // fctd = αct·fctk,0,05/γc con αct = 1 (art. 3.1.6 (2), ec. (3.16)) y
  // fctk,0,05 = 0,7·fctm (tabla 3.1).
  const fctdMPa = (0.7 * fctm) / GAMMA_C;
  const tRdCKNm = 2 * aeM2 * tM * fctdMPa * 1000;

  // Transversal: flujo de cortante Td/(2·Ak) resistido por cercos a fywd.
  const atCm2PorM = (td / (2 * aeM2 * fydEstribos * 1000 * cot)) * 100 ** 2;
  // Longitudinal, ec. (6.28): ΣAsl·fyd/uk = Td·cotθ/(2·Ak), con la fyd de la
  // armadura longitudinal y no la de estribos.
  const alCm2 = ((td * ueM * cot) / (2 * aeM2 * fyd * 1000)) * 100 ** 2;

  return {
    tM,
    tAreaPerimetroM,
    tMinimoM,
    ueM,
    aeM2,
    nu,
    tRdMaxKNm,
    verificaBielas: td <= tRdMaxKNm,
    fctdMPa,
    tRdCKNm,
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
  // Borde exterior → eje de la barra longitudinal más gruesa de las esquinas:
  // recubrimiento + estribo + Ø/2. Con la más gruesa el espesor mínimo es el
  // mayor de los posibles.
  const diametroEsquinaMm = Math.max(datos.armaduraPositiva.diametroMm, datos.armaduraNegativa.diametroMm);
  const distanciaEjeArmaduraM =
    geometria.recubrimiento + geometria.diametroEstriboMm / 1000 + diametroEsquinaMm / 2000;
  const torsion = calcularTorsion(materiales, geometria, { ...datos.torsion, distanciaEjeArmaduraM });
  // Esta hoja sigue con un solo diámetro por cara: se envuelve en un arreglo
  // de un elemento porque el motor de flexión ahora admite varios grupos
  // (capas de Ø distinto), pero acá no hace falta esa opción.
  // Cada momento con su canto útil: d⁺ hasta la armadura inferior para el
  // positivo, d⁻ hasta la superior para el negativo. La planilla usaba d⁺ para
  // los dos. El cortante va con d⁻ porque su ρl ya sale de la armadura
  // superior: se verifica la sección de apoyo, y d y ρl tienen que referirse
  // a la misma armadura de tracción (Anejo 19, art. 6.2.2 (1)).
  const d = calcularCantoUtil(geometria, [datos.armaduraPositiva]);
  const dNegativo = calcularCantoUtil(geometria, [datos.armaduraNegativa]);

  const comunes: Pick<DatosFlexion, "asAdicionalCm2"> = { asAdicionalCm2: torsion.alPorCaraCm2 };

  const flexionPositiva = calcularFlexion(materiales, geometria, d, {
    momento: datos.momentoPositivo,
    armaduraReal: [datos.armaduraPositiva],
    ...comunes,
  });
  const flexionNegativa = calcularFlexion(materiales, geometria, dNegativo, {
    momento: datos.momentoNegativo,
    armaduraReal: [datos.armaduraNegativa],
    ...comunes,
  });

  const cortante = calcularCortante(materiales, geometria, dNegativo, flexionNegativa.asRealCm2, {
    ...datos.cortante,
    a90AdicionalCm2PorM: torsion.atCm2PorM,
    pasoSeparacionM: PASO_SEPARACION_TORSION_M,
  });

  // Las bielas comprimidas son las mismas para los dos esfuerzos, así que no
  // alcanza con que cada uno verifique por separado: el articulado pide que la
  // suma de los dos aprovechamientos no pase de 1 (art. 6.3.2 (4), ec. (6.29),
  // pág. 86). Una viga al 90 % en cada uno pasa las dos comprobaciones sueltas y
  // suma 1,8, y es un caso corriente porque torsión y cortante suelen ser
  // máximos en la misma sección de apoyo.
  const interaccionBielas =
    torsion.tRdMaxKNm > 0 && cortante.vRdMax > 0
      ? datos.torsion.td / torsion.tRdMaxKNm + datos.cortante.vd / cortante.vRdMax
      : 0;

  // Art. 6.3.2 (5), ec. (6.31): en secciones macizas aproximadamente
  // rectangulares, si la suma con los esfuerzos de fisuración no pasa de 1,
  // basta con la armadura mínima. VRd,c es el de la (6.2): el mayor entre
  // la (6.2.a) y su mínimo (6.2.b).
  const vRdCKN = Math.max(cortante.vRdC, cortante.vRdCMin);
  const interaccionFisuracion =
    torsion.tRdCKNm > 0 && vRdCKN > 0 ? datos.torsion.td / torsion.tRdCKNm + datos.cortante.vd / vRdCKN : 0;

  return {
    d,
    dNegativo,
    torsion,
    flexionPositiva,
    flexionNegativa,
    cortante,
    interaccionBielas,
    interaccionFisuracion,
    soloArmaduraMinima: interaccionFisuracion <= 1,
    verificaInteraccionBielas: interaccionBielas <= 1,
  };
}
