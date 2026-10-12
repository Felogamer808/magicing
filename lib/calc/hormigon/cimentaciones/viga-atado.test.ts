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
  // Sin asiento salvo en sus propios tests, para aislar el resto.
  asientoM: 0, distanciaEjesM: 5.4, tipoEstructura: "reticulada",
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

  // Ecm = 22·(3,3)^0,3 = 31,476 GPa; I = 0,4⁴/12; EI = 67 148 kN·m².
  // δ = 5,4/500 = 10,8 mm; M = 1,35·6·EI·δ/5² = 235,0 kN·m; V = 1,35·12·EI·δ/5³ = 94,0 kN.
  it("sin asiento cargado usa la distorsión de la tabla 2.2, empotrada en las dos zapatas", () => {
    const r = calcularVigaAtado(materiales, { ...BASE, asientoM: null });
    expect(r.asientoDeTabla).toBe(true);
    expect(r.asientoM).toBeCloseTo(0.0108, 9);
    expect(r.rigidezKNm2).toBeCloseTo(67148.39, 1);
    expect(r.momentoAsientoKNm).toBeCloseTo(234.966, 2);
    expect(r.cortanteAsientoKN).toBeCloseTo(93.986, 2);
    expect(r.seccionDeterminante).toBe("extremo");
    expect(r.traccionCaraKN).toBeCloseTo(50 + 234.966 / 0.288, 1);
    expect(r.verificaTraccion).toBe(false);
  });

  it("con asiento cargado y compactación: manda la sección de más momento y los cortantes se suman", () => {
    const r = calcularVigaAtado(materiales, { ...BASE, asientoM: 0.0005, compactacion: true });
    expect(r.asientoDeTabla).toBe(false);
    // M asiento = 1,35·6·EI·0,0005/25 = 10,88 < 31,25 de q₁: manda el vano.
    expect(r.momentoAsientoKNm).toBeCloseTo(10.878, 2);
    expect(r.seccionDeterminante).toBe("vano");
    expect(r.momentoDisenoKNm).toBeCloseTo(31.25, 6);
    expect(r.cortanteKN).toBeCloseTo(25 + (1.35 * 12 * r.rigidezKNm2 * 0.0005) / 125, 6);
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
