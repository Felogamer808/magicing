import type { MaterialesDerivados } from "@/lib/calc/hormigon/comun/types";
import { armaduraMinimaTraccionCm2, resistenciaFlexotraccionMPa } from "@/lib/calc/hormigon/comun/cuantias";
import {
  calcularAnclaje,
  type FormaAnclaje,
  type ResultadoAnclaje,
  type SituacionAdherencia,
} from "@/lib/calc/hormigon/comun/anclaje";

export interface GeometriaLosa {
  /** Espesor de la losa (m) */
  e: number;
  /** Recubrimiento geométrico de la armadura positiva (m) */
  recubrimientoPositivo: number;
  /** Recubrimiento geométrico de la armadura negativa (m) */
  recubrimientoNegativo: number;
}

export interface ArmadoLosa {
  diametroMm: number;
  /** Separación adoptada entre barras (m) */
  separacionM: number;
}

export interface ResultadoDireccionLosa {
  /** Canto útil de esta dirección (m) */
  dM: number;
  mu: number;
  omega: number;
  asCalculadoCm2PorM: number;
  /** As,min por metro, Anejo 19 art. 9.3.1.1 (1) → 9.2.1.1 (1), ec. (9.1) (cm²/m) */
  asMinCm2PorM: number;
  asNecCm2PorM: number;
  /** Separación que haría falta para cubrir As,nec con el diámetro elegido (m) */
  separacionNecM: number;
  /** Separación máxima admitida: mín(s nec, 3e, 30 cm), redondeada a múltiplos de 2 cm */
  separacionMaxM: number;
  asRealCm2PorM: number;
  aprovechamiento: number;
  verificaAs: boolean;
  /** Adherencia de la barra según su posición al hormigonar (fig. A19.8.2) */
  situacionAdherencia: SituacionAdherencia;
  /** cd = mín(a/2, c), fig. A19.8.3 (mm) */
  cdMm: number;
  /** Anclaje según el Anejo 19, art. 8.4, con σsd = fyd·As,nec/As,real */
  anclaje: ResultadoAnclaje;
}

export interface ResultadoLosa {
  /** fctm,fl con el espesor de la losa, ec. (3.23) (MPa) */
  fctmFlMPa: number;
  /** As,min por metro de ancho, igual en las dos direcciones (cm²/m) */
  asMinCm2PorM: number;
  positivo: { x: ResultadoDireccionLosa; y: ResultadoDireccionLosa };
  negativo: { x: ResultadoDireccionLosa; y: ResultadoDireccionLosa };
}

const areaBarraCm2 = (diametroMm: number) => (Math.PI * (diametroMm / 10) ** 2) / 4;

/** Redondeo de la planilla para la separación máxima: hacia abajo a múltiplos de 2 cm. */
function redondearSeparacionMaxM(valor: number): number {
  return Math.floor(valor / 2 / 0.01 + 1e-9) * 0.01 * 2;
}

interface ContextoAnclaje {
  cara: "inferior" | "superior";
  /** Distancia de la cara de la losa al borde de la barra (m): c de la fig. A19.8.3 */
  cM: number;
  forma: FormaAnclaje;
}

/**
 * Adherencia según la fig. A19.8.2: con espesor ≤ 250 mm todas las barras
 * están en condiciones buenas; por encima, las de la cara superior quedan en
 * la zona de adherencia mala y las de la inferior siguen buenas.
 */
function situacionAdherencia(cara: "inferior" | "superior", e: number): SituacionAdherencia {
  return cara === "inferior" || e <= 0.25 ? "buena" : "mala";
}

function armarDireccion(
  materiales: MaterialesDerivados,
  e: number,
  d: number,
  momentoKNmPorM: number,
  armado: ArmadoLosa,
  contexto: ContextoAnclaje,
  /** Armadura de la malla general que también colabora en esta dirección (cm²/m) */
  asMallaAdicionalCm2PorM = 0
): ResultadoDireccionLosa {
  const { fck, fcd, fyd, fyk, fctm } = materiales;

  // Anejo 19, art. 9.3.1.1 (1), pág. 146: en losas se aplica el mínimo de
  // vigas, ec. (9.1), por metro de ancho. La planilla usaba 0,04·e·fcd/fyd
  // y 1,8 ‰·e, que son de la EHE‑08 (art. 42.3).
  const asMinCm2PorM = armaduraMinimaTraccionCm2(1, e, resistenciaFlexotraccionMPa(fctm, e), fyd);

  const mu = momentoKNmPorM / (d ** 2 * fcd * 1000);
  const omega = 1 - Math.sqrt(1 - 2 * mu);
  const asCalculadoCm2PorM = ((omega * d * fcd) / fyd) * 100 ** 2;
  const asNecCm2PorM = Math.max(asCalculadoCm2PorM, asMinCm2PorM);

  const area = areaBarraCm2(armado.diametroMm);
  const separacionNecM = area / asNecCm2PorM;
  const separacionMaxM = redondearSeparacionMaxM(
    separacionNecM <= 0.1 ? 0.1 : Math.min(separacionNecM, 3 * e, 0.3)
  );

  const asRealCm2PorM = area / armado.separacionM + asMallaAdicionalCm2PorM;
  const verificaAs = asRealCm2PorM >= asNecCm2PorM;

  // Anclaje, Anejo 19 art. 8.4. La planilla usaba la EHE-08 (art. 69):
  // lb = máx(m·Ø², fyk·Ø/14) en posición II y un 0,7 fijo de patilla.
  // σsd con As,nec/As,real: la barra ancla la fuerza que necesita, no su
  // capacidad plena (art. 8.4.3 (2)). cd = mín(a/2, c) con a la separación
  // libre entre barras (fig. A19.8.3).
  const sigmaSdMPa = fyd * Math.min(asNecCm2PorM / asRealCm2PorM, 1);
  const separacionLibreMm = armado.separacionM * 1000 - armado.diametroMm;
  const cdMm = Math.min(separacionLibreMm / 2, contexto.cM * 1000);
  const situacion = situacionAdherencia(contexto.cara, e);
  const anclaje = calcularAnclaje(
    { fckMPa: fck, fykMPa: fyk },
    {
      diametroMm: armado.diametroMm,
      situacion,
      forma: contexto.forma,
      esfuerzo: "traccion",
      recubrimientoMm: cdMm,
      sigmaSdMPa,
    }
  );

  return {
    dM: d,
    mu,
    omega,
    asCalculadoCm2PorM,
    asMinCm2PorM,
    asNecCm2PorM,
    separacionNecM,
    separacionMaxM,
    asRealCm2PorM,
    aprovechamiento: asNecCm2PorM / asRealCm2PorM,
    verificaAs,
    situacionAdherencia: situacion,
    cdMm,
    anclaje,
  };
}

