import { describe, expect, it } from "vitest";
import {
  anchoEficazAla,
  betaSaintVenant,
  flexionAlaComprimida,
  moduloResistenteT,
  propiedadesT,
  rasanteAlaAlma,
  repartoTorsionT,
} from "./seccion-t";

/*
 * Sin planilla de referencia: contrastado a mano.
 * Alma bw = 0,30, canto 0,60, ala hf = 0,15; fck 30 → fcd = 20 MPa; fyd = 434,78 MPa.
 */
const FCD = 20;
const FYD = 500 / 1.15;

describe("ancho eficaz del ala, ec. (5.7)", () => {
  it("con un ala angosta manda el ancho real", () => {
    // b1 = 0,6: 0,2·0,6 + 0,1·6 = 0,72 > b1 → b_eff,i = 0,6 y b_eff = 1,5
    const a = anchoEficazAla(0.3, { anchoM: 1.5, espesorM: 0.15, l0M: 6 });
    expect(a.vueloEficazM).toBeCloseTo(0.6, 9);
    expect(a.anchoEficazM).toBeCloseTo(1.5, 9);
    expect(a.mandaAnchoReal).toBe(true);
  });

  it("con un ala ancha manda l0", () => {
    // b1 = 1,35: 0,2·1,35 + 0,6 = 0,87 ≤ 0,2·6 = 1,2 → b_eff = 2·0,87 + 0,3 = 2,04
    const a = anchoEficazAla(0.3, { anchoM: 3, espesorM: 0.15, l0M: 6 });
    expect(a.vueloEficazM).toBeCloseTo(0.87, 9);
    expect(a.anchoEficazM).toBeCloseTo(2.04, 9);
    expect(a.mandaAnchoReal).toBe(false);
  });

  it("b_eff,i no supera 0,2·l0", () => {
    // b1 = 5: 0,2·5 + 0,1·4 = 1,4 > 0,2·4 = 0,8
    expect(anchoEficazAla(0.3, { anchoM: 10.3, espesorM: 0.15, l0M: 4 }).vueloEficazM).toBeCloseTo(0.8, 9);
  });
});

describe("propiedades de la T para la ec. (9.1)", () => {
  // Ala 1,5 × 0,15 y alma 0,3 × 0,45: yc = 0,1875 desde el borde del ala,
  // I = 0,000421875 + 0,225·0,1125² + 0,0022781 + 0,135·0,1875² = 0,0102938 m⁴.
  const p = propiedadesT(0.3, 0.6, 1.5, 0.15);

  it("baricentro e inercia", () => {
    expect(p.areaM2).toBeCloseTo(0.36, 9);
    expect(p.baricentroDesdeAlaM).toBeCloseTo(0.1875, 9);
    expect(p.inerciaM4).toBeCloseTo(0.01029375, 9);
  });

  it("W respecto de cada borde", () => {
    expect(moduloResistenteT(p, 0.6, false)).toBeCloseTo(0.01029375 / 0.4125, 9);
    expect(moduloResistenteT(p, 0.6, true)).toBeCloseTo(0.01029375 / 0.1875, 9);
  });

  it("con el ala del ancho del alma es un rectángulo: W = b·h²/6", () => {
    const r = propiedadesT(0.3, 0.6, 0.3, 0.15);
    expect(moduloResistenteT(r, 0.6, false)).toBeCloseTo((0.3 * 0.36) / 6, 9);
  });
});

describe("flexión con el ala comprimida", () => {
  it("bloque dentro del ala: rectángulo de ancho b_eff", () => {
    // μ = 300/(1,5·0,55²·20 000) = 0,033058; ω = 0,0336231; C = 554,78 kN
    const f = flexionAlaComprimida(300, 0.3, 1.5, 0.15, 0.55, FCD, FYD);
    expect(f.bloqueEnAla).toBe(true);
    expect(f.mu).toBeCloseTo(0.033058, 5);
    expect(f.compresionKN).toBeCloseTo(554.78, 1);
    expect(f.asCalculadoCm2).toBeCloseTo(12.760, 2);
    expect(f.bloqueM).toBeLessThan(0.15);
  });

  it("bloque en el alma: los vuelos toman (b_eff − bw)·hf·fcd y el alma el resto", () => {
    // Vuelos 3600 kN, M 1710; alma 590 → μ = 0,325069, ω = 0,408509, Fw = 1348,08
    const f = flexionAlaComprimida(2300, 0.3, 1.5, 0.15, 0.55, FCD, FYD);
    expect(f.bloqueEnAla).toBe(false);
    expect(f.compresionVuelosKN).toBeCloseTo(3600, 6);
    expect(f.mu).toBeCloseTo(0.325069, 5);
    expect(f.compresionKN).toBeCloseTo(4948.08, 1);
    expect(f.zM).toBeCloseTo(2300 / 4948.08, 4);
  });

  it("es continua donde el bloque llena justo el ala", () => {
    const mAla = 1.5 * 0.15 * 20000 * (0.55 - 0.075);
    const a = flexionAlaComprimida(mAla - 1e-6, 0.3, 1.5, 0.15, 0.55, FCD, FYD);
    const b = flexionAlaComprimida(mAla + 1e-6, 0.3, 1.5, 0.15, 0.55, FCD, FYD);
    expect(a.asCalculadoCm2).toBeCloseTo(b.asCalculadoCm2, 4);
  });
});

