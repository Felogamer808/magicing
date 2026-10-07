import type { FormaAnclaje } from "@/lib/calc/hormigon/comun/anclaje";
import { GAMMA_F } from "@/lib/calc/hormigon/comun/coeficientes";
import type { ArmaduraElegida, MaterialesDerivados, ResultadoFlexion } from "@/lib/calc/hormigon/comun/types";
import { calcularCantoUtil, calcularFlexion } from "@/lib/calc/hormigon/vigas/flexion-cortante";
import {
  calcularVuelosDireccion,
  corteDesdeCarga,
  distribucionPresiones,
  presionEn,
  type DistribucionPresiones,
  type ResultadoDireccionZapata,
  type VuelosDireccion,
} from "@/lib/calc/hormigon/cimentaciones/zapata-aislada";
import {
  calcularPunzonamientoDescentrado,
  type ResultadoPunzonamientoDescentrado,
} from "@/lib/calc/hormigon/cimentaciones/punzonamiento-descentrado";
import { calcularTiranteRozamiento, type ResultadoTiranteRozamiento } from "@/lib/calc/hormigon/cimentaciones/tirante-rozamiento";
import {
  calcularDeslizamiento,
  calcularVuelcoGeneral,
  tensionExtraordinaria,
  type ResultadoDeslizamiento,
  type ResultadoVuelco,
  type SituacionDimensionado,
  type TensionExtraordinaria,
} from "@/lib/calc/hormigon/cimentaciones/estabilidad-zapata";

/**
 * Zapata combinada de dos pilares, según el Anejo 19.
 *
 * Criterios decididos por el usuario el 2026-10-06:
 * - **A lo largo** (la dirección que une los pilares) es una viga sobre el
 *   terreno: presión lineal (zapata rígida), pilares como cargas puntuales, y
 *   cada cara armada con el motor de flexión de vigas (art. 6.1 y mínima del
 *   art. 9.2.1.1). Entre pilares el terreno empuja hacia arriba y tracciona la
 *   cara superior: de ahí la armadura superior. El cortante, sin estribos, a d
 *   de cada cara de pilar (art. 6.2.2).
 * - **A lo ancho**, por metro en todo el largo, con el modelo de vuelos de la
 *   zapata aislada (art. 9.8.2.2) bajo la sección más cargada.
 * - **Pilares contra la medianera**: el momento N·e lo toma el terreno (núcleo
 *   central obligatorio) o el par tirante–terreno (DB SE-C), como en la aislada.
 * - **Punzonamiento** de cada pilar como pilar de borde: perímetro recortado,
 *   β de borde y la presión real de los dos pilares descontada.
 *
 * Criterios del 2026-10-07:
 * - Cada pilar puede bajar Mk y Hk en los dos ejes. Mk + Hk·H es el momento en
 *   la base: corre la resultante del terreno y, a lo largo, entra en la viga
 *   como un momento concentrado en el pilar, como en la aislada.
 * - **Vuelco y deslizamiento** por el DB SE-C (estabilidad-zapata.ts):
 *   estabiliza sólo la parte permanente de cada pilar, sin tierras, situación
 *   persistente.
 *
 * x se mide a lo largo desde el borde izquierdo; y a lo ancho desde el borde de
 * la medianera.
 */

export interface PilarCombinada {
  /** Distancia del borde izquierdo al eje del pilar, a lo largo (m). */
  posicionM: number;
  /** Carga vertical característica (kN). */
  Nk: number;
  /** Lado del pilar a lo largo (m). */
  anchoLargoM: number;
  /** Lado del pilar a lo ancho (m). */
  anchoAnchoM: number;
  /** Momento característico a lo largo, + hacia el borde derecho (kN·m). Si falta, 0. */
  MkL?: number;
  /** Momento característico a lo ancho, + alejándose del borde de inicio (kN·m). Si falta, 0. */
  MkB?: number;
  /** Horizontal característica en el arranque, a lo largo, mismo signo que MkL (kN). Si falta, 0. */
  HkL?: number;
  /** Horizontal característica en el arranque, a lo ancho, mismo signo que MkB (kN). Si falta, 0. */
  HkB?: number;
  /** Parte permanente de Nk: la que estabiliza y frena (kN). Si falta, Nk. */
  NkPermanente?: number;
}

