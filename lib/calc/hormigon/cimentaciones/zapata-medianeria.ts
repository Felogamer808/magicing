import type { FormaAnclaje } from "@/lib/calc/hormigon/comun/anclaje";
import { GAMMA_F } from "@/lib/calc/hormigon/comun/coeficientes";
import type { MaterialesDerivados } from "@/lib/calc/hormigon/comun/types";
import {
  armarVueloZapata,
  calcularDireccionZapata,
  cargaEnTramo,
  corteDesdeCarga,
  distribucionPresiones,
  presionEn,
  type ArmadoDireccion,
  type CargasZapata,
  type DistribucionPresiones,
  type ResultadoDireccionZapata,
} from "@/lib/calc/hormigon/cimentaciones/zapata-aislada";

export type { ArmadoDireccion, CargasZapata };

export interface GeometriaZapataMedianeria {
  /** Dimensión total de la zapata en la dirección restringida por el límite (m) */
  A: number;
  /** Dimensión perpendicular, libre (m) */
  B: number;
  H: number;
  anchoPilarA: number;
  anchoPilarB: number;
  recubrimiento: number;
  /** Separación entre el límite de propiedad y la cara del pilar más cercana (m). 0 = pilar al ras del límite. */
  distanciaColumnaLimite: number;
}

export interface DatosZapataMedianeria {
  cargas: CargasZapata;
  armadoA: ArmadoDireccion;
  armadoB: ArmadoDireccion;
  /** Extremo de las barras de la parrilla. Recta si falta. */
  formaAnclaje?: FormaAnclaje;
}

export interface ResultadoGeotecnicoMedianeria {
  pesoPropioKN: number;
  /** Presión por área eficaz en las dos direcciones (kN/m²). Infinita si la resultante sale de la base. */
  sigmaKPa: number;
  verificaTension: boolean;
}

export interface ResultadoZapataMedianeria {
  /**
   * Excentricidad de la resultante que llega al terreno respecto del centro de
   * la zapata en la dirección A, peso propio incluido (m). Negativa hacia el límite.
   */
  excentricidadM: number;
  /** e ≤ A/6: la zapata apoya entera, sin despegue. */
  dentroDelNucleo: boolean;
  vueloMaxM: number;
  geotecnico: ResultadoGeotecnicoMedianeria;
  /** Presiones de cálculo en la dirección A, sin peso propio, para dibujar. */
  distribucionCalculoA: DistribucionPresiones;
  /** Armado del lado que da al límite de propiedad (vuelo corto). */
  ladoLimite: ResultadoDireccionZapata;
  /** Armado del lado interior (vuelo largo). */
  ladoInterior: ResultadoDireccionZapata;
  /** Armado en la dirección perpendicular, con el pilar centrado como en una zapata aislada. */
  direccionB: ResultadoDireccionZapata;
}

/**
 * Zapata de medianería con el Anejo 19: la misma formulación que la zapata
 * aislada (art. 9.8.2.2 para la flexión y el anclaje, art. 6.2.2 para el
 * cortante), con el pilar descentrado en la dirección A.
 *
 * En A la presión no es simétrica, así que cada vuelo se arma por separado con
 * su propio momento. Las presiones se integran sobre la parte que apoya: si la
 * resultante sale del núcleo, el borde interior se despega y no aporta.
 */
