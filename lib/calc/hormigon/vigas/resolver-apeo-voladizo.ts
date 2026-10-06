import { aNumero } from "@/lib/verificaciones/formato";
import type { FormaAnclaje } from "@/lib/calc/hormigon/comun/anclaje";
import { calcularApeoVoladizo } from "@/lib/calc/hormigon/vigas/apeo-voladizo";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";

/**
 * Cálculo de la página a partir de sus campos, tal como se cargaron.
 *
 * Vive acá y no en la página porque lo corren la pantalla y las
 * recomendaciones, que lo repiten con un dato cambiado: con dos copias, tarde
 * o temprano dirían números distintos.
 */
export function resolverApeoVoladizo(campos: Record<string, string>) {
  const num = (clave: string) => aNumero(campos[clave] ?? "");

  const n = {
    fck: num("fck"), fyk: num("fyk"), rec: num("rec"),
    h: num("h"), b: num("b"), luz: num("luz"), voladizo: num("voladizo"),
    extremoLibre: num("extremoLibre"), extremoLejano: num("extremoLejano"),
    cargaAncho: num("cargaAncho"), cargaProf: num("cargaProf"),
    apoyoCAncho: num("apoyoCAncho"), apoyoCProf: num("apoyoCProf"),
    apoyoLAncho: num("apoyoLAncho"), apoyoLProf: num("apoyoLProf"),
    elemLAncho: num("elemLAncho"), elemLProf: num("elemLProf"),
    p: num("p"), nMax: num("nMax"), nMin: num("nMin"),
    nTirante: num("nTirante"), phiTirante: num("phiTirante"), phiEstribo: num("phiEstribo"),
    nPilar: num("nPilar"), phiPilar: num("phiPilar"),
  };
  if (!Object.values(n).every((x) => Number.isFinite(x) && x >= 0)) return null;
  const positivos = [
    n.fck, n.fyk, n.h, n.b, n.luz, n.voladizo, n.cargaAncho, n.cargaProf, n.apoyoCAncho, n.apoyoCProf,
    n.apoyoLAncho, n.apoyoLProf, n.elemLAncho, n.elemLProf, n.p, n.nTirante, n.phiTirante, n.phiEstribo,
    n.nPilar, n.phiPilar,
  ];
  if (positivos.some((x) => x <= 0)) return null;
  if (n.nMin > n.nMax) return null;
  if (n.rec + (n.phiEstribo + n.phiTirante) / 1000 >= n.h) return null;

  const materiales = derivarMateriales({ fck: n.fck, fyk: n.fyk });
  const r = calcularApeoVoladizo(
    materiales,
    {
      hM: n.h, bM: n.b, recubrimientoM: n.rec, luzM: n.luz, voladizoM: n.voladizo,
      extremoLibreM: n.extremoLibre, extremoLejanoM: n.extremoLejano,
      carga: { anchoM: n.cargaAncho, profundidadM: n.cargaProf },
      apoyoCercano: { anchoM: n.apoyoCAncho, profundidadM: n.apoyoCProf },
      apoyoLejano: { anchoM: n.apoyoLAncho, profundidadM: n.apoyoLProf },
      elementoLejano: { anchoM: n.elemLAncho, profundidadM: n.elemLProf },
    },
    {
      pEdKN: n.p, nLejanoMaxKN: n.nMax, nLejanoMinKN: n.nMin,
      tirante: { numero: n.nTirante, diametroMm: n.phiTirante },
      diametroEstriboMm: n.phiEstribo,
      formaAnclajeTirante: (campos.forma === "gancho" ? "gancho" : "recta") as FormaAnclaje,
      armaduraPilarLejano: { numero: n.nPilar, diametroMm: n.phiPilar },
    }
  );
  return { n, r };
}

export type ResueltoApeoVoladizo = NonNullable<ReturnType<typeof resolverApeoVoladizo>>;
