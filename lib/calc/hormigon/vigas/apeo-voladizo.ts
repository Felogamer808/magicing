import { calcularAnclaje, mandrilMinimoMm, type FormaAnclaje } from "@/lib/calc/hormigon/comun/anclaje";
import type { ArmaduraElegida, MaterialesDerivados } from "@/lib/calc/hormigon/comun/types";

/**
 * Viga que recibe una carga concentrada fuera de sus dos apoyos —un pilar
 * apeado en voladizo—, resuelta por bielas y tirantes con el Anejo 19 y nada
 * más. No arrastra ninguna comprobación de la EHE-08 ni de Montoya: si una
 * verificación no está en el articulado, no está acá.
 *
 * El modelo:
 *
 *        P                                   N_lej
 *        ↓  A ════════ tirante T ═════════ B ↓
 *          \                            ⋰ │
 *           \ biela AC          biela CB  │ tirante (o puntal) BD
 *            \                  ⋰         │
 *             C ▲ R_cerca              D  ▼/▲ R_lej
 *
 * La carga baja por la biela AC al apoyo cercano. Como está fuera de la luz,
 * el equilibrio levanta el apoyo lejano con V = P·a/L, que vuelve por la biela
 * CB. El tirante superior AB toma la tracción T = P·a/z en toda su longitud y
 * tiene que anclarse en los dos extremos. En B, la carga que baja sobre el
 * apoyo lejano compensa V; si no alcanza, el pilar lejano trabaja a tracción.
 *
 * Brazo z: del tirante a la cara de apoyo (criterio acordado con el usuario).
 * En C no llega cordón inferior —las componentes horizontales de las dos
 * bielas se anulan—, así que el nudo se apoya directamente en la placa.
 *
 * Referencias (Anejo 19, RD 470/2021):
 * - art. 5.3.1 (3), pág. 45 — viga de gran canto si la luz es menor que 3h.
 * - apéndice J, art. J.3 (1), pág. 205 — ménsula corta si a_c < z0.
 * - art. 6.5.4 (4), ec. (6.60), (6.61), (6.62), págs. 98-99 — nudos.
 * - art. 6.5.4 (7), pág. 100 — el anclaje empieza en la cara interior del nudo.
 * - art. 6.5.4 (8), pág. 100 — nudo de tres bielas: tensiones iguales en sus caras.
 * - art. 6.5.2 (2), ec. (6.57), pág. 97 — ν' = 1 − fck/250.
 * - art. 8.4.3 (3), pág. 124 — en patillas, lbd se mide por el eje de la barra.
 * - art. 8.3, tabla A19.8.1, pág. 122 — mandril mínimo.
 * - art. 9.7 (1), pág. 152 — malla mínima de vigas de gran canto.
 */

/** Rectángulo de apoyo o de carga: un lado en el plano de la viga y otro a través. */
export interface AreaContacto {
  /** Lado en el plano de la viga (m) */
  anchoM: number;
  /** Lado transversal, a través del espesor de la viga (m) */
  profundidadM: number;
}

export interface GeometriaApeoVoladizo {
  /** Canto total (m) */
  hM: number;
  /** Espesor (m) */
  bM: number;
  /** Recubrimiento hasta la cara exterior del estribo (m) */
  recubrimientoM: number;
  /** Luz entre ejes de los dos apoyos (m) */
  luzM: number;
  /** a: del eje del apoyo cercano al eje de la carga (m) */
  voladizoM: number;
  /** Del eje de la carga al extremo libre de la viga (m) */
  extremoLibreM: number;
  /** Del eje del apoyo lejano al otro extremo de la viga (m) */
  extremoLejanoM: number;
  /** Pilar apeado, que trae la carga del voladizo */
  carga: AreaContacto;
  /** Pilar bajo la viga más cercano a la carga */
  apoyoCercano: AreaContacto;
  /** Pilar bajo la viga en el otro extremo */
  apoyoLejano: AreaContacto;
  /** Elemento que baja sobre el apoyo lejano (pilar o tabique) */
  elementoLejano: AreaContacto;
}

export interface DatosApeoVoladizo {
  /** P: carga de cálculo del voladizo, mayorada (kN) */
  pEdKN: number;
  /** Carga máxima de cálculo que baja sobre el apoyo lejano, mayorada (kN) */
  nLejanoMaxKN: number;
  /**
   * Carga mínima que baja sobre el apoyo lejano, ya ponderada como favorable
   * (kN). Es la que tiene que compensar el levantamiento; el coeficiente lo
   * elige el usuario porque sale del Anejo 18, que no está entre las fuentes.
   */
  nLejanoMinKN: number;
  /** Tirante superior, una capa */
  tirante: ArmaduraElegida;
  diametroEstriboMm: number;
  /** Cómo termina el tirante en los dos extremos */
  formaAnclajeTirante: FormaAnclaje;
  /** Barras del pilar lejano que se anclan en la viga, por si trabaja a tracción */
  armaduraPilarLejano: ArmaduraElegida;
}

