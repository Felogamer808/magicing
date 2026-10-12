import type { ArmaduraElegida, MaterialesDerivados, ResultadoCortante } from "@/lib/calc/hormigon/comun/types";
import { armaduraMinimaTraccionCm2, resistenciaFlexotraccionMPa } from "@/lib/calc/hormigon/comun/cuantias";
import { calcularCortante } from "@/lib/calc/hormigon/vigas/flexion-cortante";
import { diagramaInteraccion, momentoResistente } from "@/lib/calc/hormigon/muros/portante";
import { GAMMA_G } from "@/lib/calc/hormigon/comun/coeficientes";
import { moduloSecanteGPa } from "@/lib/calc/hormigon/comun/materiales";

/**
 * Viga de atado (riostra) entre dos zapatas o encepados.
 *
 * Su función es que las zapatas se muevan juntas frente a las acciones
 * horizontales, no tomar flexión: trabaja a axil, de tracción o de compresión
 * según hacia dónde empuje la acción. El Anejo 19 la menciona en el art. 9.8.3,
 * pág. 154, pero no fija ese axil; tampoco el CTE DB SE-C (art. 4.1.1 (5),
 * pág. 25), que remite a la norma sísmica.
 *
 * Criterios decididos por el usuario:
 * - Axil de atado = un porcentaje del axil de cálculo del pilar más cargado de
 *   los dos que une. El 10 % por defecto es el de Jiménez Montoya, § 25.10.2,
 *   para predimensionar a falta de datos; es una hipótesis de la acción, no de
 *   la resistencia, y la página lo deja editable.
 * - Los axiles de los pilares se cargan ya mayorados.
 * - La viga apoya en el terreno: su peso propio no la flecta. Sólo flecta si
 *   la maquinaria de compactación puede cargarla, con q₁ = 10 kN/m
 *   (art. 9.8.3 (2)), biapoyada en la luz libre entre zapatas.
 * - Asiento diferencial entre zapatas (CTE DB SE-C, art. 4.1.1 (7), pág. 25,
 *   que pide considerarlo sin decir cómo), decidido el 2026-10-12:
 *   · δ es un dato; sin dato, la distorsión angular límite de la tabla 2.2
 *     (pág. 14) por la distancia entre ejes de las zapatas;
 *   · viga empotrada en las dos zapatas, que no giran: M = 6·EI·δ/L² en los
 *     extremos y V = 12·EI·δ/L³;
 *   · EI = Ecm·I bruta, del lado seguro (no se cuenta la relajación por
 *     fisuración ni por fluencia);
 *   · γ = 1,35, el de las acciones permanentes;
 *   · se combina con todo por sección: en el extremo, M del asiento + axil;
 *     en el vano, M de q₁ + axil. Los cortantes se suman en el extremo.
 * - Toda la resistencia sale del Anejo 19. Las dos reglas de Montoya
 *   (a ≥ l/20 y As·fyd ≥ 0,15·a²·fcd) se informan como predimensionado y no
 *   deciden si cumple: son práctica de la EHE-08.
 *
 * Armadura simétrica: la misma en las dos caras, porque el axil cambia de
 * signo y la flexión de q₁, si existe, tracciona abajo en el vano.
 */

/** q₁: carga mínima descendente por la compactación, art. 9.8.3 (2), pág. 154 (kN/m). */
export const Q1_COMPACTACION_KN_M = 10;

/** Diámetro mínimo de la armadura longitudinal, art. 9.8.3 (1), pág. 154 (mm). */
export const DIAMETRO_MINIMO_ATADO_MM = 12;

/**
 * Distorsiones angulares límite de la tabla 2.2 del CTE DB SE-C, pág. 14. Se
 * usan sólo cuando no se carga el asiento diferencial previsto.
 */
export const DISTORSIONES_LIMITE = {
  isostatica: { texto: "Estructuras isostáticas y muros de contención", limite: 1 / 300 },
  reticulada: { texto: "Estructuras reticuladas con tabiquería de separación", limite: 1 / 500 },
  prefabricada: { texto: "Estructuras de paneles prefabricados", limite: 1 / 700 },
  muroConcavoArriba: { texto: "Muros de carga sin armar, flexión cóncava hacia arriba", limite: 1 / 1000 },
  muroConcavoAbajo: { texto: "Muros de carga sin armar, flexión cóncava hacia abajo", limite: 1 / 2000 },
} as const;
export type TipoEstructuraAsiento = keyof typeof DISTORSIONES_LIMITE;

