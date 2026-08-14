/**
 * Flexión de secciones cerradas — AISC 360-16, por el método ASD:
 *
 *   art. F7  tubos rectangulares y cajones
 *   art. F8  tubos redondos
 *
 * Van aparte de F2 porque una sección cerrada tiene alabeo despreciable: el
 * pandeo lateral-torsional deja de depender de Cw y pasa a resolverse con la
 * constante de torsión, que en cerrada es dos órdenes mayor. En la práctica casi
 * nunca gobierna, y lo que manda es el pandeo local de las paredes.
 */

import { OMEGA_B } from "@/lib/calc/acero/flexion";
import { propiedades, designacion, type Familia, type ParametrosPerfil } from "@/lib/calc/acero/perfiles";

export interface DatosFlexionCerrada {
  familia: Familia;
  params: ParametrosPerfil;
  /** Longitud sin arriostrar, en metros. Solo interviene en F7. */
  lbM: number;
  cb: number;
  fyPa: number;
  ePa: number;
  mRequeridoKNm?: number;
  /**
   * Eje de flexión. F7 cubre los dos ("bent about either axis"), y F8 es
   * axisimétrico, así que le da igual. Por defecto, el fuerte.
   */
  eje?: "fuerte" | "débil";
}

export interface EstadoLimite {
  nombre: string;
  /** Resistencia nominal que impone este estado, en kN·m. */
  mnKNm: number;
  /** Clasificación de la pared que lo gobierna. */
  clase: "compacta" | "no compacta" | "esbelta" | "no aplica";
  esbeltez?: number;
}

export interface ResultadoF7 {
  articulo: "F7";
  designacion: string;
  mpKNm: number;
  estados: EstadoLimite[];
  /** Estado límite que gobierna, el de menor resistencia. */
  gobierna: string;
  lpM: number;
  lrM: number;
  mnKNm: number;
  admisibleKNm: number;
  verifica: boolean | null;
  aprovechamiento: number | null;
  advertencia?: string;
}

export interface ResultadoF8 {
  articulo: "F8";
  designacion: string;
  mpKNm: number;
  relacionDt: number;
  limiteCompacta: number;
  limiteNoCompacta: number;
  /** Tope de aplicabilidad del artículo: D/t < 0,45·E/Fy. */
  limiteAplicabilidad: number;
  clase: "compacta" | "no compacta" | "esbelta";
  mnKNm: number;
  admisibleKNm: number;
  verifica: boolean | null;
  aprovechamiento: number | null;
  advertencia?: string;
}

/**
 * Flexión de tubos rectangulares y cajones, art. F7.
 *
 * Los cuatro estados límite se evalúan por separado y manda el menor:
 * plastificación, pandeo local del ala, pandeo local del alma y pandeo
 * lateral-torsional.
 */
