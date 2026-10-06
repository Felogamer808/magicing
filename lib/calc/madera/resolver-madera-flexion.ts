import { servicioDesdeEtiqueta, duracionDesdeEtiqueta, tipoDesdeEtiqueta } from "@/lib/calc/madera/etiquetas";
import { NOMBRE_CASO_VUELCO, flexionEsviada, verificarVuelco, type BordeCarga, type CasoVuelco } from "@/lib/calc/madera/flexion";
import { GAMMA_M, KM_OTRAS_SECCIONES, KM_RECTANGULAR, KSYS_COMPARTIDA, kh, kmod, resistenciaDeCalculo } from "@/lib/calc/madera/materiales";
import { aNumero } from "@/lib/verificaciones/formato";
import { propiedades, tensionFlexionMPa } from "@/lib/calc/madera/seccion";

export const casoDesdeEtiqueta = (e: string): CasoVuelco =>
  ((Object.entries(NOMBRE_CASO_VUELCO) as [CasoVuelco, string][]).find(([, n]) => n === e)?.[0] ??
    "apoyada-distribuida");

export const BORDES = ["Borde comprimido", "Centro de gravedad", "Borde traccionado"] as const;

export const bordeDesde = (e: string): BordeCarga =>
  e === BORDES[0] ? "comprimido" : e === BORDES[2] ? "traccionado" : "centro-gravedad";

export const ARRIOSTRADO = ["No", "Sí, en toda su longitud"] as const;

export const REPARTO = ["No compartida", "Compartida (ksys = 1,1)"] as const;

/**
 * Cálculo de la página a partir de sus campos, tal como se cargaron.
 *
 * Vive acá y no en la página porque lo corren la pantalla y las
 * recomendaciones, que lo repiten con un dato cambiado: con dos copias, tarde
 * o temprano dirían números distintos.
 */
export function resolverMaderaFlexion(campos: Record<string, string>) {
  const num = (clave: string) => aNumero(campos[clave] ?? "");

  const b = num("ancho");
  const h = num("canto");
  const l = num("luz");
  const fmkV = num("fmk");
  const e = num("e005");
  const g = num("g005");
  const myV = num("my");
  const mzV = num("mz");

  if (![b, h, l, fmkV, e, g].every((x) => Number.isFinite(x) && x > 0)) return null;
  if (![myV, mzV].every((x) => Number.isFinite(x) && x >= 0)) return null;

  const t = tipoDesdeEtiqueta(campos.tipo);
  const km = kmod(t, servicioDesdeEtiqueta(campos.servicio), duracionDesdeEtiqueta(campos.duracion));
  const gammaM = GAMMA_M[t];
  const ksys = campos.reparto === REPARTO[1] ? KSYS_COMPARTIDA : 1;

  /*
   * kh se calcula por separado en cada eje: para el eje fuerte manda el campos.canto
   * y para el débil la anchura, porque el "h" de las ecs. (3.1)/(3.2) es la
   * dimensión perpendicular al eje de flexión.
   */
  const khY = kh(t, h);
  const khZ = kh(t, b);

  const fmYd = resistenciaDeCalculo(fmkV, { kmod: km, gammaM, kh: khY, ksys });
  const fmZd = resistenciaDeCalculo(fmkV, { kmod: km, gammaM, kh: khZ, ksys });

  const seccion = { anchoM: b, cantoM: h };
  const props = propiedades(seccion);

  const sigmaY = tensionFlexionMPa(myV, props.wyM3);
  const sigmaZ = tensionFlexionMPa(mzV, props.wzM3);

  const esviada = flexionEsviada(
    sigmaY, sigmaZ, fmYd.valor, fmZd.valor,
    mzV > 0 ? KM_RECTANGULAR : KM_OTRAS_SECCIONES
  );

  const vuelco = verificarVuelco({
    seccion,
    luzM: l,
    caso: casoDesdeEtiqueta(campos.caso),
    borde: bordeDesde(campos.borde),
    e005GPa: e,
    g005GPa: g,
    fmkMPa: fmkV,
    fmdMPa: fmYd.valor,
    sigmaMdMPa: sigmaY,
    arriostrado: campos.arriostrado === ARRIOSTRADO[1],
  });

  return {
    b, h, l, t, km, gammaM, ksys, khY, khZ, fmYd, fmZd, props,
    sigmaY, sigmaZ, esviada, vuelco, hayEsviada: mzV > 0,
  };
}

export type ResueltoMaderaFlexion = NonNullable<ReturnType<typeof resolverMaderaFlexion>>;