export interface GeometriaZapataCombinada {
  /** Largo, en la dirección que une los pilares (m). */
  L: number;
  /** Ancho (m). */
  B: number;
  H: number;
  recubrimiento: number;
  /**
   * Distancia de la cara de los pilares al borde de inicio a lo ancho (m). Los
   * dos pilares quedan alineados. Sin dato, centrados; 0 = contra la medianera.
   */
  distanciaBordeB?: number;
}

export interface ArmadoTransversalCombinada {
  diametroMm: number;
  separacionM: number;
}

export interface DatosZapataCombinada {
  pilares: readonly [PilarCombinada, PilarCombinada];
  /** Barras longitudinales de la cara inferior, en todo el ancho B. */
  inferior: ArmaduraElegida;
  /** Barras longitudinales de la cara superior, en todo el ancho B. */
  superior: ArmaduraElegida;
  /** Barras transversales, por metro de largo. */
  transversal: ArmadoTransversalCombinada;
  /** Extremo de las barras transversales. Recta si falta. */
  formaAnclaje?: FormaAnclaje;
  tirante?: { brazoM: number; phiGrados: number };
  /**
   * Ángulo de rozamiento interno efectivo del terreno, φ′ (grados), para el
   * deslizamiento. Con tirante manda el del tirante. Sin ninguno de los dos,
   * el deslizamiento no se evalúa.
   */
  phiGrados?: number;
  /**
   * Cargas de cada pilar en la situación extraordinaria; la posición y la
   * sección son las de `pilares`. Sólo se comprueba el terreno.
   */
  extraordinaria?: readonly [CargasPilarCombinada, CargasPilarCombinada];
  /**
   * Situación de dimensionado para los coeficientes del terreno (vuelco y
   * deslizamiento). Persistente si falta. El hormigón no cambia.
   */
  situacion?: SituacionDimensionado;
}

/** Lo que cambia de un pilar entre situaciones: sus cargas. */
export type CargasPilarCombinada = Pick<PilarCombinada, "Nk" | "MkL" | "MkB" | "HkL" | "HkB" | "NkPermanente">;

/** El terreno con las cargas de la situación extraordinaria. */
export interface TerrenoExtraordinarioCombinada extends TensionExtraordinaria {
  excentricidadLM: number;
  excentricidadBM: number;
  vuelcoL: ResultadoVuelco;
  vuelcoB: ResultadoVuelco | null;
  deslizamiento: ResultadoDeslizamiento | null;
}

export interface PuntoDiagramaCombinada {
  xM: number;
  /** Cortante de cálculo (kN). */
  vKN: number;
  /** Momento de cálculo (kN·m); positivo tracciona la cara inferior. */
  mKNm: number;
}

export interface ResultadoCaraCombinada {
  /** Momento de cálculo que tracciona esta cara, en valor absoluto (kN·m). */
  mEdKNm: number;
  xM: number;
  /** Falso si ningún punto tracciona esta cara: no se le exige armadura. */
  necesaria: boolean;
  flexion: ResultadoFlexion;
}

export interface ResultadoCortanteCombinada {
  vEdKN: number;
  vRdCKN: number;
  xM: number;
  verifica: boolean;
}

export interface TirantePilarCombinada {
  tkKN: number;
  tdKN: number;
  asTiranteCm2: number;
  mPilarArranqueKNm: number;
  vPilarKN: number;
}

