import { describe, expect, it } from "vitest";
import { calcularCabezalDosPilotes } from "./cabezal-pilotes";
import { derivarMateriales } from "./materiales";

// Caso real de la hoja "Cabezal 2 pilotes (pilar circ)":
// fck=30, fyk=500, rg=0.05, pilar circular D=0.3, cabezal 1.6 x 0.6 x 0.6,
// pilote D=0.5, Nd pilar = 1040 kN. Principal 7φ16, secundaria 7φ10,
// estribos verticales 10φ8 (2 cercos), horizontales 5φ10.

const materiales = derivarMateriales({ fck: 30, fyk: 500 });
const geometria = {
  anchoPilarM: 0.3,
  ladoXM: 1.6,
  ladoYM: 0.6,
  hM: 0.6,
  diametroPiloteM: 0.5,
  recubrimientoM: 0.05,
};

const r = calcularCabezalDosPilotes(materiales, geometria, {
  ndPilarKN: 1040,
  armaduraPrincipal: { numero: 7, diametroMm: 16 },
  armaduraSecundaria: { numero: 7, diametroMm: 10 },
  estribosVerticales: { numero: 10, diametroMm: 8, numeroCercos: 2 },
  estribosHorizontales: { numero: 5, diametroMm: 10 },
});

describe("cabezal de 2 pilotes: geometría y carga", () => {
  it("reproduce la separación de pilotes, el brazo y el canto útil", () => {
    expect(r.principal.separacionPilotesM).toBeCloseTo(1.25, 9);
    expect(r.principal.vM).toBeCloseTo(0.475, 9);
    expect(r.principal.dM).toBeCloseTo(0.534, 9);
  });

  it("reproduce el peso propio y la carga por pilote", () => {
    expect(r.principal.pesoPropioKN).toBeCloseTo(14.4, 9);
    expect(r.principal.ndPorPiloteKN).toBeCloseTo(529.72, 6);
  });
});

describe("cabezal de 2 pilotes: armadura principal", () => {
  it("reproduce la tracción del tirante y el As necesario", () => {
    expect(r.principal.tdKN).toBeCloseTo(641.87265917603, 6);
    expect(r.principal.asNecCm2).toBeCloseTo(16.0468164794008, 6);
    expect(r.principal.asRealCm2).toBeCloseTo(14.0743350880823, 6);
    expect(r.principal.verificaAs).toBe(false);
  });

  it("reproduce el ancho necesario y la separación entre barras", () => {
    expect(r.principal.bNecM).toBeCloseTo(0.368, 9);
    expect(r.principal.verificaBNec).toBe(true);
    expect(r.principal.separacionMm).toBeCloseTo(77.3333333333333, 6);
  });

  it("reproduce las longitudes de anclaje", () => {
    expect(r.principal.lbIMm).toBeCloseTo(400, 6);
    expect(r.principal.lbNetaMm).toBeCloseTo(456.058957783056, 6);
  });
});

describe("cabezal de 2 pilotes: armaduras complementarias", () => {
  it("reproduce la armadura secundaria (10% de la principal real)", () => {
    expect(r.secundaria.asNecCm2).toBeCloseTo(1.40743350880823, 6);
    expect(r.secundaria.asRealCm2).toBeCloseTo(5.49778714378214, 6);
    expect(r.secundaria.verificaAs).toBe(true);
    expect(r.secundaria.lbIIMm).toBeCloseTo(357.142857142857, 6);
    expect(r.secundaria.lbNetaMm).toBeCloseTo(150, 6);
    expect(r.secundaria.separacionMm).toBeCloseTo(239.666666666667, 6);
  });

  it("reproduce los estribos verticales", () => {
    expect(r.estribosVerticales.asNecCm2).toBeCloseTo(19.2, 6);
    expect(r.estribosVerticales.asRealCm2).toBeCloseTo(20.1061929829747, 6);
    expect(r.estribosVerticales.verificaAs).toBe(true);
  });

  it("reproduce los estribos horizontales", () => {
    expect(r.estribosHorizontales.asNecCm2).toBeCloseTo(7.2, 6);
    expect(r.estribosHorizontales.asRealCm2).toBeCloseTo(7.85398163397448, 6);
    expect(r.estribosHorizontales.verificaAs).toBe(true);
  });
});

describe("cabezal de 2 pilotes: caso con pilar rectangular", () => {
  // Hoja "Cabezal 2 pilotes (pilar rect)": pilar 1.0 x 0.15, cabezal 2.3 x 0.8 x 0.6,
  // pilote D=0.6, Nd = 1645 kN, principal 7φ25.
  const rect = calcularCabezalDosPilotes(
    materiales,
    { anchoPilarM: 1, ladoXM: 2.3, ladoYM: 0.8, hM: 0.6, diametroPiloteM: 0.6, recubrimientoM: 0.05 },
    {
      ndPilarKN: 1645,
      armaduraPrincipal: { numero: 7, diametroMm: 25 },
      armaduraSecundaria: { numero: 7, diametroMm: 12 },
      estribosVerticales: { numero: 15, diametroMm: 8, numeroCercos: 2 },
      estribosHorizontales: { numero: 5, diametroMm: 10 },
    }
  );

  it("el brazo se reduce con un pilar más ancho", () => {
    expect(rect.principal.separacionPilotesM).toBeCloseTo(1.5, 9);
    expect(rect.principal.vM).toBeCloseTo(0.25, 9);
  });

  it("con 7φ25 la armadura principal sí verifica", () => {
    expect(rect.principal.verificaAs).toBe(true);
  });
});
