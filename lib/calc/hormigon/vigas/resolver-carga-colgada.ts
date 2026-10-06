import { aNumero } from "@/lib/verificaciones/formato";
import { calcularCuelgue } from "@/lib/calc/hormigon/vigas/cuelgue";

/**
 * Cálculo de la página a partir de sus campos, tal como se cargaron.
 *
 * Vive acá y no en la página porque lo corren la pantalla y las
 * recomendaciones, que lo repiten con un dato cambiado: con dos copias, tarde
 * o temprano dirían números distintos.
 */
export function resolverCargaColgada(campos: Record<string, string>) {
  const num = (clave: string) => aNumero(campos[clave] ?? "");

  const v = {
    reaccion: num("reaccion"),
    fyk: num("fyk"),
    diametroEstribo: num("diametroEstribo"),
    numeroRamas: num("numeroRamas"),
    h: num("h"),
    a: num("a"),
  };
  if (!Object.values(v).every((n) => Number.isFinite(n) && n > 0)) return null;

  const r = calcularCuelgue(
    { fykMPa: v.fyk },
    { hM: v.h, aM: v.a },
    { reaccionKN: v.reaccion, diametroEstriboMm: v.diametroEstribo, numeroRamas: v.numeroRamas }
  );
  return { v, r };
}

export type ResueltoCargaColgada = NonNullable<ReturnType<typeof resolverCargaColgada>>;
