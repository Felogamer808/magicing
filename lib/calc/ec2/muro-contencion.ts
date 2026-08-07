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

import { GAMMA_G, GAMMA_Q } from "./coeficientes";

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
  /**
   * Carga permanente en superficie sobre el terreno del trasdós (kN/m²): un
   * contrapiso, un solado, un relleno de nivelación. Está siempre, así que
   * cuenta también cuando ayuda.
   */
  sobrecargaPermanenteKPa: number;
  /**
   * Sobrecarga de uso en superficie (kN/m²): tránsito, estacionamiento, acopio.
   * Empuja igual que la permanente, pero no se cuenta del lado favorable —al ser
   * variable puede no estar, y suponerla presente para que estabilice sería
   * apoyarse en algo que el día de la falla podría faltar.
   */
  sobrecargaUsoKPa: number;
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
  /** Carga permanente en superficie, ya llevada al ancho del talón (kN/m) */
  cargaPermanenteKN: number;
  /** Sobrecarga de uso, ya llevada al ancho del talón (kN/m) */
  cargaUsoKN: number;
  /** Ancho del talón (m), que es sobre lo que gravitan el suelo y las sobrecargas. */
  talonM: number;
  /** Altura de tierra que efectivamente pesa sobre el talón: hAct menos el canto (m). */
  alturaSobreTalonM: number;
  /** Brazo del talón respecto de la puntera (m). */
  brazoTalonM: number;
  /** Valor teórico de Rankine, antes del piso. */
  kaTeorico: number;
  /** El piso de 0,5 fue el que mandó, en vez del valor teórico. */
  mandaPisoKa: boolean;
}

/**
 * Momentos de cálculo en las tres piezas del muro, en kN·m/m.
 *
 * Un muro en ménsula son tres voladizos independientes, con cargas de sentidos
 * distintos, así que cada uno lleva su momento y su armadura en una cara
 * distinta. Los momentos vienen mayorados y listos para dimensionar, cada acción
 * con el coeficiente que le toca: γG las permanentes, γQ la sobrecarga de uso.
 */
