import { duracionDesdeEtiqueta, servicioDesdeEtiqueta, tipoDesdeEtiqueta } from "@/lib/calc/madera/etiquetas";
import { verificarFlexionCompuesta } from "@/lib/calc/madera/flexion-compuesta";
import { GAMMA_M, KM_OTRAS_SECCIONES, KM_RECTANGULAR, kh, kmod, resistenciaDeCalculo } from "@/lib/calc/madera/materiales";
import { aNumero } from "@/lib/verificaciones/formato";
import { pandeoEje } from "@/lib/calc/madera/axil";
import { kcrit, longitudEficazM, tensionCritica } from "@/lib/calc/madera/flexion";
import { propiedades, tensionAxilMPa, tensionFlexionMPa } from "@/lib/calc/madera/seccion";

export const SIGNOS = ["Compresión", "Tracción"] as const;

export const PROBLEMAS = ["Columna: pandeo por compresión", "Viga: vuelco lateral, ec. (6.35)"] as const;

/**
 * Cálculo de la página a partir de sus campos, tal como se cargaron.
 *
 * Vive acá y no en la página porque lo corren la pantalla y las
 * recomendaciones, que lo repiten con un dato cambiado: con dos copias, tarde
 * o temprano dirían números distintos.
 */
export function resolverMaderaFlexionCompuesta(campos: Record<string, string>) {
  const num = (clave: string) => aNumero(campos[clave] ?? "");

  const b = num("ancho");
  const h = num("canto");
  const ly = num("lky");
  const lz = num("lkz");
  const l = num("luz");
  const fmkN = num("fmk");
  const ft0kN = num("ft0k");
  const fc0kN = num("fc0k");
  const e = num("e005");
  const g = num("g005");
  const n = num("axil");
  const myN = num("my");
  const mzN = num("mz");

  if (![b, h, ly, lz, l, fmkN, ft0kN, fc0kN, e, g].every((x) => Number.isFinite(x) && x > 0)) return null;
  if (![n, myN, mzN].every((x) => Number.isFinite(x) && x >= 0)) return null;

  const t = tipoDesdeEtiqueta(campos.tipo);
  const km = kmod(t, servicioDesdeEtiqueta(campos.servicio), duracionDesdeEtiqueta(campos.duracion));
  const gammaM = GAMMA_M[t];

  const fmYd = resistenciaDeCalculo(fmkN, { kmod: km, gammaM, kh: kh(t, h) });
  const fmZd = resistenciaDeCalculo(fmkN, { kmod: km, gammaM, kh: kh(t, b) });
  const ft0d = resistenciaDeCalculo(ft0kN, { kmod: km, gammaM, kh: kh(t, Math.max(b, h)) });
  const fc0d = resistenciaDeCalculo(fc0kN, { kmod: km, gammaM });

  const props = propiedades({ anchoM: b, cantoM: h });

  const ejeY = pandeoEje(ly / props.radioGiroYM, fc0kN, e, t);
  const ejeZ = pandeoEje(lz / props.radioGiroZM, fc0kN, e, t);
  const sinInestabilidad = ejeY.lambdaRel <= 0.3 && ejeZ.lambdaRel <= 0.3;

  const traccionada = campos.signo === SIGNOS[1];
  const sigmaAxil = tensionAxilMPa(n, props.areaM2);
  const sigmaMY = tensionFlexionMPa(myN, props.wyM3);
  const sigmaMZ = tensionFlexionMPa(mzN, props.wzM3);

  // Vuelco, sólo necesario en el modo de la ec. (6.35).
  const esVuelco = !traccionada && campos.problema === PROBLEMAS[1];
  const lef = longitudEficazM(l, "apoyada-distribuida", "comprimido", h);
  const sigmaCrit = tensionCritica({ anchoM: b, cantoM: h }, lef, e, g).simplificadaMPa;
  const lambdaRelM = sigmaCrit > 0 ? Math.sqrt(fmkN / sigmaCrit) : Infinity;
  const factorKcrit = kcrit(lambdaRelM);

  const resultado = verificarFlexionCompuesta({
    sigmaT0dMPa: traccionada ? sigmaAxil : 0,
    sigmaC0dMPa: traccionada ? 0 : sigmaAxil,
    sigmaMYdMPa: sigmaMY,
    sigmaMZdMPa: sigmaMZ,
    ft0dMPa: ft0d.valor,
    fc0dMPa: fc0d.valor,
    fmYdMPa: fmYd.valor,
    fmZdMPa: fmZd.valor,
    km: mzN > 0 ? KM_RECTANGULAR : KM_OTRAS_SECCIONES,
    kcY: ejeY.kc,
    kcZ: ejeZ.kc,
    kcrit: factorKcrit,
    sinInestabilidad,
    verificarVuelco: esVuelco,
  });

  return {
    b, h, t, km, gammaM, props, ejeY, ejeZ, sinInestabilidad, traccionada,
    sigmaAxil, sigmaMY, sigmaMZ, fmYd, fmZd, ft0d, fc0d, resultado,
    esVuelco, lef, sigmaCrit, lambdaRelM, factorKcrit, fc0kN, e,
    ratioAxil: traccionada
      ? sigmaAxil / ft0d.valor
      : sinInestabilidad
        ? sigmaAxil / fc0d.valor
        : sigmaAxil / (Math.min(ejeY.kc, ejeZ.kc) * fc0d.valor),
    ratioFlexion: esVuelco
      ? sigmaMY / (factorKcrit * fmYd.valor)
      : sigmaMY / fmYd.valor,
  };
}

export type ResueltoMaderaFlexionCompuesta = NonNullable<ReturnType<typeof resolverMaderaFlexionCompuesta>>;
