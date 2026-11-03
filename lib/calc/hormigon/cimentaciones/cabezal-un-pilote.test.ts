import { describe, expect, it } from "vitest";
import { calcularCabezalUnPilote } from "@/lib/calc/hormigon/cimentaciones/cabezal-un-pilote";
import { resolverCabezalUnPilote } from "@/lib/calc/hormigon/cimentaciones/resolver-cabezal-un-pilote";
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
  recubrimientoM: 0.05,
  estribosX: { diametroMm: 16, separacionM: 0.15 },
  estribosY: { diametroMm: 16, separacionM: 0.15 },
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

  it("con el pilote más ancho que H/2, la ec. 6.59 se toma con a topado en h", () => {
    // a = 0,886·0,60 = 0,53 > h = 0,40 → T = ¼·(1 − 0,7)·F = 0,075·F, menor
    // que la 6.58: ¼·(0,90 − 0,53)/0,90·F = 0,102·F.
    const a = Math.sqrt(Math.PI / 4) * 0.6;
    const t = bajo.inferior.x;
    expect(t.aM).toBeCloseTo(a, 9);
    expect(t.aSuperaMitad).toBe(true);
    expect(t.ecuacion).toBe("6.59");
    expect(t.tKN).toBeCloseTo(0.25 * 0.3 * bajo.ndPiloteKN, 9);
    expect(t.verifica).toBe(t.asRealCm2 >= t.asNecCm2);
  });

  it("caso del usuario (2026-11-03): pilar 0,2 × 0,4, pilote Ø0,6, H = 0,9", () => {
    const r = calcularCabezalUnPilote(
      materiales,
      { pilarXM: 0.2, pilarYM: 0.4, ladoXM: 0.9, ladoYM: 0.9, hM: 0.9, diametroPiloteM: 0.6 },
      { ndPilarKN: 690, ...cercos }
    );
    const f = 690 + 1.35 * 0.9 * 0.9 * 0.9 * 25;
    // Arriba, en rango: ¼·(1 − 0,7·a/0,45)·690
    expect(r.superior.x.tKN).toBeCloseTo(0.25 * (1 - (0.7 * 0.2) / 0.45) * 690, 9);
    expect(r.superior.y.tKN).toBeCloseTo(0.25 * (1 - (0.7 * 0.4) / 0.45) * 690, 9);
    // Abajo, a = 0,53 > 0,45: topada, 0,075·F ≈ 54 kN (la 6.58 daría 73).
    expect(r.inferior.x.ecuacion).toBe("6.59");
    expect(r.inferior.x.tKN).toBeCloseTo(0.075 * f, 9);
  });

  it("con a cerca del lado del cabezal manda la 6.58, que lleva T a cero", () => {
    // a = 0,8 > h = 0,3: topada 0,075·F, 6.58 = ¼·(0,9 − 0,8)/0,9·F = 0,028·F.
    const r = calcularCabezalUnPilote(
      materiales,
      { pilarXM: 0.8, pilarYM: 0.3, ladoXM: 0.9, ladoYM: 0.9, hM: 0.6, diametroPiloteM: 0.6 },
      { ndPilarKN: 690, ...cercos }
    );
    expect(r.superior.x.ecuacion).toBe("6.58");
    expect(r.superior.x.tKN).toBeCloseTo(0.25 * (0.1 / 0.9) * 690, 9);
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

// Estribos verticales: bielas y tirantes en cada dirección (criterio del
// usuario, 2026-11-02). d' = 0,05 + 0,016/2 = 0,058; z = 0,8 − 0,116 = 0,684.
describe("cabezal de un pilote: estribos verticales", () => {
  const b = Math.sqrt(Math.PI / 4) * 0.6; // 0,5317

  it("pilar más angosto que el pilote: tirante abajo con la reacción del pilote", () => {
    const e = bajo.estribosX;
    expect(e.tirante).toBe("abajo");
    expect(e.fKN).toBeCloseTo(690 + 1.35 * 16.2, 9);
    expect(e.zM).toBeCloseTo(0.684, 9);
    expect(e.tKN).toBeCloseTo(((690 + 1.35 * 16.2) / 2) * ((b - 0.3) / 4) / 0.684, 9);
    expect(e.asNecCm2).toBeCloseTo((e.tKN * 10) / fyd, 9);
    // Biela del ancho del pilote: 0,5317/0,15 → 3 + 1 = 4 estribos; en todo el
    // cabezal, (0,9 − 0,116)/0,15 → 5 + 1 = 6.
    expect(e.estribosEnBiela).toBe(4);
    expect(e.estribosTotales).toBe(6);
    expect(e.asRealCm2).toBeCloseTo(4 * Math.PI * 1.6 ** 2 / 4, 9);
    expect(e.verificaTirante).toBe(true);
  });

  it("mínimo del art. 9.7: 0,001·lado en total, mitad por cara, con tope de separación", () => {
    const e = bajo.estribosX;
    expect(e.asMinCm2PorM).toBeCloseTo(4.5, 9);
    expect(e.asCm2PorM).toBeCloseTo((Math.PI * 1.6 ** 2) / 4 / 0.15, 9);
    expect(e.verificaMinimo).toBe(true);
    const flojo = calcularCabezalUnPilote(
      materiales,
      { pilarXM: 0.3, pilarYM: 0.3, ladoXM: 0.9, ladoYM: 0.9, hM: 0.8, diametroPiloteM: 0.6 },
      { ndPilarKN: 690, ...cercos, estribosX: { diametroMm: 10, separacionM: 0.2 } }
    );
    // Ø10 cada 20 = 3,93 cm²/m < 4,5.
    expect(flojo.estribosX.verificaMinimo).toBe(false);
    expect(flojo.verifica).toBe(false);
  });

  it("pilar más ancho que el pilote: tirante arriba con Nd y biela del ancho del pilar", () => {
    const r = calcularCabezalUnPilote(
      materiales,
      { pilarXM: 0.6, pilarYM: 0.6, ladoXM: 0.9, ladoYM: 0.9, hM: 0.8, diametroPiloteM: 0.4 },
      { ndPilarKN: 690, ...cercos }
    );
    const bChico = Math.sqrt(Math.PI / 4) * 0.4;
    expect(r.estribosX.tirante).toBe("arriba");
    expect(r.estribosX.fKN).toBe(690);
    expect(r.estribosX.tKN).toBeCloseTo(345 * ((0.6 - bChico) / 4) / 0.684, 9);
    expect(r.estribosX.anchoBielaM).toBe(0.6);
    expect(r.estribosX.estribosEnBiela).toBe(5);
  });

  it("mismo ancho: no hay tirante y queda el mínimo", () => {
    const r = calcularCabezalUnPilote(
      materiales,
      { pilarXM: b, pilarYM: b, ladoXM: 0.9, ladoYM: 0.9, hM: 0.8, diametroPiloteM: 0.6 },
      { ndPilarKN: 690, ...cercos }
    );
    expect(r.estribosX.tirante).toBe("ninguno");
    expect(r.estribosX.tKN).toBe(0);
    expect(r.estribosX.verificaTirante).toBe(true);
    expect(r.estribosX.verificaMinimo).toBe(true);
  });
});

describe("cabezal de un pilote: cercos cargados en todo el canto", () => {
  const campos = {
    fck: "25", fyk: "500", pilarX: "0.3", pilarY: "0.3", ladoX: "0.9", ladoY: "0.9", hCab: "0.8",
    dPilote: "0.6", ndPilar: "690", phiCercos: "12", recubrimiento: "0.05",
    phiEstribosX: "16", sEstribosX: "0.15", phiEstribosY: "16", sEstribosY: "0.15",
  };

  it("cada mitad cuenta la mitad; con cantidad impar, el del medio no cuenta", () => {
    const par = resolverCabezalUnPilote({ ...campos, nCercos: "6" })!;
    const impar = resolverCabezalUnPilote({ ...campos, nCercos: "7" })!;
    const dosRamas = (n: number) => 2 * n * (Math.PI * 1.2 ** 2) / 4;
    expect(par.r.superior.x.asRealCm2).toBeCloseTo(dosRamas(3), 9);
    expect(par.r.inferior.x.asRealCm2).toBeCloseTo(dosRamas(3), 9);
    expect(impar.r.superior.x.asRealCm2).toBeCloseTo(dosRamas(3), 9);
    expect(impar.r.inferior.y.asRealCm2).toBeCloseTo(dosRamas(3), 9);
  });
});

describe("cabezal de un pilote: piso absoluto del mínimo", () => {
  it("en un cabezal chico manda 150 mm²/m por cara", () => {
    const r = calcularCabezalUnPilote(
      materiales,
      { pilarXM: 0.3, pilarYM: 0.3, ladoXM: 0.25, ladoYM: 0.25, hM: 0.8, diametroPiloteM: 0.25 },
      { ndPilarKN: 100, ...cercos }
    );
    // 0,001·0,25/2 = 1,25 cm²/m < 1,5.
    expect(r.estribosX.asMinCm2PorM).toBeCloseTo(1.5, 9);
  });
});
