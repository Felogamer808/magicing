import { calcularAnclaje, mandrilMinimoMm } from "@/lib/calc/hormigon/comun/anclaje";
import type { ArmaduraElegida, MaterialesDerivados } from "@/lib/calc/hormigon/comun/types";
import { calcularZonaCargada, type ResultadoZonaCargada } from "@/lib/calc/hormigon/zona-parcialmente-cargada";

/**
 * Macizo de transición: un pilar que descarga descentrado sobre el de abajo, a
 * través de un macizo de hormigón donde apoya entero. Es una región D y se
 * resuelve por bielas y tirantes con el Anejo 19 y nada más.
 *
 * Se arma como un cabezal, por planos (criterios del usuario, 2026-10-29). X
 * es la dirección de la excentricidad, Y la transversal y Z la vertical.
 *
 * Plano XZ, el de la excentricidad:
 *
 *              A ╔═══════ U, tramo superior: T ═══════╗ B   ↓ Nd (+ Md)
 *              ║ ⋱                               ⋰   ║
 *    U, rama   ║    ⋱ biela AC          ⋰ biela BC     ║ U, rama del lado
 *    esperas   ║        ⋱          ⋰                   ║ de la carga
 *       Ts     ║            C                          ║ (ancla T)
 *         ─────╨────────────▲──────────────────────────╨─  barras inferiores
 *                      C = Nd + Ts
 *
 *  - C es la cabeza del pilar inferior: el hormigón trabaja a σRd,max =
 *    k1·ν'·fcd (ec. 6.60) en un ancho c, y las barras del pilar del lado de la
 *    carga, que siguen como esperas comprimidas dentro del macizo, suman
 *    Fs' = As'·σs' (pedido del usuario, 2026-10-30). σs' = mín(fyd; Es·εc2):
 *    la zona del nudo está comprimida de forma uniforme y su deformación media
 *    se limita a εc2 por analogía con el art. 6.1 (5), pág. 74 (criterio del
 *    usuario). Con εc2 = 2 ‰ son 400 MPa. Si la resultante entra en el pilar
 *    sólo con hormigón, Ts = 0 y no hay tirante.
 *  - T = Nd·(yN − yC)/z = Ts·(yC − yT)/z, con z del eje del tirante a la cara
 *    inferior del macizo, que es la cabeza del pilar inferior.
 *  - Tirante y esperas son una sola armadura, una U invertida continua: sube
 *    del pilar como esperas, gira en A, cruza como tirante y baja por la cara
 *    del lado de la carga, que es su anclaje (con una patilla abajo si no
 *    alcanza). Viene del pilar —sus barras o esperas solapadas en el pilar,
 *    no en el macizo—, así que dentro del macizo no hay solape ni anclaje de
 *    esperas: en A la fuerza pasa por el doblado, y se verifica el mandril.
 *  - El Md del pilar superior, si lo hay, corre la carga: e total = e + Md/Nd.
 *
 * Planos YZ y XY: cercos horizontales en toda la altura. Sus ramas en Y cosen
 * la tracción transversal de la carga que se abre del pilar superior al
 * macizo (art. 6.7 y 6.5.3); sus ramas en X, la de la otra dirección si la hay.
 *
 * Cara inferior: barras aparte con la cuantía mínima de la malla de las vigas
 * de gran canto (art. 9.7 (1)), por analogía: el macizo trabaja en XZ como una
 * viga de gran canto de espesor igual a su lado en Y.
 *
 * El pilar inferior queda con N = Nd y M = Nd·e total en su cabeza, que se
 * verifican en Pilares; repartir ese momento entre la losa y la base es parte
 * de ese cálculo, no de éste.
 *
 * Referencias (Anejo 19, RD 470/2021):
 * - art. 3.1.2, tabla A19.3.1, pág. 26 — εc2; art. 3.2.7 (4) — Es = 200 GPa.
 * - art. 6.1 (5), pág. 74 — deformación media de una zona comprimida centrada ≤ εc2.
 * - art. 6.5.2 (2), ec. (6.57), pág. 97 — ν' = 1 − fck/250.
 * - art. 6.5.3 (3), ec. (6.58), (6.59), págs. 97-98 — tracción transversal.
 * - art. 6.5.4 (4), ec. (6.60), (6.61), (6.62), págs. 98-99 — nudos, k1, k2, k3.
 * - art. 6.5.4 (7), pág. 100 — el anclaje empieza en la cara interior del nudo.
 * - art. 6.7, ec. (6.63), pág. 101 — carga concentrada.
 * - art. 8.3 (3), ec. (8.1), pág. 122 — mandril de una barra doblada con carga.
 * - art. 8.3, tabla A19.8.1, pág. 122 — mandril mínimo.
 * - art. 8.4.3 (3), pág. 124 — en patillas, lbd se mide por el eje de la barra.
 * - art. 9.7 (1) y (2), pág. 152 — malla mínima y separación de vigas de gran canto.
 */

