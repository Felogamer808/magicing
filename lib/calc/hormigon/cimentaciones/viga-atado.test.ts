import { describe, expect, it } from "vitest";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";
import { calcularVigaAtado, type DatosVigaAtado } from "./viga-atado";

/*
 * Sin planilla de referencia: los casos se contrastan a mano.
 * Viga 0,40 × 0,40, 3 Ø16 por cara, estribo Ø8, recubrimiento 0,04 m.
 * fck 25, fyk 500 → fyd = 434,78 MPa, fcd = 16,67 MPa.
 */
const materiales = derivarMateriales({ fck: 25, fyk: 500 });
const BASE: DatosVigaAtado = {
  b: 0.4, h: 0.4, recubrimiento: 0.04, luzM: 5,
  n1dKN: 1000, n2dKN: 800, porcentaje: 10, compactacion: false,
  porCara: { numero: 3, diametroMm: 16 },
  diametroEstriboMm: 8, numeroRamas: 2,
};

describe("viga de atado", () => {
  it("toma el porcentaje del pilar más cargado", () => {
    expect(calcularVigaAtado(materiales, BASE).axilAtadoKN).toBeCloseTo(100, 6);
    expect(calcularVigaAtado(materiales, { ...BASE, n1dKN: 600 }).axilAtadoKN).toBeCloseTo(80, 6);
  });

  it("sin compactación no hay flexión: cada cara toma la mitad del axil", () => {
    const r = calcularVigaAtado(materiales, BASE);
    expect(r.momentoKNm).toBe(0);
    expect(r.cortanteKN).toBe(0);
    expect(r.traccionCaraKN).toBeCloseTo(50, 6);
    // 3 Ø16 = 6,032 cm² · 434,78 MPa / 10 = 262,3 kN
    expect(r.capacidadCaraKN).toBeCloseTo(262.3, 1);
    expect(r.verificaTraccion).toBe(true);
  });

  it("con compactación suma q₁ = 10 kN/m biapoyada", () => {
    const r = calcularVigaAtado(materiales, { ...BASE, compactacion: true });
    expect(r.momentoKNm).toBeCloseTo(31.25, 6); // 10·5²/8
    expect(r.cortanteKN).toBeCloseTo(25, 6); // 10·5/2
    // d′ = 0,04 + 0,008 + 0,008 = 0,056; z = 0,40 − 2·0,056 = 0,288
    expect(r.brazoM).toBeCloseTo(0.288, 6);
    expect(r.traccionCaraKN).toBeCloseTo(50 + 31.25 / 0.288, 6);
  });

  it("a compresión usa la excentricidad mínima de 20 mm", () => {
    const r = calcularVigaAtado(materiales, BASE);
    expect(r.excentricidadMinimaM).toBeCloseTo(0.02, 6); // h/30 = 13 mm < 20 mm
    expect(r.momentoCompresionKNm).toBeCloseTo(2, 6);
    // NRd,max ≈ fcd·b·h + As·σs: tiene que superar al hormigón solo
    expect(r.nRdMaxKN).toBeGreaterThan(16.67 * 0.16 * 1000);
    expect(r.verificaCompresion).toBe(true);
  });

  it("no cumple a tracción con un axil grande", () => {
    const r = calcularVigaAtado(materiales, { ...BASE, n1dKN: 6000 });
    expect(r.traccionCaraKN).toBeCloseTo(300, 6);
    expect(r.verificaTraccion).toBe(false);
  });

  it("exige Ø12 como mínimo", () => {
    expect(calcularVigaAtado(materiales, BASE).verificaDiametro).toBe(true);
    expect(calcularVigaAtado(materiales, { ...BASE, porCara: { numero: 6, diametroMm: 10 } }).verificaDiametro).toBe(false);
  });

  it("el mínimo de cada cara es el de la ec. (9.1)", () => {
    const r = calcularVigaAtado(materiales, BASE);
    // fctm = 2,56; fctm,fl = 1,2·2,56 = 3,08; b·h·fctm,fl/(4,8·fyd) = 2,36 cm²
    expect(r.asMinCaraCm2).toBeCloseTo((0.4 * 0.4 * 1e4 * 1.2 * materiales.fctm) / (4.8 * materiales.fyd), 6);
    expect(r.verificaMinima).toBe(true);
  });

  it("informa el predimensionado de Montoya sin decidir", () => {
    const r = calcularVigaAtado(materiales, { ...BASE, luzM: 9 });
    expect(r.ladoMinimoMontoyaM).toBeCloseTo(0.45, 6);
    expect(r.cumpleLadoMontoya).toBe(false);
    // As·fyd = 12,06·434,78/10 = 524 kN ≥ 0,15·0,16·16,67·1000 = 400 kN
    expect(r.cumpleFisuracionMontoya).toBe(true);
  });
});
