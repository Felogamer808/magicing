/**
 * Muro de hormigón armado sometido a compresión y flexión fuera de su plano.
 *
 * Es el muro portante, no el de contención: un elemento vertical que baja carga
 * y que, por ser esbelto, puede pandear. El Código Estructural le dedica un
 * artículo propio de armado —Anejo 19, art. 9.6, pág. 151— con cuantías y
 * separaciones que no se deducen de las reglas de pilares ni de las de losas.
 *
 * La verificación tiene tres partes que conviene no mezclar:
 *
 *   1. Es o no es un muro. Con longitud menor que cuatro veces el espesor el
 *      art. 9.6.1 no aplica y hay que ir a las reglas de pilares.
 *   2. Esbeltez. Si λ queda por debajo de λlim (art. 5.8.3.1, ec. 5.13) los
 *      efectos de segundo orden se ignoran; si no, se suma M2 por el método de
 *      la curvatura nominal (art. 5.8.8).
 *   3. Resistencia y armado. El par (NEd, MEd) tiene que caer dentro del
 *      diagrama de interacción, y la armadura cumplir el art. 9.6.
 *
 * Todo por metro de muro: b = 1 m.
 */

import type { MaterialesDerivados } from "./types";

/** Deformación última del hormigón en el bloque rectangular, art. 3.1.7. */
const EPSILON_CU3 = 0.0035;
/** Factor de canto del bloque rectangular para fck ≤ 50 MPa, ec. (3.19). */
const LAMBDA_BLOQUE = 0.8;
/** Factor de resistencia efectiva del bloque, ec. (3.21). */
const ETA_BLOQUE = 1.0;
const ES_MPA = 200000;

export interface GeometriaMuro {
  /** Espesor del muro (m). */
  espesorM: number;
  /** Longitud del muro en planta (m). Define si es muro o pilar. */
  longitudM: number;
  /** Altura libre entre coacciones (m). */
  alturaLibreM: number;
  /**
   * Factor de longitud efectiva: l0 = β·l. Vale 1 para el muro biarticulado,
   * 0,7 con un extremo empotrado y 2 en ménsula (art. 5.8.3.2, fig. A19.5.7).
   */
  beta: number;
  /** Recubrimiento mecánico hasta el eje de la armadura vertical (m). */
  recubrimientoMecanicoM: number;
}

export interface ArmaduraMuro {
  /** Diámetro de la armadura vertical (mm). */
  diametroVerticalMm: number;
  /** Separación de la armadura vertical en cada cara (mm). */
  separacionVerticalMm: number;
  diametroHorizontalMm: number;
  separacionHorizontalMm: number;
  /** true si la armadura va repartida en las dos caras, que es lo habitual. */
  dosCaras: boolean;
}

export interface EsfuerzosMuro {
  /** Axil de cálculo, en compresión y por metro (kN/m). */
  nEdKN: number;
  /** Momentos de empotramiento de primer orden (kN·m/m), |M02| ≥ |M01|. */
  m01KNm: number;
  m02KNm: number;
  /** Coeficiente de fluencia eficaz. Si no se conoce, el art. 5.8.3.1 da A = 0,7. */
  fluenciaEficaz?: number;
}

export interface ResultadoClasificacion {
  relacionLongitudEspesor: number;
  /** true si L/h ≥ 4 y por lo tanto aplica el art. 9.6. */
  esMuro: boolean;
}

export interface ResultadoEsbeltez {
  /** Radio de giro de la sección bruta, h/√12. */
  radioGiroM: number;
  longitudEfectivaM: number;
  lambda: number;
  lambdaLimite: number;
  /** Axil reducido n = NEd/(Ac·fcd). */
  axilReducido: number;
  /** Cuantía mecánica ω = As·fyd/(Ac·fcd). */
  cuantiaMecanica: number;
  factorA: number;
  factorB: number;
  factorC: number;
  /** true si λ ≤ λlim: los efectos de segundo orden se pueden ignorar. */
  ignoraSegundoOrden: boolean;
}

