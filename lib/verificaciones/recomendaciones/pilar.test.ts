import { describe, expect, it } from "vitest";
import { recomendarPilar } from "./pilar";

describe("recomendaciones del pilar", () => {
  const BASE = {
    fck: "30", fyk: "500", b: "0.3", h: "0.3", altura: "3", rec: "0.03", nEd: "1000",
    coaccionH: "Biarticulado (β = 1,0)", betaH: "1", arriostradoH: "Arriostrado", m01H: "0", m02H: "30", vEdH: "20",
    coaccionB: "Biarticulado (β = 1,0)", betaB: "1", arriostradoB: "Arriostrado", m01B: "0", m02B: "0", vEdB: "0",
    modoFluencia: "Sin dato (A = 0,7)", phiEf: "2", hr: "70", t0: "28", cemento: "", exposicion: "", relacionMqp: "0.7",
    phi: "16", nCaraB: "3", nCaraH: "3", phiCerco: "8", sepCercos: "0.2", ramasH: "2", ramasB: "2",
  };

  it("flexión excedida en h: más diámetro primero, y cumple", () => {
    const r = recomendarPilar({ ...BASE, m02H: "160" }).flexionH ?? [];
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].accion).toMatch(/^8Ø\d+ \(hoy 8Ø16\)$/);
    for (const p of r) expect(p.utilizacion).toBeLessThanOrEqual(1);
  });

  it("cortante excedido: cerrar los cercos primero", () => {
    const r = recomendarPilar({ ...BASE, vEdH: "140" }).cortanteH ?? [];
    expect(r[0].accion).toMatch(/^Cercos c\//);
    for (const p of r) expect(p.utilizacion).toBeLessThanOrEqual(1);
  });

  it("barras sin sujetar: una rama más", () => {
    const r = recomendarPilar({ ...BASE, b: "0.5", nCaraB: "5" }).sujecion ?? [];
    expect(r[0].accion).toMatch(/^Ramas \/\/ h: 3/);
  });
});
