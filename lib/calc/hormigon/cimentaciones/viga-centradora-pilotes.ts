import { GAMMA_G } from "@/lib/calc/hormigon/comun/coeficientes";
import type {
  ArmaduraElegida,
  MaterialesDerivados,
  ResultadoCortante,
  ResultadoFlexion,
} from "@/lib/calc/hormigon/comun/types";
import { calcularCantoUtil, calcularCortante, calcularFlexion, TOPE_SEPARACION_OFICINA_M } from "@/lib/calc/hormigon/vigas/flexion-cortante";

/**
 * Viga centradora sobre pilotes.
 *
 * El pilar de medianería no cae sobre su pilote: queda a una distancia e, del
 * lado del límite. La viga sigue hasta un apoyo interior (un cabezal o el
 * pilote de otro nodo) y hace de palanca. El pilote del nodo recibe más que el
 * pilar y el apoyo lejano se alivia. El Anejo 19 la prevé en el art. 9.8.3 (1),
 * pág. 154: las vigas de atado "pueden utilizarse para suprimir la
 * excentricidad de la carga" y se dimensionan para los momentos y cortantes
 * que resulten. El modelo lo da Jiménez Montoya, § 25.5.2, como criterio; el
 * número sale del Anejo 19.
 *
 * Palanca, con x desde el eje del pilar hacia el interior:
 *
 *      N₁d  (+M_acc)        q = γG·25·b·h en toda la luz
 *      ↓ ═══════════════════════════════════╗ viga
 *      x=0    ▲ R₁ (x = e)                  ▼ ΔN (x = l)
 *             pilote del nodo medianero     apoyo lejano
 *
 *   R₁ = (N₁d·l + q·l²/2 + M_acc) / (l − e)    momentos respecto del apoyo lejano
 *   ΔN = R₁ − N₁d − q·l                          lo que la viga tira del apoyo lejano
 *   M  = N₁d·e + M_acc + q·e²/2                  en el pilote, tracciona arriba
 *   V  = R₁ − N₁d − q·e                          en el tramo, junto al pilote
 *
 * Criterios decididos por el usuario (2026-10-19):
 * - Palanca rígida de JM § 25.5.2. La viga no apoya en el terreno.
 * - ΔN no se descuenta del apoyo lejano: se informa y nada más.
 * - M_acc = N₁d·e_acc, con e_acc = 0,10 m por defecto (JM § 25.10.3; el
 *   Anejo 19 no fija excentricidad accidental de pilotes). Se suma entero en
 *   la sección del pilote.
 * - N₁d es el Nd del pilar, ya mayorado; el peso propio de la viga entra con
 *   γG = 1,35 en toda la luz.
 * - l va del pilar al centro del apoyo lejano: e se carga a mano y el resto,
 *   la distancia entre apoyos, sale del plano.
 * - Sin axil de atado: lo dan las riostras.
 * - El cortante del voladizo pilar–pilote se reduce con β = a_v/2d
 *   (art. 6.2.2 (6), pág. 77, y 6.2.3 (8), pág. 80); el del tramo, sin
 *   reducción. Las barras superiores siguen de largo sobre el pilote, así que
 *   están ancladas en el apoyo, que es la condición de los dos artículos.
 *
 * El momento es negativo (tracciona arriba) en el voladizo y en el tramo
 * siempre que ΔN > 0. Si el peso propio pesa más que la palanca, el tramo
 * puede flectar hacia abajo: se calcula ese momento y, si existe, lo toma la
 * armadura inferior.
 */

/** Peso específico del hormigón armado de la viga, kN/m³ (criterio del usuario). */
export const PESO_ESPECIFICO_VIGA_KNM3 = 25;

/** Diámetro mínimo de la armadura de flexión, art. 9.8.3 (1), pág. 154 (mm). */
export const DIAMETRO_MINIMO_CENTRADORA_MM = 12;

