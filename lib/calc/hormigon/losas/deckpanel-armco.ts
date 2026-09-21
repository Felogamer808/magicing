/**
 * Catálogo comercial del steel deck ARMCO Deckpanel (Armco Uruguaya S.A.,
 * folleto "deckpanel — Sistema para losas de entrepiso"). Perfil único de tres
 * nervios, en tres espesores de chapa; el 0,89 mm es el estándar de obra, así
 * que es el que se toma por defecto en toda la app.
 *
 * Esta edición del folleto reemplaza a la anterior y cambia varias cosas:
 *
 *  - Los espesores pasan de 0,759 / 0,912 / 1,214 a **0,71 / 0,89 / 1,24**, y
 *    con ellos Ix, el módulo resistente y el peso.
 *  - Aparece el **espesor de acero base** (0,69 / 0,87 / 1,22), o sea la chapa
 *    sin el galvanizado. Es lo que permite contrastar el Ap derivado del peso
 *    contra una segunda fuente (ver `apDerivadaMm2PorM`).
 *  - El límite elástico viene **impreso** (255,1 MPa) en vez de haber que
 *    convertirlo de los 37 ksi del grado.
 *  - En vez de los dos módulos resistentes Sx superior/inferior hay **uno
 *    solo, Wx**, que es el de la fibra superior (ver `yInfChapaM`).
 *
 * Lo que el folleto sigue sin dar —porque es una ficha comercial de vanos y
 * sobrecargas admisibles, con método propio de ARMCO según ANSI/SDI C-2017, no
 * la ficha estructural para diseño plástico EC4— es el Ap (área neta de chapa
 * por metro) y el dp (profundidad al centroide de la chapa). Los dos se
 * derivan acá y cada uno dice de dónde sale.
 */

/** Densidad del acero, para derivar Ap desde el peso de catálogo. */
const DENSIDAD_ACERO_KG_M3 = 7850;

/**
 * Recubrimiento de zinc Z180, kg/m² contando las dos caras (el folleto lo da
 * como 180 gr/m²). Se descuenta del peso al derivar Ap: el galvanizado pesa
 * pero no toma tracción.
 */
const RECUBRIMIENTO_ZINC_KG_M2 = 0.18;

/**
 * Geometría del perfil, igual para los tres espesores.
 *
 * Las tres últimas cotas salen de la cota inferior del folleto
 * (61 | 183 | 122 | 183 | 122 | 183 | 61 = 915), que se lee así: el panel
 * arranca a medio valle (61 = 122/2), cada tramo de 183 es una cresta plana de
 * 122 más las dos almas inclinadas (30,5 de proyección cada una), y entre
 * crestas queda el valle plano de 122. Cierra el paso: 122 + 122 + 2·30,5 = 305.
 */
export const PERFIL_DECKPANEL = {
  anchoEfectivoM: 0.915,
  /** Paso entre nervios (3 nervios en el ancho efectivo: 91,5/30,5 = 3 exacto). */
  pasoNervioM: 0.305,
  alturaNervioM: 0.063,
  /** Fondo plano del valle: el nervio de hormigón en su base. */
  anchoValleM: 0.122,
  /** Cresta plana, arriba. */
  anchoCrestaM: 0.122,
  /** Proyección horizontal de cada alma inclinada. */
  proyeccionAlmaM: 0.0305,
} as const;

/**
 * fy del acero base, impreso en el folleto (ASTM A653-2008, SS grado 37).
 * Antes se convertía de 37 ksi y daba 255,11: el folleto ahora publica 255,1.
 */
export const FY_ACERO_DECKPANEL_MPA = 255.1;

/** Tolerancia de fabricación en espesor de chapa, informativa. */
export const TOLERANCIA_ESPESOR_MM = 0.03;

/**
 * bmin: ancho del nervio de hormigón en su base, para el chequeo de incendio
 * de la Tabla 5.5 de EC2-1-2. NO es el paso de nervio (305 mm): son dos
 * dimensiones distintas.
 *
 * Con la edición anterior del folleto esto era una estimación por proporción
 * visual del dibujo (se adoptaban 100 mm de un rango leído a ojo de 100 a 130)
 * y se dejaba editable por eso. Ya no: esta edición acota el perfil y el valor
 * sale de dos lados independientes que coinciden.
 *
 *  1. De la cota inferior, el fondo plano del valle mide 122 mm (ver
 *     `PERFIL_DECKPANEL`).
 *  2. Del volumen de hormigón de la Tabla 2: descontando el hormigón sobre
 *     cresta, los valles aportan exactamente 0,0316 m³/m² en los cinco
 *     espesores tabulados. Eso da un área de valle de 9.638 mm² que, sobre los
 *     63 mm de altura, exige base + techo del trapecio = 306 mm. Con el techo
 *     en 183 (la cresta más las dos almas), la base cae en 123 — el mismo 122
 *     de la cota, dentro del redondeo de la tabla.
 *
 * El nervio de hormigón es un trapecio que se abre hacia arriba: 122 mm abajo
 * y 183 mm a nivel de cresta. Para la Tabla 5.5 manda el ancho en la base, que
 * es donde está la barra.
 */
export const BMIN_NERVIO_M = PERFIL_DECKPANEL.anchoValleM;

