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
 * - Anejo 19, art. 9.7, pág. 152 — malla mínima de vigas de gran canto.
 * - Anejo 19, art. 9.9, pág. 155 — regiones D, anclaje del tirante.
 * - Montoya 15.ª ed., cap. 24 §24.7, pág. 391 (impresa 357) — vigas pared.
 * - Montoya, §24.9.1 y §24.9.2, págs. 396-397 (impresas 362-363) — cargas
 *   colgadas e indirectas, vigas cortas.
 */

/** Cómo llega a la viga la carga del pilar apeado (Montoya §24.9.1, pág. 396). */
export type TransmisionCarga = "directa" | "indirecta" | "colgada";

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
  /** Armadura del tirante inferior */
  tirante: ArmaduraElegida;
  /** Diámetro del estribo que envuelve al tirante (mm), para ubicar su centroide */
  diametroEstriboMm: number;
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
  /** Separación entre barras si van en una sola fila (mm) */
  separacionMm: number;
  /** Ancho necesario para alojar las barras en una fila (m) */
  bNecM: number;
  verificaBNec: boolean;
}

/** Paso 4: anclaje del tirante en el nudo de apoyo. */
export interface ResultadoAnclajeVigaApeo {
  lbMm: number;
  lbNetaMm: number;
  /** Longitud disponible desde la cara interior del apoyo hasta el borde (m) */
  disponibleIzqM: number;
  disponibleDerM: number;
  verificaAnclajeIzq: boolean;
  verificaAnclajeDer: boolean;
  /** Si no verifica hay que doblar, poner cercos en U o dispositivos — art. 9.7(3) */
  requiereAnclajeMecanico: boolean;
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
  const { fck, fcd, fyk, fyd, fydEstribos } = materiales;

  const phiT = tirante.diametroMm;
  const dM = hM - recubrimientoM - diametroEstriboMm / 1000 - phiT / 2000;

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
  const asRealCm2 = tirante.numero * areaBarraCm2(phiT);

  const bNecM =
    2 * (recubrimientoM + diametroEstriboMm / 1000) +
    (tirante.numero * phiT) / 1000 +
    (tirante.numero - 1) * Math.max(0.02, phiT / 1000);
  const separacionMm =
    tirante.numero > 1
      ? ((bM - 2 * recubrimientoM - (2 * diametroEstriboMm) / 1000 - phiT / 1000) /
          (tirante.numero - 1)) *
        1000
      : 0;

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
    alturaRepartoM: 0.12 * luzMontoyaM,
    separacionMm,
    bNecM,
    verificaBNec: bNecM <= bM,
  };

  // --------------------------------------------------------------- anclaje
  // Misma expresión de lb que usa el resto del proyecto (vigas-complementos),
  // para que el criterio de anclaje sea uno solo en toda la herramienta.
  const lbMm = Math.ceil(Math.max(1.4 * 1.3 * phiT ** 2, (fyk * phiT) / 14));
  const lbNetaMm = Math.max((lbMm * asNecCm2) / asRealCm2, 10 * phiT, 150, lbMm / 3);
  // Art. 6.5.4(7): el anclaje empieza en el inicio del nudo, o sea en la cara
  // interior del apoyo, y se extiende sobre todo el nudo y el voladizo.
  const disponibleIzqM = anchoApoyoIzqM + voladizoIzqM - recubrimientoM;
  const disponibleDerM = anchoApoyoDerM + voladizoDerM - recubrimientoM;
  const verificaAnclajeIzq = disponibleIzqM * 1000 >= lbNetaMm;
  const verificaAnclajeDer = disponibleDerM * 1000 >= lbNetaMm;

  const anclaje: ResultadoAnclajeVigaApeo = {
    lbMm,
    lbNetaMm,
    disponibleIzqM,
    disponibleDerM,
    verificaAnclajeIzq,
    verificaAnclajeDer,
    requiereAnclajeMecanico: !verificaAnclajeIzq || !verificaAnclajeDer,
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
