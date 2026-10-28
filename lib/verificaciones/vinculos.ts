import type { DatosVigaLibre, EsfuerzosTramo } from "@/lib/calc/estatica/viga-libre";
import { calcularL0, tramoL0DesdeCampo, type TramoL0 } from "@/lib/calc/hormigon/vigas/seccion-t";
import type { SeccionVigaLibre } from "./viga-libre-modelo";
import { fmt } from "./formato";
import type { IdVerificacion } from "./registry";

/**
 * Encadenado de verificaciones: llevar lo ya cargado en una a otra que comparte
 * los mismos datos.
 *
 * Una viga se verifica en ELU —a flexión y cortante, o a flexión, cortante y
 * torsión si la hay— y después hay que mirarle la fisuración y la flecha, que
 * son la misma viga: el mismo hormigón, la misma sección, la misma armadura.
 * Volver a tipear todo en cada página es trabajo repetido y, peor, una
 * oportunidad de que las verificaciones terminen hablando de vigas distintas.
 *
 * De ELU a servicio la misma lista sirve para las dos páginas de origen. De
 * flexión a torsión hay además un vínculo propio (pedido del usuario,
 * 2026-10-28): torsión resuelve también la flexión y el cortante, pero la viga
 * suele cargarse primero en flexión y recién después aparece el Td.
 *
 * Cómo está resuelto y por qué así:
 *
 *  - El arrastre es **explícito**: se dispara al apretar el botón, no solo.
 *    Sincronizar en vivo obligaría a que todas las páginas compartieran un
 *    único juego de datos, y entonces abrir una verificación para probar un
 *    caso suelto te pisaría el que tenías en curso. Cada página sigue
 *    funcionando sola, con sus propios datos guardados.
 *  - El destino se **pisa**. Es lo que se está pidiendo al apretar el botón, y
 *    por eso el panel dice de antemano qué se lleva.
 *  - Lo que no se puede deducir **no se inventa**. El caso claro es el momento
 *    cuasipermanente: la página de vigas trabaja con el momento de cálculo, y
 *    pasarlo como si fuera de servicio daría fisuras y flechas infladas. Se
 *    deja vacío y el panel avisa que hay que cargarlo.
 */

/**
 * Lo que una viga puede exportar: los datos de entrada tal como están escritos
 * —en texto, para que no haya un ida y vuelta de formato— y los tres resultados
 * que las verificaciones de servicio piden como dato de entrada.
 *
 * Lo llenan por igual la página de flexión y cortante y la de torsión. En la de
 * torsión, la As necesaria que sale ya trae sumado el aporte longitudinal de
 * torsión (Al/4 por cara), que es justo lo que corresponde arrastrar.
 */
export interface DatosVigaCompartidos {
  fck: string;
  fyk: string;
  b: string;
  h: string;
  recubrimiento: string;
  numeroPos: string;
  diametroPos: string;
  /** 2ª capa de la armadura positiva. La página de torsión no la contempla. */
  numeroPos2?: string;
  diametroPos2?: string;
  /** Diámetro de la armadura superior, sólo para situar d'. */
  diametroNeg: string;
  /**
   * Diámetro del estribo (mm). En la viga el recubrimiento llega al estribo;
   * en fisuración y en d' hace falta el de la barra longitudinal, que es éste
   * más el estribo.
   */
  diametroEstribo?: string;
  /**
   * Campos de la sección en T, con los nombres que usan las tres páginas
   * (tipoSeccion, anchoAla, espesorAla, tramoL0, luz1, luz2, l0). Sin ellos
   * la viga es rectangular.
   */
  seccionT?: Record<string, string>;
  /** Canto útil de la armadura positiva (m), que la viga ya calculó. */
  dUtilM: number;
  /** As necesaria en ELU de la positiva (cm²). */
  asNecPosCm2: number;
  /** As realmente dispuesta en la positiva (cm²). */
  asRealPosCm2: number;
}