describe("rasante entre ala y alma, art. 6.2.4", () => {
  it("con Δx = l0/4 y cot θf = 2", () => {
    const flexion = flexionAlaComprimida(300, 0.3, 1.5, 0.15, 0.55, FCD, FYD);
    // ΔFd = 554,78·1,2/1,5/2 = 221,91 kN; vEd = 221,91/(0,15·1,5) = 0,9863 MPa
    const r = rasanteAlaAlma({
      momentoKNm: 300, flexion, anchoAlmaM: 0.3, anchoEficazM: 1.5, espesorAlaM: 0.15, l0M: 6,
      fckMPa: 30, fcdMPa: FCD, fydMPa: FYD, fctmMPa: 0.3 * 30 ** (2 / 3), asTransversalRealCm2PorM: 2.51,
    });
    expect(r.deltaFKN).toBeCloseTo(221.91, 1);
    expect(r.vEdMPa).toBeCloseTo(0.9863, 3);
    // 0,4·fctd = 0,4·0,7·2,8965/1,5 = 0,5407 < vEd: hace falta armadura
    expect(r.limiteSinArmaduraMPa).toBeCloseTo(0.5407, 3);
    expect(r.requiereArmadura).toBe(true);
    expect(r.cotTheta).toBe(2);
    // ν·fcd·cot/(1+cot²) = 10,56·2/5 = 4,224 MPa
    expect(r.vRdMaxMPa).toBeCloseTo(4.224, 6);
    // Asf/sf = 0,9863·0,15/(2·434,78)·10⁴ = 1,7014 cm²/m
    expect(r.asNecCm2PorM).toBeCloseTo(1.7014, 3);
    expect(r.verificaArmadura).toBe(true);
  });

  it("con poco rasante no pide armadura", () => {
    const flexion = flexionAlaComprimida(100, 0.3, 1.5, 0.15, 0.55, FCD, FYD);
    const r = rasanteAlaAlma({
      momentoKNm: 100, flexion, anchoAlmaM: 0.3, anchoEficazM: 1.5, espesorAlaM: 0.15, l0M: 6,
      fckMPa: 30, fcdMPa: FCD, fydMPa: FYD, fctmMPa: 0.3 * 30 ** (2 / 3), asTransversalRealCm2PorM: 0,
    });
    expect(r.requiereArmadura).toBe(false);
    expect(r.asNecCm2PorM).toBe(0);
    expect(r.verificaArmadura).toBe(true);
  });
});

describe("torsión: rigidez de Saint-Venant y reparto", () => {
  it("β coincide con los valores tabulados", () => {
    expect(betaSaintVenant(1, 1)).toBeCloseTo(0.1406, 4);
    expect(betaSaintVenant(2, 1)).toBeCloseTo(0.2287, 4);
    expect(betaSaintVenant(4, 1)).toBeCloseTo(0.2808, 4);
    // Muy alargado tiende a la pared delgada: 1/3.
    expect(betaSaintVenant(1000, 1)).toBeCloseTo(1 / 3, 3);
  });

  it("el reparto suma uno y el alma toma más con vuelos finos", () => {
    // Alma 0,3 × 0,6 (r = 2): K = 0,2287·0,6·0,3³ = 0,003705
    // Vuelo 0,6 × 0,15 (r = 4): K = 0,2808·0,6·0,15³ = 0,000569
    const r = repartoTorsionT(0.3, 0.6, 0.6, 0.15);
    expect(r.rigidezAlmaM4).toBeCloseTo(0.2287 * 0.6 * 0.027, 5);
    expect(r.rigidezVueloM4).toBeCloseTo(0.2808 * 0.6 * 0.003375, 5);
    expect(r.fraccionAlma + 2 * r.fraccionVuelo).toBeCloseTo(1, 12);
    expect(r.fraccionAlma).toBeCloseTo(0.765, 3);
  });

  it("sin vuelos toda la torsión es del alma", () => {
    expect(repartoTorsionT(0.3, 0.6, 0, 0.15).fraccionAlma).toBe(1);
  });
});
