import { describe, expect, it } from "vitest";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";
import { calcularVigaCentradora, type GeometriaVigaCentradora } from "@/lib/calc/hormigon/cimentaciones/viga-centradora";
import { calcularZapataAislada } from "@/lib/calc/hormigon/cimentaciones/zapata-aislada";

// Sin planilla de referencia: la palanca se resuelve a mano en cada test.

const materiales = derivarMateriales({ fck: 25, fyk: 500 });
const geometria: GeometriaVigaCentradora = {
  A: 1.5,
  B: 2,
  H: 0.5,
  recubrimiento: 0.05,
  distanciaColumnaLimite: 0,
  anchoPilarA: 0.3,
  anchoPilarB: 0.3,
  luzM: 4,
  bViga: 0.4,
  hViga: 0.7,
};
const datos = {
  Nk: 500,
  MkA: 0,
  MkB: 0,
  armadoB: { numero: 10, diametroMm: 16 },
  armadoA: { numero: 8, diametroMm: 12 },
  // Md = 452 kN·m sobre 0,40 × 0,70 pide 18,2 cm²: 6Ø20 = 18,85.
  vigaSuperior: { numero: 6, diametroMm: 20 },
  diametroEstriboMm: 10,
  numeroRamas: 2,
};

describe("viga centradora — palanca", () => {
  const r = calcularVigaCentradora(materiales, geometria, 250, datos);
  // e = A/2 − c/2 = 0,75 − 0,15 = 0,60 m; q = 25·0,4·0,7 = 7 kN/m; L − e = 3,4 m.
  const e = 0.6;
  const q = 7;
  const r1 = (500 * 4 + (q * 4 ** 2) / 2) / (4 - e);

  it("R₁ = (N·L + M + q·L²/2)/(L − e) y ΔN = R₁ − N − q·L", () => {
    expect(r.excentricidadM).toBeCloseTo(e, 9);
    expect(r.pesoVigaKNPorM).toBeCloseTo(q, 9);
    expect(r.reaccionZapataKN).toBeCloseTo(r1, 6); // 604,7 kN
    expect(r.descargaInteriorKN).toBeCloseTo(r1 - 500 - q * 4, 6); // 76,7 kN
    expect(r.geometriaValida).toBe(true);
  });

  it("la zapata queda con presión centrada en A", () => {
    const pp = 25 * 1.5 * 2 * 0.5;
    expect(r.sigmaKPa).toBeCloseTo((r1 + pp) / (1.5 * 2), 6); // 214 kPa
    expect(r.verificaTension).toBe(true);
  });

  it("la viga se arma para N·e en el centro de la zapata, mayorado", () => {
    expect(r.momentoVigaKNm).toBeCloseTo(1.5 * (500 * e + (q * e ** 2) / 2), 6);
    expect(r.cortanteVigaKN).toBeCloseTo(1.5 * (r1 - 500 - q * e), 6);
    expect(r.vigaFlexion.verificaAs).toBe(true);
  });

  it("reparto en la dirección de la viga: 20 % de la principal por metro", () => {
    const areaB = (10 * Math.PI * 1.6 ** 2) / 4;
    const areaA = (8 * Math.PI * 1.2 ** 2) / 4;
    expect(r.asRepartoNecCm2PorM).toBeCloseTo((0.2 * areaB) / 1.5, 9);
    expect(r.asRepartoRealCm2PorM).toBeCloseTo(areaA / 2, 9);
    expect(r.verificaReparto).toBe(true);
  });

  it("los vuelos a los lados de la viga se arman como zapata, con la viga de pilar", () => {
    // Sección de cálculo a 0,15·bViga dentro de la cara de la viga.
    expect(r.zapataDireccionB.lM).toBeCloseTo((2 - 0.4) / 2 + 0.15 * 0.4, 9);
  });
});

describe("viga centradora — el problema que resuelve", () => {
  it("la misma zapata sin viga no verifica; con viga sí", () => {
    const sinViga = calcularZapataAislada(materiales, { ...geometria, distanciaBordeA: geometria.distanciaColumnaLimite }, 250, {
      cargas: { Nk: 500, MkA: 0, MkB: 0 },
      armadoA: datos.armadoA,
      armadoB: datos.armadoB,
    });
    const conViga = calcularVigaCentradora(materiales, geometria, 250, datos);
    expect(sinViga.geotecnico.verificaTension).toBe(false);
    expect(conViga.verificaTension).toBe(true);
  });

  it("un momento hacia la medianera carga más la palanca; uno hacia adentro la descarga", () => {
    const hacia = calcularVigaCentradora(materiales, geometria, 250, { ...datos, MkA: 50 });
    const desde = calcularVigaCentradora(materiales, geometria, 250, { ...datos, MkA: -50 });
    const base = calcularVigaCentradora(materiales, geometria, 250, datos);
    expect(hacia.reaccionZapataKN - base.reaccionZapataKN).toBeCloseTo(50 / 3.4, 6);
    expect(desde.reaccionZapataKN).toBeLessThan(base.reaccionZapataKN);
  });

  it("si la luz no supera la excentricidad no hay palanca", () => {
    const r = calcularVigaCentradora(materiales, { ...geometria, luzM: 0.5 }, 250, datos);
    expect(r.geometriaValida).toBe(false);
    expect(r.verificaTension).toBe(false);
  });
});
