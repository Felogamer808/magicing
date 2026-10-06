import { aNumero, fmt } from "@/lib/verificaciones/formato";
import { calcularSteelDeckFlexion, type ResistenciaFuego } from "./steel-deck-flexion";
import { calcularSteelDeckRasante } from "./steel-deck-rasante";
import {
  apDerivadaMm2PorM,
  BMIN_NERVIO_M,
  CATALOGO_DECKPANEL_ARMCO,
  ESPESOR_DECKPANEL_ESTANDAR_MM,
  FY_ACERO_DECKPANEL_MPA,
  PERFIL_DECKPANEL,
  yInfChapaM,
} from "./deckpanel-armco";

export const ESPESORES_DECKPANEL = Object.keys(CATALOGO_DECKPANEL_ARMCO).map(Number).sort((a, b) => a - b);
export const ETIQUETA_ESPESOR = (mm: number) =>
  mm === ESPESOR_DECKPANEL_ESTANDAR_MM ? `${fmt(mm, 3)} mm — estándar` : `${fmt(mm, 3)} mm — a consultar`;
export const ESPESOR_OPCIONES = ESPESORES_DECKPANEL.map(ETIQUETA_ESPESOR);
export const espesorDesdeEtiqueta = (etiqueta: string): number =>
  ESPESORES_DECKPANEL[ESPESOR_OPCIONES.indexOf(etiqueta)] ?? ESPESOR_DECKPANEL_ESTANDAR_MM;

/** Lo que sale del perfil elegido y del número de barras, no del formulario directo. */
export function derivadosSteelDeck(campos: Record<string, string>) {
  const espesorDeckpanel = espesorDesdeEtiqueta(campos.espesorDeckpanel ?? "");
  const numeroBarras = aNumero(campos.numeroBarrasPorNervio ?? "");
  return {
    espesorDeckpanel,
    alturaNervio: PERFIL_DECKPANEL.alturaNervioM,
    fyp: FY_ACERO_DECKPANEL_MPA,
    ap: apDerivadaMm2PorM(espesorDeckpanel),
    dp: aNumero(campos.espesorTotal ?? "") - yInfChapaM(espesorDeckpanel),
    // El paso entre nervios es fijo: la separación entre barras sale de cuántas van por nervio.
    sepBarra: numeroBarras > 0 ? (PERFIL_DECKPANEL.pasoNervioM * 1000) / numeroBarras : Infinity,
    // El acero base, no el espesor del panel: el galvanizado no aporta al aplastamiento.
    espesorChapaMm: CATALOGO_DECKPANEL_ARMCO[espesorDeckpanel].espesorAceroBaseMm,
  };
}

function flexion(campos: Record<string, string>, d: ReturnType<typeof derivadosSteelDeck>) {
  const num = (clave: string) => aNumero(campos[clave] ?? "");
  const resistenciaFuego = (campos.resistenciaFuego ?? "R60") as ResistenciaFuego;
  const n = {
    fyp: d.fyp, fck: num("fck"), fykBarras: num("fykBarras"),
    espesorTotal: num("espesorTotal"), alturaNervio: d.alturaNervio,
    ap: d.ap, dp: d.dp, anchoNervio: BMIN_NERVIO_M,
    phiBarra: num("phiBarra"), sepBarra: d.sepBarra, recBarra: num("recBarra"),
    mEd: num("mEd"), etaFi: num("etaFi"),
  };
  const positivos = [n.fyp, n.fck, n.fykBarras, n.espesorTotal, n.alturaNervio, n.ap, n.dp,
                     n.anchoNervio, n.sepBarra, n.recBarra, n.etaFi];
  if (!positivos.every((x) => Number.isFinite(x) && x > 0)) return null;
  if (!Number.isFinite(n.phiBarra) || n.phiBarra < 0) return null;
  if (!Number.isFinite(n.mEd) || n.mEd < 0) return null;
  if (n.alturaNervio >= n.espesorTotal) return null;
  if (n.dp >= n.espesorTotal) return null;
  if (n.recBarra >= n.espesorTotal) return null;

  return {
    n,
    r: calcularSteelDeckFlexion(
      { fypkMPa: n.fyp, fckMPa: n.fck, fykBarrasMPa: n.fykBarras },
      {
        espesorTotalM: n.espesorTotal, alturaNervioM: n.alturaNervio, apMm2PorM: n.ap, dpM: n.dp,
        diametroBarraMm: n.phiBarra, separacionBarraMm: n.sepBarra, recubrimientoBarraM: n.recBarra,
        anchoNervioM: n.anchoNervio,
      },
      n.mEd,
      { resistenciaFuego, etaFi: n.etaFi }
    ),
  };
}

