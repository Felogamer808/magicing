import { areaBarraCm2 } from "../armaduras";
import { GAMMA_C } from "./coeficientes";
import type { MaterialesDerivados } from "./types";

/**
 * Ménsula corta resuelta como región D, con un modelo de bielas y tirantes.
 *
 * Una ménsula corta es una región D de manual: la carga entra concentrada sobre
 * una placa a pocos centímetros de la cara del pilar y no hay longitud para que
 * las deformaciones se linealicen, así que no vale Bernoulli y las fórmulas de
 * flexión y cortante quedan fuera de su campo de aplicación (Anejo 19, art.
 * 5.6.4(1), pág. 54, y art. 6.5). El modelo es una biela comprimida que baja de
 * la placa al pilar y un tirante horizontal arriba que cierra el equilibrio.
 *
 * Dos cosas separan este cálculo del de una viga de apeo, y son las que hay que
 * mirar antes de creerle un número:
 *
 * 1. **fyd está topado en 400 MPa.** No sale de γs: es un tope propio del
 *    elemento. Con B500S el cálculo daría 435 MPa, así que el tope pesa un 9 %
 *    sobre TODA la armadura de la ménsula, principal y cercos.
 * 2. **El tirante tiene dos lecturas incompatibles a propósito.** El Anejo 19 lo
 *    saca de la geometría del modelo; la Instrucción española, tal como la
 *    desarrolla Montoya, fija la cotangente de la biela en el coeficiente de
 *    rozamiento y da un valor independiente del vuelo. No es el mismo método con
 *    otro número: se calculan los dos y se arma por el mayor.
 *
 * Referencias:
 * - Anejo 19 (RD 470/2021), art. 5.6.4, pág. 54 — extensión de la región D.
 * - Anejo 19, art. 6.5.2 ec. (6.56), pág. 97 — biela con tracción transversal.
 * - Anejo 19, art. 6.5.4(4) ec. (6.61), págs. 98-99 — nudo comprimido con tirante.
 * - Anejo 19, art. 8.4.2 ec. (8.2), pág. 123 — tensión última de adherencia.
 * - Anejo 19, art. 8.4.3 ec. (8.3) y 8.4.3(3), pág. 124 — longitud básica,
 *   medida a lo largo del eje de la barra.
 * - Anejo 19, art. 8.4.4 ec. (8.4) y (8.5), tabla A19.8.2, págs. 124-125 — lbd.
 * - Anejo 19, art. 9.2.1.1 ec. (9.1N), pág. 140 — cuantía mínima de tracción.
 * - Anejo 19, apéndice J, art. J.3 y fig. A19.J.6, págs. 205-206 — ménsulas
 *   cortas: rango de aplicación, tirante, cercos y anclaje.
 * - Montoya 15.ª ed., cap. 24 §24.8, págs. 393-395 (impresas 359-361) —
 *   ménsulas cortas por la Instrucción española.
 */

/** Condición de adherencia de la barra al hormigonar (art. 8.4.2(2), fig. A19.8.2). */
export type CondicionAdherencia = "buena" | "mala";

/**
 * Qué familia de cercos exige el articulado, según el vuelo — art. J.3(2) y (3).
 * Con vuelo corto la biela es tendida y la cosen cercos horizontales; con vuelo
 * largo el articulado pide verticales.
 */
export type CasoCercos = "horizontales" | "verticales";

export interface GeometriaMensulaCorta {
  /** ac: del eje de la carga a la cara del pilar (m) */
  acM: number;
  /** hc: canto de la ménsula en el arranque, contra el pilar (m) */
  hcM: number;
  /** h1: canto de la ménsula en el borde exterior (m) */
  h1M: number;
  /** Ancho de la ménsula (m) */
  bM: number;
  /** Canto del pilar en el plano de la ménsula (m) */
  hcolM: number;
  /** ap: lado de la placa de apoyo según el vuelo (m) */
  apM: number;
  /** bp: lado de la placa de apoyo según el ancho (m) */
  bpM: number;
  /** Recubrimiento nominal (m) */
  recubrimientoM: number;
}

export interface DatosMensulaCorta {
  /** FEd, carga vertical de cálculo (kN), ya mayorada */
  fEdKN: number;
  /** HEd, carga horizontal de cálculo (kN), ya mayorada */
  hEdKN: number;
  /** Diámetro de la armadura principal —el marco del tirante— (mm) */
  diametroPrincipalMm: number;
  /** Diámetro de los cercos (mm) */
  diametroCercoMm: number;
  /** Art. 8.4.2(2). Si se omite, "buena". */
  condicionAdherencia?: CondicionAdherencia;
  /** α4, barra transversal soldada — tabla A19.8.2. Si se omite, no la hay. */
  barraTransversalSoldada?: boolean;
}

