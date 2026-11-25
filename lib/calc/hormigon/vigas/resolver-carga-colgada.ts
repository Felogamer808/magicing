import { aNumero } from "@/lib/verificaciones/formato";
import { calcularCuelgue, calcularCuelguePilar } from "@/lib/calc/hormigon/vigas/cuelgue";
import { areaBarraCm2 } from "@/lib/calc/armaduras";

export const TIPOS_CARGA_COLGADA = [
  "Viga que llega a otra (apoyo indirecto)",
  "Pilar con las barras ancladas abajo",
] as const;

export const MODOS_PORCENTAJE = ["Calculado (parte de las barras)", "Impuesto"] as const;

/**
 * Cálculo de la página a partir de sus campos, tal como se cargaron.
 *
 * Vive acá y no en la página porque lo corren la pantalla y las
 * recomendaciones, que lo repiten con un dato cambiado: con dos copias, tarde
 * o temprano dirían números distintos.
 */
export function resolverCargaColgada(campos: Record<string, string>) {
  const num = (clave: string) => aNumero(campos[clave] ?? "");
  const positivos = (o: Record<string, number>) => Object.values(o).every((n) => Number.isFinite(n) && n > 0);

  if (campos.tipo === TIPOS_CARGA_COLGADA[1]) {
    const v = {
      nd: num("nd"),
      fck: num("fck"),
      fyk: num("fyk"),
      h: num("h"),
      ladoPilar: num("ladoPilar"),
      anchoPilar: num("anchoPilar"),
      nBarrasPilar: num("nBarrasPilar"),
      phiPilar: num("phiPilar"),
      diametroEstribo: num("diametroEstribo"),
      numeroRamas: num("numeroRamas"),
    };
    if (!positivos(v)) return null;
    const impuesto = campos.modoPorcentaje === MODOS_PORCENTAJE[1];
    const porcentaje = num("porcentaje");
    if (impuesto && !(Number.isFinite(porcentaje) && porcentaje > 0 && porcentaje <= 100)) return null;

    const asPilarCm2 = v.nBarrasPilar * areaBarraCm2(v.phiPilar);
    const r = calcularCuelguePilar({
      ndPilarKN: v.nd,
      fckMPa: v.fck,
      fykMPa: v.fyk,
      hVigaM: v.h,
      ladoPilarM: v.ladoPilar,
      anchoPilarM: v.anchoPilar,
      asPilarCm2,
      fraccionImpuesta: impuesto ? porcentaje / 100 : undefined,
      diametroEstriboMm: v.diametroEstribo,
      numeroRamas: v.numeroRamas,
    });
    return { tipo: "pilar" as const, v: { ...v, asPilarCm2, impuesto }, r };
  }

  const v = {
    reaccion: num("reaccion"),
    fyk: num("fyk"),
    diametroEstribo: num("diametroEstribo"),
    numeroRamas: num("numeroRamas"),
    h: num("h"),
    h2: num("h2"),
    a: num("a"),
  };
  if (!positivos(v)) return null;

  const r = calcularCuelgue(
    { fykMPa: v.fyk },
    { hM: v.h, h2M: v.h2, aM: v.a },
    { reaccionKN: v.reaccion, diametroEstriboMm: v.diametroEstribo, numeroRamas: v.numeroRamas }
  );
  return { tipo: "viga" as const, v, r };
}

export type ResueltoCargaColgada = NonNullable<ReturnType<typeof resolverCargaColgada>>;
