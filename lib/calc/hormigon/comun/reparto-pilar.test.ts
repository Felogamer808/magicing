import { describe, expect, it } from "vitest";
import { epsilonC2, repartoAxilPilar } from "@/lib/calc/hormigon/comun/reparto-pilar";
import { areaBarraCm2 } from "@/lib/calc/armaduras";

describe("repartoAxilPilar", () => {
  it("pilar 30×30 con 4φ16, HA-25/B500S: las barras llevan ≈ 18 %", () => {
    const as = 4 * areaBarraCm2(16); // 8,04 cm²
    const r = repartoAxilPilar({ fckMPa: 25, fykMPa: 500, bM: 0.3, hM: 0.3, asCm2: as });
    // σs = 200 000 · 0,002 = 400 MPa < fyd = 434,8 MPa
    expect(r.sigmaSMPa).toBeCloseTo(400, 9);
    expect(r.fcdMPa).toBeCloseTo(16.6667, 4);
    expect(r.capacidadAceroKN).toBeCloseTo(321.7, 1);
    // (0,09 − 0,000804)·16 667 = 1486,6 kN
    expect(r.capacidadHormigonKN).toBeCloseTo(1486.6, 1);
    expect(r.fraccionArmadura).toBeCloseTo(0.1779, 4);
    expect(r.cumpleCuantiaMaxima).toBe(true);
  });

  it("con la cuantía máxima del 4 % y HA-25, mitad y mitad", () => {
    const r = repartoAxilPilar({ fckMPa: 25, fykMPa: 500, bM: 0.3, hM: 0.3, asCm2: 36 });
    expect(r.cuantiaGeometrica).toBeCloseTo(0.04, 9);
    expect(r.cumpleCuantiaMaxima).toBe(true);
    // 0,0036·400 000 = 1440 kN; 0,0864·16 667 = 1440 kN
    expect(r.capacidadAceroKN).toBeCloseTo(1440, 6);
    expect(r.capacidadHormigonKN).toBeCloseTo(1440, 6);
    expect(r.fraccionArmadura).toBeCloseTo(0.5, 9);
  });

  it("más hormigón, menos parte para las barras", () => {
    const c25 = repartoAxilPilar({ fckMPa: 25, fykMPa: 500, bM: 0.3, hM: 0.3, asCm2: 36 });
    const c40 = repartoAxilPilar({ fckMPa: 40, fykMPa: 500, bM: 0.3, hM: 0.3, asCm2: 36 });
    expect(c40.fraccionArmadura).toBeLessThan(c25.fraccionArmadura);
  });

  it("marca la cuantía por encima del 4 %", () => {
    const r = repartoAxilPilar({ fckMPa: 25, fykMPa: 500, bM: 0.3, hM: 0.3, asCm2: 40 });
    expect(r.cumpleCuantiaMaxima).toBe(false);
  });

  it("εc2 de la tabla A19.3.1: 2 ‰ hasta C50 y crece después", () => {
    expect(epsilonC2(50)).toBe(0.002);
    expect(epsilonC2(60)).toBeCloseTo((2 + 0.085 * 10 ** 0.53) / 1000, 12);
  });

  it("con fck alto el acero llega a fyd y no pasa", () => {
    const r = repartoAxilPilar({ fckMPa: 90, fykMPa: 400, bM: 0.3, hM: 0.3, asCm2: 10 });
    expect(r.sigmaSMPa).toBeCloseTo(400 / 1.15, 9);
  });
});
