import { describe, expect, it } from "vitest";
import { recomendarZonaParcialmenteCargada } from "./zona-parcialmente-cargada";
import { recomendarFisuracion } from "./fisuracion";

describe("recomendaciones: zona parcialmente cargada", () => {
  const BASE = { fck: "30", fyk: "500", nEd: "1500", b1: "0.3", d1: "0.3", anchoB: "0.4", anchoD: "1", bordeB: "0.2", bordeD: "0.5", altura: "0.8" };
  it("aplastamiento excedido: cada propuesta cumple", () => {
    const r = recomendarZonaParcialmenteCargada({ ...BASE, nEd: "4000" }).aplastamiento ?? [];
    expect(r.length).toBeGreaterThan(0);
    for (const p of r) expect(p.utilizacion).toBeLessThanOrEqual(1);
  });
});

describe("recomendaciones: fisuración", () => {
  const BASE = { fck: "30", fyk: "500", esGPa: "200", rg: "0.02", k2: "0.5", wAdm: "0.3", h: "0.18", b: "1", mqp: "22", numero1: "7", phi1: "8", familia2: "No", numero2: "4", phi2: "10" };
  it("fisura excedida: más barras primero, y cumple", () => {
    const r = recomendarFisuracion({ ...BASE, mqp: "30" }).wk ?? [];
    expect(r[0].accion).toMatch(/^Armadura: \d+ Ø8 \(hoy 7 Ø8\)$/);
    for (const p of r) expect(p.utilizacion).toBeLessThanOrEqual(1);
  });
});
