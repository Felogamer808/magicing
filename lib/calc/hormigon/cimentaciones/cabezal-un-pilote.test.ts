import { describe, expect, it } from "vitest";
import { calcularCabezalUnPilote } from "@/lib/calc/hormigon/cimentaciones/cabezal-un-pilote";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";

// No hay planilla de cabezal de un pilote: los casos se comprueban contra las
// ecuaciones del Anejo 19 resueltas a mano (6.58, 6.59 y 6.63).
// fck = 25 → fcd = 16,667 MPa; fyk = 500 → fyd = 434,78 MPa.

const materiales = derivarMateriales({ fck: 25, fyk: 500 });
const fcd = 25 / 1.5;
const fyd = 500 / 1.15;

const cercos = {
  cercosSuperiores: { numero: 3, diametroMm: 10 },
  cercosInferiores: { numero: 3, diametroMm: 12 },
};

// CT9-1 del REV08: pilar 0,30 × 0,30, cabezal 0,90 × 0,90 × 0,80, pilote 0,60, Nd 690.
const bajo = calcularCabezalUnPilote(
  materiales,
  { pilarXM: 0.3, pilarYM: 0.3, ladoXM: 0.9, ladoYM: 0.9, hM: 0.8, diametroPiloteM: 0.6 },
  { ndPilarKN: 690, ...cercos }
);

describe("cabezal de un pilote: cargas", () => {
  it("suma al pilote el peso propio mayorado", () => {
    expect(bajo.pesoPropioKN).toBeCloseTo(0.9 * 0.9 * 0.8 * 25, 9);
    expect(bajo.ndPiloteKN).toBeCloseTo(690 + 1.35 * 16.2, 9);
  });
});

describe("cabezal de un pilote: compresión localizada (ec. 6.63)", () => {
  it("bajo el pilar, A_c1 llega al triple del lado", () => {
    const c = bajo.compresionPilar;
    expect(c.factorK).toBe(3);
    expect(c.limitaPor).toBe("triple");
    expect(c.areaDistribucionM2).toBeCloseTo(0.81, 9);
    expect(c.fRduKN).toBeCloseTo(0.09 * fcd * 3 * 1000, 6);
    expect(c.verifica).toBe(true);
  });

  it("sobre el pilote, A_c1 la limita el lado del cabezal", () => {
    const c = bajo.compresionPilote;
    expect(c.factorK).toBeCloseTo(1.5, 9);
    expect(c.limitaPor).toBe("cabezal");
    expect(c.fRduKN).toBeCloseTo(((Math.PI * 0.36) / 4) * fcd * 1.5 * 1000, 6);
    expect(c.verifica).toBe(true);
  });

  it("con poco canto, A_c1 la limita el canto (h ≥ b2 − b1)", () => {
    const r = calcularCabezalUnPilote(
      materiales,
      { pilarXM: 0.4, pilarYM: 0.4, ladoXM: 2, ladoYM: 2, hM: 0.4, diametroPiloteM: 0.6 },
      { ndPilarKN: 500, ...cercos }
    );
    expect(r.compresionPilar.factorK).toBeCloseTo(2, 9);
    expect(r.compresionPilar.limitaPor).toBe("canto");
  });

  it("no verifica si la carga supera F_Rdu", () => {
    const r = calcularCabezalUnPilote(
      materiales,
      { pilarXM: 0.2, pilarYM: 0.2, ladoXM: 0.9, ladoYM: 0.9, hM: 0.8, diametroPiloteM: 0.6 },
      { ndPilarKN: 2100, ...cercos }
    );
    expect(r.compresionPilar.fRduKN).toBeCloseTo(2000, 6);
    expect(r.compresionPilar.verifica).toBe(false);
    expect(r.verifica).toBe(false);
  });
});

