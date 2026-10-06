import { calcularAnclaje, type FormaAnclaje } from "@/lib/calc/hormigon/comun/anclaje";
import { GAMMA_F } from "@/lib/calc/hormigon/comun/coeficientes";
import { armaduraMinimaTraccionCm2, resistenciaFlexotraccionMPa } from "@/lib/calc/hormigon/comun/cuantias";
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
  /** Extremo de las barras de la parrilla. Recta si falta. */
  formaAnclaje?: FormaAnclaje;
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
  // Resultante fuera de la base: todo el peso en el borde, nada en el resto.
  if (!Number.isFinite(dist.sigmaMaxKPa)) return sM >= lM ? Infinity : 0;
  if (!dist.hayDespegue) {
    return dist.sigmaMinKPa + ((dist.sigmaMaxKPa - dist.sigmaMinKPa) * sM) / lM;
  }
  const inicioContactoM = lM - dist.longitudContactoM;
  if (sM <= inicioContactoM) return 0;
  return (dist.sigmaMaxKPa * (sM - inicioContactoM)) / dist.longitudContactoM;
}

/**
 * Resultante de las presiones en el tramo [desdeM, hastaM] (medido desde el
 * borde menos cargado) y su momento respecto de un punto fuera del tramo. La
 * presión es lineal sobre la parte que apoya, así que el tramo se recorta al
 * contacto y se integra como trapecio.
 */
export function cargaEnTramo(
  dist: DistribucionPresiones,
  lM: number,
  anchoPerpM: number,
  desdeM: number,
  hastaM: number,
  puntoM: number
): { fuerzaKN: number; momentoKNm: number } {
  // Resultante fuera de la base: no hay equilibrio posible, y un cero acá
  // dejaría pasar la zapata.
  if (!Number.isFinite(dist.sigmaMaxKPa)) return { fuerzaKN: Infinity, momentoKNm: Infinity };

  const inicioM = Math.max(desdeM, lM - dist.longitudContactoM, 0);
  const finM = Math.min(hastaM, lM);
  const tramoM = finM - inicioM;
  if (tramoM <= 0) return { fuerzaKN: 0, momentoKNm: 0 };

  const sigmaInicio = presionEn(dist, lM, inicioM);
  const sigmaFin = presionEn(dist, lM, finM);
  const fuerzaKN = ((sigmaInicio + sigmaFin) / 2) * anchoPerpM * tramoM;
  if (fuerzaKN === 0) return { fuerzaKN: 0, momentoKNm: 0 };
  const centroideM = inicioM + (tramoM * (sigmaInicio + 2 * sigmaFin)) / (3 * (sigmaInicio + sigmaFin));
  return { fuerzaKN, momentoKNm: fuerzaKN * Math.abs(centroideM - puntoM) };
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
  return cargaEnTramo(dist, lM, anchoPerpM, sM, lM, sM);
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
  direccionA: ResultadoDireccionZapata;
  direccionB: ResultadoDireccionZapata;
  punzonamiento: ResultadoPunzonamiento;
}

/** Anclaje de la parrilla en la sección x que peor verifica, art. 9.8.2.2. */
export interface ResultadoAnclajeZapata {
  /** Distancia desde el borde de la zapata a la sección que gobierna (m). */
  xM: number;
  /** Tracción a anclar en x, F_s = R·z_e/z_i, ec. (9.13) (kN). */
  fsKN: number;
  sigmaSdMPa: number;
  /** Longitud neta de anclaje necesaria, ec. (8.4) (mm). */
  lbdMm: number;
  /** Longitud disponible: x menos el recubrimiento del extremo (mm). */
  disponibleMm: number;
  verifica: boolean;
  /** Falso si el vuelo no llega a h/2: no hay tirante que anclar y no se comprueba. */
  comprobado: boolean;
}

/**
 * Una dirección de la parrilla según el Anejo 19: flexión por el modelo del
 * art. 9.8.2.2, cuantía mínima del art. 9.2.1.1, anclaje del art. 8.4 y
 * cortante del art. 6.2.2.
 */
