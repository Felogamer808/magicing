import { describe, expect, it } from "vitest";
import { verificarFlexionCompuesta, type EntradaFlexionCompuesta } from "./flexion-compuesta";

const base: EntradaFlexionCompuesta = {
  sigmaT0dMPa: 0,
  sigmaC0dMPa: 0,
  sigmaMYdMPa: 0,
  sigmaMZdMPa: 0,
  ft0dMPa: 8,
  fc0dMPa: 12,
  fmYdMPa: 14,
  fmZdMPa: 14,
  km: 0.7,
  kcY: 1,
  kcZ: 1,
  kcrit: 1,
  sinInestabilidad: false,
};

describe("despacho de modo", () => {
  it("con tracción va por el 6.2.3", () => {
    const r = verificarFlexionCompuesta({ ...base, sigmaT0dMPa: 2, sigmaMYdMPa: 5 });
    expect(r.modo).toBe("flexotraccion");
  });

  it("con compresión y λrel ≤ 0,3 va por el 6.2.4", () => {
    const r = verificarFlexionCompuesta({
      ...base, sigmaC0dMPa: 2, sigmaMYdMPa: 5, sinInestabilidad: true,
    });
    expect(r.modo).toBe("flexocompresion-corta");
  });

  it("con compresión y pieza esbelta va por el 6.3.2", () => {
    const r = verificarFlexionCompuesta({ ...base, sigmaC0dMPa: 2, sigmaMYdMPa: 5, kcY: 0.6, kcZ: 0.4 });
    expect(r.modo).toBe("flexocompresion-pandeo");
  });

  it("el modo de vuelco se pide explícitamente", () => {
    const r = verificarFlexionCompuesta({
      ...base, sigmaC0dMPa: 2, sigmaMYdMPa: 5, kcZ: 0.5, kcrit: 0.8, verificarVuelco: true,
    });
    expect(r.modo).toBe("vuelco-con-compresion");
    expect(Number.isNaN(r.expresionB)).toBe(true);
  });
});

describe("flexotracción, ecs. (6.17) y (6.18)", () => {
  it("reproduce la hoja de la planilla", () => {
    /*
     * σm,x = 10,944, σm,y = 0, σt,0 = 0,9958 MPa; fm,d y ft,0,d de la hoja.
     * Con σm,z nulo gobierna la (6.17), que no penaliza la flexión dominante.
     */
    const r = verificarFlexionCompuesta({
      ...base,
      sigmaT0dMPa: 0.99583333333333335,
      sigmaMYdMPa: 10.943999999999999,
      sigmaMZdMPa: 0,
      ft0dMPa: 9.62,
      fmYdMPa: 16.03,
      fmZdMPa: 17.4,
    });
    expect(r.expresionA).toBeCloseTo(0.99583333333333335 / 9.62 + 10.944 / 16.03, 9);
    expect(r.gobierna).toBe("Ec. (6.17)");
    expect(r.aprovechamiento).toBeGreaterThan(r.expresionB);
  });

  it("el axil entra lineal, no al cuadrado", () => {
    const flojo = verificarFlexionCompuesta({ ...base, sigmaT0dMPa: 2, sigmaMYdMPa: 4 });
    const doble = verificarFlexionCompuesta({ ...base, sigmaT0dMPa: 4, sigmaMYdMPa: 4 });
    // Duplicar la tracción duplica exactamente el término de axil.
    expect(doble.expresionA - flojo.expresionA).toBeCloseTo(2 / 8, 9);
  });
});

describe("flexocompresión sin inestabilidad, ecs. (6.19) y (6.20)", () => {
  it("el axil entra al cuadrado", () => {
    const r = verificarFlexionCompuesta({
      ...base, sigmaC0dMPa: 6, sigmaMYdMPa: 7, sinInestabilidad: true,
    });
    expect(r.expresionA).toBeCloseTo((6 / 12) ** 2 + 7 / 14, 9);
  });

  it("reproduce la hoja de flexocompresión de la planilla", () => {
    const r = verificarFlexionCompuesta({
      ...base,
      sigmaC0dMPa: 0.99583333333333335,
      sigmaMYdMPa: 10.943999999999999,
      sigmaMZdMPa: 0,
      fc0dMPa: 8.93,
      fmYdMPa: 16.03,
      fmZdMPa: 17.4,
      sinInestabilidad: true,
    });
    expect(r.expresionA).toBeCloseTo(
      (0.99583333333333335 / 8.93) ** 2 + 10.944 / 16.03, 9
    );
  });

  it("con axil chico la parábola perdona mucho más que la recta", () => {
    const comunes = { ...base, sigmaMYdMPa: 7 };
    const corta = verificarFlexionCompuesta({ ...comunes, sigmaC0dMPa: 2, sinInestabilidad: true });
    const esbelta = verificarFlexionCompuesta({ ...comunes, sigmaC0dMPa: 2 });
    // Mismo axil y misma flexión, con kc = 1 en las dos: sólo cambia el exponente.
    expect(corta.aprovechamiento).toBeLessThan(esbelta.aprovechamiento);
    expect((2 / 12) ** 2).toBeLessThan(2 / 12);
  });
});

