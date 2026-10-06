import { NOMBRE_CLAVIJA, NOMBRE_ESPECIE_UNION, chapaCentralDoble, chapasExterioresDoble, clasificarChapa, cortaduraDobleMaderaMadera, cortaduraSimpleMaderaMadera, fh0k, fhAlphaK, k90, myRkNmm, numeroEficaz, type EspecieUnion, type TipoClavija } from "@/lib/calc/madera/uniones";
import { duracionDesdeEtiqueta, servicioDesdeEtiqueta } from "@/lib/calc/madera/etiquetas";
import { aNumero } from "@/lib/verificaciones/formato";
import { GAMMA_M_UNIONES, kmod } from "@/lib/calc/madera/materiales";

export const CONFIGURACIONES = [
  "Madera-madera, cortadura simple",
  "Madera-madera, cortadura doble",
  "Chapas de acero exteriores, cortadura doble",
  "Chapa de acero central, cortadura doble",
] as const;

export const clavijaDesde = (e: string): TipoClavija =>
  ((Object.entries(NOMBRE_CLAVIJA) as [TipoClavija, string][]).find(([, n]) => n === e)?.[0] ??
    "perno");

export const especieDesde = (e: string): EspecieUnion =>
  ((Object.entries(NOMBRE_ESPECIE_UNION) as [EspecieUnion, string][]).find(([, n]) => n === e)?.[0] ??
    "conifera");

/**
 * Cálculo de la página a partir de sus campos, tal como se cargaron.
 *
 * Vive acá y no en la página porque lo corren la pantalla y las
 * recomendaciones, que lo repiten con un dato cambiado: con dos copias, tarde
 * o temprano dirían números distintos.
 */
export function resolverMaderaUniones(campos: Record<string, string>) {
  const num = (clave: string) => aNumero(campos[clave] ?? "");

  const dV = num("d");
  const fukV = num("fuk");
  const t1V = num("t1");
  const t2V = num("t2");
  const rho1V = num("rho1");
  const rho2V = num("rho2");
  const ang = num("angulo");
  const chapa = num("espesorChapa");
  const faxV = num("fax");
  const n = num("nMedios");
  const sep = num("separacion");
  const nPlanos = num("planos");
  const fedV = num("fed");

  if (![dV, fukV, t1V, t2V, rho1V, rho2V].every((x) => Number.isFinite(x) && x > 0)) return null;
  if (![ang, faxV, chapa].every((x) => Number.isFinite(x) && x >= 0)) return null;
  if (![n, sep, nPlanos, fedV].every((x) => Number.isFinite(x) && x > 0)) return null;

  const esp = especieDesde(campos.especie);
  const tipo = clavijaDesde(campos.clavija);

  const factorK90 = k90(esp, dV);
  const fh1 = fhAlphaK(fh0k(dV, rho1V), factorK90, ang);
  const fh2 = fhAlphaK(fh0k(dV, rho2V), factorK90, ang);
  const my = myRkNmm(fukV, dV);

  const comunMadera = {
    dMm: dV, t1Mm: t1V, t2Mm: t2V,
    fh1kMPa: fh1, fh2kMPa: fh2, myRkNmm: my, faxRkKN: faxV, tipo,
  };
  const comunAcero = {
    dMm: dV, tMm: t1V, fhkMPa: fh1, myRkNmm: my,
    faxRkKN: faxV, tipo, espesorChapaMm: chapa,
  };

  const union =
    campos.config === CONFIGURACIONES[0]
      ? cortaduraSimpleMaderaMadera(comunMadera)
      : campos.config === CONFIGURACIONES[1]
        ? cortaduraDobleMaderaMadera(comunMadera)
        : campos.config === CONFIGURACIONES[2]
          ? chapasExterioresDoble({ ...comunAcero, tMm: t2V })
          : chapaCentralDoble(comunAcero);

  const usaChapa = campos.config === CONFIGURACIONES[2] || campos.config === CONFIGURACIONES[3];

  const nef = numeroEficaz(n, sep, dV);
  const km = kmod(esp === "lvl" ? "LVL" : "maciza",
                  servicioDesdeEtiqueta(campos.servicio), duracionDesdeEtiqueta(campos.duracion));

  // Ec. (2.17): la capacidad de la unión también pasa por kmod y γM.
  const fvRdPorMedioKN = (km * union.fvRkKN) / GAMMA_M_UNIONES;
  const capacidadKN = fvRdPorMedioKN * nef * nPlanos;

  return {
    dV, fh1, fh2, my, factorK90, union, usaChapa,
    claseChapa: clasificarChapa(chapa, dV),
    nef, n, km, fvRdPorMedioKN, capacidadKN, fedV, nPlanos,
    aprovechamiento: capacidadKN > 0 ? fedV / capacidadKN : Infinity,
  };
}

export type ResueltoMaderaUniones = NonNullable<ReturnType<typeof resolverMaderaUniones>>;
