import { aNumero } from "@/lib/verificaciones/formato";
import { calcularSeccionMixta } from "@/lib/calc/acero/seccion-mixta";

/**
 * Cálculo de la página a partir de sus campos, tal como se cargaron.
 *
 * Vive acá y no en la página porque lo corren la pantalla y las
 * recomendaciones, que lo repiten con un dato cambiado: con dos copias, tarde
 * o temprano dirían números distintos.
 */
export function resolverSeccionMixta(campos: Record<string, string>) {
  const num = (clave: string) => aNumero(campos[clave] ?? "");

  const n = {
    es: num("es"), fy: num("fy"), fc: num("fc"), ec: num("ec"),
    dMm: num("dMm"), tMm: num("tMm"), lM: num("lM"),
    phiBarra: num("phiBarra"), nBarras: num("nBarras"),
    p: num("p"), m: num("m"), v: num("v"), yG: num("yG"), lFuego: num("lFuego"),
  };
  if (!Object.values(n).every((x) => Number.isFinite(x) && x >= 0)) return null;
  if (n.es <= 0 || n.fy <= 0 || n.fc <= 0 || n.ec <= 0) return null;
  if (n.dMm <= 0 || n.tMm <= 0 || n.lM <= 0 || n.phiBarra <= 0 || n.nBarras <= 0) return null;
  if (n.tMm * 2 >= n.dMm || n.lFuego <= 0) return null;

  return {
    n,
    r: calcularSeccionMixta(
      { esKPa: n.es * 1000, fyKPa: n.fy * 1000, fcKPa: n.fc * 1000, ecKPa: n.ec * 1000 },
      { dMm: n.dMm, tMm: n.tMm, lM: n.lM, diametroBarraMm: n.phiBarra, numeroBarras: n.nBarras },
      { pKN: n.p, mKNm: n.m, vKN: n.v, yGMm: n.yG, temperaturaC: 600, longitudFuegoM: n.lFuego }
    ),
  };
}

export type ResueltoSeccionMixta = NonNullable<ReturnType<typeof resolverSeccionMixta>>;
