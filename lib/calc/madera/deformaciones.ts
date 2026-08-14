/**
 * Deformaciones: arts. 2.2.3 (fluencia) y 7.2 (límites).
 *
 * En madera la flecha se calcula dos veces y las dos importan. La instantánea
 * sale con Emean y la combinación característica. La final le suma la fluencia,
 * que con kdef = 2,00 en clase de servicio 3 **triplica** la flecha de la parte
 * permanente. Ningún otro material estructural tiene un factor de fluencia de
 * ese orden, y por eso en madera el estado límite de servicio suele decidir el
 * canto antes que el último.
 *
 * Dos cosas que este módulo hace y la planilla original no:
 *
 * 1. Separa permanente de variable. Las ecs. (2.3) a (2.5) aplican kdef entero
 *    a G pero sólo ψ2·kdef a Q, porque la parte de la sobrecarga que no está
 *    permanentemente aplicada no fluye. Multiplicar la flecha total por
 *    (1 + kdef), como hace la planilla, es conservador pero puede sobrestimar
 *    la flecha final un 40 % y llevar a engordar la viga sin necesidad.
 * 2. Compara contra los límites de la tabla 7.2, que la planilla no trae.
 */

/** Contribución de cortante además de la de flexión. */
export interface FlechaInstantanea {
  /** Flecha de flexión sola. */
  flexionMm: number;
  /** Suplemento por deformación de cortante. */
  cortanteMm: number;
  totalMm: number;
}

/**
 * Flecha instantánea de viga simplemente apoyada, con el término de cortante.
 *
 * Los coeficientes 6/5 y 24/25 no son de la norma: salen de dividir la flecha
 * de cortante por la de flexión con el área reducida As = 5/6·A de la sección
 * rectangular. En madera el suplemento no es despreciable como en hormigón,
 * porque E/G ronda 16 en vez de 2,4: en una viga de canto con l/h = 10 aporta
 * un 10 % de la flecha, y en una de l/h = 5, un 40 %.
 */
export function flechaDistribuidaMm(
  qKNm: number,
  luzM: number,
  eGPa: number,
  gGPa: number,
  inerciaM4: number,
  cantoM: number
): FlechaInstantanea {
  if (!(inerciaM4 > 0) || !(eGPa > 0) || !(gGPa > 0) || !(luzM > 0)) {
    return { flexionMm: 0, cortanteMm: 0, totalMm: 0 };
  }
  // kN/m, m y GPa: el resultado sale en metros, se pasa a milímetros al final.
  const flexionM = (5 * qKNm * luzM ** 4) / (384 * eGPa * 1e6 * inerciaM4);
  const factorCortante = ((24 * eGPa) / (25 * gGPa)) * (cantoM / luzM) ** 2;
  return {
    flexionMm: flexionM * 1000,
    cortanteMm: flexionM * factorCortante * 1000,
    totalMm: flexionM * (1 + factorCortante) * 1000,
  };
}

/** Ídem para carga puntual en el centro de la luz. */
export function flechaPuntualMm(
  pKN: number,
  luzM: number,
  eGPa: number,
  gGPa: number,
  inerciaM4: number,
  cantoM: number
): FlechaInstantanea {
  if (!(inerciaM4 > 0) || !(eGPa > 0) || !(gGPa > 0) || !(luzM > 0)) {
    return { flexionMm: 0, cortanteMm: 0, totalMm: 0 };
  }
  const flexionM = (pKN * luzM ** 3) / (48 * eGPa * 1e6 * inerciaM4);
  const factorCortante = ((6 * eGPa) / (5 * gGPa)) * (cantoM / luzM) ** 2;
  return {
    flexionMm: flexionM * 1000,
    cortanteMm: flexionM * factorCortante * 1000,
    totalMm: flexionM * (1 + factorCortante) * 1000,
  };
}

export interface ComponentesFlecha {
  /** Flecha instantánea de la carga permanente. */
  instantaneaGMm: number;
  /** Flecha instantánea de la variable dominante. */
  instantaneaQMm: number;
  instantaneaTotalMm: number;
  /** Fluencia de la permanente: winst,G · kdef. */
  fluenciaGMm: number;
  /** Fluencia de la variable: winst,Q · ψ2 · kdef. */
  fluenciaQMm: number;
  fluenciaTotalMm: number;
  /** wfin = winst + wcreep. */
  finalMm: number;
  /** wnet,fin = wfin − wc, ec. (7.2). */
  netaFinalMm: number;
}