export function calcularZapataMedianeria(
  materiales: MaterialesDerivados,
  geometria: GeometriaZapataMedianeria,
  sigmaAdmisibleKPa: number,
  datos: DatosZapataMedianeria
): ResultadoZapataMedianeria {
  const { A, B, H, anchoPilarA, anchoPilarB, recubrimiento, distanciaColumnaLimite } = geometria;
  const { cargas, armadoA, armadoB } = datos;
  const { Nk, MkA, MkB } = cargas;
  const forma = datos.formaAnclaje ?? "recta";

  // x se mide desde el borde del límite.
  const xColumnaM = distanciaColumnaLimite + anchoPilarA / 2;
  const e0M = xColumnaM - A / 2;
  // Momento respecto del centro de la zapata: el del pilar descentrado más el aplicado.
  const momentoAKNm = Nk * e0M + MkA;

  // Terreno: la resultante incluye el peso propio, que cae en el centro.
  const pesoPropioKN = 25 * A * B * H;
  const cargaTotalKN = Nk + pesoPropioKN;
  const excentricidadM = cargaTotalKN !== 0 ? momentoAKNm / cargaTotalKN : 0;
  const excentricidadBM = cargaTotalKN !== 0 ? MkB / cargaTotalKN : 0;
  const dentroDelNucleo = Math.abs(excentricidadM) <= A / 6;
  const anchoEficazAM = A - 2 * Math.abs(excentricidadM);
  const anchoEficazBM = B - 2 * Math.abs(excentricidadBM);
  const sigmaKPa =
    anchoEficazAM > 0 && anchoEficazBM > 0 ? cargaTotalKN / (anchoEficazAM * anchoEficazBM) : Infinity;
  const verificaTension = sigmaKPa <= sigmaAdmisibleKPa && dentroDelNucleo;

  const dA = H - recubrimiento - armadoA.diametroMm / 2000;
  const dB = H - recubrimiento - armadoB.diametroMm / 2000 - armadoA.diametroMm / 1000;

  // Presiones de cálculo en A, sin el peso propio. `distribucionPresiones` deja
  // el máximo en el borde L; con la excentricidad hacia el límite (lo habitual)
  // ese borde es x = 0, así que las coordenadas se espejan.
  const excentricidadCalculoM = Nk !== 0 ? momentoAKNm / Nk : 0;
  const dist = distribucionPresiones(GAMMA_F * Nk, A, B, excentricidadCalculoM);
  const haciaInterior = excentricidadCalculoM >= 0;
  const aS = (xM: number) => (haciaInterior ? xM : A - xM);
  const cargaEntre = (x1M: number, x2M: number, puntoM: number) => {
    const [s1, s2] = [aS(x1M), aS(x2M)].sort((a, b) => a - b);
    return cargaEnTramo(dist, A, B, s1, s2, aS(puntoM));
  };

  const armarLado = (
    /** Borde libre de este vuelo: 0 (límite) o A (interior). */
    bordeXM: number,
    lM: number,
    seccionXM: number,
    cargaHasta: (xM: number) => { fuerzaKN: number; momentoKNm: number },
    vueloCorteM: number,
    tramoCorte: () => number
  ): ResultadoDireccionZapata => {
    const vuelo = armarVueloZapata(materiales, B, H, dA, recubrimiento, armadoA, forma, lM, cargaHasta);
    const corte =
      vueloCorteM > 0
        ? corteDesdeCarga(materiales, B, dA, tramoCorte(), vuelo.asRealCm2)
        : { vEdKN: 0, vRdCKN: 0, verificaCorte: true };
    return {
      sigmaMaxKPa: presionEn(dist, A, aS(bordeXM)),
      sigmaMinKPa: presionEn(dist, A, aS(A - bordeXM)),
      longitudContactoM: dist.longitudContactoM,
      sigmaCriticaKPa: presionEn(dist, A, aS(seccionXM)),
      lM,
      dM: dA,
      ...vuelo,
      ...corte,
    };
  };

  // Lado del límite: borde en x = 0, sección de cálculo a 0,15·c dentro del pilar.
  const lLimiteM = distanciaColumnaLimite + 0.15 * anchoPilarA;
  const vueloCorteLimiteM = distanciaColumnaLimite - dA;
  const ladoLimite = armarLado(
    0,
    lLimiteM,
    lLimiteM,
    (xM) => cargaEntre(0, xM, lLimiteM),
    vueloCorteLimiteM,
    () => cargaEntre(0, vueloCorteLimiteM, 0).fuerzaKN
  );

  // Lado interior: borde en x = A.
  const vueloInteriorCaraM = A - xColumnaM - anchoPilarA / 2;
  const lInteriorM = vueloInteriorCaraM + 0.15 * anchoPilarA;
  const vueloCorteInteriorM = vueloInteriorCaraM - dA;
  const ladoInterior = armarLado(
    A,
    lInteriorM,
    A - lInteriorM,
    (xM) => cargaEntre(A - xM, A, A - lInteriorM),
    vueloCorteInteriorM,
    () => cargaEntre(A - vueloCorteInteriorM, A, A).fuerzaKN
  );

  // Dirección B: el pilar sí está centrado en este eje, como en una zapata aislada.
  const direccionB = calcularDireccionZapata(materiales, B, A, H, anchoPilarB, dB, recubrimiento, Nk, MkB, armadoB, forma);

  return {
    excentricidadM,
    dentroDelNucleo,
    vueloMaxM: Math.max(distanciaColumnaLimite, vueloInteriorCaraM, (B - anchoPilarB) / 2),
    geotecnico: { pesoPropioKN, sigmaKPa, verificaTension },
    distribucionCalculoA: dist,
    ladoLimite,
    ladoInterior,
    direccionB,
  };
}
