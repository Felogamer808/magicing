import { GAMMA_F } from "@/lib/calc/hormigon/comun/coeficientes";
import { factorEscalaK, tensionCortanteResistente } from "@/lib/calc/hormigon/comun/cortante";
import type { MaterialesDerivados } from "@/lib/calc/hormigon/comun/types";

export interface GeometriaZapataAislada {
  /** Dimensión de la zapata en dirección A (m) */
  A: number;
  /** Dimensión de la zapata en dirección B (m) */
  B: number;
  /** Canto/espesor de la zapata (m) */
  H: number;
  /** Ancho del pilar en dirección A (m) */
  anchoPilarA: number;
  /** Ancho del pilar en dirección B (m) */
  anchoPilarB: number;
  /** Recubrimiento de la armadura de fundación (m) */
  recubrimiento: number;
}

export interface CargasZapata {
  /** Carga vertical característica (kN) */
  Nk: number;
  /** Momento característico según eje A (kN·m) */
  MkA: number;
  /** Momento característico según eje B (kN·m) */
  MkB: number;
}

export interface ArmadoDireccion {
  numero: number;
  diametroMm: number;
}

export interface DatosZapataAislada {
  cargas: CargasZapata;
  armadoA: ArmadoDireccion;
  armadoB: ArmadoDireccion;
}

/**
 * Reparto de presiones bajo la base en una dirección.
 *
 * Mientras la excentricidad se mantenga dentro del núcleo central (e ≤ L/6) la
 * zapata apoya entera y el diagrama es un trapecio. Pasado ese punto el borde
 * opuesto se despega —el terreno no puede traccionar— y la resultante se
 * reequilibra sobre una cuña triangular más corta y más cargada. Esa transición
 * no se ve en la tensión por área eficaz, que devuelve un solo número.
 */
export interface DistribucionPresiones {
  excentricidadM: number;
  /** Límite del núcleo central, L/6. */
  limiteNucleoM: number;
  hayDespegue: boolean;
  /** Longitud realmente en contacto con el terreno (m). */
  longitudContactoM: number;
  sigmaMaxKPa: number;
  /** Presión en el borde opuesto. Nula si ese borde se despegó. */
  sigmaMinKPa: number;
}

export interface ResultadoGeotecnico {
  pesoPropioKN: number;
  /** Presión de contacto por el método del área efectiva (kN/m²) */
  sigmaKPa: number;
  verificaTension: boolean;
  /** Reparto real de presiones en cada dirección, para poder dibujarlo. */
  distribucionA: DistribucionPresiones;
  distribucionB: DistribucionPresiones;
}

/**
 * Presiones en los bordes de la base en una dirección, con la carga vertical
 * total (incluido el peso propio) y su excentricidad.
 */
export function distribucionPresiones(
  cargaTotalKN: number,
  lM: number,
  anchoPerpM: number,
  excentricidadM: number
): DistribucionPresiones {
  const e = Math.abs(excentricidadM);
  const limiteNucleoM = lM / 6;

  if (e <= limiteNucleoM) {
    // Trapecio: toda la base trabaja.
    const media = cargaTotalKN / (lM * anchoPerpM);
    const incremento = (6 * cargaTotalKN * e) / (anchoPerpM * lM ** 2);
    return {
      excentricidadM: e,
      limiteNucleoM,
      hayDespegue: false,
      longitudContactoM: lM,
      sigmaMaxKPa: media + incremento,
      sigmaMinKPa: media - incremento,
    };
  }

  // Cuña triangular: la resultante cae fuera del núcleo y el borde opuesto se
  // levanta. El triángulo tiene su baricentro bajo la resultante, así que mide
  // 3·(L/2 − e), y de ahí sale σmax por equilibrio.
  const longitudContactoM = Math.max(3 * (lM / 2 - e), 0);
  const sigmaMaxKPa =
    longitudContactoM > 0 ? (2 * cargaTotalKN) / (longitudContactoM * anchoPerpM) : Infinity;

  return {
    excentricidadM: e,
    limiteNucleoM,
    hayDespegue: true,
    longitudContactoM,
    sigmaMaxKPa,
    sigmaMinKPa: 0,
  };
}