export interface DatosVigaAtado {
  /** Ancho y canto de la viga (m) */
  b: number;
  h: number;
  /** Recubrimiento hasta el estribo (m) */
  recubrimiento: number;
  /** Luz libre entre las caras de las zapatas (m) */
  luzM: number;
  /** Axiles de cálculo de los dos pilares que une, ya mayorados (kN) */
  n1dKN: number;
  n2dKN: number;
  /** Porcentaje del axil del pilar más cargado que se toma como axil de atado (%) */
  porcentaje: number;
  /** Hay maquinaria de compactación que pueda cargar la viga */
  compactacion: boolean;
  /** Armadura de cada cara: la misma arriba y abajo */
  porCara: ArmaduraElegida;
  diametroEstriboMm: number;
  numeroRamas: number;
  /** Asiento diferencial previsto entre las zapatas (m). null: el de la tabla 2.2. */
  asientoM: number | null;
  /** Distancia entre ejes de las zapatas (m): con ella la distorsión da el asiento. */
  distanciaEjesM: number;
  tipoEstructura: TipoEstructuraAsiento;
}

export interface ResultadoVigaAtado {
  /** Axil de atado: tracción y compresión del mismo valor (kN) */
  axilAtadoKN: number;
  /** q₁ si hay compactación, 0 si no (kN/m) */
  cargaKNPorM: number;
  /** Md = q·L²/8 en el vano, biapoyada (kN·m) */
  momentoKNm: number;
  /** Vd en el extremo: q·L/2 más el del asiento (kN) */
  cortanteKN: number;

  /** Asiento diferencial usado (m) y si salió de la tabla 2.2 */
  asientoM: number;
  asientoDeTabla: boolean;
  /** EI = Ecm·b·h³/12 (kN·m²) */
  rigidezKNm2: number;
  /** γ·6·EI·δ/L² y γ·12·EI·δ/L³ en los extremos (kN·m, kN) */
  momentoAsientoKNm: number;
  cortanteAsientoKN: number;
  /** Momento de la sección que manda (kN·m) y cuál es */
  momentoDisenoKNm: number;
  seccionDeterminante: "vano" | "extremo";

  /** d′: del borde al eje de las barras; d: canto útil; z = d − d′ (m) */
  dPrimaM: number;
  dM: number;
  brazoM: number;
  asCaraCm2: number;

  /** Tracción: la toma sólo el acero. Fuerza en la cara más cargada (kN). */
  traccionCaraKN: number;
  capacidadCaraKN: number;
  verificaTraccion: boolean;

  /** Compresión: excentricidad mínima del art. 6.1 (4) y diagrama N–M. */
  excentricidadMinimaM: number;
  momentoCompresionKNm: number;
  nRdMaxKN: number;
  mRdKNm: number;
  verificaCompresion: boolean;
  /** Utilización a compresión: N/NRd,max si se excede el axil, si no M/MRd(N). */
  utilizacionCompresion: number;

  /** Mínimo de tracción de cada cara, ec. (9.1) */
  asMinCaraCm2: number;
  verificaMinima: boolean;
  verificaDiametro: boolean;

  /** Cortante: bielas y estribos. Con tracción se deja todo a los estribos. */
  cortante: ResultadoCortante;
  a90NecCm2PorM: number;
  separacionEstribosM: number;

  /** Predimensionado de Montoya, § 25.10.2: informativo, no decide. */
  ladoMinimoMontoyaM: number;
  cumpleLadoMontoya: boolean;
  cumpleFisuracionMontoya: boolean;
}

const areaCm2 = (a: ArmaduraElegida) => (a.numero * Math.PI * (a.diametroMm / 10) ** 2) / 4;

