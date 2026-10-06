import { aNumero } from "@/lib/verificaciones/formato";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";
import { calcularPilote } from "@/lib/calc/hormigon/cimentaciones/pilote";

/**
 * Cálculo de la página a partir de sus campos, tal como se cargaron.
 *
 * Vive acá y no en la página porque lo corren la pantalla y las
 * recomendaciones, que lo repiten con un dato cambiado: con dos copias, tarde
 * o temprano dirían números distintos.
 */
export function resolverPilote(campos: Record<string, string>) {
  const num = (clave: string) => aNumero(campos[clave] ?? "");

  const v = {
    fck: num("fck"),
    fyk: num("fyk"),
    diametro: num("diametro"),
    longitud: num("longitud"),
    friccion: num("friccion"),
    punta: num("punta"),
    factorSeguridad: num("factorSeguridad"),
    numero: num("numero"),
    diametroBarra: num("diametroBarra"),
    diametroEstribo: num("diametroEstribo"),
    Nk: num("Nk"),
  };

  const todosValidos = Object.values(v).every((n) => Number.isFinite(n));
  const geometriaValida = v.diametro > 0 && v.longitud > 0;
  const geotecniaValida = v.friccion >= 0 && v.punta >= 0 && v.factorSeguridad > 0;
  const armaduraValida = v.numero > 0 && v.diametroBarra > 0 && v.diametroEstribo > 0;

  if (!todosValidos || !geometriaValida || !geotecniaValida || !armaduraValida || v.Nk <= 0) {
    return null;
  }

  const materiales = derivarMateriales({ fck: v.fck, fyk: v.fyk });

  const pilote = calcularPilote(
    materiales,
    { diametroM: v.diametro, longitudM: v.longitud },
    { friccionKPa: v.friccion, puntaKPa: v.punta, factorSeguridad: v.factorSeguridad },
    { numero: v.numero, diametroMm: v.diametroBarra, diametroEstriboMm: v.diametroEstribo },
    { Nk: v.Nk }
  );

  return { pilote, v };
}

export type ResueltoPilote = NonNullable<ReturnType<typeof resolverPilote>>;
