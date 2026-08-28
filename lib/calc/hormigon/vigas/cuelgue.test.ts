import { describe, expect, it } from "vitest";
import { calcularCuelgue } from "@/lib/calc/hormigon/vigas/cuelgue";

describe("calcularCuelgue", () => {
  const materiales = { fykMPa: 500 };
  const geometria = { hM: 0.5, aM: 0.3 };
  const datos = { reaccionKN: 200, diametroEstriboMm: 10, numeroRamas: 2 };

  it("As necesaria sale de Rd·10/fyd", () => {
    const r = calcularCuelgue(materiales, geometria, datos);
    expect(r.fydMPa).toBeCloseTo(434.782608695652, 6);
    expect(r.asNecesariaCm2).toBeCloseTo(4.6, 4);
  });

  it("redondea la cantidad de estribos hacia arriba", () => {
    const r = calcularCuelgue(materiales, geometria, datos);
    expect(r.areaPorEstriboCm2).toBeCloseTo(1.5707963267948966, 6);
    expect(r.cantidadEstribos).toBe(3);
  });

  it("verifica h ≥ 1,2·a", () => {
    const r = calcularCuelgue(materiales, geometria, datos);
    expect(r.cantoMinimoM).toBeCloseTo(0.36, 6);
    expect(r.verificaCanto).toBe(true);
  });

  it("no verifica si el canto queda por debajo de 1,2·a", () => {
    const r = calcularCuelgue(materiales, { hM: 0.3, aM: 0.3 }, datos);
    expect(r.verificaCanto).toBe(false);
  });
});
