/**
 * Las piezas de la planta de fundaciones en 3D, en metros: lo que dibuja el
 * visor del proyecto.
 *
 * La geometría es la de la exportación a Revit (`exportarParaRevit`): mismos
 * centros, giros, cotas, desniveles y cabeza de pilote 10 cm dentro de la pieza
 * de arriba. Así lo que se ve en MagicIng es lo que coloca el script de Dynamo.
 *
 * Además, un tramo de pilar sobre cada cabezal y cada nodo: los pilares no se
 * dibujan en la planta, pero es donde se cargan las cargas, y verlo ayuda a
 * leer qué lado es A y cuál B. Su id es "pilar:" + la marca de la pieza.
 *
 * Ejes de three.js: Y hacia arriba. La planta (x, y) va a (x, −z), centrada en
 * la zona, para que la cámara gire alrededor del modelo y no del origen del CAD.
 */

import type { PilarCargado, PlantaGuardada } from "@/lib/proyectos/tipos";
import { exportarParaRevit, PENETRACION_PILOTE_M } from "./exportar";
import { direccionLadoA, marcasDePlanta } from "./proyecto";

export interface Pieza3D {
  id: string;
  forma: "caja" | "cilindro";
  /** Centro, m, ejes de three (Y arriba). */
  centro: [number, number, number];
  /** Caja: [largo en su eje, alto, ancho]. Cilindro: [diámetro, largo, diámetro]. */
  medidas: [number, number, number];
  /** Giro alrededor de Y, rad: lleva el eje x local a la dirección del largo. */
  giroY: number;
}

/** Cuánto sobresale el tramo de pilar sobre la cara superior, m. Sólo para ver. */
export const ALTURA_TRAMO_PILAR_M = 0.6;
/** Lado del tramo de pilar mientras no se cargó, m. */
const LADO_PILAR_POR_DEFECTO_M = 0.3;
/** Largo de pilotes si la planta no lo trae guardado, m (el de la página). */
const LARGO_PILOTE_POR_DEFECTO_M = 12;

const rad = (g: number) => (g * Math.PI) / 180;

export function piezas3D(planta: PlantaGuardada, pilares: Map<string, PilarCargado | undefined> = new Map()): Pieza3D[] {
  const r = planta.interpretacion;
  const e = planta.escala;
  const x = exportarParaRevit(r, {
    escala: e,
    largoPiloteM: planta.largoPiloteM ?? LARGO_PILOTE_POR_DEFECTO_M,
    penetracionPiloteM: PENETRACION_PILOTE_M,
    desniveles: planta.desniveles ?? {},
    archivo: planta.archivo,
  });
  const marcas = marcasDePlanta(r);
  const x0 = ((r.zona.caja.min[0] + r.zona.caja.max[0]) / 2) * e;
  const y0 = ((r.zona.caja.min[1] + r.zona.caja.max[1]) / 2) * e;
  /** De la planta (m, CAD) a three: centrada, y del CAD a −z. */
  const a3 = (p: [number, number], altura: number): [number, number, number] => [p[0] - x0, altura, -(p[1] - y0)];
  const piezas: Pieza3D[] = [];

  x.cabezales.forEach((c, i) => {
    piezas.push({
      id: marcas.cabezales[i],
      forma: "caja",
      centro: a3(c.centro, c.cotaSuperior - c.canto / 2),
      medidas: [c.largo, c.canto, c.ancho],
      giroY: rad(c.giroGrados),
    });
    const p = pilares.get(marcas.cabezales[i]);
    piezas.push({
      id: `pilar:${marcas.cabezales[i]}`,
      forma: "caja",
      centro: a3(c.centro, c.cotaSuperior + ALTURA_TRAMO_PILAR_M / 2),
      medidas: [p?.ladoPilotesM ?? LADO_PILAR_POR_DEFECTO_M, ALTURA_TRAMO_PILAR_M, p?.ladoTransversalM ?? LADO_PILAR_POR_DEFECTO_M],
      giroY: rad(direccionLadoA(r.cabezales[i], r.pilotes)),
    });
  });

  x.vigas.forEach((v, i) => {
    const dx = v.fin[0] - v.inicio[0];
    const dy = v.fin[1] - v.inicio[1];
    piezas.push({
      id: marcas.vigas[i],
      forma: "caja",
      centro: a3([(v.inicio[0] + v.fin[0]) / 2, (v.inicio[1] + v.fin[1]) / 2], v.cotaSuperior - v.alto / 2),
      medidas: [Math.hypot(dx, dy), v.alto, v.ancho],
      giroY: Math.atan2(dy, dx),
    });
  });

  x.pilotes.forEach((p, k) => {
    piezas.push({
      id: marcas.pilotes[k],
      forma: "cilindro",
      centro: a3(p.centro, p.cotaCabeza - p.largo / 2),
      medidas: [p.diametro, p.largo, p.diametro],
      giroY: 0,
    });
  });

  // Pilar sobre viga: el tramo de pilar va sobre su pilote, a la cara superior común.
  r.nodos.forEach((n, i) => {
    const ks = n.pilotes.length ? n.pilotes : [];
    if (!ks.length) return;
    const c = ks.map((k) => r.pilotes[k].centro).reduce((a, b) => [a[0] + b[0] / ks.length, a[1] + b[1] / ks.length], [0, 0] as [number, number]);
    const p = pilares.get(marcas.nodos[i]);
    piezas.push({
      id: `pilar:${marcas.nodos[i]}`,
      forma: "caja",
      centro: a3([c[0] * e, c[1] * e], ALTURA_TRAMO_PILAR_M / 2),
      medidas: [p?.ladoPilotesM ?? LADO_PILAR_POR_DEFECTO_M, ALTURA_TRAMO_PILAR_M, p?.ladoTransversalM ?? LADO_PILAR_POR_DEFECTO_M],
      giroY: 0,
    });
  });

  return piezas;
}