/**
 * Presión a una distancia `sM` del borde menos cargado. Con despegue, el tramo
 * levantado no empuja: devolver ahí el valor negativo del trapecio sería suponer
 * que el terreno tracciona.
 */
export function presionEn(dist: DistribucionPresiones, lM: number, sM: number): number {
  if (!dist.hayDespegue) {
    return dist.sigmaMinKPa + ((dist.sigmaMaxKPa - dist.sigmaMinKPa) * sM) / lM;
  }
  const inicioContactoM = lM - dist.longitudContactoM;
  if (sM <= inicioContactoM) return 0;
  return (dist.sigmaMaxKPa * (sM - inicioContactoM)) / dist.longitudContactoM;
}

/**
 * Resultante de las presiones entre una sección (a `sM` del borde menos cargado)
 * y el borde más cargado, y su momento respecto de esa sección. Es lo que
 * flecta y corta el vuelo de ese lado.
 */
export function cargaEntreSeccionYBorde(
  dist: DistribucionPresiones,
  lM: number,
  anchoPerpM: number,
  sM: number
): { fuerzaKN: number; momentoKNm: number } {
  // Resultante fuera de la base: no hay equilibrio posible, y un cero acá
  // dejaría pasar la zapata.
  if (!Number.isFinite(dist.sigmaMaxKPa)) return { fuerzaKN: Infinity, momentoKNm: Infinity };

  const desdeM = Math.max(sM, lM - dist.longitudContactoM);
  const tramoM = lM - desdeM;
  if (tramoM <= 0) return { fuerzaKN: 0, momentoKNm: 0 };

  const sigmaDesde = presionEn(dist, lM, desdeM);
  const brazoInicioM = desdeM - sM;
  const rectangulo = sigmaDesde * anchoPerpM * tramoM;
  const triangulo = ((dist.sigmaMaxKPa - sigmaDesde) * anchoPerpM * tramoM) / 2;
  return {
    fuerzaKN: rectangulo + triangulo,
    momentoKNm: rectangulo * (brazoInicioM + tramoM / 2) + triangulo * (brazoInicioM + (2 * tramoM) / 3),
  };
}

export interface ResultadoArmadoDireccion {
  sigmaMaxKPa: number;
  sigmaMinKPa: number;
  /** Longitud de base que apoya con las presiones de cálculo (m). Menor que la base si hay despegue. */
  longitudContactoM?: number;
  /** Presión en la sección crítica de flexión (kN/m²) */
  sigmaCriticaKPa: number;
  /** Vuelo desde la sección crítica (cara del pilar reducida 1/4 de su ancho) hasta el borde (m) */
  lM: number;
  dM: number;
  /** Tracción de cálculo Td = M/(0.85d) (kN) */
  tdKN: number;
  asCalculadoCm2: number;
  asMinMecanicoCm2: number;
  asMinGeometricoCm2: number;
  asNecCm2: number;
  asRealCm2: number;
  verificaAs: boolean;
  lbIMm: number;
  dmMm: number;
  /** Cortante de cálculo a d de la cara del pilar, EC2 6.2.2 (kN). 0 si la sección crítica cae dentro del pilar. */
  vEdKN: number;
  /** Resistencia a cortante sin armadura transversal, EC2 6.2.2 (kN) */
  vRdCKN: number;
  verificaCorte: boolean;
}

