/**
 * Compresión de miembros sin elementos esbeltos — AISC 360-16, artículos E3
 * (pandeo por flexión), E4 (pandeo torsional) y E6 (columnas armadas), por el
 * método ASD, igual que el resto de los módulos AISC de este repositorio.
 *
 * Reemplaza la hoja "Hoja2" de la planilla AISC 360.xlsx, que resolvía lo mismo
 * para un perfil por vez y leía las propiedades con HLOOKUP. La planilla no
 * traía pandeo torsional ni columna armada: esas dos partes salen de las notas
 * del curso Estructuras de Acero (FING, UdelaR), que sí las desarrollan.
 *
 * El art. E4 sólo se aplica a secciones **doblemente simétricas** —el propio
 * curso de referencia lo dice explícito: "se tratan exclusivamente secciones
 * doblemente simétricas"—. No cubre canales o ángulos sueltos, que pandean por
 * flexo-torsión con el centro de corte descentrado del baricentro, un caso
 * distinto (y sin la geometría de centro de corte en este catálogo). De las
 * familias de este módulo, todas menos la PNC suelta lo son: el PNI y el HEB
 * por catálogo, y las dos composiciones de PNC porque `perfiles.ts` ya las
 * arma dobles.
 *
 * El art. E6 aplica sólo a la familia 2PNC-almas con conectores intermedios
 * en vez de soldadura corrida, y sólo corrige el eje débil —ver el detalle en
 * `DatosColumnaArmada` más abajo—.
 */

import {
  designacion,
  propiedades,
  radioGiroIndividualPNCM,
  type Familia,
  type ParametrosPerfil,
} from "@/lib/calc/acero/perfiles";

/** Coeficiente de seguridad para compresión, AISC 360-16 art. E1. */
export const OMEGA_C = 1.67;

/**
 * Conector entre los dos componentes de una columna armada, art. E6.2. La
 * norma no distingue "atornillado" de "soldado": distingue si el conector deja
 * juego (bulones sin pretensar) o no (soldadura, o bulones pretensados con
 * superficies de fricción Clase A o B). El juego es lo que cambia la fórmula.
 */
export type TipoConectorArmada = "atornillado-sin-pretensar" | "soldado-o-pretensado";

export interface DatosColumnaArmada {
  /** Separación entre conectores a lo largo de la barra, en metros. */
  aM: number;
  tipo: TipoConectorArmada;
}

/** Ki de la tabla del art. E6.2 para canales espalda con espalda —el armado de 2PNC-almas—. */
export const KI_CANALES_ESPALDA_CON_ESPALDA = 0.75;

export interface ResultadoColumnaArmada {
  /** ri: radio de giro mínimo de una PNC sola, antes de componerla, en m. */
  riM: number;
  ki: number;
  /** a/ri: la relación que decide qué rama de E6.2 aplica. */
  relacion: number;
  ecuacion: "E6-1" | "E6-2a" | "E6-2b";
  /** (Lc/r)0: esbeltez de la sección "perfectamente compuesta", sin corregir. */
  esbeltezGeometrica: number;
  /** (Lc/r)m: esbeltez corregida, la que entra en la ec. E3-4 en lugar de (Lc/r)0. */
  esbeltezModificada: number;
  /** Separación máxima entre conectores, art. E6.2(a): 0,75 de la esbeltez que gobierna la columna, por ri. */
  separacionMaximaM: number;
  cumpleSeparacionMaxima: boolean;
}

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
  /**
   * Sólo si la familia es 2PNC-almas y los dos canales se unen con conectores
   * intermedios en vez de soldadura corrida: dispara la corrección del art. E6.
   *
   * Se aplica únicamente al eje débil. Es el eje con término de Steiner en la
   * composición —cada canal aporta su inercia propia más A·brazo² hasta el eje
   * de simetría— y por eso es el único que necesita que los conectores
   * transmitan corte entre los dos canales para que trabajen como una sola
   * pieza. El eje fuerte duplica Ix sin ningún traslado: cada canal ya flexiona
   * solo alrededor de su propio eje fuerte, sin depender de la conexión.
   */
  columnaArmada?: DatosColumnaArmada;
}

