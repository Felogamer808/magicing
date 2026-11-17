import { describe, expect, it } from "vitest";
import { calcularSoldaduraTe } from "@/lib/calc/acero/soldadura-te";

// La T del apoyo de losa: ala 150×10, alto 150, alma 15. Cordón de 6 mm, E60.
// Ix = 8.364.375 mm⁴ e yG = 48,75 mm, calculados a mano en flexion-te.test.ts.
const params = { anchoAla: 150, espesorAla: 10, alto: 150, espesorAlma: 15 };
const base = { params, ladoMm: 6, electrodo: "E60" as const };

describe("soldadura alma–ala de la T", () => {
  it("sólo rasante: V·Q/Ix repartido entre los dos cordones", () => {
    const r = calcularSoldaduraTe({ ...base, reaccionIzqKNm: 0, reaccionDerKNm: 0, corteKN: 20 });
    // Q del ala = 150·10·(48,75 − 5) = 65.625 mm³.
    expect(r.qAlaM3 * 1e9).toBeCloseTo(65_625, 3);
    expect(r.rasanteKNm).toBeCloseTo((20 * 65_625) / 8_364_375 * 1000, 6);
    expect(r.tauParaleloKPa).toBeCloseTo(r.rasanteKNm / 2 / (6 / Math.SQRT2 / 1000), 3);
    expect(r.tauNormalKPa).toBe(0);
  });

  it("cargas iguales: sólo cuelgue, el momento se anula", () => {
    const r = calcularSoldaduraTe({ ...base, reaccionIzqKNm: 20, reaccionDerKNm: 20, corteKN: 0 });
    expect(r.momentoDesbalanceadoKNmM).toBe(0);
    expect(r.normalKNm).toBeCloseTo(20, 9);
    expect(r.tauKPa).toBeCloseTo(20 / (6 / Math.SQRT2 / 1000), 3);
  });

  it("cargas distintas: el par se suma al cuelgue en el cordón más cargado", () => {
    const r = calcularSoldaduraTe({ ...base, reaccionIzqKNm: 30, reaccionDerKNm: 10, corteKN: 0 });
    const g = 6 / Math.SQRT2 / 1000;
    expect(r.momentoDesbalanceadoKNmM).toBeCloseTo(20 * 0.075, 9);
    expect(r.brazoM).toBeCloseTo(0.015 + g, 9);
    expect(r.normalKNm).toBeCloseTo(20 + 1.5 / (0.015 + g), 6);
  });

  it("suma vectorial contra 0,6·Fnw/2 y lado mínimo por el menor espesor", () => {
    const r = calcularSoldaduraTe({ ...base, reaccionIzqKNm: 20, reaccionDerKNm: 20, corteKN: 20 });
    expect(r.tauKPa).toBeCloseTo(Math.hypot(r.tauNormalKPa, r.tauParaleloKPa), 6);
    expect(r.tauAdmKPa).toBeCloseTo(126_600, 6);
    expect(r.verifica).toBe(r.tauKPa <= 126_600);
    // Menor espesor 10 mm → 5 mm (tabla J2.4).
    expect(r.ladoMinimoMm).toBe(5);
    expect(r.ladoEnRango).toBe(true);
    expect(calcularSoldaduraTe({ ...base, ladoMm: 4, reaccionIzqKNm: 0, reaccionDerKNm: 0, corteKN: 0 }).ladoEnRango).toBe(false);
  });
});
