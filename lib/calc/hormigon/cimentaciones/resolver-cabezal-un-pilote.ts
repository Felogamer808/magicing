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
    nCercos: num("nCercos"), phiCercos: num("phiCercos"),
    recubrimiento: num("recubrimiento"),
    phiEstribosX: num("phiEstribosX"), sEstribosX: num("sEstribosX"),
    phiEstribosY: num("phiEstribosY"), sEstribosY: num("sEstribosY"),
  };
  if (!Object.values(n).every((x) => Number.isFinite(x) && x > 0)) return null;
  // El pilar y el pilote tienen que caber en el cabezal.
  if (n.pilarX > n.ladoX || n.pilarY > n.ladoY || n.dPilote > Math.min(n.ladoX, n.ladoY)) return null;
  // Los estribos tienen que entrar en el canto: z = H − 2·d' > 0.
  if (n.hCab <= 2 * (n.recubrimiento + Math.max(n.phiEstribosX, n.phiEstribosY) / 2000)) return null;

  // Los cercos se cargan como se arman: un diámetro y la cantidad en todo el
  // canto. Cada mitad se queda con la mitad; con una cantidad impar, el del
  // medio cae a media altura y no se cuenta en ninguna (criterio conservador).
  const porMitad = Math.floor(n.nCercos / 2);

  const materiales = derivarMateriales({ fck: n.fck, fyk: n.fyk });
  const r = calcularCabezalUnPilote(
    materiales,
    { pilarXM: n.pilarX, pilarYM: n.pilarY, ladoXM: n.ladoX, ladoYM: n.ladoY, hM: n.hCab, diametroPiloteM: n.dPilote },
    {
      ndPilarKN: n.ndPilar,
      cercosSuperiores: { numero: porMitad, diametroMm: n.phiCercos },
      cercosInferiores: { numero: porMitad, diametroMm: n.phiCercos },
      recubrimientoM: n.recubrimiento,
      estribosX: { diametroMm: n.phiEstribosX, separacionM: n.sEstribosX },
      estribosY: { diametroMm: n.phiEstribosY, separacionM: n.sEstribosY },
    }
  );
  return { n, r };
}

export type ResueltoCabezalUnPilote = NonNullable<ReturnType<typeof resolverCabezalUnPilote>>;