export interface ResultadoPunzonamiento {
  dPromedioM: number;
  /** Distancia del perímetro crítico a la cara del pilar, la que peor verifica dentro de 2d (m) */
  aCriticaM: number;
  /** Perímetro de control en la distancia crítica (m) */
  u1M: number;
  /** Cortante neto VEd,red (descontando la reacción del suelo dentro del perímetro), ec. (6.48) (kN) */
  vEdRedKN: number;
  /**
   * Cortante equivalente con el efecto del momento: v_Ed·u·d según la ec. (6.51),
   * con los dos ejes sumados (kN). Con carga centrada coincide con VEd,red.
   */
  vEdKN: number;
  /** Factor que el momento aplica sobre VEd,red en el perímetro crítico. 1 sin momento. */
  beta: number;
  vRdCKN: number;
  verificaPunzonamiento: boolean;
  /** Aprovechamiento en el perímetro crítico, vEd/vRd */
  aprovechamiento: number;
  /**
   * Falso cuando la zapata no vuela respecto del pilar y no hay perímetro que
   * comprobar. Con vuelo menor que 2d se barre sólo hasta el vuelo: los
   * perímetros que caen fuera de la zapata no existen.
   */
  hayPerimetroDentro: boolean;
  /** Comprobación de bielas en la cara del pilar, art. 6.4.5 (3), ec. (6.53). */
  caraPilar: {
    /** Perímetro del pilar u0 (m) */
    u0M: number;
    /** β en el perímetro básico u1 a 2d, ec. (6.39) con los dos ejes sumados */
    beta: number;
    /** v_Ed = β·VEd/(u0·d) (MPa) */
    vEdMPa: number;
    /** v_Rd,max = 0,4·ν·fcd (MPa) */
    vRdMaxMPa: number;
    verifica: boolean;
  };
}

export interface ResultadoZapataAislada {
  /** Mayor vuelo de la zapata respecto del pilar, en A o en B (m) */
  vueloMaxM: number;
  /** Clasificación informativa: vuelo ≤ 2H (método simplificado válido para zapatas rígidas) */
  esRigida: boolean;
  geotecnico: ResultadoGeotecnico;
  direccionA: ResultadoArmadoDireccion;
  direccionB: ResultadoArmadoDireccion;
  punzonamiento: ResultadoPunzonamiento;
}

export interface ResultadoCorteUnidireccional {
  vEdKN: number;
  vRdCKN: number;
  verificaCorte: boolean;
}

/**
 * Cortante unidireccional (EC2 6.2.2) en una sección genérica: se le pasan ya
 * calculadas la presión en la sección crítica y en el borde traccionado, y el
 * vuelo entre ambas. Independiente de si la distribución de presiones es
 * centrada (zapata aislada) o no (zapata de medianería).
 */
export function calcularCorteUnidireccional(
  materiales: MaterialesDerivados,
  dimPerpendicular: number,
  d: number,
  sigmaSeccionKPa: number,
  sigmaBordeKPa: number,
  vueloCorteM: number,
  asRealCm2: number
): ResultadoCorteUnidireccional {
  if (vueloCorteM <= 0) {
    return { vEdKN: 0, vRdCKN: 0, verificaCorte: true };
  }
  const vEdKN = ((sigmaSeccionKPa + sigmaBordeKPa) / 2) * dimPerpendicular * vueloCorteM;
  return corteDesdeCarga(materiales, dimPerpendicular, d, vEdKN, asRealCm2);
}

/** Compara un cortante de cálculo ya integrado con la VRd,c de la sección (EC2 6.2.2). */
function corteDesdeCarga(
  materiales: MaterialesDerivados,
  dimPerpendicular: number,
  d: number,
  vEdKN: number,
  asRealCm2: number
): ResultadoCorteUnidireccional {
  const { fck } = materiales;
  const k = factorEscalaK(d);
  const rhoL = asRealCm2 / (100 ** 2 * dimPerpendicular * d);
  const vRdCKN = tensionCortanteResistente(k, rhoL, fck) * dimPerpendicular * d * 1000;
  return { vEdKN, vRdCKN, verificaCorte: vEdKN <= vRdCKN };
}

/**
 * Arma una dirección de flexión a partir de una distribución de presiones ya
 * calculada (sección crítica y vuelo hasta el borde traccionado). Se separa de
 * {@link calcularArmadoDireccion} para poder reutilizarla con distribuciones no
 * centradas (p. ej. zapata de medianería).
 */