/** Comprobación de una tensión contra su tope. */
export interface ComprobacionMensula {
  sigmaMPa: number;
  sigmaMaxMPa: number;
  aprovechamiento: number;
  verifica: boolean;
}

/** Paso 1: materiales, con el tope de fyd propio del elemento. */
export interface ResultadoMaterialesMensula {
  fcdMPa: number;
  /** fyk/γs, sin topar (MPa) */
  fydCalculadoMPa: number;
  /** El que se usa: mín(fyk/γs; 400 MPa) — Montoya §24.8.2.d y §24.8.3.b, c, e */
  fydMPa: number;
  /** El tope está mordiendo: fyk/γs pasaba de 400 MPa */
  topeFydAplicado: boolean;
  /** Sobrecosto de armadura que introduce el tope, en tanto por uno */
  sobrecostoPorTope: number;
  /** ν′ = 1 − fck/250, factor de reducción por fisuración */
  nuPrima: number;
  /** fctm (MPa), con la rama logarítmica por encima de C50 */
  fctmMPa: number;
}

/** Paso 2: geometría del modelo de bielas y tirantes. */
export interface ResultadoModeloMensula {
  /** Canto útil, medido al eje de la armadura principal (m) */
  dM: number;
  /** Brazo mecánico del modelo, z = 0,8·d (m) */
  zM: number;
  tanTheta: number;
  thetaGrados: number;
  /** Art. J.3(1): la pieza es ménsula corta si ac < z0 */
  esMensulaCorta: boolean;
  /** Art. J.3(1): el modelo pide 1,0 ≤ tan θ ≤ 2,5 */
  tanEnRango: boolean;
  /** Queda canto en el borde para doblar la pata exterior del marco */
  cabeElDoblado: boolean;
  /** Montoya §24.8.3.d: la comprobación simplificada del nudo pide H ≤ 0,15·F */
  relacionHF: number;
  hDentroDeRango: boolean;
}

/** Paso 3: el tirante, por los dos métodos que no coinciden. */
export interface ResultadoTiranteMensula {
  /** Anejo 19 §J.3 + §6.5: Ftd = F·ac/z + H (kN) */
  ftdAnejoKN: number;
  /** cotg θ = μ = 1,4 para ménsula hormigonada monolítica — Montoya §24.8.3.a */
  cotgInstruccion: number;
  /** Instrucción española: Ftd = F·tg θ + H, independiente del vuelo (kN) */
  ftdInstruccionKN: number;
  /** Montoya §24.8.3.a: d ≥ (a/0,85)·cotg θ (m) */
  dMinInstruccionM: number;
  verificaDMinInstruccion: boolean;
  asAnejoCm2: number;
  asInstruccionCm2: number;
  /** Gobierna la Instrucción, no el Anejo */
  mandaInstruccion: boolean;
  /** Art. 9.2.1.1: máx(0,26·fctm/fyk·b·d; 0,0013·b·d) (cm²) */
  asMinimaCm2: number;
  /** Montoya §24.8.2.c, cuantía mecánica del ACI: 0,04·b·d·fcd/fyd (cm²) */
  asMecanicaAciCm2: number;
  /** El mayor de los cuatro (cm²) */
  asNecCm2: number;
  /** Manda una cuantía mínima y no el tirante */
  mandaCuantiaMinima: boolean;
  numeroBarras: number;
  asRealCm2: number;
  aprovechamiento: number;
  verificaAs: boolean;
}

/** Paso 4: hormigón — nudo, biela y tensión tangencial. */
export interface ResultadoHormigonMensula {
  /** Nudo bajo la placa, CCT con k2 = 0,85 — ec. (6.61) */
  nudo: ComprobacionMensula;
  /** Biela con tracción transversal, 0,6·ν′·fcd — ec. (6.56) */
  biela: ComprobacionMensula;
  /** Ancho de la biela en el nudo superior (m) */
  anchoBielaM: number;
  /** Canto eficaz del nudo superior, 2·(hc − d) (m) */
  cantoNudoM: number;
  /** Compresión de la biela (kN) */
  compresionBielaKN: number;
  /** Montoya §24.8.2.e: τd ≤ 0,25·fcd y nunca más de 5 MPa */
  tangencial: ComprobacionMensula;
  /** Canto útil en el borde exterior del área cargada (m) */
  d0M: number;
  /** Montoya §24.8.1: d0 ≥ d/2 o hay riesgo de degollamiento (m) */
  d0MinM: number;
  verificaD0: boolean;
}

