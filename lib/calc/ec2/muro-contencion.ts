/**
 * Muro de contención en ménsula, verificado por metro lineal. Cubre las tres
 * situaciones que contempla la planilla original:
 *
 *  1. Solo zapata: el muro se sostiene por sí mismo (vuelco, deslizamiento y
 *     tensión del suelo).
 *  2. Apoyo en contrapiso: el contrapiso toma parte del empuje y el muro trabaja
 *     apuntalado abajo.
 *  3. Apoyo en contrapiso más losa superior: el muro queda apuntalado arriba y
 *     abajo, y se reparten las reacciones entre ambos apoyos.
 */

export interface SueloMuro {
  /** Peso específico del suelo (kN/m³) */
  gammaKNm3: number;
  /** Ángulo de rozamiento interno (grados) */
  phiGrados: number;
  /** Cohesión (kPa) */
  cKPa: number;
  /** Tensión admisible del suelo (kN/m²) */
  sigmaAdmisibleKPa: number;
}

export interface GeometriaMuro {
  /** Ancho de la zapata (m) */
  anchoZapataM: number;
  /** Canto de la zapata (m) */
  cantoZapataM: number;
  /** Altura del alzado del muro (m) */
  alturaMuroM: number;
  /** Espesor del alzado (m) */
  espesorMuroM: number;
  /** Altura de suelo del lado activo (m) */
  alturaSueloActivoM: number;
  /** Altura de suelo del lado pasivo (m) */
  alturaSueloPasivoM: number;
  /** Sobrecarga en superficie, p. ej. tránsito de vehículos (kN/m²) */
  sobrecargaKPa: number;
  /**
   * Vuelo de la puntera, por delante del hastial (m). Puede ser cero: un muro
   * de medianera o contra un límite de propiedad no la lleva, y entonces toda
   * la zapata es talón.
   */
  punteraM?: number;
}

export interface ResultadoEmpujes {
  ka: number;
  kp: number;
  alturaTotalM: number;
  /** Empuje activo del terreno (kN/m) */
  empujeSueloKN: number;
  /** Empuje debido a la sobrecarga (kN/m) */
  empujeSobrecargaKN: number;
  /** Empuje pasivo movilizado (kN/m) */
  empujePasivoKN: number;
  /** Momento volcador total respecto de la puntera (kN·m/m) */
  momentoVolcadorKNm: number;
  /** Momento estabilizador total (kN·m/m) */
  momentoEstabilizadorKNm: number;
  /** Peso propio del alzado, la zapata y el suelo que gravita sobre ella (kN/m) */
  pesoMuroKN: number;
  pesoZapataKN: number;
  pesoSueloActivoKN: number;
  pesoSueloPasivoKN: number;
}

/**
 * Momentos de cálculo en las tres piezas del muro, en kN·m/m.
 *
 * Un muro en ménsula son tres voladizos independientes, con cargas de sentidos
 * distintos, así que cada uno lleva su momento y su armadura en una cara
 * distinta. Los momentos van mayorados con γf = 1,5, listos para dimensionar.
 */
export interface ResultadoMomentosElementos {
  /** Hastial: lo empuja el terreno y tracciona la cara interior. */
  hastialKNm: number;
  /** Altura de terreno que empuja al hastial (m). */
  alturaHastialM: number;
  /** Talón: lo baja el peso de tierra que gravita encima; tracciona arriba. */
  talonKNm: number;
  talonM: number;
  /** Puntera: la levanta la reacción del terreno; tracciona abajo. */
  punteraKNm: number;
  punteraM: number;
  /** Presión del terreno en el borde de la puntera y en el arranque del hastial. */
  sigmaPunteraBordeKPa: number;
  sigmaPunteraArranqueKPa: number;
}

export interface ResultadoVuelco {
  factorSeguridad: number;
  verifica: boolean;
}

export interface ResultadoDeslizamiento {
  /** Resultante vertical considerada (kN/m) */
  nKN: number;
  /** Fuerza horizontal resistente (kN/m) */
  fhAdmKN: number;
  /** Fuerza horizontal solicitante (kN/m) */
  fhMaxKN: number;
  factorSeguridad: number;
  verifica: boolean;
}

