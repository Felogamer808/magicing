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
import {
  armaduraMinimaPorModuloCm2,
  armaduraMinimaTraccionCm2,
  resistenciaFlexotraccionMPa,
} from "@/lib/calc/hormigon/comun/cuantias";
import { flexionAlaComprimida, moduloResistenteT, propiedadesT } from "@/lib/calc/hormigon/vigas/seccion-t";

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
  const { momento, armaduraReal, asAdicionalCm2 = 0, seccionT } = datos;

  // Con el ala comprimida de una T el bloque puede quedar en el ala o bajar
  // al alma (seccion-t.ts). Con el ala traccionada, o sin ala, es un
  // rectángulo de ancho b, que en una T es el alma.
  const ala = seccionT?.alaComprimida
    ? flexionAlaComprimida(momento, b, seccionT.anchoEficazM, seccionT.espesorAlaM, d, fcd, fyd)
    : undefined;
  const mu = ala ? ala.mu : momento / (b * d ** 2 * fcd * 1000);
  const muLim = momentoReducidoLimite(fyd);
  const sobrearmada = mu > muLim;
  // Sobrearmada no hay ω válido: se deja NaN a propósito, y no un número que
  // parezca una armadura, para que nada aguas abajo lo use como resultado.
  const omega = sobrearmada ? NaN : ala ? ala.omega : 1 - Math.sqrt(1 - 2 * mu);
  const asCalculadoCm2 = sobrearmada ? NaN : ala ? ala.asCalculadoCm2 : (100 ** 2 * omega * b * d * fcd) / fyd;

  // En un rectángulo W es el mismo respecto de las dos caras; en una T
  // depende de cuál tracciona (ec. (9.1): W de la sección bruta respecto de
  // la fibra más traccionada), con el ala de ancho b_eff.
  const fctmFlMPa = resistenciaFlexotraccionMPa(fctm, h);
  const asMinCm2 = seccionT
    ? armaduraMinimaPorModuloCm2(
        moduloResistenteT(propiedadesT(b, h, seccionT.anchoEficazM, seccionT.espesorAlaM), h, !seccionT.alaComprimida),
        h, fctmFlMPa, fyd
      )
    : armaduraMinimaTraccionCm2(b, h, fctmFlMPa, fyd);

  // Las barras de la cara del ala se reparten en el ancho eficaz (art.
  // 9.2.1.2 (2)); las de la cara del alma, en el alma.
  const geometriaBarras = seccionT && !seccionT.alaComprimida ? { ...geometria, b: seccionT.anchoEficazM } : geometria;
  const disposicion = calcularDisposicionArmadura(geometriaBarras, armaduraReal);

  // La armadura de torsión se suma a la de flexión (no se toma el máximo): son
  // esfuerzos concomitantes que traccionan las mismas barras.
  const asNecCm2 = Math.max(asCalculadoCm2, asMinCm2) + asAdicionalCm2;
  const asRealCm2 = disposicion.areaTotalCm2;
  const aprovechamiento = asNecCm2 / asRealCm2;
  const verificaAs = !sobrearmada && asRealCm2 >= asNecCm2;

  // Geometría del agotamiento, para poder dibujarlo: ω·d = 0,8·x y z = d·(1 − ω/2).
  const xM = sobrearmada ? NaN : ala ? ala.xM : (omega * d) / LAMBDA_BLOQUE;
  const zM = sobrearmada ? NaN : ala ? ala.zM : d * (1 - omega / 2);
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
    ...(ala ? { alaComprimida: ala } : {}),
  };
}

/**
 * Separación longitudinal máxima de los cercos verticales, art. 9.2.2(6),
 * ec. (9.6), pág. 144: 0,75·d·(1 + cot α) con α = 90°. La escala por Vd/Vu1
 * (0,75d / 0,6d / 0,3d) era de la EHE-08 y no está en el Anejo 19.
 */
function separacionMaxM(d: number): number {
  return 0.75 * d;
}

/**
 * Tope de la separación adoptada. No sale del Anejo 19: es un criterio de
 * oficina de la planilla, que el usuario decidió mantener (2026-10-12) y que
 * la página declara como tal.
 */
export const TOPE_SEPARACION_OFICINA_M = 0.25;

