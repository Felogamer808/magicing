/**
 * Catálogo comercial del steel deck ARMCO Deckpanel (Armco Uruguaya S.A.,
 * folleto "Sistema de entrepiso metálico deckpanel", ver. 1.1). Perfil único
 * de tres nervios, disponible en tres espesores de chapa base; el 0,912 mm
 * es el de stock estándar —los otros dos son "a consultar" en el propio
 * folleto—, así que es el que se toma por defecto en toda la app.
 *
 * Lo que el folleto da como dato de catálogo, tal cual, se deja así:
 * geometría del perfil (ancho efectivo, paso de nervio, altura de nervio,
 * igual para los tres espesores), acero base (Grado 37, fy = 37 ksi) y, por
 * espesor, peso propio de la chapa sola, Ix y los dos módulos resistentes
 * elásticos Sx superior/inferior, más el peso propio total (chapa +
 * hormigón) según el espesor de hormigón sobre cresta.
 *
 * Lo que el folleto NO da —porque es una ficha comercial de vanos y
 * sobrecargas admisibles, con método elástico propio de ARMCO, no la ficha
 * estructural para diseño plástico EC4— son exactamente los dos datos que
 * `steel-deck-flexion.ts` y `steel-deck-rasante.ts` necesitan: Ap (área neta
 * de chapa por metro) y dp (profundidad al centroide de la chapa). Los dos
 * se derivan acá, no se citan del folleto:
 *
 * - `yInfChapaM` (y con eso dp) sale de Ix/Sx,inferior = distancia del
 *   centroide de la chapa a la fibra inferior del perfil. Esto NO es una
 *   hipótesis: es álgebra de sección estándar (Sx = I/y) aplicada a los
 *   propios Ix y Sx,inf que el folleto sí publica, y da prácticamente el
 *   mismo valor (~31,13 mm) en los tres espesores —lo cual es la
 *   confirmación cruzada de que la cuenta es consistente, ya que la forma
 *   del perfil no cambia con el espesor de chapa—. dp = h − yInfChapaM se
 *   calcula así en vez de cargarse a mano, y de paso se elimina la
 *   posibilidad de que quede desincronizado del espesor total h elegido.
 *
 * - `apMm2PorM` sí es una hipótesis, y hay que tratarla como tal: se deriva
 *   del peso de catálogo (peso/densidad del acero, 7850 kg/m³), asumiendo
 *   que el "kg/ml" del folleto ya es peso por m² de superficie cubierta. Da
 *   un factor de expansión de perfil corrugado de ~1,3 respecto del área
 *   plana equivalente (espesor × 1000 mm), que es un rango típico para este
 *   tipo de perfil, pero no es un Ap certificado por el fabricante. Si
 *   aparece la ficha estructural de ARMCO con el Ap real, reemplazar este
 *   valor derivado por el publicado.
 */

/** ksi → MPa, conversión exacta (1 ksi = 6,894757293168 MPa). */
const KSI_A_MPA = 6.894757293168;

/** Densidad del acero, para derivar Ap desde el peso de catálogo. */
const DENSIDAD_ACERO_KG_M3 = 7850;

/** Geometría del perfil, igual para los tres espesores de chapa. */
export const PERFIL_DECKPANEL = {
  anchoEfectivoM: 0.915,
  /** Paso entre nervios (3 nervios en el ancho efectivo: 91,5/30,5 = 3 exacto). */
  pasoNervioM: 0.305,
  alturaNervioM: 0.063,
} as const;

/** fy del acero base, Grado 37 (37 ksi), igual para los tres espesores. */
export const FY_ACERO_DECKPANEL_MPA = 37 * KSI_A_MPA;

/** Tolerancia de fabricación en espesor de chapa, informativa. */
export const TOLERANCIA_ESPESOR_MM = 0.03;