export interface ResultadoMomentos {
  /** Excentricidad mínima e0 = máx(h/30, 20 mm), art. 6.1(4). */
  excentricidadMinimaM: number;
  /** Momento equivalente de primer orden, ec. (5.32). */
  m0eKNm: number;
  /** Momento de primer orden adoptado, con el mínimo de e0. */
  m0EdKNm: number;
  /** Curvatura 1/r, ec. (5.34). Cero si no hay segundo orden. */
  curvatura: number;
  /** Flecha e2 = (1/r)·l0²/c. */
  e2M: number;
  /** Momento nominal de segundo orden, ec. (5.33). */
  m2KNm: number;
  /** Momento total de cálculo, ec. (5.31). */
  mEdKNm: number;
}

export interface ResultadoArmadoMuro {
  areaHormigonCm2: number;
  asVerticalCm2: number;
  asVerticalMinimaCm2: number;
  asVerticalMaximaCm2: number;
  verificaVerticalMinima: boolean;
  verificaVerticalMaxima: boolean;
  separacionVerticalMaximaMm: number;
  verificaSeparacionVertical: boolean;

  asHorizontalCm2: number;
  asHorizontalMinimaCm2: number;
  verificaHorizontalMinima: boolean;
  separacionHorizontalMaximaMm: number;
  verificaSeparacionHorizontal: boolean;

  /** true si As,v supera 0,02·Ac y hace falta armadura transversal (art. 9.6.4). */
  requiereArmaduraTransversal: boolean;
}

export interface PuntoInteraccion {
  nRdKN: number;
  mRdKNm: number;
}

export interface ResultadoResistencia {
  /** Diagrama de interacción de la sección, por metro. */
  diagrama: PuntoInteraccion[];
  /** Momento resistente para el axil actuante. */
  mRdKNm: number;
  verifica: boolean;
  aprovechamiento: number;
}

export interface ResultadoMuro {
  clasificacion: ResultadoClasificacion;
  esbeltez: ResultadoEsbeltez;
  momentos: ResultadoMomentos;
  armado: ResultadoArmadoMuro;
  resistencia: ResultadoResistencia;
}

/** Área por metro de una malla, en cm²/m. */
export function areaPorMetroCm2(diametroMm: number, separacionMm: number, caras: number): number {
  if (separacionMm <= 0) return 0;
  const areaBarraCm2 = (Math.PI * (diametroMm / 10) ** 2) / 4;
  return ((areaBarraCm2 * 1000) / separacionMm) * caras;
}

/**
 * Cuantía horizontal mínima, art. 9.6.3(1).
 *
 * El articulado la da atada al acero: 0,004·Ac con B400 y 0,0032·Ac con B500.
 * Es de las pocas cuantías del Código que dependen del tipo de acero, y se
 * escribe aparte para que no se pierda entre los demás mínimos.
 */
export function cuantiaHorizontalMinima(fykMPa: number): number {
  return fykMPa >= 500 ? 0.0032 : 0.004;
}

/**
 * Diagrama de interacción N–M de una sección rectangular de un metro con
 * armadura en las dos caras, por el bloque rectangular del art. 3.1.7.
 *
 * Se recorre la profundidad de la fibra neutra y para cada posición se integra
 * el equilibrio. Construirlo entero en vez de despejar un área es lo que permite
 * comprobar el par (N, M) tal como actúa: en flexión compuesta la resistencia a
 * momento depende del axil, y con axil alto puede bajar en lugar de subir.
 */