export interface Vinculo {
  id: IdVerificacion;
  titulo: string;
  ruta: string;
  /** Qué viaja, en lenguaje llano: es lo que el usuario lee antes de apretar. */
  lleva: string;
  /** Qué queda por cargar del otro lado, si algo. */
  falta?: string;
  /**
   * Los campos del destino. `origen` son los de la página de origen tal como
   * están escritos, para los vínculos que llevan más que lo compartido.
   */
  campos: (d: DatosVigaCompartidos, origen?: Record<string, string>) => Record<string, string>;
  /**
   * Campos que el destino tiene que pedir sí o sí y que la viga no puede
   * aportar. Se dejan en blanco al llegar —si nunca se cargaron— para que la
   * página no muestre un resultado armado con sus valores de ejemplo.
   */
  blanquear?: string[];
}

/**
 * De la zapata aislada con el pilar descentrado a la misma zapata con viga
 * centradora.
 *
 * Es el paso que se da cuando la zapata con el pilar contra la medianera no
 * verifica: agrandarla no ayuda (la cuña de contacto mide 1,5·c sea cual sea
 * el largo) y hay que cambiar de sistema. Viaja todo lo de la zapata y el
 * pilar; la medianera es el borde de inicio en A, así que la distancia de la
 * cara del pilar a ese borde es la distancia al límite. La viga no existía, así
 * que su luz se deja en blanco para que no se vea un resultado con una luz de
 * ejemplo.
 *
 * El momento en A cambia de signo: en la zapata es positivo hacia el borde
 * final (el interior), y en la viga centradora es positivo hacia la medianera,
 * que es el sentido que carga la palanca.
 */
export const RUTA_VIGA_CENTRADORA = "/verificaciones/zapata-viga-centradora";
export const BLANQUEAR_VIGA_CENTRADORA = ["luz"];

export function camposVigaCentradoraDesdeZapata(campos: Record<string, string>): Record<string, string> {
  const copiar = [
    "fck", "fyk", "sigmaAdmisible", "A", "B", "H", "recubrimiento",
    "anchoPilarA", "anchoPilarB", "Nk", "MkB", "numeroA", "diametroA", "numeroB", "diametroB", "formaAnclaje",
  ];
  const destino: Record<string, string> = {};
  for (const nombre of copiar) if (campos[nombre] !== undefined) destino[nombre] = campos[nombre];
  if (campos.distanciaBordeA !== undefined) destino.distanciaColumnaLimite = campos.distanciaBordeA;

  const mkA = Number((campos.MkA ?? "0").replace(",", "."));
  if (Number.isFinite(mkA)) destino.MkA = mkA === 0 ? "0" : String(-mkA);
  return destino;
}

/**
 * Del punzonamiento que no da al mismo pilar con capitel (criterio del usuario,
 * 2026-10-26). Viajan la losa, el pilar, los negativos y la carga, que en las
 * dos páginas se llaman igual. El capitel no existía, así que su vuelo y su
 * canto se dejan en blanco: con los de ejemplo se vería un resultado que nadie
 * eligió. La armadura de punzonamiento no viaja: el capitel es sólo hormigón.
 */
export const RUTA_CAPITELES = "/verificaciones/capiteles";
export const BLANQUEAR_CAPITELES = ["lH1", "lH2", "hH"];

export function camposCapitelDesdePunzonamiento(campos: Record<string, string>): Record<string, string> {
  const copiar = [
    "posicion", "fck", "espesor", "recubrimiento", "c1", "c2", "distBordeC1", "distBordeC2",
    "phiNegY", "sNegY", "phiNegZ", "sNegZ", "vEd", "betaModo", "beta",
  ];
  const destino: Record<string, string> = { forma: "Rectangular" };
  for (const nombre of copiar) if (campos[nombre] !== undefined) destino[nombre] = campos[nombre];
  return destino;
}

/**
 * De la viga libre a la verificación de vigas: los esfuerzos de cálculo de un
 * tramo, sacados de la envolvente ELU con Q alternada, con la sección y el fck
 * con que se definió la viga. El acero, el recubrimiento y las armaduras no
 * viajan: la viga libre no los conoce, quedan los que ya estaban.
 *
 * Las zonas de estribos se encienden sólo si el cortante baja hacia el centro;
 * con una puntual fuerte en el vano la ley lineal de zonas no representa el
 * diagrama y se deja una sola zona.
 */
export const RUTA_VIGAS_FLEXION_CORTANTE = "/verificaciones/vigas-flexion-cortante";

