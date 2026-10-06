import { aNumero } from "@/lib/verificaciones/formato";
import { seccionDesdeCampos } from "@/lib/calc/acero/seccion-campos";
import type { Familia } from "@/lib/calc/acero/perfiles";
import { calcularFlexoCompresion } from "@/lib/calc/acero/flexo-compresion";

/**
 * Cálculo de la página a partir de sus campos, tal como se cargaron.
 *
 * Vive acá y no en la página porque lo corren la pantalla y las
 * recomendaciones, que lo repiten con un dato cambiado: con dos copias, tarde
 * o temprano dirían números distintos.
 */
export function resolverFlexoCompresion(campos: Record<string, string>) {
  const num = (clave: string) => aNumero(campos[clave] ?? "");
  const sec = seccionDesdeCampos((campos.familia ?? "") as Familia, campos.params ?? "");

  const n = {
    lcx: num("lcxFC"), lcy: num("lcyFC"), lb: num("lbFC"), cb: num("cbFC"),
    fy: num("fyFC"), e: num("eFC"), p: num("pFC"),
    mrx: num("mrx"), mry: num("mry"),
  };
  const positivos = [n.lcx, n.lcy, n.lb, n.cb, n.fy, n.e];
  if (!sec.completos || !positivos.every((x) => Number.isFinite(x) && x > 0)) return null;
  // La compresión puede ser cero: con Pr = 0 la H1-1b se reduce a la
  // interacción de flexión biaxial pura, sin término axial. Es el caso de
  // una viga con momento en los dos ejes y ninguna carga axial.
  if (![n.p, n.mrx, n.mry].every((x) => Number.isFinite(x) && x >= 0)) return null;

  try {
    return calcularFlexoCompresion({
      familia: sec.familia,
      params: sec.params,
      lcxM: n.lcx,
      lcyM: n.lcy,
      lbM: n.lb,
      cb: n.cb,
      fyPa: n.fy * 1e6,
      ePa: n.e * 1e6,
      pRequeridaKN: n.p,
      mrxKNm: n.mrx,
      mryKNm: n.mry,
    });
  } catch {
    return null;
  }
}

export type ResueltoFlexoCompresion = NonNullable<ReturnType<typeof resolverFlexoCompresion>>;
