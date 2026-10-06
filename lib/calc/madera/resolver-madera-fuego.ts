import { NOMBRE_MADERA, GAMMA_M, kmod, type TipoMadera } from "@/lib/calc/madera/materiales";
import { NOMBRE_ESPECIE_FUEGO, betaN, relacionIncendioFrio, resistenciaEnIncendioMPa, seccionReducida, type CarasExpuestas, type EspecieFuego } from "@/lib/calc/madera/fuego";
import { aNumero } from "@/lib/verificaciones/formato";
import { pandeoEje } from "@/lib/calc/madera/axil";
import { propiedades, tensionAxilMPa, tensionFlexionMPa } from "@/lib/calc/madera/seccion";

export const tipoDesde = (e: string): TipoMadera =>
  ((Object.entries(NOMBRE_MADERA) as [TipoMadera, string][]).find(([, n]) => n === e)?.[0] ?? "maciza");

export const especieDesde = (e: string): EspecieFuego =>
  ((Object.entries(NOMBRE_ESPECIE_FUEGO) as [EspecieFuego, string][]).find(([, n]) => n === e)?.[0] ??
    "conifera");

/**
 * El motor sólo necesita cuántas caras arden, no cuáles: con la sección
 * reducida, quemar arriba o abajo da el mismo canto eficaz. El dibujo sí
 * necesita cuáles, así que la pantalla guarda las cuatro y acá se cuentan.
 */
export function contarCaras(c: { izquierda: boolean; derecha: boolean; superior: boolean; inferior: boolean }): CarasExpuestas {
  const enAnchura = (Number(c.izquierda) + Number(c.derecha)) as 0 | 1 | 2;
  const enCanto = (Number(c.superior) + Number(c.inferior)) as 0 | 1 | 2;
  return { enAnchura, enCanto };
}

/**
 * Cálculo de la página a partir de sus campos, tal como se cargaron.
 *
 * Vive acá y no en la página porque lo corren la pantalla y las
 * recomendaciones, que lo repiten con un dato cambiado: con dos copias, tarde
 * o temprano dirían números distintos.
 */
export function resolverMaderaFuego(campos: Record<string, string>) {
  const num = (clave: string) => aNumero(campos[clave] ?? "");

  const b = num("ancho");
  const h = num("canto");
  const t = num("tiempo");
  const fmkV = num("fmk");
  const fc0kV = num("fc0k");
  const e = num("e005");
  const m = num("momento");
  const n = num("axil");
  const lz = num("lkz");

  if (![b, h, fmkV, fc0kV, e, lz].every((x) => Number.isFinite(x) && x > 0)) return null;
  if (![t, m, n].every((x) => Number.isFinite(x) && x >= 0)) return null;

  const tipoM = tipoDesde(campos.tipo);
  const esp = especieDesde(campos.especie);
  const caras = contarCaras({
    izquierda: campos.caraIzq === "si",
    derecha: campos.caraDer === "si",
    superior: campos.caraSup === "si",
    inferior: campos.caraInf === "si",
  });
  const velocidad = betaN(tipoM, esp);

  const reducida = seccionReducida(b, h, t, velocidad, caras);
  const reducidaFria = seccionReducida(b, h, 0, velocidad, caras);

  // Resistencias del art. 4.2.2(5): kmod,fi = 1 y γM,fi = 1, con kfi.
  const fmdFi = resistenciaEnIncendioMPa(fmkV, tipoM);
  const fc0dFi = resistenciaEnIncendioMPa(fc0kV, tipoM);
  const e005Fi = resistenciaEnIncendioMPa(e, tipoM);

  if (reducida.agotada) {
    return {
      b, h, tipoM, caras, velocidad, reducida, reducidaFria,
      fmdFi, fc0dFi, agotada: true as const,
    };
  }

  const props = propiedades({ anchoM: reducida.anchoEficazM, cantoM: reducida.cantoEficazM });
  const propsFrias = propiedades({ anchoM: b, cantoM: h });

  const sigmaM = tensionFlexionMPa(m, props.wyM3);
  const sigmaC = tensionAxilMPa(n, props.areaM2);

  const ejeZ = pandeoEje(lz / props.radioGiroZM, fc0kV, e005Fi, tipoM);

  const relacion = relacionIncendioFrio(tipoM, kmod(tipoM, 1, "media"), GAMMA_M[tipoM]);

  return {
    b, h, tipoM, caras, velocidad, reducida, reducidaFria, props, propsFrias,
    fmdFi, fc0dFi, e005Fi, sigmaM, sigmaC, ejeZ, relacion,
    aprovechaFlexion: fmdFi > 0 ? sigmaM / fmdFi : Infinity,
    aprovechaCompresion: ejeZ.kc * fc0dFi > 0 ? sigmaC / (ejeZ.kc * fc0dFi) : Infinity,
    agotada: false as const,
  };
}

export type ResueltoMaderaFuego = NonNullable<ReturnType<typeof resolverMaderaFuego>>;