export interface ResultadoDireccionZapata {
  /** Presiones de cálculo en los bordes, sin peso propio (kN/m²). */
  sigmaMaxKPa: number;
  sigmaMinKPa: number;
  /** Largo que apoya con las presiones de cálculo (m). Menor que la base si hay despegue. */
  longitudContactoM: number;
  /** Presión en la sección de cálculo (kN/m²). */
  sigmaCriticaKPa: number;
  /** Distancia del borde a la sección de cálculo, 0,15·c dentro de la cara del pilar (m). */
  lM: number;
  dM: number;
  /** Brazo interno z_i = 0,9·d (m). */
  ziM: number;
  /** Momento de las presiones respecto de la sección de cálculo (kN·m). */
  momentoKNm: number;
  /** Tracción máxima F_s,max = M/z_i (kN). */
  fsKN: number;
  asCalculadoCm2: number;
  /** Mínima de tracción, art. 9.2.1.1 (1), ec. (9.1). */
  asMinCm2: number;
  asNecCm2: number;
  asRealCm2: number;
  verificaAs: boolean;
  /** φ ≥ 12 mm, art. 9.8.2.1 (1). */
  verificaDiametroMinimo: boolean;
  anclaje: ResultadoAnclajeZapata;
  /** Cortante de cálculo a d de la cara del pilar, art. 6.2.2 (kN). 0 si la sección cae dentro del pilar. */
  vEdKN: number;
  vRdCKN: number;
  verificaCorte: boolean;
}

export interface ResultadoCorteUnidireccional {
  vEdKN: number;
  vRdCKN: number;
  verificaCorte: boolean;
}

