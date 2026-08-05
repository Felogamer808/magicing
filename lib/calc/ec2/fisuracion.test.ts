import { describe, expect, it } from "vitest";
import { barrasPorMetro, calcularFisuracion } from "./fisuracion";
import { derivarMateriales } from "./materiales";

// Casos reales de la hoja "ELS Fisuración": fck=30, fyk=500, rg=0.02,
// k2=0.5, β=1.7, wadm=0.3 mm, Es=200 GPa.

const materiales = derivarMateriales({ fck: 30, fyk: 500 });
const parametros = { recubrimientoM: 0.02, k2: 0.5, beta: 1.7, wAdmMm: 0.3, esGPa: 200 };

describe("fisuración: zona 1 (losa de 18 cm, dos familias)", () => {
  // b=1 m, φ8 cada 15 cm y φ10 cada 20 cm, Mqp = 22 kN·m
  const r = calcularFisuracion(materiales, parametros, {
    hM: 0.18,
    bM: 1,
    n1: barrasPorMetro(1, 0.15),
    diametro1Mm: 8,
    n2: barrasPorMetro(1, 0.2),
    diametro2Mm: 10,
    mqpKNm: 22,
  });

  it("reproduce la geometría y las áreas", () => {
    expect(r.dM).toBeCloseTo(0.155, 9);
    expect(r.cMm).toBeCloseTo(25, 6);
    expect(r.sMm).toBeCloseTo(120, 6);
    expect(r.diametroMm).toBe(10);
    expect(r.acEficazM2).toBeCloseTo(0.00675, 9);
    expect(r.asM2).toBeCloseTo(0.000727802298081635, 12);
  });

  it("reproduce la separación media de fisuras y las tensiones", () => {
    expect(r.smMm).toBeCloseTo(78.6372483418861, 6);
    expect(r.sigmaSMPa).toBeCloseTo(243.774106383502, 6);
    expect(r.mFisKNm).toBeCloseTo(15.6409280306112, 6);
    expect(r.sigmaSrMPa).toBeCloseTo(173.311511530496, 6);
  });

  it("reproduce la abertura de fisura y verifica", () => {
    expect(r.epsilonSm).toBeCloseTo(0.000910830432062403, 12);
    expect(r.wkMm).toBeCloseTo(0.121762838101846, 9);
    expect(r.verifica).toBe(true);
  });
});

describe("fisuración: zona x (sección de 43 cm, una sola familia)", () => {
  // 7φ16 por metro, sin segunda familia, Mqp = 143 kN·m
  const r = calcularFisuracion(materiales, parametros, {
    hM: 0.43,
    bM: 1,
    n1: 7,
    diametro1Mm: 16,
    n2: 2,
    diametro2Mm: 0,
    mqpKNm: 143,
  });

  it("limita la separación con el diámetro de la familia que sí existe", () => {
    expect(r.sMm).toBeCloseTo(142.857142857143, 6);
    expect(r.dM).toBeCloseTo(0.402, 9);
    expect(r.cMm).toBeCloseTo(28, 6);
  });

  it("reproduce el resto del cálculo", () => {
    expect(r.acEficazM2).toBeCloseTo(0.0258, 9);
    expect(r.asM2).toBeCloseTo(0.00140743350880823, 12);
    expect(r.smMm).toBeCloseTo(99.2364197563247, 6);
    expect(r.sigmaSMPa).toBeCloseTo(315.930904380734, 6);
    expect(r.mFisKNm).toBeCloseTo(89.2594936067904, 6);
    expect(r.sigmaSrMPa).toBeCloseTo(197.201626152165, 6);
    expect(r.epsilonSm).toBeCloseTo(0.00127192519867329, 12);
    expect(r.wkMm).toBeCloseTo(0.214576214954121, 9);
    expect(r.verifica).toBe(true);
  });
});

describe("fisuración: no verifica con una abertura admisible más exigente", () => {
  it("con wadm = 0,1 mm la zona x deja de verificar", () => {
    const r = calcularFisuracion(
      materiales,
      { ...parametros, wAdmMm: 0.1 },
      { hM: 0.43, bM: 1, n1: 7, diametro1Mm: 16, n2: 2, diametro2Mm: 0, mqpKNm: 143 }
    );
    expect(r.verifica).toBe(false);
  });
});