/** Paso 5: cercos. */
export interface ResultadoCercosMensula {
  caso: CasoCercos;
  /** Art. J.3(2) k1 = 0,25·As,main, o J.3(3) k2 = 0,5·FEd/fyd (cm²) */
  asAnejoCm2: number;
  /** Montoya §24.8.3.c: 0,2·Fvd/fyd, sólo en el caso de vuelo corto (cm²) */
  asInstruccionCm2: number;
  asNecCm2: number;
  mandaInstruccion: boolean;
  numeroCercos: number;
  asRealCm2: number;
  verificaAs: boolean;
  /** Los cercos que salen por área, antes del mínimo de 3 y del de separación */
  numeroPorArea: number;
  /**
   * Segunda familia, sólo en el caso de vuelo largo: el articulado cuantifica
   * los verticales pero su propia fig. A19.J.6(b) dibuja además horizontales sin
   * ponerles número. Los cuantifica Montoya §24.8.3.c, en los 2/3 superiores de
   * d. Van las dos familias, no una en vez de otra.
   */
  horizontales: {
    asNecCm2: number;
    numeroCercos: number;
    asRealCm2: number;
    verificaAs: boolean;
  } | null;
  /** Profundidad hasta la que se acreditan como A2: 2·d/3 — §24.8.3.c (m) */
  limite2d3M: number;
}

/** Paso 6: anclaje del marco, §8.4 medido sobre el eje de la barra. */
export interface ResultadoAnclajeMensula {
  fctdMPa: number;
  eta1: number;
  eta2: number;
  fbdMPa: number;
  /** σsd en el arranque, con el tirante que gobierna y el acero realmente puesto (MPa) */
  sigmaSdMPa: number;
  /** lb,rqd = (φ/4)·(σsd/fbd) — ec. (8.3) (mm) */
  lbRqdMm: number;
  cdMm: number;
  alfa1: number;
  alfa2: number;
  alfa3: number;
  alfa4: number;
  /** α5 por la presión transversal bajo la placa; sólo del lado de la ménsula */
  alfa5: number;
  /** Presión transversal bajo la placa (MPa) */
  presionTransversalMPa: number;
  lbMinMm: number;
  /** lbd del lado de la ménsula, con α5 (mm) */
  lbdMensulaMm: number;
  /** lbd del lado del pilar, sin α5 (mm) */
  lbdPilarMm: number;
  disponibleMensulaMm: number;
  disponiblePilarMm: number;
  /** Longitud de la pata dentro del pilar: se dimensiona, no se comprueba (mm) */
  pataPilarMm: number;
  verificaMensula: boolean;
  verificaPilar: boolean;
}

/** Un cerco ya ubicado, con su longitud de taller. */
export interface CercoDispuesto {
  tipo: "horizontal" | "vertical";
  /** Profundidad desde la cara superior, sólo en los horizontales (m) */
  yM: number;
  /** Distancia a la cara alejada del pilar, sólo en los verticales (m) */
  xM: number;
  /** Luz del cerco en su plano (m) */
  luzM: number;
  /** Desarrollo total del cerco cerrado, sin patillas (m) */
  desarrolloM: number;
}

/** Paso 7: geometría del armado y despiece. */
export interface ResultadoDespieceMensula {
  /** Vuelo total de la ménsula, del arranque al borde (m) */
  vueloTotalM: number;
  /** Profundidad del tirante desde la cara superior (m) */
  yTiranteM: number;
  /** Tramos del marco principal, en el orden en que se dobla (m) */
  patalPilarM: number;
  tramoSuperiorM: number;
  bajadaExteriorM: number;
  retornoIntradosM: number;
  /** Desarrollo total de una barra del marco (m) */
  desarrolloBarraM: number;
  cercos: CercoDispuesto[];
  /** Longitud de los cercos horizontales, del más largo al más corto (m) */
  luzCercoMaximaM: number;
  luzCercoMinimaM: number;
}

export interface ResultadoMensulaCorta {
  materiales: ResultadoMaterialesMensula;
  modelo: ResultadoModeloMensula;
  tirante: ResultadoTiranteMensula;
  hormigon: ResultadoHormigonMensula;
  cercos: ResultadoCercosMensula;
  anclaje: ResultadoAnclajeMensula;
  despiece: ResultadoDespieceMensula;
}

