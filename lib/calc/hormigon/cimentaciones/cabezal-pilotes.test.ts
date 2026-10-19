import { describe, expect, it } from "vitest";
import { calcularCabezalDosPilotes } from "@/lib/calc/hormigon/cimentaciones/cabezal-pilotes";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";

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

// El tirante ya se dimensionaba, pero no se comprobaba que el hormigón aguante
// la biela que lo tracciona (art. 6.5.2 y 6.5.4). Es lo que suele gobernar en
// cabezales bajos, donde la biela es corta y muy inclinada.
describe("cabezal de 2 pilotes: bielas y nudos", () => {
  it("resuelve la inclinación de la biela desde la geometría del modelo", () => {
    // tan θ = 0,85·d / (v + a/4) = 0,4539 / 0,55
    expect(r.bielas.anguloBielaGrados).toBeCloseTo(
      (Math.atan((0.85 * 0.534) / (0.475 + 0.3 / 4)) * 180) / Math.PI,
      9
    );
    expect(r.bielas.anguloBielaGrados).toBeCloseTo(39.53, 2);
  });

  it("verifica la compresión en la biela y en el nudo sobre el pilote", () => {
    // ν' = 1 − 30/250 = 0,88 y fcd = 20 MPa
    expect(r.bielas.sigmaBielaMaxMPa).toBeCloseTo(0.6 * 0.88 * 20, 9);
    expect(r.bielas.sigmaNudoMaxMPa).toBeCloseTo(0.85 * 0.88 * 20, 9);
    expect(r.bielas.verificaBiela).toBe(true);
    expect(r.bielas.verificaNudo).toBe(true);
  });

  it("la biela se agota antes que el nudo al crecer la carga", () => {
    // El nudo recibe la componente vertical y la biela la total dividida por
    // sen²θ, así que con bielas tendidas la biela manda por lejos.
    const sobrecargado = calcularCabezalDosPilotes(materiales, geometria, {
      ndPilarKN: 9000,
      armaduraPrincipal: { numero: 7, diametroMm: 16 },
      armaduraSecundaria: { numero: 7, diametroMm: 10 },
      estribosVerticales: { numero: 10, diametroMm: 8, numeroCercos: 2 },
      estribosHorizontales: { numero: 5, diametroMm: 10 },
    });
    expect(sobrecargado.bielas.verificaBiela).toBe(false);
    expect(sobrecargado.bielas.sigmaBielaMPa).toBeGreaterThan(sobrecargado.bielas.sigmaNudoMPa);
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

  // Anejo 19, art. 8.4, a mano: Td/As = 456 MPa > fyd → σsd = 434,78 MPa.
  // fctd = 0,7·0,3·30^(2/3)/1,5 = 1,3515; fbd = 2,25·fctd = 3,0409.
  // lb,rqd = 16/4 · 434,78/3,0409 = 571,9 mm. cd = mín(50; (77,33 − 16)/2) = 30,67.
  // Recta: α2 = 1 − 0,15·(30,67 − 16)/16 = 0,8625 → lbd = 493,3 mm.
  it("ancla el tirante con el art. 8.4, con σsd topada en fyd", () => {
    const fyd = 500 / 1.15;
    const fbd = 2.25 * ((0.7 * 0.3 * 30 ** (2 / 3)) / 1.5);
    const lbRqd = (16 / 4) * (fyd / fbd);
    const cd = (77.3333333333333 - 16) / 2;
    expect(r.principal.sigmaSdAnclajeMPa).toBeCloseTo(fyd, 9);
    expect(r.principal.lbdMm).toBeCloseTo((1 - (0.15 * (cd - 16)) / 16) * lbRqd, 4);
  });

  // De la cara interior del pilote al borde: 0,8 − 0,625 + 0,25 − 0,05 = 0,375 m.
  it("mide el anclaje desde la cara interior del pilote (art. 6.5.4 (7))", () => {
    expect(r.principal.disponibleAnclajeMm).toBeCloseTo(375, 6);
    expect(r.principal.verificaAnclaje).toBe(false);
  });

  // Con patilla: + H − 2·rec = 0,5 m; α1 = 1 (cd ≤ 3φ) y α2 = 1 → lbd = lb,rqd.
  it("con patilla suma la pata y verifica", () => {
    const conPatilla = calcularCabezalDosPilotes(materiales, geometria, {
      ndPilarKN: 1040,
      armaduraPrincipal: { numero: 7, diametroMm: 16 },
      armaduraSecundaria: { numero: 7, diametroMm: 10 },
      estribosVerticales: { numero: 10, diametroMm: 8, numeroCercos: 2 },
      estribosHorizontales: { numero: 5, diametroMm: 10 },
      formaAnclaje: "gancho",
    });
    const lbRqd = (16 / 4) * ((500 / 1.15) / (2.25 * ((0.7 * 0.3 * 30 ** (2 / 3)) / 1.5)));
    expect(conPatilla.principal.disponibleAnclajeMm).toBeCloseTo(875, 6);
    expect(conPatilla.principal.lbdMm).toBeCloseTo(lbRqd, 4);
    expect(conPatilla.principal.verificaAnclaje).toBe(true);
  });
});

describe("cabezal de 2 pilotes: armaduras complementarias", () => {
  it("reproduce la armadura secundaria (10% de la principal real)", () => {
    expect(r.secundaria.asNecCm2).toBeCloseTo(1.40743350880823, 6);
    expect(r.secundaria.asRealCm2).toBeCloseTo(5.49778714378214, 6);
    expect(r.secundaria.verificaAs).toBe(true);
    expect(r.secundaria.separacionMm).toBeCloseTo(239.666666666667, 6);
  });

  // Art. 9.7 por analogía: espesor 0,60 m → máx(0,001·0,60 m²/m; 1,5 cm²/m) = 6 cm²/m por cara.
  it("las caras piden la malla del art. 9.7: 0,1 % del espesor por cara y dirección", () => {
    expect(r.estribosVerticales.asNecCm2).toBeCloseTo(6, 9);
    expect(r.estribosHorizontales.asNecCm2).toBeCloseTo(6, 9);
    expect(r.estribosVerticales.separacionMaxM).toBeCloseTo(0.3, 9);
  });

  // Verticales: 10φ8 en 1,6 − 0,2 m → s = 0,156 m; una rama por cara: 0,503/0,156 = 3,23 cm²/m.
  it("los verticales cuentan la rama exterior por metro y no alcanzan", () => {
    expect(r.estribosVerticales.separacionM).toBeCloseTo(1.4 / 9, 9);
    expect(r.estribosVerticales.asRealCm2).toBeCloseTo((Math.PI * 0.64) / 4 / (1.4 / 9), 9);
    expect(r.estribosVerticales.verificaAs).toBe(false);
    expect(r.estribosVerticales.verificaSeparacion).toBe(true);
  });

  // Horizontales: 5φ10 en 0,6 − 0,15 m → s = 0,1125 m: 0,785/0,1125 = 6,98 cm²/m.
  it("los horizontales cumplen la malla y la separación", () => {
    expect(r.estribosHorizontales.asRealCm2).toBeCloseTo((Math.PI * 1) / 4 / 0.1125, 9);
    expect(r.estribosHorizontales.verificaAs).toBe(true);
    expect(r.estribosHorizontales.verificaSeparacion).toBe(true);
  });

  it("cabezal delgado: el mínimo de 150 mm²/m y la separación de 2·espesor", () => {
    const delgado = calcularCabezalDosPilotes(materiales, { ...geometria, ladoYM: 0.1 }, {
      ndPilarKN: 100,
      armaduraPrincipal: { numero: 2, diametroMm: 12 },
      armaduraSecundaria: { numero: 2, diametroMm: 8 },
      estribosVerticales: { numero: 5, diametroMm: 8, numeroCercos: 1 },
      estribosHorizontales: { numero: 3, diametroMm: 8 },
    });
    expect(delgado.estribosVerticales.asNecCm2).toBeCloseTo(1.5, 9);
    expect(delgado.estribosVerticales.separacionMaxM).toBeCloseTo(0.2, 9);
    expect(delgado.estribosVerticales.verificaSeparacion).toBe(false);
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
