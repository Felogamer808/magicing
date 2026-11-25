import { aNumero } from "@/lib/verificaciones/formato";
import { seccionDesdeCampos } from "@/lib/calc/acero/seccion-campos";
import { calcularTorsionTe } from "@/lib/calc/acero/torsion-te";

/**
 * Cálculo de la página a partir de sus campos. Los nombres son los de flexión,
 * corte y soldadura (params, reaccionIzq, reaccionDer, vRequerido, luz), para
 * que los datos lleguen encadenados sin traducir.
 */
export function resolverTorsionTe(campos: Record<string, string>) {
  const sec = seccionDesdeCampos("te-armada", campos.params ?? "");
  const n = {
    fy: aNumero(campos.fy ?? ""),
    luz: aNumero(campos.luz ?? ""),
    izq: aNumero(campos.reaccionIzq ?? ""),
    der: aNumero(campos.reaccionDer ?? ""),
    v: aNumero(campos.vRequerido ?? ""),
  };
  if (!sec.completos || !(n.fy > 0) || !(n.luz > 0) || !(n.izq >= 0) || !(n.der >= 0) || !(n.v >= 0)) return null;

  try {
    return calcularTorsionTe({
      params: sec.params,
      fyPa: n.fy * 1e6,
      luzM: n.luz,
      reaccionIzqKNm: n.izq,
      reaccionDerKNm: n.der,
      corteKN: n.v,
    });
  } catch {
    return null;
  }
}
