import { calcularAnclaje, mandrilMinimoMm, type FormaAnclaje } from "@/lib/calc/hormigon/comun/anclaje";
import type { ArmaduraElegida, MaterialesDerivados } from "@/lib/calc/hormigon/comun/types";
import { calcularZonaCargada, type ResultadoZonaCargada } from "@/lib/calc/hormigon/zona-parcialmente-cargada";

/**
 * Macizo de transición: un pilar que descarga descentrado sobre el de abajo, a
 * través de un macizo de hormigón donde apoya entero. Es una región D y se
 * resuelve por bielas y tirantes con el Anejo 19 y nada más.
 *
 * El modelo, en el plano de la excentricidad (criterios del usuario, 2026-10-29):
 *
 *              A ═══════ tirante T ═══════ B   ↓ Nd (+ Md)
 *              ║ ⋱                     ⋰
 *    esperas   ║    ⋱ biela AC    ⋰ biela BC
 *       Ts     ║        ⋱     ⋰
 *              ║            C          ← zona comprimida del pilar inferior
 *         ─────╨────────────▲──────    cara inferior del macizo
 *                      C = Nd + Ts
 *
 *  - C es la zona comprimida de la cabeza del pilar inferior, un nudo sólo
 *    comprimido que trabaja a σRd,max = k1·ν'·fcd (ec. 6.60). Su ancho sale del
 *    equilibrio. Si la resultante cae dentro del pilar con margen para eso, no
 *    hacen falta esperas traccionadas: Ts = 0 y tampoco hay tirante.
 *  - Si no, las esperas del lado opuesto toman Ts y el tirante superior T
 *    junta la carga sobre el pilar: T = Nd·(yN − yC)/z = Ts·(yC − yT)/z.
 *  - z va del eje del tirante a la cara inferior del macizo, que es la cabeza
 *    del pilar inferior.
 *  - Las esperas se anclan arriba, en el nudo A: suben hasta el tirante y se
 *    doblan en patilla sobre él hasta la cara opuesta del macizo. El anclaje
 *    se mide desde la cara interior del nudo por el eje de la barra.
 *  - El Md del pilar superior, si lo hay, corre la carga: e total = e + Md/Nd.
 *
 * En la otra dirección en planta no hay excentricidad, pero el pilar superior
 * puede ser más angosto que el macizo: eso es una carga concentrada y se
 * verifica con el art. 6.7, con el mismo cálculo que Zona parcialmente cargada.
 *
 * El pilar inferior queda con N = Nd y M = Nd·e total en su cabeza, que se
 * verifican en Pilares; repartir ese momento entre la losa y la base es parte
 * de ese cálculo, no de éste.
 *
 * Referencias (Anejo 19, RD 470/2021):
 * - art. 6.5.2 (2), ec. (6.57), pág. 97 — ν' = 1 − fck/250.
 * - art. 6.5.4 (4), ec. (6.60), (6.61), (6.62), págs. 98-99 — nudos, k1, k2, k3.
 * - art. 6.5.4 (7), pág. 100 — el anclaje empieza en la cara interior del nudo.
 * - art. 6.5.4 (8), pág. 100 — nudo de tres bielas: tensiones iguales.
 * - art. 6.7, ec. (6.63), pág. 101 — carga concentrada.
 * - art. 8.4.3 (3), pág. 124 — en patillas, lbd se mide por el eje de la barra.
 * - art. 8.3, tabla A19.8.1, pág. 122 — mandril mínimo.
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
  /** Recubrimiento hasta la cara exterior del estribo (m) */
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

export interface DatosMacizo {
  /** Nd del pilar superior, mayorado (kN) */
  nEdKN: number;
  /** Md del pilar superior en el plano; positivo si aleja la carga del eje del pilar inferior (kN·m) */
  mEdKNm: number;
  /** Tirante superior, una capa */
  tirante: ArmaduraElegida;
  /** Barras del pilar inferior en la cara opuesta a la carga, que suben como esperas */
  esperas: ArmaduraElegida;
  diametroEstriboMm: number;
  /** Cómo termina el tirante del lado de la carga */
  formaAnclajeTirante: FormaAnclaje;
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

export interface ResultadoMacizo {
  /** e + Md/Nd (m) */
  excentricidadTotalM: number;
  /** Desde el eje del pilar inferior, positivo hacia la carga (m) */
  yCargaM: number;
  yEsperasM: number;
  yNudoCM: number;
  /** Ancho de la zona comprimida del nudo C, en el plano (m) */
  anchoNudoCM: number;
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

