import { describe, expect, it } from "vitest";
import { resolverMuroContencion } from "@/lib/calc/hormigon/muros/resolver-muro-contencion";
import { recomendarMuroContencion } from "./muro-contencion";

const BASE = {
  gamma: "18", phi: "34", c: "0", sigmaAdm: "150", anchoZap: "1.5", cantoZap: "0.3", altMuro: "2", espMuro: "0.15",
  hAct: "2.3", hPas: "0", sobrecargaG: "0", sobrecargaQ: "0", puntera: "0",
  fck: "25", fyk: "500", recArm: "0.05", phiHastial: "12", sepHastial: "150", phiTalon: "12", sepTalon: "150",
  phiPuntera: "12", sepPuntera: "150", l1Caso2: "2", l1Caso3: "0.95", l2Caso3: "2.45",
};

describe("recomendaciones del muro de contención", () => {
  it("el resolver arma estabilidad y armado", () => {
    const r = resolverMuroContencion(BASE)!;
    expect(r.armado?.hastial.asRealCm2).toBeCloseTo((Math.PI * 1.2 ** 2) / 4 / 0.15, 6);
  });

  it("vuelco: ensanchar la zapata primero, y cumple", () => {
    const r = recomendarMuroContencion({ ...BASE, anchoZap: "0.6" }).vuelco ?? [];
    expect(r[0].accion).toMatch(/^Ancho de zapata = /);
    for (const p of r) expect(p.utilizacion).toBeLessThanOrEqual(1);
  });
});