export interface FilaDeckpanelArmco {
  /** Espesor del panel, con recubrimiento (dato de catálogo). */
  espesorMm: number;
  /** Espesor del acero base, sin galvanizado (dato de catálogo). */
  espesorAceroBaseMm: number;
  /** Peso propio de la chapa sola, kg/m² de superficie cubierta (dato de catálogo). */
  pesoChapaKgM2: number;
  /** Momento de inercia principal, cm⁴/m (dato de catálogo). */
  ixCm4PorM: number;
  /** Módulo resistente Wx, cm³/m (dato de catálogo). Es el de la fibra superior. */
  wxCm3PorM: number;
  /** Peso propio total (chapa + hormigón), kg/m², por espesor de hormigón sobre cresta hc (cm). Dato de catálogo. */
  pesoPropioTotalPorHcCm: Record<number, number>;
}

export const CATALOGO_DECKPANEL_ARMCO: Record<number, FilaDeckpanelArmco> = {
  0.71: {
    espesorMm: 0.71,
    espesorAceroBaseMm: 0.69,
    pesoChapaKgM2: 7.17,
    ixCm4PorM: 62.95,
    wxCm3PorM: 19.79,
    pesoPropioTotalPorHcCm: { 5: 203, 6: 227, 8: 275, 10: 323, 12: 371 },
  },
  0.89: {
    espesorMm: 0.89,
    espesorAceroBaseMm: 0.87,
    pesoChapaKgM2: 9.05,
    ixCm4PorM: 79.14,
    wxCm3PorM: 24.85,
    pesoPropioTotalPorHcCm: { 5: 205, 6: 229, 8: 277, 10: 325, 12: 373 },
  },
  1.24: {
    espesorMm: 1.24,
    espesorAceroBaseMm: 1.22,
    pesoChapaKgM2: 12.72,
    ixCm4PorM: 110.21,
    wxCm3PorM: 34.52,
    pesoPropioTotalPorHcCm: { 5: 209, 6: 233, 8: 281, 10: 329, 12: 377 },
  },
};

/** Espesor de chapa estándar de obra. */
export const ESPESOR_DECKPANEL_ESTANDAR_MM = 0.89;

function filaDe(espesorMm: number): FilaDeckpanelArmco {
  const fila = CATALOGO_DECKPANEL_ARMCO[espesorMm];
  if (!fila) throw new Error(`No hay deckpanel ARMCO de espesor ${espesorMm} mm en el catálogo.`);
  return fila;
}

/**
 * Distancia del centroide de la chapa a la fibra inferior del perfil, m.
 *
 * Esta edición publica un solo módulo resistente Wx, no los dos Sx de antes.
 * Ix/Wx da 31,81 / 31,85 / 31,93 mm según el espesor: como el perfil mide 63 mm
 * de alto y el centroide cae casi al medio, ese valor es la distancia a la
 * fibra SUPERIOR —el módulo publicado es el menor de los dos, que es el que
 * gobierna—, y la inferior es el complemento, 63 − Ix/Wx.
 *
 * No es una interpretación a ciegas: da 31,19 / 31,15 / 31,07 mm, y la edición
 * anterior del folleto —que sí publicaba Sx,inferior por separado— daba
 * 31,13 / 31,13 / 31,12 por Ix/Sx,inf. Coinciden dentro de 0,06 mm, lo que
 * confirma a la vez que el perfil no cambió entre ediciones y que Wx es el de
 * la fibra superior.
 *
 * dp = h − yInfChapaM se calcula a partir de esto en vez de cargarse a mano, y
 * así no puede quedar desincronizado del espesor total h elegido.
 */
export function yInfChapaM(espesorMm: number): number {
  const fila = filaDe(espesorMm);
  const ySuperiorCm = fila.ixCm4PorM / fila.wxCm3PorM;
  return PERFIL_DECKPANEL.alturaNervioM - ySuperiorCm / 100; // cm → m
}

/**
 * Área neta de chapa por metro de ancho, mm²/m.
 *
 * Sale del peso de catálogo descontando el galvanizado: el zinc pesa pero no
 * tracciona. Sigue siendo un valor derivado y no un Ap certificado, pero con
 * esta edición dejó de ser una hipótesis suelta, porque ahora hay con qué
 * contrastarlo. Dividiendo por el espesor de acero base se obtiene cuánto se
 * desarrolla el perfil respecto de su proyección plana:
 *
 *     0,71 mm → 1,291     0,89 mm → 1,299     1,24 mm → 1,309
 *
 * Que los tres den lo mismo es la confirmación: la forma del perfil no cambia
 * con el espesor de la chapa, así que ese factor tiene que ser constante, y lo
 * es dentro del 1,5 %. Como referencia, el trapecio puro de la cota
 * (122 + 122 + 2 almas de 70 mm sobre un paso de 305) desarrolla 1,259; el 3 %
 * que falta son las muescas estampadas y los solapes, que suman chapa real.
 */
export function apDerivadaMm2PorM(espesorMm: number): number {
  const fila = filaDe(espesorMm);
  return ((fila.pesoChapaKgM2 - RECUBRIMIENTO_ZINC_KG_M2) / DENSIDAD_ACERO_KG_M3) * 1e6;
}
