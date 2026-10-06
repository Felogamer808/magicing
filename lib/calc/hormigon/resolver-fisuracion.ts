import { aNumero } from "@/lib/verificaciones/formato";
import { calcularFisuracion } from "@/lib/calc/hormigon/fisuracion";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";

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

  const materiales = derivarMateriales({ fck: n.fck, fyk: n.fyk });
  const n1 = n.numero1;
  const n2 = campos.familia2 === "Sí" && n.numero2 > 0 && n.phi2 > 0 ? n.numero2 : 0;

  return {
    n,
    n1,
    n2,
    r: calcularFisuracion(
      materiales,
      { recubrimientoM: n.rg, k2: n.k2, wAdmMm: n.wAdm, esGPa: n.esGPa },
      { hM: n.h, bM: n.b, n1, diametro1Mm: n.phi1, n2, diametro2Mm: n.phi2, mqpKNm: n.mqp }
    ),
  };
}

export type ResueltoFisuracion = NonNullable<ReturnType<typeof resolverFisuracion>>;
