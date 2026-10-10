import { describe, expect, it } from "vitest";
import { resolverVigaAtado } from "@/lib/calc/hormigon/cimentaciones/resolver-viga-atado";
import { recomendarVigaAtado } from "./viga-atado";

const BASE = {
  fck: "25", fyk: "500", b: "0.4", h: "0.4", recubrimiento: "0.04", luz: "5",
  n1d: "1000", n2d: "800", porcentaje: "10", compactacion: "no",
  numeroCara: "3", diametroCara: "16", diametroEstribo: "8", numeroRamas: "2",
};

describe("recomendaciones de la viga de atado", () => {
  it("el resolver calcula con los valores por defecto de la página", () => {
    expect(resolverVigaAtado(BASE)).not.toBeNull();
  });

  it("tracción excedida: más barras primero, y cumple", () => {
    const r = recomendarVigaAtado({ ...BASE, n1d: "6000" }).traccion ?? [];
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].accion).toMatch(/^Por cara: \d+ Ø16 \(hoy 3 Ø16\)$/);
    for (const p of r) expect(p.utilizacion).toBeLessThanOrEqual(1);
  });

  it("diámetro menor que Ø12: propone uno mayor", () => {
    const r = recomendarVigaAtado({ ...BASE, numeroCara: "4", diametroCara: "10" }).diametro ?? [];
    expect(r[0].accion).toMatch(/Ø12/);
  });
});