  asNecTiranteCm2: number;
  asRealTiranteCm2: number;
  verificaTirante: boolean;
  asNecEsperasCm2: number;
  asRealEsperasCm2: number;
  verificaEsperas: boolean;

  /** Esperas con patilla sobre el tirante, desde la cara interior del nudo A. null sin tracción. */
  anclajeEsperas: AnclajeMacizo | null;
  /** Tirante del lado de la carga, desde la cara interior del nudo B. null sin tirante. */
  anclajeTirante: AnclajeMacizo | null;
  mandrilEsperasMm: number;
  mandrilTiranteMm: number;

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

const areaCm2 = (a: ArmaduraElegida) => (a.numero * Math.PI * (a.diametroMm / 10) ** 2) / 4;

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
  const { nEdKN: nd, mEdKNm, tirante, esperas, diametroEstriboMm } = datos;

  // ---------------------------------------------------------------- geometría
  // Origen en el eje del pilar inferior, positivo hacia la carga.
  const c = inf.enPlanoM;
  const yIniM = -c / 2 - geometria.bordeTraccionadoM;
  const yFinM = yIniM + anchoM;
  const excentricidadTotalM = geometria.excentricidadM + mEdKNm / nd;
  const yN = excentricidadTotalM;

  const coberturaM = recubrimientoM + diametroEstriboMm / 1000;
  const yT = -c / 2 + coberturaM + esperas.diametroMm / 2000;
  const dTiranteM = coberturaM + tirante.diametroMm / 2000;
  const zM = hM - dTiranteM;

  // Anchos transversales de los nudos: nunca más que el macizo.
  const bInfM = Math.min(inf.transversalM, profundidadM);
  const bSupM = Math.min(sup.transversalM, profundidadM);

  const nuPrima = 1 - fck / 250; // ec. (6.57)
  const sigmaK1 = 1.0 * nuPrima * fcd; // ec. (6.60)
  const sigmaK2 = 0.85 * nuPrima * fcd; // ec. (6.61)
  const sigmaK3 = 0.75 * nuPrima * fcd; // ec. (6.62)

  // ---------------------------------------------------------------- nudo C
  // Sin tracción, la compresión se centra en la carga y llega hasta la cara
  // del pilar: ancho 2·(c/2 − yN).
  const anchoSinTraccionM = 2 * (c / 2 - yN);
  const sigmaSinTraccion = anchoSinTraccionM > 0 ? mpa(nd, anchoSinTraccionM * bInfM) : Infinity;
  const sinTraccion = sigmaSinTraccion <= sigmaK1;

  let anchoNudoCM: number;
  let yC: number;
  let compresionCKN: number;
  let nudoC: ComprobacionTension;
  if (sinTraccion) {
    anchoNudoCM = anchoSinTraccionM;
    yC = yN;
    compresionCKN = nd;
    nudoC = comprobar(sigmaSinTraccion, sigmaK1);
  } else {
    // Con esperas, el nudo trabaja a k1·ν'·fcd y su ancho a sale de los
    // momentos respecto de las esperas: σ·b·a·(D − a/2) = Nd·(yN − yT), con D
    // la distancia de las esperas a la cara comprimida.
    const dM = c / 2 - yT;
    const momentoKNm = nd * (yN - yT);
    const fuerzaPorMetro = sigmaK1 * 1000 * bInfM; // kN por m de ancho
    const momentoMaxKNm = (fuerzaPorMetro * dM * dM) / 2;
    const disc = dM * dM - (2 * momentoKNm) / fuerzaPorMetro;
    anchoNudoCM = disc >= 0 ? dM - Math.sqrt(disc) : dM;
    yC = c / 2 - anchoNudoCM / 2;
    compresionCKN = fuerzaPorMetro * anchoNudoCM;
    nudoC = {
      sigmaMPa: sigmaK1,
      sigmaMaxMPa: sigmaK1,
      aprovechamiento: momentoKNm / momentoMaxKNm,
      verifica: momentoKNm <= momentoMaxKNm,
    };
  }
  const traccionEsperasKN = sinTraccion ? 0 : compresionCKN - nd;

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

