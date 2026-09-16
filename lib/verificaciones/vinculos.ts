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
    campos: (d) => {
      const numero2 = d.numeroPos2 ?? "0";
      const hay2aCapa = Number(numero2.replace(",", ".")) > 0;
      return {
        fck: d.fck,
        fyk: d.fyk,
        b: d.b,
        h: d.h,
        rg: d.recubrimiento,
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
