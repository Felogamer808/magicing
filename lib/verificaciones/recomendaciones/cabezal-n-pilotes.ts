import {
  resolverCabezalNPilotes,
  type ResueltoCabezalNPilotes,
} from "@/lib/calc/hormigon/cimentaciones/resolver-cabezal-n-pilotes";
import type { ResultadoDireccionCabezalN } from "@/lib/calc/hormigon/cimentaciones/cabezal-n-pilotes";
import { evaluar, recomendarTodas, type Palanca, type Recomendacion } from "./motor";
import { CITA_PATILLA, campo, m, palancaDiametro, palancaFck, palancaOpcion, palancaValor, type Campos } from "./palancas";

export type ClaveCabezalNPilotes =
  | "tiranteA" | "tiranteB" | "anclajeA" | "anclajeB" | "anchoA" | "anchoB" | "biela" | "nudo" | "malla" | "parrilla" | "superior";
export type RecomendacionesCabezalNPilotes = Partial<Record<ClaveCabezalNPilotes, Recomendacion[]>>;

const NOMBRES: Record<ClaveCabezalNPilotes, string> = {
  tiranteA: "tirante en A",
  tiranteB: "tirante en B",
  anclajeA: "anclaje del tirante en A",
  anclajeB: "anclaje del tirante en B",
  anchoA: "barras de A en el ancho",
  anchoB: "barras de B en el ancho",
  biela: "bielas",
  nudo: "nudos sobre los pilotes",
  malla: "malla de las caras",
  parrilla: "parrilla entre bandas (criterio)",
  superior: "armadura superior (criterio)",
};

// Sin tirante (ningún pilote más allá de a/4) no hay nada que anclar.
const anclaje = (d: ResultadoDireccionCabezalN) => (d.tdKN > 0 ? d.lbdMm / d.disponibleAnclajeMm : 0);

function utilizaciones({ r, n }: ResueltoCabezalNPilotes): Record<ClaveCabezalNPilotes, number> {
  const { malla: mm } = r;
  return {
    tiranteA: r.direccionA.asNecCm2 / r.direccionA.asRealCm2,
    tiranteB: r.direccionB.asNecCm2 / r.direccionB.asRealCm2,
    anclajeA: anclaje(r.direccionA),
    anclajeB: anclaje(r.direccionB),
    anchoA: r.direccionA.bNecM / n.ladoB,
    anchoB: r.direccionB.bNecM / n.ladoA,
    biela: Math.max(...r.pilotes.map((p) => p.sigmaBielaMPa)) / r.sigmaBielaMaxMPa,
    nudo: Math.max(...r.pilotes.map((p) => p.sigmaNudoMPa / p.sigmaNudoMaxMPa)),
    malla: Math.max(
      mm.asNecCm2 / mm.asVerticalCm2,
      mm.asNecCm2 / mm.asHorizontalCm2,
      n.sEstV / mm.separacionMaxM,
      mm.separacionHorizontalM / mm.separacionMaxM
    ),
    parrilla: Math.max(r.parrillaA.asNecCm2 / r.parrillaA.asRealCm2, r.parrillaB.asNecCm2 / r.parrillaB.asRealCm2),
    superior: Math.max(r.superiorA.asNecCm2 / r.superiorA.asRealCm2, r.superiorB.asNecCm2 / r.superiorB.asRealCm2),
  };
}

function barras(numero: string, phi: string, rotulo: string): Palanca<Campos>[] {
  return [
    palancaValor(campo(numero), {
      paso: 1,
      tope: (x) => x + 12,
      decimales: 0,
      rotulo,
      texto: (x, e) => `${x} Ø${campo(phi).leer(e)}`,
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
  efectoColateral: "Más canto: las bielas se paran y baja la tracción de los tirantes.",
});
const FCK = palancaFck(campo("fck"));
const PATILLA = palancaOpcion<Campos>(
  (e) => e.formaAnclaje !== "gancho",
  (e) => ({ ...e, formaAnclaje: "gancho" }),
  "Terminar los tirantes en patilla a 90° (hoy rectos)",
  { cita: CITA_PATILLA }
);
const lado = (clave: "ladoA" | "ladoB", rotulo: string) =>
  palancaValor(campo(clave), {
    paso: 0.05,
    tope: (a) => a + 1,
    decimales: 2,
    rotulo,
    texto: m,
    efectoColateral: "Cabezal más grande: más hormigón.",
  });
const pilar = (clave: "pilarA" | "pilarB", rotulo: string) =>
  palancaValor(campo(clave), {
    paso: 0.05,
    tope: (a) => a + 0.5,
    decimales: 2,
    rotulo,
    texto: m,
    efectoColateral: "Cambia la sección del pilar: hay que revisarlo también.",
  });
/** Achicar la separación de una malla, hasta 5 cm. */
const separacion = (clave: string, rotulo: string) =>
  palancaValor(campo(clave), { paso: -0.025, tope: () => 0.05, decimales: 3, rotulo, texto: m });
const MALLA_V = separacion("sEstV", "Cercos verticales cada ");
const mallaDiametro = (phi: string, rotulo: string) => palancaDiametro(campo(phi), "mayor", (_, d) => `${rotulo}Ø${d}`);

function palancasPorClave(clave: ClaveCabezalNPilotes): readonly Palanca<Campos>[] {
  switch (clave) {
    case "tiranteA":
      return [...barras("nA", "phiA", "Armadura en A: "), CANTO];
    case "tiranteB":
      return [...barras("nB", "phiB", "Armadura en B: "), CANTO];
    case "anclajeA":
      return [PATILLA, ...barras("nA", "phiA", "Armadura en A: "), lado("ladoA", "lado A = ")];
    case "anclajeB":
      return [PATILLA, ...barras("nB", "phiB", "Armadura en B: "), lado("ladoB", "lado B = ")];
    case "anchoA":
      return [lado("ladoB", "lado B = ")];
    case "anchoB":
      return [lado("ladoA", "lado A = ")];
    case "biela":
      return [CANTO, pilar("pilarA", "pilar en A = "), pilar("pilarB", "pilar en B = "), FCK];
    case "nudo":
      return [FCK];
    case "malla":
      return [MALLA_V, ...barras("nEstH", "phiEstH", "Cercos horizontales: "), mallaDiametro("phiEstV", "Cercos verticales ")];
    case "parrilla":
      return [separacion("sPar", "Parrilla cada "), mallaDiametro("phiPar", "Parrilla ")];
    case "superior":
      return [separacion("sSup", "Superior cada "), mallaDiametro("phiSup", "Superior ")];
  }
}

const problema = (campos: Campos) => ({ datos: campos, calcular: resolverCabezalNPilotes, utilizaciones, nombres: NOMBRES });

/** Propuestas para cada comprobación del cabezal que no cumple o queda justa. */
export function recomendarCabezalNPilotes(campos: Campos): RecomendacionesCabezalNPilotes {
  return recomendarTodas(problema(campos), palancasPorClave);
}

/** Todas las comprobaciones con su utilización; `null` si los datos no son válidos. */
export function comprobarCabezalNPilotes(campos: Campos) {
  return evaluar(problema(campos));
}