export interface DatosLosa {
  /** Momentos positivos de cálculo en cada dirección (kN·m/m) */
  momentoPositivoX: number;
  momentoPositivoY: number;
  /** Momentos negativos de cálculo en cada dirección (kN·m/m) */
  momentoNegativoX: number;
  momentoNegativoY: number;
  armadoPositivoX: ArmadoLosa;
  armadoPositivoY: ArmadoLosa;
  armadoNegativoX: ArmadoLosa;
  armadoNegativoY: ArmadoLosa;
  /**
   * Si la armadura en X se cuenta como malla general (la de Y) más un refuerzo
   * adicional en X, tal como lo hace la planilla en el armado positivo.
   */
  xIncluyeMallaEnY?: boolean;
  /** Forma del anclaje de las barras. Por defecto, recta. */
  formaAnclaje?: FormaAnclaje;
}

/**
 * Losa armada en dos direcciones. Las barras de una dirección se apoyan sobre
 * las de la otra, así que el canto útil no es el mismo en X que en Y: la
 * dirección Y queda en la capa exterior (más cerca de la cara traccionada) y la
 * X por dentro, apoyada sobre ella.
 */
export function calcularLosa(
  materiales: MaterialesDerivados,
  geometria: GeometriaLosa,
  datos: DatosLosa
): ResultadoLosa {
  const { e, recubrimientoPositivo, recubrimientoNegativo } = geometria;
  const { fyd, fctm } = materiales;
  const fctmFlMPa = resistenciaFlexotraccionMPa(fctm, e);
  const xIncluyeMallaEnY = datos.xIncluyeMallaEnY ?? true;

  const dPosY = e - recubrimientoPositivo - datos.armadoPositivoY.diametroMm / 2000;
  const dPosX =
    e -
    recubrimientoPositivo -
    datos.armadoPositivoY.diametroMm / 1000 -
    datos.armadoPositivoX.diametroMm / 2000;

  const dNegY = e - recubrimientoNegativo - datos.armadoNegativoY.diametroMm / 2000;
  const dNegX =
    e -
    recubrimientoNegativo -
    datos.armadoNegativoY.diametroMm / 1000 -
    datos.armadoNegativoX.diametroMm / 2000;

  // Y va en la capa exterior y X por dentro, apoyada sobre ella: la c de X
  // suma el diámetro de Y.
  const forma = datos.formaAnclaje ?? "recta";
  const ctx = (cara: "inferior" | "superior", cM: number): ContextoAnclaje => ({ cara, cM, forma });

  const posY = armarDireccion(materiales, e, dPosY, datos.momentoPositivoY, datos.armadoPositivoY,
    ctx("inferior", recubrimientoPositivo));
  const posX = armarDireccion(
    materiales,
    e,
    dPosX,
    datos.momentoPositivoX,
    datos.armadoPositivoX,
    ctx("inferior", recubrimientoPositivo + datos.armadoPositivoY.diametroMm / 1000),
    xIncluyeMallaEnY ? posY.asRealCm2PorM : 0
  );

  const negY = armarDireccion(materiales, e, dNegY, datos.momentoNegativoY, datos.armadoNegativoY,
    ctx("superior", recubrimientoNegativo));
  const negX = armarDireccion(materiales, e, dNegX, datos.momentoNegativoX, datos.armadoNegativoX,
    ctx("superior", recubrimientoNegativo + datos.armadoNegativoY.diametroMm / 1000));

  return {
    fctmFlMPa,
    asMinCm2PorM: armaduraMinimaTraccionCm2(1, e, fctmFlMPa, fyd),
    positivo: { x: posX, y: posY },
    negativo: { x: negX, y: negY },
  };
}

/**
 * Momento que resiste una losa con un armado dado (φ a una separación s).
 * Sirve para responder rápido "¿cuánto aguanta esta malla?" sin partir de un
 * momento de cálculo.
 */
export function calcularMomentoResistenteLosa(
  materiales: MaterialesDerivados,
  e: number,
  recubrimiento: number,
  armado: ArmadoLosa
): { dM: number; asRealCm2PorM: number; momentoKNmPorM: number } {
  const { fcd, fyd } = materiales;
  const asRealCm2PorM = areaBarraCm2(armado.diametroMm) / armado.separacionM;
  const dM = e - recubrimiento - armado.diametroMm / 2000;
  const omega = ((asRealCm2PorM / 100 ** 2) * fyd) / (dM * fcd);
  const momentoKNmPorM = omega * (1 - omega / 2) * dM ** 2 * fcd * 1000;
  return { dM, asRealCm2PorM, momentoKNmPorM };
}
