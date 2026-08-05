/**
 * Uniones metálicas: cordón de soldadura alrededor de un perfil H, y chapa de
 * base de pilar con pernos de anclaje. Método ASD, siguiendo el planteo de las
 * hojas SOLDADURA H y CHAPA PILARES de la planilla.
 */

export type Electrodo = "E60" | "E70" | "E80";

/** Resistencia nominal del metal de aporte según electrodo (kPa). */
const FNW_ELECTRODO: Record<Electrodo, number> = { E60: 422000, E70: 492200, E80: 562500 };

/** Coeficiente de seguridad del cordón: 0,6·Fnw dividido por 2. */
export function tensionAdmisibleSoldadura(electrodo: Electrodo): number {
  return (0.6 * FNW_ELECTRODO[electrodo]) / 2;
}

export interface PerfilH {
  /** Canto del perfil (mm) */
  hMm: number;
  /** Ancho de ala (mm) */
  bMm: number;
  /** Espesor de ala (mm) */
  tfMm: number;
  /** Espesor de alma (mm) */
  twMm: number;
}

export interface SolicitacionesSoldadura {
  /** Fuerzas (kN) */
  pxKN: number;
  pyKN: number;
  pzKN: number;
  /** Momentos (kN·m) */
  mxKNm: number;
  myKNm: number;
  mzKNm: number;
}

export interface ResultadoSoldaduraH {
  /** Lado mínimo de cordón admitido por el espesor de las chapas (mm) */
  dMinMm: number;
  /** Lado máximo admitido (mm) */
  dMaxMm: number;
  /** Garganta del cordón (mm) */
  gargantaMm: number;
  /** Longitud total del cordón (mm) */
  longitudMm: number;
  ixMm4: number;
  iyMm4: number;
  ipMm4: number;
  /** Tensiones tangenciales por fuerza directa (kPa) */
  tauXPKPa: number;
  tauYPKPa: number;
  tauZPKPa: number;
  /** Tensiones tangenciales por momento (kPa) */
  tauXMKPa: number;
  tauYMKPa: number;
  tauZMKPa: number;
  /** Tensión resultante (kPa) */
  tauKPa: number;
  tauAdmKPa: number;
  verifica: boolean;
  /** El lado elegido está dentro del rango admitido */
  ladoEnRango: boolean;
}

/** Lado mínimo de cordón según el menor espesor a unir (AISC J2.4). */
export function ladoMinimoCordonMm(espesorMenorMm: number): number {
  if (espesorMenorMm <= 6) return 3;
  if (espesorMenorMm <= 13) return 5;
  if (espesorMenorMm <= 19) return 6;
  return 8;
}

