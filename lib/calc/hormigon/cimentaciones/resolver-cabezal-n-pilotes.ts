import { aNumero } from "@/lib/verificaciones/formato";
import { calcularCabezalNPilotes, type PiloteCabezal } from "@/lib/calc/hormigon/cimentaciones/cabezal-n-pilotes";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";

/**
 * Los centros de los pilotes tal como se escriben en el campo: un pilote por
 * línea o separados por «;», con A y B separados por espacios (m, desde el
 * centro del cabezal). La coma decimal vale, como en el resto de los campos.
 * null si alguno no se entiende.
 */
export function leerPilotes(texto: string): PiloteCabezal[] | null {
  const filas = texto.split(/[;\r\n]+/).map((f) => f.trim()).filter(Boolean);
  const pilotes = filas.map((f) => {
    const partes = f.split(/\s+/);
    if (partes.length !== 2) return null;
    const [aM, bM] = partes.map((p) => aNumero(p));
    return Number.isFinite(aM) && Number.isFinite(bM) ? { aM, bM } : null;
  });
  return pilotes.every((p) => p !== null) ? (pilotes as PiloteCabezal[]) : null;
}

/** Al revés que `leerPilotes`, para escribir el campo desde la planta. */
export function escribirPilotes(pilotes: readonly PiloteCabezal[]): string {
  const r = (x: number) => String(Math.round(x * 1000) / 1000);
  return pilotes.map((p) => `${r(p.aM)} ${r(p.bM)}`).join("; ");
}

/**
 * Cálculo de la página a partir de sus campos, tal como se cargaron. Lo usan
 * la pantalla, las recomendaciones, el MCP y el estado de los proyectos: una
 * sola copia para que no digan números distintos.
 */
export function resolverCabezalNPilotes(campos: Record<string, string>) {
  const num = (clave: string) => aNumero(campos[clave] ?? "");

  const n = {
    fck: num("fck"), fyk: num("fyk"), rg: num("rg"),
    pilarA: num("pilarA"), pilarB: num("pilarB"),
    ladoA: num("ladoA"), ladoB: num("ladoB"), hCab: num("hCab"),
    dPilote: num("dPilote"), ndPilar: num("ndPilar"),
    nA: num("nA"), phiA: num("phiA"), nB: num("nB"), phiB: num("phiB"),
    phiEstV: num("phiEstV"), sEstV: num("sEstV"),
    nEstH: num("nEstH"), phiEstH: num("phiEstH"),
    phiPar: num("phiPar"), sPar: num("sPar"), phiSup: num("phiSup"), sSup: num("sSup"),
  };
  if (!Object.values(n).every((x) => Number.isFinite(x) && x > 0)) return null;
  if (n.nA < 2 || n.nB < 2) return null;
  const pilotes = leerPilotes(campos.pilotes ?? "");
  if (!pilotes || pilotes.length < 3) return null;

  const materiales = derivarMateriales({ fck: n.fck, fyk: n.fyk });
  const r = calcularCabezalNPilotes(
    materiales,
    {
      ladoAM: n.ladoA, ladoBM: n.ladoB, hM: n.hCab, pilarAM: n.pilarA, pilarBM: n.pilarB,
      diametroPiloteM: n.dPilote, recubrimientoM: n.rg, pilotes,
    },
    {
      ndPilarKN: n.ndPilar,
      armaduraA: { numero: n.nA, diametroMm: n.phiA },
      armaduraB: { numero: n.nB, diametroMm: n.phiB },
      estriboVerticalMm: n.phiEstV,
      separacionVerticalM: n.sEstV,
      estribosHorizontales: { numero: n.nEstH, diametroMm: n.phiEstH },
      parrilla: { diametroMm: n.phiPar, separacionM: n.sPar },
      superior: { diametroMm: n.phiSup, separacionM: n.sSup },
      formaAnclaje: campos.formaAnclaje === "gancho" ? "gancho" : "recta",
    }
  );
  // Un pilote fuera del cabezal es un dato mal cargado, no un resultado.
  if (!r.geometriaValida) return null;
  return { n, r, pilotes };
}

export type ResueltoCabezalNPilotes = NonNullable<ReturnType<typeof resolverCabezalNPilotes>>;
