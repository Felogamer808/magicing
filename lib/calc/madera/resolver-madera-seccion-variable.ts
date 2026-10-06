import { duracionDesdeEtiqueta, servicioDesdeEtiqueta, tipoDesdeEtiqueta } from "@/lib/calc/madera/etiquetas";
import { NOMBRE_FORMA, anguloInclinacionGrados, espesorMaximoLaminaMm, kmAlpha, seccionCriticaTaper, verificarVertice, volumenVertice, type EstadoBordeInclinado, type FormaViga } from "@/lib/calc/madera/seccion-variable";
import { aNumero } from "@/lib/verificaciones/formato";
import { GAMMA_M, kh, kmod, resistenciaDeCalculo } from "@/lib/calc/madera/materiales";

export const formaDesde = (e: string): FormaViga =>
  ((Object.entries(NOMBRE_FORMA) as [FormaViga, string][]).find(([, n]) => n === e)?.[0] ??
    "dos-aguas");

export const BORDES = ["Traccionado", "Comprimido"] as const;

export const bordeDesde = (e: string): EstadoBordeInclinado =>
  e === BORDES[0] ? "traccionado" : "comprimido";

/**
 * Cálculo de la página a partir de sus campos, tal como se cargaron.
 *
 * Vive acá y no en la página porque lo corren la pantalla y las
 * recomendaciones, que lo repiten con un dato cambiado: con dos copias, tarde
 * o temprano dirían números distintos.
 */
export function resolverMaderaSeccionVariable(campos: Record<string, string>) {
  const num = (clave: string) => aNumero(campos[clave] ?? "");

  const l = num("luz");
  const b = num("ancho");
  const he = num("cantoApoyo");
  const hap = num("cantoVertice");
  const q = num("carga");
  const rin = num("radio");
  const tLam = num("espesorLamina");
  const fmkV = num("fmk");
  const fvkV = num("fvk");
  const ft90kV = num("ft90k");
  const fc90kV = num("fc90k");

  if (![l, b, he, hap, q, tLam, fmkV, fvkV, ft90kV, fc90kV].every((x) => Number.isFinite(x) && x > 0))
    return null;
  if (!(hap > he)) return null;
  if (!Number.isFinite(rin) || rin < 0) return null;

  const t = tipoDesdeEtiqueta(campos.tipo);
  const km = kmod(t, servicioDesdeEtiqueta(campos.servicio), duracionDesdeEtiqueta(campos.duracion));
  const gammaM = GAMMA_M[t];
  const laminada = t !== "maciza";

  const fmd = resistenciaDeCalculo(fmkV, { kmod: km, gammaM, kh: kh(t, hap) });
  const fvd = resistenciaDeCalculo(fvkV, { kmod: km, gammaM });
  const ft90d = resistenciaDeCalculo(ft90kV, { kmod: km, gammaM });
  const fc90d = resistenciaDeCalculo(fc90kV, { kmod: km, gammaM });

  const formaV = formaDesde(campos.forma);
  const anguloGrados = anguloInclinacionGrados(l, he, hap);

  // Borde inclinado: sección crítica y km,α.
  const critica = seccionCriticaTaper(l, he, hap, b, q);
  const estadoBorde = bordeDesde(campos.borde);
  const factorKmAlpha = kmAlpha(
    estadoBorde, anguloGrados, fmd.valor, fvd.valor,
    estadoBorde === "traccionado" ? ft90d.valor : fc90d.valor
  );
  const resistenciaBorde = factorKmAlpha * fmd.valor;
  const aprovechaBorde =
    resistenciaBorde > 0 ? critica.sigmaMdMPa / resistenciaBorde : Infinity;

  // Vértice.
  const momentoVertice = (q * l ** 2) / 8;
  const volumenTotal = b * ((he + hap) / 2) * l;
  const volumen = volumenVertice(b, hap, anguloGrados, volumenTotal);

  // Rasante en el vértice, con la anchura eficaz del art. 6.1.7.
  const cortanteVertice = 0;
  const tauD = cortanteVertice;

  const vertice = verificarVertice({
    forma: formaV,
    anchoM: b,
    cantoVerticeM: hap,
    anguloVerticeGrados: anguloGrados,
    radioInteriorM: formaV === "dos-aguas" || rin === 0 ? Infinity : rin,
    espesorLaminaM: tLam,
    momentoVerticeKNm: momentoVertice,
    volumenM3: volumen.adoptadoM3,
    laminada,
    fmdMPa: fmd.valor,
    ft90dMPa: ft90d.valor,
    fvdMPa: fvd.valor,
    tauDMPa: tauD,
  });

  const espesorMax =
    formaV !== "dos-aguas" && rin > 0
      ? espesorMaximoLaminaMm(rin * 1000, num("fmjdek"))
      : null;

  return {
    l, b, he, hap, q, rin, tLam, laminada, km, gammaM,
    fmd, fvd, ft90d, fc90d, anguloGrados, critica, factorKmAlpha,
    resistenciaBorde, aprovechaBorde, momentoVertice, volumen, vertice,
    formaV, espesorMax, estadoBorde,
  };
}

export type ResueltoMaderaSeccionVariable = NonNullable<ReturnType<typeof resolverMaderaSeccionVariable>>;
