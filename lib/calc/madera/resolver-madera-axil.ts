import { duracionDesdeEtiqueta, servicioDesdeEtiqueta, tipoDesdeEtiqueta } from "@/lib/calc/madera/etiquetas";
import { kc90, verificarCompresion, verificarCompresionPerpendicular, verificarTraccion, type TipoApoyo } from "@/lib/calc/madera/axil";
import { aNumero } from "@/lib/verificaciones/formato";
import { GAMMA_M, KSYS_COMPARTIDA, kh, kmod, resistenciaDeCalculo } from "@/lib/calc/madera/materiales";
import { propiedades } from "@/lib/calc/madera/seccion";

export const APOYOS = ["Apoyo continuo", "Apoyos aislados"] as const;

export const apoyoDesde = (e: string): TipoApoyo => (e === APOYOS[0] ? "continuo" : "aislado");

export const ESPECIES = ["Conífera", "Frondosa"] as const;

export const REPARTO = ["No compartida", "Compartida (ksys = 1,1)"] as const;

/**
 * Cálculo de la página a partir de sus campos, tal como se cargaron.
 *
 * Vive acá y no en la página porque lo corren la pantalla y las
 * recomendaciones, que lo repiten con un dato cambiado: con dos copias, tarde
 * o temprano dirían números distintos.
 */
export function resolverMaderaAxil(campos: Record<string, string>) {
  const num = (clave: string) => aNumero(campos[clave] ?? "");

  const b = num("ancho");
  const h = num("canto");
  const ft0kV = num("ft0k");
  const fc0kV = num("fc0k");
  const fc90kV = num("fc90k");
  const e = num("e005");
  const nt = num("traccion");
  const nc = num("compresion");
  const ly = num("lky");
  const lz = num("lkz");

  if (![b, h, ft0kV, fc0kV, fc90kV, e, ly, lz].every((x) => Number.isFinite(x) && x > 0)) return null;
  if (![nt, nc].every((x) => Number.isFinite(x) && x >= 0)) return null;

  const t = tipoDesdeEtiqueta(campos.tipo);
  const km = kmod(t, servicioDesdeEtiqueta(campos.servicio), duracionDesdeEtiqueta(campos.duracion));
  const gammaM = GAMMA_M[t];
  const ksys = campos.reparto === REPARTO[1] ? KSYS_COMPARTIDA : 1;

  /*
   * En tracción el "h" de kh es la anchura de la pieza —la dimensión mayor de
   * la sección, arts. 3.2(3) y 3.3(3)—, no el campos.canto de flexión. Compresión no
   * lleva kh: los factores de tamaño sólo suben fm,k y ft,0,k.
   */
  const khT = kh(t, Math.max(b, h));
  const ft0d = resistenciaDeCalculo(ft0kV, { kmod: km, gammaM, kh: khT, ksys });
  const fc0d = resistenciaDeCalculo(fc0kV, { kmod: km, gammaM, ksys });
  const fc90d = resistenciaDeCalculo(fc90kV, { kmod: km, gammaM });

  const props = propiedades({ anchoM: b, cantoM: h });

  const rTraccion = nt > 0 ? verificarTraccion(nt, props.areaM2, ft0d.valor) : null;

  const rCompresion =
    nc > 0
      ? verificarCompresion({
          axilKN: nc,
          areaM2: props.areaM2,
          radioGiroYM: props.radioGiroYM,
          radioGiroZM: props.radioGiroZM,
          longitudPandeoYM: ly,
          longitudPandeoZM: lz,
          fc0kMPa: fc0kV,
          fc0dMPa: fc0d.valor,
          e005GPa: e,
          tipo: t,
        })
      : null;

  const cargaAp = num("cargaApoyo");
  const ba = num("anchoApoyo");
  const la = num("largoApoyo");
  const a = num("vuelo");
  const l1 = num("vecina");
  const apoyoValido =
    [cargaAp, ba, la, a, l1].every((x) => Number.isFinite(x) && x >= 0) && ba > 0 && la > 0 && cargaAp > 0;

  const factorKc90 = apoyoValido
    ? kc90({
        tipo: t,
        conifera: campos.especie === ESPECIES[0],
        apoyo: apoyoDesde(campos.apoyo),
        longitudContactoM: la,
        distanciaVecinaM: l1,
        cantoM: h,
      })
    : null;

  const rPerpendicular =
    apoyoValido && factorKc90
      ? verificarCompresionPerpendicular({
          cargaKN: cargaAp,
          anchoApoyoM: ba,
          longitudContactoM: la,
          vueloM: a,
          distanciaVecinaM: l1,
          fc90dMPa: fc90d.valor,
          kc90: factorKc90.kc90,
        })
      : null;

  return {
    b, h, t, km, gammaM, ksys, khT, ft0d, fc0d, fc90d, props,
    rTraccion, rCompresion, factorKc90, rPerpendicular, apoyoValido,
    fc0kV, e, la, a,
  };
}

export type ResueltoMaderaAxil = NonNullable<ReturnType<typeof resolverMaderaAxil>>;
