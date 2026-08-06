import type {
  ArmaduraElegida,
  DatosCortante,
  DatosFlexion,
  GeometriaViga,
  MaterialesDerivados,
  ResultadoCortante,
  ResultadoFlexion,
} from "./types";
import {
  cortanteMaximoBielas,
  factorEscalaK,
  tensionCortanteBase,
  tensionCortanteMinima,
} from "./cortante";

/** Recubrimiento de estribo asumido (m), fijo según el criterio de oficina de la planilla original. */
const DIAMETRO_ESTRIBO_CALADO_M = 0.006;

function areaBarrasCm2(armadura: ArmaduraElegida): number {
  return (100 ** 2 * armadura.numero * Math.PI * (armadura.diametroMm / 1000) ** 2) / 4;
}

/** Separación libre mínima entre barras (EC2 8.2): el mayor entre el diámetro de barra y 20 mm. */
function separacionMinM(diametroMm: number): number {
  return Math.max(diametroMm, 20) / 1000;
}

/**
 * Reparte "numero" barras en tantas filas como haga falta para que cada fila
 * respete la separación mínima dentro del ancho disponible. Las filas más
 * cercanas a la fibra traccionada (índice 0) se llenan primero.
 */
function distribuirEnCapas(numero: number, capacidadPorFila: number): number[] {
  const capacidad = Math.max(1, capacidadPorFila);
  const numCapas = Math.max(1, Math.ceil(numero / capacidad));
  const base = Math.floor(numero / numCapas);
  const resto = numero % numCapas;
  return Array.from({ length: numCapas }, (_, i) => base + (i < resto ? 1 : 0));
}

export interface DisposicionArmadura {
  /** Barras por fila, de la más cercana a la fibra traccionada hacia adentro. */
  capas: number[];
  /** Máximo de barras que entran en una fila dado el ancho disponible. */
  capacidadPorFila: number;
  /** Distancia desde la fibra traccionada extrema al centroide de la armadura (m). */
  distanciaCentroideM: number;
  verificaEntraEnAncho: boolean;
}

/**
 * Calcula en cuántas filas hay que distribuir la armadura elegida (cuando no
 * entra en una sola fila por la separación mínima entre barras) y la
 * distancia al centroide resultante, que es lo que efectivamente define el
 * canto útil cuando hay más de una capa.
 */
export function calcularDisposicionArmadura(
  geometria: GeometriaViga,
  armadura: ArmaduraElegida
): DisposicionArmadura {
  const { b, recubrimiento } = geometria;
  const diametroM = armadura.diametroMm / 1000;
  const sMin = separacionMinM(armadura.diametroMm);

  const anchoDisponible = b - 2 * (recubrimiento + DIAMETRO_ESTRIBO_CALADO_M);
  const capacidadPorFila =
    anchoDisponible > 0 ? Math.floor((anchoDisponible + sMin) / (diametroM + sMin)) : 0;

  const capas = distribuirEnCapas(armadura.numero, capacidadPorFila);

  const sumaPonderada = capas.reduce((acc, nCapa, i) => {
    const distanciaCapa = recubrimiento + DIAMETRO_ESTRIBO_CALADO_M + diametroM / 2 + i * (diametroM + sMin);
    return acc + nCapa * distanciaCapa;
  }, 0);

  return {
    capas,
    capacidadPorFila,
    distanciaCentroideM: sumaPonderada / armadura.numero,
    verificaEntraEnAncho: capacidadPorFila >= 1,
  };
}

/**
 * Canto útil de la sección. Se calcula una sola vez a partir de la armadura
 * positiva (considerando si hace falta más de una capa) y se reutiliza tanto
 * para el cálculo a flexión negativa como para cortante — así lo hace la
 * planilla original (mismo criterio simplificado).
 */
export function calcularCantoUtil(geometria: GeometriaViga, armaduraPositiva: ArmaduraElegida): number {
  return geometria.h - calcularDisposicionArmadura(geometria, armaduraPositiva).distanciaCentroideM;
}

