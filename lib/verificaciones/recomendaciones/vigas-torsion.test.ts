import { describe, expect, it } from "vitest";
import { recomendarVigaTorsion } from "./vigas-torsion";

const BASE = {
  fck: "30", fyk: "500", b: "0.3", h: "0.6", recubrimiento: "0.04",
  momentoPos: "100", numeroPos: "4", diametroPos: "16", momentoNeg: "60", numeroNeg: "3", diametroNeg: "16",
  vd: "150", diametroEstribo: "8", numeroRamas: "2", td: "10",
};

describe("recomendaciones de la viga con torsión", () => {
  it("bielas de torsión excedidas: ensanchar primero, y cumple", () => {
    const r = recomendarVigaTorsion({ ...BASE, td: "120" }).bielasTorsion ?? [];
    expect(r[0].accion).toMatch(/^b = /);
    for (const p of r) expect(p.utilizacion).toBeLessThanOrEqual(1);
  });
});
