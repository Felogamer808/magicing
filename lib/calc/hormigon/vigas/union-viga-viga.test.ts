import { describe, expect, it } from "vitest";
import { areaBarraMm2, calcularUnionVigaViga, type DatosUnion, type MaterialesUnion } from "./union-viga-viga";

const materiales: MaterialesUnion = { fckMPa: 25, gammaC: 1.5, fykMPa: 500, gammaS: 1.15 };

/**
 * El caso de la especificación del usuario (2026-11-25): viga de 200 × 500,
 * HA-25, B500, rugosidad baja, articulada, Nd = 0, Vd = 80 kN, 4Ø12 (2 arriba
 * y 2 abajo).
 */
const base: DatosUnion = {
  bMm: 200,
  hMm: 500,
  grupos: [
    { numero: 2, diametroMm: 12, posicion: "superior" },
    { numero: 2, diametroMm: 12, posicion: "inferior" },
  ],
  vdN: 80_000,
  ndN: 0,
  rugosidad: "baja",
  mdNmm: 0,
  zMm: 405,
  cargaDinamica: false,
};
const as4d12 = 4 * areaBarraMm2(12);

describe("unión viga-viga con esperas (EHE-08 art. 47, especificación del usuario)", () => {
  it("el caso del usuario: caso b, V_Rd ≈ 108,5 kN, cumple al 74 %", () => {
    const r = calcularUnionVigaViga(materiales, base);
    expect(r.fcdMPa).toBeCloseTo(16.667, 3);
    expect(r.fydMPa).toBe(400);
    expect(r.fctdMPa).toBeCloseTo(1.197, 3);
    expect(r.tauCMPa).toBeCloseTo(0.239, 3);
    expect(r.tauDMPa).toBeCloseTo(0.8, 9);
    expect(r.limiteCasoAMPa).toBeCloseTo(0.598, 3);
    expect(r.caso).toBe("b");
    expect(r.beta).toBe(0.2);
    expect(r.mu).toBe(0.6);
    expect(r.asEfectivaMm2).toBeCloseTo(452.4, 1);
    // V_Rd = 0,6·452,4·400 = 108 573 N.
    expect(r.vRdN).toBeCloseTo(0.6 * as4d12 * 400, 6);
    expect(r.vRdN / 1000).toBeCloseTo(108.6, 1);
    expect(r.cumple).toBe(true);
    expect(r.aprovechamiento).toBeCloseTo(0.737, 3);
    expect(r.vBielasN / 1000).toBeCloseTo(416.7, 1);
    expect(r.limitaBielas).toBe(false);
    expect(r.asMinimaMm2).toBe(100);
    expect(r.cumpleCuantiaMinima).toBe(true);
    expect(r.ashNecesariaMm2).toBe(200);
  });

  it("con τd ≤ 2,5·τc va por el caso a: cohesión + μa·As·fyd", () => {
    const r = calcularUnionVigaViga(materiales, { ...base, vdN: 50_000 });
    expect(r.caso).toBe("a");
    expect(r.mu).toBe(0.3);
    expect(r.vRdN).toBeCloseTo(r.tauCMPa * 100_000 + 0.3 * as4d12 * 400, 6);
  });

  it("con momento descuenta Md/(z·fyd) de las superiores, nunca por debajo de 0", () => {
    const r = calcularUnionVigaViga(materiales, { ...base, mdNmm: 10e6, zMm: 400 });
    // 10·10⁶ / (400·400) = 62,5 mm²
    expect(r.asFlexionMm2).toBeCloseTo(62.5, 9);
    expect(r.asSuperiorEfectivaMm2).toBeCloseTo(2 * areaBarraMm2(12) - 62.5, 9);
    expect(r.vRdN).toBeCloseTo(0.6 * (as4d12 - 62.5) * 400, 6);

    const grande = calcularUnionVigaViga(materiales, { ...base, mdNmm: 100e6, zMm: 400 });
    expect(grande.asSuperiorEfectivaMm2).toBe(0);
    expect(grande.asEfectivaMm2).toBeCloseTo(2 * areaBarraMm2(12), 9);
  });

  it("la compresión suma μ·Nd; la tracción anula τc y no aporta", () => {
    const comp = calcularUnionVigaViga(materiales, { ...base, ndN: 20_000 });
    expect(comp.vRdN).toBeCloseTo(0.6 * as4d12 * 400 + 0.6 * 20_000, 6);

    const trac = calcularUnionVigaViga(materiales, { ...base, ndN: -20_000, vdN: 10_000 });
    expect(trac.traccion).toBe(true);
    expect(trac.tauCMPa).toBe(0);
    // Con τc = 0 cualquier τd > 0 va al caso b.
    expect(trac.caso).toBe("b");
    expect(trac.vAxilN).toBe(0);
    expect(trac.vRdN).toBeCloseTo(0.6 * as4d12 * 400, 6);
  });

  it("con carga dinámica τc va al 50 %", () => {
    const r = calcularUnionVigaViga(materiales, { ...base, cargaDinamica: true });
    expect(r.tauCMPa).toBeCloseTo(calcularUnionVigaViga(materiales, base).tauCMPa / 2, 12);
  });

  it("rugosidad alta: β = 0,4 y μ = 0,9 en el caso b", () => {
    const r = calcularUnionVigaViga(materiales, { ...base, rugosidad: "alta" });
    expect(r.beta).toBe(0.4);
    // τc = 0,479; 2,5·τc = 1,197 > 0,80: ahora va por el caso a, con μ = 0,6.
    expect(r.caso).toBe("a");
    expect(r.mu).toBe(0.6);
    const b = calcularUnionVigaViga(materiales, { ...base, rugosidad: "alta", vdN: 150_000 });
    expect(b.caso).toBe("b");
    expect(b.mu).toBe(0.9);
  });

  it("sin la cuantía mínima el acero no cuenta: sólo cohesión", () => {
    const r = calcularUnionVigaViga(materiales, {
      ...base,
      ndN: 20_000,
      grupos: [{ numero: 2, diametroMm: 6, posicion: "inferior" }],
    });
    expect(r.cumpleCuantiaMinima).toBe(false);
    expect(r.vAceroN).toBe(0);
    expect(r.vAxilN).toBe(0);
    expect(r.vRdN).toBeCloseTo(r.tauCMPa * 100_000, 6);
  });

  it("el límite de bielas 0,25·fcd·Ac recorta V_Rd", () => {
    const r = calcularUnionVigaViga(materiales, {
      ...base,
      bMm: 100,
      hMm: 100,
      vdN: 30_000,
      grupos: [{ numero: 4, diametroMm: 25, posicion: "inferior" }],
    });
    expect(r.limitaBielas).toBe(true);
    expect(r.vRdN).toBeCloseTo(0.25 * (25 / 1.5) * 10_000, 6);
  });

  it("fct,d de la especificación vale sólo hasta fck = 50", () => {
    expect(() => calcularUnionVigaViga({ ...materiales, fckMPa: 55 }, base)).toThrow(RangeError);
  });
});