/** Separación transversal máxima entre ramas, art. 9.2.2(8), ec. (9.8), pág. 144: 0,75·d ≤ 600 mm. */
function separacionTransversalMaxM(d: number): number {
  return Math.min(0.75 * d, 0.6);
}

/**
 * Separación entre ejes de ramas consecutivas. Las exteriores van pegadas al
 * recubrimiento (eje a rec + Øe/2 de cada cara) y las interiores se reparten
 * parejo entre ellas: criterio del usuario (2026-10-12), el mismo que dibuja
 * la sección del pilar.
 */
function separacionTransversalM(b: number, recubrimiento: number, diametroEstriboMm: number, numeroRamas: number): number {
  const entreExteriores = b - 2 * recubrimiento - diametroEstriboMm / 1000;
  return numeroRamas > 1 ? entreExteriores / (numeroRamas - 1) : entreExteriores;
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
  const { b, recubrimiento } = geometria;
  const { fck, fyk, fcd, fydEstribos } = materiales;
  const { vd, diametroEstriboMm, numeroRamas, atPorRamaCm2PorM = 0, pasoSeparacionM = 0.05 } = datos;

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

  // Art. 6.2.3(3), ec. (6.8), pág. 79: si VEd supera VRd,c la armadura toma
  // el cortante entero, con z = 0,9·d y cot θ = 1. El hormigón no suma: restar
  // VRd,c (Vsu = Vd − Vcu) era el modelo de la EHE-08.
  const requiereEstribos = vd > Math.max(vRdC, vRdCMin);
  const vEdEstribos = requiereEstribos ? vd : 0;

  const a90NecCm2PorM = (vEdEstribos * 10) / (fydEstribos * 0.9 * d);
  // Cuantía mínima del art. 9.2.2(5), ec. (9.5), pág. 144:
  // ρw,min = 0,08·√fck/fyk, con fyk y no fyd. Reemplaza la fctm·b/7,5 de la EHE.
  const a90MinCm2PorM = ((0.08 * Math.sqrt(fck)) / fyk) * b * 100 ** 2;
  // Torsión y cortante traccionan los mismos cercos, pero no igual: el cortante
  // se reparte entre todas las ramas y la torsión pide At/s en cada rama del
  // perímetro (art. 6.3.2, ec. (6.28)). Con todas las ramas iguales, cada una
  // tiene que dar A90/n + At, que en total es A90 + n·At. Sumar At una sola vez
  // dejaba las ramas exteriores cortas (criterio del usuario, 2026-10-12).
  const a90Cm2PorM = Math.max(a90NecCm2PorM, a90MinCm2PorM) + numeroRamas * atPorRamaCm2PorM;

  const aEstriboCm2 =
    (100 ** 2 * numeroRamas * Math.PI * (diametroEstriboMm / 1000) ** 2) / 4;
  const separacionNecM = aEstriboCm2 / a90Cm2PorM;

  const sepMax = separacionMaxM(d);
  const separacionAdoptadaM = Math.min(
    redondearSeparacionM(Math.min(sepMax, separacionNecM), pasoSeparacionM),
    TOPE_SEPARACION_OFICINA_M
  );

  const areaRealCm2PorM = aEstriboCm2 / separacionAdoptadaM;

  // Las ramas son las que carga el usuario, para que coincidan con el plano:
  // si quedan muy separadas se avisa y se proponen más, no se agregan solas.
  const sepTransversal = separacionTransversalM(b, recubrimiento, diametroEstriboMm, numeroRamas);
  const sepTransversalMax = separacionTransversalMaxM(d);

  return {
    vRdMax,
    verificaVRdMax,
    k,
    rhoL,
    vRdC,
    vRdCMin,
    requiereEstribos,
    vEdEstribos,
    a90NecCm2PorM,
    a90MinCm2PorM,
    a90Cm2PorM,
    aEstriboCm2,
    separacionNecM,
    separacionMaxM: sepMax,
    separacionAdoptadaM,
    areaRealCm2PorM,
    separacionTransversalM: sepTransversal,
    separacionTransversalMaxM: sepTransversalMax,
    verificaSeparacionTransversal: sepTransversal <= sepTransversalMax + 1e-9,
  };
}

export interface EstribosZona {
  diametroEstriboMm: number;
  numeroRamas: number;
}