/** Sección rectangular de un pilar: un lado en el plano de la excentricidad y otro transversal. */
export interface SeccionPilar {
  /** Lado en el plano de la excentricidad (m) */
  enPlanoM: number;
  /** Lado transversal (m) */
  transversalM: number;
}

export interface GeometriaMacizo {
  /** Canto del macizo (m) */
  hM: number;
  /** Lado del macizo en el plano de la excentricidad (m) */
  anchoM: number;
  /** Lado del macizo transversal a la excentricidad (m) */
  profundidadM: number;
  /** Recubrimiento hasta la cara exterior del cerco (m) */
  recubrimientoM: number;
  pilarSuperior: SeccionPilar;
  pilarInferior: SeccionPilar;
  /** e: entre los ejes de los dos pilares, en el plano (m) */
  excentricidadM: number;
  /**
   * Del borde del pilar inferior del lado opuesto a la carga a la cara del
   * macizo de ese lado (m). 0 si están enrasados.
   */
  bordeTraccionadoM: number;
}

/** Cercos horizontales del macizo, en toda su altura. */
export interface CercosMacizo {
  diametroMm: number;
  /** Ramas que corren en X: cosen tracciones en X */
  ramasX: number;
  /** Ramas que corren en Y: cosen tracciones en Y */
  ramasY: number;
  separacionM: number;
}

export interface DatosMacizo {
  /** Nd del pilar superior, mayorado (kN) */
  nEdKN: number;
  /** Md del pilar superior en el plano; positivo si aleja la carga del eje del pilar inferior (kN·m) */
  mEdKNm: number;
  /** U invertida: esperas, tirante y rama del lado de la carga, las mismas barras */
  u: ArmaduraElegida;
  /** Barras del pilar inferior del lado de la carga, que siguen comprimidas dentro del macizo */
  esperasComprimidas: ArmaduraElegida;
  /**
   * Diámetro del mandril de los doblados de la U (mm). null: no se adoptó
   * todavía; se informa el requerido sin marcar si cumple.
   */
  mandrilUMm: number | null;
  /** La rama del lado de la carga termina con una patilla horizontal abajo */
  patillaInferior: boolean;
  cercos: CercosMacizo;
  /** Barras de la cara inferior, en X, repartidas en el ancho transversal */
  inferior: ArmaduraElegida;
}

export interface ComprobacionTension {
  sigmaMPa: number;
  sigmaMaxMPa: number;
  aprovechamiento: number;
  verifica: boolean;
}

export interface AnclajeMacizo {
  /** σsd en el arranque del anclaje (MPa) */
  sigmaSdMPa: number;
  lbdMm: number;
  /** Longitud de barra disponible desde la cara interior del nudo, por su eje (mm) */
  disponibleMm: number;
  verifica: boolean;
}

/** Un doblado de la U con carga, ec. (8.1). */
export interface DobladoU {
  /** Fuerza total en la U al empezar el doblado: Ts en A, T en B (kN) */
  fuerzaTotalKN: number;
  numeroBarras: number;
  /** Fuerza total repartida entre las barras (kN) */
  fuerzaRepartidaKN: number;
  /** Lo más que lleva una barra: fyd·A de la barra (kN) */
  topeBarraKN: number;
  /** La U no alcanza para la fuerza total: cada barra queda en fyd·A */
  limitadaPorFyd: boolean;
  /** Fbt: fuerza en una barra al empezar el doblado, la menor de las dos anteriores (kN) */
  fuerzaBarraKN: number;
  /** a_b de la barra de borde, recubrimiento + Ø/2, y de las interiores, medio intereje (mm) */
  abBordeMm: number;
  /** Infinity con una sola barra */
  abInteriorMm: number;
  /** Cuál manda: la de menor a_b, que pide el mandril mayor */
  barraQueManda: "borde" | "interior";
  /** a_b de la barra que manda (mm) */
  abMm: number;
  /** φm,min de la ec. (8.1) para la barra que manda, sin bajar del de la tabla A19.8.1 (mm) */
  mandrilNecMm: number;
  /** null si el mandril no se adoptó: sólo se informa el requerido */
  verifica: boolean | null;
}

