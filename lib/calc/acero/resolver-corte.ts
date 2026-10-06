import { aNumero } from "@/lib/verificaciones/formato";
import { seccionDesdeCampos } from "@/lib/calc/acero/seccion-campos";
import type { Familia } from "@/lib/calc/acero/perfiles";
import { calcularCorteSegunSeccion } from "@/lib/calc/acero/seleccion-articulo";

/**
 * Cálculo de la página a partir de sus campos, tal como se cargaron.
 *
 * Vive acá y no en la página porque lo corren la pantalla y las
 * recomendaciones, que lo repiten con un dato cambiado: con dos copias, tarde
 * o temprano dirían números distintos.
 */
export function resolverCorteAcero(campos: Record<string, string>) {
  const num = (clave: string) => aNumero(campos[clave] ?? "");
  const sec = seccionDesdeCampos((campos.familia ?? "") as Familia, campos.params ?? "");

  const n = {
    a: num("aRigidizadores"),
    lv: num("lv"),
    fy: num("fyCorte"),
    e: num("eCorte"),
    v: num("vRequerido"),
  };
  const usaRigidizadores = campos.conRigidizadores === "Sí";
  if (!sec.completos || ![n.fy, n.e, n.v].every((x) => Number.isFinite(x) && x > 0)) return null;
  if (usaRigidizadores && (!Number.isFinite(n.a) || n.a <= 0)) return null;
  if (sec.familia === "tubo-redondo" && (!Number.isFinite(n.lv) || n.lv <= 0)) return null;

  try {
    return calcularCorteSegunSeccion({
      familia: sec.familia,
      params: sec.params,
      fyPa: n.fy * 1e6,
      ePa: n.e * 1e6,
      separacionRigidizadoresM: usaRigidizadores ? n.a : undefined,
      lvM: n.lv,
      vRequeridoKN: n.v,
    });
  } catch {
    return null;
  }
}

export type ResueltoCorteAcero = NonNullable<ReturnType<typeof resolverCorteAcero>>;
