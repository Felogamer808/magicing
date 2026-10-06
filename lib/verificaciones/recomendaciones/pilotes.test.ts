import { describe, expect, it } from "vitest";
import { recomendarPilote } from "./pilotes";
import { recomendarCabezal } from "./cabezal-pilotes";

describe("recomendaciones de pilotes", () => {
  const BASE = { fck: "25", fyk: "500", diametro: "0.4", longitud: "10", friccion: "40", punta: "2000", factorSeguridad: "3", numero: "6", diametroBarra: "12", diametroEstribo: "8", Nk: "300" };
  it("capacidad excedida: alargar primero, y cumple", () => {
    const r = recomendarPilote({ ...BASE, Nk: "400" }).capacidad ?? [];
    expect(r[0].accion).toMatch(/^L = /);
    for (const p of r) expect(p.utilizacion).toBeLessThanOrEqual(1);
  });
});

describe("recomendaciones del cabezal", () => {
  const BASE = {
    fck: "25", fyk: "500", rg: "0.05", anchoPilar: "0.4", ladoX: "2", ladoY: "0.6", hCab: "0.8", dPilote: "0.4", ndPilar: "1200",
    nPrinc: "4", phiPrinc: "16", nSec: "4", phiSec: "10", nEstV: "6", phiEstV: "10", nCercos: "2", nEstH: "4", phiEstH: "10",
  };
  it("tirante corto: más barras primero, y cumple", () => {
    const r = recomendarCabezal({ ...BASE, nPrinc: "2", phiPrinc: "10" }).tirante ?? [];
    expect(r[0].accion).toMatch(/^Tirante: \d+ Ø10 \(hoy 2 Ø10\)$/);
    for (const p of r) expect(p.utilizacion).toBeLessThanOrEqual(1);
  });
});
