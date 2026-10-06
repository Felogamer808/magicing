import { describe, expect, it } from "vitest";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";
import { calcularFlexion } from "@/lib/calc/hormigon/vigas/flexion-cortante";
import { calcularZapataCombinada } from "@/lib/calc/hormigon/cimentaciones/zapata-combinada";

// Sin planilla de referencia. El caso simétrico se contrasta con la viga de dos
// apoyos y voladizos bajo carga uniforme, con el signo invertido porque la
// "carga" es el terreno, hacia arriba, y los "apoyos" son los pilares.

const materiales = derivarMateriales({ fck: 25, fyk: 500 });

describe("zapata combinada simétrica, a mano", () => {
  const pilar = { Nk: 200, anchoLargoM: 0.4, anchoAnchoM: 0.4 };
  const r = calcularZapataCombinada(materiales, { L: 6, B: 1, H: 0.6, recubrimiento: 0.05 }, 300, {
    pilares: [{ ...pilar, posicionM: 1 }, { ...pilar, posicionM: 5 }],
    inferior: { numero: 6, diametroMm: 16 },
    superior: { numero: 6, diametroMm: 12 },
    transversal: { diametroMm: 12, separacionM: 0.2 },
  });

  it("terreno: sin excentricidad y presión (N + PP)/área", () => {
    expect(r.geotecnico.excentricidadLM).toBeCloseTo(0, 9);
    expect(r.geotecnico.pesoPropioKN).toBeCloseTo(90, 9);
    expect(r.geotecnico.sigmaKPa).toBeCloseTo(490 / 6, 9);
    expect(r.geotecnico.verificaTension).toBe(true);
  });

  it("bajo el pilar M+ = w·1²/2 y entre pilares M− = w·3²/2 − 300·2, con w = 100 kN/m", () => {
    expect(r.inferior.mEdKNm).toBeCloseTo(50, 1);
    expect(r.inferior.xM).toBeCloseTo(1, 2);
    expect(r.superior.mEdKNm).toBeCloseTo(150, 1);
    expect(r.superior.xM).toBeCloseTo(3, 2);
    expect(r.superior.necesaria).toBe(true);
  });

  it("cada cara se arma con el motor de flexión de vigas", () => {
    const esperado = calcularFlexion(materiales, { b: 1, h: 0.6, recubrimiento: 0.05, diametroEstriboMm: 0 }, 0.544, {
      momento: r.superior.mEdKNm,
      armaduraReal: [{ numero: 6, diametroMm: 12 }],
    });
    expect(r.superior.flexion.asNecCm2).toBeCloseTo(esperado.asNecCm2, 9);
  });

  it("cortante a d de la cara interior, con el d de la cara traccionada (arriba)", () => {
    // Simétrico: cualquiera de los dos pilares, a 1,744 de su borde.
    expect(Math.min(r.cortante.xM, 6 - r.cortante.xM)).toBeCloseTo(1.2 + 0.544, 3);
    expect(r.cortante.vEdKN).toBeCloseTo(Math.abs(100 * 1.744 - 300), 1);
  });

  it("transversal por metro: vuelo 0,3 + 0,15·0,4 con la carga por metro N/L", () => {
    const q = 400 / 6;
    expect(r.transversal.cargaPorMetroKN).toBeCloseTo(q, 9);
    expect(r.transversal.gobernante.momentoKNm).toBeCloseTo((1.5 * q * 0.36 ** 2) / 2, 6);
  });

  it("punzonamiento de los dos pilares con un número", () => {
    for (const p of r.punzonamiento) expect(Number.isFinite(p.vEdKN)).toBe(true);
  });
});

describe("zapata combinada de medianera (caso Z.5: 0,80 × 3,10 × 0,30)", () => {
  const geometria = { L: 3.1, B: 0.8, H: 0.3, recubrimiento: 0.04, distanciaBordeB: 0 };
  const datos = {
    pilares: [
      { posicionM: 0.3, Nk: 65, anchoLargoM: 0.6, anchoAnchoM: 0.15 },
      { posicionM: 2.8, Nk: 76, anchoLargoM: 0.6, anchoAnchoM: 0.15 },
    ] as const,
    inferior: { numero: 6, diametroMm: 10 },
    superior: { numero: 6, diametroMm: 10 },
    transversal: { diametroMm: 10, separacionM: 0.15 },
  };
  const sin = calcularZapataCombinada(materiales, geometria, 150, datos);
  const con = calcularZapataCombinada(materiales, geometria, 150, { ...datos, tirante: { brazoM: 3, phiGrados: 30 } });

  it("sin tirante, N·e a lo ancho saca la resultante del núcleo", () => {
    const pp = 25 * 3.1 * 0.8 * 0.3;
    expect(sin.geotecnico.excentricidadBM).toBeCloseTo((141 * (0.075 - 0.4)) / (141 + pp), 9);
    expect(sin.geotecnico.dentroDelNucleo).toBe(false);
  });

  it("con tirante queda centrada a lo ancho y cada pilar tiene su tirante N·e/h", () => {
    expect(con.geotecnico.excentricidadBM).toBe(0);
    expect(con.tirante?.porPilar[0].tkKN).toBeCloseTo((65 * 0.325) / 3, 9);
    expect(con.tirante?.porPilar[1].tkKN).toBeCloseTo((76 * 0.325) / 3, 9);
    expect(con.tirante?.global.tkKN).toBeCloseTo((141 * 0.325) / 3, 9);
  });

  it("entre los pilares tracciona arriba: hace falta armadura superior", () => {
    expect(con.superior.necesaria).toBe(true);
    expect(con.superior.xM).toBeGreaterThan(0.6);
    expect(con.superior.xM).toBeLessThan(2.5);
  });

  it("los pilares contra la medianera punzonan como pilar de borde", () => {
    for (const p of con.punzonamiento) expect(p.situacion).not.toBe("interior");
  });
});
