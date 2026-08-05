import { describe, expect, it } from "vitest";
import { derivarMateriales } from "./materiales";
import { calcularZapataCorrida } from "./zapata-corrida";

// Casos extraídos/verificados con Excel COM sobre "CALCULOS TODO.xlsx", hoja "Zapatas",
// bloque "ZAPATA CORRIDA CON MOMENTO".

describe("zapata corrida (caso original de la planilla, Mk=0)", () => {
  const materiales = derivarMateriales({ fck: 30, fyk: 500 });
  const geometria = { A: 0.4, H: 0.3, anchoPilar: 1.4, recubrimiento: 0.04 };

  const r = calcularZapataCorrida(materiales, geometria, 1000, {
    carga: { Nk: 16, MkA: 0 },
    armadoPrincipal: { diametroMm: 12, separacionM: 0.15 },
    armadoSecundario: { numero: 4, diametroMm: 10 },
  });

  it("reproduce el peso propio y la presión geotécnica", () => {
    expect(r.geotecnico.pesoPropioKN).toBeCloseTo(3, 6);
    expect(r.geotecnico.sigmaKPa).toBeCloseTo(47.5, 6);
    expect(r.geotecnico.verificaTension).toBe(true);
    expect(r.esRigida).toBe(true);
  });

  it("reproduce el armado principal", () => {
    expect(r.principal.dM).toBeCloseTo(0.254, 6);
    expect(r.principal.tdKN).toBeCloseTo(3.12644742936545, 5);
    expect(r.principal.asMinMecanicoCm2PorM).toBeCloseTo(5.52, 3);
    expect(r.principal.asMinGeometricoCm2PorM).toBeCloseTo(2.7, 3);
    expect(r.principal.asNecCm2PorM).toBeCloseTo(5.52, 3);
    expect(r.principal.asRealCm2PorM).toBeCloseTo(7.5398223686155, 5);
    expect(r.principal.verificaAs).toBe(true);
    expect(r.principal.lbIMm).toBeCloseTo(300, 6);
    expect(r.principal.dmMm).toBeCloseTo(144, 6);
  });

  it("reproduce la armadura de reparto", () => {
    expect(r.secundario.asNecCm2).toBeCloseTo(1.08, 3);
    expect(r.secundario.asRealCm2).toBeCloseTo(3.14159265358979, 5);
    expect(r.secundario.verificaAs).toBe(true);
  });
});

describe("zapata corrida con momento (caso no degenerado)", () => {
  const materiales = derivarMateriales({ fck: 25, fyk: 500 });
  const geometria = { A: 1, H: 0.4, anchoPilar: 0.3, recubrimiento: 0.05 };

  const r = calcularZapataCorrida(materiales, geometria, 300, {
    carga: { Nk: 100, MkA: 15 },
    armadoPrincipal: { diametroMm: 16, separacionM: 0.15 },
    armadoSecundario: { numero: 4, diametroMm: 10 },
  });

  it("reproduce el peso propio y la presión por el método del área efectiva", () => {
    expect(r.geotecnico.pesoPropioKN).toBeCloseTo(10, 6);
    expect(r.geotecnico.sigmaKPa).toBeCloseTo(157.142857142857, 5);
    expect(r.geotecnico.verificaTension).toBe(true);
  });

  it("reproduce el armado principal", () => {
    expect(r.principal.sigmaMaxKPa).toBeCloseTo(285, 6);
    expect(r.principal.sigmaMinKPa).toBeCloseTo(15, 6);
    expect(r.principal.sigmaCriticaKPa).toBeCloseTo(170.25, 6);
    expect(r.principal.lM).toBeCloseTo(0.425, 6);
    expect(r.principal.dM).toBeCloseTo(0.342, 6);
    expect(r.principal.tdKN).toBeCloseTo(76.6584429824561, 2);
    expect(r.principal.asMinMecanicoCm2PorM).toBeCloseTo(6.13333333333333, 3);
    expect(r.principal.asMinGeometricoCm2PorM).toBeCloseTo(3.6, 3);
    expect(r.principal.asNecCm2PorM).toBeCloseTo(6.13333333333333, 3);
    expect(r.principal.asRealCm2PorM).toBeCloseTo(13.4041286553165, 3);
    expect(r.principal.verificaAs).toBe(true);
    expect(r.principal.lbIMm).toBeCloseTo(400, 6);
    expect(r.principal.dmMm).toBeCloseTo(192, 6);
  });

  it("reproduce la armadura de reparto (no verifica con 4φ10)", () => {
    expect(r.secundario.asNecCm2).toBeCloseTo(3.6, 3);
    expect(r.secundario.asRealCm2).toBeCloseTo(3.14159265358979, 5);
    expect(r.secundario.verificaAs).toBe(false);
  });
});
