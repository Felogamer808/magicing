import { describe, expect, it } from "vitest";
import { calcularCuelgue, calcularCuelguePilar } from "@/lib/calc/hormigon/vigas/cuelgue";

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

describe("calcularCuelguePilar", () => {
  const base = {
    ndPilarKN: 1000,
    fckMPa: 25,
    fykMPa: 500,
    hVigaM: 0.6,
    ladoPilarM: 0.3,
    anchoPilarM: 0.3,
    asPilarCm2: 4 * 2.0106192982974678, // 4φ16
    diametroEstriboMm: 10,
    numeroRamas: 2,
  };

  it("sin imponer, cuelga lo que llevan las barras: ≈ 18 % de 1000 kN", () => {
    const r = calcularCuelguePilar(base);
    expect(r.fraccionAdoptada).toBeCloseTo(0.1779, 4);
    expect(r.cargaColgadaKN).toBeCloseTo(177.9, 1);
    // 177,9 kN / 434,8 MPa = 4,09 cm² → 3 cercos φ10 de 2 ramas (4,71 cm²)
    expect(r.asNecesariaCm2).toBeCloseTo(4.09, 2);
    expect(r.cantidadEstribos).toBe(3);
    expect(r.fraccionMenorQueCalculada).toBe(false);
  });

  it("con 50 % impuesto cuelga 500 kN", () => {
    const r = calcularCuelguePilar({ ...base, fraccionImpuesta: 0.5 });
    expect(r.cargaColgadaKN).toBeCloseTo(500, 9);
    expect(r.asNecesariaCm2).toBeCloseTo(11.5, 9);
    expect(r.fraccionCalculada).toBeCloseTo(0.1779, 4);
  });

  it("avisa si se impone menos de lo que llevan las barras", () => {
    expect(calcularCuelguePilar({ ...base, fraccionImpuesta: 0.1 }).fraccionMenorQueCalculada).toBe(true);
  });

  it("separación: 3 cercos en 0,60 m de zona, cada 20 cm", () => {
    const r = calcularCuelguePilar(base);
    expect(r.largoZonaM).toBeCloseTo(0.6, 9);
    expect(r.separacionM).toBeCloseTo(0.2, 9);
    expect(r.recortadaPorBorde).toBe(false);
  });

  it("pilar cerca del borde: ese lado llega hasta rg + Ø/2 del borde", () => {
    // 0,20 − 0,03 − 0,005 = 0,165 m hacia el borde, 0,30 m del otro lado
    const r = calcularCuelguePilar({ ...base, distanciaBordeM: 0.2, recubrimientoM: 0.03 });
    expect(r.recortadaPorBorde).toBe(true);
    expect(r.zonaLadoBordeM).toBeCloseTo(0.165, 9);
    expect(r.zonaLadoOpuestoM).toBeCloseTo(0.3, 9);
    expect(r.largoZonaM).toBeCloseTo(0.465, 9);
    // misma armadura, menos largo: 0,465/3 = 0,155 → 15 cm
    expect(r.cantidadEstribos).toBe(3);
    expect(r.separacionM).toBeCloseTo(0.15, 9);
  });

  it("borde lejos: no recorta", () => {
    const r = calcularCuelguePilar({ ...base, distanciaBordeM: 2, recubrimientoM: 0.03 });
    expect(r.recortadaPorBorde).toBe(false);
    expect(r.largoZonaM).toBeCloseTo(0.6, 9);
  });

  it("zona: máx(lado del pilar; h/2) a cada lado", () => {
    expect(calcularCuelguePilar(base).anchoZonaM).toBeCloseTo(0.3, 9);
    expect(calcularCuelguePilar({ ...base, hVigaM: 1 }).anchoZonaM).toBeCloseTo(0.5, 9);
  });
});
