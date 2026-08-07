import { areaBarraCm2 } from "../armaduras";
import type { ArmaduraElegida, MaterialesDerivados } from "./types";

/**
 * Viga de apeo resuelta como región D, con un modelo de bielas y tirantes.
 *
 * Una viga de apeo interrumpe un pilar: la carga baja concentrada sobre la viga
 * y se reparte a los dos apoyos. Cerca de la carga y de los apoyos la
 * distribución de deformaciones no es lineal, así que no vale Bernoulli y las
 * fórmulas de flexión y cortante de los apartados 6.1 y 6.2 quedan fuera de su
 * campo de aplicación: hay que ir a bielas y tirantes (Anejo 19, art. 9.9(1) y
 * art. 5.6.4(1), pág. 54).
 *
 * El modelo es la celosía de un solo panel: la carga del pilar apeado baja por
 * dos bielas comprimidas hasta los apoyos y el tirante inferior cierra el
 * equilibrio horizontal.
 *
 * Esta verificación NO reemplaza a "Vigas de apeo" (flexión y cortante): son
 * los dos métodos, y cuál aplica lo decide la relación luz/canto y la distancia
 * de la carga al apoyo. El resultado dice cuál corresponde.
 *
 * Referencias:
 * - Anejo 19 (RD 470/2021), art. 5.3.1(3) pág. 45 — definición de viga de gran canto.
 * - Anejo 19, art. 5.6.4 pág. 54 — extensión de la región D.
 * - Anejo 19, art. 6.5.2 ec. (6.56) y (6.57), pág. 97 — resistencia de la biela.
 * - Anejo 19, art. 6.5.3(3) ec. (6.58) y (6.59), pág. 97 — tracción transversal.
 * - Anejo 19, art. 6.5.4(4) ec. (6.60) (6.61), págs. 98-99 — nudos.
 * - Anejo 19, art. 8.2(2), pág. 121 — separación libre entre capas de barras.
 * - Anejo 19, art. 8.3 y tabla A19.8.1, pág. 122 — diámetro de mandril.
 * - Anejo 19, art. 8.4.2 ec. (8.2), pág. 123 — tensión última de adherencia.
 * - Anejo 19, art. 8.4.3 ec. (8.3), pág. 124 — longitud básica de anclaje.
 * - Anejo 19, art. 8.4.4 ec. (8.4) y tabla A19.8.2, págs. 124-125 — longitud neta.
 * - Anejo 19, art. 9.7, pág. 152 — malla mínima de vigas de gran canto.
 * - Anejo 19, art. 9.7(3), pág. 152 — anclaje completo del tirante: doblado,
 *   cercos en U o dispositivos, salvo que quepa lbd recto.
 * - Anejo 19, art. 9.9, pág. 155 — regiones D, anclaje del tirante.
 * - Montoya 15.ª ed., cap. 24 §24.7, pág. 391 (impresa 357) — vigas pared.
 * - Montoya, §24.9.1 y §24.9.2, págs. 396-397 (impresas 362-363) — cargas
 *   colgadas e indirectas, vigas cortas.
 */

/** Cómo llega a la viga la carga del pilar apeado (Montoya §24.9.1, pág. 396). */
export type TransmisionCarga = "directa" | "indirecta" | "colgada";

/** Condición de adherencia de la barra al hormigonar (art. 8.4.2(2), fig. A19.8.2). */
export type CondicionAdherencia = "buena" | "mala";

export interface GeometriaVigaApeo {
  /** Luz entre ejes de apoyo (m) */
  luzM: number;
  /** Canto total de la viga (m) */
  hM: number;
  /** Ancho —espesor— de la viga (m) */
  bM: number;
  /** Recubrimiento geométrico (m) */
  recubrimientoM: number;
  /** Posición del eje del pilar apeado desde el eje del apoyo izquierdo (m) */
  posicionCargaM: number;
  /** Ancho del pilar apeado en el plano de la viga (m) */
  anchoPilarApeadoM: number;
  /** Ancho del apoyo izquierdo (m) */
  anchoApoyoIzqM: number;
  /** Ancho del apoyo derecho (m) */
  anchoApoyoDerM: number;
  /** Prolongación de la viga más allá del eje del apoyo izquierdo (m) */
  voladizoIzqM: number;
  /** Prolongación de la viga más allá del eje del apoyo derecho (m) */
  voladizoDerM: number;
}

export interface MallaVigaApeo {
  diametroMm: number;
  /** Separación entre barras de la malla, por cara (m) */
  separacionM: number;
}

export interface CuelgueVigaApeo {
  diametroMm: number;
  /** Separación entre estribos de cuelgue (m) */
  separacionM: number;
  /** Ramas por estribo */
  numeroRamas: number;
  /** Canto del elemento que cuelga (m). 0 = no se comprueba h ≥ 1,2·a. */
  cantoElementoColgadoM: number;
}

export interface DatosVigaApeo {
  /** Axil de cálculo del pilar apeado (kN), ya mayorado */
  ndPilarKN: number;
  /** Carga uniforme de cálculo sobre la viga (kN/m), ya mayorada */
  qdKNPorM: number;
  transmision: TransmisionCarga;
  /** Armadura del tirante inferior, primera capa (la pegada al recubrimiento) */
  tirante: ArmaduraElegida;
  /**
   * Segunda capa del tirante, encima de la primera. Sirve para tolerar
   * descargas que no entran en una sola fila, a costa de subir el baricentro de
   * la armadura y perder canto útil.
   */
  tiranteSegundaCapa?: ArmaduraElegida;
  /** Diámetro del estribo que envuelve al tirante (mm), para ubicar su centroide */
  diametroEstriboMm: number;
  /**
   * Tamaño máximo del árido (m). Entra en la separación libre mínima entre
   * barras y entre capas, art. 8.2(2). Si se omite, 20 mm.
   */
  tamanoMaximoAridoM?: number;
  /**
   * Condición de adherencia de la barra durante el hormigonado, art. 8.4.2(2) y
   * figura A19.8.2. El tirante va al fondo del encofrado, así que lo normal es
   * "buena"; si se omite, se toma "buena".
   */
  condicionAdherencia?: CondicionAdherencia;
  mallaHorizontal: MallaVigaApeo;
  mallaVertical: MallaVigaApeo;
  cuelgue?: CuelgueVigaApeo;
  /**
   * Brazo mecánico impuesto (m). Si se omite sale del modelo: el menor entre el
   * que permite la cabeza comprimida y el de Montoya para viga pared.
   */
  brazoMecanicoM?: number;
  /**
   * Ancho sobre el que se admite que la carga del pilar se reparta dentro de la
   * viga (m), parámetro `b` de las ec. (6.58)/(6.59). Si se omite, mín(h, luz/2).
   */
  anchoRepartoM?: number;
}

