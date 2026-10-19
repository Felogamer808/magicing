/**
 * Lo que se lleva a Revit: la planta interpretada, en metros, lista para que
 * un script de Dynamo coloque las familias de la oficina.
 *
 * Las coordenadas son las del CAD pasadas a metros, sin corrimiento: el CAD
 * se vincula en Revit origen a origen (criterio del usuario), así que cada
 * pieza cae sobre su dibujo. Las cotas son relativas al nivel donde se
 * coloca la fundación: la cara superior común es 0.
 *
 * Criterios del usuario que se aplican acá:
 * - cara superior de cabezales y vigas a una cota común; un cabezal puede
 *   tener desnivel (el CT14 de ascensor iba 1,30 m más abajo);
 * - pilotes 10 cm dentro de la pieza que tienen encima, largo representativo
 *   (12 m: no se calculan pilotes);
 * - vigas de cara a cara del cabezal.
 */

import type { Punto } from "@/lib/dxf/leer";
import { aEjes } from "./geometria";
import type { Interpretacion } from "./interpretar";

export const FORMATO_EXPORTACION = "magicing-cad-revit";
export const VERSION_EXPORTACION = 1;

export interface OpcionesExportacion {
  /** Metros por unidad del dibujo. */
  escala: number;
  /** Largo de todos los pilotes, m. */
  largoPiloteM: number;
  /** Cuánto entra la cabeza del pilote en la pieza de arriba, m. */
  penetracionPiloteM: number;
  /** Desnivel de la cara superior de cada cabezal (por índice), m. Negativo = más abajo. */
  desniveles: Record<number, number>;
  /** Nombre del DXF, para que el archivo diga de dónde salió. */
  archivo: string;
}

export interface CabezalExportado {
  nombre: string;
  /** Centro en planta, m. */
  centro: Punto;
  /** Giro del lado `largo` respecto de X, grados. */
  giroGrados: number;
  largo: number;
  ancho: number;
  canto: number;
  /** Cota de la cara superior respecto del nivel, m. */
  cotaSuperior: number;
  /**
   * Las medidas en el orden del rótulo ("CT5 (1100x800x750)": a = 1,10,
   * b = 0,80), m. En la familia de la oficina `a` es `#Ancho` del tipo y `b`
   * es `Length` del ejemplar, y el tipo se llama como el rótulo.
   */
  a: number;
  b: number;
  /** Dirección en planta del lado que mide `a`, grados respecto de X. */
  giroLadoA: number;
}

export interface VigaExportada {
  nombre: string;
  /** Extremos del eje, de cara a cara, m. */
  inicio: Punto;
  fin: Punto;
  ancho: number;
  alto: number;
  cotaSuperior: number;
}

export interface PiloteExportado {
  centro: Punto;
  diametro: number;
  largo: number;
  /** Cota de la cabeza, m: 10 cm dentro de la pieza que tiene encima. */
  cotaCabeza: number;
  /** Nombre de la pieza que tiene encima, o null si no se encontró. */
  bajo: string | null;
}

export interface ExportacionRevit {
  formato: typeof FORMATO_EXPORTACION;
  version: number;
  archivo: string;
  /** Siempre metros, coordenadas del CAD sin corrimiento (origen a origen). */
  unidad: "m";
  cabezales: CabezalExportado[];
  vigas: VigaExportada[];
  pilotes: PiloteExportado[];
  /** Lo que conviene revisar, tal como se mostró en pantalla. */
  avisos: string[];
}

const redondear = (x: number) => Math.round(x * 1e4) / 1e4;
const enM = (p: Punto, escala: number): Punto => [redondear(p[0] * escala), redondear(p[1] * escala)];

/** ¿El punto cae sobre la franja de la viga (ancho y largo)? */
function sobreViga(p: Punto, v: Interpretacion["vigas"][number]): boolean {
  const ang = (Math.atan2(v.fin[1] - v.inicio[1], v.fin[0] - v.inicio[0]) * 180) / Math.PI;
  const a = aEjes(v.inicio, ang);
  const b = aEjes(v.fin, ang);
  const q = aEjes(p, ang);
  return q[0] >= Math.min(a[0], b[0]) && q[0] <= Math.max(a[0], b[0]) && Math.abs(q[1] - a[1]) <= v.ancho / 2;
}

export function exportarParaRevit(r: Interpretacion, o: OpcionesExportacion): ExportacionRevit {
  const e = o.escala;
  const avisos = r.avisos.map((a) => a.texto);

  const cabezales: CabezalExportado[] = r.cabezales.map((c, i) => {
    // El rectángulo guarda las medidas según su giro; el rótulo, en su orden.
    // El lado `a` corre a lo largo del giro si es el `largo`, si no a 90°.
    const [a, b] = c.medidas;
    const aSobreElGiro = Math.abs(c.rect.largo - a) <= Math.abs(c.rect.ancho - a);
    return {
      nombre: c.nombre,
      centro: enM(c.rect.centro, e),
      giroGrados: redondear(c.rect.angulo),
      largo: redondear(c.rect.largo * e),
      ancho: redondear(c.rect.ancho * e),
      canto: redondear(c.canto * e),
      cotaSuperior: redondear(o.desniveles[i] ?? 0),
      a: redondear(a * e),
      b: redondear(b * e),
      giroLadoA: redondear((((c.rect.angulo + (aSobreElGiro ? 0 : 90)) % 180) + 180) % 180),
    };
  });

  const vigas: VigaExportada[] = r.vigas.map((v) => ({
    nombre: v.nombre,
    inicio: enM(v.inicio, e),
    fin: enM(v.fin, e),
    ancho: redondear(v.ancho * e),
    alto: redondear(v.alto * e),
    cotaSuperior: 0,
  }));

  // Qué pieza tiene encima cada pilote: el cabezal que lo contiene o, si es
  // de un pilar sobre viga, la viga que pasa por arriba.
  const encima = new Map<number, { nombre: string; fondo: number }>();
  r.cabezales.forEach((c, i) => {
    for (const k of c.pilotes) encima.set(k, { nombre: c.nombre, fondo: cabezales[i].cotaSuperior - cabezales[i].canto });
  });
  const pilotes: PiloteExportado[] = r.pilotes.map((p, k) => {
    let pieza = encima.get(k);
    if (!pieza) {
      const v = r.vigas.findIndex((x) => sobreViga(p.centro, x));
      if (v >= 0) pieza = { nombre: r.vigas[v].nombre, fondo: vigas[v].cotaSuperior - vigas[v].alto };
    }
    if (!pieza) avisos.push(`Pilote Ø${Math.round(p.diametro)} sin cabezal ni viga encima: se exporta con la cabeza en la cota 0.`);
    return {
      centro: enM(p.centro, e),
      diametro: redondear(p.diametro * e),
      largo: o.largoPiloteM,
      cotaCabeza: redondear(pieza ? pieza.fondo + o.penetracionPiloteM : 0),
      bajo: pieza?.nombre ?? null,
    };
  });

  return { formato: FORMATO_EXPORTACION, version: VERSION_EXPORTACION, archivo: o.archivo, unidad: "m", cabezales, vigas, pilotes, avisos };
}
