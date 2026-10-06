import { describe, expect, it } from "vitest";
import { resolverPunzonamiento } from "@/lib/calc/hormigon/losas/resolver-punzonamiento";
import { recomendarPunzonamiento } from "./punzonamiento";

const BASE = {
  posicion: "Interior", betaModo: "Recomendado", beta: "1.15",
  fck: "30", fyk: "500", espesor: "0.20", recubrimiento: "0.025",
  c1: "0.30", c2: "0.30", distBordeC1: "0", distBordeC2: "0",
  phiNegY: "12", sNegY: "0.15", phiNegZ: "12", sNegZ: "0.15",
  vEd: "256", phiCerco: "8", ramas: "12", sr: "0.12", st: "0.20", nPerimetros: "3", distPrimer: "0.08",
};

describe("recomendaciones de punzonamiento", () => {
  it("el resolver da lo mismo que antes de moverlo", () => {
    const r = resolverPunzonamiento(BASE)!;
    expect(r.dY).toBeCloseTo(0.169, 6);
    expect(r.dZ).toBeCloseTo(0.157, 6);
  });

  it("cara del pilar excedida: cada propuesta la deja cumpliendo", () => {
    const r = recomendarPunzonamiento({ ...BASE, vEd: "1100" }).caraPilar ?? [];
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].accion).toMatch(/^h = /);
    for (const p of r) expect(p.utilizacion).toBeLessThanOrEqual(1);
  });

  it("sin armadura que no alcanza: primero más negativos", () => {
    const r = recomendarPunzonamiento({ ...BASE, vEd: "300" }).critico ?? [];
    expect(r[0]?.accion).toMatch(/^Negativos /);
  });
});
