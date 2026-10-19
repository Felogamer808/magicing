import {
  resolverCabezalUnPilote,
  type ResueltoCabezalUnPilote,
} from "@/lib/calc/hormigon/cimentaciones/resolver-cabezal-un-pilote";
import type { ResultadoZonaCabezalUnPilote } from "@/lib/calc/hormigon/cimentaciones/cabezal-un-pilote";
import { evaluar, recomendarTodas, type Palanca, type Recomendacion } from "./motor";
import { campo, m, palancaDiametro, palancaFck, palancaValor, EFECTO_PILAR, type Campos } from "./palancas";

export type ClaveCabezalUnPilote = "pilar" | "pilote" | "rangoSup" | "rangoInf" | "cercosSup" | "cercosInf";
export type RecomendacionesCabezalUnPilote = Partial<Record<ClaveCabezalUnPilote, Recomendacion[]>>;

const NOMBRES: Record<ClaveCabezalUnPilote, string> = {
  pilar: "compresión bajo el pilar",
  pilote: "compresión sobre el pilote",
  rangoSup: "mitad superior dentro de la ec. 6.59",
  rangoInf: "mitad inferior dentro de la ec. 6.59",
  cercosSup: "cercos de la mitad superior",
  cercosInf: "cercos de la mitad inferior",
};

/**
 * a / (H/2) en las direcciones con discontinuidad total, que son las que
 * tienen el tope a ≤ h de la fig. A19.6.25b. Con discontinuidad parcial en las
 * dos no hay tope y la comprobación no aplica.
 */
function rango(zona: ResultadoZonaCabezalUnPilote, hCab: number): number | undefined {
  const us = [zona.x, zona.y].filter((t) => t.discontinuidad === "total").map((t) => t.aM / (hCab / 2));
  return us.length ? Math.max(...us) : undefined;
}

const cercos = (zona: ResultadoZonaCabezalUnPilote) => Math.max(zona.x.asNecCm2, zona.y.asNecCm2) / zona.x.asRealCm2;

function utilizaciones({ r, n }: ResueltoCabezalUnPilote): Partial<Record<ClaveCabezalUnPilote, number>> {
  const u: Partial<Record<ClaveCabezalUnPilote, number>> = {
    pilar: r.compresionPilar.fEdKN / r.compresionPilar.fRduKN,
    pilote: r.compresionPilote.fEdKN / r.compresionPilote.fRduKN,
  };
  const rSup = rango(r.superior, n.hCab);
  const rInf = rango(r.inferior, n.hCab);
  if (rSup !== undefined) u.rangoSup = rSup;
  if (rInf !== undefined) u.rangoInf = rInf;
  u.cercosSup = cercos(r.superior);
  u.cercosInf = cercos(r.inferior);
  return u;
}

function barras(numero: string, phi: string, rotulo: string): Palanca<Campos>[] {
  return [
    palancaValor(campo(numero), {
      paso: 1,
      tope: (x) => x + 10,
      decimales: 0,
      rotulo,
      texto: (x, e) => `${x} cercos Ø${campo(phi).leer(e)}`,
    }),
    palancaDiametro(campo(phi), "mayor", (e, d) => `${campo(numero).leer(e)} cercos Ø${d}`, { rotulo }),
  ];
}

const CANTO = palancaValor(campo("hCab"), {
  paso: 0.05,
  tope: (h) => h + 1,
  decimales: 2,
  rotulo: "H = ",
  texto: m,
  efectoColateral: "Más canto: más hormigón y excavación, y el pilote baja.",
});
const FCK = palancaFck(campo("fck"));
const lado = (clave: "ladoX" | "ladoY", rotulo: string) =>
  palancaValor(campo(clave), {
    paso: 0.05,
    tope: (a) => a + 1,
    decimales: 2,
    rotulo,
    texto: m,
    efectoColateral: "Cabezal más grande: más hormigón.",
  });
const PILAR_X = palancaValor(campo("pilarX"), {
  paso: 0.05,
  tope: (a) => a + 0.5,
  decimales: 2,
  rotulo: "pilar x = ",
  texto: m,
  efectoColateral: EFECTO_PILAR,
});

function palancasPorClave(clave: ClaveCabezalUnPilote): readonly Palanca<Campos>[] {
  switch (clave) {
    case "pilar":
      return [FCK, PILAR_X, CANTO];
    case "pilote":
      return [FCK, lado("ladoX", "lado x = "), lado("ladoY", "lado y = ")];
    case "rangoSup":
    case "rangoInf":
      return [CANTO];
    case "cercosSup":
      return barras("nCercosSup", "phiCercosSup", "Mitad superior: ");
    case "cercosInf":
      return barras("nCercosInf", "phiCercosInf", "Mitad inferior: ");
  }
}

const problema = (campos: Campos) => ({
  datos: campos,
  calcular: resolverCabezalUnPilote,
  utilizaciones,
  nombres: NOMBRES,
});

/** Propuestas para cada comprobación que no cumple o queda justa. */
export function recomendarCabezalUnPilote(campos: Campos): RecomendacionesCabezalUnPilote {
  return recomendarTodas(problema(campos), palancasPorClave);
}

/** Todas las comprobaciones con su utilización; `null` si los datos no son válidos. */
export function comprobarCabezalUnPilote(campos: Campos) {
  return evaluar(problema(campos));
}
