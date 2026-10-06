import { resolverCabezal, type ResueltoCabezal } from "@/lib/calc/hormigon/cimentaciones/resolver-cabezal";
import { recomendarTodas, type Palanca, type Recomendacion } from "./motor";
import { campo, m, palancaDiametro, palancaFck, palancaValor, type Campos } from "./palancas";

export type ClaveCabezal = "tirante" | "biela" | "nudo" | "secundaria" | "estribosV" | "estribosH" | "ancho";
export type RecomendacionesCabezal = Partial<Record<ClaveCabezal, Recomendacion[]>>;

const NOMBRES: Record<ClaveCabezal, string> = {
  tirante: "tirante",
  biela: "biela",
  nudo: "nudo sobre el pilote",
  secundaria: "armadura secundaria",
  estribosV: "estribos verticales",
  estribosH: "estribos horizontales",
  ancho: "barras en el ancho",
};

const utilizaciones = ({ r, n }: ResueltoCabezal): Record<ClaveCabezal, number> => ({
  tirante: r.principal.asNecCm2 / r.principal.asRealCm2,
  biela: r.bielas.sigmaBielaMPa / r.bielas.sigmaBielaMaxMPa,
  nudo: r.bielas.sigmaNudoMPa / r.bielas.sigmaNudoMaxMPa,
  secundaria: r.secundaria.asNecCm2 / r.secundaria.asRealCm2,
  estribosV: r.estribosVerticales.asNecCm2 / r.estribosVerticales.asRealCm2,
  estribosH: r.estribosHorizontales.asNecCm2 / r.estribosHorizontales.asRealCm2,
  ancho: r.principal.bNecM / n.ladoY,
});

/** Más barras del grupo y un diámetro mayor, para cada armadura del cabezal. */
function barras(numero: string, phi: string, rotulo: string): Palanca<Campos>[] {
  return [
    palancaValor(campo(numero), {
      paso: 1,
      tope: (n) => n + 12,
      decimales: 0,
      rotulo,
      texto: (n, e) => `${n} Ø${campo(phi).leer(e)}`,
    }),
    palancaDiametro(campo(phi), "mayor", (e, d) => `${campo(numero).leer(e)} Ø${d}`, { rotulo }),
  ];
}

const CANTO = palancaValor(campo("hCab"), {
  paso: 0.05,
  tope: (h) => h + 1,
  decimales: 2,
  rotulo: "h = ",
  texto: m,
  efectoColateral: "Más canto: las bielas se paran y baja la tracción del tirante.",
});
const FCK = palancaFck(campo("fck"));
const PILAR = palancaValor(campo("anchoPilar"), {
  paso: 0.05,
  tope: (a) => a + 0.5,
  decimales: 2,
  rotulo: "ancho del pilar = ",
  texto: m,
  efectoColateral: "Cambia la sección del pilar: hay que revisarlo también.",
});
const LADO_Y = palancaValor(campo("ladoY"), {
  paso: 0.05,
  tope: (a) => a + 1,
  decimales: 2,
  rotulo: "lado y = ",
  texto: m,
  efectoColateral: "Cabezal más ancho: más hormigón.",
});

/** Menos barras más gruesas con al menos la misma área: piden menos ancho. */
const MENOS_GRUESAS: Palanca<Campos> = {
  efectoColateral: "Diámetro mayor: pide más anclaje sobre el pilote.",
  *candidatos(e) {
    const n0 = campo("nPrinc").leer(e);
    const d0 = campo("phiPrinc").leer(e);
    for (const p of palancaDiametro(campo("phiPrinc"), "mayor", () => "").candidatos(e)) {
      const d = campo("phiPrinc").leer(p.datos);
      const n = Math.max(2, Math.ceil(n0 * (d0 / d) ** 2));
      if (n >= n0) continue;
      yield { datos: { ...p.datos, nPrinc: String(n) }, accion: `Tirante: ${n} Ø${d} (hoy ${n0} Ø${d0})` };
    }
  },
};

function palancasPorClave(clave: ClaveCabezal): readonly Palanca<Campos>[] {
  switch (clave) {
    case "tirante":
      return [...barras("nPrinc", "phiPrinc", "Tirante: "), CANTO];
    case "biela":
      return [CANTO, PILAR, FCK];
    case "nudo":
      return [FCK, CANTO];
    case "secundaria":
      return barras("nSec", "phiSec", "Secundaria: ");
    case "estribosV":
      return barras("nEstV", "phiEstV", "Estribos verticales: ");
    case "estribosH":
      return barras("nEstH", "phiEstH", "Estribos horizontales: ");
    case "ancho":
      return [MENOS_GRUESAS, LADO_Y];
  }
}

/** Propuestas para cada comprobación del cabezal que no cumple o queda justa. */
export function recomendarCabezal(campos: Campos): RecomendacionesCabezal {
  return recomendarTodas({ datos: campos, calcular: resolverCabezal, utilizaciones, nombres: NOMBRES }, palancasPorClave);
}