/** Compara un cortante de cálculo ya integrado con la VRd,c de la sección (art. 6.2.2). */
export function corteDesdeCarga(
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

/** Lo que resulta de armar un vuelo: flexión, cuantía mínima y anclaje. */
export type ResultadoVueloZapata = Pick<
  ResultadoDireccionZapata,
  | "ziM"
  | "momentoKNm"
  | "fsKN"
  | "asCalculadoCm2"
  | "asMinCm2"
  | "asNecCm2"
  | "asRealCm2"
  | "verificaAs"
  | "verificaDiametroMinimo"
  | "anclaje"
>;

/**
 * Arma un vuelo de zapata según el Anejo 19.
 *
 * Flexión por el modelo de la fig. A19.9.13 (art. 9.8.2.2, págs. 153-154):
 * F_s = R·z_e/z_i, con z_e medido hasta una sección a e = 0,15·c dentro de la
 * cara del pilar y z_i = 0,9·d (simplificaciones del apartado (3)). En la
 * sección de cálculo R·z_e es el momento de las presiones, así que
 * F_s,max = M/z_i, y As = F_s/fyd sin el tope de 400 MPa que traía la EHE-08.
 *
 * El anclaje se comprueba barriendo x desde h/2 —el x_min del apartado (5)—
 * hasta la sección de cálculo: F_s(x) tiene que anclarse en la distancia x
 * desde el borde. Con α3 = α5 = 1, como en `anclaje.ts`.
 *
 * `cargaHasta(x)` devuelve las presiones entre el borde libre y la sección a x
 * de ese borde, con su momento tomado en la sección de cálculo (a `lM` del
 * borde). Así la misma función sirve con el pilar centrado o excéntrico.
 */
export function armarVueloZapata(
  materiales: MaterialesDerivados,
  /** Ancho que arma esta parrilla (m). */
  anchoM: number,
  H: number,
  d: number,
  recubrimiento: number,
  armadura: ArmadoDireccion,
  formaAnclaje: FormaAnclaje,
  /** Distancia del borde libre a la sección de cálculo (m). */
  lM: number,
  cargaHasta: (xM: number) => { fuerzaKN: number; momentoKNm: number }
): ResultadoVueloZapata {
  const { fck, fyk, fyd, fctm } = materiales;

  const ziM = 0.9 * d;
  const momentoKNm = lM > 0 ? cargaHasta(lM).momentoKNm : 0;
  const fsKN = momentoKNm / ziM;

  const asCalculadoCm2 = (fsKN / (fyd * 1000)) * 100 ** 2;
  const asMinCm2 = armaduraMinimaTraccionCm2(anchoM, H, resistenciaFlexotraccionMPa(fctm, H), fyd);
  const asNecCm2 = Math.max(asCalculadoCm2, asMinCm2);
  const asRealCm2 = (armadura.numero * Math.PI * (armadura.diametroMm / 10) ** 2) / 4;

  // cd para α2 (fig. A19.8.3): el menor entre el recubrimiento lateral y la
  // mitad de la luz libre entre barras.
  const separacionM =
    armadura.numero > 1 ? (anchoM - 2 * recubrimiento - armadura.diametroMm / 1000) / (armadura.numero - 1) : Infinity;
  const cdMm = Math.min(recubrimiento * 1000, (separacionM * 1000 - armadura.diametroMm) / 2);

  const anclajeEn = (xM: number): ResultadoAnclajeZapata => {
    const carga = cargaHasta(xM);
    const disponibleMm = (xM - recubrimiento) * 1000;
    if (!Number.isFinite(carga.momentoKNm)) {
      return { xM, fsKN: Infinity, sigmaSdMPa: fyd, lbdMm: Infinity, disponibleMm, verifica: false, comprobado: true };
    }
    const fsXKN = carga.momentoKNm / ziM;
    const sigmaSdMPa = Math.min((fsXKN * 10) / asRealCm2, fyd);
    const { lbdMm } = calcularAnclaje(
      { fckMPa: fck, fykMPa: fyk },
      { diametroMm: armadura.diametroMm, situacion: "buena", forma: formaAnclaje, esfuerzo: "traccion", recubrimientoMm: cdMm, sigmaSdMPa }
    );
    return { xM, fsKN: fsXKN, sigmaSdMPa, lbdMm, disponibleMm, verifica: lbdMm <= disponibleMm, comprobado: true };
  };

  // Con la sección de cálculo a menos de h/2 del borde —el x_min del art.
  // 9.8.2.2 (5)— la fisura inclinada no cae dentro del vuelo y no hay tirante
  // que anclar de ese lado (criterio decidido por el usuario). Pasa en el lado
  // del límite de una zapata de medianería.
  let anclaje: ResultadoAnclajeZapata = {
    xM: 0, fsKN: 0, sigmaSdMPa: 0, lbdMm: 0, disponibleMm: 0, verifica: true, comprobado: false,
  };
  if (lM > H / 2) {
    const xMinM = H / 2;
    const PASOS = 50;
    const exceso = (a: ResultadoAnclajeZapata) => a.lbdMm - a.disponibleMm;
    anclaje = anclajeEn(xMinM);
    for (let i = 1; i <= PASOS; i++) {
      const candidato = anclajeEn(xMinM + ((lM - xMinM) * i) / PASOS);
      if (exceso(candidato) > exceso(anclaje)) anclaje = candidato;
    }
  }

  return {
    ziM,
    momentoKNm,
    fsKN,
    asCalculadoCm2,
    asMinCm2,
    asNecCm2,
    asRealCm2,
    verificaAs: asRealCm2 >= asNecCm2,
    verificaDiametroMinimo: armadura.diametroMm >= 12,
    anclaje,
  };
}

/**
 * Una dirección de la parrilla de una zapata con el pilar centrado: presiones
 * de cálculo, el vuelo armado con {@link armarVueloZapata} y el cortante a d
 * de la cara del pilar (art. 6.2.2).
 */
export function calcularDireccionZapata(
  materiales: MaterialesDerivados,
  /** Dimensión de la zapata en esta dirección (m). */
  dim: number,
  /** Dimensión perpendicular, el ancho que arma esta parrilla (m). */
  dimPerpendicular: number,
  H: number,
  anchoPilar: number,
  d: number,
  recubrimiento: number,
  nk: number,
  mk: number,
  armadura: ArmadoDireccion,
  formaAnclaje: FormaAnclaje
): ResultadoDireccionZapata {
  // Presiones de cálculo sin el peso propio, repartidas como en el terreno.
  const dist = distribucionPresiones(GAMMA_F * nk, dim, dimPerpendicular, nk !== 0 ? mk / nk : 0);

  // El vuelo que se arma es el del borde más cargado; por simetría del pilar
  // centrado, el otro pide menos.
  const lM = (dim - anchoPilar) / 2 + 0.15 * anchoPilar;
  const seccionM = dim - lM;
  const vuelo = armarVueloZapata(materiales, dimPerpendicular, H, d, recubrimiento, armadura, formaAnclaje, lM, (xM) =>
    cargaEnTramo(dist, dim, dimPerpendicular, dim - xM, dim, seccionM)
  );

  const vueloCorteM = (dim - anchoPilar) / 2 - d;
  const corte =
    vueloCorteM > 0
      ? corteDesdeCarga(
          materiales,
          dimPerpendicular,
          d,
          cargaEntreSeccionYBorde(dist, dim, dimPerpendicular, dim - vueloCorteM).fuerzaKN,
          vuelo.asRealCm2
        )
      : { vEdKN: 0, vRdCKN: 0, verificaCorte: true };

  return {
    sigmaMaxKPa: dist.sigmaMaxKPa,
    sigmaMinKPa: dist.sigmaMinKPa,
    longitudContactoM: dist.longitudContactoM,
    sigmaCriticaKPa: presionEn(dist, dim, seccionM),
    lM,
    dM: d,
    ...vuelo,
    ...corte,
  };
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

  const forma = datos.formaAnclaje ?? "recta";
  const direccionA = calcularDireccionZapata(materiales, A, B, H, anchoPilarA, dA, recubrimiento, Nk, MkA, armadoA, forma);
  const direccionB = calcularDireccionZapata(materiales, B, A, H, anchoPilarB, dB, recubrimiento, Nk, MkB, armadoB, forma);

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
