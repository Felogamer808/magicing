import { aNumero } from "@/lib/verificaciones/formato";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";
import { calcularVigaConTorsion } from "@/lib/calc/hormigon/vigas/torsion";

/**
 * Cálculo de la página a partir de sus campos, tal como se cargaron.
 *
 * Vive acá y no en la página porque lo corren la pantalla y las
 * recomendaciones, que lo repiten con un dato cambiado: con dos copias, tarde
 * o temprano dirían números distintos.
 */
export function resolverVigaTorsion(campos: Record<string, string>) {
  const num = (clave: string) => aNumero(campos[clave] ?? "");

  const v = {
    fck: num("fck"),
    fyk: num("fyk"),
    b: num("b"),
    h: num("h"),
    recubrimiento: num("recubrimiento"),
    momentoPos: num("momentoPos"),
    numeroPos: num("numeroPos"),
    diametroPos: num("diametroPos"),
    momentoNeg: num("momentoNeg"),
    numeroNeg: num("numeroNeg"),
    diametroNeg: num("diametroNeg"),
    vd: num("vd"),
    diametroEstribo: num("diametroEstribo"),
    numeroRamas: num("numeroRamas"),
    td: num("td"),
  };

  const todosValidos = Object.values(v).every((n) => Number.isFinite(n) && n >= 0);
  const geometriaValida = v.b > 0 && v.h > 0;
  const materialesValidos = v.fck > 0 && v.fyk > 0;
  const armadurasValidas = v.numeroPos > 0 && v.diametroPos > 0 && v.numeroNeg > 0 && v.diametroNeg > 0;
  const cortanteValido = v.numeroRamas > 0 && v.diametroEstribo > 0;

  if (!todosValidos || !geometriaValida || !materialesValidos || !armadurasValidas || !cortanteValido) {
    return null;
  }

  const materiales = derivarMateriales({ fck: v.fck, fyk: v.fyk });
  const geometria = { b: v.b, h: v.h, recubrimiento: v.recubrimiento, diametroEstriboMm: v.diametroEstribo };

  return {
    v,
    ...calcularVigaConTorsion(materiales, geometria, {
      torsion: { td: v.td },
      momentoPositivo: v.momentoPos,
      momentoNegativo: v.momentoNeg,
      armaduraPositiva: { numero: v.numeroPos, diametroMm: v.diametroPos },
      armaduraNegativa: { numero: v.numeroNeg, diametroMm: v.diametroNeg },
      cortante: { vd: v.vd, diametroEstriboMm: v.diametroEstribo, numeroRamas: v.numeroRamas },
    }),
  };
}

export type ResueltoVigaTorsion = NonNullable<ReturnType<typeof resolverVigaTorsion>>;
