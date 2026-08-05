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
  /** Sobrecarga en superficie, p. ej. tránsito de vehículos (kN/m²) */
  sobrecargaKPa: number;
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
}

export interface ResultadoApoyos {
  /** Reacción en el apoyo inferior, la que toma el contrapiso (kN/m) */
  r1KN: number;
  /** Reacción en el apoyo superior (kN/m) */
  r2KN: number;
}

export interface ResultadoMuroContencion {
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

/** Factor de seguridad exigido tanto a vuelco como a deslizamiento. */
export const FS_MINIMO = 1.5;

/**
 * Ancho tributario de la sobrecarga que la planilla suma a la resultante
 * vertical al verificar deslizamiento en el caso 1. Es menor que el ancho de
 * zapata: sólo se cuenta la parte que efectivamente gravita.
 */
const ANCHO_TRIBUTARIO_SOBRECARGA_M = 0.2;

/** Brazo con el que se moviliza el empuje pasivo (m). */
const BRAZO_EMPUJE_PASIVO_M = 0.9;

/** Excentricidad relativa asumida para la tensión del suelo en los casos apuntalados. */
const EXCENTRICIDAD_CASOS_APUNTALADOS = 0.03;

export interface ApoyosConfig {
  /** Distancia del apoyo inferior a la base, caso 2 (m) */
  l1Caso2M: number;
  /** Distancias de los apoyos en el caso 3 (m) */
  l1Caso3M: number;
  l2Caso3M: number;
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
    sobrecargaKPa: q,
  } = geometria;

  const phi = (phiGrados * Math.PI) / 180;
  // La planilla impone un piso de 0,5 al coeficiente activo, más conservador
  // que el valor teórico de Rankine.
  const ka = Math.max((1 - Math.sin(phi)) / (1 + Math.sin(phi)), 0.5);
  const kp = 1 / ka;
  const alturaTotalM = hMuro + hZap;

  // Acciones que vuelcan, tomando momentos respecto de la puntera.
  const empujeSueloKN = (gammaKNm3 * ka * hAct ** 2) / 2;
  const empujeSobrecargaKN = q * ka * hAct;
  const momentoVolcadorKNm =
    empujeSueloKN * (hAct / 3) + empujeSobrecargaKN * (hAct / 2);

  // Acciones que estabilizan.
  const pesoMuroKN = 25 * esp * hMuro;
  const pesoZapataKN = 25 * hZap * A;
  const pesoSueloActivoKN = (gammaKNm3 * hAct * (A - esp)) / 2;
  const pesoSueloPasivoKN = (gammaKNm3 * hPas * (A - esp)) / 2;
  const empujePasivoKN = (gammaKNm3 * kp * hPas ** 2) / 2;

  const momentoEstabilizadorKNm =
    pesoMuroKN * (esp / 2) +
    pesoZapataKN * (A / 2) +
    pesoSueloActivoKN * (A - (A - esp) / 2) +
    pesoSueloPasivoKN * ((A - esp) / 4) +
    empujePasivoKN * BRAZO_EMPUJE_PASIVO_M;

  const fsVuelco = momentoEstabilizadorKNm / momentoVolcadorKNm;

  const pesoTotalKN = pesoMuroKN + pesoZapataKN + pesoSueloActivoKN + pesoSueloPasivoKN;

  // Caso 1: el muro resiste el empuje sólo por rozamiento en la base.
  const nCaso1 = pesoTotalKN + q * ANCHO_TRIBUTARIO_SOBRECARGA_M;
  const fhAdmCaso1 = nCaso1 * Math.tan(phi) + cKPa * A;
  const fhMaxCaso1 = Math.abs(empujeSueloKN + empujeSobrecargaKN - empujePasivoKN);

  // Casos 2 y 3: reacciones de los apoyos.
  const r2Caso2 = momentoVolcadorKNm / apoyos.l1Caso2M;
  const r1Caso2 = r2Caso2 - empujeSueloKN - empujeSobrecargaKN;

  const r2Caso3 =
    (momentoVolcadorKNm - (empujeSueloKN + empujeSobrecargaKN) * apoyos.l1Caso3M) / apoyos.l2Caso3M;
  const r1Caso3 = empujeSueloKN + empujeSobrecargaKN - r2Caso3;

  // Con el contrapiso apuntalando, lo que hay que pasar por rozamiento es R1.
  const fhMaxApoyo = Math.abs(r1Caso2);

  // Tensión del suelo.
  const nTension = pesoTotalKN + q * 1;
  const momentoCaso1 =
    ((gammaKNm3 * hAct ** 2) / 2) * (hAct / 3) - ((gammaKNm3 * hPas ** 2) / 2) * (hPas / 3);
  const sigmaCaso1 = nTension / A + momentoCaso1 / (A ** 2 / 6);

  const momentoCasos23 = EXCENTRICIDAD_CASOS_APUNTALADOS * nTension;
  const sigmaCasos23 = nTension / A + momentoCasos23 / (A ** 2 / 6);

  return {
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
    },
    vuelco: { factorSeguridad: fsVuelco, verifica: fsVuelco >= FS_MINIMO },
    deslizamientoSoloZapata: {
      nKN: nCaso1,
      fhAdmKN: fhAdmCaso1,
      fhMaxKN: fhMaxCaso1,
      factorSeguridad: fhAdmCaso1 / fhMaxCaso1,
      verifica: fhAdmCaso1 / fhMaxCaso1 >= FS_MINIMO,
    },
    deslizamientoApoyoContrapiso: {
      nKN: nCaso1,
      fhAdmKN: fhAdmCaso1,
      fhMaxKN: fhMaxApoyo,
      factorSeguridad: fhAdmCaso1 / fhMaxApoyo,
      verifica: fhAdmCaso1 / fhMaxApoyo >= FS_MINIMO,
    },
    tensionSueloCaso1: {
      nKN: nTension,
      momentoKNm: momentoCaso1,
      sigmaKPa: sigmaCaso1,
      verifica: sigmaCaso1 <= sigmaAdmisibleKPa,
    },
    tensionSueloCasos23: {
      nKN: nTension,
      momentoKNm: momentoCasos23,
      sigmaKPa: sigmaCasos23,
      verifica: sigmaCasos23 <= sigmaAdmisibleKPa,
    },
    apoyoContrapiso: { r1KN: r1Caso2, r2KN: r2Caso2 },
    apoyoContrapisoYLosa: { r1KN: r1Caso3, r2KN: r2Caso3 },
  };
}