export function calcularF7(datos: DatosFlexionCerrada): ResultadoF7 {
  const bruta = propiedades(datos.familia, datos.params);
  const { fyPa, ePa, lbM, cb } = datos;
  const porElDebil = datos.eje === "débil";

  // Flexionar por el eje débil es el mismo problema con la sección girada 90°:
  // lo que era ala pasa a ser alma y los módulos cambian de eje. Se arma esa
  // vista una vez y el resto del artículo se aplica igual.
  const p = porElDebil
    ? {
        ...bruta,
        hM: bruta.bM,
        bM: bruta.hM,
        sxM3: bruta.syM3,
        zxM3: bruta.zyM3,
        ryM: bruta.rxM,
        hAlmaM: bruta.bM - (bruta.hM - bruta.hAlmaM),
      }
    : bruta;

  const esHSS = datos.familia === "tubo-rectangular";
  const raiz = Math.sqrt(ePa / fyPa);
  const mpNm = fyPa * p.zxM3; // (F7-1)

  // Anchos que definen la esbeltez, art. B4.1b: se descuentan los acuerdos, que
  // sin dato de fabricación se toman como 1,5·t por lado.
  const anchoAlaM = esHSS ? p.bM - 3 * p.tfM : p.bM - 2 * p.twM;
  const altoAlmaM = p.hAlmaM;
  const lambdaAla = anchoAlaM / p.tfM;
  const lambdaAlma = altoAlmaM / p.twM;

  // Tabla B4.1b: caso 17 para alas de HSS, caso 21 para alas de cajón, caso 19
  // para almas de los dos.
  const lpAla = 1.12 * raiz;
  const lrAla = (esHSS ? 1.4 : 1.49) * raiz;
  const lpAlma = 2.42 * raiz;
  const lrAlma = 5.7 * raiz;

  const estados: EstadoLimite[] = [
    { nombre: "Plastificación (F7-1)", mnKNm: mpNm / 1000, clase: "no aplica" },
  ];
  let advertencia: string | undefined;

  // --- Pandeo local del ala comprimida ---
  if (lambdaAla <= lpAla) {
    estados.push({ nombre: "Pandeo local del ala", mnKNm: mpNm / 1000, clase: "compacta", esbeltez: lambdaAla });
  } else if (lambdaAla <= lrAla) {
    // (F7-2)
    const mn = Math.min(
      mpNm - (mpNm - fyPa * p.sxM3) * (3.57 * lambdaAla * Math.sqrt(fyPa / ePa) - 4.0),
      mpNm
    );
    estados.push({ nombre: "Pandeo local del ala (F7-2)", mnKNm: mn / 1000, clase: "no compacta", esbeltez: lambdaAla });
  } else {
    // (F7-3) con el ancho efectivo de (F7-4) para HSS o (F7-5) para cajón.
    const coeficiente = esHSS ? 0.38 : 0.34;
    const beM = Math.min(
      1.92 * p.tfM * raiz * (1 - (coeficiente / lambdaAla) * raiz),
      anchoAlaM
    );
    const seM3 = moduloEfectivo(p, anchoAlaM, beM);
    estados.push({
      nombre: "Pandeo local del ala (F7-3)",
      mnKNm: (fyPa * seM3) / 1000,
      clase: "esbelta",
      esbeltez: lambdaAla,
    });
  }

  // --- Pandeo local del alma ---
  if (lambdaAlma <= lpAlma) {
    estados.push({ nombre: "Pandeo local del alma", mnKNm: mpNm / 1000, clase: "compacta", esbeltez: lambdaAlma });
  } else if (lambdaAlma <= lrAlma) {
    // (F7-6)
    const mn = Math.min(
      mpNm - (mpNm - fyPa * p.sxM3) * (0.305 * lambdaAlma * Math.sqrt(fyPa / ePa) - 0.738),
      mpNm
    );
    estados.push({ nombre: "Pandeo local del alma (F7-6)", mnKNm: mn / 1000, clase: "no compacta", esbeltez: lambdaAlma });
  } else {
    // La nota de usuario del artículo dice que no existen HSS de alma esbelta.
    // Si aparece una, corresponde F7-7 y F7-8, que no están implementadas.
    advertencia =
      "El alma resulta esbelta. Las ecs. F7-7 y F7-8 no están implementadas; el resultado no contempla ese estado límite.";
    estados.push({ nombre: "Pandeo local del alma", mnKNm: Infinity, clase: "esbelta", esbeltez: lambdaAlma });
  }

  // --- Pandeo lateral-torsional ---
  const jag = Math.sqrt(p.jM4 * p.areaM2);
  const lpM = (0.13 * ePa * p.ryM * jag) / mpNm; // (F7-12)
  const lrM = (2 * ePa * p.ryM * jag) / (0.7 * fyPa * p.sxM3); // (F7-13)

  if (lbM <= lpM) {
    estados.push({ nombre: "Pandeo lateral-torsional", mnKNm: mpNm / 1000, clase: "no aplica" });
  } else if (lbM <= lrM) {
    // (F7-10)
    const mn = Math.min(
      cb * (mpNm - (mpNm - 0.7 * fyPa * p.sxM3) * ((lbM - lpM) / (lrM - lpM))),
      mpNm
    );
    estados.push({ nombre: "Pandeo lateral-torsional (F7-10)", mnKNm: mn / 1000, clase: "no aplica" });
  } else {
    // (F7-11)
    const mn = Math.min((2 * ePa * cb * jag) / (lbM / p.ryM), mpNm);
    estados.push({ nombre: "Pandeo lateral-torsional (F7-11)", mnKNm: mn / 1000, clase: "no aplica" });
  }

  const gobernante = estados.reduce((a, b) => (b.mnKNm < a.mnKNm ? b : a));
  const mnKNm = gobernante.mnKNm;
  const admisibleKNm = mnKNm / OMEGA_B;
  const requerido = datos.mRequeridoKNm;

  return {
    articulo: "F7",
    designacion: designacion(datos.familia, datos.params),
    mpKNm: mpNm / 1000,
    estados,
    gobierna: gobernante.nombre,
    lpM,
    lrM,
    mnKNm,
    admisibleKNm,
    verifica: requerido === undefined ? null : requerido <= admisibleKNm,
    aprovechamiento: requerido === undefined ? null : requerido / admisibleKNm,
    advertencia,
  };
}

