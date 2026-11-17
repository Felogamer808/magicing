import { describe, expect, it } from "vitest";
import { calcularArmaduraPiel, separacionMaximaTablaMm } from "./armadura-piel";

// Sin planilla de referencia: contrastado a mano. fck 30 → fctm = 2,8965 MPa.
const FCTM = 0.3 * 30 ** (2 / 3);
const base = {
  anchoAlmaM: 0.3, cantoM: 1.0, dM: 0.94, recubrimientoM: 0.03,
  fctmMPa: FCTM, fykMPa: 500, diametroMaximoMm: 20, xEluM: 0.2,
};

describe("tabla A19.7.3, wk = 0,3 mm", () => {
  it("valores de la tabla e interpolación", () => {
    expect(separacionMaximaTablaMm(200)).toBe(250);
    expect(separacionMaximaTablaMm(250)).toBeCloseTo(187.5, 9);
    expect(separacionMaximaTablaMm(100)).toBe(300);
  });
});

describe("armadura de piel, art. 7.3.3 (3)", () => {
  it("h = 1 m: exigida; (7.1) con kc 0,4, k 0,5 y σs = fyk, mitad por cara", () => {
    const r = calcularArmaduraPiel(base);
    expect(r.motivo).toBe("exigida");
    // x = h/2 en el rectángulo bruto; Act = 0,30·0,50
    expect(r.xSinFisurarM).toBeCloseTo(0.5, 12);
    expect(r.actM2).toBeCloseTo(0.15, 12);
    // 0,4·0,5·2,8965·0,15/500 = 1,7379 cm²
    expect(r.areaTotalCm2).toBeCloseTo(1.7379, 4);
    expect(r.areaPorCaraCm2).toBeCloseTo(0.86895, 4);
    // De d a x: 0,44 m; s ≤ 187,5 → 3 barras; con Ø8 el área ya alcanza
    expect(r.alturaZonaM).toBeCloseTo(0.44, 12);
    expect(r.propuesta).toMatchObject({ diametroMm: 8, barrasPorCara: 3 });
    expect(r.propuesta!.separacionMm).toBeCloseTo(146.67, 2);
    expect(r.desconchamiento).toBeNull();
  });

  it("desde 0,60 m es constructiva y por debajo no se da", () => {
    expect(calcularArmaduraPiel({ ...base, cantoM: 0.7, dM: 0.64 }).motivo).toBe("constructiva");
    const bajo = calcularArmaduraPiel({ ...base, cantoM: 0.5, dM: 0.45 });
    expect(bajo.motivo).toBe("no-requiere");
    expect(bajo.propuesta).toBeNull();
  });

  it("con mucha área manda el área y sube el diámetro si pone menos acero", () => {
    const r = calcularArmaduraPiel({ ...base, anchoAlmaM: 0.8, cantoM: 2, dM: 1.9 });
    // Act = 0,8·1 → 9,268 cm² total, 4,634 por cara; zona 0,9 m → 5 por separación
    expect(r.areaPorCaraCm2).toBeCloseTo(4.634, 3);
    const p = r.propuesta!;
    expect(p.areaPorCaraCm2).toBeGreaterThanOrEqual(r.areaPorCaraCm2);
    expect(p.separacionMm).toBeLessThanOrEqual(187.5);
  });

  it("Ø > 32: desconchamiento del Apéndice J.1 con 0,01·Act,ext", () => {
    const r = calcularArmaduraPiel({ ...base, diametroMaximoMm: 40 });
    // Act,ext = 0,03·(0,30 + 2·0,80) = 0,057 m² → 5,7 cm²
    expect(r.desconchamiento!.actExtM2).toBeCloseTo(0.057, 12);
    expect(r.desconchamiento!.areaMinimaCm2).toBeCloseTo(5.7, 9);
  });
});
