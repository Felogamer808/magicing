import { duracionDesdeEtiqueta, servicioDesdeEtiqueta, tipoDesdeEtiqueta } from "@/lib/calc/madera/etiquetas";
import { verificarCortante, verificarEntalladura, verificarTorsion, type LadoEntalladura } from "@/lib/calc/madera/cortante";
import { aNumero } from "@/lib/verificaciones/formato";
import { GAMMA_M, KCR, kmod, resistenciaDeCalculo } from "@/lib/calc/madera/materiales";

export const LADOS = ["Mismo lado que el apoyo", "Lado opuesto al apoyo"] as const;

export const ladoDesde = (e: string): LadoEntalladura =>
  e === LADOS[1] ? "lado-opuesto" : "mismo-lado";

export const HAY_ENTALLADURA = ["Sin entalladura", "Con entalladura en el apoyo"] as const;

export const FORMAS = ["Rectangular", "Circular"] as const;

/**
 * Cálculo de la página a partir de sus campos, tal como se cargaron.
 *
 * Vive acá y no en la página porque lo corren la pantalla y las
 * recomendaciones, que lo repiten con un dato cambiado: con dos copias, tarde
 * o temprano dirían números distintos.
 */
export function resolverMaderaCortante(campos: Record<string, string>) {
  const num = (clave: string) => aNumero(campos[clave] ?? "");

  const b = num("ancho");
  const h = num("canto");
  const v = num("vd");
  const fvkV = num("fvk");
  const t = num("torsor");

  if (![b, h, fvkV].every((x) => Number.isFinite(x) && x > 0)) return null;
  if (![v, t].every((x) => Number.isFinite(x) && x >= 0)) return null;

  const tipoM = tipoDesdeEtiqueta(campos.tipo);
  const km = kmod(tipoM, servicioDesdeEtiqueta(campos.servicio), duracionDesdeEtiqueta(campos.duracion));
  const gammaM = GAMMA_M[tipoM];
  const kcr = KCR[tipoM];

  // El cortante no lleva kh ni ksys: los factores de tamaño sólo afectan a
  // fm,k y ft,0,k, arts. 3.2(3) y 3.3(3).
  const fvd = resistenciaDeCalculo(fvkV, { kmod: km, gammaM });

  const cortante = verificarCortante(v, b, h, kcr, fvd.valor);

  const hay = campos.conEntalladura === HAY_ENTALLADURA[1];
  const hefV = num("hef");
  const proy = num("proyeccion");
  const xV = num("xApoyo");
  const entalladuraValida =
    hay && [hefV, proy, xV].every((x) => Number.isFinite(x) && x >= 0) && hefV > 0 && hefV <= h;

  const entalladura = entalladuraValida
    ? verificarEntalladura({
        tipo: tipoM,
        cortanteKN: v,
        anchoM: b,
        cantoM: h,
        cantoEficazM: hefV,
        proyeccionM: proy,
        distanciaApoyoM: xV,
        lado: ladoDesde(campos.lado),
        kcr,
        fvdMPa: fvd.valor,
      })
    : null;

  const torsion =
    t > 0
      ? verificarTorsion({
          torsorKNm: t,
          anchoM: b,
          cantoM: h,
          forma: campos.forma === FORMAS[1] ? "circular" : "rectangular",
          fvdMPa: fvd.valor,
        })
      : null;

  return {
    b, h, v, tipoM, km, gammaM, kcr, fvd, cortante,
    entalladura, entalladuraValida, hay,
    hefV, proy, xV, torsion,
  };
}

export type ResueltoMaderaCortante = NonNullable<ReturnType<typeof resolverMaderaCortante>>;