/** Paso 1: ¿la pieza es región D? De la respuesta depende que el modelo aplique. */
export interface ResultadoRegionVigaApeo {
  /** Luz libre entre caras de apoyo (m) */
  luzLibreM: number;
  /** Luz de cálculo de Montoya: mín(entre ejes, 1,15·luz libre) (m) */
  luzMontoyaM: number;
  relacionLuzCanto: number;
  /** Anejo 19 art. 5.3.1(3): es viga si luz > 3·h; si no, viga de gran canto */
  esGranCantoAnejo19: boolean;
  /** Montoya §24.7.1: viga pared si luz/canto < 2 (simplemente apoyada) */
  esGranCantoMontoya: boolean;
  /** Distancias de la carga a cada apoyo, en cantos útiles */
  aIzqSobreD: number;
  aDerSobreD: number;
  /** Montoya §24.9.3: la carga está a menos de 2·d de algún apoyo */
  cargaProximaAlApoyo: boolean;
  esRegionD: boolean;
}

/** Paso 2: equilibrio externo y geometría de la celosía. */
export interface ResultadoModeloVigaApeo {
  dM: number;
  /** Canto del nudo inferior, 2·(h − d) (m) */
  cantoNudoInferiorM: number;
  aIzqM: number;
  aDerM: number;
  reaccionIzqKN: number;
  reaccionDerKN: number;
  /** Momento de cálculo bajo el pilar apeado (kN·m) */
  momentoKNm: number;
  /** Brazo que permite la cabeza comprimida, art. 6.5.4(4)a (m) */
  zNudoM: number;
  /** Brazo de Montoya para viga pared, 0,6·luz (m). null si no clasifica. */
  zMontoyaM: number | null;
  zAdoptadoM: number;
  /** Canto de la cabeza comprimida, 2·(d − z) (m) */
  cantoNudoSuperiorM: number;
  /** false = la cabeza comprimida no cabe: el hormigón se agota antes del tirante */
  verificaCabezaComprimida: boolean;
  anguloBielaIzqGrados: number;
  anguloBielaDerGrados: number;
  compresionBielaIzqKN: number;
  compresionBielaDerKN: number;
  /** Tracción del tirante (kN), la mayor de las dos que exige el equilibrio de nudos */
  traccionTiranteKN: number;
}

/** Una capa horizontal del tirante, ya resuelta su geometría. */
export interface CapaTirante {
  numero: number;
  diametroMm: number;
  areaCm2: number;
  /** Distancia del centro de las barras al borde inferior de la viga (m) */
  brazoDesdeElBordeM: number;
  /** Separación libre entre barras de la capa (mm) */
  separacionLibreMm: number;
  /** Ancho mínimo de viga que pide esta capa (m) */
  bNecM: number;
  verificaSeparacion: boolean;
  verificaAncho: boolean;
}

/**
 * Paso 3a: reparto del tirante en capas.
 *
 * La segunda capa es lo que permite tragar una descarga que no entra en una
 * fila, pero no es gratis: sube el baricentro de la armadura, baja el canto
 * útil d y con él el brazo z, así que la tracción del tirante sube. El cálculo
 * ya lo tiene en cuenta porque d sale de acá.
 */
export interface ResultadoCapasTirante {
  capas: CapaTirante[];
  areaTotalCm2: number;
  /** Distancia del baricentro del tirante al borde inferior (m) */
  baricentroDesdeElBordeM: number;
  /** Separación libre mínima exigida, art. 8.2(2): máx(φ; dg + 5 mm; 20 mm) */
  separacionLibreMinimaMm: number;
  /** Separación libre vertical realmente dispuesta entre las dos capas (mm) */
  separacionVerticalMm: number;
  verificaSeparacionVertical: boolean;
  /** Art. 8.2(3): las barras de las dos capas van en la misma vertical */
  mismasBarrasPorCapa: boolean;
  /** Montoya §24.7.3.e: las dos capas tienen que caber en la altura de reparto */
  alturaOcupadaM: number;
  verificaDentroDelReparto: boolean;
}

/** Paso 3: armadura del tirante. */
export interface ResultadoTiranteVigaApeo {
  /** fyd pleno = fyk/γs (MPa) */
  fydMPa: number;
  /** fyd topado en 400 MPa, Montoya §24.7.3.c (MPa) */
  fydTopadoMPa: number;
  /** El tope de Montoya está aplicado porque la pieza clasifica como viga pared */
  topeAplicado: boolean;
  asNecEc2Cm2: number;
  asNecMontoyaCm2: number;
  /** El mayor de los dos, que es por el que hay que armar */
  asNecCm2: number;
  asRealCm2: number;
  aprovechamiento: number;
  verificaAs: boolean;
  /** Altura en que se reparte el tirante, 0,12·luz — Montoya §24.7.3.e (m) */
  alturaRepartoM: number;
  /** Separación libre entre barras de la capa más apretada (mm) */
  separacionMm: number;
  /** Ancho necesario para alojar la capa más ancha (m) */
  bNecM: number;
  verificaBNec: boolean;
  /** Reparto en capas: la segunda es opcional */
  capas: ResultadoCapasTirante;
}

/** Una de las dos formas de anclaje que se comparan: recta y en horquilla. */
export interface FormaAnclajeTirante {
  /** α1, forma de la barra — tabla A19.8.2: 1,0 recta; 0,7 doblada si cd > 3φ */
  alfa1: number;
  /** α2, recubrimiento — tabla A19.8.2, acotado entre 0,7 y 1,0 */
  alfa2: number;
  /** Producto α2·α3·α5 con el mínimo de 0,7 de la ec. (8.5) ya aplicado */
  producto235: number;
  /** α1·α2·α3·α4·α5·lb,rqd — ec. (8.4), antes del mínimo (mm) */
  lbdBrutaMm: number;
  /** lb,min = máx(0,3·lb,rqd; 10φ; 100 mm) para anclaje en tracción (mm) */
  lbMinMm: number;
  /** El que hay que respetar: máx(lbd; lb,min) (mm) */
  lbdMm: number;
  /** Longitud de barra que hace falta y que se mide por el eje (mm) */
  desarrolloNecesarioMm: number;
  verificaIzq: boolean;
  verificaDer: boolean;
  /** Los mismos dos, midiendo desde el eje del apoyo como pide Montoya §24.7.3.e */
  verificaIzqMontoya: boolean;
  verificaDerMontoya: boolean;
}

/**
 * Geometría de la horquilla —gancho en U de la figura A19.8.1c— con la que se
 * cierra el tirante cuando el anclaje recto no entra en el apoyo.
 *
 * Montoya la dibuja doblada en planta (fig. 24.25b, pág. 392): la barra entra,
 * gira 180° en el plano horizontal y vuelve paralela a sí misma. Doblada así el
 * codo no invade la biela comprimida, que es lo que pasaría girando en vertical.
 */