export function calcularArmadoDesdePresion(
  materiales: MaterialesDerivados,
  dimPerpendicular: number,
  H: number,
  d: number,
  sigmaMaxKPa: number,
  sigmaCriticaKPa: number,
  lM: number,
  armadura: ArmadoDireccion
): ResultadoArmadoDireccion {
  const momentoKNm =
    sigmaCriticaKPa * dimPerpendicular * lM * (lM / 2) +
    (sigmaMaxKPa - sigmaCriticaKPa) * dimPerpendicular * (lM / 2) * ((2 * lM) / 3);
  return armadoDesdeMomento(materiales, dimPerpendicular, H, d, momentoKNm, sigmaMaxKPa, sigmaCriticaKPa, lM, armadura);
}

/** Arma una dirección con el momento ya integrado en la sección crítica de flexión. */
function armadoDesdeMomento(
  materiales: MaterialesDerivados,
  dimPerpendicular: number,
  H: number,
  d: number,
  momentoKNm: number,
  sigmaMaxKPa: number,
  sigmaCriticaKPa: number,
  lM: number,
  armadura: ArmadoDireccion
): ResultadoArmadoDireccion {
  const { fcd, fyd, fydEstribos } = materiales;

  const tdKN = momentoKNm / (0.85 * d);

  // La planilla usa el fyd limitado ("fyd ByT", el mismo criterio que los estribos de vigas)
  // para pasar de tracción de cálculo a área de acero, no el fyd pleno.
  const asCalculadoCm2 = (tdKN / (fydEstribos * 1000)) * 100 ** 2;
  const asMinMecanicoCm2 = (100 ** 2 * 0.04 * dimPerpendicular * H * fcd) / fyd;
  const asMinGeometricoCm2 = (100 ** 2 * 0.9 * dimPerpendicular * H) / 1000;
  const asNecCm2 = Math.max(asCalculadoCm2, asMinMecanicoCm2, asMinGeometricoCm2);

  const asRealCm2 = (armadura.numero * Math.PI * (armadura.diametroMm / 10) ** 2) / 4;
  const verificaAs = asRealCm2 >= asNecCm2;

  const lbIMm = Math.max(1.3 * armadura.diametroMm ** 2, (materiales.fyk * armadura.diametroMm) / 20);
  const dmMm = 12 * armadura.diametroMm;

  return {
    sigmaMaxKPa,
    sigmaMinKPa: sigmaCriticaKPa,
    sigmaCriticaKPa,
    lM,
    dM: d,
    tdKN,
    asCalculadoCm2,
    asMinMecanicoCm2,
    asMinGeometricoCm2,
    asNecCm2,
    asRealCm2,
    verificaAs,
    lbIMm,
    dmMm,
    vEdKN: 0,
    vRdCKN: 0,
    verificaCorte: true,
  };
}

/** Arma una dirección de flexión asumiendo el pilar centrado en `dim` (caso general, zapata aislada). */
export function calcularArmadoDireccion(
  materiales: MaterialesDerivados,
  /** Dimensión propia de esta dirección (a lo largo de la cual varía la presión) */
  dim: number,
  /** Dimensión perpendicular (ancho que recibe la flexión) */
  dimPerpendicular: number,
  H: number,
  anchoPilar: number,
  d: number,
  cargas: CargasZapata,
  mk: number,
  armadura: ArmadoDireccion
): ResultadoArmadoDireccion {
  const { Nk } = cargas;

  // Presiones de cálculo sin el peso propio, que equilibra su propia reacción y
  // no flecta. Se reparten como en el terreno: si la resultante sale del núcleo
  // central, el borde opuesto se despega. El trapecio N/A ± M/W daría ahí
  // presiones negativas, que restan momento y cortante del lado inseguro.
  const excentricidadM = Nk !== 0 ? mk / Nk : 0;
  const dist = distribucionPresiones(GAMMA_F * Nk, dim, dimPerpendicular, excentricidadM);

  const lM = dim / 2 - anchoPilar / 4;
  const seccionFlexionM = dim - lM;
  const flexion = armadoDesdeMomento(
    materiales,
    dimPerpendicular,
    H,
    d,
    cargaEntreSeccionYBorde(dist, dim, dimPerpendicular, seccionFlexionM).momentoKNm,
    dist.sigmaMaxKPa,
    presionEn(dist, dim, seccionFlexionM),
    lM,
    armadura
  );

  // Cortante unidireccional (EC2 6.2.2), sección crítica a d de la cara del pilar.
  const vueloCorteM = dim / 2 - anchoPilar / 2 - d;
  const corte =
    vueloCorteM > 0
      ? corteDesdeCarga(
          materiales,
          dimPerpendicular,
          d,
          cargaEntreSeccionYBorde(dist, dim, dimPerpendicular, dim - vueloCorteM).fuerzaKN,
          flexion.asRealCm2
        )
      : { vEdKN: 0, vRdCKN: 0, verificaCorte: true };

  return { ...flexion, sigmaMinKPa: dist.sigmaMinKPa, longitudContactoM: dist.longitudContactoM, ...corte };
}

