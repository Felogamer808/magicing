import type { EsfuerzosTramo } from "@/lib/calc/estatica/viga-libre";
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
 * El encadenado va siempre de ELU a servicio, y por eso la misma lista sirve
 * para las dos páginas de origen. Entre flexión y torsión no hay vínculo: no
 * son dos pasos de lo mismo sino dos formas de calcular la misma viga —torsión
 * ya resuelve la flexión y el cortante—, así que quien tiene torsión arranca
 * ahí directamente.
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
  campos: (d: DatosVigaCompartidos) => Record<string, string>;
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
 * tramo, sacados de la envolvente ELU con Q alternada. Sección, materiales y
 * armaduras no viajan: la viga libre no los conoce, quedan los que ya estaban.
 *
 * Las zonas de estribos se encienden sólo si el cortante baja hacia el centro;
 * con una puntual fuerte en el vano la ley lineal de zonas no representa el
 * diagrama y se deja una sola zona.
 */
export const RUTA_VIGAS_FLEXION_CORTANTE = "/verificaciones/vigas-flexion-cortante";

export function camposVigasDesdeTramo(e: EsfuerzosTramo): Record<string, string> {
  const zonas = e.vdCentroKN < e.vdKN;
  return {
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