export interface ComprobacionTension {
  sigmaMPa: number;
  sigmaMaxMPa: number;
  aprovechamiento: number;
  verifica: boolean;
}

export interface AnclajeExtremo {
  /** σsd en el arranque del anclaje (MPa) */
  sigmaSdMPa: number;
  lbdMm: number;
  /** Longitud de barra disponible desde la cara interior del nudo, por su eje (mm) */
  disponibleMm: number;
  verifica: boolean;
}

export interface ResultadoApeoVoladizo {
  /** Luz/canto < 3: viga de gran canto, art. 5.3.1 (3) */
  esGranCanto: boolean;
  /** a_c < z: el voladizo es una ménsula corta, art. J.3 (1) */
  esMensulaCorta: boolean;

  /** Distancia del tirante al borde superior (m) */
  dTirSuperiorM: number;
  zM: number;
  anguloBielaCercaGrados: number;
  anguloBielaLejosGrados: number;

  /** Reacción del apoyo cercano, compresión (kN) */
  reaccionCercanaKN: number;
  /** V = P·a/L: lo que el voladizo levanta el apoyo lejano (kN) */
  levantamientoKN: number;
  /** Reacción del apoyo lejano con la carga mínima; negativa = tracción (kN) */
  reaccionLejanaMinKN: number;
  reaccionLejanaMaxKN: number;
  /** Tracción que tiene que tomar el pilar lejano (kN). 0 si queda comprimido. */
  traccionPilarLejanoKN: number;

  compresionBielaCercaKN: number;
  compresionBielaLejosKN: number;
  traccionTiranteKN: number;

  /** Tirante: As necesaria con fyd pleno (cm²) */
  asNecTiranteCm2: number;
  asRealTiranteCm2: number;
  verificaTirante: boolean;

  nuPrima: number;
  /** Nudo bajo la carga: compresión con tirante anclado, k2 = 0,85, ec. (6.61) */
  nudoCargaApoyo: ComprobacionTension;
  nudoCargaBiela: ComprobacionTension;
  /** Nudo sobre el apoyo cercano: tres compresiones, k1 = 1,0, ec. (6.60) */
  nudoApoyoCercano: ComprobacionTension;
  /**
   * Nudo bajo el elemento lejano. Con el pilar comprimido es compresión con un
   * tirante (k2 = 0,85); con el pilar traccionado, tirantes en dos direcciones
   * (k3 = 0,75, ec. (6.62)). Se informa el peor de los dos estados.
   */
  nudoElementoLejano: ComprobacionTension;
  /** Apoyo lejano comprimido, nudo de compresión pura (k1 = 1,0) */
  nudoApoyoLejano: ComprobacionTension;

  anclajeTiranteCarga: AnclajeExtremo;
  anclajeTiranteLejano: AnclajeExtremo;
  mandrilMinimoMm: number;

  /** Pilar lejano a tracción: As necesaria y anclaje dentro de la viga */
  asNecPilarLejanoCm2: number;
  asRealPilarLejanoCm2: number;
  verificaPilarLejano: boolean;
  anclajePilarLejano: AnclajeExtremo | null;