export interface ResultadoMacizo {
  /** e + Md/Nd (m) */
  excentricidadTotalM: number;
  /** Desde el eje del pilar inferior, positivo hacia la carga (m) */
  yCargaM: number;
  yEsperasM: number;
  yNudoCM: number;
  /** Ancho c de la zona comprimida de hormigón del nudo C, en el plano (m) */
  anchoNudoCM: number;
  /** Cc: compresión del hormigón en el nudo C (kN) */
  compresionHormigonCKN: number;
  /** Esperas comprimidas: posición, σs' y fuerza Fs' (kN); 0 sin tracción */
  yEsperasComprimidasM: number;
  sigmaEsperasComprimidasMPa: number;
  compresionEsperasKN: number;
  /** Anclaje a compresión de las esperas comprimidas, recto desde la base del macizo. null sin ellas. */
  anclajeEsperasComprimidas: AnclajeMacizo | null;
  dTiranteM: number;
  zM: number;

  /** No hacen falta esperas traccionadas: la resultante entra en el pilar */
  sinTraccion: boolean;
  traccionEsperasKN: number;
  compresionCKN: number;
  traccionTiranteKN: number;
  compresionBielaBCKN: number;
  compresionBielaACKN: number;
  anguloBielaBCGrados: number;
  anguloBielaACGrados: number;

  nuPrima: number;
  /**
   * Nudo C. Sin tracción, tensión media contra k1·ν'·fcd. Con tracción el nudo
   * trabaja justo a esa tensión, y lo que se aprovecha es el brazo: el momento
   * respecto de las esperas contra el máximo que puede dar el pilar.
   */
  nudoC: ComprobacionTension;
  /** Nudo B, bajo el pilar superior: k2 con tirante, k1 sin él */
  nudoBApoyo: ComprobacionTension;
  nudoBBiela: ComprobacionTension;
  /** Nudo A, tirante y esperas: k3. null sin tracción. */
  nudoA: ComprobacionTension | null;

  /** La U lleva Ts en la rama de las esperas y T arriba: manda la mayor */
  asNecUCm2: number;
  asRealUCm2: number;
  verificaU: boolean;
  mandrilMinimoTablaMm: number;
  /** fcd de la ec. (8.1), sin pasar del de fck = 55 (MPa) */
  fcdDobladoMPa: number;
  /** Doblado en A, de Ts a T. null sin tracción. */
  dobladoA: DobladoU | null;
  /** Doblado en B, de T a la rama que baja. null sin tirante. */
  dobladoB: DobladoU | null;
  /** T anclado por la rama del lado de la carga, desde la cara interior del nudo B. null sin tirante. */
  anclajeTirante: AnclajeMacizo | null;

  /** Cercos horizontales que entran en la altura, por debajo del tirante */
  numeroCercos: number;
  asCercosYCm2: number;
  asCercosXCm2: number;
  /** Tracción transversal a coser, art. 6.5.3: en Y y en X (cm²) */
  asNecCercosYCm2: number;
  asNecCercosXCm2: number;
  verificaCercos: boolean;
  /** Separación máxima de la malla, art. 9.7 (2): mín(300 mm; 2·espesor) (m) */
  separacionMaxCercosM: number;
  verificaSeparacionCercos: boolean;

  /** Cara inferior, por m de ancho transversal (cm²/m) */
  asInferiorCm2PorM: number;
  /** Mínimo de la malla de vigas de gran canto, art. 9.7 (1) (cm²/m) */
  asMinInferiorCm2PorM: number;
  verificaInferior: boolean;

  /** El pilar superior sobre el macizo, art. 6.7 */
  zonaCargada: ResultadoZonaCargada;

  /** Lo que queda en la cabeza del pilar inferior, para verificarlo en Pilares */
  nPilarInferiorKN: number;
  mPilarInferiorKNm: number;
}