export interface DatosCortanteZonas {
  /** Vd en el apoyo y en el centro del vano (kN), los dos de cálculo */
  vdApoyoKN: number;
  vdCentroKN: number;
  /** Luz del vano (m): el cortante va lineal del apoyo a L/2 */
  luzM: number;
  apoyo: EstribosZona;
  vano: EstribosZona;
}

export interface ResultadoCortanteZonas {
  /** Cada zona con su Vd: el del apoyo y el del centro */
  apoyo: ResultadoCortante;
  vano: ResultadoCortante;
  /** Lo que resisten los estribos del vano: máx(VRd,c; VRd,s) con su separación adoptada (kN) */
  vRdVanoKN: number;
  /** Donde V(x) baja a vRdVanoKN, medido desde el apoyo (m) */
  largoApoyoExactoM: number;
  /** Redondeado hacia arriba a 5 cm: hasta acá van los estribos del apoyo */
  largoApoyoM: number;
  /** Los estribos del vano se pueden armar para el Vd del centro: bielas y separación ≥ 5 cm */
  vanoAlcanza: boolean;
}

/** Paso con el que se redondea hacia arriba el largo de la zona de apoyo (m). */
export const PASO_ZONA_APOYO_M = 0.05;

/**
 * Estribos por zonas: densos en el apoyo y otros en el vano (criterio del
 * usuario, 2026-10-27). Cada zona se verifica con su Vd y sus estribos, igual
 * que el cortante de una sola zona (art. 6.2.2, 6.2.3 y 9.2.2). El cambio de
 * zona se calcula: el cortante va lineal del Vd del apoyo al del centro del
 * vano, y la zona de apoyo llega hasta donde V(x) baja a lo que resisten los
 * estribos del vano, máx(VRd,c; VRd,s) con su separación adoptada y cot θ = 1.
 */
export function calcularCortantePorZonas(
  materiales: MaterialesDerivados,
  geometria: GeometriaViga,
  d: number,
  asNegativaRealCm2: number,
  datos: DatosCortanteZonas
): ResultadoCortanteZonas {
  const { vdApoyoKN, vdCentroKN, luzM } = datos;
  const zona = (vd: number, e: EstribosZona) =>
    calcularCortante(materiales, { ...geometria, diametroEstriboMm: e.diametroEstriboMm }, d, asNegativaRealCm2, {
      vd,
      diametroEstriboMm: e.diametroEstriboMm,
      numeroRamas: e.numeroRamas,
    });
  const apoyo = zona(vdApoyoKN, datos.apoyo);
  const vano = zona(vdCentroKN, datos.vano);

  // VRd,s = (Asw/s)·0,9d·fywd con cot θ = 1, ec. (6.8); cm²/m · MPa · m / 10 = kN.
  const vRdS = (vano.areaRealCm2PorM * materiales.fydEstribos * 0.9 * d) / 10;
  const vRdVanoKN = Math.min(Math.max(vRdS, vano.vRdC, vano.vRdCMin), vano.vRdMax);

  const mitad = luzM / 2;
  // La separación de cada zona se dimensiona para su propio Vd, así que el vano
  // no alcanza sólo si fallan las bielas o si pide menos de un paso de
  // separación (5 cm), que no se puede armar.
  const vanoAlcanza = vano.verificaVRdMax && vano.separacionAdoptadaM >= PASO_ZONA_APOYO_M - 1e-9;
  let largoApoyoExactoM: number;
  // Sin vano armable su VRd no significa nada (con separación 0 sale infinito).
  if (!vanoAlcanza) largoApoyoExactoM = mitad;
  else if (vRdVanoKN >= vdApoyoKN) largoApoyoExactoM = 0;
  else if (vdApoyoKN <= vdCentroKN) largoApoyoExactoM = mitad;
  else largoApoyoExactoM = ((vdApoyoKN - vRdVanoKN) / (vdApoyoKN - vdCentroKN)) * mitad;
  const largoApoyoM =
    largoApoyoExactoM <= 0 ? 0 : Math.min(Math.ceil(largoApoyoExactoM / PASO_ZONA_APOYO_M - 1e-9) * PASO_ZONA_APOYO_M, mitad);

  return { apoyo, vano, vRdVanoKN, largoApoyoExactoM, largoApoyoM, vanoAlcanza };
}
