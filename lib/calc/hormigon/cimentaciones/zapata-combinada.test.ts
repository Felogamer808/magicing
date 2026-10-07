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

describe("zapata combinada: momentos, horizontales, vuelco y deslizamiento", () => {
  const geometria = { L: 6, B: 1, H: 0.6, recubrimiento: 0.05 };
  const pilar = { Nk: 200, NkPermanente: 150, anchoLargoM: 0.4, anchoAnchoM: 0.4 };
  const armado = {
    inferior: { numero: 6, diametroMm: 16 },
    superior: { numero: 6, diametroMm: 12 },
    transversal: { diametroMm: 12, separacionM: 0.2 },
    phiGrados: 30,
  };
  // Mk 30 en P1 y Hk 50 en P2: en la base, 30 + 50·0,6 = 60 kN·m hacia la derecha.
  const r = calcularZapataCombinada(materiales, geometria, 300, {
    ...armado,
    pilares: [{ ...pilar, posicionM: 1, MkL: 30 }, { ...pilar, posicionM: 5, HkL: 50 }],
  });

  it("el momento en la base corre la resultante: e = 60 / (400 + 90)", () => {
    expect(r.geotecnico.excentricidadLM).toBeCloseTo(60 / 490, 9);
  });

  it("la viga cierra en equilibrio: V y M vuelven a cero en el extremo derecho", () => {
    const ultimo = r.diagrama[r.diagrama.length - 1];
    expect(ultimo.xM).toBeCloseTo(6, 9);
    expect(ultimo.vKN).toBeCloseTo(0, 6);
    expect(ultimo.mKNm).toBeCloseTo(0, 2);
  });

  it("vuelco a lo largo: Mstb = 150·5 + 150·1 + 90·3 = 1170, Mdst = 60", () => {
    expect(r.vuelcoL.borde).toBe("fin");
    expect(r.vuelcoL.momentoDesestabilizadorKNm).toBeCloseTo(60, 9);
    expect(r.vuelcoL.momentoEstabilizadorKNm).toBeCloseTo(1170, 9);
    expect(r.vuelcoL.verifica).toBe(true);
    expect(r.vuelcoB?.borde).toBe("ninguno");
  });

  it("deslizamiento: 50 kN contra (300 + 90)·tan 22,5° / 1,5", () => {
    expect(r.deslizamiento?.horizontalKN).toBeCloseTo(50, 9);
    expect(r.deslizamiento?.rozamientoCalculoKN).toBeCloseTo((390 * Math.tan((22.5 * Math.PI) / 180)) / 1.5, 9);
    expect(r.deslizamiento?.verifica).toBe(true);
  });

  it("vuelco a lo ancho: Hk 100 en cada pilar no verifica (1,8·120 > 0,9·195)", () => {
    const v = calcularZapataCombinada(materiales, geometria, 300, {
      ...armado,
      pilares: [{ ...pilar, posicionM: 1, HkB: 100 }, { ...pilar, posicionM: 5, HkB: 100 }],
    });
    expect(v.vuelcoB?.momentoDesestabilizadorKNm).toBeCloseTo(120, 9);
    expect(v.vuelcoB?.momentoEstabilizadorKNm).toBeCloseTo(150 * 0.5 * 2 + 90 * 0.5, 9);
    expect(v.vuelcoB?.verifica).toBe(false);
    expect(v.deslizamiento?.horizontalKN).toBeCloseTo(200, 9);
  });

  it("sin φ′ el deslizamiento no se evalúa", () => {
    const s = calcularZapataCombinada(materiales, geometria, 300, {
      ...armado,
      phiGrados: undefined,
      pilares: [{ ...pilar, posicionM: 1 }, { ...pilar, posicionM: 5 }],
    });
    expect(s.deslizamiento).toBeNull();
  });

  it("con tirante: no hay vuelco a lo ancho y la base frena Tk + Hk", () => {
    // Caso Z.5 con Hk 10 en cada pilar: Tk = (141·0,325 − 20·0,3)/3 = 13,275.
    const t = calcularZapataCombinada(
      materiales,
      { L: 3.1, B: 0.8, H: 0.3, recubrimiento: 0.04, distanciaBordeB: 0 },
      150,
      {
        ...armado,
        pilares: [
          { posicionM: 0.3, Nk: 65, anchoLargoM: 0.6, anchoAnchoM: 0.15, HkB: 10 },
          { posicionM: 2.8, Nk: 76, anchoLargoM: 0.6, anchoAnchoM: 0.15, HkB: 10 },
        ],
        tirante: { brazoM: 3, phiGrados: 30 },
      }
    );
    expect(t.vuelcoB).toBeNull();
    expect(t.tirante?.global.tkKN).toBeCloseTo((141 * 0.325 - 20 * 0.3) / 3, 9);
    expect(t.deslizamiento?.horizontalKN).toBeCloseTo((141 * 0.325 - 20 * 0.3) / 3 + 20, 9);
  });
});

describe("zapata combinada: situación extraordinaria", () => {
  const pilar = { Nk: 200, NkPermanente: 150, anchoLargoM: 0.4, anchoAnchoM: 0.4 };
  const sismo = { Nk: 200, NkPermanente: 150, HkB: 100 };
  const r = calcularZapataCombinada(materiales, { L: 6, B: 1, H: 0.6, recubrimiento: 0.05 }, 300, {
    pilares: [{ ...pilar, posicionM: 1 }, { ...pilar, posicionM: 5 }],
    inferior: { numero: 6, diametroMm: 16 },
    superior: { numero: 6, diametroMm: 12 },
    transversal: { diametroMm: 12, separacionM: 0.2 },
    phiGrados: 30,
    extraordinaria: [sismo, sismo],
  });

  it("el vuelco a lo ancho que no verificaba con 1,8 verifica con 1,2: 144 ≤ 175,5", () => {
    expect(r.extraordinaria?.vuelcoB?.efectoDesestabilizadorKNm).toBeCloseTo(1.2 * 120, 9);
    expect(r.extraordinaria?.vuelcoB?.efectoEstabilizadorKNm).toBeCloseTo(0.9 * 195, 9);
    expect(r.extraordinaria?.vuelcoB?.verifica).toBe(true);
  });

  it("la persistente sigue sin horizontales y la tensión admisible sube a 450", () => {
    expect(r.vuelcoB?.borde).toBe("ninguno");
    expect(r.extraordinaria?.sigmaAdmisibleKPa).toBeCloseTo(450, 9);
    expect(r.extraordinaria?.deslizamiento?.horizontalKN).toBeCloseTo(200, 9);
  });
});