describe("cabezal de un pilote: tracción transversal (ec. 6.58 y 6.59)", () => {
  it("mitad superior, discontinuidad total: T = ¼·(1 − 0,7·a/h)·F", () => {
    const t = bajo.superior.x;
    expect(t.discontinuidad).toBe("total");
    expect(t.ecuacion).toBe("6.59");
    expect(t.tKN).toBeCloseTo(0.25 * (1 - (0.7 * 0.3) / 0.4) * 690, 9);
    expect(t.asNecCm2).toBeCloseTo((t.tKN * 10) / fyd, 9);
    expect(t.asRealCm2).toBeCloseTo(2 * 3 * Math.PI * 0.25, 9);
    expect(t.verifica).toBe(true);
  });

  it("con el pilote más ancho que H/2, T sale de la ec. 6.58 con b = lado del cabezal", () => {
    // a = 0,886·0,60 = 0,53 > h = 0,40 → T = ¼·(0,90 − 0,53)/0,90·F
    const a = Math.sqrt(Math.PI / 4) * 0.6;
    const t = bajo.inferior.x;
    expect(t.aM).toBeCloseTo(a, 9);
    expect(t.aSuperaMitad).toBe(true);
    expect(t.ecuacion).toBe("6.58");
    expect(t.tKN).toBeCloseTo(0.25 * ((0.9 - a) / 0.9) * bajo.ndPiloteKN, 9);
    expect(t.verifica).toBe(t.asRealCm2 >= t.asNecCm2);
  });

  it("si a supera el lado del cabezal, T no baja de cero", () => {
    const r = calcularCabezalUnPilote(
      materiales,
      { pilarXM: 0.9, pilarYM: 0.3, ladoXM: 0.9, ladoYM: 0.9, hM: 0.6, diametroPiloteM: 0.6 },
      { ndPilarKN: 690, ...cercos }
    );
    expect(r.superior.x.ecuacion).toBe("6.58");
    expect(r.superior.x.tKN).toBe(0);
  });

  it("con más canto el pilote entra en rango", () => {
    const r = calcularCabezalUnPilote(
      materiales,
      { pilarXM: 0.3, pilarYM: 0.3, ladoXM: 0.9, ladoYM: 0.9, hM: 1.2, diametroPiloteM: 0.6 },
      { ndPilarKN: 690, ...cercos }
    );
    const a = Math.sqrt(Math.PI / 4) * 0.6;
    const f = 690 + 1.35 * 0.9 * 0.9 * 1.2 * 25;
    expect(r.inferior.y.ecuacion).toBe("6.59");
    expect(r.inferior.y.tKN).toBeCloseTo(0.25 * (1 - (0.7 * a) / 0.6) * f, 9);
    expect(r.inferior.y.verifica).toBe(true);
    expect(r.verifica).toBe(true);
  });

  it("cabezal angosto (b ≤ H/2), discontinuidad parcial: T = ¼·(b − a)/b·F", () => {
    const r = calcularCabezalUnPilote(
      materiales,
      { pilarXM: 0.3, pilarYM: 0.3, ladoXM: 0.5, ladoYM: 0.5, hM: 1.2, diametroPiloteM: 0.4 },
      { ndPilarKN: 690, ...cercos }
    );
    expect(r.superior.x.discontinuidad).toBe("parcial");
    expect(r.superior.x.ecuacion).toBe("6.58");
    expect(r.superior.x.tKN).toBeCloseTo(0.25 * (0.2 / 0.5) * 690, 9);
  });

  it("cuenta cada dirección con su lado de pilar y de cabezal", () => {
    const r = calcularCabezalUnPilote(
      materiales,
      { pilarXM: 0.2, pilarYM: 0.4, ladoXM: 0.9, ladoYM: 1.2, hM: 1.0, diametroPiloteM: 0.6 },
      { ndPilarKN: 690, ...cercos }
    );
    expect(r.superior.x.tKN).toBeCloseTo(0.25 * (1 - (0.7 * 0.2) / 0.5) * 690, 9);
    expect(r.superior.y.tKN).toBeCloseTo(0.25 * (1 - (0.7 * 0.4) / 0.5) * 690, 9);
  });
});
