import { aNumero } from "@/lib/verificaciones/formato";
import { seccionDesdeCampos } from "@/lib/calc/acero/seccion-campos";
import { calcularSoldaduraTe } from "@/lib/calc/acero/soldadura-te";
import type { Electrodo } from "@/lib/calc/acero/uniones";

/**
 * Cálculo de la página a partir de sus campos, tal como se cargaron. Los
 * nombres son los mismos que en flexión y corte (params, reaccionIzq,
 * reaccionDer, vRequerido), para que los datos lleguen encadenados sin
 * traducir.
 */
export function resolverSoldaduraTe(campos: Record<string, string>) {
  const sec = seccionDesdeCampos("te-armada", campos.params ?? "");
  const n = {
    lado: aNumero(campos.lado ?? ""),
    izq: aNumero(campos.reaccionIzq ?? ""),
    der: aNumero(campos.reaccionDer ?? ""),
    v: aNumero(campos.vRequerido ?? ""),
  };
  if (!sec.completos || !(n.lado > 0) || !(n.izq >= 0) || !(n.der >= 0) || !(n.v >= 0)) return null;

  try {
    return calcularSoldaduraTe({
      params: sec.params,
      ladoMm: n.lado,
      electrodo: (campos.electrodo || "E60") as Electrodo,
      reaccionIzqKNm: n.izq,
      reaccionDerKNm: n.der,
      corteKN: n.v,
    });
  } catch {
    return null;
  }
}

export type ResueltoSoldaduraTe = NonNullable<ReturnType<typeof resolverSoldaduraTe>>;
