/**
 * Compresión de miembros sin elementos esbeltos — AISC 360-16, artículos E3
 * (pandeo por flexión) y E4 (pandeo torsional), por el método ASD, igual que
 * el resto de los módulos AISC de este repositorio.
 *
 * Reemplaza la hoja "Hoja2" de la planilla AISC 360.xlsx, que resolvía lo mismo
 * para un perfil por vez y leía las propiedades con HLOOKUP. La planilla no
 * traía pandeo torsional.
 *
 * El art. E4 sólo se aplica a secciones **doblemente simétricas** —el propio
 * curso de referencia lo dice explícito: "se tratan exclusivamente secciones
 * doblemente simétricas"—. No cubre canales o ángulos sueltos, que pandean por
 * flexo-torsión con el centro de corte descentrado del baricentro, un caso
 * distinto (y sin la geometría de centro de corte en este catálogo). De las
 * familias de este módulo, todas menos la PNC suelta lo son: el PNI y el HEB
 * por catálogo, y las dos composiciones de PNC porque `perfiles.ts` ya las
 * arma dobles.
 */

import { designacion, propiedades, type Familia, type ParametrosPerfil } from "@/lib/calc/acero/perfiles";

/** Coeficiente de seguridad para compresión, AISC 360-16 art. E1. */
export const OMEGA_C = 1.67;

export interface DatosCompresion {
  familia: Familia;
  /** Parámetros de la sección, en mm: altura de catálogo, o dimensiones y espesor. */
  params: ParametrosPerfil;
  /** Longitud efectiva de pandeo respecto del eje fuerte, Lc = K·L, en metros. */
  lcxM: number;
  /** Longitud efectiva de pandeo respecto del eje débil, en metros. */
  lcyM: number;
  /** Tensión de fluencia, en Pa. */
  fyPa: number;
  /** Módulo de elasticidad, en Pa. */
  ePa: number;
  /** Carga axial de compresión requerida, en kN. Opcional: solo para verificar. */
  pRequeridaKN?: number;
  /**
   * Longitud efectiva de pandeo torsional, Kz·L, en metros —la distancia entre
   * puntos arriostrados al giro, no necesariamente la misma que lcxM o lcyM—.
   * Sólo se evalúa el art. E4 si se pasa este dato y la sección es doblemente
   * simétrica. Se deja opcional a nivel de función para no romper otros
   * llamadores —flexo-compresión, por ejemplo, todavía no pide este dato—,
   * pero la página de compresión lo pide siempre que corresponde: omitirlo no
   * es una decisión seria, es no haber cargado el dato.
   */
  kzLM?: number;
}

export interface PandeoEnUnEje {
  /** Radio de giro del eje considerado, en m. */
  rM: number;
  lcM: number;
  /** Esbeltez efectiva Lc/r. */
  esbeltez: number;
  /** Esbeltez límite 4,71·√(E/Fy) que separa pandeo inelástico de elástico. */
  esbeltezLimite: number;
  /** Tensión crítica de pandeo elástico, Fe, en Pa (ec. E3-4). */
  fePa: number;
  /** Tensión crítica, Fcr, en Pa (ec. E3-2 o E3-3). */
  fcrPa: number;
  /** Rama aplicada de la norma. */
  regimen: "inelástico (E3-2)" | "elástico (E3-3)";
  /** Resistencia nominal Pn = Fcr·Ag, en kN (ec. E3-1). */
  pnKN: number;
  /** Resistencia admisible Pn/Ωc, en kN. */
  admisibleKN: number;
}

/** Pandeo torsional del art. E4, sólo para secciones doblemente simétricas. */
export interface PandeoTorsional {
  kzLM: number;
  /** Tensión crítica de pandeo elástico torsional, Fe, en Pa (ec. E4-2). */
  fePa: number;
  /** Tensión crítica, Fcr, en Pa (ec. E3-2 o E3-3, tomando la Fe de E4-2). */
  fcrPa: number;
  regimen: "inelástico (E3-2)" | "elástico (E3-3)";
  /** Resistencia nominal Pn = Fcr·Ag, en kN (ec. E4-1). */
  pnKN: number;
  admisibleKN: number;
}

export interface ResultadoCompresion {
  designacion: string;
  areaM2: number;
  ejeFuerte: PandeoEnUnEje;
  ejeDebil: PandeoEnUnEje;
  /** Presente sólo si se pidió y la sección es doblemente simétrica. */
  pandeoTorsional?: PandeoTorsional;
  /** El modo que gobierna: el de menor resistencia admisible. */
  gobierna: "fuerte" | "débil" | "torsional";
  admisibleKN: number;
  /** Esbeltez mayor entre los dos ejes de flexión. La nota de usuario de E2 sugiere no pasar de 200. */
  esbeltezMaxima: number;
  superaEsbeltezRecomendada: boolean;
  verifica: boolean | null;
  aprovechamiento: number | null;
}

/**
 * Tensión crítica del artículo E3, a partir de la esbeltez Lc/r. Sin cambios
 * de comportamiento respecto de antes de agregar el art. E4: sigue
 * comparando contra la esbeltez límite, no contra Fy/Fe.
 */
export function tensionCritica(esbeltez: number, fyPa: number, ePa: number) {
  const fePa = (Math.PI ** 2 * ePa) / esbeltez ** 2; // (E3-4)
  const esbeltezLimite = 4.71 * Math.sqrt(ePa / fyPa);

  const inelastico = esbeltez <= esbeltezLimite;
  const fcrPa = inelastico
    ? Math.pow(0.658, fyPa / fePa) * fyPa // (E3-2)
    : 0.877 * fePa; // (E3-3)

  return {
    fePa,
    fcrPa,
    esbeltezLimite,
    regimen: (inelastico ? "inelástico (E3-2)" : "elástico (E3-3)") as PandeoEnUnEje["regimen"],
  };
}

