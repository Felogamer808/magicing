import type { FormaAnclaje } from "@/lib/calc/hormigon/comun/anclaje";
import { GAMMA_F } from "@/lib/calc/hormigon/comun/coeficientes";
import type {
  ArmaduraElegida,
  MaterialesDerivados,
  ResultadoCortante,
  ResultadoFlexion,
} from "@/lib/calc/hormigon/comun/types";
import { calcularCantoUtil, calcularCortante, calcularFlexion } from "@/lib/calc/hormigon/vigas/flexion-cortante";
import {
  calcularDireccionZapata,
  type ResultadoDireccionZapata,
} from "@/lib/calc/hormigon/cimentaciones/zapata-aislada";

/**
 * Zapata de medianería con viga centradora.
 *
 * Con el pilar contra el límite, agrandar la zapata no baja la tensión: la
 * resultante sigue a c/2 del borde y la cuña de contacto mide 1,5·c sea cual
 * sea el largo. La salida es una viga que une esta zapata con la interior y
 * hace de palanca: toma el momento N·e y la zapata queda con presión centrada.
 * El Anejo 19 la prevé en el art. 9.8.3 (1), pág. 154: las vigas de atado
 * "pueden utilizarse para suprimir la excentricidad de la carga".
 *
 * Palanca, con x desde el eje del pilar medianero hacia el interior:
 *
 *      N₁ (+M₁)       q = peso propio de la viga
 *      ↓ ═══════════════════════════════════╗ viga
 *      x=0      ▲ R₁ (x = e)                ▼ ΔN (x = L)
 *               zapata de medianería         zapata interior
 *
 *   R₁ = (N₁·L + M₁ + q·L²/2) / (L − e)        — momentos respecto de la interior
 *   ΔN = R₁ − N₁ − q·L                         — lo que la viga tira de la interior
 *
 * Criterios decididos por el usuario:
 * - La viga une las dos zapatas y no apoya en el terreno.
 * - ΔN no se descuenta de la zapata interior: se calcula aparte, con su carga
 *   completa, en "Zapata aislada".
 * - El peso propio de la viga entra en toda la luz.
 * - M₁ entra con su signo: positivo si empuja hacia la medianera.
 * - En la dirección de la viga la zapata casi no flecta: se le pide el 20 % de
 *   la armadura principal, como a una losa unidireccional (art. 9.3.1.1 (2),
 *   pág. 145).
 *
 * Cargas características, como el resto de las zapatas: el terreno las usa
 * tal cual y el armado mayora con γF.
 */

export interface GeometriaVigaCentradora {
  /** Zapata de medianería: lado perpendicular a la medianera, en la dirección de la viga (m) */
  A: number;
  /** Zapata de medianería: lado paralelo a la medianera (m) */
  B: number;
  /** Canto de la zapata (m) */
  H: number;
  recubrimiento: number;
  /** Separación entre el límite y la cara del pilar (m). 0 = al ras. */
  distanciaColumnaLimite: number;
  /** Pilar medianero: lado en la dirección de la viga (m) */
  anchoPilarA: number;
  /** Pilar medianero: lado paralelo a la medianera (m) */
  anchoPilarB: number;
  /** L: del eje del pilar medianero al eje de la zapata interior (m) */
  luzM: number;
  /** Viga centradora: ancho y canto (m) */
  bViga: number;
  hViga: number;
}

export interface DatosVigaCentradora {
  /** N₁: axil característico del pilar medianero (kN) */
  Nk: number;
  /** M₁: momento característico en la dirección de la viga, positivo hacia la medianera (kN·m) */
  MkA: number;
  /** Momento característico paralelo a la medianera (kN·m) */
  MkB: number;
  /** Parrilla de la zapata: barras paralelas a B, las que toman los vuelos a los lados de la viga */
  armadoB: ArmaduraElegida;
  /** Parrilla de la zapata: barras paralelas a A, de reparto */
  armadoA: ArmaduraElegida;
  formaAnclaje?: FormaAnclaje;
  /**
   * Viga: armadura superior, la traccionada. La inferior no entra: el momento
   * es negativo en todo el tramo y esa cara está comprimida.
   */
  vigaSuperior: ArmaduraElegida;
  diametroEstriboMm: number;
  numeroRamas: number;
}

export interface ResultadoVigaCentradora {
  /** e: del eje del pilar al centro de la zapata (m) */
  excentricidadM: number;
  /** q: peso propio de la viga (kN/m) */
  pesoVigaKNPorM: number;
  /** R₁ característica sobre la zapata de medianería (kN) */
  reaccionZapataKN: number;
  /** ΔN característica que la viga tira de la zapata interior (kN). No se descuenta de ella. */
  descargaInteriorKN: number;
  /** L > e: si no, la palanca no existe */
  geometriaValida: boolean;

  pesoPropioZapataKN: number;
  /** Tensión del terreno, centrada en A por la viga y con área eficaz en B (kN/m²) */
  sigmaKPa: number;
  verificaTension: boolean;

  /** Vuelos de la zapata a los dos lados de la viga, como una zapata corrida bajo la viga */
  zapataDireccionB: ResultadoDireccionZapata;
  /** Reparto en la dirección de la viga: 20 % de la principal, por metro */
  asRepartoNecCm2PorM: number;
  asRepartoRealCm2PorM: number;
  verificaReparto: boolean;

