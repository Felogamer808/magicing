import { aNumero } from "@/lib/verificaciones/formato";
import { seccionDesdeCampos } from "@/lib/calc/acero/seccion-campos";
import type { Familia } from "@/lib/calc/acero/perfiles";
import { calcularFlexionSegunSeccion } from "@/lib/calc/acero/seleccion-articulo";

/**
 * Cálculo de la página a partir de sus campos, tal como se cargaron.
 *
 * Vive acá y no en la página porque lo corren la pantalla y las
 * recomendaciones, que lo repiten con un dato cambiado: con dos copias, tarde
 * o temprano dirían números distintos.
 */
export function resolverFlexionAcero(campos: Record<string, string>) {
  const num = (clave: string) => aNumero(campos[clave] ?? "");
  const sec = seccionDesdeCampos((campos.familia ?? "") as Familia, campos.params ?? "");

  const n = { lb: num("lb"), cb: num("cb"), fy: num("fyFlexion"), e: num("eFlexion"), m: num("mRequerido") };
  if (!sec.completos || !Object.values(n).every((x) => Number.isFinite(x) && x > 0)) return null;

  try {
    return calcularFlexionSegunSeccion({
      familia: sec.familia,
      params: sec.params,
      lbM: n.lb,
      cb: n.cb,
      fyPa: n.fy * 1e6,
      ePa: n.e * 1e6,
      mRequeridoKNm: n.m,
    });
  } catch {
    return null;
  }
}

export type ResueltoFlexionAcero = NonNullable<ReturnType<typeof resolverFlexionAcero>>;
