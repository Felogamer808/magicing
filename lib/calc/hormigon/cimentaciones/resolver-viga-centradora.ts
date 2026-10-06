import { aNumero } from "@/lib/verificaciones/formato";
import type { FormaAnclaje } from "@/lib/calc/hormigon/comun/anclaje";
import { calcularVigaCentradora } from "@/lib/calc/hormigon/cimentaciones/viga-centradora";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";

/**
 * Cálculo de la página a partir de sus campos, tal como se cargaron.
 *
 * Vive acá y no en la página porque lo corren la pantalla y las
 * recomendaciones, que lo repiten con un dato cambiado: con dos copias, tarde
 * o temprano dirían números distintos.
 */
export function resolverVigaCentradora(campos: Record<string, string>) {
  const num = (clave: string) => aNumero(campos[clave] ?? "");

  const v = {
    fck: num("fck"), fyk: num("fyk"), sigmaAdmisible: num("sigmaAdmisible"),
    A: num("A"), B: num("B"), H: num("H"), recubrimiento: num("recubrimiento"),
    distanciaColumnaLimite: num("distanciaColumnaLimite"),
    anchoPilarA: num("anchoPilarA"), anchoPilarB: num("anchoPilarB"),
    luz: num("luz"), bViga: num("bViga"), hViga: num("hViga"),
    Nk: num("Nk"), MkA: num("MkA"), MkB: num("MkB"),
    numeroB: num("numeroB"), diametroB: num("diametroB"),
    numeroA: num("numeroA"), diametroA: num("diametroA"),
    numeroViga: num("numeroViga"), diametroViga: num("diametroViga"),
    diametroEstribo: num("diametroEstribo"), numeroRamas: num("numeroRamas"),
  };
  if (!Object.values(v).every((x) => Number.isFinite(x))) return null;
  const positivos = [
    v.fck, v.fyk, v.sigmaAdmisible, v.A, v.B, v.H, v.anchoPilarA, v.anchoPilarB, v.luz, v.bViga, v.hViga,
    v.Nk, v.numeroB, v.diametroB, v.numeroA, v.diametroA, v.numeroViga, v.diametroViga,
    v.diametroEstribo, v.numeroRamas,
  ];
  if (positivos.some((x) => x <= 0) || v.distanciaColumnaLimite < 0 || v.recubrimiento < 0) return null;

  const materiales = derivarMateriales({ fck: v.fck, fyk: v.fyk });
  const r = calcularVigaCentradora(
    materiales,
    {
      A: v.A, B: v.B, H: v.H, recubrimiento: v.recubrimiento,
      distanciaColumnaLimite: v.distanciaColumnaLimite,
      anchoPilarA: v.anchoPilarA, anchoPilarB: v.anchoPilarB,
      luzM: v.luz, bViga: v.bViga, hViga: v.hViga,
    },
    v.sigmaAdmisible,
    {
      Nk: v.Nk, MkA: v.MkA, MkB: v.MkB,
      armadoB: { numero: v.numeroB, diametroMm: v.diametroB },
      armadoA: { numero: v.numeroA, diametroMm: v.diametroA },
      formaAnclaje: (campos.formaAnclaje === "gancho" ? "gancho" : "recta") as FormaAnclaje,
      vigaSuperior: { numero: v.numeroViga, diametroMm: v.diametroViga },
      diametroEstriboMm: v.diametroEstribo,
      numeroRamas: v.numeroRamas,
    }
  );
  return { v, r };
}

export type ResueltoVigaCentradora = NonNullable<ReturnType<typeof resolverVigaCentradora>>;