export function camposVigasDesdeTramo(e: EsfuerzosTramo, l0?: L0DeTramo, seccion?: SeccionVigaLibre): Record<string, string> {
  const zonas = e.vdCentroKN < e.vdKN;
  const camposSeccionLibre: Record<string, string> = seccion
    ? {
        tipoSeccion: seccion.tipoSeccion,
        b: seccion.b,
        h: seccion.h,
        fck: seccion.fck,
        ...(seccion.tipoSeccion !== "rectangular" ? { anchoAla: seccion.anchoAla, espesorAla: seccion.espesorAla } : {}),
      }
    : {};
  const casoL0: Record<string, string> = l0
    ? {
        tramoL0: l0.tramoL0,
        luz1: l0.luz1M.toFixed(2),
        ...(l0.luz2M > 0 ? { luz2: l0.luz2M.toFixed(2) } : {}),
        ...(l0.l0M !== undefined ? { l0: l0.l0M.toFixed(2) } : {}),
        avisoL0: l0.avisos.join(" "),
      }
    : {};
  return {
    ...camposSeccionLibre,
    ...casoL0,
    momentoPos: e.momentoPosKNm.toFixed(2),
    momentoNeg: e.momentoNegKNm.toFixed(2),
    vd: e.vdKN.toFixed(2),
    vdBorde: e.vBordeKN.toFixed(2),
    zonasCortante: zonas ? "si" : "no",
    vdCentro: e.vdCentroKN.toFixed(2),
    luzVano: e.luzM.toFixed(2),
    inicioLeyZonas: e.inicioLeyM.toFixed(2),
    origenEsfuerzos: `Viga libre · tramo ${e.tramo}`,
  };
}

/** El caso de la fig. A19.5.2 que le toca a un tramo, con sus luces. */
export interface L0DeTramo {
  tramoL0: TramoL0;
  /** l1 y l2 con el sentido que tienen en Vigas para ese caso (m); 0 si el caso no la usa. */
  luz1M: number;
  luz2M: number;
  /** Sólo con "manual": el l0 que se manda (m). */
  l0M?: number;
  /** Lo que no cumple la nota de la figura, para revisar. */
  avisos: string[];
}

/**
 * De qué caso de la fig. A19.5.2 (Anejo 19, art. 5.3.2.1 (2), pág. 49) es un
 * tramo de la viga libre, con los criterios del usuario (2026-10-27):
 *  - Depende de dónde se comprime el ala. Con la T (o rectangular) es el vano:
 *    simple, extremo o interior según cuántos extremos tengan continuidad, o
 *    voladizo. Con la T invertida es la zona sobre el apoyo que gobierna el M⁻.
 *  - Un empotramiento cuenta como continuidad. Si es el apoyo que gobierna en
 *    una T invertida, no hay vano al otro lado: se toma simétrico, l2 = l1.
 *  - Si no se cumple la nota de la figura (voladizo menor que la mitad del vano
 *    contiguo, luces vecinas entre 2/3 y 3/2), se manda igual y se avisa.
 */