export function calcularZapataAislada(
  materiales: MaterialesDerivados,
  geometria: GeometriaZapataAislada,
  sigmaAdmisibleKPa: number,
  datos: DatosZapataAislada
): ResultadoZapataAislada {
  const { A, B, H, anchoPilarA, anchoPilarB, recubrimiento } = geometria;
  const { cargas, armadoA, armadoB } = datos;
  const { Nk, MkA, MkB } = cargas;

  // Vuelo de la zapata respecto del pilar en cada dirección: si es mayor que 2H,
  // el método simplificado (rígido) que usa este cálculo deja de ser válido.
  const vueloMaxM = Math.max((A - anchoPilarA) / 2, (B - anchoPilarB) / 2);

  // La excentricidad es la de la resultante que llega al terreno, peso propio
  // incluido: dividir el momento sólo por Nk la exagera, y más cuanto más liviano
  // es el pilar respecto de la zapata.
  const pesoPropioKN = 25 * A * B * H;
  const cargaTotalKN = Nk + pesoPropioKN;
  const excA = cargaTotalKN !== 0 ? MkA / cargaTotalKN : 0;
  const excB = cargaTotalKN !== 0 ? MkB / cargaTotalKN : 0;
  // Con la resultante fuera de la base no hay área eficaz: los dos anchos
  // negativos multiplicados darían un área positiva y una tensión ínfima.
  const anchoEficazAM = A - 2 * Math.abs(excA);
  const anchoEficazBM = B - 2 * Math.abs(excB);
  const sigmaKPa =
    anchoEficazAM > 0 && anchoEficazBM > 0 ? cargaTotalKN / (anchoEficazAM * anchoEficazBM) : Infinity;
  const verificaTension = sigmaKPa <= sigmaAdmisibleKPa;

  const dA = H - recubrimiento - armadoA.diametroMm / 2000;
  const dB = H - recubrimiento - armadoB.diametroMm / 2000 - armadoA.diametroMm / 1000;

  const direccionA = calcularArmadoDireccion(materiales, A, B, H, anchoPilarA, dA, cargas, MkA, armadoA);
  const direccionB = calcularArmadoDireccion(materiales, B, A, H, anchoPilarB, dB, cargas, MkB, armadoB);

  const punzonamiento = calcularPunzonamiento(materiales, geometria, cargas, dA, dB, direccionA.asRealCm2, direccionB.asRealCm2);

  return {
    vueloMaxM,
    esRigida: vueloMaxM <= 2 * H,
    geotecnico: {
      pesoPropioKN,
      sigmaKPa,
      verificaTension,
      distribucionA: distribucionPresiones(cargaTotalKN, A, B, excA),
      distribucionB: distribucionPresiones(cargaTotalKN, B, A, excB),
    },
    direccionA,
    direccionB,
    punzonamiento,
  };
}

/**
 * k de la tabla A19.6.1 (Anejo 19, art. 6.4.3 (3), pág. 91), interpolado
 * linealmente entre los valores tabulados. c1 es el lado del pilar paralelo a
 * la excentricidad.
 */
