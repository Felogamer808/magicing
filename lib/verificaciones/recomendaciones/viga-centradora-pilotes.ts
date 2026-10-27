import {
  resolverVigaCentradoraPilotes,
  type ResueltoVigaCentradoraPilotes,
} from "@/lib/calc/hormigon/cimentaciones/resolver-viga-centradora-pilotes";
import type { ResultadoFlexion } from "@/lib/calc/hormigon/comun/types";
import type { AnclajeSuperiorCentradora } from "@/lib/calc/hormigon/cimentaciones/viga-centradora-pilotes";
import { evaluar, recomendarTodas, siNo, type Palanca, type Recomendacion } from "./motor";
import { CITA_PATILLA, campo, m, palancaDiametro, palancaFck, palancaOpcion, palancaValor, EFECTO_H, type Campos } from "./palancas";
import { RAMAS } from "./vigas-flexion-cortante";

export type ClaveVigaCentradoraPilotes =
  | "flexion"
  | "vano"
  | "diametro"
  | "bielasTramo"
  | "bielasVoladizo"
  | "ramas"
  | "anclaje"
  | "fisuracion";
export type RecomendacionesVigaCentradoraPilotes = Partial<Record<ClaveVigaCentradoraPilotes, Recomendacion[]>>;

const NOMBRES: Record<ClaveVigaCentradoraPilotes, string> = {
  flexion: "flexión en el pilote (armadura superior)",
  vano: "flexión en el tramo (armadura inferior)",
  diametro: "diámetro mínimo",
  bielasTramo: "bielas del alma en el tramo",
  bielasVoladizo: "bielas del voladizo pilar–pilote",
  ramas: "separación transversal entre ramas",
  anclaje: "anclaje de la superior sobre el pilar",
  fisuracion: "fisuración en el pilote",
};

const aprovechamiento = (f: ResultadoFlexion) => (f.sobrearmada ? Infinity : f.aprovechamiento);

/**
 * En U el retorno se dimensiona para completar lbd: lo que se comprueba es
 * que la curva entre en el canto. Con horquillas, la peor entre su área, su
 * propio anclaje y la curva.
 */
export function utilizacionAnclaje(a: AnclajeSuperiorCentradora): number {
  const curva = a.mandril ? a.mandril.ocupaMm / a.mandril.disponibleCantoMm : 0;
  if (a.forma === "u") return curva;
  if (a.horquillas) {
    const hq = a.horquillas;
    return Math.max(hq.asNecCm2 / hq.asRealCm2, hq.lbdHorquillaMm / hq.disponibleHorquillaMm, curva);
  }
  return Math.max(a.lbdMm / a.disponibleMm, curva);
}

function utilizaciones({ r }: ResueltoVigaCentradoraPilotes): Partial<Record<ClaveVigaCentradoraPilotes, number>> {
  const v = r.voladizo;
  return {
    flexion: aprovechamiento(r.flexion),
    ...(r.flexionVano ? { vano: aprovechamiento(r.flexionVano) } : {}),
    diametro: siNo(r.verificaDiametro),
    bielasTramo: r.cortanteTramoKN / r.cortanteTramo.vRdMax,
    bielasVoladizo: v.vEdKN / Math.min(v.vRdMaxKN, v.vLimite65KN),
    ramas: r.cortanteTramo.separacionTransversalM / r.cortanteTramo.separacionTransversalMaxM,
    anclaje: utilizacionAnclaje(r.anclajeSuperior),
    fisuracion: r.fisuracion.resultado.wkMm / r.fisuracion.wMaxMm,
  };
}

function barras(numero: string, diametro: string, rotulo: string): Palanca<Campos>[] {
  return [
    palancaValor(campo(numero), {
      paso: 1,
      tope: (n) => n + 8,
      decimales: 0,
      rotulo,
      texto: (n, e) => `${n} Ø${campo(diametro).leer(e)}`,
    }),
    palancaDiametro(campo(diametro), "mayor", (e, d) => `${campo(numero).leer(e)} Ø${d}`, { rotulo }),
  ];
}

const CANTO = palancaValor(campo("h"), {
  paso: 0.05, tope: (x) => x + 0.5, decimales: 2, rotulo: "h = ", texto: m, efectoColateral: EFECTO_H,
});
const ANCHO = palancaValor(campo("b"), {
  paso: 0.05, tope: (x) => x + 0.5, decimales: 2, rotulo: "b = ", texto: m,
  efectoColateral: "Más sección: crece la armadura mínima y el peso propio.",
});
const FCK = palancaFck(campo("fck"));
const PATILLA = palancaOpcion<Campos>(
  (e) => !e.formaAnclaje || e.formaAnclaje === "recta",
  (e) => ({ ...e, formaAnclaje: "gancho" }),
  "Terminar la superior en patilla a 90° sobre el pilar (hoy recta)",
  { cita: CITA_PATILLA }
);
/** La U siempre completa lbd con su retorno: queda el mandril. */
const EN_U = palancaOpcion<Campos>(
  (e) => e.formaAnclaje !== "u",
  (e) => ({ ...e, formaAnclaje: "u" }),
  "Doblar la superior en U: baja por el extremo y vuelve por abajo lo que falte",
  { cita: "Anejo 19, art. 8.4.3 (3) y 8.3" }
);

function palancasPorClave(clave: ClaveVigaCentradoraPilotes): readonly Palanca<Campos>[] {
  switch (clave) {
    case "flexion":
      return [...barras("numeroSup", "diametroSup", "Superior: "), CANTO];
    case "vano":
      return barras("numeroInf", "diametroInf", "Inferior: ");
    case "diametro":
      return [palancaDiametro(campo("diametroSup"), "mayor", (e, d) => `${campo("numeroSup").leer(e)} Ø${d}`, { rotulo: "Superior: " })];
    case "bielasTramo":
    case "bielasVoladizo":
      return [ANCHO, CANTO, FCK];
    case "ramas":
      return [RAMAS];
    case "anclaje":
      // Más barras bajan σsd y con ella lbd; la patilla suma la pata.
      return [EN_U, PATILLA, ...barras("numeroSup", "diametroSup", "Superior: "), CANTO];
    case "fisuracion":
      // Más barras más finas: más acero y fisuras más juntas.
      return [...barras("numeroSup", "diametroSup", "Superior: "), CANTO];
  }
}

const problema = (campos: Campos) => ({
  datos: campos,
  calcular: resolverVigaCentradoraPilotes,
  utilizaciones,
  nombres: NOMBRES,
  binarias: ["diametro"] as ClaveVigaCentradoraPilotes[],
});

/** Propuestas para cada comprobación que no cumple o queda justa. */
export function recomendarVigaCentradoraPilotes(campos: Campos): RecomendacionesVigaCentradoraPilotes {
  return recomendarTodas(problema(campos), palancasPorClave);
}

/** Todas las comprobaciones con su utilización; `null` si los datos no son válidos. */
export function comprobarVigaCentradoraPilotes(campos: Campos) {
  return evaluar(problema(campos));
}
