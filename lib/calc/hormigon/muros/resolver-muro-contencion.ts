import { aNumero } from "@/lib/verificaciones/formato";
import { derivarMateriales } from "../comun/materiales";
import { areaPorMetroCm2, armarPieza, calcularMuroContencion, separacionParaAs } from "./contencion";

/** Los datos del formulario ya convertidos a número. */
export interface NumerosMuro {
  gamma: number; phi: number; c: number; sigmaAdm: number;
  anchoZap: number; cantoZap: number; altMuro: number; espMuro: number;
  hAct: number; hPas: number; sobrecargaG: number; sobrecargaQ: number; puntera: number;
  l1Caso2: number; l1Caso3: number; l2Caso3: number;
}

/** Estabilidad y esfuerzos del muro; null si la geometría no cierra. */
function estabilidad(campos: Record<string, string>) {
  const num = (clave: string) => aNumero(campos[clave] ?? "");
  const n: NumerosMuro = {
    gamma: num("gamma"), phi: num("phi"), c: num("c"), sigmaAdm: num("sigmaAdm"),
    anchoZap: num("anchoZap"), cantoZap: num("cantoZap"), altMuro: num("altMuro"),
    espMuro: num("espMuro"), hAct: num("hAct"), hPas: num("hPas"),
    sobrecargaG: num("sobrecargaG"), sobrecargaQ: num("sobrecargaQ"),
    puntera: num("puntera"),
    l1Caso2: num("l1Caso2"), l1Caso3: num("l1Caso3"), l2Caso3: num("l2Caso3"),
  };
  if (!Object.values(n).every((x) => Number.isFinite(x) && x >= 0)) return null;
  if (n.gamma <= 0 || n.phi <= 0 || n.phi >= 90 || n.sigmaAdm <= 0) return null;
  if (n.anchoZap <= 0 || n.cantoZap <= 0 || n.altMuro <= 0 || n.espMuro <= 0 || n.hAct <= 0) return null;
  if (n.espMuro >= n.anchoZap) return null;
  // La puntera y el hastial tienen que caber en la zapata y dejar talon.
  if (n.puntera + n.espMuro >= n.anchoZap) return null;
  if (n.l1Caso2 <= 0 || n.l2Caso3 <= 0) return null;

  return {
    n,
    r: calcularMuroContencion(
      { gammaKNm3: n.gamma, phiGrados: n.phi, cKPa: n.c, sigmaAdmisibleKPa: n.sigmaAdm },
      {
        anchoZapataM: n.anchoZap, cantoZapataM: n.cantoZap, alturaMuroM: n.altMuro,
        espesorMuroM: n.espMuro, alturaSueloActivoM: n.hAct, alturaSueloPasivoM: n.hPas,
        sobrecargaPermanenteKPa: n.sobrecargaG, sobrecargaUsoKPa: n.sobrecargaQ,
        punteraM: n.puntera,
      },
      { l1Caso2M: n.l1Caso2, l1Caso3M: n.l1Caso3, l2Caso3M: n.l2Caso3 }
    ),
  };
}

/**
 * Armado de las tres piezas. Va aparte de la estabilidad porque depende de los
 * materiales y de las barras elegidas, que no intervienen en vuelco ni
 * deslizamiento. null si faltan los materiales o el recubrimiento.
 */
function armar(campos: Record<string, string>, estable: NonNullable<ReturnType<typeof estabilidad>>) {
  const t = (clave: string) => campos[clave] ?? "";
  const m = estable.r.momentos;
  const materiales = derivarMateriales({ fck: aNumero(t("fck")), fyk: aNumero(t("fyk")) });
  const rec = aNumero(t("recArm"));
  if (!Number.isFinite(rec) || rec <= 0) return null;

  const pieza = (
    nombre: string,
    cara: "interior" | "superior" | "inferior",
    momento: number,
    h: number,
    diam: string,
    sep: string
  ) => {
    const calculo = armarPieza(nombre, cara, momento, h, rec, materiales.fcd, materiales.fyd);
    const asRealCm2 = areaPorMetroCm2(aNumero(diam), aNumero(sep));
    return {
      calculo,
      asRealCm2,
      diametroMm: aNumero(diam),
      separacionMm: aNumero(sep),
      // Separación máxima que todavía cubre el área necesaria.
      separacionMaxMm: separacionParaAs(aNumero(diam), calculo.asNecesarioCm2),
      verifica: asRealCm2 >= calculo.asNecesarioCm2,
    };
  };

  return {
    fcd: materiales.fcd,
    fyd: materiales.fyd,
    recubrimientoM: rec,
    hastial: pieza("Hastial", "interior", m.hastialKNm, estable.n.espMuro, t("phiHastial"), t("sepHastial")),
    talon: pieza("Talón", "superior", m.talonKNm, estable.n.cantoZap, t("phiTalon"), t("sepTalon")),
    puntera:
      m.punteraM > 0
        ? pieza("Puntera", "inferior", m.punteraKNm, estable.n.cantoZap, t("phiPuntera"), t("sepPuntera"))
        : null,
  };
}

/**
 * Muro de contención a partir de los campos de la página, tal como se
 * cargaron: la estabilidad y, si hay materiales y barras válidos, el armado.
 *
 * Vive acá y no en la página porque lo corren la pantalla y las
 * recomendaciones, que lo repiten con un dato cambiado.
 */
export function resolverMuroContencion(campos: Record<string, string>) {
  const estable = estabilidad(campos);
  if (!estable) return null;
  return { ...estable, armado: armar(campos, estable) };
}

export type ResueltoMuroContencion = NonNullable<ReturnType<typeof resolverMuroContencion>>;
