import { aNumero } from "@/lib/verificaciones/formato";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";
import { calcularZonaCargada } from "@/lib/calc/hormigon/zona-parcialmente-cargada";

/**
 * Cálculo de la página a partir de sus campos, tal como se cargaron.
 *
 * Vive acá y no en la página porque lo corren la pantalla y las
 * recomendaciones, que lo repiten con un dato cambiado: con dos copias, tarde
 * o temprano dirían números distintos.
 */
export function resolverZonaParcialmenteCargada(campos: Record<string, string>) {
  const num = (clave: string) => aNumero(campos[clave] ?? "");

  const v = {
    fck: num("fck"), fyk: num("fyk"), nEd: num("nEd"),
    b1: num("b1"), d1: num("d1"),
    anchoB: num("anchoB"), anchoD: num("anchoD"),
    bordeB: num("bordeB"), bordeD: num("bordeD"),
    altura: num("altura"),
  };
  if (!Object.values(v).every((n) => Number.isFinite(n) && n > 0)) return null;
  // El área cargada tiene que quedar dentro de la pieza, y el borde más
  // cercano no puede estar más lejos que la mitad del ancho.
  if (v.bordeB < v.b1 / 2 || v.bordeD < v.d1 / 2) return null;
  if (v.bordeB > v.anchoB / 2 + 1e-9 || v.bordeD > v.anchoD / 2 + 1e-9) return null;

  const materiales = derivarMateriales({ fck: v.fck, fyk: v.fyk });
  const r = calcularZonaCargada(materiales, {
    nEdKN: v.nEd,
    direccionB: { cargadaM: v.b1, anchoPiezaM: v.anchoB, distanciaBordeM: v.bordeB },
    direccionD: { cargadaM: v.d1, anchoPiezaM: v.anchoD, distanciaBordeM: v.bordeD },
    alturaM: v.altura,
  });
  return { v, materiales, r };
}

export type ResueltoZonaParcialmenteCargada = NonNullable<ReturnType<typeof resolverZonaParcialmenteCargada>>;