export interface ResultadoHorquillaTirante {
  /** Tabla A19.8.1: 4φ si φ ≤ 16 mm, 7φ si φ > 16 mm (mm) */
  mandrilMinimoTablaMm: number;
  /** Fbt, tracción de la barra en el arranque del codo (kN) */
  fbtKN: number;
  /** ab, semidistancia entre ejes de barras; en barra de borde, rec + φ/2 (mm) */
  abMm: number;
  /** Mandril que evita reventar el hormigón del codo — ec. (8.1) (mm) */
  mandrilPorHormigonMm: number;
  /** El que hay que acotar en el plano: el mayor de los dos (mm) */
  mandrilAdoptadoMm: number;
  /** Se puede saltear la ec. (8.1) por cumplir la 1.ª condición de 8.3(3) */
  exentaDeComprobarMandril: boolean;
  /** Desarrollo del arco de 180°, medido por el eje de la barra (mm) */
  desarrolloCodoMm: number;
  /** Rama de ida, del arranque del anclaje al eje del codo, en cada apoyo (mm) */
  ramaIdaIzqMm: number;
  ramaIdaDerMm: number;
  /** Desarrollo máximo que se puede alojar doblando en planta (mm) */
  desarrolloDisponibleIzqMm: number;
  desarrolloDisponibleDerMm: number;
  /** Rama de vuelta a acotar en el plano, ya descontados codo e ida (mm) */
  ramaVueltaIzqMm: number;
  ramaVueltaDerMm: number;
  /** Ancho que el lazo ocupa transversalmente dentro de la viga (m) */
  anchoOcupadoEnPlantaM: number;
  /** Ancho libre entre estribos disponible para alojarlo (m) */
  anchoLibreM: number;
  cabeEnElAncho: boolean;
  /** Barras que entran y vuelven: cada horquilla resuelve dos de la capa */
  numeroHorquillas: number;
}

/** Paso 4: anclaje del tirante en el nudo de apoyo. */
export interface ResultadoAnclajeVigaApeo {
  /** σsd, tensión de la barra en el arranque del anclaje (MPa) */
  sigmaSdMPa: number;
  /** fctd = αct·fctk;0,05/γc, con fctk;0,05 = 0,7·fctm (tabla A19.3.1) (MPa) */
  fctdMPa: number;
  /** η1: 1,0 adherencia buena, 0,7 mala — art. 8.4.2(2) */
  eta1: number;
  /** η2: 1,0 hasta φ32; (132−φ)/100 por encima — art. 8.4.2(2) */
  eta2: number;
  /** fbd = 2,25·η1·η2·fctd — ec. (8.2) (MPa) */
  fbdMPa: number;
  /** lb,rqd = (φ/4)·(σsd/fbd) — ec. (8.3) (mm) */
  lbRqdMm: number;
  /** cd = mín(a/2; c1; c) — figura A19.8.3 (mm) */
  cdMm: number;
  recto: FormaAnclajeTirante;
  horquilla: FormaAnclajeTirante;
  geometriaHorquilla: ResultadoHorquillaTirante;
  /** Desde la cara interior del apoyo, que es donde empieza el nudo — art. 6.5.4(7) (m) */
  disponibleIzqM: number;
  disponibleDerM: number;
  /** Desde el eje del apoyo, criterio de Montoya §24.7.3.e: media placa menos (m) */
  disponibleMontoyaIzqM: number;
  disponibleMontoyaDerM: number;
  /** El recto entra en los dos apoyos por los dos criterios */
  verificaRecto: boolean;
  /** Si el recto no entra, ¿alcanza doblando en horquilla? */
  bastaConHorquilla: boolean;
  /** Art. 9.7(3): ni recto ni doblado; hay que ir a dispositivo de anclaje */
  requiereAnclajeMecanico: boolean;
  /** Lo que hay que dibujar en el plano */
  formaRecomendada: "recta" | "horquilla" | "dispositivo mecánico";
}

/** Comprobación de tensión de compresión con su tope. */
export interface ComprobacionCompresion {
  sigmaMPa: number;
  sigmaMaxMPa: number;
  aprovechamiento: number;
  verifica: boolean;
}

/** Paso 5: bielas y nudos. */
export interface ResultadoBielasVigaApeo {
  nuPrima: number;
  /** Ancho de la biela en el nudo de apoyo (m) */
  anchoBielaIzqM: number;
  anchoBielaDerM: number;
  bielaIzq: ComprobacionCompresion;
  bielaDer: ComprobacionCompresion;
  /** Nudo bajo el pilar apeado: sólo compresiones, k1 = 1,0 (ec. 6.60) */
  nudoSuperior: ComprobacionCompresion;
  /** Nudos de apoyo: compresión con tirante anclado, k2 = 0,85 (ec. 6.61) */
  nudoApoyoIzq: ComprobacionCompresion;
  nudoApoyoDer: ComprobacionCompresion;
  /** Mismo nudo de apoyo por Montoya §24.7.3.d: σ ≤ 0,7·fcd */
  nudoApoyoIzqMontoya: ComprobacionCompresion;
  nudoApoyoDerMontoya: ComprobacionCompresion;
  /** El criterio que gobierna el nudo de apoyo: el de menor tope */
  gobiernaMontoyaEnNudos: boolean;
}

/** Paso 6: tracción transversal del campo de compresiones — art. 6.5.3(3). */
export interface ResultadoTraccionTransversalVigaApeo {
  /** Parámetro a: ancho cargado (m) */
  aM: number;
  /** Parámetro b: ancho en que se reparte (m) */
  bRepartoM: number;
  /** true = discontinuidad parcial, ec. (6.58); false = total, ec. (6.59) */
  discontinuidadParcial: boolean;
  traccionKN: number;
  asNecCm2: number;
  /** Malla vertical realmente dispuesta, dos caras, sobre la altura de reparto (cm²) */
  asRealCm2: number;
  verificaAs: boolean;
}

/** Paso 7: malla ortogonal mínima — art. 9.7(1) y (2). */
export interface ResultadoMallaVigaApeo {
  /** Mínimo por cara y dirección: máx(0,001·Ac; 150 mm²/m) (cm²/m) */
  asMinCm2PorM: number;
  separacionMaxM: number;
  horizontalCm2PorM: number;
  verificaHorizontal: boolean;
  verificaSeparacionHorizontal: boolean;
  verticalCm2PorM: number;
  verificaVertical: boolean;
  verificaSeparacionVertical: boolean;
}

