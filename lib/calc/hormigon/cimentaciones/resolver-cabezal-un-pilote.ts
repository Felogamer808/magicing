import { aNumero } from "@/lib/verificaciones/formato";
import { calcularCabezalUnPilote } from "@/lib/calc/hormigon/cimentaciones/cabezal-un-pilote";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";

/**
 * Cálculo de la página a partir de sus campos, tal como se cargaron. Lo usan
 * la pantalla, las recomendaciones, el MCP y el estado de los proyectos: una
 * sola copia para que no digan números distintos.
 */
export function resolverCabezalUnPilote(campos: Record<string, string>) {
  const num = (clave: string) => aNumero(campos[clave] ?? "");

  const n = {
    fck: num("fck"), fyk: num("fyk"),
    pilarX: num("pilarX"), pilarY: num("pilarY"),
    ladoX: num("ladoX"), ladoY: num("ladoY"), hCab: num("hCab"),
    dPilote: num("dPilote"), ndPilar: num("ndPilar"),
    nCercosSup: num("nCercosSup"), phiCercosSup: num("phiCercosSup"),
    nCercosInf: num("nCercosInf"), phiCercosInf: num("phiCercosInf"),
  };
  if (!Object.values(n).every((x) => Number.isFinite(x) && x > 0)) return null;
  // El pilar y el pilote tienen que caber en el cabezal.
  if (n.pilarX > n.ladoX || n.pilarY > n.ladoY || n.dPilote > Math.min(n.ladoX, n.ladoY)) return null;

  const materiales = derivarMateriales({ fck: n.fck, fyk: n.fyk });
  const r = calcularCabezalUnPilote(
    materiales,
    { pilarXM: n.pilarX, pilarYM: n.pilarY, ladoXM: n.ladoX, ladoYM: n.ladoY, hM: n.hCab, diametroPiloteM: n.dPilote },
    {
      ndPilarKN: n.ndPilar,
      cercosSuperiores: { numero: n.nCercosSup, diametroMm: n.phiCercosSup },
      cercosInferiores: { numero: n.nCercosInf, diametroMm: n.phiCercosInf },
    }
  );
  return { n, r };
}

export type ResueltoCabezalUnPilote = NonNullable<ReturnType<typeof resolverCabezalUnPilote>>;
