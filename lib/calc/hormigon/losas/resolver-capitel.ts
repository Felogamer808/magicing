import { aNumero } from "@/lib/verificaciones/formato";
import { calcularCapitel, type FormaPilar } from "./capitel";
import type { PosicionPilar } from "./punzonamiento";
import { POSICIONES_PUNZONAMIENTO } from "./resolver-punzonamiento";

/** Cómo se rotula la forma del pilar en la página, que es lo que se guarda. */
export const FORMAS_PILAR = ["Rectangular", "Circular"] as const;

const ID_POSICION: Record<(typeof POSICIONES_PUNZONAMIENTO)[number], PosicionPilar> = {
  Interior: "interior",
  "De borde": "borde",
  "De esquina": "esquina",
};

/**
 * Capitel a partir de los campos de la página. Los de la losa, el pilar, los
 * negativos y la carga se llaman igual que en punzonamiento, que es lo que
 * deja llevarlos de una página a la otra sin traducir.
 */
export function resolverCapitel(campos: Record<string, string>) {
  const c = (nombre: string) => aNumero(campos[nombre] ?? "");
  const posicion = ID_POSICION[campos.posicion as (typeof POSICIONES_PUNZONAMIENTO)[number]] ?? "interior";
  const forma: FormaPilar = campos.forma === "Circular" ? "circular" : "rectangular";
  const betaManual = campos.betaModo === "A mano";
  const n = {
    fck: c("fck"),
    espesor: c("espesor"), recubrimiento: c("recubrimiento"),
    c1: c("c1"), c2: c("c2"),
    distBordeC1: c("distBordeC1"), distBordeC2: c("distBordeC2"),
    phiNegY: c("phiNegY"), sNegY: c("sNegY"),
    phiNegZ: c("phiNegZ"), sNegZ: c("sNegZ"),
    vEd: c("vEd"), beta: c("beta"),
    lH1: c("lH1"), lH2: c("lH2"), hH: c("hH"),
  };

  const positivos = [n.fck, n.espesor, n.c1, n.phiNegY, n.sNegY, n.phiNegZ, n.sNegZ, n.lH1, n.hH];
  if (forma === "rectangular") positivos.push(n.c2, n.lH2);
  if (!positivos.every((x) => Number.isFinite(x) && x > 0)) return null;
  const noNegativos = [n.recubrimiento, n.distBordeC1, n.distBordeC2, n.vEd];
  if (!noNegativos.every((x) => Number.isFinite(x) && x >= 0)) return null;
  if (betaManual && (!Number.isFinite(n.beta) || n.beta < 1)) return null;

  // Los cantos útiles salen igual que en punzonamiento (ver allá por qué).
  const dY = n.espesor - n.recubrimiento - n.phiNegY / 1000 / 2;
  const dZ = n.espesor - n.recubrimiento - n.phiNegY / 1000 - n.phiNegZ / 1000 / 2;
  if (dY <= 0 || dZ <= 0) return null;

  const r = calcularCapitel(
    n.fck,
    {
      posicion, forma, dYM: dY, dZM: dZ,
      c1M: n.c1, c2M: n.c2, distBordeC1M: n.distBordeC1, distBordeC2M: n.distBordeC2,
      lH1M: n.lH1, lH2M: n.lH2, hHM: n.hH,
    },
    { diametroYMm: n.phiNegY, separacionYM: n.sNegY, diametroZMm: n.phiNegZ, separacionZM: n.sNegZ },
    { vEdKN: n.vEd, betaManual: betaManual ? n.beta : null }
  );
  return { r, n, dY, dZ, forma, posicion };
}

export type ResueltoCapitel = NonNullable<ReturnType<typeof resolverCapitel>>;
