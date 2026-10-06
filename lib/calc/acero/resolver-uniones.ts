import { aNumero } from "@/lib/verificaciones/formato";
import { calcularChapaBase, calcularSoldaduraH, type Electrodo } from "./uniones";

/** Convierte "0.18, 0.127" en [0.18, 0.127]. */
export function parsearDistancias(texto: string): number[] {
  return texto
    .split(/[,;]/)
    .map((t) => Number(t.trim().replace(",", ".")))
    .filter((n) => Number.isFinite(n) && n > 0);
}

/**
 * Cordón alrededor de un perfil H, a partir de los campos de la página.
 *
 * Los resolvers viven acá y no en la página porque los corren la pantalla y
 * las recomendaciones, que los repiten con un dato cambiado.
 */
export function resolverSoldadura(campos: Record<string, string>) {
  const num = (clave: string) => aNumero(campos[clave] ?? "");
  const n = {
    h: num("hMm"), b: num("bMm"), tf: num("tfMm"), tw: num("twMm"), lado: num("lado"),
    px: num("px"), py: num("py"), pz: num("pz"), mx: num("mx"), my: num("my"), mz: num("mz"),
  };
  if (!Object.values(n).every((x) => Number.isFinite(x))) return null;
  if (n.h <= 0 || n.b <= 0 || n.tf <= 0 || n.tw <= 0 || n.lado <= 0) return null;
  if (n.tw >= n.h || 2 * n.tf >= n.h) return null;
  return calcularSoldaduraH(
    { hMm: n.h, bMm: n.b, tfMm: n.tf, twMm: n.tw },
    n.lado,
    (campos.electrodo ?? "E60") as Electrodo,
    { pxKN: n.px, pyKN: n.py, pzKN: n.pz, mxKNm: n.mx, myKNm: n.my, mzKNm: n.mz }
  );
}

/** Chapa de base con pernos, a partir de los campos de la página. */
export function resolverChapaBase(campos: Record<string, string>) {
  const num = (clave: string) => aNumero(campos[clave] ?? "");
  const n = {
    fy: num("fy"), fu: num("fu"), fck: num("fck"),
    lx: num("lx"), ly: num("ly"), t: num("tChapa"),
    d: num("dPerno"), lc: num("lc"), nPernos: num("nPernos"),
    ag: num("ag"), ae: num("ae"),
    nMax: num("nMax"), corte: num("cortePerno"), momento: num("momentoPernos"),
  };
  if (!Object.values(n).every((x) => Number.isFinite(x) && x >= 0)) return null;
  if (n.fy <= 0 || n.fu <= 0 || n.fck <= 0 || n.lx <= 0.12 || n.t <= 0 || n.d <= 0 || n.nPernos <= 0) return null;
  const dist = parsearDistancias(campos.distancias ?? "");
  if (dist.length === 0) return null;
  return calcularChapaBase(
    { fyKPa: n.fy * 1000, fuKPa: n.fu * 1000, fckKPa: n.fck * 1000 },
    {
      lxM: n.lx, lyM: n.ly, tM: n.t, diametroPernoMm: n.d, lcM: n.lc,
      numeroPernos: n.nPernos, agM2: n.ag, aeM2: n.ae,
    },
    { nMaxKN: n.nMax, cortePorPernoKN: n.corte, momentoKNm: n.momento, distanciasPernosM: dist }
  );
}

export type ResueltoSoldadura = NonNullable<ReturnType<typeof resolverSoldadura>>;
export type ResueltoChapaBase = NonNullable<ReturnType<typeof resolverChapaBase>>;
