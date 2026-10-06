import { describe, expect, it } from "vitest";
import { resolverPretensado } from "@/lib/calc/hormigon/resolver-pretensado";
import { recomendarPretensado } from "./pretensado";

const BASE = {
  fc: "50", fci: "40", fcSitu: "30", fpu: "1860", areaToron: "99", fuerzaToron: "156", fyPasiva: "500", luz: "7.2",
  hS: "0.45", bS: "0.6", aS: "0.24", iS: "0.0037", ygS: "0.206", perimS: "2.1",
  hC: "0.5", bC: "0.6", aC: "0.3", iC: "0.0072", ygC: "0.26", perimC: "2.4",
  recPas: "0.035", recPret: "0.05", cargaMuerta: "46.605", sobrecarga: "28.68", ev: "0",
  torones: "8", diamPas: "16", nPas: "6", pInst: "15", pDif: "10", hr: "90",
};

describe("recomendaciones del pretensado", () => {
  it("el resolver calcula con los valores por defecto de la página", () => {
    expect(resolverPretensado(BASE)).not.toBeNull();
  });

  it("flexión excedida: más torones primero, y cumple", () => {
    const r = recomendarPretensado({ ...BASE, torones: "3", nPas: "0" }).flexion ?? [];
    expect(r[0].accion).toMatch(/^Torones: \d+ \(hoy 3\)$/);
    for (const p of r) expect(p.utilizacion).toBeLessThanOrEqual(1);
  });
});