export interface ResultadoTensionSuelo {
  nKN: number;
  momentoKNm: number;
  sigmaKPa: number;
  verifica: boolean;
}

export interface ResultadoApoyos {
  /** Reacción en el apoyo inferior, la que toma el contrapiso (kN/m) */
  r1KN: number;
  /** Reacción en el apoyo superior (kN/m) */
  r2KN: number;
}

export interface ResultadoMuroContencion {
  /** Momentos mayorados en las tres piezas, para dimensionar la armadura. */
  momentos: ResultadoMomentosElementos;
  empujes: ResultadoEmpujes;
  vuelco: ResultadoVuelco;
  /** Caso 1: el muro se sostiene solo. */
  deslizamientoSoloZapata: ResultadoDeslizamiento;
  /** Casos 2 y 3: el contrapiso toma la reacción inferior. */
  deslizamientoApoyoContrapiso: ResultadoDeslizamiento;
  tensionSueloCaso1: ResultadoTensionSuelo;
  tensionSueloCasos23: ResultadoTensionSuelo;
  apoyoContrapiso: ResultadoApoyos;
  apoyoContrapisoYLosa: ResultadoApoyos;
}

/** Factor de seguridad exigido tanto a vuelco como a deslizamiento. */
export const FS_MINIMO = 1.5;

/**
 * Ancho tributario de la sobrecarga que la planilla suma a la resultante
 * vertical al verificar deslizamiento en el caso 1. Es menor que el ancho de
 * zapata: sólo se cuenta la parte que efectivamente gravita.
 */
const ANCHO_TRIBUTARIO_SOBRECARGA_M = 0.2;

/** Brazo con el que se moviliza el empuje pasivo (m). */
const BRAZO_EMPUJE_PASIVO_M = 0.9;

/** Excentricidad relativa asumida para la tensión del suelo en los casos apuntalados. */
const EXCENTRICIDAD_CASOS_APUNTALADOS = 0.03;

export interface ApoyosConfig {
  /** Distancia del apoyo inferior a la base, caso 2 (m) */
  l1Caso2M: number;
  /** Distancias de los apoyos en el caso 3 (m) */
  l1Caso3M: number;
  l2Caso3M: number;
}

/** Cara de la pieza donde va la armadura principal. */
export type CaraTraccionada = "interior" | "superior" | "inferior";

export interface ArmaduraPieza {
  nombre: string;
  /** Canto total de la pieza (m). */
  hM: number;
  /** Canto útil (m). */
  dM: number;
  momentoKNm: number;
  /** Momento reducido μ = M/(b·d²·fcd), con b = 1 m. */
  mu: number;
  asCalculadoCm2: number;
  asMinMecanicoCm2: number;
  asMinGeometricoCm2: number;
  /** El que manda, por metro de muro. */
  asNecesarioCm2: number;
  /** true si gobernó un mínimo y no el momento. */
  mandaMinimo: boolean;
  cara: CaraTraccionada;
}

/**
 * Cuantía geométrica mínima de elementos superficiales flectados, en tanto por
 * mil de la sección bruta. Se usa el valor de losa: el hastial, el talón y la
 * puntera trabajan como placas en una dirección, no como vigas.
 *
 * No sustituye a la armadura mínima de muros del art. 9.6 —vertical y
 * horizontal, repartida en las dos caras—, que es una comprobación aparte y no
 * está incluida acá.
 */
const CUANTIA_GEOMETRICA_MINIMA = 1.8 / 1000;

/**
 * Armadura de flexión de una pieza de un metro de ancho.
 *
 * Es el mismo planteo adimensional que las vigas —μ, ω y de ahí As— pero con
 * b = 1 m, que es como se arma un muro: por metro corrido.
 */