export interface PandeoEnUnEje {
  /** Radio de giro del eje considerado, en m. */
  rM: number;
  lcM: number;
  /** Esbeltez efectiva: (Lc/r)m si hay corrección de columna armada, si no Lc/r. */
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
  /** Presente sólo si `datos.columnaArmada` se pidió y aplica. */
  columnaArmada?: ResultadoColumnaArmada;
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

function pandeoEnEje(
  lcM: number,
  rM: number,
  areaM2: number,
  fyPa: number,
  ePa: number,
  esbeltezOverride?: number
): PandeoEnUnEje {
  const esbeltez = esbeltezOverride ?? lcM / rM;
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

/**
 * Esbeltez modificada del art. E6.2, ecs. (E6-1), (E6-2a) y (E6-2b).
 *
 * `esbeltezGeometrica` es (Lc/r)0: la de la sección compuesta como si fuera
 * maciza, que es lo que calcula el resto del módulo. La corrección le suma el
 * efecto de que los conectores no son un vínculo continuo, así que permiten
 * algo de corte relativo entre los dos canales.
 *
 * Con conectores atornillados sin pretensar no hay umbral: la ec. (E6-1) se
 * aplica siempre, porque el juego del bulón deja pasar deslizamiento desde
 * cargas chicas. Con soldadura o bulones pretensados de fricción, por debajo
 * de a/ri = 40 la corrección es nula —los conectores están lo bastante
 * seguidos como para que la columna se comporte compuesta— y por encima entra
 * el mismo tipo de término, pero atenuado por Ki.
 */
export function esbeltezModificadaE6(
  esbeltezGeometrica: number,
  aM: number,
  riM: number,
  tipo: TipoConectorArmada,
  ki: number
): Pick<ResultadoColumnaArmada, "relacion" | "ecuacion" | "esbeltezModificada"> {
  const relacion = aM / riM;

  if (tipo === "atornillado-sin-pretensar") {
    return {
      relacion,
      ecuacion: "E6-1",
      esbeltezModificada: Math.sqrt(esbeltezGeometrica ** 2 + relacion ** 2),
    };
  }

  if (relacion <= 40) {
    return { relacion, ecuacion: "E6-2a", esbeltezModificada: esbeltezGeometrica };
  }
  return {
    relacion,
    ecuacion: "E6-2b",
    esbeltezModificada: Math.sqrt(esbeltezGeometrica ** 2 + (ki * relacion) ** 2),
  };
}

export function calcularCompresion(datos: DatosCompresion): ResultadoCompresion {
  const p = propiedades(datos.familia, datos.params);

  const ejeFuerte = pandeoEnEje(datos.lcxM, p.rxM, p.areaM2, datos.fyPa, datos.ePa);

  let columnaArmada: ResultadoColumnaArmada | undefined;
  let esbeltezDebilOverride: number | undefined;

  if (datos.columnaArmada && datos.familia === "2PNC-almas") {
    // `params.altura` ya tiene que estar definido acá: si faltara, propiedades()
    // habría lanzado antes de llegar a esta línea.
    const riM = radioGiroIndividualPNCM(datos.params.altura!);
    const esbeltezGeometrica = datos.lcyM / p.ryM;
    const ki = KI_CANALES_ESPALDA_CON_ESPALDA;

    const { relacion, ecuacion, esbeltezModificada } = esbeltezModificadaE6(
      esbeltezGeometrica,
      datos.columnaArmada.aM,
      riM,
      datos.columnaArmada.tipo,
      ki
    );

    // Art. E6.2(a): la esbeltez de un tramo individual entre conectores tiene
    // que quedar por debajo de 3/4 de la esbeltez que gobierna la columna
    // compuesta. Se despeja como separación máxima, que es el dato que hace
    // falta para poner los conectores en el plano, no la esbeltez en sí.
    const separacionMaximaM = 0.75 * esbeltezModificada * riM;

    columnaArmada = {
      riM,
      ki,
      relacion,
      ecuacion,
      esbeltezGeometrica,
      esbeltezModificada,
      separacionMaximaM,
      cumpleSeparacionMaxima: datos.columnaArmada.aM <= separacionMaximaM,
    };
    esbeltezDebilOverride = esbeltezModificada;
  }

  const ejeDebil = pandeoEnEje(
    datos.lcyM,
    p.ryM,
    p.areaM2,
    datos.fyPa,
    datos.ePa,
    esbeltezDebilOverride
  );

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
    columnaArmada,
  };
}