/**
 * Ecs. (2.2) a (2.5) y (7.2).
 *
 * ψ2 es el coeficiente de valor casi permanente de la sobrecarga, y sale de
 * EN 1990, no del EC5: 0,3 en uso residencial y oficinas, 0,6 en zonas de
 * almacenamiento, 0 en cubiertas no accesibles. Es el que decide cuánta de la
 * sobrecarga fluye.
 */
export function componentesFlecha(opciones: {
  instantaneaGMm: number;
  instantaneaQMm: number;
  kdef: number;
  psi2: number;
  contraflechaMm: number;
}): ComponentesFlecha {
  const { instantaneaGMm, instantaneaQMm, kdef, psi2, contraflechaMm } = opciones;

  const fluenciaGMm = instantaneaGMm * kdef;
  const fluenciaQMm = instantaneaQMm * psi2 * kdef;

  const instantaneaTotalMm = instantaneaGMm + instantaneaQMm;
  const fluenciaTotalMm = fluenciaGMm + fluenciaQMm;
  const finalMm = instantaneaTotalMm + fluenciaTotalMm;

  return {
    instantaneaGMm,
    instantaneaQMm,
    instantaneaTotalMm,
    fluenciaGMm,
    fluenciaQMm,
    fluenciaTotalMm,
    finalMm,
    netaFinalMm: finalMm - contraflechaMm,
  };
}

/** Tabla 7.2. Los rangos son recomendados; el anejo nacional puede cambiarlos. */
export type TipoElemento = "dos-apoyos" | "voladizo";

export interface LimitesFlecha {
  /** Denominador más exigente del rango, l/n. */
  instantaneaEstricto: number;
  instantaneaLaxo: number;
  netaFinalEstricto: number;
  netaFinalLaxo: number;
  finalEstricto: number;
  finalLaxo: number;
}

export const LIMITES: Record<TipoElemento, LimitesFlecha> = {
  "dos-apoyos": {
    instantaneaEstricto: 500, instantaneaLaxo: 300,
    netaFinalEstricto: 350, netaFinalLaxo: 250,
    finalEstricto: 300, finalLaxo: 150,
  },
  voladizo: {
    instantaneaEstricto: 250, instantaneaLaxo: 150,
    netaFinalEstricto: 175, netaFinalLaxo: 125,
    finalEstricto: 150, finalLaxo: 75,
  },
};

export interface ComprobacionFlecha {
  etiqueta: string;
  valorMm: number;
  /** Límite adoptado, en milímetros. */
  limiteMm: number;
  /** Denominador n del l/n adoptado. */
  denominador: number;
  aprovechamiento: number;
  verifica: boolean;
}

/**
 * Compara las tres flechas contra la tabla 7.2.
 *
 * `estricto` elige el extremo exigente del rango. La norma da un rango y no un
 * valor porque el límite depende de qué cuelga de la viga —tabiquería frágil,
 * falso techo, nada—, así que la decisión es del proyectista y se declara.
 */
export function comprobarFlechas(
  componentes: ComponentesFlecha,
  luzM: number,
  tipo: TipoElemento,
  estricto: boolean
): ComprobacionFlecha[] {
  const l = luzM * 1000;
  const lim = LIMITES[tipo];

  const armar = (etiqueta: string, valorMm: number, denominador: number): ComprobacionFlecha => {
    const limiteMm = l / denominador;
    return {
      etiqueta,
      valorMm,
      limiteMm,
      denominador,
      aprovechamiento: limiteMm > 0 ? valorMm / limiteMm : Infinity,
      verifica: valorMm <= limiteMm,
    };
  };

  return [
    armar("winst", componentes.instantaneaTotalMm,
          estricto ? lim.instantaneaEstricto : lim.instantaneaLaxo),
    armar("wnet,fin", componentes.netaFinalMm,
          estricto ? lim.netaFinalEstricto : lim.netaFinalLaxo),
    armar("wfin", componentes.finalMm,
          estricto ? lim.finalEstricto : lim.finalLaxo),
  ];
}