export interface DatosVigaCentradoraPilotes {
  /** Ancho y canto de la viga (m) */
  b: number;
  h: number;
  /** Recubrimiento hasta el estribo (m) */
  recubrimiento: number;
  /** e: del eje del pilar al apoyo del nodo medianero (m) */
  excentricidadM: number;
  /** l − e: del apoyo del nodo medianero al centro del apoyo lejano (m) */
  luzApoyosM: number;
  /** Lado del pilar en la dirección de la viga (m): para a_v */
  ladoPilarM: number;
  /** Diámetro del pilote del nodo medianero (m): para a_v */
  diametroPiloteM: number;
  /** N₁d: axil de cálculo del pilar medianero, ya mayorado (kN) */
  n1dKN: number;
  /** e_acc: excentricidad accidental del pilote (m) */
  excentricidadAccidentalM: number;
  /** Armadura superior, la traccionada por la palanca */
  superior: ArmaduraElegida;
  /** Armadura inferior: sólo trabaja si el tramo flecta hacia abajo */
  inferior: ArmaduraElegida;
  diametroEstriboMm: number;
  numeroRamas: number;
}

export interface CortanteVoladizo {
  /** a_v: luz libre entre la cara del pilar y la del pilote (m), sin el tope de 0,5d */
  avM: number;
  /** β = a_v/2d con a_v ≥ 0,5d; 1 si a_v ≥ 2d (no hay reducción) */
  beta: number;
  /** VEd sin reducir: N₁d + q·e (kN) */
  vEdKN: number;
  /** VEd con β aplicado a N₁d (kN) */
  vEdReducidoKN: number;
  /** Ec. (6.5): 0,5·b·d·ν·fcd, con ν de la ec. (6.6) (kN) */
  vLimite65KN: number;
  verifica65: boolean;
  /** VRd,max (ec. 6.9) contra VEd sin reducir */
  vRdMaxKN: number;
  verificaVRdMax: boolean;
  /** VRd,c (ec. 6.2.a/b) contra VEd reducido */
  vRdCKN: number;
  requiereEstribos: boolean;
  /** A/s necesaria: la de la ec. (6.19) en 0,75·a_v, o la mínima (cm²/m) */
  a90NecCm2PorM: number;
  /** Separación de los estribos en el voladizo (m) */
  separacionM: number;
  /** a_v ≥ 2d: el voladizo se verifica como una viga más, sin β */
  sinReduccion: boolean;
}

export interface ResultadoVigaCentradoraPilotes {
  /** l: del pilar al apoyo lejano (m) */
  luzM: number;
  /** q: peso propio de la viga mayorado (kN/m) */
  pesoVigaKNPorM: number;
  /** M_acc = N₁d·e_acc (kN·m) */
  momentoAccidentalKNm: number;
  /** N₁d·e (kN·m) */
  momentoExcentricidadKNm: number;
  /** R₁: reacción de cálculo sobre el apoyo del nodo medianero (kN) */
  reaccionPiloteKN: number;
  /** ΔN: alivio del apoyo lejano (kN). Positivo = lo levanta. No se descuenta. */
  alivioLejanoKN: number;
  /** l > e: si no, la palanca no existe */
  geometriaValida: boolean;

  /** Momento de cálculo en el pilote, tracciona arriba (kN·m) */
  momentoKNm: number;
  /** Momento positivo máximo en el tramo (tracciona abajo), 0 si no hay (kN·m) */
  momentoVanoKNm: number;
  /** Cortante de cálculo del tramo, el mayor en valor absoluto (kN) */
  cortanteTramoKN: number;

  flexion: ResultadoFlexion;
  /** Sólo si momentoVanoKNm > 0 */
  flexionVano: ResultadoFlexion | null;
  cortanteTramo: ResultadoCortante;
  voladizo: CortanteVoladizo;
  /** Estribos: la menor de las dos separaciones (m) */
  separacionEstribosM: number;
  verificaDiametro: boolean;
}