export function calcularSoldaduraH(
  perfil: PerfilH,
  ladoCordonMm: number,
  electrodo: Electrodo,
  solicitaciones: SolicitacionesSoldadura
): ResultadoSoldaduraH {
  const { hMm: H, bMm: B, tfMm: tf, twMm: tw } = perfil;
  const { pxKN, pyKN, pzKN, mxKNm, myKNm, mzKNm } = solicitaciones;

  const espesorMenor = Math.min(tf, tw);
  const dMinMm = ladoMinimoCordonMm(espesorMenor);
  const dMaxMm = espesorMenor <= 6 ? espesorMenor : espesorMenor - 2;

  const g = ladoCordonMm / Math.SQRT2;
  const longitudMm = 4 * B - 2 * tw + 2 * H;

  const ixMm4 =
    2 * ((g * B ** 3) / 12) +
    (4 * (g * (B / 2 - tw / 2) ** 3)) / 12 +
    4 * (B / 2) * g * (B / 4) ** 2 +
    (2 * ((H - 2 * tf) * g ** 3)) / 12 +
    2 * ((H - 2 * tf) * g * (tw / 2) ** 2) +
    4 * (tf * g * (B / 2) ** 2) +
    4 * ((tf * g ** 3) / 12);

  const iyMm4 =
    (2 * (g * (H - 2 * tf) ** 3)) / 12 +
    2 * (B * g * (H / 2) ** 2) +
    2 * (g * (B - tw) * (H / 2 - tf) ** 2);

  const ipMm4 = ixMm4 + iyMm4;

  const areaCordon = g * longitudMm;
  const tauXPKPa = (pxKN / areaCordon) * 1000 ** 2;
  const tauYPKPa = (pyKN / areaCordon) * 1000 ** 2;
  const tauZPKPa = (pzKN / areaCordon) * 1000 ** 2;

  const tauXMKPa = (mzKNm * (B / 2000)) / (ipMm4 / 1000 ** 4);
  const tauYMKPa = (mzKNm * (H / 2000)) / (ipMm4 / 1000 ** 4);
  const tauZMKPa =
    (mxKNm * (B / 2000)) / (ixMm4 / 1000 ** 4) + (myKNm * (H / 2000)) / (iyMm4 / 1000 ** 4);

  const tauKPa = Math.sqrt(
    (tauXPKPa + tauXMKPa) ** 2 + (tauYPKPa + tauYMKPa) ** 2 + (tauZPKPa + tauZMKPa) ** 2
  );
  const tauAdmKPa = tensionAdmisibleSoldadura(electrodo);

  return {
    dMinMm,
    dMaxMm,
    gargantaMm: g,
    longitudMm,
    ixMm4,
    iyMm4,
    ipMm4,
    tauXPKPa,
    tauYPKPa,
    tauZPKPa,
    tauXMKPa,
    tauYMKPa,
    tauZMKPa,
    tauKPa,
    tauAdmKPa,
    verifica: tauKPa < tauAdmKPa,
    ladoEnRango: ladoCordonMm >= dMinMm && ladoCordonMm <= dMaxMm,
  };
}

/**
 * Reparto de un momento entre filas de pernos a distintas distancias del eje de
 * giro. La fila más alejada (x1) toma la fuerza mayor y el resto se reparte
 * proporcionalmente a su distancia.
 */
export function fuerzasEnPernos(momentoKNm: number, distanciasM: number[]): number[] {
  if (distanciasM.length === 0 || distanciasM[0] <= 0) return [];
  const x1 = distanciasM[0];
  const denominador =
    2 * (x1 + distanciasM.slice(1).reduce((acc, xi) => acc + 2 * (xi ** 2 / x1), 0));
  const f1 = momentoKNm / denominador;
  return distanciasM.map((xi) => (f1 * xi) / x1);
}

export interface MaterialesChapa {
  /** Límite elástico del acero de chapa y pernos (kPa) */
  fyKPa: number;
  /** Resistencia última (kPa) */
  fuKPa: number;
  /** Resistencia característica del hormigón (kPa) */
  fckKPa: number;
}

export interface GeometriaChapa {
  /** Lado de la chapa en x (m) */
  lxM: number;
  /** Lado en y (m) */
  lyM: number;
  /** Espesor de la chapa (m) */
  tM: number;
  /** Diámetro del perno (mm) */
  diametroPernoMm: number;
  /** Distancia libre al borde en la dirección de la fuerza (m) */
  lcM: number;
  /** Cantidad de pernos */
  numeroPernos: number;
  /** Área bruta de la chapa traccionada (m²) */
  agM2: number;
  /** Área efectiva de la chapa traccionada (m²) */
  aeM2: number;
}

export interface VerificacionChapa {
  /** Resistencia admisible (kN) */
  admisibleKN: number;
  /** Solicitación (kN) */
  solicitacionKN: number;
  verifica: boolean;
}