const comprobar = (sigmaMPa: number, sigmaMaxMPa: number): ComprobacionTension => ({
  sigmaMPa,
  sigmaMaxMPa,
  aprovechamiento: sigmaMPa / sigmaMaxMPa,
  verifica: sigmaMPa <= sigmaMaxMPa,
});

const areaBarraCm2 = (phiMm: number) => (Math.PI * (phiMm / 10) ** 2) / 4;
const areaCm2 = (a: ArmaduraElegida) => a.numero * areaBarraCm2(a.diametroMm);

/** kN sobre m² → MPa */
const mpa = (kN: number, m2: number) => kN / m2 / 1000;

const grados = (rad: number) => (rad * 180) / Math.PI;

export function calcularMacizoTransicion(
  materiales: MaterialesDerivados,
  geometria: GeometriaMacizo,
  datos: DatosMacizo
): ResultadoMacizo {
  const { fck, fyk, fcd, fyd } = materiales;
  const { hM, anchoM, profundidadM, recubrimientoM, pilarSuperior: sup, pilarInferior: inf } = geometria;
  const { nEdKN: nd, mEdKNm, u, cercos } = datos;

  // ---------------------------------------------------------------- geometría
  // Origen en el eje del pilar inferior, positivo hacia la carga.
  const c = inf.enPlanoM;
  const yIniM = -c / 2 - geometria.bordeTraccionadoM;
  const yFinM = yIniM + anchoM;
  const excentricidadTotalM = geometria.excentricidadM + mEdKNm / nd;
  const yN = excentricidadTotalM;

  const coberturaM = recubrimientoM + cercos.diametroMm / 1000;
  const yT = -c / 2 + coberturaM + u.diametroMm / 2000;
  const dTiranteM = coberturaM + u.diametroMm / 2000;
  const zM = hM - dTiranteM;

  // Anchos transversales de los nudos: nunca más que el macizo.
  const bInfM = Math.min(inf.transversalM, profundidadM);
  const bSupM = Math.min(sup.transversalM, profundidadM);

  const nuPrima = 1 - fck / 250; // ec. (6.57)
  const sigmaK1 = 1.0 * nuPrima * fcd; // ec. (6.60)
  const sigmaK2 = 0.85 * nuPrima * fcd; // ec. (6.61)
  const sigmaK3 = 0.75 * nuPrima * fcd; // ec. (6.62)

  // ---------------------------------------------------------------- nudo C
  // Esperas comprimidas: barras del pilar del lado de la carga, a d'' de esa
  // cara. σs' = mín(fyd; Es·εc2), tabla A19.3.1 y art. 6.1 (5).
  const ESM = 200000; // MPa, art. 3.2.7 (4)
  const epsilonC2 = fck <= 50 ? 0.002 : (2.0 + 0.085 * (fck - 50) ** 0.53) / 1000;
  const comp = datos.esperasComprimidas;
  const ySp = c / 2 - (coberturaM + comp.diametroMm / 2000);
  const sigmaSp = Math.min(fyd, ESM * epsilonC2);
  const fuerzaSpKN = (areaCm2(comp) * sigmaSp) / 10;

  // Sin tracción, la compresión se centra en la carga y llega hasta la cara
  // del pilar: ancho 2·(c/2 − yN). Sólo hormigón, del lado seguro.
  const anchoSinTraccionM = 2 * (c / 2 - yN);
  const sigmaSinTraccion = anchoSinTraccionM > 0 ? mpa(nd, anchoSinTraccionM * bInfM) : Infinity;
  let sinTraccion = sigmaSinTraccion <= sigmaK1;

  let anchoNudoCM: number;
  let yC: number;
  let compresionCKN: number;
  let compresionHormigonCKN: number;
  let compresionEsperasKN = 0;
  let nudoC: ComprobacionTension;
  if (sinTraccion) {
    anchoNudoCM = anchoSinTraccionM;
    yC = yN;
    compresionCKN = nd;
    compresionHormigonCKN = nd;
    nudoC = comprobar(sigmaSinTraccion, sigmaK1);
  } else {
    // El hormigón trabaja a k1·ν'·fcd en un ancho c, y las esperas comprimidas
    // suman Fs'. Momentos respecto de las esperas traccionadas:
    //   σ·b·c·(D − c/2) + Fs'·(ys' − yT) = Nd·(yN − yT)
    // con D la distancia de las esperas traccionadas a la cara comprimida.
    // Hace falta un c ≤ D que lo cumpla; si no existe, el nudo no verifica.
    const dM = c / 2 - yT;
    const momentoNetoKNm = nd * (yN - yT) - fuerzaSpKN * (ySp - yT);
    const fuerzaPorMetro = sigmaK1 * 1000 * bInfM; // kN por m de ancho
    const momentoMaxKNm = (fuerzaPorMetro * dM * dM) / 2;
    const disc = dM * dM - (2 * Math.max(momentoNetoKNm, 0)) / fuerzaPorMetro;
    anchoNudoCM = disc >= 0 ? dM - Math.sqrt(disc) : dM;
    compresionHormigonCKN = fuerzaPorMetro * anchoNudoCM;
    compresionEsperasKN = fuerzaSpKN;
    compresionCKN = compresionHormigonCKN + compresionEsperasKN;
    // Resultante de las dos compresiones.
    yC = (compresionHormigonCKN * (c / 2 - anchoNudoCM / 2) + compresionEsperasKN * ySp) / compresionCKN;
    nudoC = {
      sigmaMPa: sigmaK1,
      sigmaMaxMPa: sigmaK1,
      aprovechamiento: Math.max(momentoNetoKNm, 0) / momentoMaxKNm,
      verifica: momentoNetoKNm <= momentoMaxKNm,
    };
    // Si con las esperas comprimidas la compresión ya alcanza, no hay tracción.
    if (compresionCKN <= nd) {
      sinTraccion = true;
      compresionCKN = nd;
    }
  }
  const traccionEsperasKN = sinTraccion ? 0 : compresionCKN - nd;
  if (sinTraccion) yC = Math.min(yC, yN);

  // ---------------------------------------------------------------- bielas y tirante
  const traccionTiranteKN = Math.max((nd * (yN - yC)) / zM, 0);
  const anguloBC = Math.atan2(zM, Math.abs(yN - yC));
  const anguloAC = Math.atan2(zM, yC - yT);
  const compresionBielaBCKN = nd / Math.sin(anguloBC);
  const compresionBielaACKN = traccionEsperasKN / Math.sin(anguloAC);

  // ---------------------------------------------------------------- nudos B y A
  // B: la carga del pilar superior, con su Md como excentricidad de la
  // resultante; ancho efectivo c − 2·|Md/Nd|.
  const uTiranteM = 2 * dTiranteM;
  const anchoBM = Math.max(sup.enPlanoM - 2 * Math.abs(mEdKNm / nd), 1e-6);
  const conTirante = traccionTiranteKN > 0;
  const sigmaB = conTirante ? sigmaK2 : sigmaK1;
  const nudoBApoyo = comprobar(mpa(nd, anchoBM * bSupM), sigmaB);
  const anchoBielaBM = anchoBM * Math.sin(anguloBC) + (conTirante ? uTiranteM * Math.cos(anguloBC) : 0);
  const nudoBBiela = comprobar(mpa(compresionBielaBCKN, anchoBielaBM * bSupM), sigmaB);

  // A: tirante horizontal y esperas verticales. La franja de las esperas va de
  // su eje a la cara del macizo, a cada lado (como u = 2·d' del tirante).
  const franjaEsperasM = 2 * (yT - yIniM);
  const anchoBielaAM = uTiranteM * Math.cos(anguloAC) + franjaEsperasM * Math.sin(anguloAC);
  const nudoA = sinTraccion ? null : comprobar(mpa(compresionBielaACKN, anchoBielaAM * bInfM), sigmaK3);

  // ---------------------------------------------------------------- U
  const asRealUCm2 = areaCm2(u);
  const asNecUCm2 = (Math.max(traccionEsperasKN, traccionTiranteKN) / fyd) * 10;
  const phi = u.diametroMm;
  const coberturaMm = coberturaM * 1000;
  const mandrilMinimoTablaMm = mandrilMinimoMm(phi);

  // Doblados con carga, ec. (8.1): φm ≥ Fbt·(1/ab + 1/(2φ))/fcd, con fcd sin
  // pasar del de fck = 55. ab por barra: medio intereje, perpendicular al
  // plano del doblado, en las interiores; recubrimiento + Ø/2 en las de borde.
  // Fbt es igual en todas, así que manda la de menor ab.
  const fcdTope = Math.min(fcd, (55 / fck) * fcd);
  const separacionUMm = u.numero > 1 ? (bInfM * 1000 - 2 * coberturaMm - phi) / (u.numero - 1) : Infinity;
  const abBordeMm = coberturaMm + phi / 2;
  const abInteriorMm = u.numero > 2 ? separacionUMm / 2 : Infinity;
  const barraQueManda: DobladoU["barraQueManda"] = abInteriorMm < abBordeMm ? "interior" : "borde";
  const abMm = Math.min(abBordeMm, abInteriorMm);
  const topeBarraKN = (fyd * areaBarraCm2(phi)) / 10;
  const doblado = (fuerzaKN: number): DobladoU => {
    const fuerzaRepartidaKN = fuerzaKN / u.numero;
    const fuerzaBarraKN = Math.min(fuerzaRepartidaKN, topeBarraKN);
    const ec81 = (fuerzaBarraKN * 1000 * (1 / abMm + 1 / (2 * phi))) / fcdTope;
    const mandrilNecMm = Math.max(ec81, mandrilMinimoTablaMm);
    return {
      fuerzaTotalKN: fuerzaKN,
      numeroBarras: u.numero,
      fuerzaRepartidaKN,
      topeBarraKN,
      limitadaPorFyd: fuerzaRepartidaKN > topeBarraKN,
      fuerzaBarraKN,
      abBordeMm,
      abInteriorMm,
      barraQueManda,
      abMm,
      mandrilNecMm,
      verifica: datos.mandrilUMm === null ? null : datos.mandrilUMm >= mandrilNecMm,
    };
  };
  const dobladoA = sinTraccion ? null : doblado(traccionEsperasKN);
  const dobladoB = conTirante ? doblado(traccionTiranteKN) : null;
  const mandrilGeometriaMm =
    datos.mandrilUMm ?? Math.max(dobladoA?.mandrilNecMm ?? 0, dobladoB?.mandrilNecMm ?? 0, mandrilMinimoTablaMm);

  // T se ancla en la rama del lado de la carga: desde la cara interior del
  // nudo B (art. 6.5.4 (7)) hasta la cara, el doblado y la bajada; con
  // patilla, además el tramo inferior hacia adentro hasta la cara del pilar.
  let anclajeTirante: AnclajeMacizo | null = null;
  if (conTirante) {
    const r = mandrilGeometriaMm / 2 + phi / 2;
    const horizontalMm = (yFinM - (yN - anchoBM / 2)) * 1000 - coberturaMm;
    const bajadaMm = hM * 1000 - 2 * coberturaMm - phi;
    const patillaMm = datos.patillaInferior ? Math.max((yFinM - c / 2) * 1000 - coberturaMm - r, 0) : 0;
    const disponibleMm =
      horizontalMm - r + (Math.PI / 2) * r + (bajadaMm - r - (datos.patillaInferior ? r : 0)) +
      (datos.patillaInferior ? (Math.PI / 2) * r + patillaMm : 0);
    const sigmaSdMPa = Math.min((traccionTiranteKN * 10) / asRealUCm2, fyd);
    const cdMm = Math.min(coberturaMm, (separacionUMm - phi) / 2);
    const { lbdMm } = calcularAnclaje(
      { fckMPa: fck, fykMPa: fyk },
      { diametroMm: phi, situacion: "buena", forma: "gancho", esfuerzo: "traccion", recubrimientoMm: cdMm, sigmaSdMPa }
    );
    anclajeTirante = { sigmaSdMPa, lbdMm, disponibleMm, verifica: lbdMm <= disponibleMm };
  }

  // Esperas comprimidas: suben rectas dentro del macizo y le pasan Fs' por
  // adherencia. Anclaje a compresión, recto (art. 8.4), desde la cara inferior
  // del macizo hasta el recubrimiento superior.
  let anclajeEsperasComprimidas: AnclajeMacizo | null = null;
  if (compresionEsperasKN > 0) {
    const phiC = comp.diametroMm;
    const sepCMm = comp.numero > 1 ? (bInfM * 1000 - 2 * coberturaMm - phiC) / (comp.numero - 1) : Infinity;
    const { lbdMm } = calcularAnclaje(
      { fckMPa: fck, fykMPa: fyk },
      {
        diametroMm: phiC,
        situacion: "buena",
        forma: "recta",
        esfuerzo: "compresion",
        recubrimientoMm: Math.min(coberturaMm, (sepCMm - phiC) / 2),
        sigmaSdMPa: sigmaSp,
      }
    );
    const disponibleMm = hM * 1000 - coberturaMm;
    anclajeEsperasComprimidas = { sigmaSdMPa: sigmaSp, lbdMm, disponibleMm, verifica: lbdMm <= disponibleMm };
  }

  // ---------------------------------------------------------------- carga concentrada, art. 6.7
  const zonaCargada = calcularZonaCargada(materiales, {
    nEdKN: nd,
    direccionB: {
      cargadaM: sup.enPlanoM,
      anchoPiezaM: anchoM,
      distanciaBordeM: Math.min(yN - yIniM, yFinM - yN),
    },
    // Transversalmente el pilar superior se supone centrado en el macizo.
    direccionD: { cargadaM: sup.transversalM, anchoPiezaM: profundidadM, distanciaBordeM: profundidadM / 2 },
    alturaM: hM,
  });

  // ---------------------------------------------------------------- cercos horizontales
  // Los que entran entre el recubrimiento inferior y el tirante. Si el pilar
  // ocupa todo el ancho en una dirección, ahí la carga no se abre.
  const alturaCercosM = hM - dTiranteM - coberturaM;
  const numeroCercos = Math.max(Math.floor(alturaCercosM / cercos.separacionM + 1e-9) + 1, 0);
  const aCerco = areaBarraCm2(cercos.diametroMm);
  const asCercosYCm2 = numeroCercos * cercos.ramasY * aCerco;
  const asCercosXCm2 = numeroCercos * cercos.ramasX * aCerco;
  const seAbre = (t: ResultadoZonaCargada["traccionB"]) => t.aM < t.bM - 1e-9;
  const asNecCercosYCm2 = seAbre(zonaCargada.traccionD) ? zonaCargada.traccionD.asNecCm2 : 0;
  const asNecCercosXCm2 = seAbre(zonaCargada.traccionB) ? zonaCargada.traccionB.asNecCm2 : 0;
  // Art. 9.7 (2): la malla no más separada que 300 mm ni que dos espesores.
  const separacionMaxCercosM = Math.min(0.3, 2 * profundidadM);

  // ---------------------------------------------------------------- cara inferior
  // Art. 9.7 (1), por analogía: 0,001·Ac por cara y dirección, con Ac por
  // metro el del espesor en Y; nunca menos de 150 mm²/m.
  const asInferiorCm2PorM = areaCm2(datos.inferior) / profundidadM;
  const asMinInferiorCm2PorM = Math.max(0.001 * profundidadM * 1e4, 1.5);

  return {
    excentricidadTotalM,
    yCargaM: yN,
    yEsperasM: yT,
    yNudoCM: yC,
    anchoNudoCM,
    compresionHormigonCKN,
    yEsperasComprimidasM: ySp,
    sigmaEsperasComprimidasMPa: sigmaSp,
    compresionEsperasKN,
    anclajeEsperasComprimidas,
    dTiranteM,
    zM,
    sinTraccion,
    traccionEsperasKN,
    compresionCKN,
    traccionTiranteKN,
    compresionBielaBCKN,
    compresionBielaACKN,
    anguloBielaBCGrados: grados(anguloBC),
    anguloBielaACGrados: grados(anguloAC),
    nuPrima,
    nudoC,
    nudoBApoyo,
    nudoBBiela,
    nudoA,
    asNecUCm2,
    asRealUCm2,
    verificaU: asRealUCm2 >= asNecUCm2,
    mandrilMinimoTablaMm,
    fcdDobladoMPa: fcdTope,
    dobladoA,
    dobladoB,
    anclajeTirante,
    numeroCercos,
    asCercosYCm2,
    asCercosXCm2,
    asNecCercosYCm2,
    asNecCercosXCm2,
    verificaCercos: asCercosYCm2 >= asNecCercosYCm2 && asCercosXCm2 >= asNecCercosXCm2,
    separacionMaxCercosM,
    verificaSeparacionCercos: cercos.separacionM <= separacionMaxCercosM + 1e-9,
    asInferiorCm2PorM,
    asMinInferiorCm2PorM,
    verificaInferior: asInferiorCm2PorM >= asMinInferiorCm2PorM,
    zonaCargada,
    nPilarInferiorKN: nd,
    mPilarInferiorKNm: nd * excentricidadTotalM,
  };
}