describe("flexocompresión con pandeo, ecs. (6.23) y (6.24)", () => {
  it("cada expresión lleva el kc de su eje", () => {
    const r = verificarFlexionCompuesta({
      ...base, sigmaC0dMPa: 3, sigmaMYdMPa: 7, sigmaMZdMPa: 2, kcY: 0.8, kcZ: 0.5,
    });
    expect(r.expresionA).toBeCloseTo(3 / (0.8 * 12) + 7 / 14 + 0.7 * (2 / 14), 9);
    expect(r.expresionB).toBeCloseTo(3 / (0.5 * 12) + 0.7 * (7 / 14) + 2 / 14, 9);
  });

  it("el eje de menor kc suele gobernar", () => {
    const r = verificarFlexionCompuesta({
      ...base, sigmaC0dMPa: 6, sigmaMYdMPa: 3, sigmaMZdMPa: 0, kcY: 0.9, kcZ: 0.35,
    });
    expect(r.gobierna).toBe("Ec. (6.24)");
  });

  it("el axil entra lineal: es lo que separa este par del anterior", () => {
    /*
     * Con kc = 1 en los dos ejes, la única diferencia contra las ecs. (6.19) y
     * (6.20) es el exponente del término de axil. Usar el cuadrado en una pieza
     * esbelta dejaría la verificación del lado inseguro, y por eso el módulo
     * despacha por esbeltez y no permite elegirlo.
     */
    const esbelta = verificarFlexionCompuesta({ ...base, sigmaC0dMPa: 6, sigmaMYdMPa: 3 });
    expect(esbelta.expresionA).toBeCloseTo(6 / 12 + 3 / 14, 9);
    const corta = verificarFlexionCompuesta({
      ...base, sigmaC0dMPa: 6, sigmaMYdMPa: 3, sinInestabilidad: true,
    });
    expect(esbelta.expresionA - corta.expresionA).toBeCloseTo(6 / 12 - (6 / 12) ** 2, 9);
  });
});

describe("vuelco con compresión, ec. (6.35)", () => {
  it("la flexión entra al cuadrado y el axil lineal", () => {
    const r = verificarFlexionCompuesta({
      ...base, sigmaC0dMPa: 3, sigmaMYdMPa: 8, kcZ: 0.5, kcrit: 0.8, verificarVuelco: true,
    });
    expect(r.aprovechamiento).toBeCloseTo((8 / (0.8 * 14)) ** 2 + 3 / (0.5 * 12), 9);
  });

  it("reproduce la hoja de flexocompresión con pandeo lateral de la planilla", () => {
    // σm,x = 11,71875 MPa y σc,0 = 0,675 MPa, con kcrit, kc,z, fm,d y fc,0,d dados.
    const r = verificarFlexionCompuesta({
      ...base,
      sigmaC0dMPa: 0.675,
      sigmaMYdMPa: 11.718749999999998,
      fmYdMPa: 15.23,
      fc0dMPa: 13.846153846153845,
      kcZ: 0.55,
      kcrit: 0.92,
      verificarVuelco: true,
    });
    expect(r.aprovechamiento).toBeCloseTo(
      (11.718749999999998 / (0.92 * 15.23)) ** 2 + 0.675 / (0.55 * 13.846153846153845), 9
    );
  });

  it("sin compresión se reduce a la comprobación de vuelco al cuadrado", () => {
    const r = verificarFlexionCompuesta({
      ...base, sigmaC0dMPa: 0, sigmaMYdMPa: 14, kcrit: 1, verificarVuelco: true,
    });
    expect(r.aprovechamiento).toBeCloseTo(1, 9);
    expect(r.verifica).toBe(true);
  });
});

describe("km", () => {
  it("con una sola flexión las dos expresiones se separan por km", () => {
    const r = verificarFlexionCompuesta({ ...base, sigmaT0dMPa: 1, sigmaMYdMPa: 7 });
    expect(r.expresionA - r.expresionB).toBeCloseTo((1 - 0.7) * (7 / 14), 9);
  });

  it("km = 1 iguala las dos expresiones", () => {
    const r = verificarFlexionCompuesta({
      ...base, sigmaT0dMPa: 1, sigmaMYdMPa: 7, sigmaMZdMPa: 3, km: 1,
    });
    expect(r.expresionA).toBeCloseTo(r.expresionB, 12);
  });
});