export interface ResultadoChapaBase {
  aplastamientoHormigon: VerificacionChapa;
  aplastamientoChapa: VerificacionChapa;
  traccionChapa: VerificacionChapa;
  cortePernos: VerificacionChapa;
  traccionPernos: VerificacionChapa;
  /** Fuerza en cada fila de pernos, de la más alejada a la más cercana (kN) */
  fuerzasPernosKN: number[];
}

/** Coeficientes de seguridad ASD usados por la planilla. */
const OMEGA_TRACCION_PERNO = 1.5;
const OMEGA_HORMIGON = 2.31;
const OMEGA_CORTE = 2;

export interface DatosChapaBase {
  /** Carga axial de compresión sobre la chapa (kN) */
  nMaxKN: number;
  /** Corte por perno (kN) */
  cortePorPernoKN: number;
  /** Momento a repartir entre los pernos (kN·m) */
  momentoKNm: number;
  /** Distancias de cada fila de pernos al eje de giro, de mayor a menor (m) */
  distanciasPernosM: number[];
}

export function calcularChapaBase(
  materiales: MaterialesChapa,
  geometria: GeometriaChapa,
  datos: DatosChapaBase
): ResultadoChapaBase {
  const { fyKPa, fuKPa, fckKPa } = materiales;
  const { lxM, tM, diametroPernoMm, lcM, numeroPernos, agM2, aeM2 } = geometria;
  const dM = diametroPernoMm / 1000;
  const areaPernoM2 = (Math.PI * dM ** 2) / 4;

  // I. Aplastamiento del hormigón bajo la corona de apoyo de la chapa.
  const areaApoyoM2 = (Math.PI * lxM ** 2) / 4 - (Math.PI * (lxM - 0.12) ** 2) / 4;
  const nnKN = 0.85 * fckKPa * areaApoyoM2;

  // II. Aplastamiento de la chapa contra el perno.
  const rnAplastamientoKN = Math.min(
    1.2 * lcM * tM * fuKPa,
    (2.4 * diametroPernoMm * tM * fuKPa) / 1000
  );

  // III. Tracción en la chapa: gobierna la fluencia del área bruta o la rotura de la efectiva.
  const pnTraccionKN = Math.min((fyKPa * agM2) / 1.5, (fuKPa * aeM2) / 2);

  // IV y V. Corte y tracción en los pernos.
  const rnCorteKN = fyKPa * 0.6 * areaPernoM2;
  const rnTraccionKN = fyKPa * areaPernoM2;

  const fuerzasPernosKN = fuerzasEnPernos(datos.momentoKNm, datos.distanciasPernosM);
  const traccionMaximaPernoKN = fuerzasPernosKN[0] ?? 0;

  return {
    aplastamientoHormigon: {
      admisibleKN: nnKN / OMEGA_HORMIGON,
      solicitacionKN: datos.nMaxKN,
      verifica: datos.nMaxKN <= nnKN / OMEGA_HORMIGON,
    },
    aplastamientoChapa: {
      admisibleKN: rnAplastamientoKN / OMEGA_CORTE,
      solicitacionKN: datos.cortePorPernoKN,
      verifica: datos.cortePorPernoKN <= rnAplastamientoKN / OMEGA_CORTE,
    },
    traccionChapa: {
      admisibleKN: pnTraccionKN,
      solicitacionKN: datos.nMaxKN,
      verifica: datos.nMaxKN <= pnTraccionKN,
    },
    cortePernos: {
      admisibleKN: rnCorteKN / OMEGA_CORTE,
      solicitacionKN: datos.cortePorPernoKN / numeroPernos,
      verifica: datos.cortePorPernoKN / numeroPernos <= rnCorteKN / OMEGA_CORTE,
    },
    traccionPernos: {
      admisibleKN: rnTraccionKN / OMEGA_TRACCION_PERNO,
      solicitacionKN: traccionMaximaPernoKN,
      verifica: traccionMaximaPernoKN <= rnTraccionKN / OMEGA_TRACCION_PERNO,
    },
    fuerzasPernosKN,
  };
}
