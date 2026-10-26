import { describe, expect, it } from "vitest";
import { calcularCapitel, perimetroCircular, type GeometriaCapitel } from "./capitel";
import { calcularPunzonamiento } from "./punzonamiento";

// Losa de 0,20 con negativos Ø12 c/15 en las dos direcciones: dy = 0,169 y
// dz = 0,157 m, d = 0,163 m (como resuelve la página de punzonamiento).
const longitudinal = { diametroYMm: 12, separacionYM: 0.15, diametroZMm: 12, separacionZM: 0.15 };
const base: GeometriaCapitel = {
  posicion: "interior", forma: "rectangular",
  dYM: 0.169, dZM: 0.157,
  c1M: 0.4, c2M: 0.4, distBordeC1M: 0, distBordeC2M: 0,
  lH1M: 0.3, lH2M: 0.3, hHM: 0.3,
};
const datos = { vEdKN: 600, betaManual: null };
const d = 0.163;

describe("capitel chico (l_H ≤ 2·h_H): una sola sección, en la losa", () => {
  /** l1 = l2 = 0,4 + 2·0,3 = 1,0. (6.34): 2d + 0,56 = 0,886; (6.35): 2d + 0,69 = 1,016. */
  it("rectangular interior: r_cont es el menor de las ecs. (6.34) y (6.35)", () => {
    const r = calcularCapitel(30, base, longitudinal, datos);
    expect(r.tipo).toBe("chico");
    expect(r.secciones).toHaveLength(1);
    const s = r.secciones[0];
    expect(s.ecuacion).toBe("(6.34)");
    expect(s.rContM).toBeCloseTo(2 * d + 0.56, 9);
    expect(s.uM).toBeCloseTo(2 * Math.PI * (2 * d + 0.56), 3);
    expect(s.dM).toBeCloseTo(d, 9);
  });

  /** (6.33): r_cont = 2d + l_H + 0,5c = 0,326 + 0,3 + 0,2. */
  it("circular interior: ec. (6.33)", () => {
    const r = calcularCapitel(30, { ...base, forma: "circular" }, longitudinal, datos);
    expect(r.secciones[0].rContM).toBeCloseTo(2 * d + 0.3 + 0.2, 9);
    expect(r.secciones[0].uM).toBeCloseTo(2 * Math.PI * (2 * d + 0.5), 3);
  });

  /** Pilar a ras del borde: el centro queda a 0,2 del borde y el círculo pierde 2·acos(a/r). */
  it("circular de borde: el círculo se recorta contra el borde libre", () => {
    const r = calcularCapitel(30, { ...base, forma: "circular", posicion: "borde" }, longitudinal, datos);
    const rc = 2 * d + 0.5;
    expect(r.secciones[0].uM).toBeCloseTo(rc * (2 * Math.PI - 2 * Math.acos(0.2 / rc)), 3);
  });
});

describe("capitel grande (l_H > 2·h_H): losa y capitel", () => {
  const grande = { ...base, lH1M: 0.8, lH2M: 0.8 };

  /** Capitel de 2,0 × 2,0: u = 4·2,0 + 2π·2d. Dentro: d_H = 0,463, u = 4·0,4 + 2π·2·d_H. */
  it("rectangular interior: a 2d del capitel y a 2·d_H del pilar", () => {
    const r = calcularCapitel(30, grande, longitudinal, datos);
    expect(r.tipo).toBe("grande");
    expect(r.dHM).toBeCloseTo(d + 0.3, 9);
    const [losa, capitel] = r.secciones;
    expect(losa.uM).toBeCloseTo(8 + 2 * Math.PI * 2 * d, 9);
    expect(capitel.uM).toBeCloseTo(1.6 + 2 * Math.PI * 2 * (d + 0.3), 9);
    expect(capitel.dM).toBeCloseTo(d + 0.3, 9);
  });

  /** (6.36): l_H + 2d + 0,5c. (6.37): 2(d + h_H) + 0,5c. */
  it("circular interior: ecs. (6.36) y (6.37)", () => {
    const r = calcularCapitel(30, { ...grande, forma: "circular" }, longitudinal, datos);
    expect(r.secciones[0].rContM).toBeCloseTo(0.8 + 2 * d + 0.2, 9);
    expect(r.secciones[1].rContM).toBeCloseTo(2 * (d + 0.3) + 0.2, 9);
  });

  it("con más canto en el capitel, la cuantía de la misma armadura baja", () => {
    const r = calcularCapitel(30, grande, longitudinal, datos);
    expect(r.secciones[1].rhoL).toBeLessThan(r.secciones[0].rhoL);
  });
});

describe("cara del pilar y casos límite", () => {
  /** u0 = 2(c1 + c2) = 1,6 m con d_H = 0,463: vEd = 1,15·600/(1,6·0,463)/1000. */
  it("la biela en u0 usa el canto del capitel", () => {
    const r = calcularCapitel(30, base, longitudinal, datos);
    expect(r.caraPilar.u0M).toBeCloseTo(1.6, 9);
    expect(r.caraPilar.vEdMPa).toBeCloseTo((1.15 * 600) / (1.6 * (d + 0.3)) / 1000, 9);
  });

  it("sin capitel (h_H = 0, l_H > 0) la sección del capitel es el punzonamiento común", () => {
    const sin = calcularCapitel(30, { ...base, lH1M: 0.5, lH2M: 0.5, hHM: 0 }, longitudinal, datos);
    const p = calcularPunzonamiento(
      { fckMPa: 30, fykMPa: 500 },
      { posicion: "interior", dYM: 0.169, dZM: 0.157, c1M: 0.4, c2M: 0.4, distBordeC1M: 0, distBordeC2M: 0 },
      longitudinal,
      datos,
      { diametroMm: 8, ramasPorPerimetro: 12, srM: 0.12, stM: 0.2, numeroPerimetros: 3, distPrimerPerimetroM: 0.08, alphaGrados: 90 }
    );
    const capitel = sin.secciones[1];
    expect(capitel.uM).toBeCloseTo(p.critico.u1M, 9);
    expect(capitel.vRdCMPa).toBeCloseTo(p.critico.vRdCMPa, 9);
  });

  it("el círculo entero sin bordes mide 2πr", () => {
    expect(perimetroCircular(5, 5, 1, true, true).longitudM).toBeCloseTo(2 * Math.PI, 3);
  });
});
