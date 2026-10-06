import { aNumero } from "@/lib/verificaciones/formato";
import { calcularCabezalDosPilotes } from "@/lib/calc/hormigon/cimentaciones/cabezal-pilotes";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";

/**
 * Cálculo de la página a partir de sus campos, tal como se cargaron.
 *
 * Vive acá y no en la página porque lo corren la pantalla y las
 * recomendaciones, que lo repiten con un dato cambiado: con dos copias, tarde
 * o temprano dirían números distintos.
 */
export function resolverCabezal(campos: Record<string, string>) {
  const num = (clave: string) => aNumero(campos[clave] ?? "");

  const n = {
    fck: num("fck"), fyk: num("fyk"), rg: num("rg"),
    anchoPilar: num("anchoPilar"), ladoX: num("ladoX"), ladoY: num("ladoY"),
    hCab: num("hCab"), dPilote: num("dPilote"), ndPilar: num("ndPilar"),
    nPrinc: num("nPrinc"), phiPrinc: num("phiPrinc"),
    nSec: num("nSec"), phiSec: num("phiSec"),
    nEstV: num("nEstV"), phiEstV: num("phiEstV"), nCercos: num("nCercos"),
    nEstH: num("nEstH"), phiEstH: num("phiEstH"),
  };
  if (!Object.values(n).every((x) => Number.isFinite(x) && x >= 0)) return null;
  if (n.fck <= 0 || n.fyk <= 0 || n.anchoPilar <= 0 || n.ladoX <= 0 || n.ladoY <= 0 || n.hCab <= 0 || n.dPilote <= 0 || n.ndPilar <= 0) return null;
  if ([n.nPrinc, n.phiPrinc, n.nSec, n.phiSec, n.nEstV, n.phiEstV, n.nCercos, n.nEstH, n.phiEstH].some((x) => x <= 0)) return null;
  if (n.nPrinc < 2 || n.nSec < 2) return null;

  const materiales = derivarMateriales({ fck: n.fck, fyk: n.fyk });
  const r = calcularCabezalDosPilotes(
    materiales,
    { anchoPilarM: n.anchoPilar, ladoXM: n.ladoX, ladoYM: n.ladoY, hM: n.hCab, diametroPiloteM: n.dPilote, recubrimientoM: n.rg },
    {
      ndPilarKN: n.ndPilar,
      armaduraPrincipal: { numero: n.nPrinc, diametroMm: n.phiPrinc },
      armaduraSecundaria: { numero: n.nSec, diametroMm: n.phiSec },
      estribosVerticales: { numero: n.nEstV, diametroMm: n.phiEstV, numeroCercos: n.nCercos },
      estribosHorizontales: { numero: n.nEstH, diametroMm: n.phiEstH },
    }
  );
  return { n, r };
}

export type ResueltoCabezal = NonNullable<ReturnType<typeof resolverCabezal>>;
