import { describe, expect, it } from "vitest";
import { calcularLosa, calcularMomentoResistenteLosa } from "./losa";
import { derivarMateriales } from "./materiales";

// Caso real de la hoja "LOSAS" de CALCULOS TODO.xlsx:
// fck=30, fyk=500, e=0.15, rg positivos = rg negativos = 0.02,
// Mx+ = 50, My+ = 30, Mx- = 40, My- = 20 (kN·m/m).

const materiales = derivarMateriales({ fck: 30, fyk: 500 });
const geometria = { e: 0.15, recubrimientoPositivo: 0.02, recubrimientoNegativo: 0.02 };

const datos = {
  momentoPositivoX: 50,
  momentoPositivoY: 30,
  momentoNegativoX: 40,
  momentoNegativoY: 20,
  armadoPositivoX: { diametroMm: 12, separacionM: 0.1 },
  armadoPositivoY: { diametroMm: 10, separacionM: 0.15 },
  armadoNegativoX: { diametroMm: 12, separacionM: 0.15 },
  armadoNegativoY: { diametroMm: 10, separacionM: 0.15 },
};

describe("losa: cuantías mínimas", () => {
  const r = calcularLosa(materiales, geometria, datos);

  it("reproduce As mecánica y geométrica mínimas", () => {
    expect(r.asMinMecanicoCm2PorM).toBeCloseTo(2.76, 6);
    expect(r.asMinGeometricoCm2PorM).toBeCloseTo(2.7, 6);
  });
});

describe("losa: armado positivo", () => {
  const r = calcularLosa(materiales, geometria, datos);

  it("reproduce los cantos útiles, con X apoyada sobre Y", () => {
    // dy = e - rg - φy/2 = 0.15 - 0.02 - 0.005
    expect(r.positivo.y.dM).toBeCloseTo(0.125, 9);
    // dx = e - rg - φy - φx/2 = 0.15 - 0.02 - 0.010 - 0.006
    expect(r.positivo.x.dM).toBeCloseTo(0.114, 9);
  });

  it("reproduce el armado en X (que suma la malla de Y)", () => {
    expect(r.positivo.x.asNecCm2PorM).toBeCloseTo(11.306636412761, 6);
    expect(r.positivo.x.separacionNecM).toBeCloseTo(0.100027392232749, 9);
    expect(r.positivo.x.separacionMaxM).toBeCloseTo(0.1, 9);
    // As real X = φ12/10cm (11.31) + malla Y φ10/15cm (5.24)
    expect(r.positivo.x.asRealCm2PorM).toBeCloseTo(16.5457213089062, 6);
    expect(r.positivo.x.verificaAs).toBe(true);
    expect(r.positivo.x.lbNetaMm).toBeCloseTo(205.00713510764, 5);
  });

  it("reproduce el armado en Y, que con φ10/15cm no llega", () => {
    expect(r.positivo.y.asNecCm2PorM).toBeCloseTo(5.81394, 4);
    expect(r.positivo.y.asRealCm2PorM).toBeCloseTo(5.23598775598299, 6);
    expect(r.positivo.y.verificaAs).toBe(false);
    expect(r.positivo.y.lbNetaMm).toBeCloseTo(277.594631910421, 5);
  });

  it("sin la convención de malla general, X no suma la armadura de Y", () => {
    const sinMalla = calcularLosa(materiales, geometria, { ...datos, xIncluyeMallaEnY: false });
    expect(sinMalla.positivo.x.asRealCm2PorM).toBeCloseTo(16.5457213089062 - 5.23598775598299, 6);
  });
});

describe("losa: armado negativo", () => {
  const r = calcularLosa(materiales, geometria, datos);

  it("reproduce As necesaria y real en X", () => {
    expect(r.negativo.x.asNecCm2PorM).toBeCloseTo(8.81026701892389, 6);
    expect(r.negativo.x.asRealCm2PorM).toBeCloseTo(7.5398223686155, 6);
    expect(r.negativo.x.verificaAs).toBe(false);
    expect(r.negativo.x.lbNetaMm).toBeCloseTo(350.549386505309, 5);
  });

  it("redondea la separación máxima a múltiplos de 2 cm", () => {
    expect(r.negativo.x.separacionMaxM).toBeCloseTo(0.12, 9);
    expect(r.negativo.y.separacionMaxM).toBeCloseTo(0.2, 9);
  });
});

describe("losa: momento resistente de un armado dado", () => {
  it("reproduce el bloque de momento resistente (φ12/15cm)", () => {
    const r = calcularMomentoResistenteLosa(materiales, 0.15, 0.02, {
      diametroMm: 12,
      separacionM: 0.15,
    });
    expect(r.asRealCm2PorM).toBeCloseTo(7.5398223686155, 6);
    expect(r.dM).toBeCloseTo(0.124, 9);
    expect(r.momentoKNmPorM).toBeCloseTo(37.9628551257742, 5);
  });
});