/** Paso 8: cuelgue, sólo si la carga no llega directa — Montoya §24.9.1. */
export interface ResultadoCuelgueVigaApeo {
  /** Fracción de Nd que hay que colgar: 0 directa, 0,65 indirecta, 1,00 colgada */
  fraccionColgada: number;
  cargaColgadaKN: number;
  /** Ancho a cada lado del pilar en que se reparten los estribos de cuelgue (m) */
  anchoZonaM: number;
  asNecCm2: number;
  asRealCm2: number;
  verificaAs: boolean;
  /** Montoya §24.9.1: h ≥ 1,2·a para que las bielas lleguen a formarse */
  verificaCantoMinimo: boolean;
  cantoMinimoM: number;
}

export interface ResultadoVigaApeo {
  region: ResultadoRegionVigaApeo;
  modelo: ResultadoModeloVigaApeo;
  tirante: ResultadoTiranteVigaApeo;
  anclaje: ResultadoAnclajeVigaApeo;
  bielas: ResultadoBielasVigaApeo;
  traccionTransversal: ResultadoTraccionTransversalVigaApeo;
  malla: ResultadoMallaVigaApeo;
  cuelgue: ResultadoCuelgueVigaApeo | null;
}

/** MPa → kN/m², para no arrastrar el factor 1000 por todo el módulo. */
const aKNPorM2 = (mpa: number) => mpa * 1000;

/** kN de tracción y fyd en MPa → cm² de acero. */
const areaNecesariaCm2 = (traccionKN: number, fydMPa: number) =>
  (traccionKN / aKNPorM2(fydMPa)) * 100 ** 2;

const comprobar = (sigmaMPa: number, sigmaMaxMPa: number): ComprobacionCompresion => ({
  sigmaMPa,
  sigmaMaxMPa,
  aprovechamiento: sigmaMPa / sigmaMaxMPa,
  verifica: sigmaMPa <= sigmaMaxMPa,
});

/**
 * Geometría de una capa del tirante dentro del ancho de la viga.
 *
 * La separación que devuelve es la LIBRE —de cara a cara de barra—, que es la
 * que acota el art. 8.2(2); la que se mide entre ejes es φ mayor y da falsos
 * aprobados.
 */
function resolverCapa(
  capa: ArmaduraElegida,
  brazoDesdeElBordeM: number,
  bM: number,
  recubrimientoM: number,
  diametroEstriboMm: number,
  separacionLibreMinimaMm: number
): CapaTirante {
  const phi = capa.diametroMm;
  const anchoLibreM = bM - 2 * recubrimientoM - (2 * diametroEstriboMm) / 1000;
  const separacionLibreMm =
    capa.numero > 1 ? ((anchoLibreM - (capa.numero * phi) / 1000) / (capa.numero - 1)) * 1000 : 0;

  const bNecM =
    2 * (recubrimientoM + diametroEstriboMm / 1000) +
    (capa.numero * phi) / 1000 +
    ((capa.numero - 1) * separacionLibreMinimaMm) / 1000;

  return {
    numero: capa.numero,
    diametroMm: phi,
    areaCm2: capa.numero * areaBarraCm2(phi),
    brazoDesdeElBordeM,
    separacionLibreMm,
    // Con una sola barra no hay separación que comprobar.
    verificaSeparacion: capa.numero < 2 || separacionLibreMm >= separacionLibreMinimaMm,
    bNecM,
    verificaAncho: bNecM <= bM,
  };
}

/** Fracción de la carga que hay que colgar de la cabeza opuesta (Montoya §24.9.1). */
function fraccionColgada(transmision: TransmisionCarga): number {
  // Para el apoyo indirecto Montoya recomienda considerar el 45 % de la fuerza
  // como directa y el 65 % como colgada: suman 110 % a propósito, "por razones
  // de seguridad". Acá interesa la parte colgada.
  if (transmision === "colgada") return 1;
  if (transmision === "indirecta") return 0.65;
  return 0;
}