export function armarPieza(
  nombre: string,
  cara: CaraTraccionada,
  momentoKNm: number,
  hM: number,
  recubrimientoM: number,
  fcdMPa: number,
  fydMPa: number
): ArmaduraPieza {
  const b = 1;
  const dM = Math.max(hM - recubrimientoM, 0.01);

  const mu = momentoKNm / (b * dM ** 2 * fcdMPa * 1000);
  // Por encima de μ = 0,5 la raíz no existe: la pieza no da como simplemente
  // armada y hay que engrosarla, no seguir sumando acero.
  const omega = mu < 0.5 ? 1 - Math.sqrt(1 - 2 * mu) : Infinity;
  const asCalculadoCm2 = Number.isFinite(omega)
    ? (100 ** 2 * omega * b * dM * fcdMPa) / fydMPa
    : Infinity;

  const asMinMecanicoCm2 = (100 ** 2 * 0.045 * b * dM * fcdMPa) / fydMPa;
  const asMinGeometricoCm2 = 100 ** 2 * CUANTIA_GEOMETRICA_MINIMA * b * hM;

  const asNecesarioCm2 = Math.max(asCalculadoCm2, asMinMecanicoCm2, asMinGeometricoCm2);

  return {
    nombre,
    hM,
    dM,
    momentoKNm,
    mu,
    asCalculadoCm2,
    asMinMecanicoCm2,
    asMinGeometricoCm2,
    asNecesarioCm2,
    mandaMinimo: asNecesarioCm2 > asCalculadoCm2,
    cara,
  };
}

/** Área por metro de una malla de barras de un diámetro y separación dados. */
export function areaPorMetroCm2(diametroMm: number, separacionMm: number): number {
  const areaBarraCm2 = (Math.PI * (diametroMm / 10) ** 2) / 4;
  return (areaBarraCm2 * 1000) / separacionMm;
}

/** Separación máxima, en mm, para cubrir un área dada con barras de un diámetro. */
export function separacionParaAs(diametroMm: number, asCm2PorM: number): number {
  if (asCm2PorM <= 0) return Infinity;
  const areaBarraCm2 = (Math.PI * (diametroMm / 10) ** 2) / 4;
  return (areaBarraCm2 * 1000) / asCm2PorM;
}

/** Coeficiente de mayoración de acciones para dimensionar la armadura. */
const GAMMA_F = 1.5;
/** Peso específico del hormigón armado (kN/m³). */
const PESO_HORMIGON = 25;

interface DatosMomentos {
  A: number; hZap: number; esp: number; hMuro: number;
  hAct: number; q: number; gammaKNm3: number; ka: number; puntera: number;
}

/**
 * Momentos en hastial, talón y puntera.
 *
 * El talón se resuelve del lado seguro: se cuentan las cargas que bajan —tierra
 * que gravita, sobrecarga y peso propio de la losa— y se desprecia la reacción
 * del terreno, que iría a favor. Es la simplificación habitual, y evita que un
 * error de signo en la distribución de presiones deje el talón sin armar.
 *
 * La puntera sí necesita esa distribución, porque es justamente la reacción la
 * que la levanta: se toma la presión lineal bajo la base y se le descuenta el
 * peso propio de la losa, que actúa en sentido contrario.
 */
