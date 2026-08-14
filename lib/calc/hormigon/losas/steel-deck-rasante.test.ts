import { describe, expect, it } from "vitest";
import {
  calcularSteelDeckRasante,
  type AccionesRasante,
  type AnclajeExtremo,
  type DatosMk,
  type GeometriaSteelDeckRasante,
  type MaterialesSteelDeckRasante,
} from "./steel-deck-rasante";

// Caso real de la hoja "Deckpanel - Rasante" del Excel de referencia:
// Deckpanel 1,24 mm, L=4 m, h=183 mm (12 cm de hormigón sobre chapa de 63 mm),
// dp=151 mm, Ap=1620 mm²/m, fyp=255,1 MPa, m=165 N/mm² y k=0 (valores
// inferidos conservadores, ver nota del módulo), γVS=1,25, Ls/L=0,25 (carga
// uniforme, apoyo simple). Barras adicionales φ10 c/200, fyk=500 MPa.
const materiales: MaterialesSteelDeckRasante = { fypMPa: 255.1, fykBarrasMPa: 500 };
const geometria: GeometriaSteelDeckRasante = {
  luzM: 4,
  anchoM: 1,
  dpM: 0.151,
  apMm2PorM: 1620,
  diametroBarraMm: 10,
  separacionBarraMm: 200,
};
const mk: DatosMk = { mMPa: 165, kMPa: 0, gammaVs: 1.25, lsSobreL: 0.25 };
const acciones: AccionesRasante = { gPpKNm2: 4.5, gAddKNm2: 0, qKNm2: 7.55, gammaG: 1.35, gammaQ: 1.5 };
const sinAnclaje: AnclajeExtremo = {
  presente: false,
  espesorChapaMm: 0,
  diametroPernoMm: 0,
  numeroPernos: 0,
  separacionPernosM: 0,
};

describe("steel-deck-rasante: reproduce la hoja «Deckpanel - Rasante» del Excel", () => {
  const r = calcularSteelDeckRasante(materiales, geometria, mk, acciones, sinAnclaje);

  it("acciones de cálculo", () => {
    expect(r.acciones.wEdKNm2).toBeCloseTo(17.4, 9);
    expect(r.acciones.vEdKN).toBeCloseTo(34.8, 9);
    expect(r.acciones.vEdPorAnchoKNporM).toBeCloseTo(34.8, 9);
  });

  it("camino resistente de la chapa y de las barras", () => {
    expect(r.rasante.asBarrasMm2PorM).toBeCloseTo(392.699081698724, 6);
    expect(r.rasante.fydBarrasMPa).toBeCloseTo(434.782608695652, 6);
    expect(r.rasante.tChapaKN).toBeCloseTo(413.262, 6);
    expect(r.rasante.tBarrasKN).toBeCloseTo(170.738731173358, 6);
    expect(r.rasante.alfaChapa).toBeCloseTo(0.707639524987726, 9);
    expect(r.rasante.vEdChapaKNporM).toBeCloseTo(24.6258554695729, 6);
    expect(r.rasante.flujoRasanteKNm2).toBeCloseTo(0.163085135560085, 6);
  });

  it("resistencia m-k y las dos utilizaciones", () => {
    expect(r.rasante.vlRdKNporM).toBeCloseTo(32.28984, 4);
    expect(r.rasante.utilizacionEstricta).toBeCloseTo(1.07773838458165, 5);
    expect(r.rasante.verificaEstricta).toBe(false); // el m-k estricto no cumple en este caso
    expect(r.rasante.utilizacionChapaExclusiva).toBeCloseTo(0.762650278526399, 5);
    expect(r.rasante.verificaChapaExclusiva).toBe(true); // el chequeo complementario sí cumple
  });

  it("sin anclaje de extremo, no calcula ese bloque", () => {
    expect(r.anclajeExtremo).toBeNull();
  });
});

describe("steel-deck-rasante: anclaje de extremo con pernos, EN 1994-1-1 §9.7.4", () => {
  // Caso real de la hoja "Resistencia a flexión": t=0,89 mm, dperno=25,4 mm (1"),
  // 1 perno cada 0,3 m.
  const anclaje: AnclajeExtremo = {
    presente: true,
    espesorChapaMm: 0.89,
    diametroPernoMm: 25.4,
    numeroPernos: 1,
    separacionPernosM: 0.3,
  };
  const r = calcularSteelDeckRasante(materiales, geometria, mk, acciones, anclaje);

  it("reproduce dd0, a, kφ y Ppb,Rd", () => {
    expect(r.anclajeExtremo).not.toBeNull();
    expect(r.anclajeExtremo!.dd0Mm).toBeCloseTo(27.94, 9);
    expect(r.anclajeExtremo!.aMm).toBeCloseTo(55.88, 9);
    expect(r.anclajeExtremo!.kPhi).toBeCloseTo(3, 9);
    expect(r.anclajeExtremo!.ppbRdKNporM).toBeCloseTo(55.1606057391304, 4);
  });
});

describe("steel-deck-rasante: sanidad", () => {
  it("más barras adicionales alivian a la chapa (α baja) y suben la utilización complementaria de la chapa", () => {
    const base = calcularSteelDeckRasante(materiales, geometria, mk, acciones, sinAnclaje);
    const masBarras = calcularSteelDeckRasante(
      materiales,
      { ...geometria, separacionBarraMm: 100 },
      mk,
      acciones,
      sinAnclaje
    );
    expect(masBarras.rasante.alfaChapa).toBeLessThan(base.rasante.alfaChapa);
    expect(masBarras.rasante.vEdChapaKNporM).toBeLessThan(base.rasante.vEdChapaKNporM);
  });

  it("sin barras adicionales, toda la tracción se atribuye a la chapa (α = 1)", () => {
    const sinBarras = calcularSteelDeckRasante(
      materiales,
      { ...geometria, diametroBarraMm: 0 },
      mk,
      acciones,
      sinAnclaje
    );
    expect(sinBarras.rasante.alfaChapa).toBeCloseTo(1, 9);
    expect(sinBarras.rasante.vEdChapaKNporM).toBeCloseTo(sinBarras.acciones.vEdPorAnchoKNporM, 9);
  });
});