export interface ResultadoZapataCombinada {
  geotecnico: {
    pesoPropioKN: number;
    excentricidadLM: number;
    excentricidadBM: number;
    dentroDelNucleo: boolean;
    sigmaKPa: number;
    verificaTension: boolean;
    distribucionL: DistribucionPresiones;
    distribucionB: DistribucionPresiones;
  };
  pilaresDentro: boolean;
  diagrama: PuntoDiagramaCombinada[];
  inferior: ResultadoCaraCombinada;
  superior: ResultadoCaraCombinada;
  cortante: ResultadoCortanteCombinada;
  /** Rebanada de 1 m bajo la sección más cargada. */
  transversal: VuelosDireccion & { gobernante: ResultadoDireccionZapata; cargaPorMetroKN: number };
  punzonamiento: readonly [ResultadoPunzonamientoDescentrado, ResultadoPunzonamientoDescentrado];
  /** Vuelco a lo largo, respecto del extremo hacia el que empujan los momentos. */
  vuelcoL: ResultadoVuelco;
  /** Vuelco a lo ancho. Null con tirante: el par impide el giro. */
  vuelcoB: ResultadoVuelco | null;
  /** Null sin φ′. */
  deslizamiento: ResultadoDeslizamiento | null;
  /** Null si no se cargó la situación extraordinaria. */
  extraordinaria: TerrenoExtraordinarioCombinada | null;
  /** Sólo con tirante: el par de toda la zapata y el tirante de cada pilar. */
  tirante?: { global: ResultadoTiranteRozamiento; porPilar: readonly [TirantePilarCombinada, TirantePilarCombinada] };
}

const PASOS = 2000;