/**
 * bmin: ancho del nervio en su base (el fondo plano del valle, el punto más
 * angosto del perfil trapezoidal), sólo para el chequeo de incendio de la
 * Tabla 5.5 de EC2-1-2. NO es el paso de nervio (305 mm, la distancia entre
 * nervios consecutivos): son dos dimensiones distintas.
 *
 * A diferencia de hp/fyp/paso/Ap/dp, este valor NO se puede derivar de
 * ningún número que el folleto imprima: no hay una tercera cota horizontal
 * que aísle el ancho del fondo, sólo el ancho efectivo total (915 mm) y el
 * paso (305 mm). Se estima por proporción visual del propio dibujo del
 * folleto (figura "Geometría"), leyendo a ojo qué fracción del paso ocupa
 * el tramo recto del fondo del valle frente a las rampas laterales —da un
 * rango de 100 a 130 mm según cuánto se le calcule a las rampas—, y se
 * adopta el extremo más chico (100 mm) porque en la Tabla 5.5 un bmin menor
 * pide más recubrimiento: es el lado conservador si la lectura visual está
 * un poco corta o un poco larga.
 *
 * Es una estimación, no un dato de catálogo ni una cota certificada. Se deja
 * como valor por defecto, editable: si aparece el plano de perfil real o se
 * mide sobre una chapa física, ese dato manda y hay que cargarlo en su lugar.
 */
export const BMIN_NERVIO_ESTIMADO_M = 0.1;

export interface FilaDeckpanelArmco {
  espesorMm: number;
  /** Peso propio de la chapa sola, kg/m² de superficie cubierta (dato de catálogo). */
  pesoChapaKgM2: number;
  /** Momento de inercia efectivo, cm⁴/m (dato de catálogo). */
  ixCm4PorM: number;
  /** Módulo resistente elástico superior, cm³/m (dato de catálogo). */
  sxSupCm3PorM: number;
  /** Módulo resistente elástico inferior, cm³/m (dato de catálogo). */
  sxInfCm3PorM: number;
  /** Peso propio total (chapa + hormigón), kg/m², por espesor de hormigón sobre cresta hc (cm). Dato de catálogo. */
  pesoPropioTotalPorHcCm: Record<number, number>;
}

export const CATALOGO_DECKPANEL_ARMCO: Record<number, FilaDeckpanelArmco> = {
  0.759: {
    espesorMm: 0.759,
    pesoChapaKgM2: 7.6,
    ixCm4PorM: 72.31,
    sxSupCm3PorM: 22.33,
    sxInfCm3PorM: 23.23,
    pesoPropioTotalPorHcCm: { 5: 205, 6: 229, 8: 277, 10: 325, 12: 373 },
  },
  0.912: {
    espesorMm: 0.912,
    pesoChapaKgM2: 9.06,
    ixCm4PorM: 86.81,
    sxSupCm3PorM: 26.82,
    sxInfCm3PorM: 27.89,
    pesoPropioTotalPorHcCm: { 5: 206, 6: 230, 8: 278, 10: 326, 12: 374 },
  },
  1.214: {
    espesorMm: 1.214,
    pesoChapaKgM2: 11.96,
    ixCm4PorM: 114.63,
    sxSupCm3PorM: 35.4,
    sxInfCm3PorM: 36.83,
    pesoPropioTotalPorHcCm: { 5: 209, 6: 233, 8: 281, 10: 329, 12: 377 },
  },
};

/** Espesor de chapa de stock estándar (el que usa la obra); los otros dos son "a consultar" según el propio folleto. */
export const ESPESOR_DECKPANEL_ESTANDAR_MM = 0.912;

/**
 * Distancia del centroide de la chapa a la fibra inferior del perfil, m.
 * Sale de Ix/Sx,inferior (álgebra de sección, no hipótesis) — ver el
 * comentario de cabecera del archivo.
 */
export function yInfChapaM(espesorMm: number): number {
  const fila = CATALOGO_DECKPANEL_ARMCO[espesorMm];
  if (!fila) throw new Error(`No hay deckpanel ARMCO de espesor ${espesorMm} mm en el catálogo.`);
  return fila.ixCm4PorM / fila.sxInfCm3PorM / 100; // cm → m
}

/**
 * Área neta de chapa por metro de ancho, mm²/m — DERIVADA del peso de
 * catálogo, no publicada por el fabricante. Ver el comentario de cabecera:
 * es una hipótesis razonable, no un dato certificado.
 */
export function apDerivadaMm2PorM(espesorMm: number): number {
  const fila = CATALOGO_DECKPANEL_ARMCO[espesorMm];
  if (!fila) throw new Error(`No hay deckpanel ARMCO de espesor ${espesorMm} mm en el catálogo.`);
  return (fila.pesoChapaKgM2 / DENSIDAD_ACERO_KG_M3) * 1e6;
}