export interface ResultadoMomentosElementos {
  /** Hastial: lo empuja el terreno y tracciona la cara interior. */
  hastialKNm: number;
  /** Altura de terreno que empuja al hastial (m). */
  alturaHastialM: number;
  /** Empuje del terreno sobre el hastial, sin mayorar (kN/m). */
  empujeSueloHastialKN: number;
  /** Empuje de la carga permanente sobre el hastial, sin mayorar (kN/m). */
  empujeSobrecargaPermHastialKN: number;
  /** Empuje de la sobrecarga de uso sobre el hastial, sin mayorar (kN/m). */
  empujeSobrecargaUsoHastialKN: number;
  /** Talón: lo baja el peso de tierra que gravita encima; tracciona arriba. */
  talonKNm: number;
  talonM: number;
  /** Carga repartida que baja sobre el talón: tierra, sobrecarga y peso propio (kN/m²). */
  cargaSobreTalonKPa: number;
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
  /** Excentricidad de la resultante respecto del centro de la zapata (m). */
  excentricidadM: number;
  /**
   * Momento estabilizador que corresponde a esta comprobación (kN·m/m), tomado
   * respecto de la puntera. No coincide con el del vuelco: acá las sobrecargas
   * pesan las dos, porque bajar es desfavorable para el terreno.
   */
  momentoEstabilizadorKNm: number;
  /** Distancia de la resultante a la puntera (m): (M estab − M volc)/N. */
  brazoResultanteM: number;
  /**
   * La resultante cae dentro del núcleo central, |e| ≤ A/6. Con esto toda la
   * base comprime y la ley es trapecial; sin esto, parte de la zapata se
   * despega y el pico crece bastante.
   */
  resultanteEnNucleo: boolean;
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

/**
 * Vuelco. Montoya §25.11.2 a), pág. 432, no lo plantea como factor de seguridad
 * sino con coeficientes parciales: 0,9·M_estabilizadores ≥ 1,8·M_volcadores.
 * Despejado es el cociente que se pide acá. Los coeficientes vienen del CTE, que
 * no está entre las fuentes del proyecto.
 */
export const FS_VUELCO_MINIMO = 1.8 / 0.9;

/** Deslizamiento: F_estabilizadoras ≥ 1,5·F_deslizantes. Montoya §25.11.2 b), pág. 433. */
export const FS_DESLIZAMIENTO_MINIMO = 1.5;

/**
 * Fracción de φ que se moviliza en el contacto hormigón-terreno.
 *
 * El rozamiento de la base contra el suelo no llega al ángulo que tiene el suelo
 * consigo mismo: la superficie de contacto es otra. Montoya §25.11.2 b), pág. 433:
 * μ = tg(2/3·φ). Con φ = 34° eso baja el coeficiente de 0,675 a 0,418.
 */
const FRACCION_PHI_ROZAMIENTO = 2 / 3;

/**
 * La cohesión se toma a la mitad y topada en 0,05 N/mm². Mismo apartado.
 * Es el término del que menos hay que fiarse: desaparece si el terreno se satura.
 */
const FACTOR_COHESION = 0.5;
const COHESION_MAXIMA_KPA = 50;

/**
 * Piso del coeficiente de empuje activo.
 *
 * φ es el dato menos confiable del cálculo y el empuje varía linealmente con ka,
 * así que subestimarlo va directo contra la seguridad. Topar ka por abajo es la
 * forma que tenía la planilla original de cubrirse, y se mantiene.
 */
export const KA_MINIMO = 0.5;

/*
 * El empuje pasivo de la puntera se calcula y se muestra, pero NO se cuenta ni
 * en el vuelco ni en el deslizamiento. Montoya lo dice en los dos apartados de
 * §25.11.2, pág. 433: "no se suele considerar porque el movimiento necesario
 * para movilizarlo es grande". Para que aparezca, el muro tiene que desplazarse
 * bastante más de lo que se admite en servicio, así que contar con él sería
 * apoyarse en una resistencia que sólo existe cuando el muro ya falló.
 *
 * Con esto desaparece además el brazo fijo de 0,9 m con el que entraba al
 * momento estabilizador, que no dependía de la altura del suelo pasivo y era
 * un número sin justificación.
 */

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

/** Peso específico del hormigón armado (kN/m³). */
const PESO_HORMIGON = 25;

interface DatosMomentos {
  A: number; hZap: number; esp: number; hMuro: number;
  hAct: number; gammaKNm3: number; ka: number; puntera: number;
  /** Carga permanente en superficie (kN/m²), que va con γG. */
  qg: number;
  /** Sobrecarga de uso (kN/m²), que va con γQ. */
  qq: number;
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
 *
 * Cada acción se mayora con el coeficiente que le corresponde y no todas con el
 * mismo: γG sobre el peso propio, la tierra y la carga permanente, γQ sobre la
 * sobrecarga de uso. Aplicar γQ a todo —como se hacía antes— sobredimensiona,
 * porque el peso propio de un muro se conoce con mucha más certeza que el camión
 * que pueda llegar a estacionar arriba.
 *
 * Para la puntera, `nTensionKN` y `momentoBaseKNm` tienen que venir YA mayorados:
 * la reacción del terreno es consecuencia de las cargas de arriba, así que se
 * arma el diagrama de presiones directamente en estado límite último.
 */
export function calcularMomentosElementos(
  d: DatosMomentos,
  nTensionMayoradaKN: number,
  momentoBaseMayoradoKNm: number
): ResultadoMomentosElementos {
  const { A, hZap, esp, hMuro, hAct, qg, qq, gammaKNm3, ka, puntera } = d;

  // --- Hastial: voladizo desde la cara superior de la zapata ---------------
  const alturaHastialM = Math.max(Math.min(hAct - hZap, hMuro), 0);
  const empujeSuelo = (gammaKNm3 * ka * alturaHastialM ** 2) / 2;
  const empujeSobrecargaPerm = ka * qg * alturaHastialM;
  const empujeSobrecargaUso = ka * qq * alturaHastialM;
  const hastialKNm =
    GAMMA_G *
      (empujeSuelo * (alturaHastialM / 3) + empujeSobrecargaPerm * (alturaHastialM / 2)) +
    GAMMA_Q * empujeSobrecargaUso * (alturaHastialM / 2);

  // --- Talón: lo que queda de zapata por detrás del hastial ----------------
  const talonM = Math.max(A - puntera - esp, 0);
  const alturaTierraSobreTalon = Math.max(hAct - hZap, 0);
  /** Lo que baja sobre el talón y está siempre: tierra, carga permanente y losa. */
  const cargaPermanenteKPa =
    gammaKNm3 * alturaTierraSobreTalon + qg + PESO_HORMIGON * hZap;
  const cargaBajaKPa = cargaPermanenteKPa + qq;
  const cargaMayoradaKPa = GAMMA_G * cargaPermanenteKPa + GAMMA_Q * qq;
  const talonKNm = (cargaMayoradaKPa * talonM ** 2) / 2;

  // --- Puntera: la levanta la reacción del terreno -------------------------
  // Distribución lineal bajo la base, medida desde el borde de la puntera.
  const sigmaMedia = nTensionMayoradaKN / A;
  const sigmaGradiente = momentoBaseMayoradoKNm / (A ** 2 / 6);
  const sigmaPunteraBordeKPa = sigmaMedia + sigmaGradiente;
  const sigmaPunteraArranqueKPa =
    puntera > 0 ? sigmaMedia + sigmaGradiente * (1 - (2 * puntera) / A) : sigmaPunteraBordeKPa;

  /*
   * Momento en el arranque del voladizo: trapecio de presiones menos peso propio.
   * Las presiones ya vienen mayoradas; al peso propio, que descuenta, se le
   * aplica γG acá.
   */
  const rectangulo = sigmaPunteraArranqueKPa * puntera * (puntera / 2);
  const triangulo =
    ((sigmaPunteraBordeKPa - sigmaPunteraArranqueKPa) * puntera) / 2 * ((2 * puntera) / 3);
  const pesoLosa = GAMMA_G * PESO_HORMIGON * hZap * puntera * (puntera / 2);
  const punteraKNm = puntera > 0 ? Math.max(rectangulo + triangulo - pesoLosa, 0) : 0;

  return {
    hastialKNm,
    alturaHastialM,
    empujeSueloHastialKN: empujeSuelo,
    empujeSobrecargaPermHastialKN: empujeSobrecargaPerm,
    empujeSobrecargaUsoHastialKN: empujeSobrecargaUso,
    talonKNm,
    talonM,
    cargaSobreTalonKPa: cargaBajaKPa,
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
    sobrecargaPermanenteKPa: qg,
    sobrecargaUsoKPa: qq,
  } = geometria;
  const puntera = Math.max(geometria.punteraM ?? 0, 0);
  /** Las dos sobrecargas empujan por igual: para el empuje se suman. */
  const q = qg + qq;

  const phi = (phiGrados * Math.PI) / 180;
  /*
   * Coeficientes de empuje de Rankine, en el caso habitual: terreno horizontal
   * (i = 0), trasdós vertical (β = 90°) y sin rozamiento entre tierras y muro
   * (δ = 0). Con esas tres hipótesis los empujes salen horizontales y quedan
   * sólo en función de φ.
   *
   * A ka se le pone un piso de 0,5, que es lo que hacía la planilla. Con φ = 34°
   * el teórico da 0,283 y el piso manda: se adopta casi el doble de empuje. La
   * razón es que φ es el dato menos confiable de todos —sale de un ensayo, de una
   * tabla o de la experiencia— y subestimarlo va directo contra la seguridad,
   * porque el empuje baja con el cuadrado de la altura pero linealmente con ka.
   *
   * kp se toma como el recíproco del ka ya pisado, y no como su valor teórico.
   * Es deliberado: si desconfiamos de φ para el empuje, usar esa misma
   * desconfianza para regalarnos resistencia pasiva sería quedarse con lo mejor
   * de las dos hipótesis. Así kp da 2,00 en vez de 3,54, del lado seguro.
   */
  const kaTeorico = (1 - Math.sin(phi)) / (1 + Math.sin(phi));
  const ka = Math.max(kaTeorico, KA_MINIMO);
  const kp = 1 / ka;
  const alturaTotalM = hMuro + hZap;

  /*
   * Geometría del reparto de cargas. El suelo que estabiliza es sólo el que
   * gravita sobre el talón: ni el que está sobre la puntera —ése va del otro
   * lado— ni el que ocupa el canto de la zapata, que es hormigón.
   */
  const talonM = Math.max(A - esp - puntera, 0);
  const alturaSobreTalonM = Math.max(hAct - hZap, 0);
  const alturaSobrePunteraM = Math.max(hPas - hZap, 0);

  /** Brazos medidos desde la puntera, que es el punto de giro del vuelco. */
  const brazoMuroM = puntera + esp / 2;
  const brazoTalonM = puntera + esp + talonM / 2;
  const brazoPunteraM = puntera / 2;

  // Acciones que vuelcan, tomando momentos respecto de la puntera.
  const empujeSueloKN = (gammaKNm3 * ka * hAct ** 2) / 2;
  const empujeSobrecargaKN = q * ka * hAct;
  const momentoVolcadorKNm =
    empujeSueloKN * (hAct / 3) + empujeSobrecargaKN * (hAct / 2);

  // Pesos propios y cargas sobre el talón.
  const pesoMuroKN = PESO_HORMIGON * esp * hMuro;
  const pesoZapataKN = PESO_HORMIGON * hZap * A;
  const pesoSueloActivoKN = gammaKNm3 * talonM * alturaSobreTalonM;
  const pesoSueloPasivoKN = gammaKNm3 * puntera * alturaSobrePunteraM;
  const empujePasivoKN = (gammaKNm3 * kp * hPas ** 2) / 2;
  const cargaPermanenteKN = qg * talonM;
  const cargaUsoKN = qq * talonM;

  /**
   * Momento de todo lo que está siempre: los pesos propios y nada más. El
   * empuje pasivo queda afuera a propósito (ver la nota de arriba); el peso del
   * suelo que lo genera sí cuenta, porque ése gravita sin necesidad de que el
   * muro se mueva.
   */
  const momentoPesosKNm =
    pesoMuroKN * brazoMuroM +
    pesoZapataKN * (A / 2) +
    pesoSueloActivoKN * brazoTalonM +
    pesoSueloPasivoKN * brazoPunteraM;

  /*
   * Al vuelco sólo se le suma la carga permanente. La de uso es favorable acá, y
   * una acción variable favorable se toma con valor cero: contar con el camión
   * estacionado sobre el talón para que el muro no vuelque es apostar a que el
   * día del empuje máximo el camión esté ahí.
   */
  const momentoEstabilizadorKNm = momentoPesosKNm + cargaPermanenteKN * brazoTalonM;
  const fsVuelco = momentoEstabilizadorKNm / momentoVolcadorKNm;

  const pesoTotalKN = pesoMuroKN + pesoZapataKN + pesoSueloActivoKN + pesoSueloPasivoKN;

  /*
   * Caso 1: el muro resiste el empuje sólo por rozamiento en la base. Vale el
   * mismo criterio que en el vuelco —la sobrecarga de uso aumentaría el
   * rozamiento, así que es favorable y no se cuenta— con la diferencia de que
   * acá la permanente sí suma peso vertical.
   */
  const nCaso1 = pesoTotalKN + cargaPermanenteKN;
  /** Cohesión reducida: la mitad y topada, porque es el término menos confiable. */
  const cohesionReducidaKPa = Math.min(FACTOR_COHESION * cKPa, COHESION_MAXIMA_KPA);
  const fhAdmCaso1 =
    nCaso1 * Math.tan(FRACCION_PHI_ROZAMIENTO * phi) + cohesionReducidaKPa * A;
  /** Sin descontar el pasivo: no se cuenta como resistencia. */
  const fhMaxCaso1 = empujeSueloKN + empujeSobrecargaKN;

  // Casos 2 y 3: reacciones de los apoyos.
  const r2Caso2 = momentoVolcadorKNm / apoyos.l1Caso2M;
  const r1Caso2 = r2Caso2 - empujeSueloKN - empujeSobrecargaKN;

  const r2Caso3 =
    (momentoVolcadorKNm - (empujeSueloKN + empujeSobrecargaKN) * apoyos.l1Caso3M) / apoyos.l2Caso3M;
  const r1Caso3 = empujeSueloKN + empujeSobrecargaKN - r2Caso3;

  // Con el contrapiso apuntalando, lo que hay que pasar por rozamiento es R1.
  const fhMaxApoyo = Math.abs(r1Caso2);

  /*
   * Tensión sobre el terreno — método de Montoya, §25.2.6, pág. 404.
   *
   * La planilla resolvía esto con `σ = N/A + M/W` tomando `M = γ·h³/6`, que
   * tenía tres problemas: ese momento usaba el peso del suelo con coeficiente 1
   * en vez de ka, no incluía el empuje de la sobrecarga, y no contaba la
   * excentricidad de las cargas verticales. Además la fórmula lineal se aplicaba
   * siempre, incluso con la resultante fuera del núcleo central, que es
   * justamente donde deja de valer y del lado inseguro.
   *
   * Acá se hace lo que corresponde: se ubica la resultante por equilibrio de
   * momentos respecto de la puntera y se mira dónde cae.
   *
   * Acá sí entran las dos sobrecargas, y no sólo los pesos propios: lo que se
   * comprueba es cuánto aprieta el muro contra el terreno, así que toda carga
   * exterior que baje aumenta la presión. Es el caso opuesto al del vuelco —lo
   * que allá era favorable e iba con cero, acá es desfavorable y va entero.
   */
  const nTension = pesoTotalKN + cargaPermanenteKN + cargaUsoKN;
  const momentoEstabilizadorTensionKNm =
    momentoPesosKNm + (cargaPermanenteKN + cargaUsoKN) * brazoTalonM;
  /** Distancia de la resultante a la puntera, por equilibrio de momentos. */
  const brazoResultanteM = (momentoEstabilizadorTensionKNm - momentoVolcadorKNm) / nTension;
  /** Excentricidad respecto del centro de la zapata. */
  const excentricidadM = A / 2 - brazoResultanteM;
  /** La que gobierna el pico: cuánto le queda a la resultante hasta el borde más próximo. */
  const distanciaAlBordeM = Math.min(brazoResultanteM, A - brazoResultanteM);
  /** Dentro del núcleo central (|e| ≤ A/6) toda la base comprime y la ley es trapecial. */
  const resultanteEnNucleo = Math.abs(excentricidadM) <= A / 6;

  const sigmaCaso1 =
    distanciaAlBordeM <= 0
      ? // La resultante se fue fuera de la zapata: no hay contacto que valga y el
        // muro ya volcó. Se devuelve infinito para que la comprobación falle sin
        // inventar un número.
        Infinity
      : resultanteEnNucleo
        ? (nTension / A) * (1 + (6 * Math.abs(excentricidadM)) / A)
        : // Ley triangular sobre 3·d, porque el terreno no tracciona.
          (2 * nTension) / (3 * distanciaAlBordeM);

  /** Momento respecto del centro de la zapata, que es el que da la ley de presiones. */
  const momentoCaso1 = nTension * excentricidadM;

  /*
   * Apuntalado, el muro no puede girar: la resultante queda casi centrada y se
   * adopta una excentricidad chica y fija en lugar de deducirla del equilibrio.
   * Con ese valor la resultante siempre cae dentro del núcleo, así que la ley es
   * trapecial y no hace falta el caso triangular.
   */
  const momentoCasos23 = EXCENTRICIDAD_CASOS_APUNTALADOS * nTension;
  const sigmaCasos23 = nTension / A + momentoCasos23 / (A ** 2 / 6);

  /*
   * Para armar hace falta la reacción del terreno en estado límite último, no en
   * servicio: la presión bajo la base es consecuencia de las cargas de arriba, y
   * si se dimensiona la puntera con presiones sin mayorar queda corta.
   *
   * Se rehace el equilibrio con las acciones ya afectadas por su coeficiente:
   * γG sobre pesos propios, tierra y carga permanente; γQ sobre la sobrecarga de
   * uso. La excentricidad no es la misma que en servicio, porque las dos partes
   * no se mayoran igual.
   */
  const nMayoradaKN = GAMMA_G * (pesoTotalKN + cargaPermanenteKN) + GAMMA_Q * cargaUsoKN;
  const momentoEstabMayoradoKNm =
    GAMMA_G * (momentoPesosKNm + cargaPermanenteKN * brazoTalonM) +
    GAMMA_Q * cargaUsoKN * brazoTalonM;
  const momentoVolcadorMayoradoKNm =
    GAMMA_G * (empujeSueloKN * (hAct / 3) + ka * qg * hAct * (hAct / 2)) +
    GAMMA_Q * ka * qq * hAct * (hAct / 2);
  const brazoResultanteMayoradoM =
    (momentoEstabMayoradoKNm - momentoVolcadorMayoradoKNm) / nMayoradaKN;
  const momentoBaseMayoradoKNm = nMayoradaKN * (A / 2 - brazoResultanteMayoradoM);

  const momentos = calcularMomentosElementos(
    { A, hZap, esp, hMuro, hAct, qg, qq, gammaKNm3, ka, puntera },
    nMayoradaKN,
    momentoBaseMayoradoKNm
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
      cargaPermanenteKN,
      cargaUsoKN,
      talonM,
      alturaSobreTalonM,
      brazoTalonM,
      kaTeorico,
      mandaPisoKa: ka > kaTeorico,
    },
    vuelco: { factorSeguridad: fsVuelco, verifica: fsVuelco >= FS_VUELCO_MINIMO },
    deslizamientoSoloZapata: {
      nKN: nCaso1,
      fhAdmKN: fhAdmCaso1,
      fhMaxKN: fhMaxCaso1,
      factorSeguridad: fhAdmCaso1 / fhMaxCaso1,
      verifica: fhAdmCaso1 / fhMaxCaso1 >= FS_DESLIZAMIENTO_MINIMO,
    },
    deslizamientoApoyoContrapiso: {
      nKN: nCaso1,
      fhAdmKN: fhAdmCaso1,
      fhMaxKN: fhMaxApoyo,
      factorSeguridad: fhAdmCaso1 / fhMaxApoyo,
      verifica: fhAdmCaso1 / fhMaxApoyo >= FS_DESLIZAMIENTO_MINIMO,
    },
    tensionSueloCaso1: {
      nKN: nTension,
      momentoKNm: momentoCaso1,
      sigmaKPa: sigmaCaso1,
      verifica: sigmaCaso1 <= sigmaAdmisibleKPa,
      excentricidadM,
      resultanteEnNucleo,
      momentoEstabilizadorKNm: momentoEstabilizadorTensionKNm,
      brazoResultanteM,
    },
    tensionSueloCasos23: {
      excentricidadM: EXCENTRICIDAD_CASOS_APUNTALADOS,
      resultanteEnNucleo: true,
      momentoEstabilizadorKNm: momentoEstabilizadorTensionKNm,
      brazoResultanteM: A / 2 - EXCENTRICIDAD_CASOS_APUNTALADOS,
      nKN: nTension,
      momentoKNm: momentoCasos23,
      sigmaKPa: sigmaCasos23,
      verifica: sigmaCasos23 <= sigmaAdmisibleKPa,
    },
    apoyoContrapiso: { r1KN: r1Caso2, r2KN: r2Caso2 },
    apoyoContrapisoYLosa: { r1KN: r1Caso3, r2KN: r2Caso3 },
  };
}