export function calcularMomentosElementos(
  d: DatosMomentos,
  nTensionKN: number,
  momentoBaseKNm: number
): ResultadoMomentosElementos {
  const { A, hZap, esp, hMuro, hAct, q, gammaKNm3, ka, puntera } = d;

  // --- Hastial: voladizo desde la cara superior de la zapata ---------------
  const alturaHastialM = Math.max(Math.min(hAct - hZap, hMuro), 0);
  const empujeSuelo = (gammaKNm3 * ka * alturaHastialM ** 2) / 2;
  const empujeSobrecarga = ka * q * alturaHastialM;
  const hastialKNm =
    GAMMA_F * (empujeSuelo * (alturaHastialM / 3) + empujeSobrecarga * (alturaHastialM / 2));

  // --- Talón: lo que queda de zapata por detrás del hastial ----------------
  const talonM = Math.max(A - puntera - esp, 0);
  const alturaTierraSobreTalon = Math.max(hAct - hZap, 0);
  const cargaBajaKPa =
    gammaKNm3 * alturaTierraSobreTalon + q + PESO_HORMIGON * hZap;
  const talonKNm = GAMMA_F * ((cargaBajaKPa * talonM ** 2) / 2);

  // --- Puntera: la levanta la reacción del terreno -------------------------
  // Distribución lineal bajo la base, medida desde el borde de la puntera.
  const sigmaMedia = nTensionKN / A;
  const sigmaGradiente = momentoBaseKNm / (A ** 2 / 6);
  const sigmaPunteraBordeKPa = sigmaMedia + sigmaGradiente;
  const sigmaPunteraArranqueKPa =
    puntera > 0 ? sigmaMedia + sigmaGradiente * (1 - (2 * puntera) / A) : sigmaPunteraBordeKPa;

  // Momento en el arranque del voladizo: trapecio de presiones menos peso propio.
  const rectangulo = sigmaPunteraArranqueKPa * puntera * (puntera / 2);
  const triangulo =
    ((sigmaPunteraBordeKPa - sigmaPunteraArranqueKPa) * puntera) / 2 * ((2 * puntera) / 3);
  const pesoLosa = PESO_HORMIGON * hZap * puntera * (puntera / 2);
  const punteraKNm = puntera > 0 ? GAMMA_F * Math.max(rectangulo + triangulo - pesoLosa, 0) : 0;

  return {
    hastialKNm,
    alturaHastialM,
    talonKNm,
    talonM,
    punteraKNm,
    punteraM: puntera,
    sigmaPunteraBordeKPa,
    sigmaPunteraArranqueKPa,
  };
}

