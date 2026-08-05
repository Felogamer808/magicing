/**
 * Pilar mixto: tubo circular de acero relleno de hormigón (CFT), verificado
 * según AISC 360 por el método ASD. No usa Eurocódigo — la planilla original
 * trabaja con esta norma para este elemento.
 */

export interface MaterialesMixta {
  /** Módulo de elasticidad del acero (kPa) */
  esKPa: number;
  /** Límite elástico del acero (kPa) */
  fyKPa: number;
  /** Resistencia característica del hormigón (kPa) */
  fcKPa: number;
  /** Módulo de elasticidad del hormigón (kPa) */
  ecKPa: number;
}

export interface GeometriaMixta {
  /** Diámetro exterior del tubo (mm) */
  dMm: number;
  /** Espesor de pared del tubo (mm) */
  tMm: number;
  /** Longitud del pilar (m) */
  lM: number;
  /** Diámetro de las barras de armadura interior (mm) */
  diametroBarraMm: number;
  /** Número de barras de armadura interior */
  numeroBarras: number;
}

export interface PropiedadesGeometricas {
  /** Área de acero del tubo (m²) */
  asM2: number;
  /** Área de hormigón (m²) */
  acM2: number;
  /** Área bruta (m²) */
  agM2: number;
  /** Armadura mínima exigida, 0,4% del área bruta (m²) */
  asrMinM2: number;
  /** Armadura real (m²) */
  asrM2: number;
  verificaArmaduraMinima: boolean;
  /** Inercia del tubo de acero (m⁴) */
  isM4: number;
  /** Inercia del núcleo de hormigón (m⁴) */
  icM4: number;
  /** Inercia de la armadura (m⁴) */
  isrM4: number;
}

export type ClaseSeccion = "COMPACTA" | "NO COMPACTA" | "ESBELTA";

export interface ClasificacionSeccion {
  /** Esbeltez de la pared: D/t */
  relacionDT: number;
  lambdaP: number;
  lambdaR: number;
  clase: ClaseSeccion;
}

export interface ResultadoCompresionMixta {
  /** Resistencia de la sección sin pandeo, Pno = Pp (kN) */
  pnoKN: number;
  /** Coeficiente C3 para la rigidez efectiva */
  c3: number;
  /** Rigidez efectiva a flexión (kN·m²) */
  eiEffKNm2: number;
  /** Carga crítica de pandeo elástico (kN) */
  peKN: number;
  /** Resistencia nominal a compresión (kN) */
  pnKN: number;
  /** Resistencia admisible Pn/Ωc (kN) */
  pAdmKN: number;
  verificaCompresion: boolean;
}

export interface ResultadoFlexionMixta {
  /** Módulo plástico (m³) */
  zM3: number;
  /** Momento plástico (kN·m) */
  mpKNm: number;
  /** Momento admisible Mn/Ωb (kN·m) */
  mAdmKNm: number;
  verificaFlexion: boolean;
}

export interface ResultadoCorteMixta {
  /** Longitud de corte, mitad de la longitud del pilar (m) */
  lvM: number;
  /** Tensión crítica de abolladura (kPa) */
  fcrKPa: number;
  /** Resistencia nominal a corte (kN) */
  vnKN: number;
  /** Resistencia admisible Vn/Ωv (kN) */
  vAdmKN: number;
  verificaCorte: boolean;
}

export interface ResultadoFuegoMixta {
  /** Módulo del acero reducido por temperatura (kPa) */
  esThetaKPa: number;
  /** Módulo del hormigón reducido por temperatura (kPa) */
  ecThetaKPa: number;
  /** Carga crítica en situación de incendio (kN) */
  nfiCrKN: number;
}

export interface ResultadoSeccionMixta {
  propiedades: PropiedadesGeometricas;
  compresion: ClasificacionSeccion & ResultadoCompresionMixta;
  flexion: ClasificacionSeccion & ResultadoFlexionMixta;
  corte: ResultadoCorteMixta;
  fuego: ResultadoFuegoMixta;
}

/** Coeficiente C2 de AISC para secciones circulares rellenas. */
const C2_CIRCULAR = 0.95;
/** Coeficientes de seguridad ASD. */
const OMEGA_C = 2;
const OMEGA_B = 1.67;
const OMEGA_V = 1.67;

function clasificar(relacionDT: number, lambdaP: number, lambdaR: number): ClaseSeccion {
  if (relacionDT <= lambdaP) return "COMPACTA";
  if (relacionDT >= lambdaR) return "ESBELTA";
  return "NO COMPACTA";
}

