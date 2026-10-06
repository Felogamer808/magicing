import { resolverMensulaCorta, type ResueltoMensulaCorta } from "@/lib/calc/hormigon/resolver-mensula-corta";
import { recomendarTodas, type Palanca, type Recomendacion } from "./motor";
import { CITA_LBD_DIAMETRO, campo, m, palancaDiametro, palancaFck, palancaValor, type Campos } from "./palancas";

export type ClaveMensula =
  | "nudo"
  | "biela"
  | "tangencial"
  | "tirante"
  | "cuantiaMecanica"
  | "cercos"
  | "cercosH"
  | "degollamiento"
  | "anclajeMensula"
  | "anclajePilar";
export type RecomendacionesMensula = Partial<Record<ClaveMensula, Recomendacion[]>>;

const NOMBRES: Record<ClaveMensula, string> = {
  nudo: "nudo bajo la placa",
  biela: "biela comprimida",
  tangencial: "tensión tangencial",
  tirante: "armadura del tirante",
  cuantiaMecanica: "cuantía mecánica mínima",
  cercos: "cercos",
  cercosH: "cercos horizontales",
  degollamiento: "canto útil en el borde",
  anclajeMensula: "anclaje en la ménsula",
  anclajePilar: "anclaje en el pilar",
};

function utilizaciones({ r }: ResueltoMensulaCorta): Partial<Record<ClaveMensula, number>> {
  const h = r.hormigon;
  return {
    nudo: h.nudo.sigmaMPa / h.nudo.sigmaMaxMPa,
    biela: h.biela.sigmaMPa / h.biela.sigmaMaxMPa,
    tangencial: h.tangencial.sigmaMPa / h.tangencial.sigmaMaxMPa,
    tirante: r.tirante.asNecCm2 / r.tirante.asRealCm2,
    cuantiaMecanica: r.tirante.asMecanicaAciCm2 / r.tirante.asRealCm2,
    cercos: r.cercos.asNecCm2 / r.cercos.asRealCm2,
    ...(r.cercos.horizontales ? { cercosH: r.cercos.horizontales.asNecCm2 / r.cercos.horizontales.asRealCm2 } : {}),
    degollamiento: h.d0MinM / h.d0M,
    anclajeMensula: r.anclaje.lbdMensulaMm / r.anclaje.disponibleMensulaMm,
    anclajePilar: r.anclaje.lbdPilarMm / r.anclaje.disponiblePilarMm,
  };
}

// ── Palancas ────────────────────────────────────────────────────────────────

const metros = (nombre: string, rotulo: string, extra: number, efectoColateral?: string) =>
  palancaValor(campo(nombre), { paso: 0.05, tope: (x) => x + extra, decimales: 2, rotulo, texto: m, efectoColateral });

const ANCHO = metros("b", "b = ", 0.6, "Ménsula más ancha: el pilar tiene que acompañar.");
const CANTO = metros("hc", "hc = ", 0.6, "Más canto en el arranque.");
const CANTO_BORDE = metros("h1", "h1 = ", 0.5, "Más canto en el borde libre.");
const PLACA_A = metros("ap", "Placa a = ", 0.4, "Placa de apoyo más grande.");
const PLACA_B = metros("bp", "Placa b = ", 0.4, "Placa de apoyo más grande.");
const PILAR = metros("hcol", "Pilar = ", 0.5, "Pilar más grande: hay que revisarlo también.");
const FCK = palancaFck(campo("fck"));

const PRINCIPAL_MAYOR = palancaDiametro(campo("phiP"), "mayor", (_, d) => `Ø${d}`, { rotulo: "Tirante " });
const PRINCIPAL_MENOR = palancaDiametro(campo("phiP"), "menor", (_, d) => `Ø${d}`, {
  rotulo: "Tirante ",
  efectoColateral: "Más barras para la misma área: la herramienta las recalcula.",
  cita: CITA_LBD_DIAMETRO,
});
const CERCO_MAYOR = palancaDiametro(campo("phiE"), "mayor", (_, d) => `Ø${d}`, { rotulo: "Cercos " });

function palancasPorClave(clave: ClaveMensula): readonly Palanca<Campos>[] {
  switch (clave) {
    case "nudo":
      return [PLACA_A, PLACA_B, FCK];
    case "biela":
    case "tangencial":
      return [ANCHO, CANTO, FCK];
    case "tirante":
    case "cuantiaMecanica":
      return [PRINCIPAL_MAYOR];
    case "cercos":
    case "cercosH":
      return [CERCO_MAYOR];
    case "degollamiento":
      return [CANTO_BORDE];
    case "anclajeMensula":
      return [PRINCIPAL_MENOR];
    case "anclajePilar":
      return [PRINCIPAL_MENOR, PILAR];
  }
}

/** Propuestas para cada comprobación de la ménsula corta que no cumple o queda justa. */
export function recomendarMensulaCorta(campos: Campos): RecomendacionesMensula {
  return recomendarTodas({ datos: campos, calcular: resolverMensulaCorta, utilizaciones, nombres: NOMBRES }, palancasPorClave);
}
