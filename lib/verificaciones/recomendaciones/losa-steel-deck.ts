import {
  ESPESORES_DECKPANEL,
  ETIQUETA_ESPESOR,
  espesorDesdeEtiqueta,
  resolverSteelDeck,
  type ResueltoSteelDeck,
} from "@/lib/calc/hormigon/losas/resolver-steel-deck";
import { recomendarTodas, type Palanca, type Recomendacion } from "./motor";
import { campo, m, palancaDiametro, palancaFck, palancaValor, type Campos } from "./palancas";

export type ClaveSteelDeck = "frio" | "fuego" | "rasante" | "chapaExclusiva" | "espesorAla";
export type RecomendacionesSteelDeck = Partial<Record<ClaveSteelDeck, Recomendacion[]>>;

const NOMBRES: Record<ClaveSteelDeck, string> = {
  frio: "momento resistente",
  fuego: "momento resistente en incendio",
  rasante: "rasante m-k",
  chapaExclusiva: "rasante con la chapa sola",
  espesorAla: "espesor de ala",
};

function utilizaciones({ flexion, rasante }: ResueltoSteelDeck): Partial<Record<ClaveSteelDeck, number>> {
  const u: Partial<Record<ClaveSteelDeck, number>> = {};
  if (flexion) {
    const { frio, fuego } = flexion.r;
    u.frio = frio.mEdKNm / frio.mPlRdKNm;
    // Con R30 la capacidad se concede sin cálculo; sin valor tabulado no hay comprobación.
    if (fuego.aMinTabMm !== null && Number.isFinite(fuego.mFiRdKNm)) u.fuego = fuego.mEdFiKNm / fuego.mFiRdKNm;
    u.espesorAla = fuego.espesorAlaMinMm / (frio.hcM * 1000);
  }
  if (rasante) {
    u.rasante = rasante.r.acciones.vEdPorAnchoKNporM / rasante.r.rasante.vlRdKNporM;
    u.chapaExclusiva = rasante.r.rasante.vEdChapaKNporM / rasante.r.rasante.vlRdKNporM;
  }
  return u;
}

// ── Palancas ────────────────────────────────────────────────────────────────

const ESPESOR = palancaValor(campo("espesorTotal"), {
  paso: 0.01,
  tope: (h) => h + 0.15,
  decimales: 2,
  rotulo: "h = ",
  texto: m,
  efectoColateral: "Más espesor: más peso propio, que hay que sumar a las acciones.",
});
const FCK = palancaFck(campo("fck"));
const BARRAS = palancaValor(campo("numeroBarrasPorNervio"), {
  paso: 1,
  tope: (n) => n + 3,
  decimales: 0,
  rotulo: "Barras por nervio: ",
  texto: (n, e) => `${n} Ø${campo("phiBarra").leer(e)}`,
});
const DIAMETRO = palancaDiametro(campo("phiBarra"), "mayor", (e, d) => `${campo("numeroBarrasPorNervio").leer(e)} Ø${d}`, {
  rotulo: "Barras por nervio: ",
});

/** La chapa siguiente del catálogo ARMCO: más Ap y más espesor de acero. */
const CHAPA: Palanca<Campos> = {
  efectoColateral: "Chapa más gruesa: fuera del estándar, a consultar con el proveedor.",
  *candidatos(e) {
    const hoy = espesorDesdeEtiqueta(e.espesorDeckpanel ?? "");
    for (const mm of ESPESORES_DECKPANEL.filter((x) => x > hoy)) {
      yield { datos: { ...e, espesorDeckpanel: ETIQUETA_ESPESOR(mm) }, accion: `Chapa de ${ETIQUETA_ESPESOR(mm)} (hoy ${ETIQUETA_ESPESOR(hoy)})` };
    }
  },
};

/** Subir la barra dentro del nervio: la palanca más fuerte en incendio y la más barata. */
const SUBIR_BARRA = palancaValor(campo("recBarra"), {
  paso: 0.005,
  tope: (r) => r + 0.06,
  decimales: 3,
  rotulo: "Barra a ",
  texto: (v) => `${Math.round(v * 1000)} mm del fondo`,
  efectoColateral: "Menos brazo en frío: revisar que el momento resistente siga cumpliendo.",
  cita: "EN 1994-1-2, tabla 5.5",
});

/** Anclaje de extremo con pernos, o un perno más si ya lo hay. */
const PERNOS: Palanca<Campos> = {
  efectoColateral: "Pernos conectores en los apoyos.",
  cita: "EN 1994-1-1, §9.7.4",
  *candidatos(e) {
    if (e.anclajePresente !== "Sí") {
      yield { datos: { ...e, anclajePresente: "Sí" }, accion: "Agregar anclaje de extremo con pernos (hoy sin anclaje)" };
      return;
    }
    const n0 = campo("numeroPernos").leer(e);
    for (let n = n0 + 1; n <= n0 + 4; n++) {
      yield { datos: { ...e, numeroPernos: String(n) }, accion: `Pernos por apoyo: ${n} (hoy ${n0})` };
    }
  },
};

function palancasPorClave(clave: ClaveSteelDeck): readonly Palanca<Campos>[] {
  switch (clave) {
    case "frio":
      return [BARRAS, DIAMETRO, ESPESOR, CHAPA, FCK];
    case "fuego":
      return [SUBIR_BARRA, BARRAS, DIAMETRO];
    case "rasante":
    case "chapaExclusiva":
      return [PERNOS, BARRAS, CHAPA];
    case "espesorAla":
      return [ESPESOR];
  }
}

/** Propuestas para cada comprobación de la losa steel deck que no cumple o queda justa. */
export function recomendarSteelDeck(campos: Campos): RecomendacionesSteelDeck {
  return recomendarTodas(
    {
      datos: campos,
      calcular: (c) => {
        const r = resolverSteelDeck(c);
        return r.flexion || r.rasante ? r : null;
      },
      utilizaciones,
      nombres: NOMBRES,
    },
    palancasPorClave
  );
}
