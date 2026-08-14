import { describe, expect, it } from "vitest";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";
import {
  calcularAnclajeMm,
  calcularArmaduraPiel,
  calcularArmaduraSecundaria,
  calcularDeformaciones,
  calcularSeparacionBarrasCm,
} from "@/lib/calc/hormigon/vigas/complementos";

// Valores de la hoja "VIGAS DE APEO", bloque "VIGA APEO CENTRO - MENSULA":
// fck=30, fyk=500, b=0.4, h=0.7, rg=0.03, d=0.656.

const materiales = derivarMateriales({ fck: 30, fyk: 500 });
const geometria = { b: 0.4, h: 0.7, recubrimiento: 0.03 };
const d = 0.656;

describe("armadura secundaria", () => {
  const r = calcularArmaduraSecundaria(materiales, geometria, d, { numero: 2, diametroMm: 16 });

  it("dimensiona el 30% del mínimo geométrico", () => {
    expect(r.asNecCm2).toBeCloseTo(2.352, 6);
    expect(r.asRealCm2).toBeCloseTo(4.02123859659494, 6);
    expect(r.verificaAs).toBe(true);
  });

  it("reproduce el momento que absorbe esa armadura", () => {
    expect(r.momentoKNm).toBeCloseTo(112.782231483465, 5);
  });
});

describe("armadura de piel", () => {
  it("reproduce el 0,05% de b·d por cara", () => {
    const r = calcularArmaduraPiel(geometria, d, 6, 8);
    expect(r.asNecCm2).toBeCloseTo(1.312, 6);
    expect(r.asRealCm2).toBeCloseTo(3.0159289474462, 6);
    expect(r.verificaAs).toBe(true);
  });

  it("suma el aporte de la torsión cuando lo hay", () => {
    const r = calcularArmaduraPiel(geometria, d, 6, 8, 1.83543019480519);
    expect(r.asNecCm2).toBeCloseTo(1.312 + 1.83543019480519, 6);
  });
});

describe("anclaje", () => {
  it("reproduce lbII de la planilla", () => {
    expect(calcularAnclajeMm(materiales, 8)).toBe(286);
    expect(calcularAnclajeMm(materiales, 20)).toBe(728);
    expect(calcularAnclajeMm(materiales, 25)).toBe(1138);
  });
});

describe("deformaciones", () => {
  const r = calcularDeformaciones(6.2, 3);

  it("reproduce la flecha total y la admisible", () => {
    expect(r.fTotalMm).toBeCloseTo(7.5, 9);
    expect(r.fAdmMm).toBeCloseTo(22.4, 9);
    expect(r.verificaFlecha).toBe(true);
  });

  it("no verifica si la flecha total supera la admisible", () => {
    expect(calcularDeformaciones(6.2, 12).verificaFlecha).toBe(false);
  });
});

describe("separación entre barras", () => {
  it("reproduce la separación de la armadura positiva (4φ16, estribo φ8)", () => {
    expect(calcularSeparacionBarrasCm(geometria, { numero: 4, diametroMm: 16 }, 8)).toBeCloseTo(
      10.2666666666667,
      6
    );
  });

  it("reproduce la separación de la armadura negativa (4φ20, estribo φ8)", () => {
    expect(calcularSeparacionBarrasCm(geometria, { numero: 4, diametroMm: 20 }, 8)).toBeCloseTo(
      10.1333333333333,
      6
    );
  });

  it("devuelve null con una sola barra", () => {
    expect(calcularSeparacionBarrasCm(geometria, { numero: 1, diametroMm: 16 }, 8)).toBeNull();
  });
});