export function coeficienteKMomento(c1M: number, c2M: number): number {
  const tabla: [number, number][] = [[0.5, 0.45], [1, 0.6], [2, 0.7], [3, 0.8]];
  const r = c1M / c2M;
  if (r <= tabla[0][0]) return tabla[0][1];
  for (let i = 1; i < tabla.length; i++) {
    const [r1, k1] = tabla[i];
    if (r <= r1) {
      const [r0, k0] = tabla[i - 1];
      return k0 + ((k1 - k0) * (r - r0)) / (r1 - r0);
    }
  }
  return tabla[tabla.length - 1][1];
}

/**
 * W del perímetro a distancia `a` de la cara de un pilar rectangular, para un
 * momento cuya excentricidad es paralela a c1. Es la ec. (6.41) (art. 6.4.3 (3),
 * pág. 92) con 2d reemplazado por a, que es lo que pide la (6.51): "W es similar
 * a W1, pero considerando el perímetro u". Con a = 2d devuelve la (6.41) exacta.
 */
export function moduloPerimetroM2(c1M: number, c2M: number, aM: number): number {
  return c1M ** 2 / 2 + c1M * c2M + 2 * c2M * aM + 4 * aM ** 2 + Math.PI * aM * c1M;
}

/**
 * Punzonamiento en la base de un pilar, Anejo 19, art. 6.4.4 (2), pág. 94-95.
 *
 * Se barren los perímetros situados dentro de 2d de la cara del pilar, con
 * esquinas redondeadas, y se informa el que peor verifica. En cada uno:
 *
 *   v_Ed = [VEd,red + kA·MEd,A·u/W_A + kB·MEd,B·u/W_B] / (u·d)
 *
 * que es la ec. (6.51) extendida a los dos ejes sumando sus términos. La norma
 * la da para un eje; sumar es superposición y queda del lado seguro. MEd es el
 * momento del pilar, 1,5·Mk, sin descontar el contramomento de las presiones
 * dentro del perímetro (también del lado seguro). Las dos cosas las decidió el
 * usuario.
 *
 * Sin momento, el corchete vale 1: el β = 1,15 que se usaba antes es la
 * simplificación del art. 6.4.3 (6) para pilares de losa, no la de una base.
 */
