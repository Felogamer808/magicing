import { describe, expect, it } from "vitest";
import { resolverMensulaCorta } from "@/lib/calc/hormigon/resolver-mensula-corta";
import { recomendarMensulaCorta } from "./mensula-corta";

const BASE = {
  ac: "0,20", hc: "0,50", h1: "0,25", b: "0,40", hcol: "0,40", ap: "0,15", bp: "0,30", rec: "0,035",
  fEd: "450", hEd: "67,5", modoH: "H = 0,15·F automático", fck: "30", fyk: "500",
  phiP: "20", phiE: "10", adherencia: "Buena", soldada: "No",
};

describe("recomendaciones de la ménsula corta", () => {
  it("el resolver toma H = 0,15·F en modo automático", () => {
    expect(resolverMensulaCorta(BASE)!.hEdKN).toBeCloseTo(67.5, 9);
    expect(resolverMensulaCorta({ ...BASE, modoH: "Manual", hEd: "10" })!.hEdKN).toBe(10);
  });

  it("nudo excedido: placa más grande primero, y cumple", () => {
    const r = recomendarMensulaCorta({ ...BASE, fEd: "900" }).nudo ?? [];
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].accion).toMatch(/^Placa /);
    for (const p of r) expect(p.utilizacion).toBeLessThanOrEqual(1);
  });
});