  // ---------------------------------------------------------------- armaduras
  const asNecTiranteCm2 = (traccionTiranteKN / fyd) * 10;
  const asRealTiranteCm2 = areaCm2(tirante);
  const asNecEsperasCm2 = (traccionEsperasKN / fyd) * 10;
  const asRealEsperasCm2 = areaCm2(esperas);

  // ---------------------------------------------------------------- anclajes
  // Empiezan en la cara interior del nudo (art. 6.5.4 (7)) y, doblados, se
  // miden por el eje de la barra (art. 8.4.3 (3)).
  const coberturaMm = coberturaM * 1000;
  const separacion = (n: number, phi: number) =>
    n > 1 ? (bInfM * 1000 - 2 * coberturaMm - phi) / (n - 1) : Infinity;
  const cdMm = (a: ArmaduraElegida) => Math.min(coberturaMm, (separacion(a.numero, a.diametroMm) - a.diametroMm) / 2);

  const phiE = esperas.diametroMm;
  const mandrilEsperasMm = mandrilMinimoMm(phiE);
  let anclajeEsperas: AnclajeMacizo | null = null;
  if (!sinTraccion) {
    // Sube desde la cara interior del nudo A (a u del borde superior), se
    // dobla y corre sobre el tirante hasta la cara opuesta del macizo.
    const r = mandrilEsperasMm / 2 + phiE / 2;
    const verticalMm = uTiranteM * 1000 - (coberturaMm + phiE / 2) - r;
    const horizontalMm = (yFinM - yT) * 1000 - coberturaMm - r;
    const disponibleMm = Math.max(verticalMm, 0) + (Math.PI / 2) * r + Math.max(horizontalMm, 0);
    const sigmaSdMPa = Math.min((traccionEsperasKN * 10) / asRealEsperasCm2, fyd);
    const { lbdMm } = calcularAnclaje(
      { fckMPa: fck, fykMPa: fyk },
      { diametroMm: phiE, situacion: "buena", forma: "gancho", esfuerzo: "traccion", recubrimientoMm: cdMm(esperas), sigmaSdMPa }
    );
    anclajeEsperas = { sigmaSdMPa, lbdMm, disponibleMm, verifica: lbdMm <= disponibleMm };
  }

  const phiT = tirante.diametroMm;
  const mandrilTiranteMm = mandrilMinimoMm(phiT);
  let anclajeTirante: AnclajeMacizo | null = null;
  if (conTirante) {
    // Del lado de la carga: desde la cara interior del nudo B hasta la cara del
    // macizo, recto o bajando por ella. Del lado A lo cierran las patillas de
    // las esperas.
    const r = mandrilTiranteMm / 2 + phiT / 2;
    const horizontalMm = (yFinM - (yN - anchoBM / 2)) * 1000 - coberturaMm;
    const verticalMm = (hM - dTiranteM) * 1000 - coberturaMm;
    const disponibleMm =
      datos.formaAnclajeTirante === "recta"
        ? horizontalMm
        : horizontalMm - r + (Math.PI / 2) * r + (verticalMm - r);
    const sigmaSdMPa = Math.min((traccionTiranteKN * 10) / asRealTiranteCm2, fyd);
    const { lbdMm } = calcularAnclaje(
      { fckMPa: fck, fykMPa: fyk },
      {
        diametroMm: phiT,
        situacion: "buena",
        forma: datos.formaAnclajeTirante,
        esfuerzo: "traccion",
        recubrimientoMm: cdMm(tirante),
        sigmaSdMPa,
      }
    );
    anclajeTirante = { sigmaSdMPa, lbdMm, disponibleMm, verifica: lbdMm <= disponibleMm };
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

  return {
    excentricidadTotalM,
    yCargaM: yN,
    yEsperasM: yT,
    yNudoCM: yC,
    anchoNudoCM,
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
    asNecTiranteCm2,
    asRealTiranteCm2,
    verificaTirante: asRealTiranteCm2 >= asNecTiranteCm2,
    asNecEsperasCm2,
    asRealEsperasCm2,
    verificaEsperas: asRealEsperasCm2 >= asNecEsperasCm2,
    anclajeEsperas,
    anclajeTirante,
    mandrilEsperasMm,
    mandrilTiranteMm,
    zonaCargada,
    nPilarInferiorKN: nd,
    mPilarInferiorKNm: nd * excentricidadTotalM,
  };
}