export function l0DeTramo(
  datos: Pick<DatosVigaLibre, "lucesM" | "apoyos">,
  e: EsfuerzosTramo,
  alaArriba: boolean
): L0DeTramo {
  const { lucesM, apoyos } = datos;
  const n = lucesM.length;
  const i = e.tramo - 1;
  const luz = lucesM[i];
  const existe = (k: number) => k >= 0 && k < n;
  const esVoladizo = (k: number) => apoyos[k] === "libre" || apoyos[k + 1] === "libre";
  // El tramo al otro lado de un nudo del tramo i.
  const delOtroLado = (nudo: number) => (nudo === i ? i - 1 : i + 1);

  const avisos: string[] = [];
  const voladizoCorto = (voladizo: number, vano: number) => {
    if (!(lucesM[voladizo] < 0.5 * lucesM[vano]))
      avisos.push(
        `El voladizo del tramo ${voladizo + 1} (${fmt(lucesM[voladizo], 2)} m) no es menor que la mitad del tramo ${vano + 1}: la fig. A19.5.2 no lo cubre.`
      );
  };
  const relacion = (k: number) => {
    if (!existe(k)) return;
    if (esVoladizo(k)) return voladizoCorto(k, i);
    const r = lucesM[k] / luz;
    if (r < 2 / 3 - 1e-9 || r > 1.5 + 1e-9)
      avisos.push(
        `Las luces de los tramos ${i + 1} y ${k + 1} (${fmt(luz, 2)} y ${fmt(lucesM[k], 2)} m) no están entre 2/3 y 3/2: la fig. A19.5.2 no lo cubre.`
      );
  };

  if (esVoladizo(i)) {
    const k = delOtroLado(apoyos[i] === "libre" ? i + 1 : i);
    if (!existe(k)) {
      // Voladizo aislado: el momento sólo se anula en la punta.
      return { tramoL0: "manual", luz1M: luz, luz2M: 0, l0M: luz, avisos: ["Voladizo sin vano contiguo: l0 es su largo."] };
    }
    voladizoCorto(i, k);
    return { tramoL0: "voladizo", luz1M: luz, luz2M: lucesM[k], avisos };
  }

  if (!alaArriba) {
    const gobierna = e.extremos.reduce<(typeof e.extremos)[number] | null>((g, x) => {
      const m = Math.max(x.momentoCaraKNm, x.minimoEmpotramientoKNm);
      return m > 0 && (!g || m > Math.max(g.momentoCaraKNm, g.minimoEmpotramientoKNm)) ? x : g;
    }, null);
    if (gobierna) {
      const k = delOtroLado(gobierna.nudo - 1);
      if (!existe(k)) {
        avisos.push(`El nudo ${gobierna.nudo} es un empotramiento sin vano al otro lado: se toma simétrico, l2 = l1.`);
        return { tramoL0: "apoyo", luz1M: luz, luz2M: luz, avisos };
      }
      if (esVoladizo(k)) {
        voladizoCorto(k, i);
        return { tramoL0: "voladizo", luz1M: lucesM[k], luz2M: luz, avisos };
      }
      relacion(k);
      return { tramoL0: "apoyo", luz1M: luz, luz2M: lucesM[k], avisos };
    }
  }

  const continuo = (nudo: number) => (nudo > 0 && nudo < n) || apoyos[nudo] === "empotrado";
  const extremosContinuos = Number(continuo(i)) + Number(continuo(i + 1));
  relacion(i - 1);
  relacion(i + 1);
  const tramoL0: TramoL0 = extremosContinuos === 0 ? "simple" : extremosContinuos === 1 ? "extremo" : "interior";
  return { tramoL0, luz1M: luz, luz2M: 0, avisos };
}

/** Número a texto con el formato que esperan los campos (coma decimal admitida). */
/**
 * Sección del destino: la T tal cual o, si la viga es rectangular, rectangular
 * explícito, para no dejar del otro lado una T de un cálculo anterior.
 */
const camposSeccion = (d: DatosVigaCompartidos): Record<string, string> =>
  d.seccionT ?? { tipoSeccion: "rectangular" };

/** Recubrimiento hasta la barra longitudinal: el de la viga más el estribo (m). */
const recubrimientoABarra = (d: DatosVigaCompartidos): number =>
  Number(d.recubrimiento.replace(",", ".")) + Number((d.diametroEstribo ?? "0").replace(",", ".")) / 1000;

const txt = (n: number, decimales: number) => n.toFixed(decimales);

/**
 * De flexión y cortante a la misma viga con torsión. Las dos páginas usan los
 * mismos nombres de campo y la misma norma, así que viaja tal cual todo lo que
 * torsión tiene. Lo que no:
 *  - Td: la viga sin torsión no lo conoce. Se deja en blanco.
 *  - 2ª capa de barras: torsión no la contempla. No se suma a la primera
 *    porque cambiaría el canto útil; se avisa.
 *  - l0 de la T: torsión lo pide directo, así que va el que flexión calculó con
 *    la fig. A19.5.2 (o el cargado a mano).
 *  - Vd: con zonas de estribos, flexión carga el del apoyo, que es el máximo.
 */
