/**
 * Interpretación completa de una planta de fundaciones: de un DXF leído a
 * pilotes, cabezales, vigas y la lista de lo que no cierra.
 *
 * Un DXF real no trae sólo la planta: la de la oficina tenía la planta de
 * pilotes, la de fundaciones y la planilla de vigas en el mismo espacio
 * modelo, con textos "VR…" en las tres. Por eso primero se separan zonas: los
 * contornos que están cerca entre sí forman una zona, y se trabaja sobre una.
 */

import type { EntidadDxf, LecturaDxf, Punto } from "@/lib/dxf/leer";
import { ubicarCabezales, type Aviso, type Cabezal, type NodoSinMedidas } from "./cabezales";
import { segmentos } from "./geometria";
import { capasConCirculos, pilotes, rotulos, sugerirEscala, type Pilote } from "./rotulos";
import { prolongarANodos, ubicarVigas, type Viga } from "./vigas";

export interface Caja {
  min: Punto;
  max: Punto;
}

export interface Zona {
  caja: Caja;
  /** Largo total de contorno dibujado, en unidades del dibujo. */
  largoContorno: number;
}

export interface OpcionesInterpretacion {
  /** Capa de los contornos de cabezales y vigas. */
  capaContorno: string;
  /** Capa de los círculos que son pilotes. */
  capaPilotes: string;
  /** Metros por unidad del dibujo. */
  escala: number;
  /** Qué zona de `zonas()` interpretar. */
  zona: number;
}

export interface Interpretacion {
  zona: Zona;
  pilotes: Pilote[];
  cabezales: Cabezal[];
  nodos: NodoSinMedidas[];
  vigas: Viga[];
  avisos: Aviso[];
  /** Lo dibujado en la zona, para mostrarlo debajo de lo interpretado. */
  dibujo: EntidadDxf[];
}

function puntosDe(e: EntidadDxf): Punto[] {
  switch (e.tipo) {
    case "linea":
      return [e.a, e.b];
    case "polilinea":
      return e.puntos;
    case "circulo":
      return [e.centro];
    default:
      return [e.posicion];
  }
}

function cajaDe(puntos: Punto[]): Caja {
  const xs = puntos.map((p) => p[0]);
  const ys = puntos.map((p) => p[1]);
  return { min: [Math.min(...xs), Math.min(...ys)], max: [Math.max(...xs), Math.max(...ys)] };
}

const separacion = (a: Caja, b: Caja) =>
  Math.max(0, a.min[0] - b.max[0], b.min[0] - a.max[0], a.min[1] - b.max[1], b.min[1] - a.max[1]);

/**
 * Zonas de contorno: grupos de líneas y polilíneas de la capa que quedan a
 * menos de 8 m entre sí. Ordenadas de la que más contorno tiene a la que menos:
 * la primera suele ser la planta.
 *
 * 8 m porque un cabezal aislado puede estar a un par de metros del resto y no
 * tiene que quedar afuera, mientras que dos dibujos distintos del mismo
 * archivo (planta de pilotes y de fundaciones) estaban a 16 m.
 */
export function zonas(lectura: LecturaDxf, capaContorno: string, escala: number): Zona[] {
  const piezas = lectura.entidades
    .filter((e) => e.capa === capaContorno && (e.tipo === "polilinea" || e.tipo === "linea"))
    .map((e) => ({ caja: cajaDe(puntosDe(e)), largo: segmentos([e], capaContorno).reduce((s, x) => s + Math.hypot(x.b[0] - x.a[0], x.b[1] - x.a[1]), 0) }));

  // Unión de grupos: cada pieza se suma al grupo con el que se toca.
  const grupos: { caja: Caja; largo: number }[] = [];
  for (const p of piezas) {
    let actual = { caja: p.caja, largo: p.largo };
    for (let i = grupos.length - 1; i >= 0; i--) {
      if (separacion(grupos[i].caja, actual.caja) <= 8 / escala) {
        const g = grupos.splice(i, 1)[0];
        actual = { caja: cajaDe([g.caja.min, g.caja.max, actual.caja.min, actual.caja.max]), largo: g.largo + actual.largo };
      }
    }
    grupos.push(actual);
  }
  return grupos.map((g) => ({ caja: g.caja, largoContorno: g.largo })).sort((a, b) => b.largoContorno - a.largoContorno);
}

/** Lo que cae en la zona, con un margen: los rótulos suelen quedar afuera del contorno. */
function dentroDe(caja: Caja, margen: number) {
  return (e: EntidadDxf) =>
    puntosDe(e).some((p) => p[0] >= caja.min[0] - margen && p[0] <= caja.max[0] + margen && p[1] >= caja.min[1] - margen && p[1] <= caja.max[1] + margen);
}

/** Lo que se le propone a quien sube el archivo antes de que elija nada. */
export function opcionesSugeridas(lectura: LecturaDxf): Omit<OpcionesInterpretacion, "zona"> | null {
  const capaPilotes = capasConCirculos(lectura)[0]?.capa;
  if (!capaPilotes) return null;
  const escala = sugerirEscala(pilotes(lectura.entidades, capaPilotes)) ?? 0.001;
  return { capaContorno: capaPilotes, capaPilotes, escala };
}

export function interpretar(lectura: LecturaDxf, o: OpcionesInterpretacion): Interpretacion | null {
  const zona = zonas(lectura, o.capaContorno, o.escala)[o.zona];
  if (!zona) return null;
  const dibujo = lectura.entidades.filter(dentroDe(zona.caja, 3 / o.escala));
  const pil = pilotes(dibujo, o.capaPilotes);
  const rot = rotulos(dibujo);
  const segs = segmentos(dibujo, o.capaContorno);
  const c = ubicarCabezales(rot, pil, segs, o.escala);
  const v = ubicarVigas(rot, segs, c.cabezales, o.escala);
  const vigas = prolongarANodos(v.vigas, c.nodos, pil, o.escala);
  return { zona, pilotes: pil, cabezales: c.cabezales, nodos: c.nodos, vigas, avisos: [...c.avisos, ...v.avisos], dibujo };
}