export function calcularMuroContencion(
  suelo: SueloMuro,
  geometria: GeometriaMuro,
  apoyos: ApoyosConfig
): ResultadoMuroContencion {
  const { gammaKNm3, phiGrados, cKPa, sigmaAdmisibleKPa } = suelo;
  const {
    anchoZapataM: A,
    cantoZapataM: hZap,
    alturaMuroM: hMuro,
    espesorMuroM: esp,
    alturaSueloActivoM: hAct,
    alturaSueloPasivoM: hPas,
    sobrecargaKPa: q,
  } = geometria;

  const phi = (phiGrados * Math.PI) / 180;
  /*
   * Coeficientes de empuje de Rankine, en el caso habitual: terreno horizontal
   * (i = 0), trasdós vertical (β = 90°) y sin rozamiento entre tierras y muro
   * (δ = 0). Con esas tres hipótesis los empujes salen horizontales y quedan
   * sólo en función de φ.
   *
   * La planilla original topaba ka por abajo en 0,5, más conservador que el
   * valor teórico. Ese piso se quitó a pedido: ahora se usa la formulación
   * limpia. No es un cambio inocente —baja el empuje activo y sube el pasivo, o
   * sea que el muro da más seguro— así que los casos de la planilla que
   * dependían del piso quedaron recalculados desde estas fórmulas y ya no son
   * paridad con Excel.
   */
  const ka = (1 - Math.sin(phi)) / (1 + Math.sin(phi));
  const kp = (1 + Math.sin(phi)) / (1 - Math.sin(phi));
  const alturaTotalM = hMuro + hZap;

  // Acciones que vuelcan, tomando momentos respecto de la puntera.
  const empujeSueloKN = (gammaKNm3 * ka * hAct ** 2) / 2;
  const empujeSobrecargaKN = q * ka * hAct;
  const momentoVolcadorKNm =
    empujeSueloKN * (hAct / 3) + empujeSobrecargaKN * (hAct / 2);

  // Acciones que estabilizan.
  const pesoMuroKN = 25 * esp * hMuro;
  const pesoZapataKN = 25 * hZap * A;
  const pesoSueloActivoKN = (gammaKNm3 * hAct * (A - esp)) / 2;
  const pesoSueloPasivoKN = (gammaKNm3 * hPas * (A - esp)) / 2;
  const empujePasivoKN = (gammaKNm3 * kp * hPas ** 2) / 2;

  const momentoEstabilizadorKNm =
    pesoMuroKN * (esp / 2) +
    pesoZapataKN * (A / 2) +
    pesoSueloActivoKN * (A - (A - esp) / 2) +
    pesoSueloPasivoKN * ((A - esp) / 4) +
    empujePasivoKN * BRAZO_EMPUJE_PASIVO_M;

  const fsVuelco = momentoEstabilizadorKNm / momentoVolcadorKNm;

  const pesoTotalKN = pesoMuroKN + pesoZapataKN + pesoSueloActivoKN + pesoSueloPasivoKN;

  // Caso 1: el muro resiste el empuje sólo por rozamiento en la base.
  const nCaso1 = pesoTotalKN + q * ANCHO_TRIBUTARIO_SOBRECARGA_M;
  const fhAdmCaso1 = nCaso1 * Math.tan(phi) + cKPa * A;
  const fhMaxCaso1 = Math.abs(empujeSueloKN + empujeSobrecargaKN - empujePasivoKN);

  // Casos 2 y 3: reacciones de los apoyos.
  const r2Caso2 = momentoVolcadorKNm / apoyos.l1Caso2M;
  const r1Caso2 = r2Caso2 - empujeSueloKN - empujeSobrecargaKN;

  const r2Caso3 =
    (momentoVolcadorKNm - (empujeSueloKN + empujeSobrecargaKN) * apoyos.l1Caso3M) / apoyos.l2Caso3M;
  const r1Caso3 = empujeSueloKN + empujeSobrecargaKN - r2Caso3;

  // Con el contrapiso apuntalando, lo que hay que pasar por rozamiento es R1.
  const fhMaxApoyo = Math.abs(r1Caso2);

  // Tensión del suelo.
  const nTension = pesoTotalKN + q * 1;
  const momentoCaso1 =
    ((gammaKNm3 * hAct ** 2) / 2) * (hAct / 3) - ((gammaKNm3 * hPas ** 2) / 2) * (hPas / 3);
  const sigmaCaso1 = nTension / A + momentoCaso1 / (A ** 2 / 6);

  const momentoCasos23 = EXCENTRICIDAD_CASOS_APUNTALADOS * nTension;
  const sigmaCasos23 = nTension / A + momentoCasos23 / (A ** 2 / 6);

  const momentos = calcularMomentosElementos(
    { A, hZap, esp, hMuro, hAct, q, gammaKNm3, ka, puntera: geometria.punteraM ?? 0 },
    nTension,
    momentoCaso1
  );

  return {
    momentos,
    empujes: {
      ka,
      kp,
      alturaTotalM,
      empujeSueloKN,
      empujeSobrecargaKN,
      empujePasivoKN,
      momentoVolcadorKNm,
      momentoEstabilizadorKNm,
      pesoMuroKN,
      pesoZapataKN,
      pesoSueloActivoKN,
      pesoSueloPasivoKN,
    },
    vuelco: { factorSeguridad: fsVuelco, verifica: fsVuelco >= FS_MINIMO },
    deslizamientoSoloZapata: {
      nKN: nCaso1,
      fhAdmKN: fhAdmCaso1,
      fhMaxKN: fhMaxCaso1,
      factorSeguridad: fhAdmCaso1 / fhMaxCaso1,
      verifica: fhAdmCaso1 / fhMaxCaso1 >= FS_MINIMO,
    },
    deslizamientoApoyoContrapiso: {
      nKN: nCaso1,
      fhAdmKN: fhAdmCaso1,
      fhMaxKN: fhMaxApoyo,
      factorSeguridad: fhAdmCaso1 / fhMaxApoyo,
      verifica: fhAdmCaso1 / fhMaxApoyo >= FS_MINIMO,
    },
    tensionSueloCaso1: {
      nKN: nTension,
      momentoKNm: momentoCaso1,
      sigmaKPa: sigmaCaso1,
      verifica: sigmaCaso1 <= sigmaAdmisibleKPa,
    },
    tensionSueloCasos23: {
      nKN: nTension,
      momentoKNm: momentoCasos23,
      sigmaKPa: sigmaCasos23,
      verifica: sigmaCasos23 <= sigmaAdmisibleKPa,
    },
    apoyoContrapiso: { r1KN: r1Caso2, r2KN: r2Caso2 },
    apoyoContrapisoYLosa: { r1KN: r1Caso3, r2KN: r2Caso3 },
  };
}