export function calcularVigaApeoBielas(
  materiales: MaterialesDerivados,
  geometria: GeometriaVigaApeo,
  datos: DatosVigaApeo
): ResultadoVigaApeo {
  const {
    luzM,
    hM,
    bM,
    recubrimientoM,
    posicionCargaM,
    anchoPilarApeadoM,
    anchoApoyoIzqM,
    anchoApoyoDerM,
    voladizoIzqM,
    voladizoDerM,
  } = geometria;
  const { ndPilarKN, qdKNPorM, transmision, tirante, diametroEstriboMm } = datos;
  const { fck, fcd, fyd, fydEstribos } = materiales;

  const phiT = tirante.diametroMm;
  const segunda = datos.tiranteSegundaCapa;
  const dgM = datos.tamanoMaximoAridoM ?? 0.02;

  // Art. 8.2(2): la distancia libre, horizontal y vertical, no baja del mayor
  // entre φ (k1 = 1), dg + 5 mm (k2) y 20 mm. Se toma el mayor diámetro en juego
  // porque es el que manda entre dos barras distintas.
  const phiMayorMm = Math.max(phiT, segunda?.diametroMm ?? 0);
  const separacionLibreMinimaMm = Math.max(phiMayorMm, dgM * 1000 + 5, 20);

  // El tirante arranca sobre el estribo. La segunda capa se apoya encima de la
  // primera dejando la separación libre mínima: sube el baricentro y por lo
  // tanto baja d, que es el precio de meter la segunda fila.
  const bordeCapa1M = recubrimientoM + diametroEstriboMm / 1000;
  const brazoCapa1M = bordeCapa1M + phiT / 2000;
  const brazoCapa2M = segunda
    ? bordeCapa1M + phiT / 1000 + separacionLibreMinimaMm / 1000 + segunda.diametroMm / 2000
    : 0;

  const areaCapa1Cm2 = tirante.numero * areaBarraCm2(phiT);
  const areaCapa2Cm2 = segunda ? segunda.numero * areaBarraCm2(segunda.diametroMm) : 0;
  const areaTotalTiranteCm2 = areaCapa1Cm2 + areaCapa2Cm2;

  const baricentroM =
    (areaCapa1Cm2 * brazoCapa1M + areaCapa2Cm2 * brazoCapa2M) / areaTotalTiranteCm2;

  const dM = hM - baricentroM;

  // ---------------------------------------------------------------- región
  const luzLibreM = luzM - (anchoApoyoIzqM + anchoApoyoDerM) / 2;
  // Montoya §24.7.1: como luz se toma la menor entre la distancia entre ejes y
  // 1,15 veces la luz libre.
  const luzMontoyaM = Math.min(luzM, 1.15 * luzLibreM);

  const aIzqM = posicionCargaM;
  const aDerM = luzM - posicionCargaM;

  const region: ResultadoRegionVigaApeo = {
    luzLibreM,
    luzMontoyaM,
    relacionLuzCanto: luzM / hM,
    // Art. 5.3.1(3): "una viga es un elemento cuya luz es mayor que 3 veces el
    // canto total de la sección, de lo contrario, será considerada como viga de
    // gran canto".
    esGranCantoAnejo19: luzM <= 3 * hM,
    esGranCantoMontoya: luzMontoyaM / hM < 2,
    aIzqSobreD: aIzqM / dM,
    aDerSobreD: aDerM / dM,
    // Montoya §24.9.3: por debajo de 2·d la carga se lleva por biela directa al
    // apoyo y el cálculo por cortante deja de representar el mecanismo.
    cargaProximaAlApoyo: Math.min(aIzqM, aDerM) <= 2 * dM,
    esRegionD: luzM <= 3 * hM || Math.min(aIzqM, aDerM) <= 2 * dM,
  };

  // ---------------------------------------------------------------- modelo
  const reaccionIzqKN = (ndPilarKN * aDerM) / luzM + (qdKNPorM * luzM) / 2;
  const reaccionDerKN = (ndPilarKN * aIzqM) / luzM + (qdKNPorM * luzM) / 2;
  const momentoKNm = reaccionIzqKN * aIzqM - (qdKNPorM * aIzqM ** 2) / 2;

  const nuPrima = 1 - fck / 250;
  // Nudo superior: sólo confluyen compresiones, así que su tope es el de la ec.
  // (6.60) con k1 = 1,0. Es el que fija cuánto canto se come la cabeza
  // comprimida y, por lo tanto, el brazo disponible.
  const sigmaNudoSuperiorMax = 1.0 * nuPrima * fcd;

  // z sale de igualar la compresión de la cabeza a su tope: C = M/z se reparte
  // en un canto u = C/(σ·b) y el brazo es z = d − u/2. Sustituyendo queda una
  // cuadrática en z, igual que el μ de flexión. Discriminante negativo = el
  // hormigón no da para formar la cabeza.
  const discriminante = 1 - (2 * momentoKNm) / (aKNPorM2(sigmaNudoSuperiorMax) * bM * dM ** 2);
  const verificaCabezaComprimida = discriminante >= 0;
  const zNudoM = verificaCabezaComprimida ? (dM / 2) * (1 + Math.sqrt(discriminante)) : dM / 2;

  // Montoya §24.7.3.a toma z = 0,6·l en viga pared bajo carga repartida. Da
  // distinto que la geometría del nudo, así que se arma por el más
  // desfavorable —el menor brazo— en vez de elegir el cómodo.
  const zMontoyaM = region.esGranCantoMontoya ? 0.6 * luzMontoyaM : null;
  const zAdoptadoM =
    datos.brazoMecanicoM ?? (zMontoyaM === null ? zNudoM : Math.min(zNudoM, zMontoyaM));

  const anguloBielaIzq = Math.atan(zAdoptadoM / aIzqM);
  const anguloBielaDer = Math.atan(zAdoptadoM / aDerM);
  const compresionBielaIzqKN = reaccionIzqKN / Math.sin(anguloBielaIzq);
  const compresionBielaDerKN = reaccionDerKN / Math.sin(anguloBielaDer);

  // Equilibrio horizontal en cada nudo de apoyo: T = R/tg θ. Con carga repartida
  // los dos nudos no piden lo mismo; se arma por el mayor, que además es ≥ M/z.
  const traccionTiranteKN = Math.max(
    reaccionIzqKN / Math.tan(anguloBielaIzq),
    reaccionDerKN / Math.tan(anguloBielaDer)
  );

  const cantoNudoInferiorM = 2 * (hM - dM);

  const modelo: ResultadoModeloVigaApeo = {
    dM,
    cantoNudoInferiorM,
    aIzqM,
    aDerM,
    reaccionIzqKN,
    reaccionDerKN,
    momentoKNm,
    zNudoM,
    zMontoyaM,
    zAdoptadoM,
    cantoNudoSuperiorM: 2 * (dM - zAdoptadoM),
    verificaCabezaComprimida,
    anguloBielaIzqGrados: (anguloBielaIzq * 180) / Math.PI,
    anguloBielaDerGrados: (anguloBielaDer * 180) / Math.PI,
    compresionBielaIzqKN,
    compresionBielaDerKN,
    traccionTiranteKN,
  };

  // --------------------------------------------------------------- tirante
  // Montoya limita fyd a 400 MPa en el tirante de viga pared (§24.7.3.c, pág.
  // 391, impresa 357: "con fyd ≯ 400 N/mm²"). Es el mismo tope que en ménsulas
  // cortas y con B500S encarece la armadura un 9 %. El Anejo 19 no lo trae, así
  // que se calculan los dos y se arma por el mayor.
  const fydTopadoMPa = Math.min(fyd, 400);
  const asNecEc2Cm2 = areaNecesariaCm2(traccionTiranteKN, fyd);
  const asNecMontoyaCm2 = areaNecesariaCm2(traccionTiranteKN, fydTopadoMPa);
  const topeAplicado = region.esGranCantoMontoya;
  const asNecCm2 = topeAplicado ? Math.max(asNecEc2Cm2, asNecMontoyaCm2) : asNecEc2Cm2;
  const asRealCm2 = areaTotalTiranteCm2;

  const capasResueltas: CapaTirante[] = [
    resolverCapa(
      tirante,
      brazoCapa1M,
      bM,
      recubrimientoM,
      diametroEstriboMm,
      separacionLibreMinimaMm
    ),
  ];
  if (segunda) {
    capasResueltas.push(
      resolverCapa(
        segunda,
        brazoCapa2M,
        bM,
        recubrimientoM,
        diametroEstriboMm,
        separacionLibreMinimaMm
      )
    );
  }

  const alturaRepartoM = 0.12 * luzMontoyaM;
  // Lo que ocupa el tirante, del borde inferior al techo de la última capa.
  const alturaOcupadaM = segunda
    ? brazoCapa2M + segunda.diametroMm / 2000 - recubrimientoM
    : brazoCapa1M + phiT / 2000 - recubrimientoM;

  const capas: ResultadoCapasTirante = {
    capas: capasResueltas,
    areaTotalCm2: areaTotalTiranteCm2,
    baricentroDesdeElBordeM: baricentroM,
    separacionLibreMinimaMm,
    // Entre capas la distancia libre es la que se dejó al posicionar la segunda.
    separacionVerticalMm: segunda ? separacionLibreMinimaMm : 0,
    verificaSeparacionVertical: true,
    // Art. 8.2(3): las barras de las dos capas van en la misma vertical para que
    // entre el vibrador. Con el mismo número por capa sale solo.
    mismasBarrasPorCapa: !segunda || segunda.numero === tirante.numero,
    alturaOcupadaM,
    // Montoya §24.7.3.e reparte el tirante en 0,12·l: las dos capas tienen que
    // entrar en esa franja o el modelo deja de ser el que se calculó.
    verificaDentroDelReparto: alturaOcupadaM <= alturaRepartoM,
  };

  const bNecM = Math.max(...capasResueltas.map((c) => c.bNecM));
  const separacionMm = Math.min(...capasResueltas.map((c) => c.separacionLibreMm));

  const resultadoTirante: ResultadoTiranteVigaApeo = {
    fydMPa: fyd,
    fydTopadoMPa,
    topeAplicado,
    asNecEc2Cm2,
    asNecMontoyaCm2,
    asNecCm2,
    asRealCm2,
    aprovechamiento: asNecCm2 / asRealCm2,
    verificaAs: asRealCm2 >= asNecCm2,
    // Montoya §24.7.3.e: el tirante se reparte en una altura de 0,12·l, no
    // concentrado en una fila pegada al borde.
    alturaRepartoM,
    separacionMm,
    bNecM,
    verificaBNec: bNecM <= bM,
    capas,
  };

  // --------------------------------------------------------------- anclaje
  // Se calcula por el articulado del capítulo 8, no por la regla de m·φ² de la
  // EHE: es el mismo cuerpo normativo que el resto de la verificación y hace
  // explícito de qué depende la longitud, que es lo que decide si hay que
  // doblar en horquilla o no.

  // fctd = αct·fctk;0,05/γc, con αct = 1,00 (art. 3.1.6(2), ec. 3.16) y
  // fctk;0,05 = 0,7·fctm, cuantil 5 % (tabla A19.3.1).
  const GAMMA_C_LOCAL = 1.5;
  const fctdMPa = (0.7 * materiales.fctm) / GAMMA_C_LOCAL;

  // Art. 8.4.2(2): η1 = 1,0 con adherencia buena y 0,7 en el resto; η2 = 1,0
  // hasta φ32 y (132−φ)/100 por encima.
  const eta1 = (datos.condicionAdherencia ?? "buena") === "buena" ? 1.0 : 0.7;
  const eta2 = phiT <= 32 ? 1.0 : (132 - phiT) / 100;
  const fbdMPa = 2.25 * eta1 * eta2 * fctdMPa;

  // σsd es la tensión de la barra en la sección desde la que se mide el anclaje:
  // acá el nudo de apoyo, donde el tirante lleva T repartida en el acero real.
  // Armar de más no sólo baja el aprovechamiento: acorta el anclaje.
  const sigmaSdMPa = (10 * traccionTiranteKN) / asRealCm2;
  const lbRqdMm = (phiT / 4) * (sigmaSdMPa / fbdMPa);

  // cd = mín(a/2; c1; c), figura A19.8.3. El tirante va por dentro del estribo,
  // así que su recubrimiento real es el geométrico más el diámetro del cerco.
  const recubrimientoBarraMm = recubrimientoM * 1000 + diametroEstriboMm;
  const cdMm = Math.min(
    capasResueltas[0].separacionLibreMm > 0 ? capasResueltas[0].separacionLibreMm / 2 : Infinity,
    recubrimientoBarraMm
  );

  // α3, α4 y α5 se dejan en 1,00 a propósito: los tres son bonificaciones —
  // confinamiento por cercos, barras soldadas y presión transversal del apoyo—
  // y contarlas exige justificar armadura y presiones que esta herramienta no
  // conoce. Quedan del lado seguro y a la vista.
  const alfa3 = 1.0;
  const alfa4 = 1.0;
  const alfa5 = 1.0;

  const acotar = (x: number) => Math.min(1, Math.max(0.7, x));
  const lbMinMm = Math.max(0.3 * lbRqdMm, 10 * phiT, 100);

  function formaAnclaje(doblada: boolean): FormaAnclajeTirante {
    // Tabla A19.8.2. Doblar sólo bonifica si el recubrimiento acompaña: con
    // cd ≤ 3φ el codo no tiene hormigón alrededor y α1 vuelve a 1,0.
    const alfa1 = doblada ? (cdMm > 3 * phiT ? 0.7 : 1.0) : 1.0;
    const alfa2 = acotar(
      doblada ? 1 - (0.15 * (cdMm - 3 * phiT)) / phiT : 1 - (0.15 * (cdMm - phiT)) / phiT
    );
    // Ec. (8.5): el producto α2·α3·α5 no baja de 0,7 por mucho que den las tres.
    const producto235 = Math.max(alfa2 * alfa3 * alfa5, 0.7);
    const lbdBrutaMm = alfa1 * producto235 * alfa4 * lbRqdMm;
    const lbdMm = Math.max(lbdBrutaMm, lbMinMm);

    return {
      alfa1,
      alfa2,
      producto235,
      lbdBrutaMm,
      lbMinMm,
      lbdMm,
      desarrolloNecesarioMm: lbdMm,
      verificaIzq: false,
      verificaDer: false,
      verificaIzqMontoya: false,
      verificaDerMontoya: false,
    };
  }

  // Art. 6.5.4(7): el anclaje del tirante empieza donde empieza el nudo, o sea
  // en la cara interior del apoyo, y puede usar el nudo entero y el voladizo.
  const disponibleIzqM = anchoApoyoIzqM / 2 + voladizoIzqM - recubrimientoM;
  const disponibleDerM = anchoApoyoDerM / 2 + voladizoDerM - recubrimientoM;
  // Montoya §24.7.3.e es más exigente: manda anclar "a partir del eje de apoyo"
  // (fig. 24.25b, pág. 392), con lo cual pierde medio ancho de placa. No es el
  // mismo criterio con otro número, así que se comprueban los dos y se dibuja
  // por el peor.
  const disponibleMontoyaIzqM = voladizoIzqM - recubrimientoM;
  const disponibleMontoyaDerM = voladizoDerM - recubrimientoM;

  const recto = formaAnclaje(false);
  recto.verificaIzq = disponibleIzqM * 1000 >= recto.lbdMm;
  recto.verificaDer = disponibleDerM * 1000 >= recto.lbdMm;
  recto.verificaIzqMontoya = disponibleMontoyaIzqM * 1000 >= recto.lbdMm;
  recto.verificaDerMontoya = disponibleMontoyaDerM * 1000 >= recto.lbdMm;

  const horquilla = formaAnclaje(true);

  // ---- geometría de la horquilla (gancho en U, figura A19.8.1c)
  // Tabla A19.8.1: el mandril mínimo para patillas, ganchos y ganchos en U es
  // 4φ hasta φ16 y 7φ por encima.
  const mandrilMinimoTablaMm = phiT <= 16 ? 4 * phiT : 7 * phiT;
  // Fbt es la tracción de UNA barra en el arranque del codo.
  const areaBarraMm2 = (Math.PI * phiT ** 2) / 4;
  const fbtKN = (sigmaSdMPa * areaBarraMm2) / 1000;
  // ab: para una barra contigua al paramento, el recubrimiento más φ/2. Es el
  // caso pésimo —da el mandril más grande— y es el que corresponde a la barra
  // de esquina, que es la que revienta primero.
  const abMm = recubrimientoBarraMm + phiT / 2;
  // Ec. (8.1). El fcd de esta comprobación no puede pasar del de un HA-55.
  const fcdTopadoMPa = Math.min(fcd, 55 / GAMMA_C_LOCAL);
  const mandrilPorHormigonMm = ((fbtKN * 1000) * (1 / abMm + 1 / (2 * phiT))) / fcdTopadoMPa;

  // Radio del eje de la barra en el codo, y desarrollo del giro de 180°.
  const radioEjeMm = (mandrilMinimoTablaMm + phiT) / 2;
  const desarrolloCodoMm = Math.PI * radioEjeMm;

  // Montoya dobla el lazo en planta (fig. 24.25b): la barra entra, gira 180° en
  // horizontal y vuelve sobre sí misma. Así el desarrollo que se aloja en el
  // apoyo es casi el doble del hueco recto, que es exactamente el motivo por el
  // que la horquilla salva un anclaje que recto no entra.
  const ramaIda = (disponibleM: number) => Math.max(disponibleM * 1000 - radioEjeMm, 0);
  const ramaIdaIzqMm = ramaIda(disponibleMontoyaIzqM);
  const ramaIdaDerMm = ramaIda(disponibleMontoyaDerM);
  const desarrolloDisponibleIzqMm = 2 * ramaIdaIzqMm + desarrolloCodoMm;
  const desarrolloDisponibleDerMm = 2 * ramaIdaDerMm + desarrolloCodoMm;

  horquilla.verificaIzq = disponibleIzqM * 1000 * 2 + desarrolloCodoMm >= horquilla.lbdMm;
  horquilla.verificaDer = disponibleDerM * 1000 * 2 + desarrolloCodoMm >= horquilla.lbdMm;
  horquilla.verificaIzqMontoya = desarrolloDisponibleIzqMm >= horquilla.lbdMm;
  horquilla.verificaDerMontoya = desarrolloDisponibleDerMm >= horquilla.lbdMm;

  const ramaVuelta = (idaMm: number) =>
    Math.max(horquilla.lbdMm - idaMm - desarrolloCodoMm, 0);
  const ramaVueltaIzqMm = ramaVuelta(ramaIdaIzqMm);
  const ramaVueltaDerMm = ramaVuelta(ramaIdaDerMm);

  // El lazo separa las dos ramas el mandril más un diámetro entre ejes, y cada
  // rama ocupa medio φ más hacia afuera: en total mandril + 2φ de ancho.
  const anchoOcupadoEnPlantaM = (mandrilMinimoTablaMm + 2 * phiT) / 1000;
  const anchoLibreM = bM - 2 * recubrimientoM - (2 * diametroEstriboMm) / 1000;

  const geometriaHorquilla: ResultadoHorquillaTirante = {
    mandrilMinimoTablaMm,
    fbtKN,
    abMm,
    mandrilPorHormigonMm,
    // Art. 8.3(3): con la rama de vuelta corta —no más de 5φ tras el codo— el
    // hormigón del codo no se comprueba y basta el mandril de tabla.
    exentaDeComprobarMandril: Math.max(ramaVueltaIzqMm, ramaVueltaDerMm) <= 5 * phiT,
    mandrilAdoptadoMm:
      Math.max(ramaVueltaIzqMm, ramaVueltaDerMm) <= 5 * phiT
        ? mandrilMinimoTablaMm
        : Math.max(mandrilMinimoTablaMm, mandrilPorHormigonMm),
    desarrolloCodoMm,
    ramaIdaIzqMm,
    ramaIdaDerMm,
    desarrolloDisponibleIzqMm,
    desarrolloDisponibleDerMm,
    ramaVueltaIzqMm,
    ramaVueltaDerMm,
    anchoOcupadoEnPlantaM,
    anchoLibreM,
    cabeEnElAncho: anchoOcupadoEnPlantaM <= anchoLibreM,
    // Cada horquilla entra por una barra y vuelve por la de al lado.
    numeroHorquillas: Math.ceil(tirante.numero / 2),
  };

  // Se exige por los dos criterios: el del Anejo y el más corto de Montoya.
  const verificaRecto =
    recto.verificaIzq && recto.verificaDer && recto.verificaIzqMontoya && recto.verificaDerMontoya;
  const bastaConHorquilla =
    horquilla.verificaIzq &&
    horquilla.verificaDer &&
    horquilla.verificaIzqMontoya &&
    horquilla.verificaDerMontoya &&
    geometriaHorquilla.cabeEnElAncho;

  const anclaje: ResultadoAnclajeVigaApeo = {
    sigmaSdMPa,
    fctdMPa,
    eta1,
    eta2,
    fbdMPa,
    lbRqdMm,
    cdMm,
    recto,
    horquilla,
    geometriaHorquilla,
    disponibleIzqM,
    disponibleDerM,
    disponibleMontoyaIzqM,
    disponibleMontoyaDerM,
    verificaRecto,
    bastaConHorquilla,
    // Art. 9.7(3): si no entra recto ni doblado, la salida es el dispositivo de
    // anclaje. No es opcional: sin él el nudo no cierra el equilibrio.
    requiereAnclajeMecanico: !verificaRecto && !bastaConHorquilla,
    formaRecomendada: verificaRecto
      ? "recta"
      : bastaConHorquilla
        ? "horquilla"
        : "dispositivo mecánico",
  };

  // -------------------------------------------------------- bielas y nudos
  // La biela lleva tracción transversal —es justamente la que toma el tirante—,
  // así que su tope es el reducido de la ec. (6.56), no fcd.
  const sigmaBielaMax = 0.6 * nuPrima * fcd;
  // Nudo de apoyo: compresión con tirante anclado en una dirección, k2 = 0,85.
  const sigmaNudoApoyoMax = 0.85 * nuPrima * fcd;
  // Montoya §24.7.3.d comprueba el mismo nudo contra 0,7·fcd. No es el mismo
  // número: con fck bajo manda Montoya y por encima de fck ≈ 44 manda el Anejo.
  const sigmaNudoMontoyaMax = 0.7 * fcd;

  // Ancho de la biela en el nudo de apoyo: la biela apoya sobre la placa y sobre
  // el canto del nudo inferior (figura A19.6.27). Es el extremo estrecho, que es
  // donde se agota; Montoya §24.7.2 dice lo mismo, que gobierna el nudo de apoyo.
  const anchoBielaIzqM =
    anchoApoyoIzqM * Math.sin(anguloBielaIzq) + cantoNudoInferiorM * Math.cos(anguloBielaIzq);
  const anchoBielaDerM =
    anchoApoyoDerM * Math.sin(anguloBielaDer) + cantoNudoInferiorM * Math.cos(anguloBielaDer);

  const bielas: ResultadoBielasVigaApeo = {
    nuPrima,
    anchoBielaIzqM,
    anchoBielaDerM,
    bielaIzq: comprobar(compresionBielaIzqKN / aKNPorM2(bM * anchoBielaIzqM), sigmaBielaMax),
    bielaDer: comprobar(compresionBielaDerKN / aKNPorM2(bM * anchoBielaDerM), sigmaBielaMax),
    nudoSuperior: comprobar(
      ndPilarKN / aKNPorM2(anchoPilarApeadoM * bM),
      sigmaNudoSuperiorMax
    ),
    nudoApoyoIzq: comprobar(reaccionIzqKN / aKNPorM2(anchoApoyoIzqM * bM), sigmaNudoApoyoMax),
    nudoApoyoDer: comprobar(reaccionDerKN / aKNPorM2(anchoApoyoDerM * bM), sigmaNudoApoyoMax),
    nudoApoyoIzqMontoya: comprobar(
      reaccionIzqKN / aKNPorM2(anchoApoyoIzqM * bM),
      sigmaNudoMontoyaMax
    ),
    nudoApoyoDerMontoya: comprobar(
      reaccionDerKN / aKNPorM2(anchoApoyoDerM * bM),
      sigmaNudoMontoyaMax
    ),
    gobiernaMontoyaEnNudos: sigmaNudoMontoyaMax < sigmaNudoApoyoMax,
  };

  // ------------------------------------------- tracción transversal (6.5.3)
  // El campo de compresiones que arranca bajo el pilar apeado se abre dentro de
  // la viga y esa apertura tracciona transversalmente. `a` es el ancho cargado
  // —el pilar— y `b` el ancho en el que se admite que reparta; la altura de la
  // discontinuidad es el canto de la viga. VERIFICAR el `b` adoptado contra la
  // figura A19.6.25 antes de usar el resultado en un proyecto.
  const bRepartoM = datos.anchoRepartoM ?? Math.min(hM, luzM / 2);
  const discontinuidadParcial = bRepartoM <= hM / 2;
  const traccionTransversalKN = discontinuidadParcial
    ? 0.25 * ((bRepartoM - anchoPilarApeadoM) / bRepartoM) * ndPilarKN
    : 0.25 * (1 - (0.7 * anchoPilarApeadoM) / hM) * ndPilarKN;

  const asTransvNecCm2 = areaNecesariaCm2(Math.max(traccionTransversalKN, 0), fydEstribos);
  // La toma la malla vertical de las dos caras, repartida en la altura de la
  // discontinuidad.
  const asTransvRealCm2 =
    2 * (areaBarraCm2(datos.mallaVertical.diametroMm) / datos.mallaVertical.separacionM) * hM;

  const traccionTransversal: ResultadoTraccionTransversalVigaApeo = {
    aM: anchoPilarApeadoM,
    bRepartoM,
    discontinuidadParcial,
    traccionKN: Math.max(traccionTransversalKN, 0),
    asNecCm2: asTransvNecCm2,
    asRealCm2: asTransvRealCm2,
    verificaAs: asTransvRealCm2 >= asTransvNecCm2,
  };

  // ------------------------------------------------------------ malla (9.7)
  // Art. 9.7(1): malla ortogonal cerca de cada cara, As ≥ 0,001·Ac y nunca menos
  // de 150 mm²/m en cada cara y dirección. Ac por metro de viga es el espesor
  // por 1000 mm, así que 0,001·Ac = espesor en mm²/m.
  const asMinCm2PorM = Math.max(bM * 1000, 150) / 100;
  // Art. 9.7(2): la separación no supera el menor entre 300 mm y dos espesores.
  const separacionMaxM = Math.min(0.3, 2 * bM);
  const horizontalCm2PorM = areaBarraCm2(datos.mallaHorizontal.diametroMm) / datos.mallaHorizontal.separacionM;
  const verticalCm2PorM = areaBarraCm2(datos.mallaVertical.diametroMm) / datos.mallaVertical.separacionM;

  const malla: ResultadoMallaVigaApeo = {
    asMinCm2PorM,
    separacionMaxM,
    horizontalCm2PorM,
    verificaHorizontal: horizontalCm2PorM >= asMinCm2PorM,
    verificaSeparacionHorizontal: datos.mallaHorizontal.separacionM <= separacionMaxM,
    verticalCm2PorM,
    verificaVertical: verticalCm2PorM >= asMinCm2PorM,
    verificaSeparacionVertical: datos.mallaVertical.separacionM <= separacionMaxM,
  };

  // ----------------------------------------------------------- cuelgue
  const fraccion = fraccionColgada(transmision);
  let cuelgue: ResultadoCuelgueVigaApeo | null = null;
  if (fraccion > 0) {
    const cargaColgadaKN = fraccion * ndPilarKN;
    // Los estribos de cuelgue son armadura transversal: van con el fyd limitado,
    // igual que el resto de los estribos del proyecto.
    const asNecCuelgueCm2 = areaNecesariaCm2(cargaColgadaKN, fydEstribos);
    // Los estribos de cuelgue se concentran junto al pilar: se toma medio canto
    // a cada lado, que es el ancho en que la carga alcanza a colgarse antes de
    // que el campo de compresiones se haya formado.
    const anchoZonaM = Math.max(anchoPilarApeadoM, hM / 2);
    const asRealCuelgueCm2 = datos.cuelgue
      ? (datos.cuelgue.numeroRamas * areaBarraCm2(datos.cuelgue.diametroMm) * anchoZonaM) /
        datos.cuelgue.separacionM
      : 0;
    // Montoya §24.9.1: el canto tiene que dar para que las bielas se formen.
    const cantoMinimoM = 1.2 * (datos.cuelgue?.cantoElementoColgadoM ?? 0);

    cuelgue = {
      fraccionColgada: fraccion,
      cargaColgadaKN,
      anchoZonaM,
      asNecCm2: asNecCuelgueCm2,
      asRealCm2: asRealCuelgueCm2,
      verificaAs: asRealCuelgueCm2 >= asNecCuelgueCm2,
      verificaCantoMinimo: hM >= cantoMinimoM,
      cantoMinimoM,
    };
  }

  return {
    region,
    modelo,
    tirante: resultadoTirante,
    anclaje,
    bielas,
    traccionTransversal,
    malla,
    cuelgue,
  };
}