/** MPa → kN/m². */
const aKNPorM2 = (mpa: number) => mpa * 1000;

/** kN de tracción y fyd en MPa → cm² de acero. */
const areaNecesariaCm2 = (traccionKN: number, fydMPa: number) =>
  (traccionKN / aKNPorM2(fydMPa)) * 100 ** 2;

const acotar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const comprobar = (sigmaMPa: number, sigmaMaxMPa: number): ComprobacionMensula => ({
  sigmaMPa,
  sigmaMaxMPa,
  aprovechamiento: sigmaMPa / sigmaMaxMPa,
  verifica: sigmaMPa <= sigmaMaxMPa,
});

export function calcularMensulaCorta(
  materiales: MaterialesDerivados,
  geometria: GeometriaMensulaCorta,
  datos: DatosMensulaCorta
): ResultadoMensulaCorta {
  const { acM, hcM, h1M, bM, hcolM, apM, bpM, recubrimientoM } = geometria;
  const { fEdKN, hEdKN, diametroPrincipalMm, diametroCercoMm } = datos;
  const { fck, fyk, fcd, fyd } = materiales;

  const phiP = diametroPrincipalMm;
  const phiE = diametroCercoMm;

  // ------------------------------------------------------------- materiales
  // El tope de fyd es de la Instrucción española y es del elemento, no del
  // material: en ménsulas cortas no se toma fyd mayor que 400 N/mm². Montoya lo
  // repite en las cuatro fórmulas del capítulo (§24.8.2.d y §24.8.3.b, c y e,
  // págs. 394-395), así que se aplica al marco principal y también a los cercos.
  const fydTopadoMPa = Math.min(fyd, 400);
  const topeFydAplicado = fyd > 400;
  const nuPrima = 1 - fck / 250;

  // derivarMateriales sólo trae la rama de la tabla A19.3.1 hasta C50. Por
  // encima el fctm es logarítmico y la diferencia llega al 10 %, que entra
  // directo en la cuantía mínima y en el anclaje: se calcula acá la rama que
  // falta en vez de arrastrar el valor corto.
  const fctmMPa =
    fck <= 50 ? materiales.fctm : 2.12 * Math.log(1 + (fck + 8) / 10);

  const resultadoMateriales: ResultadoMaterialesMensula = {
    fcdMPa: fcd,
    fydCalculadoMPa: fyd,
    fydMPa: fydTopadoMPa,
    topeFydAplicado,
    sobrecostoPorTope: topeFydAplicado ? fyd / 400 - 1 : 0,
    nuPrima,
    fctmMPa,
  };

  // ----------------------------------------------------------------- modelo
  // El canto útil se mide al eje del marco principal, que va por dentro del
  // cerco: recubrimiento + cerco + medio diámetro.
  const dM = hcM - recubrimientoM - phiE / 1000 - phiP / 2000;
  const zM = 0.8 * dM;
  const tanTheta = zM / acM;
  const theta = Math.atan(tanTheta);

  const modelo: ResultadoModeloMensula = {
    dM,
    zM,
    tanTheta,
    thetaGrados: (theta * 180) / Math.PI,
    // Art. J.3(1): fuera de ac < z0 el modelo de ménsula corta no aplica y la
    // pieza se calcula como voladizo a flexión.
    esMensulaCorta: acM < zM,
    tanEnRango: tanTheta >= 1.0 && tanTheta <= 2.5,
    // Sin canto en el borde no hay dónde alojar la pata exterior del marco.
    cabeElDoblado: h1M - 2 * (recubrimientoM + phiE / 1000) > (4 * phiP) / 1000,
    relacionHF: fEdKN > 0 ? hEdKN / fEdKN : 0,
    // Montoya §24.8.3.d: por encima del 15 % el nudo deja de estar dominado por
    // la presión vertical bajo la placa y hay que ir al modelo general del
    // §24.6. La tolerancia absorbe el redondeo de quien carga 0,15·F a mano.
    hDentroDeRango: hEdKN <= 0.15 * fEdKN + 0.05,
  };

  // ---------------------------------------------------------------- tirante
  // Dos lecturas del mismo modelo, incompatibles a propósito:
  //  · Anejo 19 §J.3 + §6.5: manda la geometría, Ftd = F·ac/z + H.
  //  · Instrucción española (Montoya §24.8.3.a-b, pág. 395): la cotangente de la
  //    biela se fija en el μ del rozamiento —1,4 si la ménsula se hormigona
  //    monolítica con el pilar— y sale Ftd = F·tg θ + H, independiente de ac.
  // cotg 1,4 equivale a tan θ = 0,71, fuera del rango 1,0-2,5 del §J.3(1): son
  // métodos distintos, no el mismo con otro número. Se arma por el mayor.
  const ftdAnejoKN = (fEdKN * acM) / zM + hEdKN;
  const cotgInstruccion = 1.4;
  const ftdInstruccionKN = fEdKN / cotgInstruccion + hEdKN;
  const dMinInstruccionM = (acM * cotgInstruccion) / 0.85;

  const asAnejoCm2 = areaNecesariaCm2(ftdAnejoKN, fydTopadoMPa);
  const asInstruccionCm2 = areaNecesariaCm2(ftdInstruccionKN, fydTopadoMPa);
  const mandaInstruccion = asInstruccionCm2 > asAnejoCm2;

  // Art. 9.2.1.1, cuantía mínima de tracción. Las áreas van en cm²: b y d en m
  // dan m², que multiplicados por 10 000 pasan a cm².
  const areaBrutaCm2 = bM * dM * 100 ** 2;
  const asMinimaCm2 = Math.max((0.26 * fctmMPa * areaBrutaCm2) / fyk, 0.0013 * areaBrutaCm2);
  // Cuantía mecánica mínima del ACI que recoge Montoya en §24.8.2.c: evita la
  // rotura frágil por fisuración de la cabeza superior. "Más bien severa, no
  // figura en la Instrucción española y es determinante en muchos casos."
  const asMecanicaAciCm2 = (0.04 * areaBrutaCm2 * fcd) / fydTopadoMPa;

  const asPorTiranteCm2 = Math.max(asAnejoCm2, asInstruccionCm2);
  const asNecCm2 = Math.max(asPorTiranteCm2, asMinimaCm2, asMecanicaAciCm2);
  const areaUnaBarraCm2 = areaBarraCm2(phiP);
  const numeroBarras = Math.max(2, Math.ceil(asNecCm2 / areaUnaBarraCm2));
  const asRealCm2 = numeroBarras * areaUnaBarraCm2;

  const tirante: ResultadoTiranteMensula = {
    ftdAnejoKN,
    cotgInstruccion,
    ftdInstruccionKN,
    dMinInstruccionM,
    verificaDMinInstruccion: dM >= dMinInstruccionM,
    asAnejoCm2,
    asInstruccionCm2,
    mandaInstruccion,
    asMinimaCm2,
    asMecanicaAciCm2,
    asNecCm2,
    mandaCuantiaMinima: asNecCm2 > asPorTiranteCm2,
    numeroBarras,
    asRealCm2,
    aprovechamiento: asNecCm2 / asRealCm2,
    verificaAs: asRealCm2 >= asNecCm2,
  };

  // -------------------------------------------------------------- hormigón
  // Nudo bajo la placa: compresión con tirante anclado, k2 = 0,85 — ec. (6.61).
  // El ancho que resiste es el de la placa, no el de la ménsula: usar b
  // sobreestimaría el nudo cuando bp < b.
  const sigmaNudo = fEdKN / aKNPorM2(apM * bpM);
  const nudo = comprobar(sigmaNudo, 0.85 * nuPrima * fcd);

  // Biela: lleva la tracción transversal que toma el tirante, así que su tope es
  // el reducido de la ec. (6.56). El ancho en el nudo superior es la proyección
  // de la placa más la del canto eficaz del nudo.
  const cantoNudoM = 2 * (hcM - dM);
  const anchoBielaM = apM * Math.sin(theta) + cantoNudoM * Math.cos(theta);
  const compresionBielaKN = fEdKN / Math.sin(theta);
  const biela = comprobar(
    compresionBielaKN / aKNPorM2(bpM * anchoBielaM),
    0.6 * nuPrima * fcd
  );

  // Montoya §24.8.2.e, pág. 394: τd ≤ 0,25·fcd y en ningún caso mayor de 5 MPa.
  const tangencial = comprobar(fEdKN / aKNPorM2(bM * dM), Math.min(0.25 * fcd, 5));

  // Intradós inclinado: el canto pasa de hc en el arranque a h1 en el borde.
  const vueloTotalM = acM + apM / 2 + 0.06;
  const cantoEn = (xDesdeLaCaraM: number) =>
    hcM - acotar(xDesdeLaCaraM / vueloTotalM, 0, 1) * (hcM - h1M);
  // Canto útil en el borde exterior del área cargada — Montoya §24.8.1, pág.
  // 393. Con d0 < d/2 puede abrirse una fisura oblicua entre el punto de
  // aplicación de la carga y la cara inclinada: degollamiento, fallo repentino.
  const recubrimientoBarraM = recubrimientoM + phiE / 1000;
  const d0M = cantoEn(acM + apM / 2) - recubrimientoBarraM - phiP / 2000;
  const d0MinM = dM / 2;

  const hormigon: ResultadoHormigonMensula = {
    nudo,
    biela,
    anchoBielaM,
    cantoNudoM,
    compresionBielaKN,
    tangencial,
    d0M,
    d0MinM,
    verificaD0: d0M >= d0MinM,
  };

  // ---------------------------------------------------------------- cercos
  const caso: CasoCercos = acM <= 0.5 * hcM ? "horizontales" : "verticales";
  // Mismo desacuerdo que en el tirante: el Anejo ata los cercos a la armadura
  // principal, la Instrucción los ata a la carga (§24.8.3.c: A2·fyd = 0,2·Fvd).
  const asCercosAnejoCm2 =
    caso === "horizontales"
      ? 0.25 * asNecCm2
      : areaNecesariaCm2(0.5 * fEdKN, fydTopadoMPa);
  const asCercosInstruccionCm2 =
    caso === "horizontales" ? areaNecesariaCm2(0.2 * fEdKN, fydTopadoMPa) : 0;
  const asCercosNecCm2 = Math.max(asCercosAnejoCm2, asCercosInstruccionCm2);

  // Cercos cerrados: dos ramas por cerco.
  const areaCercoCm2 = 2 * areaBarraCm2(phiE);
  const numeroPorArea = Math.ceil(asCercosNecCm2 / areaCercoCm2);

  // Banda que ocupa el paquete horizontal, en profundidad desde la cara superior.
  const yTiranteM = hcM - dM;
  const yPrimerCercoM = yTiranteM + Math.max(0.04, (3 * phiE) / 1000);
  // §24.8.3.c sólo acredita como A2 los cercos alojados en los dos tercios
  // superiores del canto útil: más abajo la biela ya no pasa por ellos.
  const limite2d3M = (2 / 3) * dM;
  // Y por vuelo: por debajo de cierto vuelo remanente el cerco está
  // prácticamente entero dentro del pilar y no confina nada.
  const vueloMinimoCercoM = Math.max(0.1, (6 * phiE) / 1000);
  const yUltimoCercoM = acotar(
    Math.min(
      hcM -
        recubrimientoBarraM -
        ((hcM - h1M) * (vueloMinimoCercoM + (phiP + phiE) / 2000)) / (vueloTotalM || 1),
      limite2d3M
    ),
    yPrimerCercoM + 0.01,
    hcM - recubrimientoBarraM
  );

  // Además del área, un criterio de despiece: separación ≤ 150 mm, para que el
  // paquete cosa realmente la biela y no queden dos cercos sueltos.
  const bandaM = caso === "horizontales" ? yUltimoCercoM - yPrimerCercoM : acM;
  const numeroCercos = Math.max(
    3,
    numeroPorArea,
    Math.ceil(bandaM / 0.15) + (caso === "horizontales" ? 1 : 0)
  );

  const asCercosHorizCm2 =
    caso === "verticales" ? areaNecesariaCm2(0.2 * fEdKN, fydTopadoMPa) : 0;
  const numeroCercosHoriz =
    caso === "verticales"
      ? Math.max(
          3,
          Math.ceil(asCercosHorizCm2 / areaCercoCm2),
          Math.ceil((yUltimoCercoM - yPrimerCercoM) / 0.15) + 1
        )
      : 0;

  const cercos: ResultadoCercosMensula = {
    caso,
    asAnejoCm2: asCercosAnejoCm2,
    asInstruccionCm2: asCercosInstruccionCm2,
    asNecCm2: asCercosNecCm2,
    mandaInstruccion: asCercosInstruccionCm2 > asCercosAnejoCm2,
    numeroCercos,
    asRealCm2: numeroCercos * areaCercoCm2,
    verificaAs: numeroCercos * areaCercoCm2 >= asCercosNecCm2,
    numeroPorArea,
    horizontales:
      caso === "verticales"
        ? {
            asNecCm2: asCercosHorizCm2,
            numeroCercos: numeroCercosHoriz,
            asRealCm2: numeroCercosHoriz * areaCercoCm2,
            verificaAs: numeroCercosHoriz * areaCercoCm2 >= asCercosHorizCm2,
          }
        : null,
    limite2d3M,
  };

  // ------------------------------------------ geometría del marco y despiece
  // Ejes: x desde la cara del pilar alejada de la ménsula, y desde la cara
  // superior. El marco es cerrado en alzado —fig. A19.J.6, letra A: "dispositivos
  // de anclaje o lazos"—: baja por la cara exterior y vuelve por el intradós.
  const xIzqM = recubrimientoBarraM;
  const xDerM = hcolM + vueloTotalM - recubrimientoBarraM;
  const yBajadaM = Math.max(
    yTiranteM + 0.01,
    cantoEn(vueloTotalM - recubrimientoBarraM) - recubrimientoBarraM
  );
  const xFinRetornoM = hcolM + 0.02;
  const yFinRetornoM = Math.max(
    yBajadaM,
    cantoEn(xFinRetornoM - hcolM) - recubrimientoBarraM
  );

  const tramoSuperiorM = xDerM - xIzqM;
  const bajadaExteriorM = yBajadaM - yTiranteM;
  const retornoIntradosM = Math.hypot(xDerM - xFinRetornoM, yFinRetornoM - yBajadaM);

  // ---------------------------------------------------------------- anclaje
  // fctd = αct·fctk;0,05/γc, con fctk;0,05 = 0,7·fctm (tabla A19.3.1) y
  // αct = 1,00 (ec. 3.16).
  const fctdMPa = (0.7 * fctmMPa) / GAMMA_C;
  const eta1 = (datos.condicionAdherencia ?? "buena") === "buena" ? 1.0 : 0.7;
  const eta2 = phiP <= 32 ? 1.0 : (132 - phiP) / 100;
  const fbdMPa = 2.25 * eta1 * eta2 * fctdMPa;

  // σsd es la tensión real en el arranque con el acero realmente puesto: armar
  // de más no sólo baja el aprovechamiento, acorta el anclaje.
  const sigmaSdMPa = Math.min(
    fydTopadoMPa,
    (10 * Math.max(ftdAnejoKN, ftdInstruccionKN)) / asRealCm2
  );
  const lbRqdMm = (phiP / 4) * (sigmaSdMPa / fbdMPa);

  // cd = mín(a/2; c1; c) — fig. A19.8.3, forma acodada.
  const anchoLibreMm =
    numeroBarras > 1
      ? ((bM - 2 * recubrimientoBarraM) * 1000 - numeroBarras * phiP) / (numeroBarras - 1)
      : (bM - 2 * recubrimientoBarraM) * 1000;
  const cdMm = Math.min(anchoLibreMm / 2, recubrimientoBarraM * 1000);

  const alfa1 = cdMm > 3 * phiP ? 0.7 : 1.0;
  const alfa2 = acotar(1 - (0.15 * (cdMm - 3 * phiP)) / phiP, 0.7, 1);
  // α3 = 1,0 a propósito: no se descuenta el confinamiento de los cercos, que
  // exige justificar armadura transversal que esta herramienta no conoce.
  const alfa3 = 1.0;
  const alfa4 = datos.barraTransversalSoldada ? 0.7 : 1.0;
  const presionTransversalMPa = fEdKN / aKNPorM2(apM * bpM);
  // α5 sólo vale donde hay presión transversal: bajo la placa, o sea del lado de
  // la ménsula. Del lado del pilar no se cuenta.
  const alfa5 = acotar(1 - 0.04 * presionTransversalMPa, 0.7, 1);

  const lbMinMm = Math.max(0.3 * lbRqdMm, 10 * phiP, 100);
  // Ec. (8.5): el producto α2·α3·α5 no baja de 0,7 por mucho que den los tres.
  const lbdMensulaMm = Math.max(
    lbMinMm,
    alfa1 * Math.max(0.7, alfa2 * alfa3 * alfa5) * alfa4 * lbRqdMm
  );
  const lbdPilarMm = Math.max(lbMinMm, alfa1 * Math.max(0.7, alfa2 * alfa3) * lbRqdMm);

  // Disponible, medido a lo largo del eje de la barra — art. 8.4.3(3). Por eso
  // la pata exterior y el retorno por el intradós cuentan.
  const xPlacaM = hcolM + acM - apM / 2; // cara interior de la placa — §J.3(4)
  const disponibleMensulaMm =
    (xDerM - xPlacaM + bajadaExteriorM + retornoIntradosM) * 1000;

  // Del lado del pilar la pata no se comprueba: se dimensiona para cubrir lbd,
  // redondeando a 10 mm y nunca por debajo de 15φ. El resultado útil ahí es la
  // longitud de la pata, no el ratio.
  const rectaPilarMm = (hcolM - recubrimientoBarraM - xIzqM) * 1000;
  const pataPilarMm = Math.max(
    15 * phiP,
    Math.ceil((lbdPilarMm - rectaPilarMm) / 10) * 10
  );
  const disponiblePilarMm = rectaPilarMm + pataPilarMm;

  const anclaje: ResultadoAnclajeMensula = {
    fctdMPa,
    eta1,
    eta2,
    fbdMPa,
    sigmaSdMPa,
    lbRqdMm,
    cdMm,
    alfa1,
    alfa2,
    alfa3,
    alfa4,
    alfa5,
    presionTransversalMPa,
    lbMinMm,
    lbdMensulaMm,
    lbdPilarMm,
    disponibleMensulaMm,
    disponiblePilarMm,
    pataPilarMm,
    verificaMensula: disponibleMensulaMm >= lbdMensulaMm,
    verificaPilar: disponiblePilarMm >= lbdPilarMm,
  };

  // --------------------------------------------------------------- despiece
  // Posición del marco a cada profundidad: la pata exterior baja recta hasta
  // yBajada y después el retorno sigue el intradós. Los cercos mueren por dentro.
  const xMarcoEn = (yM: number) =>
    yM <= yBajadaM
      ? xDerM
      : hcolM +
        acotar((hcM - yM - recubrimientoBarraM) / (hcM - h1M || 1), 0, 1) * vueloTotalM;

  // El cerco cerrado cruza la pieza entera: abraza la pata del marco en la cara
  // alejada del pilar y vuelve a abrazarla en la exterior, apoyándose por dentro
  // de la barra principal a los dos lados —medio diámetro de cada una, que es el
  // contacto real—. Así ni muere en el aire del lado de la ménsula ni se queda
  // sin anclar del lado del pilar.
  const xCercoIzqM = xIzqM + (phiP + phiE) / 2000;
  const xCercoDerEn = (yM: number) => xMarcoEn(yM) - (phiP + phiE) / 2000;
  const anchoCercoM = bM - 2 * recubrimientoM;

  const cercosDispuestos: CercoDispuesto[] = [];
  const agregarHorizontales = (cantidad: number) => {
    for (let i = 0; i < cantidad; i++) {
      const yM =
        cantidad > 1
          ? yPrimerCercoM + (i * (yUltimoCercoM - yPrimerCercoM)) / (cantidad - 1)
          : (yPrimerCercoM + yUltimoCercoM) / 2;
      const luzM = Math.max(hcolM + 0.04, xCercoDerEn(yM)) - xCercoIzqM;
      cercosDispuestos.push({
        tipo: "horizontal",
        yM,
        xM: 0,
        luzM,
        desarrolloM: 2 * (luzM + anchoCercoM),
      });
    }
  };

  if (caso === "horizontales") {
    agregarHorizontales(numeroCercos);
  } else {
    for (let i = 1; i <= numeroCercos; i++) {
      const xM = hcolM + (i * acM) / (numeroCercos + 1);
      const luzM = cantoEn(xM - hcolM) - recubrimientoBarraM - (yTiranteM + 0.008);
      cercosDispuestos.push({
        tipo: "vertical",
        yM: 0,
        xM,
        luzM,
        desarrolloM: 2 * (luzM + anchoCercoM),
      });
    }
    agregarHorizontales(numeroCercosHoriz);
  }

  const luces = cercosDispuestos.filter((c) => c.tipo === "horizontal").map((c) => c.luzM);

  const despiece: ResultadoDespieceMensula = {
    vueloTotalM,
    yTiranteM,
    patalPilarM: pataPilarMm / 1000,
    tramoSuperiorM,
    bajadaExteriorM,
    retornoIntradosM,
    desarrolloBarraM:
      pataPilarMm / 1000 + tramoSuperiorM + bajadaExteriorM + retornoIntradosM,
    cercos: cercosDispuestos,
    luzCercoMaximaM: luces.length ? Math.max(...luces) : 0,
    luzCercoMinimaM: luces.length ? Math.min(...luces) : 0,
  };

  return {
    materiales: resultadoMateriales,
    modelo,
    tirante,
    hormigon,
    cercos,
    anclaje,
    despiece,
  };
}
