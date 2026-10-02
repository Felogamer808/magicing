import type {
  ArmaduraElegida,
  DatosCortante,
  DatosFlexion,
  FilaArmadura,
  GeometriaViga,
  MaterialesDerivados,
  ResultadoCortante,
  ResultadoFlexion,
} from "@/lib/calc/hormigon/comun/types";
import {
  cortanteMaximoBielas,
  factorEscalaK,
  tensionCortanteBase,
  tensionCortanteMinima,
} from "@/lib/calc/hormigon/comun/cortante";
import { areaBarraCm2 } from "@/lib/calc/armaduras";
import { EPSILON_CU3, ES_MPA, LAMBDA_BLOQUE } from "@/lib/calc/hormigon/comun/coeficientes";
import { armaduraMinimaTraccionCm2, resistenciaFlexotraccionMPa } from "@/lib/calc/hormigon/comun/cuantias";

/** Separación libre mínima entre barras (EC2 8.2): el mayor entre el diámetro de barra y 20 mm. */
function separacionMinM(diametroMm: number): number {
  return Math.max(diametroMm, 20) / 1000;
}

/**
 * Reparte "numero" barras del mismo diámetro en tantas filas como haga falta
 * para que cada una respete la separación mínima dentro del ancho disponible.
 * Las filas más cercanas a la fibra traccionada (índice 0) se llenan primero.
 */
function distribuirEnCapas(numero: number, capacidadPorFila: number): number[] {
  const capacidad = Math.max(1, capacidadPorFila);
  const numCapas = Math.max(1, Math.ceil(numero / capacidad));
  const base = Math.floor(numero / numCapas);
  const resto = numero % numCapas;
  return Array.from({ length: numCapas }, (_, i) => base + (i < resto ? 1 : 0));
}

export interface DisposicionArmadura {
  /** Filas físicas, ya repartidas y ordenadas de la fibra traccionada hacia adentro. */
  filas: FilaArmadura[];
  /** Capacidad por fila de cada grupo cargado, según su propio diámetro. */
  capacidadPorGrupo: number[];
  /** Distancia desde la fibra traccionada extrema al centroide de toda la armadura (m). */
  distanciaCentroideM: number;
  areaTotalCm2: number;
  /** Todos los grupos entran en el ancho disponible (aunque sea repartidos en varias filas). */
  verificaEntraEnAncho: boolean;
}

/**
 * Reparte los grupos de armadura cargados (cada uno con su propio número y
 * diámetro — dos capas de Ø distinto, por ejemplo) en filas físicas.
 *
 * Cada grupo se expande primero en tantas filas del mismo diámetro como haga
 * falta para entrar en el ancho disponible (igual que antes, cuando sólo
 * existía un diámetro). Después las filas de todos los grupos se apilan en el
 * orden en que se cargaron, y la separación libre vertical entre dos filas
 * consecutivas usa el mayor de los dos diámetros en juego —el mismo criterio
 * que ya aplica la segunda capa del tirante en `apeo-bielas.ts`, art. 8.2(2):
 * "se toma el mayor diámetro en juego porque es el que manda entre dos barras
 * distintas".
 *
 * El centroide pondera por área, no por cantidad de barras: con diámetros
 * mezclados una barra más gruesa pesa más, y ponderar por cantidad daría un
 * canto útil optimista.
 */
export function calcularDisposicionArmadura(
  geometria: GeometriaViga,
  grupos: readonly ArmaduraElegida[]
): DisposicionArmadura {
  const { b, recubrimiento } = geometria;
  // La planilla asumía siempre un estribo de 6 mm, aunque el formulario pide
  // el diámetro: con Ø10 el canto útil salía 4 mm optimista.
  const estriboM = geometria.diametroEstriboMm / 1000;
  const anchoDisponible = b - 2 * (recubrimiento + estriboM);

  const capacidadPorGrupo = grupos.map((g) => {
    const diametroM = g.diametroMm / 1000;
    const sMin = separacionMinM(g.diametroMm);
    return anchoDisponible > 0 ? Math.floor((anchoDisponible + sMin) / (diametroM + sMin)) : 0;
  });

  const filasSinUbicar = grupos.flatMap((g, i) =>
    distribuirEnCapas(g.numero, capacidadPorGrupo[i]).map((numero) => ({ numero, diametroMm: g.diametroMm }))
  );

  let bordeM = recubrimiento + estriboM;
  let sumaPonderadaM = 0;
  let areaTotalCm2 = 0;

  const filas: FilaArmadura[] = filasSinUbicar.map((fila, i) => {
    const diametroM = fila.diametroMm / 1000;
    if (i > 0) {
      const anterior = filasSinUbicar[i - 1];
      const sVerticalM = Math.max(fila.diametroMm, anterior.diametroMm, 20) / 1000;
      bordeM += anterior.diametroMm / 1000 + sVerticalM;
    }
    const distanciaM = bordeM + diametroM / 2;
    const areaFilaCm2 = fila.numero * areaBarraCm2(fila.diametroMm);
    sumaPonderadaM += areaFilaCm2 * distanciaM;
    areaTotalCm2 += areaFilaCm2;
    return { numero: fila.numero, diametroMm: fila.diametroMm, distanciaM };
  });

  return {
    filas,
    capacidadPorGrupo,
    distanciaCentroideM: areaTotalCm2 > 0 ? sumaPonderadaM / areaTotalCm2 : 0,
    areaTotalCm2,
    verificaEntraEnAncho: capacidadPorGrupo.every((c) => c >= 1),
  };
}