function rasante(campos: Record<string, string>, d: ReturnType<typeof derivadosSteelDeck>) {
  const num = (clave: string) => aNumero(campos[clave] ?? "");
  const n = {
    luz: num("luz"), anchoTrib: num("anchoTrib"), dp: d.dp, ap: d.ap, fyp: d.fyp,
    m: num("m"), k: num("k"), gammaVs: num("gammaVs"), lsSobreL: num("lsSobreL"),
    phiBarra: num("phiBarra"), sepBarra: d.sepBarra, fykBarras: num("fykBarras"),
    gPp: num("gPp"), gAdd: num("gAdd"), q: num("q"), gammaG: num("gammaG"), gammaQ: num("gammaQ"),
    espesorChapa: d.espesorChapaMm, diametroPerno: num("diametroPerno"),
    numeroPernos: num("numeroPernos"), sepPernos: num("sepPernos"),
  };
  const positivos = [n.luz, n.anchoTrib, n.dp, n.ap, n.fyp, n.gammaVs, n.lsSobreL, n.sepBarra, n.fykBarras];
  if (!positivos.every((x) => Number.isFinite(x) && x > 0)) return null;
  if (![n.k, n.gPp, n.gAdd, n.q, n.gammaG, n.gammaQ, n.m].every((x) => Number.isFinite(x) && x >= 0)) return null;
  if (!Number.isFinite(n.phiBarra) || n.phiBarra < 0) return null;

  const anclaje = campos.anclajePresente === "Sí";
  if (anclaje) {
    const positivosAnclaje = [n.espesorChapa, n.diametroPerno, n.numeroPernos, n.sepPernos];
    if (!positivosAnclaje.every((x) => Number.isFinite(x) && x > 0)) return null;
  }

  return {
    n,
    r: calcularSteelDeckRasante(
      { fypMPa: n.fyp, fykBarrasMPa: n.fykBarras },
      { luzM: n.luz, anchoM: n.anchoTrib, dpM: n.dp, apMm2PorM: n.ap, diametroBarraMm: n.phiBarra, separacionBarraMm: n.sepBarra },
      { mMPa: n.m, kMPa: n.k, gammaVs: n.gammaVs, lsSobreL: n.lsSobreL },
      { gPpKNm2: n.gPp, gAddKNm2: n.gAdd, qKNm2: n.q, gammaG: n.gammaG, gammaQ: n.gammaQ },
      {
        presente: anclaje, espesorChapaMm: n.espesorChapa, diametroPernoMm: n.diametroPerno,
        numeroPernos: n.numeroPernos, separacionPernosM: n.sepPernos,
      }
    ),
  };
}

/**
 * Losa steel deck a partir de los campos de la página, tal como se cargaron.
 *
 * Flexión y rasante se resuelven por separado: comparten algunos datos, pero
 * completar la geometría del nervio no debería obligar a cargar también la
 * luz y las acciones del rasante para ver la flexión, ni viceversa. Cada uno
 * es null mientras sus propios datos no cierren.
 */
export function resolverSteelDeck(campos: Record<string, string>) {
  const d = derivadosSteelDeck(campos);
  return { derivados: d, flexion: flexion(campos, d), rasante: rasante(campos, d) };
}

export type ResueltoSteelDeck = ReturnType<typeof resolverSteelDeck>;