  /** Viga: momento y cortante de cálculo (γF ya aplicado) */
  momentoVigaKNm: number;
  cortanteVigaKN: number;
  vigaFlexion: ResultadoFlexion;
  vigaCortante: ResultadoCortante;
}

export function calcularVigaCentradora(
  materiales: MaterialesDerivados,
  geometria: GeometriaVigaCentradora,
  sigmaAdmisibleKPa: number,
  datos: DatosVigaCentradora
): ResultadoVigaCentradora {
  const { A, B, H, recubrimiento, distanciaColumnaLimite, anchoPilarA, luzM, bViga, hViga } = geometria;
  const { Nk, MkA, MkB } = datos;

  // ------------------------------------------------------------ palanca
  const xColumnaM = distanciaColumnaLimite + anchoPilarA / 2;
  const excentricidadM = A / 2 - xColumnaM;
  const pesoVigaKNPorM = 25 * bViga * hViga;
  const brazoM = luzM - excentricidadM;
  const geometriaValida = brazoM > 0;

  const reaccionZapataKN = geometriaValida
    ? (Nk * luzM + MkA + (pesoVigaKNPorM * luzM ** 2) / 2) / brazoM
    : Infinity;
  const descargaInteriorKN = reaccionZapataKN - Nk - pesoVigaKNPorM * luzM;

  // ------------------------------------------------------------ terreno
  // La viga absorbe la excentricidad en A: la zapata recibe R₁ en su centro.
  // En B queda el momento paralelo a la medianera, por área eficaz.
  const pesoPropioZapataKN = 25 * A * B * H;
  const cargaTotalKN = reaccionZapataKN + pesoPropioZapataKN;
  const excentricidadBM = Number.isFinite(cargaTotalKN) && cargaTotalKN > 0 ? MkB / cargaTotalKN : 0;
  const anchoEficazBM = B - 2 * Math.abs(excentricidadBM);
  const sigmaKPa = anchoEficazBM > 0 ? cargaTotalKN / (A * anchoEficazBM) : Infinity;

  // ------------------------------------------------------------ zapata
  // Dirección B: la zapata vuela a los dos lados de la viga, que hace de
  // "pilar" de ancho bViga (art. 9.8.2.2, el mismo modelo que la aislada).
  const forma = datos.formaAnclaje ?? "recta";
  const dB = H - recubrimiento - datos.armadoB.diametroMm / 2000;
  const zapataDireccionB = calcularDireccionZapata(
    materiales, B, A, H, bViga, dB, recubrimiento,
    Number.isFinite(reaccionZapataKN) ? reaccionZapataKN : Infinity, MkB, datos.armadoB, forma
  );

  // Dirección A: reparto, 20 % de la principal por metro (art. 9.3.1.1 (2)).
  const areaCm2 = (a: ArmaduraElegida) => (a.numero * Math.PI * (a.diametroMm / 10) ** 2) / 4;
  const asPrincipalCm2PorM = areaCm2(datos.armadoB) / A;
  const asRepartoNecCm2PorM = 0.2 * asPrincipalCm2PorM;
  const asRepartoRealCm2PorM = areaCm2(datos.armadoA) / B;

  // ------------------------------------------------------------ viga
  // El momento máximo está en el centro de la zapata de medianería (x = e) y
  // tracciona arriba. El cortante es máximo justo después, en el tramo.
  const momentoCaracteristicoKNm = Nk * excentricidadM + MkA + (pesoVigaKNPorM * excentricidadM ** 2) / 2;
  const cortanteCaracteristicoKN = reaccionZapataKN - Nk - pesoVigaKNPorM * excentricidadM;
  const momentoVigaKNm = GAMMA_F * Math.max(momentoCaracteristicoKNm, 0);
  const cortanteVigaKN = GAMMA_F * Math.abs(cortanteCaracteristicoKN);

  const geometriaViga = {
    b: bViga,
    h: hViga,
    recubrimiento,
    diametroEstriboMm: datos.diametroEstriboMm,
  };
  const dSuperior = calcularCantoUtil(geometriaViga, [datos.vigaSuperior]);
  const vigaFlexion = calcularFlexion(materiales, geometriaViga, dSuperior, {
    momento: momentoVigaKNm,
    armaduraReal: [datos.vigaSuperior],
  });
  const vigaCortante = calcularCortante(materiales, geometriaViga, dSuperior, vigaFlexion.asRealCm2, {
    vd: cortanteVigaKN,
    diametroEstriboMm: datos.diametroEstriboMm,
    numeroRamas: datos.numeroRamas,
  });

  return {
    excentricidadM,
    pesoVigaKNPorM,
    reaccionZapataKN,
    descargaInteriorKN,
    geometriaValida,
    pesoPropioZapataKN,
    sigmaKPa,
    verificaTension: geometriaValida && sigmaKPa <= sigmaAdmisibleKPa,
    zapataDireccionB,
    asRepartoNecCm2PorM,
    asRepartoRealCm2PorM,
    verificaReparto: asRepartoRealCm2PorM >= asRepartoNecCm2PorM,
    momentoVigaKNm,
    cortanteVigaKN,
    vigaFlexion,
    vigaCortante,
  };
}
