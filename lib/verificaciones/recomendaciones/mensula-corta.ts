import { resolverMensulaCorta, type ResueltoMensulaCorta } from "@/lib/calc/hormigon/resolver-mensula-corta";
import { recomendarTodas, type Palanca, type Recomendacion } from "./motor";
import { CITA_LBD_DIAMETRO, campo, m, palancaDiametro, palancaFck, palancaValor, type Campos } from "./palancas";

export type ClaveMensula =
  | "nudo"
  | "biela"
  | "cortanteMaximo"
  | "tirante"
  | "cercos"
  | "anclajeMensula"
  | "anclajePilar";
export type RecomendacionesMensula = Partial<Record<ClaveMensula, Recomendacion[]>>;

const NOMBRES: Record<ClaveMensula, string> = {
  nudo: "nudo bajo la placa",
  biela: "biela comprimida",
  cortanteMaximo: "tope del cortante",
  tirante: "armadura del tirante",
  cercos: "cercos",
  anclajeMensula: "anclaje en la ménsula",
  anclajePilar: "anclaje en el pilar",
};

function utilizaciones({ r }: ResueltoMensulaCorta): Partial<Record<ClaveMensula, number>> {
  const h = r.hormigon;
  return {
    nudo: h.nudo.sigmaMPa / h.nudo.sigmaMaxMPa,
    biela: h.biela.sigmaMPa / h.biela.sigmaMaxMPa,
    cortanteMaximo: h.cortanteMaximo.sigmaMPa / h.cortanteMaximo.sigmaMaxMPa,
    tirante: r.tirante.asNecCm2 / r.tirante.asRealCm2,
    // Sin cercos exigidos (art. J.3(3)) no hay nada que proponer.
    ...(r.cercos.requeridos ? { cercos: r.cercos.asNecCm2 / r.cercos.asRealCm2 } : {}),
    anclajeMensula: r.anclaje.lbdMensulaMm / r.anclaje.disponibleMensulaMm,
    anclajePilar: r.anclaje.lbdPilarMm / r.anclaje.disponiblePilarMm,
  };
}

// ── Palancas ────────────────────────────────────────────────────────────────

const metros = (nombre: string, rotulo: string, extra: number, efectoColateral?: string) =>
  palancaValor(campo(nombre), { paso: 0.05, tope: (x) => x + extra, decimales: 2, rotulo, texto: m, efectoColateral });

const ANCHO = metros("b", "b = ", 0.6, "Ménsula más ancha: el pilar tiene que acompañar.");
const CANTO = metros("hc", "hc = ", 0.6, "Más canto en el arranque.");
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
    case "cortanteMaximo":
      return [ANCHO, CANTO, FCK];
    case "tirante":
      return [PRINCIPAL_MAYOR];
    case "cercos":
      return [CERCO_MAYOR];
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