function calcularPunzonamiento(
  materiales: MaterialesDerivados,
  geometria: GeometriaZapataAislada,
  cargas: CargasZapata,
  dA: number,
  dB: number,
  asRealACm2: number,
  asRealBCm2: number
): ResultadoPunzonamiento {
  const { A, B, anchoPilarA, anchoPilarB } = geometria;
  const { fck, fcd } = materiales;
  const { Nk, MkA, MkB } = cargas;

  const dPromedioM = (dA + dB) / 2;
  const vEdPilarKN = GAMMA_F * Nk;
  const mEdAKNm = GAMMA_F * Math.abs(MkA);
  const mEdBKNm = GAMMA_F * Math.abs(MkB);
  const kA = coeficienteKMomento(anchoPilarA, anchoPilarB);
  const kB = coeficienteKMomento(anchoPilarB, anchoPilarA);

  /** Cortante que suma el momento en un perímetro de longitud u a distancia a (kN). */
  const cortanteMomento = (uM: number, aM: number) =>
    (kA * mEdAKNm * uM) / moduloPerimetroM2(anchoPilarA, anchoPilarB, aM) +
    (kB * mEdBKNm * uM) / moduloPerimetroM2(anchoPilarB, anchoPilarA, aM);

  const sigmaDesignKPa = (GAMMA_F * Nk) / (A * B);

  const rhoLA = asRealACm2 / (100 ** 2 * B * dA);
  const rhoLB = asRealBCm2 / (100 ** 2 * A * dB);
  const rhoL = Math.sqrt(Math.min(rhoLA, 0.02) * Math.min(rhoLB, 0.02));
  const k = factorEscalaK(dPromedioM);

  /** Estado del punzonamiento en un perímetro situado a distancia `a` de la cara del pilar. */
  function enPerimetro(aM: number) {
    const uM = 2 * (anchoPilarA + anchoPilarB) + 2 * Math.PI * aM;
    const areaDentroM2 =
      anchoPilarA * anchoPilarB + 2 * (anchoPilarA + anchoPilarB) * aM + Math.PI * aM ** 2;

    const vEdRedKN = Math.max(vEdPilarKN - sigmaDesignKPa * areaDentroM2, 0);
    const vEdKN = vEdRedKN + cortanteMomento(uM, aM);
    // El factor 2d/a de la ec. (6.50) premia a los perímetros más cercanos al
    // pilar, donde la biela es más tendida: sin él, el perímetro a 2d parecería
    // siempre el peor.
    const factorProximidad = (2 * dPromedioM) / aM;
    const vRdCKN =
      tensionCortanteResistente(k, rhoL, fck) * factorProximidad * uM * dPromedioM * 1000;

    return { aM, u1M: uM, vEdRedKN, vEdKN, vRdCKN, aprovechamiento: vRdCKN > 0 ? vEdKN / vRdCKN : Infinity };
  }

  // Bielas en la cara del pilar, art. 6.4.5 (3), ec. (6.53), pág. 96. β es el
  // del perímetro básico a 2d, ec. (6.39), con los dos ejes sumados; VEd es la
  // carga entera del pilar (decidido por el usuario).
  const u0M = 2 * (anchoPilarA + anchoPilarB);
  const u1BasicoM = u0M + 2 * Math.PI * 2 * dPromedioM;
  const betaCara = vEdPilarKN > 0 ? 1 + cortanteMomento(u1BasicoM, 2 * dPromedioM) / vEdPilarKN : 1;
  const vEdCaraMPa = (betaCara * vEdPilarKN) / (u0M * dPromedioM) / 1000;
  const nu = 0.6 * (1 - fck / 250); // ec. (6.6), pág. 77
  const vRdMaxMPa = 0.4 * nu * fcd;
  const caraPilar = { u0M, beta: betaCara, vEdMPa: vEdCaraMPa, vRdMaxMPa, verifica: vEdCaraMPa <= vRdMaxMPa };

  // Un perímetro que se sale de la zapata no existe: la carga ya salió por el
  // borde. Se barre hasta el menor de 2d y el vuelo más corto.
  const vueloMinM = Math.min((A - anchoPilarA) / 2, (B - anchoPilarB) / 2);
  const aMaxM = Math.min(2 * dPromedioM, vueloMinM);
  if (!(aMaxM > 0)) {
    return {
      dPromedioM, aCriticaM: 0, u1M: 0, vEdRedKN: 0, vEdKN: 0, beta: 1, vRdCKN: 0,
      verificaPunzonamiento: true, aprovechamiento: 0, hayPerimetroDentro: false, caraPilar,
    };
  }

  // El articulado pide comprobar los perímetros situados *dentro* de 2d, no sólo
  // el de 2d (art. 6.4.4(2), ec. (6.50), pág. 95). En zapatas rígidas —vuelo
  // corto respecto del canto, que es el caso habitual— el crítico cae más cerca
  // del pilar: comprobar sólo el de 2d deja pasar zapatas que no verifican.
  //
  // No hay forma cerrada de dónde está el mínimo, así que se barre en cien
  // pasos hasta aMax (d/50 cuando aMax = 2d, que da el mismo perímetro crítico
  // que uno diez veces más fino en los casos ensayados). El barrido no arranca
  // en a = 0 porque ahí el factor 2d/a se dispara y ningún perímetro tan
  // cercano puede gobernar.
  const PASOS = 100;
  let critico = enPerimetro(aMaxM / PASOS);
  for (let i = 2; i <= PASOS; i++) {
    const candidato = enPerimetro((aMaxM * i) / PASOS);
    if (candidato.aprovechamiento > critico.aprovechamiento) critico = candidato;
  }

  return {
    dPromedioM,
    aCriticaM: critico.aM,
    u1M: critico.u1M,
    vEdRedKN: critico.vEdRedKN,
    vEdKN: critico.vEdKN,
    beta: critico.vEdRedKN > 0 ? critico.vEdKN / critico.vEdRedKN : Infinity,
    hayPerimetroDentro: true,
    caraPilar,
    vRdCKN: critico.vRdCKN,
    aprovechamiento: critico.aprovechamiento,
    verificaPunzonamiento: critico.vEdKN <= critico.vRdCKN,
  };
}