  /** Malla mínima por cara y dirección, art. 9.7 (1): máx(0,001·b·1 m; 150 mm²/m) (cm²/m) */
  mallaMinimaCm2PorM: number;
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

/** Área de contacto efectiva: nunca más ancha que la viga. */
const area = (c: AreaContacto, bM: number) => c.anchoM * Math.min(c.profundidadM, bM);

export function calcularApeoVoladizo(
  materiales: MaterialesDerivados,
  geometria: GeometriaApeoVoladizo,
  datos: DatosApeoVoladizo
): ResultadoApeoVoladizo {
  const { fck, fyk, fcd, fyd } = materiales;
  const { hM, bM, recubrimientoM, luzM, voladizoM, extremoLibreM, extremoLejanoM } = geometria;
  const { pEdKN, nLejanoMaxKN, nLejanoMinKN, tirante, diametroEstriboMm, formaAnclajeTirante } = datos;

  // ---------------------------------------------------------------- geometría
  const dTirSuperiorM = recubrimientoM + diametroEstriboMm / 1000 + tirante.diametroMm / 2000;
  const zM = hM - dTirSuperiorM;
  const anguloCerca = Math.atan2(zM, voladizoM);
  const anguloLejos = Math.atan2(zM, luzM);

  // a_c para la ménsula corta se mide a la cara del apoyo (fig. A19.J.5).
  const acM = voladizoM - geometria.apoyoCercano.anchoM / 2;

  // ---------------------------------------------------------------- equilibrio
  const levantamientoKN = (pEdKN * voladizoM) / luzM;
  const reaccionCercanaKN = pEdKN + levantamientoKN;
  const reaccionLejanaMinKN = nLejanoMinKN - levantamientoKN;
  const reaccionLejanaMaxKN = nLejanoMaxKN - levantamientoKN;
  const traccionPilarLejanoKN = Math.max(-reaccionLejanaMinKN, 0);

  const compresionBielaCercaKN = pEdKN / Math.sin(anguloCerca);
  const compresionBielaLejosKN = levantamientoKN / Math.sin(anguloLejos);
  const traccionTiranteKN = (pEdKN * voladizoM) / zM;

  // ---------------------------------------------------------------- tirante
  const asNecTiranteCm2 = (traccionTiranteKN / (fyd * 1000)) * 1e4;
  const asRealTiranteCm2 = areaCm2(tirante);

  // ---------------------------------------------------------------- nudos
  const nuPrima = 1 - fck / 250; // ec. (6.57)
  const sigmaK1 = 1.0 * nuPrima * fcd; // ec. (6.60)
  const sigmaK2 = 0.85 * nuPrima * fcd; // ec. (6.61)
  const sigmaK3 = 0.75 * nuPrima * fcd; // ec. (6.62)

  // Nudo A, bajo la carga: la carga, la biela AC y el tirante anclado. Se
  // comprueban la cara cargada y la cara de la biela, que tiene el ancho de la
  // placa proyectado más el del tirante (u = 2·d', fig. A19.6.27).
  const profCargaM = Math.min(geometria.carga.profundidadM, bM);
  const uTiranteM = 2 * dTirSuperiorM;
  const anchoBielaEnAM = geometria.carga.anchoM * Math.sin(anguloCerca) + uTiranteM * Math.cos(anguloCerca);
  const nudoCargaApoyo = comprobar(mpa(pEdKN, area(geometria.carga, bM)), sigmaK2);
  const nudoCargaBiela = comprobar(mpa(compresionBielaCercaKN, anchoBielaEnAM * profCargaM), sigmaK2);

  // Nudo C, sobre el apoyo cercano: llegan la reacción y las dos bielas, sin
  // tirante. Como nudo de tres bielas se dimensiona con la misma tensión en
  // todas sus caras (art. 6.5.4 (8)), así que basta la cara de apoyo.
  const nudoApoyoCercano = comprobar(mpa(reaccionCercanaKN, area(geometria.apoyoCercano, bM)), sigmaK1);

  // Nudo B, bajo el elemento lejano. Con la carga máxima el pilar queda
  // comprimido y el nudo tiene un solo tirante (k2); con la mínima, si el
  // pilar tracciona, hay tirantes en dos direcciones (k3).
  const areaElementoLejano = area(geometria.elementoLejano, bM);
  const nudoLejanoMax = comprobar(mpa(nLejanoMaxKN, areaElementoLejano), reaccionLejanaMaxKN >= 0 ? sigmaK2 : sigmaK3);
  const nudoLejanoMin = comprobar(mpa(nLejanoMinKN, areaElementoLejano), reaccionLejanaMinKN >= 0 ? sigmaK2 : sigmaK3);
  const nudoElementoLejano =
    nudoLejanoMax.aprovechamiento >= nudoLejanoMin.aprovechamiento ? nudoLejanoMax : nudoLejanoMin;

  const nudoApoyoLejano = comprobar(
    mpa(Math.max(reaccionLejanaMaxKN, 0), area(geometria.apoyoLejano, bM)),
    sigmaK1
  );

  // ---------------------------------------------------------------- anclajes
  // El anclaje empieza en la cara interior del nudo (art. 6.5.4 (7)). Recto,
  // tiene la distancia hasta el extremo menos el recubrimiento. Doblado hacia
  // abajo por la cara del extremo, lbd se mide por el eje de la barra (art.
  // 8.4.3 (3)): tramo horizontal, arco de 90° con el mandril mínimo y rama
  // vertical hasta el recubrimiento inferior.
  const phi = tirante.diametroMm;
  const mandrilMm = mandrilMinimoMm(phi);
  const radioEjeMm = mandrilMm / 2 + phi / 2;
  const coberturaMm = (recubrimientoM * 1000) + diametroEstriboMm;
  const verticalMm = hM * 1000 - dTirSuperiorM * 1000 - coberturaMm;

  const disponibleTirante = (horizontalM: number) => {
    const horizontalMm = horizontalM * 1000 - coberturaMm;
    if (formaAnclajeTirante === "recta") return horizontalMm;
    return horizontalMm - radioEjeMm + (Math.PI / 2) * radioEjeMm + (verticalMm - radioEjeMm);
  };

  const separacionTiranteMm =
    tirante.numero > 1 ? ((bM - 2 * recubrimientoM) * 1000 - 2 * diametroEstriboMm - phi) / (tirante.numero - 1) : Infinity;
  const cdTiranteMm = Math.min(coberturaMm, (separacionTiranteMm - phi) / 2);
  const sigmaSdTirante = Math.min((traccionTiranteKN * 10) / asRealTiranteCm2, fyd);
  const { lbdMm: lbdTirante } = calcularAnclaje(
    { fckMPa: fck, fykMPa: fyk },
    { diametroMm: phi, situacion: "buena", forma: formaAnclajeTirante, esfuerzo: "traccion", recubrimientoMm: cdTiranteMm, sigmaSdMPa: sigmaSdTirante }
  );

  const extremoTirante = (horizontalM: number): AnclajeExtremo => {
    const disponibleMm = disponibleTirante(horizontalM);
    return { sigmaSdMPa: sigmaSdTirante, lbdMm: lbdTirante, disponibleMm, verifica: lbdTirante <= disponibleMm };
  };
  // Del borde interior del pilar apeado al extremo libre.
  const anclajeTiranteCarga = extremoTirante(geometria.carga.anchoM / 2 + extremoLibreM);
  // Del borde interior del elemento lejano al otro extremo.
  const anclajeTiranteLejano = extremoTirante(geometria.elementoLejano.anchoM / 2 + extremoLejanoM);

  // ---------------------------------------------------------------- pilar lejano
  const pilar = datos.armaduraPilarLejano;
  const asNecPilarLejanoCm2 = (traccionPilarLejanoKN / (fyd * 1000)) * 1e4;
  const asRealPilarLejanoCm2 = areaCm2(pilar);
  let anclajePilarLejano: AnclajeExtremo | null = null;
  if (traccionPilarLejanoKN > 0) {
    // Las barras del pilar suben dentro de la viga hasta el tirante, donde se
    // cierra el nudo; se toman con patilla, que es como se ata al tirante.
    const sigmaSdMPa = Math.min((traccionPilarLejanoKN * 10) / asRealPilarLejanoCm2, fyd);
    const { lbdMm } = calcularAnclaje(
      { fckMPa: fck, fykMPa: fyk },
      { diametroMm: pilar.diametroMm, situacion: "buena", forma: "gancho", esfuerzo: "traccion", recubrimientoMm: coberturaMm, sigmaSdMPa }
    );
    const disponibleMm = (hM - dTirSuperiorM) * 1000 - pilar.diametroMm;
    anclajePilarLejano = { sigmaSdMPa, lbdMm, disponibleMm, verifica: lbdMm <= disponibleMm };
  }

  return {
    esGranCanto: luzM < 3 * hM,
    esMensulaCorta: acM < zM,
    dTirSuperiorM,
    zM,
    anguloBielaCercaGrados: (anguloCerca * 180) / Math.PI,
    anguloBielaLejosGrados: (anguloLejos * 180) / Math.PI,
    reaccionCercanaKN,
    levantamientoKN,
    reaccionLejanaMinKN,
    reaccionLejanaMaxKN,
    traccionPilarLejanoKN,
    compresionBielaCercaKN,
    compresionBielaLejosKN,
    traccionTiranteKN,
    asNecTiranteCm2,
    asRealTiranteCm2,
    verificaTirante: asRealTiranteCm2 >= asNecTiranteCm2,
    nuPrima,
    nudoCargaApoyo,
    nudoCargaBiela,
    nudoApoyoCercano,
    nudoElementoLejano,
    nudoApoyoLejano,
    anclajeTiranteCarga,
    anclajeTiranteLejano,
    mandrilMinimoMm: mandrilMm,
    asNecPilarLejanoCm2,
    asRealPilarLejanoCm2,
    verificaPilarLejano: asRealPilarLejanoCm2 >= asNecPilarLejanoCm2,
    anclajePilarLejano,
    // art. 9.7 (1): 0,001·Ac por cara, con Ac por metro de altura = b·1 m.
    mallaMinimaCm2PorM: Math.max(0.001 * bM * 1e4, 1.5),
  };
}