/**
 * Canto útil de la sección. Se calcula una sola vez a partir de la armadura
 * positiva (considerando si hace falta más de una capa) y se reutiliza tanto
 * para el cálculo a flexión negativa como para cortante — así lo hace la
 * planilla original (mismo criterio simplificado).
 */
export function calcularCantoUtil(
  geometria: GeometriaViga,
  armaduraPositiva: readonly ArmaduraElegida[]
): number {
  return geometria.h - calcularDisposicionArmadura(geometria, armaduraPositiva).distanciaCentroideM;
}

/**
 * Momento reducido límite para que la armadura de tracción fluya.
 *
 * Con el hormigón agotado (εc = εcu3) y el acero justo en fluencia
 * (εs = εyd = fyd/Es), por compatibilidad de deformaciones
 *   ξlim = xlim/d = εcu3 / (εcu3 + εyd)
 * y con el bloque rectangular de canto λ·x
 *   ωlim = λ·ξlim,   μlim = ωlim·(1 − ωlim/2)
 *
 * Para B500 da ξlim = 0,617 y μlim = 0,372. Por encima, As = ω·b·d·fcd/fyd
 * dejaría de valer: supone una tensión fyd que el acero no alcanza.
 */
export function momentoReducidoLimite(fydMPa: number): number {
  const xiLim = EPSILON_CU3 / (EPSILON_CU3 + fydMPa / ES_MPA);
  const omegaLim = LAMBDA_BLOQUE * xiLim;
  return omegaLim * (1 - omegaLim / 2);
}

export function calcularFlexion(
  materiales: MaterialesDerivados,
  geometria: GeometriaViga,
  d: number,
  datos: DatosFlexion
): ResultadoFlexion {
  const { b, h } = geometria;
  const { fcd, fyd, fctm } = materiales;
  const { momento, armaduraReal, asAdicionalCm2 = 0 } = datos;

  const mu = momento / (b * d ** 2 * fcd * 1000);
  const muLim = momentoReducidoLimite(fyd);
  const sobrearmada = mu > muLim;
  // Sobrearmada no hay ω válido: se deja NaN a propósito, y no un número que
  // parezca una armadura, para que nada aguas abajo lo use como resultado.
  const omega = sobrearmada ? NaN : 1 - Math.sqrt(1 - 2 * mu);
  const asCalculadoCm2 = (100 ** 2 * omega * b * d * fcd) / fyd;

  // El mínimo se aplica igual a la armadura positiva y a la negativa: en una
  // sección rectangular W es el mismo respecto de las dos caras.
  const fctmFlMPa = resistenciaFlexotraccionMPa(fctm, h);
  const asMinCm2 = armaduraMinimaTraccionCm2(b, h, fctmFlMPa, fyd);

  const disposicion = calcularDisposicionArmadura(geometria, armaduraReal);

  // La armadura de torsión se suma a la de flexión (no se toma el máximo): son
  // esfuerzos concomitantes que traccionan las mismas barras.
  const asNecCm2 = Math.max(asCalculadoCm2, asMinCm2) + asAdicionalCm2;
  const asRealCm2 = disposicion.areaTotalCm2;
  const aprovechamiento = asNecCm2 / asRealCm2;
  const verificaAs = !sobrearmada && asRealCm2 >= asNecCm2;

  // Geometría del agotamiento, para poder dibujarlo: ω·d = 0,8·x y z = d·(1 − ω/2).
  const xM = (omega * d) / LAMBDA_BLOQUE;
  const zM = d * (1 - omega / 2);
  const deformacionAcero = xM > 0 ? (EPSILON_CU3 * (d - xM)) / xM : sobrearmada ? NaN : Infinity;

  return {
    d,
    mu,
    muLim,
    sobrearmada,
    omega,
    xM,
    zM,
    deformacionAcero,
    asCalculadoCm2,
    fctmFlMPa,
    asMinCm2,
    asNecCm2,
    asRealCm2,
    aprovechamiento,
    verificaAs,
    capas: disposicion.filas,
    capacidadPorGrupo: disposicion.capacidadPorGrupo,
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
