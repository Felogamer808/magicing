import { aNumero } from "@/lib/verificaciones/formato";
import { calcularFisuracion } from "@/lib/calc/hormigon/fisuracion";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";
import { alaComprimidaCon, leerSeccionT } from "@/lib/calc/hormigon/vigas/seccion-t";

/** Signo del momento cuasipermanente: decide de qué lado queda el ala de una T. */
export type SignoMomento = "positivo" | "negativo";

export const ROTULOS_SIGNO_MOMENTO: Record<SignoMomento, string> = {
  positivo: "Positivo (tracciona abajo, vano)",
  negativo: "Negativo (tracciona arriba, apoyo o voladizo)",
};

export const signoMomentoPorRotulo = (rotulo: string): SignoMomento =>
  rotulo === ROTULOS_SIGNO_MOMENTO.negativo ? "negativo" : "positivo";

/**
 * Cálculo de la página a partir de sus campos, tal como se cargaron.
 *
 * Vive acá y no en la página porque lo corren la pantalla y las
 * recomendaciones, que lo repiten con un dato cambiado: con dos copias, tarde
 * o temprano dirían números distintos.
 */
export function resolverFisuracion(campos: Record<string, string>) {
  const num = (clave: string) => aNumero(campos[clave] ?? "");

  const n = {
    fck: num("fck"), fyk: num("fyk"), esGPa: num("esGPa"), rg: num("rg"),
    k2: num("k2"), wAdm: num("wAdm"),
    h: num("h"), b: num("b"), mqp: num("mqp"),
    numero1: num("numero1"), phi1: num("phi1"),
    numero2: num("numero2"), phi2: num("phi2"),
  };
  if (!Object.values(n).every((x) => Number.isFinite(x) && x >= 0)) return null;
  if (n.fck <= 0 || n.fyk <= 0 || n.esGPa <= 0 || n.h <= 0 || n.b <= 0) return null;
  if (n.numero1 <= 0 || n.phi1 <= 0 || n.wAdm <= 0) return null;
  if (n.mqp <= 0) return null;

  // Con T, b es el alma y el ala sale de los mismos campos que en flexión. Lo
  // que cambia con el signo es de qué lado queda: comprimida ensancha la
  // compresión; traccionada lleva las barras y el área eficaz.
  const seccion = leerSeccionT(campos, n.b, n.h);
  if (seccion === null) return null;
  const positivo = campos.signoMomento !== "negativo";
  const seccionT =
    seccion === "rectangular" ? null : { ...seccion, alaComprimida: alaComprimidaCon(seccion.tipo, positivo) };
  const ala = seccionT
    ? { anchoM: seccionT.anchoEficaz.anchoEficazM, espesorM: seccionT.ala.espesorM, comprimida: seccionT.alaComprimida }
    : undefined;

  const materiales = derivarMateriales({ fck: n.fck, fyk: n.fyk });
  const n1 = n.numero1;
  const n2 = campos.familia2 === "Sí" && n.numero2 > 0 && n.phi2 > 0 ? n.numero2 : 0;

  return {
    n,
    n1,
    n2,
    seccionT,
    r: calcularFisuracion(
      materiales,
      { recubrimientoM: n.rg, k2: n.k2, wAdmMm: n.wAdm, esGPa: n.esGPa },
      { hM: n.h, bM: n.b, ala, n1, diametro1Mm: n.phi1, n2, diametro2Mm: n.phi2, mqpKNm: n.mqp }
    ),
  };
}

export type ResueltoFisuracion = NonNullable<ReturnType<typeof resolverFisuracion>>;