export function calcularVigaAtado(materiales: MaterialesDerivados, datos: DatosVigaAtado): ResultadoVigaAtado {
  const { b, h, recubrimiento, luzM, porCara, diametroEstriboMm } = datos;
  const { fcd, fyd, fctm, fydEstribos } = materiales;

  // ------------------------------------------------------------ acciones
  const axilAtadoKN = (datos.porcentaje / 100) * Math.max(datos.n1dKN, datos.n2dKN);
  const cargaKNPorM = datos.compactacion ? Q1_COMPACTACION_KN_M : 0;
  const momentoKNm = (cargaKNPorM * luzM ** 2) / 8;

  // Asiento impuesto con los extremos empotrados. Ecm en GPa → kN/m²: ×1e6.
  const asientoDeTabla = datos.asientoM === null;
  const asientoM = datos.asientoM ?? DISTORSIONES_LIMITE[datos.tipoEstructura].limite * datos.distanciaEjesM;
  const rigidezKNm2 = moduloSecanteGPa(materiales.fck) * 1e6 * ((b * h ** 3) / 12);
  const momentoAsientoKNm = (GAMMA_G * 6 * rigidezKNm2 * asientoM) / luzM ** 2;
  const cortanteAsientoKN = (GAMMA_G * 12 * rigidezKNm2 * asientoM) / luzM ** 3;

  // El axil es el mismo en toda la viga: entre el vano y el extremo manda el
  // de más momento. Los cortantes sí coinciden en el extremo y se suman.
  const seccionDeterminante = momentoAsientoKNm > momentoKNm ? "extremo" : "vano";
  const momentoDisenoKNm = Math.max(momentoKNm, momentoAsientoKNm);
  const cortanteKN = (cargaKNPorM * luzM) / 2 + cortanteAsientoKN;

  // ------------------------------------------------------------ sección
  const dPrimaM = recubrimiento + diametroEstriboMm / 1000 + porCara.diametroMm / 2000;
  const dM = h - dPrimaM;
  const brazoM = dM - dPrimaM;
  const asCaraCm2 = areaCm2(porCara);

  // ------------------------------------------------------------ tracción
  // El hormigón traccionado no cuenta: cada cara toma la mitad del axil más el
  // par del momento, N/2 + M/z. 1 cm² × 1 MPa = 0,1 kN.
  const traccionCaraKN = axilAtadoKN / 2 + (brazoM > 0 ? momentoDisenoKNm / brazoM : Infinity);
  const capacidadCaraKN = (asCaraCm2 * fyd) / 10;

  // ------------------------------------------------------------ compresión
  // Anejo 19, art. 6.1 (4), pág. 74: excentricidad mínima h/30, no menos de
  // 20 mm. Es un mínimo, no se suma al momento de q₁ ni al del asiento.
  const excentricidadMinimaM = Math.max(h / 30, 0.02);
  const momentoCompresionKNm = Math.max(momentoDisenoKNm, axilAtadoKN * excentricidadMinimaM);
  // El diagrama del muro es por metro de ancho: se le pasa la cuantía por
  // metro y se escala por b, que es lineal en las dos resultantes.
  const diagrama = diagramaInteraccion(h, dPrimaM, asCaraCm2 / b, materiales);
  const nRdMaxKN = b * Math.max(...diagrama.map((p) => p.nRdKN));
  const mRdKNm = axilAtadoKN <= nRdMaxKN ? b * momentoResistente(diagrama, axilAtadoKN / b) : 0;
  const utilizacionCompresion =
    axilAtadoKN > nRdMaxKN ? axilAtadoKN / nRdMaxKN : mRdKNm > 0 ? momentoCompresionKNm / mRdKNm : Infinity;

  // ------------------------------------------------------------ mínimos
  // Art. 9.8.3 remite a una viga: mínimo de tracción de la ec. (9.1) en cada
  // cara, porque cualquiera de las dos puede quedar traccionada.
  const asMinCaraCm2 = armaduraMinimaTraccionCm2(b, h, resistenciaFlexotraccionMPa(fctm, h), fyd);

  // ------------------------------------------------------------ cortante
  // VRd,c baja con la tracción (término k₁·σcp de la ec. (6.2.a)), y el motor
  // de vigas no lo toma: se deja el cortante entero a los estribos, del lado
  // seguro, con cot θ = 1 como en el resto de las vigas.
  const geometria = { b, h, recubrimiento, diametroEstriboMm };
  const cortante = calcularCortante(materiales, geometria, dM, asCaraCm2, {
    vd: cortanteKN,
    diametroEstriboMm,
    numeroRamas: datos.numeroRamas,
  });
  const a90NecCm2PorM = Math.max((cortanteKN * 10) / (fydEstribos * 0.9 * dM), cortante.a90MinCm2PorM);
  const separacionNecM = cortante.aEstriboCm2 / a90NecCm2PorM;
  const separacionEstribosM = Math.min(
    Math.floor(Math.min(separacionNecM, cortante.separacionMaxM) / 0.05 + 1e-9) * 0.05,
    0.25
  );

  // ------------------------------------------------------------ Montoya
  const ladoMinimoMontoyaM = Math.max(luzM / 20, 0.25);
  const asTotalCm2 = 2 * asCaraCm2;

  return {
    axilAtadoKN,
    cargaKNPorM,
    momentoKNm,
    cortanteKN,
    asientoM,
    asientoDeTabla,
    rigidezKNm2,
    momentoAsientoKNm,
    cortanteAsientoKN,
    momentoDisenoKNm,
    seccionDeterminante,
    dPrimaM,
    dM,
    brazoM,
    asCaraCm2,
    traccionCaraKN,
    capacidadCaraKN,
    verificaTraccion: traccionCaraKN <= capacidadCaraKN,
    excentricidadMinimaM,
    momentoCompresionKNm,
    nRdMaxKN,
    mRdKNm,
    verificaCompresion: utilizacionCompresion <= 1,
    utilizacionCompresion,
    asMinCaraCm2,
    verificaMinima: asCaraCm2 >= asMinCaraCm2,
    verificaDiametro: porCara.diametroMm >= DIAMETRO_MINIMO_ATADO_MM,
    cortante,
    a90NecCm2PorM,
    separacionEstribosM,
    ladoMinimoMontoyaM,
    cumpleLadoMontoya: Math.min(b, h) >= ladoMinimoMontoyaM,
    cumpleFisuracionMontoya: (asTotalCm2 * fyd) / 10 >= (0.15 * b * h * fcd * 1000),
  };
}
