import { describe, expect, it } from "vitest";
import { calcularCuelgue } from "@/lib/calc/hormigon/vigas/cuelgue";

describe("calcularCuelgue", () => {
  const materiales = { fykMPa: 500 };
  const geometria = { hM: 0.5, h2M: 0.4, aM: 0.3 };
  const datos = { reaccionKN: 200, diametroEstriboMm: 10, numeroRamas: 2 };

  it("As necesaria sale de Rd/fyd, con fyd = fyk/γs sin tope (art. 6.5.3(1))", () => {
    const r = calcularCuelgue(materiales, geometria, datos);
    expect(r.fydMPa).toBeCloseTo(434.782608695652, 6);
    expect(r.asNecesariaCm2).toBeCloseTo(4.6, 4);
  });

  it("redondea la cantidad de estribos hacia arriba", () => {
    const r = calcularCuelgue(materiales, geometria, datos);
    expect(r.areaPorEstriboCm2).toBeCloseTo(1.5707963267948966, 6);
    expect(r.cantidadEstribos).toBe(3);
  });

  it("zona de reparto de la figura A19.9.7", () => {
    const { zona } = calcularCuelgue(materiales, geometria, datos);
    expect(zona.recibeDesdeCaraM).toBeCloseTo(0.5 / 3, 9);
    expect(zona.recibeDesdeEjeM).toBeCloseTo(0.25, 9);
    expect(zona.llegaDesdeCaraM).toBeCloseTo(0.4 / 3, 9);
    expect(zona.llegaDesdeEjeM).toBeCloseTo(0.2, 9);
  });

  it("marca si h1 < h2, fuera de lo que supone la figura", () => {
    expect(calcularCuelgue(materiales, geometria, datos).cantosComoLaFigura).toBe(true);
    expect(calcularCuelgue(materiales, { ...geometria, h2M: 0.6 }, datos).cantosComoLaFigura).toBe(false);
  });

  it("aviso de Montoya h ≥ 1,2·a, que no cambia la armadura", () => {
    const bien = calcularCuelgue(materiales, geometria, datos);
    expect(bien.cantoMinimoM).toBeCloseTo(0.36, 6);
    expect(bien.cumpleAvisoCantoMinimo).toBe(true);

    const corto = calcularCuelgue(materiales, { ...geometria, hM: 0.3 }, datos);
    expect(corto.cumpleAvisoCantoMinimo).toBe(false);
    expect(corto.asNecesariaCm2).toBeCloseTo(bien.asNecesariaCm2, 9);
  });
});
