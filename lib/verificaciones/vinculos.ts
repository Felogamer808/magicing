import type { IdVerificacion } from "./registry";

/**
 * Encadenado de verificaciones: llevar lo ya cargado en una a otra que comparte
 * los mismos datos.
 *
 * Una viga se verifica a flexión y cortante, pero después hay que mirarle la
 * torsión, la fisuración y la flecha — y son la misma viga: el mismo hormigón,
 * la misma sección, la misma armadura. Volver a tipear todo en cada página es
 * trabajo repetido y, peor, una oportunidad de que las cuatro verificaciones
 * terminen hablando de vigas distintas.
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
 * que otras verificaciones piden como dato de entrada.
 */
export interface DatosVigaCompartidos {
  fck: string;
  fyk: string;
  b: string;
  h: string;
  recubrimiento: string;
  numeroPos: string;
  diametroPos: string;
  numeroPos2: string;
  diametroPos2: string;
  numeroNeg: string;
  diametroNeg: string;
  momentoPos: string;
  momentoNeg: string;
  vd: string;
  diametroEstribo: string;
  numeroRamas: string;
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
}

/** Número a texto con el formato que esperan los campos (coma decimal admitida). */
const txt = (n: number, decimales: number) => n.toFixed(decimales);

/**
 * Separación equivalente de una familia de barras repartida en el ancho b, que
 * es como pide la armadura la página de fisuración. Es la inversa exacta de lo
 * que hace esa página (n = b/s), así que el ida y vuelta no pierde barras.
 */
function separacionDesdeBarras(b: string, numero: string): string {
  const anchoM = Number(b.replace(",", "."));
  const barras = Number(numero.replace(",", "."));
  if (!Number.isFinite(anchoM) || !Number.isFinite(barras) || barras <= 0) return "";
  return txt(anchoM / barras, 4);
}

export const VINCULOS_VIGA: Vinculo[] = [
  {
    id: "vigas-torsion",
    titulo: "Vigas con torsión",
    ruta: "/verificaciones/vigas-torsion",
    lleva: "materiales, sección, armadura longitudinal, estribos y el cortante",
    falta: "el torsor de cálculo Td",
    campos: (d) => ({
      fck: d.fck,
      fyk: d.fyk,
      b: d.b,
      h: d.h,
      recubrimiento: d.recubrimiento,
      momentoPos: d.momentoPos,
      numeroPos: d.numeroPos,
      diametroPos: d.diametroPos,
      momentoNeg: d.momentoNeg,
      numeroNeg: d.numeroNeg,
      diametroNeg: d.diametroNeg,
      vd: d.vd,
      diametroEstribo: d.diametroEstribo,
      numeroRamas: d.numeroRamas,
    }),
  },
  {
    id: "fisuracion",
    titulo: "Fisuración (ELS)",
    ruta: "/verificaciones/fisuracion",
    lleva: "materiales, sección y la armadura de tracción como separación equivalente",
    falta: "el momento en combinación cuasipermanente, que no sale del de cálculo",
    campos: (d) => {
      const hay2aCapa = Number(d.numeroPos2.replace(",", ".")) > 0;
      return {
        fck: d.fck,
        fyk: d.fyk,
        b: d.b,
        h: d.h,
        rg: d.recubrimiento,
        s1: separacionDesdeBarras(d.b, d.numeroPos),
        phi1: d.diametroPos,
        // Sin 2ª capa alcanza con apagar el diámetro —así entiende "no hay" la
        // página de fisuración— y no se toca la separación: escribirle un vacío
        // dejaría un campo numérico en blanco sin necesidad.
        ...(hay2aCapa
          ? { s2: separacionDesdeBarras(d.b, d.numeroPos2), phi2: d.diametroPos2 }
          : { phi2: "0" }),
      };
    },
  },
  {
    id: "deformaciones",
    titulo: "Deformaciones (ELS)",
    ruta: "/verificaciones/deformaciones",
    lleva: "materiales, sección, el canto útil y las dos áreas de armadura ya calculadas",
    falta: "la luz, el momento cuasipermanente, la fluencia y el esquema de carga",
    campos: (d) => ({
      fck: d.fck,
      fyk: d.fyk,
      b: d.b,
      h: d.h,
      d: txt(d.dUtilM, 4),
      asProv: txt(d.asRealPosCm2, 2),
      asReq: txt(d.asNecPosCm2, 2),
      // d' es geometría de la cara comprimida: viaja por si se decide contar la
      // armadura superior como de compresión. A's se deja en cero a propósito
      // —que la negativa comprima en centro de vano es una decisión de quien
      // calcula, no algo que se pueda deducir de la página de flexión—.
      dComp: txt(
        Number(d.recubrimiento.replace(",", ".")) +
          Number(d.diametroNeg.replace(",", ".")) / 2000,
        4
      ),
      asComp: "0",
    }),
  },
];
