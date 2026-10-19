import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { leerDxf } from "@/lib/dxf/leer";
import type { Punto } from "@/lib/dxf/leer";
import { ubicarCabezales, type Cabezal } from "./cabezales";
import { segmentos, type Segmento } from "./geometria";
import { pilotes, reconocerRotulo, rotulos, type Rotulo } from "./rotulos";
import { prolongarANodos, ubicarVigas, type Viga } from "./vigas";

describe("ubicarVigas en la planta de prueba", () => {
  const l = leerDxf(readFileSync(path.join(__dirname, "..", "dxf", "prueba.dxf"), "utf8"));
  const segs = segmentos(l.entidades, "FUNDACIONES");
  const rot = rotulos(l.entidades);
  const cab = ubicarCabezales(rot, pilotes(l.entidades, "FUNDACIONES"), segs, 0.001).cabezales;
  const r = ubicarVigas(rot, segs, cab, 0.001);

  /** Los CT9 miden 1800 y están centrados en x = 0 y x = 6000: caras en 900 y 5100. */
  it("va de cara a cara de los cabezales, con la sección del rótulo", () => {
    expect(r.vigas).toHaveLength(1);
    const v = r.vigas[0];
    expect(v.nombre).toBe("VR4");
    const [x0, x1] = [v.inicio[0], v.fin[0]].sort((a, b) => a - b);
    expect(x0).toBeCloseTo(900, 6);
    expect(x1).toBeCloseTo(5100, 6);
    expect(v.inicio[1]).toBeCloseTo(0, 6);
    expect([v.ancho, v.alto]).toEqual([350, 600]);
    expect(v.anchoDibujado).toBeUndefined();
    expect(r.avisos).toEqual([]);
  });
});

/**
 * Una unión en T como las de la planta real: la riostra VR1 (300) baja hasta
 * la centradora VC1 (800), cuyo borde inferior tiene una boca donde llega la
 * riostra. Abajo, la riostra termina en un cabezal.
 *
 *   y=400   ────────────────────────────────────────  VC1 (x 0 a 10000)
 *   y=-400  ──────────────┐   ┌──────────────────────
 *                         │   │  VR1 (x 4850 a 5150)
 *   y=-3000             ┌─┘   └─┐ cabezal 1000x1000
 */
describe("unión en T", () => {
  const s = (a: Punto, b: Punto): Segmento => ({ a, b });
  const segs: Segmento[] = [
    s([0, 400], [10000, 400]),
    s([0, -400], [4850, -400]),
    s([5150, -400], [10000, -400]),
    s([4850, -400], [4850, -3000]),
    s([5150, -400], [5150, -3000]),
  ];
  const cabezal: Cabezal = {
    nombre: "CT1",
    rect: { centro: [5000, -3500], angulo: 0, largo: 1000, ancho: 1000 },
    canto: 750,
    medidas: [1000, 1000, 750],
    pilotes: [0],
    cobertura: 0.8,
    origen: "contorno",
    rotulo: [5800, -3500],
  };
  const rot = [reconocerRotulo("VC1 800x600", [3000, 600]), reconocerRotulo("VR1 300x500", [5400, -1500])] as Rotulo[];
  const r = ubicarVigas(rot, segs, [cabezal], 0.001);
  const por = (n: string) => r.vigas.find((v) => v.nombre === n)!;

  it("la centradora sigue de largo por la boca donde le llega la riostra", () => {
    const vc = por("VC1");
    expect([vc.inicio[0], vc.fin[0]].sort((a, b) => a - b)).toEqual([0, 10000]);
    expect(vc.inicio[1]).toBeCloseTo(0, 6);
  });

  it("la riostra termina en la cara de la centradora y en la del cabezal", () => {
    const vr = por("VR1");
    expect([vr.inicio[1], vr.fin[1]].sort((a, b) => a - b).map((y) => Math.round(y))).toEqual([-3000, -400]);
    expect(vr.inicio[0]).toBeCloseTo(5000, 6);
  });

  /**
   * CT6/CT7 de la planta real: el contorno dibuja un ensanche en el nodo y
   * las vigas terminaban 22 a 47 cm antes del pilote, que quedaba sin nada
   * encima. El nodo es parte de la viga: la viga llega hasta el pilote.
   */
  it("una viga que se queda corta antes del pilote de un nodo llega hasta él", () => {
    const viga: Viga = { nombre: "VR21", inicio: [0, 0], fin: [5000, 0], ancho: 450, alto: 550, rotulo: [0, 0] };
    const pil = [
      { centro: [5400, 0] as Punto, diametro: 500 }, // nodo alineado, a 40 cm
      { centro: [-300, 900] as Punto, diametro: 500 }, // nodo corrido de costado: no es de esta viga
      { centro: [7000, 0] as Punto, diametro: 500 }, // nodo alineado pero a 2 m: no
    ];
    const nodos = [0, 1, 2].map((k) => ({ nombre: "CT7", rotulo: pil[k].centro, pilotes: [k] }));
    const [v] = prolongarANodos([viga], nodos, pil, 0.001);
    expect(v.inicio[0]).toBeCloseTo(0, 6);
    expect(v.fin[0]).toBeCloseTo(5400, 6);
  });

  it("si la viga está dibujada con otro ancho, usa el rótulo y lo avisa", () => {
    const otro = ubicarVigas([reconocerRotulo("VR1 350x500", [5400, -1500])] as Rotulo[], segs, [cabezal], 0.001);
    expect(otro.vigas[0].ancho).toBe(350);
    expect(otro.vigas[0].anchoDibujado).toBeCloseTo(300, 6);
    expect(otro.avisos[0].texto).toMatch(/VR1: dibujada de 300 de ancho, el rótulo dice 350/);
  });
});
