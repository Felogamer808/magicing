import { aNumero } from "@/lib/verificaciones/formato";
import { seccionDesdeCampos } from "@/lib/calc/acero/seccion-campos";
import type { Familia } from "@/lib/calc/acero/perfiles";
import { calcularFlexionSegunSeccion } from "@/lib/calc/acero/seleccion-articulo";
import { calcularAlaMensula } from "@/lib/calc/acero/flexion-te";
import { propiedades } from "@/lib/calc/acero/perfiles";

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
      puntaAlma: campos.puntaAlma === "Traccionada" ? "traccionada" : "comprimida",
    });
  } catch {
    return null;
  }
}

/**
 * El ala de la T en ménsula, con la reacción de la losa de cada lado. Null si
 * la sección no es una T o faltan datos; las reacciones pueden ser 0.
 */
export function resolverAlaMensula(campos: Record<string, string>) {
  if (campos.familia !== "te-armada") return null;
  const sec = seccionDesdeCampos("te-armada", campos.params ?? "");
  const fy = aNumero(campos.fyFlexion ?? "");
  const izq = aNumero(campos.reaccionIzq ?? "");
  const der = aNumero(campos.reaccionDer ?? "");
  if (!sec.completos || !(fy > 0) || !(izq >= 0) || !(der >= 0)) return null;
  try {
    const p = propiedades("te-armada", sec.params);
    return calcularAlaMensula({ bfM: p.bM, tfM: p.tfM, twM: p.twM, fyPa: fy * 1e6, reaccionIzqKNm: izq, reaccionDerKNm: der });
  } catch {
    return null;
  }
}

export type ResueltoFlexionAcero = NonNullable<ReturnType<typeof resolverFlexionAcero>>;