export function calcularFlexion(
  materiales: MaterialesDerivados,
  geometria: GeometriaViga,
  d: number,
  datos: DatosFlexion
): ResultadoFlexion {
  const { b, h } = geometria;
  const { fcd, fyd } = materiales;
  const { momento, armaduraReal, asAdicionalCm2 = 0 } = datos;

  const mu = momento / (b * d ** 2 * fcd * 1000);
  const omega = 1 - Math.sqrt(1 - 2 * mu);
  const asCalculadoCm2 = (100 ** 2 * omega * b * d * fcd) / fyd;

  // As mínimo mecánico y geométrico (criterio de oficina, aplicado por igual
  // a armadura positiva y negativa: el mínimo no depende del signo del momento).
  const asMinMecanicoCm2 = (100 ** 2 * 0.045 * b * d * fcd) / fyd;
  const asMinGeometricoCm2 = 100 ** 2 * (2.8 / 1000) * b * h;

  // La armadura de torsión se suma a la de flexión (no se toma el máximo): son
  // esfuerzos concomitantes que traccionan las mismas barras.
  const asNecCm2 = Math.max(asCalculadoCm2, asMinMecanicoCm2, asMinGeometricoCm2) + asAdicionalCm2;
  const asRealCm2 = areaBarrasCm2(armaduraReal);
  const aprovechamiento = asNecCm2 / asRealCm2;
  const verificaAs = asRealCm2 >= asNecCm2;

  const disposicion = calcularDisposicionArmadura(geometria, armaduraReal);

  // Geometría del agotamiento, para poder dibujarlo: ω·d = 0,8·x y z = d·(1 − ω/2).
  const xM = (omega * d) / 0.8;
  const zM = d * (1 - omega / 2);
  const deformacionAcero = xM > 0 ? (0.0035 * (d - xM)) / xM : Infinity;

  return {
    d,
    mu,
    omega,
    xM,
    zM,
    deformacionAcero,
    asCalculadoCm2,
    asMinMecanicoCm2,
    asMinGeometricoCm2,
    asNecCm2,
    asRealCm2,
    aprovechamiento,
    verificaAs,
    capas: disposicion.capas,
    capacidadPorFila: disposicion.capacidadPorFila,
    distanciaCentroideM: disposicion.distanciaCentroideM,
    verificaEntraEnAncho: disposicion.verificaEntraEnAncho,
  };
}

function separacionMaxM(ratioVdVRdMax: number, d: number): number {
  if (ratioVdVRdMax <= 0.2) return Math.min(0.75 * d, 0.6);
  if (ratioVdVRdMax > 2 / 3) return Math.min(0.3 * d, 0.3);
  return Math.min(0.6 * d, 0.45);
}

/** Redondea la separación de estribos hacia abajo al múltiplo de `paso` más cercano. */
function redondearSeparacionM(valor: number, paso: number): number {
  return Math.floor(valor / paso + 1e-9) * paso;
}

export function calcularCortante(
  materiales: MaterialesDerivados,
  geometria: GeometriaViga,
  d: number,
  /** As real de la armadura negativa (superior) — es la traccionada en la sección crítica de apoyo. */
  asNegativaRealCm2: number,
  datos: DatosCortante
): ResultadoCortante {
  const { b } = geometria;
  const { fck, fcd, fctm, fydEstribos } = materiales;
  const { vd, diametroEstriboMm, numeroRamas, a90AdicionalCm2PorM = 0, pasoSeparacionM = 0.05 } = datos;

  const vRdMax = cortanteMaximoBielas(fcd, b, d);
  const verificaVRdMax = vd <= vRdMax;

  const k = factorEscalaK(d);
  const rhoL = Math.min(asNegativaRealCm2 / (100 ** 2 * b * d), 0.02);

  // La planilla traía C_Rd,c = 0,15/γc y v_min = 0,075/γc·k^1,5·√fck. El segundo
  // es el mínimo de la EHE-08, la norma anterior, y el primero no es de ninguna
  // de las dos. Con cuantías bajas manda el mínimo, y ahí esa mezcla devolvía
  // hasta un 43 % más de resistencia que el articulado: se unifica contra el
  // Anejo 19, art. 6.2.2, ec. (6.2.a) y (6.2.b), pág. 76, que es lo que ya
  // usaban las cimentaciones.
  const vRdC = tensionCortanteBase(k, rhoL, fck) * b * d * 1000;
  const vRdCMin = tensionCortanteMinima(k, fck) * b * d * 1000;

  const vEdEstribos = Math.max(vd - Math.max(vRdC, vRdCMin), 0);

  const a90NecCm2PorM = (vEdEstribos * 10) / (fydEstribos * 0.9 * d);
  const a90MinCm2PorM = (fctm * b * 100 ** 2) / (7.5 * fydEstribos);
  // La armadura transversal de torsión se suma a la de cortante: ambas traccionan
  // los mismos cercos.
  const a90Cm2PorM = Math.max(a90NecCm2PorM, a90MinCm2PorM) + a90AdicionalCm2PorM;

  const aEstriboCm2 =
    (100 ** 2 * numeroRamas * Math.PI * (diametroEstriboMm / 1000) ** 2) / 4;
  const separacionNecM = aEstriboCm2 / a90Cm2PorM;

  const ratio = vd / vRdMax;
  const sepMax = separacionMaxM(ratio, d);
  const separacionAdoptadaM = Math.min(
    redondearSeparacionM(Math.min(sepMax, separacionNecM), pasoSeparacionM),
    0.25
  );

  const areaRealCm2PorM = aEstriboCm2 / separacionAdoptadaM;

  return {
    vRdMax,
    verificaVRdMax,
    k,
    rhoL,
    vRdC,
    vRdCMin,
    vEdEstribos,
    a90NecCm2PorM,
    a90MinCm2PorM,
    a90Cm2PorM,
    aEstriboCm2,
    separacionNecM,
    separacionMaxM: sepMax,
    separacionAdoptadaM,
    areaRealCm2PorM,
  };
}
