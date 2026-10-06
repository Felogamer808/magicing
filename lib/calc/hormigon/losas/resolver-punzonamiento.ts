import { aNumero } from "@/lib/verificaciones/formato";
import { calcularPunzonamiento, type PosicionPilar } from "./punzonamiento";

/** Cómo se rotula cada posición en la página, que es lo que se guarda. */
export const POSICIONES_PUNZONAMIENTO = ["Interior", "De borde", "De esquina"] as const;

const ID_POSICION: Record<(typeof POSICIONES_PUNZONAMIENTO)[number], PosicionPilar> = {
  Interior: "interior",
  "De borde": "borde",
  "De esquina": "esquina",
};

/**
 * Punzonamiento a partir de los campos de la página, tal como se cargaron.
 *
 * Vive acá y no en la página por la misma razón que el resolver de vigas: el
 * mismo cálculo lo corren la pantalla y las recomendaciones, que lo repiten
 * con un dato cambiado, y con dos copias tarde o temprano dirían números
 * distintos.
 */
export function resolverPunzonamiento(campos: Record<string, string>) {
  const c = (nombre: string) => aNumero(campos[nombre] ?? "");
  const posicion = ID_POSICION[campos.posicion as (typeof POSICIONES_PUNZONAMIENTO)[number]] ?? "interior";
  const betaManual = campos.betaModo === "A mano";
  const n = {
    fck: c("fck"), fyk: c("fyk"),
    espesor: c("espesor"), recubrimiento: c("recubrimiento"),
    c1: c("c1"), c2: c("c2"),
    distBordeC1: c("distBordeC1"), distBordeC2: c("distBordeC2"),
    phiNegY: c("phiNegY"), sNegY: c("sNegY"),
    phiNegZ: c("phiNegZ"), sNegZ: c("sNegZ"),
    vEd: c("vEd"), beta: c("beta"),
    phiCerco: c("phiCerco"), ramas: c("ramas"),
    sr: c("sr"), st: c("st"),
    nPerimetros: c("nPerimetros"), distPrimer: c("distPrimer"),
  };

  const positivos = [n.fck, n.fyk, n.espesor, n.c1, n.c2, n.phiNegY, n.sNegY, n.phiNegZ, n.sNegZ,
                     n.phiCerco, n.ramas, n.sr, n.st];
  if (!positivos.every((x) => Number.isFinite(x) && x > 0)) return null;
  const noNegativos = [n.recubrimiento, n.distBordeC1, n.distBordeC2, n.vEd, n.nPerimetros, n.distPrimer];
  if (!noNegativos.every((x) => Number.isFinite(x) && x >= 0)) return null;
  if (betaManual && (!Number.isFinite(n.beta) || n.beta < 1)) return null;

  /*
   * Los dos cantos útiles salen del mismo dato en vez de pedirse por separado:
   * las dos capas de negativos no pueden estar a la misma altura, y la de
   * adentro pierde un diámetro entero. Ésa es justamente la razón por la que
   * la ec. (6.32) promedia dy y dz en vez de usar un solo canto.
   */
  const dY = n.espesor - n.recubrimiento - n.phiNegY / 1000 / 2;
  const dZ = n.espesor - n.recubrimiento - n.phiNegY / 1000 - n.phiNegZ / 1000 / 2;
  if (dY <= 0 || dZ <= 0) return null;

  const r = calcularPunzonamiento(
    { fckMPa: n.fck, fykMPa: n.fyk },
    {
      posicion,
      dYM: dY,
      dZM: dZ,
      c1M: n.c1,
      c2M: n.c2,
      distBordeC1M: n.distBordeC1,
      distBordeC2M: n.distBordeC2,
    },
    {
      diametroYMm: n.phiNegY, separacionYM: n.sNegY,
      diametroZMm: n.phiNegZ, separacionZM: n.sNegZ,
    },
    { vEdKN: n.vEd, betaManual: betaManual ? n.beta : null },
    {
      diametroMm: n.phiCerco,
      ramasPorPerimetro: n.ramas,
      srM: n.sr,
      stM: n.st,
      numeroPerimetros: n.nPerimetros,
      distPrimerPerimetroM: n.distPrimer,
      alphaGrados: 90,
    }
  );

  return { r, n, dY, dZ };
}

export type ResueltoPunzonamiento = NonNullable<ReturnType<typeof resolverPunzonamiento>>;
