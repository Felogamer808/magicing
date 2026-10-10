import { aNumero } from "@/lib/verificaciones/formato";
import { calcularVigaAtado } from "@/lib/calc/hormigon/cimentaciones/viga-atado";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";

/**
 * Cálculo de la página a partir de sus campos, tal como se cargaron. Lo
 * comparten la pantalla y las recomendaciones, que lo repiten con un dato
 * cambiado.
 */
export function resolverVigaAtado(campos: Record<string, string>) {
  const num = (clave: string) => aNumero(campos[clave] ?? "");

  const v = {
    fck: num("fck"), fyk: num("fyk"),
    b: num("b"), h: num("h"), recubrimiento: num("recubrimiento"), luz: num("luz"),
    n1d: num("n1d"), n2d: num("n2d"), porcentaje: num("porcentaje"),
    numeroCara: num("numeroCara"), diametroCara: num("diametroCara"),
    diametroEstribo: num("diametroEstribo"), numeroRamas: num("numeroRamas"),
  };
  if (!Object.values(v).every((x) => Number.isFinite(x))) return null;
  const positivos = [
    v.fck, v.fyk, v.b, v.h, v.luz, v.porcentaje, v.numeroCara, v.diametroCara, v.diametroEstribo, v.numeroRamas,
  ];
  if (positivos.some((x) => x <= 0) || v.recubrimiento < 0 || v.n1d < 0 || v.n2d < 0) return null;
  if (Math.max(v.n1d, v.n2d) <= 0) return null;

  const materiales = derivarMateriales({ fck: v.fck, fyk: v.fyk });
  const r = calcularVigaAtado(materiales, {
    b: v.b, h: v.h, recubrimiento: v.recubrimiento, luzM: v.luz,
    n1dKN: v.n1d, n2dKN: v.n2d, porcentaje: v.porcentaje,
    compactacion: campos.compactacion === "si",
    porCara: { numero: v.numeroCara, diametroMm: v.diametroCara },
    diametroEstriboMm: v.diametroEstribo,
    numeroRamas: v.numeroRamas,
  });
  return { v, r, materiales };
}

export type ResueltoVigaAtado = NonNullable<ReturnType<typeof resolverVigaAtado>>;
