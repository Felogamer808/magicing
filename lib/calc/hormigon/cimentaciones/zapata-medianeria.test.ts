import { describe, expect, it } from "vitest";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";
import { calcularZapataMedianeria } from "@/lib/calc/hormigon/cimentaciones/zapata-medianeria";

// No hay planilla de referencia para este tipo (no existe en el Excel original).
// Los valores están derivados a mano de las fórmulas de la norma; se comparan con
// tolerancia amplia y se acompañan de chequeos de sanidad/monotonía.

describe("zapata de medianería — pilar muy cerca del límite (fuera del núcleo)", () => {
  const materiales = derivarMateriales({ fck: 25, fyk: 500 });
  const geometria = {
    A: 1.5,
    B: 1.2,
    H: 0.5,
    anchoPilarA: 0.4,
    anchoPilarB: 0.4,
    recubrimiento: 0.05,
    distanciaColumnaLimite: 0.05,
  };

  const r = calcularZapataMedianeria(materiales, geometria, 1000, {
    cargas: { Nk: 300, MkA: 0, MkB: 0 },
    armadoA: { numero: 8, diametroMm: 16 },
    armadoB: { numero: 6, diametroMm: 12 },
  });

  it("detecta que la excentricidad supera el núcleo central (A/6) y avisa", () => {
    expect(r.excentricidadM).toBeCloseTo(-0.5, 6);
    expect(r.dentroDelNucleo).toBe(false);
    expect(r.geotecnico.verificaTension).toBe(false);
  });

  it("reproduce el peso propio", () => {
    expect(r.geotecnico.pesoPropioKN).toBeCloseTo(22.5, 6);
  });
});

describe("zapata de medianería — dentro del núcleo, con vuelo distinto a cada lado", () => {
  const materiales = derivarMateriales({ fck: 25, fyk: 500 });
  const geometria = {
    A: 2.5,
    B: 1.2,
    H: 0.5,
    anchoPilarA: 0.4,
    anchoPilarB: 0.4,
    recubrimiento: 0.05,
    distanciaColumnaLimite: 0.7,
  };

  const r = calcularZapataMedianeria(materiales, geometria, 1000, {
    cargas: { Nk: 300, MkA: 0, MkB: 0 },
    armadoA: { numero: 8, diametroMm: 16 },
    armadoB: { numero: 6, diametroMm: 12 },
  });

  it("queda dentro del núcleo y no hay tracciones en el suelo", () => {
    expect(r.excentricidadM).toBeCloseTo(-0.35, 6);
    expect(r.dentroDelNucleo).toBe(true);
    expect(r.geotecnico.pesoPropioKN).toBeCloseTo(37.5, 6);
    expect(r.geotecnico.sigmaKPa).toBeCloseTo(156.25, 1);
    expect(r.geotecnico.verificaTension).toBe(true);
  });

  it("el lado del límite tiene más presión pero menos vuelo que el lado interior", () => {
    expect(r.ladoLimite.sigmaMaxKPa).toBeCloseTo(276, 0);
    expect(r.ladoInterior.sigmaMaxKPa).toBeCloseTo(24, 0);
    expect(r.ladoLimite.lM).toBeCloseTo(0.8, 6);
    expect(r.ladoInterior.lM).toBeCloseTo(1.5, 6);
  });

  it("reproduce la tracción de cálculo y el As necesario en ambos lados", () => {
    expect(r.ladoLimite.tdKN).toBeCloseTo(255, 0);
    expect(r.ladoInterior.tdKN).toBeCloseTo(267, 0);
    // En este caso domina el mínimo mecánico en los dos lados.
    expect(r.ladoLimite.asNecCm2).toBeCloseTo(9.2, 1);
    expect(r.ladoInterior.asNecCm2).toBeCloseTo(9.2, 1);
    expect(r.ladoLimite.verificaAs).toBe(true);
    expect(r.ladoInterior.verificaAs).toBe(true);
  });

  it("reproduce el cortante en ambos lados", () => {
    expect(r.ladoLimite.vEdKN).toBeCloseTo(81, 0);
    expect(r.ladoLimite.vRdCKN).toBeCloseTo(209, 0);
    expect(r.ladoLimite.verificaCorte).toBe(true);

    expect(r.ladoInterior.vEdKN).toBeCloseTo(83, 0);
    expect(r.ladoInterior.vRdCKN).toBeCloseTo(209, 0);
    expect(r.ladoInterior.verificaCorte).toBe(true);
  });

  it("clasifica la zapata como flexible (el vuelo interior supera 2H)", () => {
    expect(r.vueloMaxM).toBeCloseTo(1.5, 6);
    expect(r.esRigida).toBe(false);
  });
});

describe("zapata de medianería — sanidad: a mayor excentricidad, mayor diferencia de presiones", () => {
  const materiales = derivarMateriales({ fck: 25, fyk: 500 });
  const base = { A: 2.5, B: 1.2, H: 0.5, anchoPilarA: 0.4, anchoPilarB: 0.4, recubrimiento: 0.05 };
  const datos = {
    cargas: { Nk: 300, MkA: 0, MkB: 0 },
    armadoA: { numero: 8, diametroMm: 16 },
    armadoB: { numero: 6, diametroMm: 12 },
  };

  it("un pilar más cerca del límite aumenta la presión en ese borde", () => {
    const lejos = calcularZapataMedianeria(materiales, { ...base, distanciaColumnaLimite: 0.9 }, 1000, datos);
    const cerca = calcularZapataMedianeria(materiales, { ...base, distanciaColumnaLimite: 0.6 }, 1000, datos);
    expect(cerca.ladoLimite.sigmaMaxKPa).toBeGreaterThan(lejos.ladoLimite.sigmaMaxKPa);
    expect(Math.abs(cerca.excentricidadM)).toBeGreaterThan(Math.abs(lejos.excentricidadM));
  });
});