export function diagramaInteraccion(
  espesorM: number,
  recubrimientoM: number,
  asPorCaraCm2: number,
  materiales: MaterialesDerivados
): PuntoInteraccion[] {
  const b = 1;
  const h = espesorM;
  const { fcd, fyd } = materiales;
  const asM2 = asPorCaraCm2 / 1e4;

  // Las dos capas, medidas desde la fibra más comprimida.
  const capas = [recubrimientoM, h - recubrimientoM];

  const puntos: PuntoInteraccion[] = [];
  const pasos = 160;

  for (let i = 0; i <= pasos; i++) {
    // Se barre desde una fibra neutra muy alta (flexión casi pura) hasta más
    // allá del canto, que es la compresión uniforme.
    const x = (h * 2.5 * i) / pasos + 1e-6;

    const canto = Math.min(LAMBDA_BLOQUE * x, h);
    const compresionKN = ETA_BLOQUE * fcd * 1000 * canto * b;
    const brazoCompresion = h / 2 - canto / 2;

    let nKN = compresionKN;
    let mKNm = compresionKN * brazoCompresion;

    for (const d of capas) {
      // Deformación por compatibilidad; positiva en compresión.
      const epsilon = (EPSILON_CU3 * (x - d)) / x;
      const sigma = Math.max(Math.min(epsilon * ES_MPA, fyd), -fyd);
      const fuerzaKN = sigma * 1000 * asM2;
      nKN += fuerzaKN;
      mKNm += fuerzaKN * (h / 2 - d);
    }

    if (nKN >= 0) puntos.push({ nRdKN: nKN, mRdKNm: Math.abs(mKNm) });
  }

  return puntos;
}

/** Momento resistente del diagrama para un axil dado, interpolando. */
export function momentoResistente(diagrama: PuntoInteraccion[], nEdKN: number): number {
  let mejor = 0;
  for (let i = 1; i < diagrama.length; i++) {
    const a = diagrama[i - 1];
    const b = diagrama[i];
    const dentro = (a.nRdKN - nEdKN) * (b.nRdKN - nEdKN) <= 0;
    if (!dentro || a.nRdKN === b.nRdKN) continue;
    const t = (nEdKN - a.nRdKN) / (b.nRdKN - a.nRdKN);
    mejor = Math.max(mejor, a.mRdKNm + t * (b.mRdKNm - a.mRdKNm));
  }
  return mejor;
}