export function calcularZapataCombinada(
  materiales: MaterialesDerivados,
  geometria: GeometriaZapataCombinada,
  sigmaAdmisibleKPa: number,
  datos: DatosZapataCombinada
): ResultadoZapataCombinada {
  const { L, B, H, recubrimiento } = geometria;
  const { pilares } = datos;
  const cB = Math.max(pilares[0].anchoAnchoM, pilares[1].anchoAnchoM);
  const bordeB = geometria.distanciaBordeB ?? (B - cB) / 2;
  // Los pilares alineados: el eje a lo ancho es el mismo para los dos.
  const e0B = bordeB + cB / 2 - B / 2;

  const pilaresDentro = pilares.every(
    (p) => p.posicionM - p.anchoLargoM / 2 >= -1e-9 && p.posicionM + p.anchoLargoM / 2 <= L + 1e-9
  ) && bordeB >= 0 && bordeB + cB <= B + 1e-9;

  const nTotal = pilares[0].Nk + pilares[1].Nk;
  // Momento de cada pilar en la base: el que baja más el de la horizontal, que
  // tiene brazo H.
  const mBaseL = pilares.map((p) => (p.MkL ?? 0) + (p.HkL ?? 0) * H);
  const mBaseB = pilares.map((p) => (p.MkB ?? 0) + (p.HkB ?? 0) * H);
  const momentoL = pilares.reduce((a, p, i) => a + p.Nk * (p.posicionM - L / 2) + mBaseL[i], 0);
  const momentoB = nTotal * e0B + mBaseB[0] + mBaseB[1];
  const nPermanente = pilares.map((p) => p.NkPermanente ?? p.Nk);
  const hkLTotal = (pilares[0].HkL ?? 0) + (pilares[1].HkL ?? 0);
  const hkBTotal = (pilares[0].HkB ?? 0) + (pilares[1].HkB ?? 0);
  const mkBTotal = (pilares[0].MkB ?? 0) + (pilares[1].MkB ?? 0);

  // ------------------------------------------------------------- tirante
  const pesoPropioKN = 25 * L * B * H;
  const global = datos.tirante
    ? calcularTiranteRozamiento(materiales, {
        nkKN: nTotal, pesoZapataKN: pesoPropioKN, momentoCentroKNm: nTotal * e0B + mkBTotal, mkPilarKNm: 0,
        brazoM: datos.tirante.brazoM, cantoZapataM: H, phiGrados: datos.tirante.phiGrados,
        hkKN: hkBTotal, nkEstabilizanteKN: nPermanente[0] + nPermanente[1],
      })
    : undefined;
  const porPilar = global
    ? (pilares.map((p) => {
        const r = calcularTiranteRozamiento(materiales, {
          nkKN: p.Nk, pesoZapataKN: 0, momentoCentroKNm: p.Nk * e0B + (p.MkB ?? 0), mkPilarKNm: p.MkB ?? 0,
          brazoM: datos.tirante!.brazoM, cantoZapataM: H, phiGrados: datos.tirante!.phiGrados,
          hkKN: p.HkB ?? 0,
        });
        return { tkKN: r.tkKN, tdKN: r.tdKN, asTiranteCm2: r.asTiranteCm2, mPilarArranqueKNm: r.mPilarArranqueKNm, vPilarKN: r.vPilarKN };
      }) as unknown as readonly [TirantePilarCombinada, TirantePilarCombinada])
    : undefined;

  // ----------------------------------------------------------- terreno
  const cargaTotalKN = nTotal + pesoPropioKN;
  const excentricidadLM = momentoL / cargaTotalKN;
  const excentricidadBM = global ? 0 : momentoB / cargaTotalKN;
  const dentroDelNucleo = Math.abs(excentricidadLM) <= L / 6 && Math.abs(excentricidadBM) <= B / 6;
  const anchoEfL = L - 2 * Math.abs(excentricidadLM);
  const anchoEfB = B - 2 * Math.abs(excentricidadBM);
  const sigmaKPa = anchoEfL > 0 && anchoEfB > 0 ? cargaTotalKN / (anchoEfL * anchoEfB) : Infinity;
  const verificaTension = sigmaKPa <= sigmaAdmisibleKPa && dentroDelNucleo;

  // ------------------------------------------------------ a lo largo
  // Presión de cálculo sin peso propio (lo equilibra el mismo peso).
  const excCalculoL = momentoL / nTotal;
  const distL = distribucionPresiones(GAMMA_F * nTotal, L, B, excCalculoL);
  const sDe = (x: number) => (excCalculoL >= 0 ? x : L - x);
  const w = (x: number) => B * presionEn(distL, L, sDe(x));

  // Un momento en la base que empuja hacia el extremo derecho gira la viga en
  // sentido horario: suma al momento de las secciones a su derecha.
  const cargas = pilares.map((p, i) => ({ x: p.posicionM, nd: GAMMA_F * p.Nk, md: GAMMA_F * mBaseL[i] }));
  const xs = new Set<number>();
  for (let i = 0; i <= PASOS; i++) xs.add((L * i) / PASOS);
  for (const c of cargas) xs.add(c.x);
  const orden = [...xs].sort((a, b) => a - b);
  const puntos: PuntoDiagramaCombinada[] = [{ xM: 0, vKN: 0, mKNm: 0 }];
  let V = 0;
  let M = 0;
  for (let i = 1; i < orden.length; i++) {
    const x0 = orden[i - 1];
    const x1 = orden[i];
    const dV = ((w(x0) + w(x1)) / 2) * (x1 - x0);
    M += (V + dV / 2) * (x1 - x0);
    V += dV;
    for (const c of cargas) {
      if (Math.abs(c.x - x1) < 1e-9) {
        V -= c.nd;
        M += c.md;
      }
    }
    puntos.push({ xM: x1, vKN: V, mKNm: M });
  }
  /** Valor interpolado en x. Las secciones que se piden nunca caen sobre un pilar, donde V y M saltan. */
  const valorEn = (x: number, campo: "vKN" | "mKNm") => {
    const j = puntos.findIndex((p) => p.xM >= x);
    if (j <= 0) return puntos[Math.max(j, 0)][campo];
    const a = puntos[j - 1];
    const b = puntos[j];
    return a[campo] + ((b[campo] - a[campo]) * (x - a.xM)) / (b.xM - a.xM);
  };

  let mMax = { m: 0, x: 0 };
  let mMin = { m: 0, x: 0 };
  for (const p of puntos) {
    if (p.mKNm > mMax.m) mMax = { m: p.mKNm, x: p.xM };
    if (p.mKNm < mMin.m) mMin = { m: p.mKNm, x: p.xM };
  }

  const geoViga = { b: B, h: H, recubrimiento, diametroEstriboMm: 0 };
  const dInf = calcularCantoUtil(geoViga, [datos.inferior]);
  const dSup = calcularCantoUtil(geoViga, [datos.superior]);
  const cara = (m: { m: number; x: number }, d: number, arm: ArmaduraElegida, siempre: boolean): ResultadoCaraCombinada => {
    const mEd = Math.abs(m.m);
    return {
      mEdKNm: mEd,
      xM: m.x,
      necesaria: siempre || mEd > 1e-6,
      flexion: calcularFlexion(materiales, geoViga, d, { momento: mEd, armaduraReal: [arm] }),
    };
  };
  // La inferior se exige siempre: es la que reparte bajo los pilares.
  const inferior = cara(mMax, dInf, datos.inferior, true);
  const superior = cara(mMin, dSup, datos.superior, false);

  // Cortante sin estribos a d de cada cara de pilar, hacia los dos lados.
  let cortante: ResultadoCortanteCombinada = { vEdKN: 0, vRdCKN: Infinity, xM: 0, verifica: true };
  for (const p of pilares) {
    for (const lado of [-1, 1]) {
      const cara = p.posicionM + (lado * p.anchoLargoM) / 2;
      // La cara traccionada en la sección define d y la armadura del ρl: se
      // prueba con la inferior y, si ahí tracciona arriba, se rehace con la superior.
      let traccionaAbajo = true;
      let d = dInf;
      let xSeccion = cara + lado * d;
      if (valorEn(xSeccion, "mKNm") < 0) {
        traccionaAbajo = false;
        d = dSup;
        xSeccion = cara + lado * d;
      }
      if (xSeccion <= 0 || xSeccion >= L) continue;
      const vEd = Math.abs(valorEn(xSeccion, "vKN"));
      const asReal = traccionaAbajo ? inferior.flexion.asRealCm2 : superior.flexion.asRealCm2;
      const c = corteDesdeCarga(materiales, B, d, vEd, asReal);
      if (c.vEdKN / c.vRdCKN > cortante.vEdKN / cortante.vRdCKN) {
        cortante = { vEdKN: c.vEdKN, vRdCKN: c.vRdCKN, xM: xSeccion, verifica: c.verificaCorte };
      }
    }
  }
  if (!Number.isFinite(cortante.vRdCKN)) cortante = { ...cortante, vRdCKN: 0 };

  // ------------------------------------------------------- a lo ancho
  // Rebanada de 1 m bajo la sección más cargada: la presión característica
  // máxima a lo largo, por el ancho B, es la carga por metro.
  const distLk = distribucionPresiones(nTotal, L, B, excCalculoL);
  const cargaPorMetroKN = distLk.sigmaMaxKPa * B;
  const armadoT = {
    numero: 1 / datos.transversal.separacionM,
    diametroMm: datos.transversal.diametroMm,
    separacionM: datos.transversal.separacionM,
  };
  // La transversal va sobre la longitudinal inferior.
  const dT = H - recubrimiento - datos.inferior.diametroMm / 1000 - datos.transversal.diametroMm / 2000;
  // El momento a lo ancho se reparte con la carga: la rebanada tiene la misma
  // excentricidad que toda la zapata. Con tirante, el par lo toma entero y la
  // presión queda uniforme.
  const vuelosT = calcularVuelosDireccion(
    materiales, B, 1, H, cB, bordeB, dT, recubrimiento,
    cargaPorMetroKN,
    global ? -cargaPorMetroKN * e0B : (cargaPorMetroKN * (mBaseB[0] + mBaseB[1])) / nTotal,
    armadoT, datos.formaAnclaje ?? "recta"
  );
  const gobernante = vuelosT.fin.momentoKNm >= vuelosT.inicio.momentoKNm ? vuelosT.fin : vuelosT.inicio;

  // ------------------------------------------------------ punzonamiento
  const asTransversalTotalCm2 = vuelosT.fin.asRealCm2 * L;
  const punzonamiento = pilares.map((p, i) =>
    calcularPunzonamientoDescentrado(materiales, {
      A: L, B, anchoPilarA: p.anchoLargoM, anchoPilarB: p.anchoAnchoM,
      bordeA: p.posicionM - p.anchoLargoM / 2, bordeB,
      dA: dInf, dB: dT,
      nk: p.Nk, nkPresiones: nTotal,
      mkA: p.MkL ?? 0, mkB: porPilar ? porPilar[i].mPilarArranqueKNm : p.MkB ?? 0,
      excCalculoA: excCalculoL, excCalculoB: global ? 0 : momentoB / nTotal,
      asRealACm2: inferior.flexion.asRealCm2, asRealBCm2: asTransversalTotalCm2,
    })
  ) as unknown as readonly [ResultadoPunzonamientoDescentrado, ResultadoPunzonamientoDescentrado];

  // ------------------------------------------- vuelco y deslizamiento
  const estabilizantes = (posicion: (p: PilarCombinada) => number) =>
    pilares.map((p, i) => ({ posicionM: posicion(p), nkPermanenteKN: nPermanente[i] }));
  const vuelcoL = calcularVuelcoGeneral({
    dimM: L, momentoBaseKNm: mBaseL[0] + mBaseL[1],
    cargas: estabilizantes((p) => p.posicionM), pesoZapataKN: pesoPropioKN, situacion: datos.situacion,
  });
  const vuelcoB = global
    ? null
    : calcularVuelcoGeneral({
        dimM: B, momentoBaseKNm: mBaseB[0] + mBaseB[1],
        cargas: estabilizantes(() => bordeB + cB / 2), pesoZapataKN: pesoPropioKN, situacion: datos.situacion,
      });
  const phiGrados = datos.tirante?.phiGrados ?? datos.phiGrados;
  const deslizamiento =
    phiGrados === undefined
      ? null
      : calcularDeslizamiento({
          horizontalAKN: hkLTotal,
          // Con tirante, lo que la base frena a lo ancho es el tirante más la horizontal.
          horizontalBKN: global ? global.horizontalBaseKN : hkBTotal,
          nkPermanenteKN: nPermanente[0] + nPermanente[1],
          pesoZapataKN: pesoPropioKN,
          phiGrados,
          situacion: datos.situacion,
        });

  // La extraordinaria repite el cálculo con sus cargas y toma sólo el terreno.
  const ext = datos.extraordinaria;
  const extraordinaria = ext
    ? (() => {
        const r = calcularZapataCombinada(materiales, geometria, sigmaAdmisibleKPa, {
          ...datos,
          // Sin el ?? 0, un dato persistente que falte en la extraordinaria se colaría.
          pilares: pilares.map((p, i) => ({
            ...p, Nk: ext[i].Nk, MkL: ext[i].MkL ?? 0, MkB: ext[i].MkB ?? 0, HkL: ext[i].HkL ?? 0, HkB: ext[i].HkB ?? 0,
            NkPermanente: ext[i].NkPermanente,
          })) as unknown as readonly [PilarCombinada, PilarCombinada],
          extraordinaria: undefined,
          situacion: "extraordinaria",
        });
        return {
          ...tensionExtraordinaria(r.geotecnico.sigmaKPa, sigmaAdmisibleKPa),
          excentricidadLM: r.geotecnico.excentricidadLM,
          excentricidadBM: r.geotecnico.excentricidadBM,
          vuelcoL: r.vuelcoL,
          vuelcoB: r.vuelcoB,
          deslizamiento: r.deslizamiento,
        };
      })()
    : null;

  // Diagrama aliviado para dibujar: no hacen falta 2000 puntos.
  const paso = Math.max(1, Math.floor(puntos.length / 200));
  const diagrama = puntos.filter((_, i) => i % paso === 0 || i === puntos.length - 1);

  return {
    geotecnico: {
      pesoPropioKN, excentricidadLM, excentricidadBM, dentroDelNucleo, sigmaKPa, verificaTension,
      distribucionL: distribucionPresiones(cargaTotalKN, L, B, excentricidadLM),
      distribucionB: distribucionPresiones(cargaTotalKN, B, L, excentricidadBM),
    },
    pilaresDentro,
    diagrama,
    inferior,
    superior,
    cortante,
    transversal: { ...vuelosT, gobernante, cargaPorMetroKN },
    punzonamiento,
    vuelcoL,
    vuelcoB,
    deslizamiento,
    extraordinaria,
    ...(global && porPilar ? { tirante: { global, porPilar } } : {}),
  };
}
