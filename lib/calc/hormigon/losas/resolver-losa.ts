import { aNumero } from "@/lib/verificaciones/formato";
import { calcularLosa, calcularMomentoResistenteLosa, type EmpotramientoParcial } from "@/lib/calc/hormigon/losas/losa";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";

/**
 * Cálculo de la página a partir de sus campos, tal como se cargaron.
 *
 * Vive acá y no en la página porque lo corren la pantalla y las
 * recomendaciones, que lo repiten con un dato cambiado: con dos copias, tarde
 * o temprano dirían números distintos.
 */
export function resolverLosa(campos: Record<string, string>) {
  const num = (clave: string) => aNumero(campos[clave] ?? "");

  const v = {
    fck: num("fck"), fyk: num("fyk"),
    e: num("e"), rgPos: num("rgPos"), rgNeg: num("rgNeg"),
    mxPos: num("mxPos"), myPos: num("myPos"), mxNeg: num("mxNeg"), myNeg: num("myNeg"),
    phiPosX: num("phiPosX"), sPosX: num("sPosX"),
    phiPosY: num("phiPosY"), sPosY: num("sPosY"),
    phiNegX: num("phiNegX"), sNegX: num("sNegX"),
    phiNegY: num("phiNegY"), sNegY: num("sNegY"),
  };
  if (!Object.values(v).every((n) => Number.isFinite(n) && n >= 0)) return null;
  if (v.e <= 0 || v.fck <= 0 || v.fyk <= 0) return null;
  if ([v.phiPosX, v.sPosX, v.phiPosY, v.sPosY, v.phiNegX, v.sNegX, v.phiNegY, v.sNegY].some((n) => n <= 0)) return null;

  const materiales = derivarMateriales({ fck: v.fck, fyk: v.fyk });
  const geometria = { e: v.e, recubrimientoPositivo: v.rgPos, recubrimientoNegativo: v.rgNeg };

  const losa = calcularLosa(materiales, geometria, {
    momentoPositivoX: v.mxPos, momentoPositivoY: v.myPos,
    momentoNegativoX: v.mxNeg, momentoNegativoY: v.myNeg,
    armadoPositivoX: { diametroMm: v.phiPosX, separacionM: v.sPosX },
    armadoPositivoY: { diametroMm: v.phiPosY, separacionM: v.sPosY },
    armadoNegativoX: { diametroMm: v.phiNegX, separacionM: v.sNegX },
    armadoNegativoY: { diametroMm: v.phiNegY, separacionM: v.sNegY },
    formaAnclaje: campos.formaAnclaje === "Patilla o gancho" ? "gancho" : "recta",
    empotramientoParcialX: empotramientoDesdeCampo(campos.empotramientoX),
    empotramientoParcialY: empotramientoDesdeCampo(campos.empotramientoY),
  });

  const resistente = calcularMomentoResistenteLosa(materiales, v.e, v.rgPos, {
    diametroMm: v.phiPosX, separacionM: v.sPosX,
  });

  return { losa, resistente, v };
}

function empotramientoDesdeCampo(valor: string | undefined): EmpotramientoParcial {
  return valor === "intermedio" || valor === "extremo" ? valor : "no";
}

export type ResueltoLosa = NonNullable<ReturnType<typeof resolverLosa>>;
