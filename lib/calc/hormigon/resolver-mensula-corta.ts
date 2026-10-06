import { aNumero } from "@/lib/verificaciones/formato";
import { calcularMensulaCorta } from "@/lib/calc/hormigon/mensula-corta";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";

/**
 * Cálculo de la página a partir de sus campos, tal como se cargaron.
 *
 * Vive acá y no en la página porque lo corren la pantalla y las
 * recomendaciones, que lo repiten con un dato cambiado: con dos copias, tarde
 * o temprano dirían números distintos.
 */
export function resolverMensulaCorta(campos: Record<string, string>) {
  const num = (clave: string) => aNumero(campos[clave] ?? "");

  const g = {
    acM: num("ac"),
    hcM: num("hc"),
    h1M: num("h1"),
    bM: num("b"),
    hcolM: num("hcol"),
    apM: num("ap"),
    bpM: num("bp"),
    recubrimientoM: num("rec"),
  };
  const fEdKN = num("fEd");
  const hEdKN = (campos.modoH ?? "").startsWith("H = 0,15") ? 0.15 * fEdKN : num("hEd");
  const fckMPa = num("fck");
  const fykMPa = num("fyk");

  const numeros = [...Object.values(g), fEdKN, hEdKN, fckMPa, fykMPa];
  if (numeros.some((n) => !Number.isFinite(n))) return null;
  // Sin canto no hay canto útil, y sin ancho de placa el nudo divide por cero.
  if (g.hcM <= 0 || g.bM <= 0 || g.acM <= 0 || g.apM <= 0 || g.bpM <= 0) return null;
  if (g.hcolM <= 0 || g.h1M <= 0 || fckMPa <= 0 || fykMPa <= 0 || fEdKN <= 0) return null;

  const materiales = derivarMateriales({ fck: fckMPa, fyk: fykMPa });
  const r = calcularMensulaCorta(materiales, g, {
    fEdKN,
    hEdKN,
    diametroPrincipalMm: num("phiP"),
    diametroCercoMm: num("phiE"),
    condicionAdherencia: campos.adherencia === "Buena" ? "buena" : "mala",
    barraTransversalSoldada: campos.soldada === "Sí",
  });
  // El canto útil puede salir negativo si el recubrimiento se come la pieza.
  if (r.modelo.dM <= 0) return null;
  return { r, geometria: g, fEdKN, hEdKN };
}

export type ResueltoMensulaCorta = NonNullable<ReturnType<typeof resolverMensulaCorta>>;