/**
 * Módulo elástico con el ala comprimida reducida a su ancho efectivo (ec. F7-3).
 *
 * Al angostar solo el ala comprimida la sección deja de ser simétrica: el
 * baricentro baja y la fibra comprimida queda más lejos, así que hay que
 * trasladar la inercia antes de dividir.
 */
function moduloEfectivo(
  p: { ixM4: number; areaM2: number; hM: number; tfM: number },
  anchoM: number,
  anchoEfectivoM: number
): number {
  const areaQuitada = (anchoM - anchoEfectivoM) * p.tfM;
  if (areaQuitada <= 0) return p.ixM4 / (p.hM / 2);

  const brazo = p.hM / 2 - p.tfM / 2;
  const areaNueva = p.areaM2 - areaQuitada;
  // Inercia respecto del eje original, ya sin el trozo de ala.
  const iSinTrozo = p.ixM4 - areaQuitada * brazo ** 2;
  // El baricentro se corre hacia el ala traccionada.
  const corrimiento = (areaQuitada * brazo) / areaNueva;
  const iNueva = iSinTrozo - areaNueva * corrimiento ** 2;

  return iNueva / (p.hM / 2 + corrimiento);
}

/** Flexión de tubos redondos, art. F8. */
export function calcularF8(datos: DatosFlexionCerrada): ResultadoF8 {
  const p = propiedades(datos.familia, datos.params);
  const { fyPa, ePa } = datos;

  const relacionDt = p.hM / p.twM;
  const limiteCompacta = (0.07 * ePa) / fyPa; // tabla B4.1b, caso 20
  const limiteNoCompacta = (0.31 * ePa) / fyPa;
  const limiteAplicabilidad = (0.45 * ePa) / fyPa;

  const mpNm = fyPa * p.zxM3; // (F8-1)
  let mnNm: number;
  let clase: ResultadoF8["clase"];
  let advertencia: string | undefined;

  if (relacionDt <= limiteCompacta) {
    clase = "compacta";
    mnNm = mpNm;
  } else if (relacionDt <= limiteNoCompacta) {
    // (F8-2)
    clase = "no compacta";
    mnNm = ((0.021 * ePa) / relacionDt + fyPa) * p.sxM3;
  } else {
    // (F8-3) con (F8-4)
    clase = "esbelta";
    mnNm = ((0.33 * ePa) / relacionDt) * p.sxM3;
  }

  // La plastificación sigue siendo un tope en las tres ramas.
  mnNm = Math.min(mnNm, mpNm);

  if (relacionDt >= limiteAplicabilidad) {
    advertencia = `El artículo F8 se aplica con D/t menor que 0,45·E/Fy = ${limiteAplicabilidad.toFixed(
      0
    )}. Con D/t = ${relacionDt.toFixed(0)} la sección queda fuera de su alcance.`;
  }

  const mnKNm = mnNm / 1000;
  const admisibleKNm = mnKNm / OMEGA_B;
  const requerido = datos.mRequeridoKNm;

  return {
    articulo: "F8",
    designacion: designacion(datos.familia, datos.params),
    mpKNm: mpNm / 1000,
    relacionDt,
    limiteCompacta,
    limiteNoCompacta,
    limiteAplicabilidad,
    clase,
    mnKNm,
    admisibleKNm,
    verifica: requerido === undefined ? null : requerido <= admisibleKNm,
    aprovechamiento: requerido === undefined ? null : requerido / admisibleKNm,
    advertencia,
  };
}