/**
 * Tensión crítica a partir de Fy y Fe directamente, para el pandeo torsional
 * del art. E4: ahí no hay una esbeltez Lc/r que convertir, hay la tensión de
 * la ec. (E4-2) directa, así que la rama se elige con la forma equivalente
 * Fy/Fe ≤ 2,25 en vez de con una esbeltez límite.
 *
 * Esta forma **no** se comparte con `tensionCritica`: aunque la nota del
 * apunte las da por equivalentes, 4,71 es 4,71 redondeado de π√2,25 = 4,7124,
 * así que las dos formas discrepan por un pelo justo en el límite. Se
 * mantienen separadas para no cambiarle el resultado a `tensionCritica`, que
 * ya está probada contra la planilla con la forma por esbeltez.
 */
function fcrDesdeFe(fePa: number, fyPa: number): { fcrPa: number; regimen: PandeoEnUnEje["regimen"] } {
  const inelastico = fyPa / fePa <= 2.25;
  const fcrPa = inelastico
    ? Math.pow(0.658, fyPa / fePa) * fyPa // (E3-2)
    : 0.877 * fePa; // (E3-3)
  return { fcrPa, regimen: inelastico ? "inelástico (E3-2)" : "elástico (E3-3)" };
}

/**
 * Tensión crítica elástica de pandeo torsional, ec. (E4-2).
 *
 * Fe = [π²·E·Cw/(Kz·L)² + G·J] / (Ix + Iy)
 *
 * G = E/(2·(1+ν)) con ν = 0,3 —el acero modelado como material elástico
 * lineal, tal como lo fija el propio curso—, así que no hace falta pedirlo
 * aparte: sale del mismo E que ya se carga para todo lo demás.
 */
export function tensionCriticaTorsionalPa(
  kzLM: number,
  ePa: number,
  cwM6: number,
  jM4: number,
  ixM4: number,
  iyM4: number
): number {
  const gPa = ePa / 2.6; // E/(2·1,3)
  const numeradorPa = (Math.PI ** 2 * ePa * cwM6) / kzLM ** 2 + gPa * jM4;
  return numeradorPa / (ixM4 + iyM4);
}

function pandeoEnEje(lcM: number, rM: number, areaM2: number, fyPa: number, ePa: number): PandeoEnUnEje {
  const esbeltez = lcM / rM;
  const { fePa, fcrPa, esbeltezLimite, regimen } = tensionCritica(esbeltez, fyPa, ePa);
  const pnKN = (fcrPa * areaM2) / 1000; // (E3-1)

  return {
    rM,
    lcM,
    esbeltez,
    esbeltezLimite,
    fePa,
    fcrPa,
    regimen,
    pnKN,
    admisibleKN: pnKN / OMEGA_C,
  };
}

export function calcularCompresion(datos: DatosCompresion): ResultadoCompresion {
  const p = propiedades(datos.familia, datos.params);

  const ejeFuerte = pandeoEnEje(datos.lcxM, p.rxM, p.areaM2, datos.fyPa, datos.ePa);
  const ejeDebil = pandeoEnEje(datos.lcyM, p.ryM, p.areaM2, datos.fyPa, datos.ePa);

  let pandeoTorsional: PandeoTorsional | undefined;
  if (datos.kzLM !== undefined && p.doblementeSimetrica) {
    const fePa = tensionCriticaTorsionalPa(datos.kzLM, datos.ePa, p.cwM6, p.jM4, p.ixM4, p.iyM4);
    const { fcrPa, regimen } = fcrDesdeFe(fePa, datos.fyPa);
    const pnKN = (fcrPa * p.areaM2) / 1000; // (E4-1)
    pandeoTorsional = { kzLM: datos.kzLM, fePa, fcrPa, regimen, pnKN, admisibleKN: pnKN / OMEGA_C };
  }

  // Gobierna el modo de menor resistencia admisible: el pandeo se produce por
  // donde la barra es más flexible, sea cual sea el eje o el mecanismo.
  const candidatos: Array<{ modo: ResultadoCompresion["gobierna"]; admisibleKN: number }> = [
    { modo: "fuerte", admisibleKN: ejeFuerte.admisibleKN },
    { modo: "débil", admisibleKN: ejeDebil.admisibleKN },
  ];
  if (pandeoTorsional) candidatos.push({ modo: "torsional", admisibleKN: pandeoTorsional.admisibleKN });

  const gobernante = candidatos.reduce((a, b) => (b.admisibleKN < a.admisibleKN ? b : a));
  const admisibleKN = gobernante.admisibleKN;
  const esbeltezMaxima = Math.max(ejeFuerte.esbeltez, ejeDebil.esbeltez);

  const requerida = datos.pRequeridaKN;

  return {
    designacion: designacion(datos.familia, datos.params),
    areaM2: p.areaM2,
    ejeFuerte,
    ejeDebil,
    pandeoTorsional,
    gobierna: gobernante.modo,
    admisibleKN,
    esbeltezMaxima,
    superaEsbeltezRecomendada: esbeltezMaxima > 200,
    verifica: requerida === undefined ? null : requerida <= admisibleKN,
    aprovechamiento: requerida === undefined ? null : requerida / admisibleKN,
  };
}
