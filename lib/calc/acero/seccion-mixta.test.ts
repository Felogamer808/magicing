import { describe, expect, it } from "vitest";
import { calcularSeccionMixta } from "@/lib/calc/acero/seccion-mixta";

// Caso real de la hoja "SECCIONES MIXTAS": tubo circular D=300mm t=9.5mm,
// L=3m, acero A36 (Fy=250 MPa), hormigón fc'=30 MPa, 5φ12 de armadura interior.

const materiales = {
  esKPa: 200 * 1000 * 1000,
  fyKPa: 250 * 1000,
  fcKPa: 30 * 1000,
  ecKPa: 28 * 1000 * 1000,
};
const geometria = { dMm: 300, tMm: 9.5, lM: 3, diametroBarraMm: 12, numeroBarras: 5 };
const datos = { pKN: 800, mKNm: 100, vKN: 100, yGMm: 92.5, temperaturaC: 600, longitudFuegoM: 3 };

const r = calcularSeccionMixta(materiales, geometria, datos);

describe("sección mixta: propiedades geométricas", () => {
  it("reproduce áreas e inercias", () => {
    expect(r.propiedades.asM2).toBeCloseTo(0.00867001032574444, 9);
    expect(r.propiedades.acM2).toBeCloseTo(0.0620158243800259, 9);
    expect(r.propiedades.agM2).toBeCloseTo(0.0706858347057703, 9);
    expect(r.propiedades.asrM2).toBeCloseTo(0.000565486677646163, 9);
    expect(r.propiedades.isM4).toBeCloseTo(9.15558509155065e-5, 12);
    expect(r.propiedades.icM4).toBeCloseTo(0.000306051969304452, 12);
    expect(r.propiedades.isrM4).toBeCloseTo(4.46717510740139e-6, 12);
  });

  it("verifica la armadura mínima del 0,4%", () => {
    expect(r.propiedades.asrMinM2).toBeCloseTo(0.004 * 0.0706858347057703, 9);
    expect(r.propiedades.verificaArmaduraMinima).toBe(true);
  });
});

describe("sección mixta: clasificación", () => {
  it("clasifica la sección como compacta en compresión y en flexión", () => {
    expect(r.compresion.lambdaP).toBeCloseTo(120, 6);
    expect(r.compresion.lambdaR).toBeCloseTo(152, 6);
    expect(r.compresion.clase).toBe("COMPACTA");
    expect(r.flexion.lambdaP).toBeCloseTo(72, 6);
    expect(r.flexion.lambdaR).toBeCloseTo(248, 6);
    expect(r.flexion.clase).toBe("COMPACTA");
  });

  it("clasifica como esbelta una pared mucho más delgada", () => {
    const esbelta = calcularSeccionMixta(materiales, { ...geometria, tMm: 1.5 }, datos);
    expect(esbelta.compresion.clase).toBe("ESBELTA");
  });
});

describe("sección mixta: compresión", () => {
  it("reproduce Pno, C3, EIeff, Pe, Pn y la carga admisible", () => {
    expect(r.compresion.pnoKN).toBeCloseTo(4050.07050707339, 5);
    expect(r.compresion.c3).toBeCloseTo(0.841966666666667, 9);
    expect(r.compresion.eiEffKNm2).toBeCloseTo(26419.8007843987, 4);
    expect(r.compresion.peKN).toBeCloseTo(28972.5535664006, 4);
    expect(r.compresion.pnKN).toBeCloseTo(3819.90356232787, 5);
    expect(r.compresion.pAdmKN).toBeCloseTo(1909.95178116394, 5);
    expect(r.compresion.verificaCompresion).toBe(true);
  });
});

describe("sección mixta: flexión y corte", () => {
  it("reproduce el momento plástico y el admisible", () => {
    expect(r.flexion.zM3).toBeCloseTo(0.00080197595513136, 12);
    expect(r.flexion.mpKNm).toBeCloseTo(200.49398878284, 6);
    expect(r.flexion.mAdmKNm).toBeCloseTo(200.49398878284 / 1.67, 6);
    expect(r.flexion.verificaFlexion).toBe(true);
  });

  it("reproduce la tensión crítica y la resistencia a corte", () => {
    expect(r.corte.lvM).toBeCloseTo(1.5, 9);
    expect(r.corte.fcrKPa).toBeCloseTo(1911691.96315698, 4);
    expect(r.corte.vnKN).toBeCloseTo(8287.19453010683, 5);
    expect(r.corte.vAdmKN).toBeCloseTo(4962.39193419571, 5);
    expect(r.corte.verificaCorte).toBe(true);
  });
});

describe("sección mixta: situación de incendio", () => {
  it("reproduce los módulos reducidos y la carga crítica", () => {
    expect(r.fuego.esThetaKPa).toBeCloseTo(0.31 * materiales.esKPa, 3);
    expect(r.fuego.ecThetaKPa).toBeCloseTo(0.15 * materiales.ecKPa, 3);
    expect(r.fuego.nfiCrKN).toBeCloseTo(7634.55684802569, 4);
  });
});