export function calcularMuro(
  materiales: MaterialesDerivados,
  geometria: GeometriaMuro,
  armadura: ArmaduraMuro,
  esfuerzos: EsfuerzosMuro,
  fykMPa: number
): ResultadoMuro {
  const { espesorM: h, longitudM, alturaLibreM, beta, recubrimientoMecanicoM: rec } = geometria;
  const { fcd, fyd } = materiales;
  const { nEdKN, m01KNm, m02KNm } = esfuerzos;

  const b = 1;
  const areaHormigonM2 = b * h;

  // --- 1. ¿Es un muro? art. 9.6.1(1) ---------------------------------------
  const relacionLongitudEspesor = longitudM / h;
  const clasificacion = {
    relacionLongitudEspesor,
    esMuro: relacionLongitudEspesor >= 4,
  };

  // --- Armadura dispuesta ---------------------------------------------------
  const caras = armadura.dosCaras ? 2 : 1;
  const asVerticalCm2 = areaPorMetroCm2(
    armadura.diametroVerticalMm, armadura.separacionVerticalMm, caras
  );
  const asHorizontalCm2 = areaPorMetroCm2(
    armadura.diametroHorizontalMm, armadura.separacionHorizontalMm, caras
  );

  // --- 2. Esbeltez, art. 5.8.3 ---------------------------------------------
  const radioGiroM = h / Math.sqrt(12);
  const longitudEfectivaM = beta * alturaLibreM;
  const lambda = longitudEfectivaM / radioGiroM;

  const axilReducido = nEdKN / (areaHormigonM2 * fcd * 1000);
  const cuantiaMecanica = (asVerticalCm2 / 1e4 * fyd) / (areaHormigonM2 * fcd);

  // Factores de la ec. (5.13). Sin φef conocido el articulado admite A = 0,7.
  const factorA = esfuerzos.fluenciaEficaz !== undefined
    ? 1 / (1 + 0.2 * esfuerzos.fluenciaEficaz)
    : 0.7;
  const factorB = Math.sqrt(1 + 2 * cuantiaMecanica);
  /*
   * C = 1,7 − rm. En muros el momento de primer orden viene casi siempre de
   * imperfecciones o de carga transversal, y para ese caso el articulado manda
   * rm = 1 y por lo tanto C = 0,7.
   */
  const rm = Math.abs(m02KNm) > 0 ? m01KNm / m02KNm : 1;
  const factorC = 1.7 - rm;

  const lambdaLimite = axilReducido > 0
    ? (20 * factorA * factorB * factorC) / Math.sqrt(axilReducido)
    : Infinity;
  const ignoraSegundoOrden = lambda <= lambdaLimite;

  // --- 3. Momentos, arts. 6.1(4), 5.8.8 ------------------------------------
  const excentricidadMinimaM = Math.max(h / 30, 0.02);
  const m0eKNm = Math.max(0.6 * m02KNm + 0.4 * m01KNm, 0.4 * m02KNm);
  const m0EdKNm = Math.max(m0eKNm, nEdKN * excentricidadMinimaM);

  const dEficaz = h - rec;
  let curvatura = 0;
  let e2M = 0;
  if (!ignoraSegundoOrden) {
    // Curvatura de la ec. (5.34), con Kr de la (5.36) y Kφ de la (5.37).
    const nu = 1 + cuantiaMecanica;
    const kr = Math.min((nu - axilReducido) / (nu - 0.4), 1);
    const kPhi = Math.max(1 + 0.35 * (esfuerzos.fluenciaEficaz ?? 0), 1);
    const curvaturaBase = fyd / ES_MPA / (0.45 * dEficaz);
    curvatura = kr * kPhi * curvaturaBase;
    // c = 10 para sección constante, art. 5.8.8.2(4).
    e2M = (curvatura * longitudEfectivaM ** 2) / 10;
  }
  const m2KNm = nEdKN * e2M;
  const mEdKNm = m0EdKNm + m2KNm;

  // --- 4. Armado, art. 9.6 -------------------------------------------------
  const areaHormigonCm2 = areaHormigonM2 * 1e4;
  const asVerticalMinimaCm2 = 0.002 * areaHormigonCm2;
  const asVerticalMaximaCm2 = 0.04 * areaHormigonCm2;
  // art. 9.6.2(3): la menor entre 400 mm y tres veces el espesor.
  const separacionVerticalMaximaMm = Math.min(400, 3 * h * 1000);
  const asHorizontalMinimaCm2 = cuantiaHorizontalMinima(fykMPa) * areaHormigonCm2;

  const armado: ResultadoArmadoMuro = {
    areaHormigonCm2,
    asVerticalCm2,
    asVerticalMinimaCm2,
    asVerticalMaximaCm2,
    verificaVerticalMinima: asVerticalCm2 >= asVerticalMinimaCm2,
    verificaVerticalMaxima: asVerticalCm2 <= asVerticalMaximaCm2,
    separacionVerticalMaximaMm,
    verificaSeparacionVertical: armadura.separacionVerticalMm <= separacionVerticalMaximaMm,
    asHorizontalCm2,
    asHorizontalMinimaCm2,
    verificaHorizontalMinima: asHorizontalCm2 >= asHorizontalMinimaCm2,
    separacionHorizontalMaximaMm: 400,
    verificaSeparacionHorizontal: armadura.separacionHorizontalMm <= 400,
    requiereArmaduraTransversal: asVerticalCm2 > 0.02 * areaHormigonCm2,
  };

  // --- 5. Resistencia -------------------------------------------------------
  const diagrama = diagramaInteraccion(h, rec, asVerticalCm2 / caras, materiales);
  const mRdKNm = momentoResistente(diagrama, nEdKN);

  return {
    clasificacion,
    esbeltez: {
      radioGiroM,
      longitudEfectivaM,
      lambda,
      lambdaLimite,
      axilReducido,
      cuantiaMecanica,
      factorA,
      factorB,
      factorC,
      ignoraSegundoOrden,
    },
    momentos: {
      excentricidadMinimaM,
      m0eKNm,
      m0EdKNm,
      curvatura,
      e2M,
      m2KNm,
      mEdKNm,
    },
    armado,
    resistencia: {
      diagrama,
      mRdKNm,
      verifica: mEdKNm <= mRdKNm,
      aprovechamiento: mRdKNm > 0 ? mEdKNm / mRdKNm : Infinity,
    },
  };
}
