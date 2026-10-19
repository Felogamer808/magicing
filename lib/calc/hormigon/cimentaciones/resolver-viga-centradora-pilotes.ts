import { aNumero } from "@/lib/verificaciones/formato";
import { calcularVigaCentradoraPilotes } from "@/lib/calc/hormigon/cimentaciones/viga-centradora-pilotes";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";

/**
 * Cálculo de la página a partir de sus campos, tal como se cargaron. Lo usan
 * la pantalla, las recomendaciones, el MCP y el estado de los proyectos: una
 * sola copia para que no digan números distintos.
 */
export function resolverVigaCentradoraPilotes(campos: Record<string, string>) {
  // Vacío no es cero: aNumero("") da 0, y una centradora traída de la planta
  // con e todavía sin cargar no tiene que calcularse como si el pilar cayera
  // sobre el pilote.
  const num = (clave: string) => ((campos[clave] ?? "").trim() === "" ? NaN : aNumero(campos[clave]));

  const v = {
    fck: num("fck"), fyk: num("fyk"),
    b: num("b"), h: num("h"), recubrimiento: num("recubrimiento"),
    excentricidad: num("excentricidad"), luzApoyos: num("luzApoyos"),
    ladoPilar: num("ladoPilar"), dPilote: num("dPilote"),
    n1d: num("n1d"), eacc: num("eacc"),
    numeroSup: num("numeroSup"), diametroSup: num("diametroSup"),
    numeroInf: num("numeroInf"), diametroInf: num("diametroInf"),
    diametroEstribo: num("diametroEstribo"), numeroRamas: num("numeroRamas"),
  };
  if (!Object.values(v).every((x) => Number.isFinite(x))) return null;
  const positivos = [
    v.fck, v.fyk, v.b, v.h, v.luzApoyos, v.ladoPilar, v.dPilote, v.n1d,
    v.numeroSup, v.diametroSup, v.numeroInf, v.diametroInf, v.diametroEstribo, v.numeroRamas,
  ];
  if (positivos.some((x) => x <= 0) || v.recubrimiento < 0 || v.excentricidad < 0 || v.eacc < 0) return null;

  const materiales = derivarMateriales({ fck: v.fck, fyk: v.fyk });
  const r = calcularVigaCentradoraPilotes(materiales, {
    b: v.b, h: v.h, recubrimiento: v.recubrimiento,
    excentricidadM: v.excentricidad, luzApoyosM: v.luzApoyos,
    ladoPilarM: v.ladoPilar, diametroPiloteM: v.dPilote,
    n1dKN: v.n1d, excentricidadAccidentalM: v.eacc,
    superior: { numero: v.numeroSup, diametroMm: v.diametroSup },
    inferior: { numero: v.numeroInf, diametroMm: v.diametroInf },
    diametroEstriboMm: v.diametroEstribo,
    numeroRamas: v.numeroRamas,
  });
  if (!r.geometriaValida) return null;
  return { v, r, materiales };
}

export type ResueltoVigaCentradoraPilotes = NonNullable<ReturnType<typeof resolverVigaCentradoraPilotes>>;