const redondearAbajo = (x: number, paso: number) => Math.floor(x / paso + 1e-9) * paso;

/** Lo que define la palanca, sin armadura ni materiales. */
export type PalancaCalculo = Pick<
  DatosVigaCentradoraPilotes,
  "b" | "h" | "excentricidadM" | "luzApoyosM" | "n1dKN" | "excentricidadAccidentalM"
>;

/**
 * R₁ = (N₁d·l + q·l²/2 + M_acc)/(l − e), kN: la reacción de cálculo sobre el
 * apoyo medianero. Una sola copia: la usa también el cabezal medianero, que se
 * verifica con ella (lib/cad-revit/cargas.ts). Infinity si l − e ≤ 0.
 */
export function reaccionApoyoMedianero(p: PalancaCalculo): number {
  if (!(p.luzApoyosM > 0 && p.excentricidadM >= 0)) return Infinity;
  const l = p.excentricidadM + p.luzApoyosM;
  const q = GAMMA_G * PESO_ESPECIFICO_VIGA_KNM3 * p.b * p.h;
  return (p.n1dKN * l + (q * l ** 2) / 2 + p.n1dKN * p.excentricidadAccidentalM) / p.luzApoyosM;
}

export function calcularVigaCentradoraPilotes(
  materiales: MaterialesDerivados,
  datos: DatosVigaCentradoraPilotes
): ResultadoVigaCentradoraPilotes {
  const { b, h, recubrimiento, excentricidadM: e, luzApoyosM, n1dKN: n } = datos;
  const { fck, fcd, fydEstribos } = materiales;

  // ------------------------------------------------------------ palanca
  const l = e + luzApoyosM;
  const geometriaValida = luzApoyosM > 0 && e >= 0;
  const q = GAMMA_G * PESO_ESPECIFICO_VIGA_KNM3 * b * h;
  const momentoAccidentalKNm = n * datos.excentricidadAccidentalM;
  const momentoExcentricidadKNm = n * e;

  const reaccionPiloteKN = reaccionApoyoMedianero(datos);
  const alivioLejanoKN = reaccionPiloteKN - n - q * l;

  // Momento negativo máximo: en el pilote. En el tramo decrece siempre (la
  // pendiente R₁ − N₁d − q·x es positiva en x = e).
  const momentoKNm = momentoExcentricidadKNm + momentoAccidentalKNm + (q * e ** 2) / 2;
  // Positivo en el tramo: M(x) = R₁·(x − e) − N₁d·x − q·x²/2 − M_acc, máximo
  // donde el cortante se anula, x* = (R₁ − N₁d)/q, si cae dentro.
  const momentoEn = (x: number) => reaccionPiloteKN * (x - e) - n * x - (q * x ** 2) / 2 - momentoAccidentalKNm;
  const xCero = q > 0 ? (reaccionPiloteKN - n) / q : Infinity;
  const momentoVanoKNm =
    geometriaValida && xCero > e && xCero < l ? Math.max(momentoEn(xCero), 0) : 0;

  const vJuntoPilote = reaccionPiloteKN - n - q * e;
  const vApoyoLejano = vJuntoPilote - q * luzApoyosM;
  const cortanteTramoKN = Math.max(Math.abs(vJuntoPilote), Math.abs(vApoyoLejano));

  // ------------------------------------------------------------ flexión
  // Anejo 19, art. 6.1, con el motor de vigas; mínimo de la ec. (9.1).
  const geometria = { b, h, recubrimiento, diametroEstriboMm: datos.diametroEstriboMm };
  const dSup = calcularCantoUtil(geometria, [datos.superior]);
  const flexion = calcularFlexion(materiales, geometria, dSup, { momento: momentoKNm, armaduraReal: [datos.superior] });
  const flexionVano =
    momentoVanoKNm > 0
      ? calcularFlexion(materiales, geometria, calcularCantoUtil(geometria, [datos.inferior]), {
          momento: momentoVanoKNm,
          armaduraReal: [datos.inferior],
        })
      : null;

  // ------------------------------------------------------------ cortante, tramo
  // Art. 6.2.2 y 6.2.3 con el motor de vigas. Tracciona arriba: ρl con la superior.
  const cortanteTramo = calcularCortante(materiales, geometria, dSup, flexion.asRealCm2, {
    vd: cortanteTramoKN,
    diametroEstriboMm: datos.diametroEstriboMm,
    numeroRamas: datos.numeroRamas,
  });

  // ------------------------------------------------------------ cortante, voladizo
  // El pilar carga arriba a a_v de la cara del pilote. El pilote se toma como
  // el cuadrado de igual área (como en el cabezal de un pilote): su cara queda
  // a (√π/2)·D/2 del eje.
  const avM = e - datos.ladoPilarM / 2 - ((Math.sqrt(Math.PI) / 2) * datos.diametroPiloteM) / 2;
  const sinReduccion = avM >= 2 * dSup;
  const beta = sinReduccion ? 1 : Math.max(avM, 0.5 * dSup) / (2 * dSup);
  const vEdKN = n + q * e;
  const vEdReducidoKN = beta * n + q * e;
  // Ec. (6.5) y (6.6), pág. 78: VEd sin reducir ≤ 0,5·b·d·ν·fcd.
  const nu = 0.6 * (1 - fck / 250);
  const vLimite65KN = 0.5 * b * dSup * nu * fcd * 1000;
  // VRd,c del motor de vigas con el VEd reducido (art. 6.2.2 (6)).
  const base = calcularCortante(materiales, geometria, dSup, flexion.asRealCm2, {
    vd: sinReduccion ? vEdKN : vEdReducidoKN,
    diametroEstriboMm: datos.diametroEstriboMm,
    numeroRamas: datos.numeroRamas,
  });
  const vRdCKN = Math.max(base.vRdC, base.vRdCMin);
  const requiereEstribos = (sinReduccion ? vEdKN : vEdReducidoKN) > vRdCKN;
  // Con β, ec. (6.19), pág. 80: VEd ≤ Asw·fywd con los estribos de los 0,75·a_v
  // centrales. Sin β, el modelo de celosía del motor de vigas (ec. 6.8).
  const avCalculoM = Math.max(avM, 0.5 * dSup);
  const a90Celosia = base.a90Cm2PorM;
  const a90Ec619 = requiereEstribos ? (vEdReducidoKN * 10) / (fydEstribos * 0.75 * avCalculoM) : 0;
  const a90NecCm2PorM = sinReduccion ? a90Celosia : Math.max(a90Ec619, base.a90MinCm2PorM);
  const separacionM = Math.min(
    redondearAbajo(Math.min(base.aEstriboCm2 / a90NecCm2PorM, base.separacionMaxM), 0.05),
    TOPE_SEPARACION_OFICINA_M
  );

  const voladizo: CortanteVoladizo = {
    avM,
    beta,
    vEdKN,
    vEdReducidoKN,
    vLimite65KN,
    verifica65: vEdKN <= vLimite65KN,
    vRdMaxKN: base.vRdMax,
    verificaVRdMax: vEdKN <= base.vRdMax,
    vRdCKN,
    requiereEstribos,
    a90NecCm2PorM,
    separacionM,
    sinReduccion,
  };

  return {
    luzM: l,
    pesoVigaKNPorM: q,
    momentoAccidentalKNm,
    momentoExcentricidadKNm,
    reaccionPiloteKN,
    alivioLejanoKN,
    geometriaValida,
    momentoKNm,
    momentoVanoKNm,
    cortanteTramoKN,
    flexion,
    flexionVano,
    cortanteTramo,
    voladizo,
    separacionEstribosM: Math.min(cortanteTramo.separacionAdoptadaM, separacionM),
    verificaDiametro: datos.superior.diametroMm >= DIAMETRO_MINIMO_CENTRADORA_MM,
  };
}