export function calcularPropiedadesGeometricas(geometria: GeometriaMixta): PropiedadesGeometricas {
  const { dMm, tMm, diametroBarraMm, numeroBarras } = geometria;
  const dInt = dMm - 2 * tMm;

  const agM2 = (Math.PI * dMm ** 2) / 4 / 1000 ** 2;
  const acM2 = (Math.PI * dInt ** 2) / 4 / 1000 ** 2;
  const asM2 = agM2 - acM2;
  const asrM2 = (numeroBarras * Math.PI * diametroBarraMm ** 2) / 4 / 1000 ** 2;
  const asrMinM2 = 0.004 * agM2;

  const isM4 = ((Math.PI * dMm ** 4) / 64 - (Math.PI * dInt ** 4) / 64) / 1000 ** 4;
  const icM4 = (Math.PI * dInt ** 4) / 64 / 1000 ** 4;
  // Aproximación de la planilla: aporta el par de barras más alejado del centro.
  const isrM4 =
    2 * (asrM2 / numeroBarras) * (dInt / 2000) ** 2 +
    (2 * Math.PI * (diametroBarraMm / 1000) ** 4) / 64;

  return { asM2, acM2, agM2, asrMinM2, asrM2, verificaArmaduraMinima: asrM2 >= asrMinM2, isM4, icM4, isrM4 };
}

export interface DatosSeccionMixta {
  /** Carga axial de servicio (kN) */
  pKN: number;
  /** Momento flector de servicio (kN·m) */
  mKNm: number;
  /** Cortante de servicio (kN) */
  vKN: number;
  /** Distancia del centro de gravedad de la media sección al eje (mm) */
  yGMm: number;
  /** Temperatura del acero en situación de incendio (°C), sólo informativa */
  temperaturaC: number;
  /** Longitud de pandeo en situación de incendio (m) */
  longitudFuegoM: number;
}

export function calcularSeccionMixta(
  materiales: MaterialesMixta,
  geometria: GeometriaMixta,
  datos: DatosSeccionMixta
): ResultadoSeccionMixta {
  const { esKPa, fyKPa, fcKPa, ecKPa } = materiales;
  const { dMm, tMm, lM } = geometria;
  const p = calcularPropiedadesGeometricas(geometria);

  const relacionDT = dMm / tMm;
  const clasifCompresion: ClasificacionSeccion = {
    relacionDT,
    lambdaP: (0.15 * esKPa) / fyKPa,
    lambdaR: (0.19 * esKPa) / fyKPa,
    clase: "COMPACTA",
  };
  clasifCompresion.clase = clasificar(relacionDT, clasifCompresion.lambdaP, clasifCompresion.lambdaR);

  const clasifFlexion: ClasificacionSeccion = {
    relacionDT,
    lambdaP: (0.09 * esKPa) / fyKPa,
    lambdaR: (0.31 * esKPa) / fyKPa,
    clase: "COMPACTA",
  };
  clasifFlexion.clase = clasificar(relacionDT, clasifFlexion.lambdaP, clasifFlexion.lambdaR);

  // Compresión (AISC I2.2)
  const pnoKN = fyKPa * p.asM2 + C2_CIRCULAR * fcKPa * (p.acM2 + (p.asrM2 * esKPa) / ecKPa);
  const c3 = Math.min(0.45 + (3 * (p.asM2 + p.asrM2)) / p.agM2, 0.9);
  const eiEffKNm2 = esKPa * p.isM4 + esKPa * p.isrM4 + c3 * ecKPa * p.icM4;
  const peKN = (Math.PI ** 2 * eiEffKNm2) / lM ** 2;
  const pnKN = pnoKN / peKN <= 2.25 ? pnoKN * 0.658 ** (pnoKN / peKN) : 0.877 * peKN;
  const pAdmKN = pnKN / OMEGA_C;

  // Flexión (AISC I3)
  const zM3 = (p.asM2 * datos.yGMm) / 1000;
  const mpKNm = fyKPa * zM3;
  const mAdmKNm = mpKNm / OMEGA_B;

  // Corte de la sección de acero (AISC G6, tubo circular)
  const lvM = lM / 2;
  const fcrKPa = Math.max(
    (1.6 * esKPa) / (Math.sqrt((lvM * 1000) / dMm) * relacionDT ** (5 / 4)),
    (0.78 * esKPa) / relacionDT ** (3 / 2)
  );
  const vnKN = (fcrKPa * p.asM2) / 2;
  const vAdmKN = vnKN / OMEGA_V;

  // Situación de incendio: módulos reducidos y carga crítica resultante.
  const esThetaKPa = 0.31 * esKPa;
  const ecThetaKPa = 0.15 * ecKPa;
  const nfiCrKN =
    (Math.PI ** 2 * (esThetaKPa * p.isM4 + ecThetaKPa * p.icM4)) / datos.longitudFuegoM ** 2;

  return {
    propiedades: p,
    compresion: {
      ...clasifCompresion,
      pnoKN,
      c3,
      eiEffKNm2,
      peKN,
      pnKN,
      pAdmKN,
      verificaCompresion: datos.pKN <= pAdmKN,
    },
    flexion: { ...clasifFlexion, zM3, mpKNm, mAdmKNm, verificaFlexion: datos.mKNm <= mAdmKNm },
    corte: { lvM, fcrKPa, vnKN, vAdmKN, verificaCorte: datos.vKN <= vAdmKN },
    fuego: { esThetaKPa, ecThetaKPa, nfiCrKN },
  };
}
