import { describe, expect, it } from "vitest";
import { calcularTorsionTe } from "@/lib/calc/acero/torsion-te";

// La T del apoyo de losa: ala 150×10, alto 150, alma 15, luz 1,175 m.
// J = 213.125 mm⁴, Ix = 8.364.375 mm⁴, yG = 48,75 mm (a mano, ver flexion-te.test.ts).
const params = { anchoAla: 150, espesorAla: 10, alto: 150, espesorAlma: 15 };
const base = { params, fyPa: 250e6, luzM: 1.175 };

describe("torsión de la T por desbalance de la losa", () => {
  const r = calcularTorsionTe({ ...base, reaccionIzqKNm: 30, reaccionDerKNm: 10, corteKN: 20 });

  it("mt = |qi − qd|·bf/2 y T = mt·L/2 en el apoyo", () => {
    expect(r.mtKNmM).toBeCloseTo(1.5, 9);
    expect(r.tKNm).toBeCloseTo(0.88125, 9);
  });

  it("Saint-Venant: τ = T·t/J en cada chapa", () => {
    expect(r.tauTorsionAlmaMPa).toBeCloseTo(62.02, 1);
    expect(r.tauTorsionAlaMPa).toBeCloseTo(41.35, 1);
  });

  it("en el alma se suma V·Q/(Ix·tw) en el eje neutro", () => {
    // Q = 1500·43,75 + 15·38,75²/2 = 76.886,7 mm³.
    expect(r.qEjeNeutroM3 * 1e9).toBeCloseTo(76_886.7, 0);
    expect(r.tauCorteMPa).toBeCloseTo(12.26, 2);
    expect(r.tauMaxMPa).toBeCloseTo(74.28, 1);
    expect(r.gobierna).toBe("alma");
  });

  it("contra 0,6·Fy/1,67 y giro informativo", () => {
    expect(r.tauAdmMPa).toBeCloseTo(89.82, 2);
    expect(r.verifica).toBe(true);
    expect(r.giroGrados).toBeCloseTo(0.901, 2);
  });

  it("cargas iguales: sin torsión, queda sólo el corte", () => {
    const igual = calcularTorsionTe({ ...base, reaccionIzqKNm: 20, reaccionDerKNm: 20, corteKN: 20 });
    expect(igual.tKNm).toBe(0);
    expect(igual.tauMaxMPa).toBeCloseTo(igual.tauCorteMPa, 9);
    expect(igual.giroGrados).toBe(0);
  });
});