export const VINCULO_TORSION: Vinculo = {
  id: "vigas-torsion",
  titulo: "Vigas con torsión",
  ruta: "/verificaciones/vigas-torsion",
  lleva: "materiales, sección (también la T, con su l0), recubrimiento, M⁺, M⁻, Vd del apoyo, la primera capa de barras y los estribos",
  falta: "el Td, y la 2ª capa de barras si la viga la tiene: torsión trabaja con una sola",
  blanquear: ["td"],
  campos: (_d, o = {}) => {
    const tramo = tramoL0DesdeCampo(o.tramoL0);
    const n = (k: string) => Number((o[k] ?? "").replace(",", "."));
    const calculado = tramo === "manual" ? NaN : calcularL0(tramo, n("luz1"), n("luz2"));
    const l0 = tramo === "manual" ? o.l0 : calculado > 0 ? calculado.toFixed(2) : undefined;
    const copiar = [
      "fck", "fyk", "b", "h", "recubrimiento", "tipoSeccion", "anchoAla", "espesorAla",
      "momentoPos", "numeroPos", "diametroPos", "momentoNeg", "numeroNeg", "diametroNeg",
      "vd", "diametroEstribo", "numeroRamas",
    ];
    const destino: Record<string, string> = {};
    for (const k of copiar) if (o[k] !== undefined) destino[k] = o[k];
    if (l0 !== undefined) destino.l0 = l0;
    return destino;
  },
};

/**
 * Destinos de servicio, comunes a las dos páginas de ELU: se calcula la viga
 * en agotamiento y desde ahí se sigue con fisuración y flecha.
 */
export const VINCULOS_SERVICIO: Vinculo[] = [
  {
    id: "fisuracion",
    titulo: "Fisuración (ELS)",
    ruta: "/verificaciones/fisuracion",
    lleva: "materiales, sección y la armadura de tracción tal cual, barra por barra",
    falta: "el momento en combinación cuasipermanente, que no sale del de cálculo",
    blanquear: ["mqp"],
    campos: (d) => {
      const numero2 = d.numeroPos2 ?? "0";
      const hay2aCapa = Number(numero2.replace(",", ".")) > 0;
      return {
        fck: d.fck,
        fyk: d.fyk,
        b: d.b,
        h: d.h,
        // c de la ec. (7.11) es el recubrimiento de la armadura longitudinal: en
        // la viga se carga hasta el estribo, así que se le suma.
        rg: txt(recubrimientoABarra(d), 4),
        // La armadura que viaja es la positiva: el momento es positivo.
        ...camposSeccion(d),
        signoMomento: "positivo",
        // Fisuración pide las barras con los mismos nombres que la viga, así que
        // el arrastre es 1:1 y no hay conversión donde equivocarse.
        numero1: d.numeroPos,
        phi1: d.diametroPos,
        // La 2ª familia sólo se enciende si la viga tiene 2ª capa.
        familia2: hay2aCapa ? "Sí" : "No",
        ...(hay2aCapa ? { numero2, phi2: d.diametroPos2 ?? "0" } : {}),
      };
    },
  },
  {
    id: "deformaciones",
    titulo: "Deformaciones (ELS)",
    ruta: "/verificaciones/deformaciones",
    lleva: "materiales, sección, el canto útil y la armadura, barra por barra",
    falta: "la luz, el momento cuasipermanente, la fluencia y el esquema de carga",
    blanquear: ["luz", "mqp"],
    campos: (d) => {
      const numero2 = d.numeroPos2 ?? "0";
      const hay2aCapa = Number(numero2.replace(",", ".")) > 0;
      return {
        fck: d.fck,
        fyk: d.fyk,
        b: d.b,
        h: d.h,
        d: txt(d.dUtilM, 4),
        // La armadura de tracción viaja como barras, igual que en fisuración:
        // el área la arma la página sola y no hay dos versiones del mismo dato.
        numeroAs: d.numeroPos,
        phiAs: d.diametroPos,
        capa2: hay2aCapa ? "Sí" : "No",
        ...(hay2aCapa ? { numeroAs2: numero2, phiAs2: d.diametroPos2 ?? "0" } : {}),
        // La necesaria en ELU sigue siendo un área: es una demanda, no un
        // despiece, y casi nunca cae en un número entero de barras.
        // Sobrearmada no hay área necesaria: no se manda un "NaN" al destino.
        ...(Number.isFinite(d.asNecPosCm2) ? { asReq: txt(d.asNecPosCm2, 2) } : {}),
        // d' es geometría de la cara comprimida: viaja por si se decide contar
        // la armadura superior como de compresión. Las barras comprimidas se
        // dejan en cero a propósito —que la negativa comprima en centro de vano
        // es una decisión de quien calcula, no algo deducible de la flexión—.
        dComp: txt(recubrimientoABarra(d) + Number(d.diametroNeg.replace(",", ".")) / 2000, 4),
        ...camposSeccion(d),
        numeroAsComp: "0",
      };
    },
  },
];
