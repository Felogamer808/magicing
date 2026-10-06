import { describe, expect, it } from "vitest";
import { COEF_FLECHA, NOMBRE_SISTEMA } from "@/lib/calc/hormigon/deformaciones";
import { NOMBRE_CEMENTO, NOMBRE_EXPOSICION } from "@/lib/calc/hormigon/comun/diferidas";
import { resolverDeformaciones } from "@/lib/calc/hormigon/resolver-deformaciones";
import { recomendarDeformaciones } from "./deformaciones";

const BASE = {
  fck: "30", fyk: "500", esGPa: "200", b: "0.3", h: "0.5", d: "0.45", dComp: "0.05", luz: "6",
  numeroAs: "4", phiAs: "16", capa2: "No", numeroAs2: "2", phiAs2: "16", numeroAsComp: "0", phiAsComp: "12",
  asReq: "10", sistema: NOMBRE_SISTEMA["simplemente-apoyada"], alaEnT: "No", tabiques: "No",
  mqp: "80", hr: "70", t0: "28", cemento: NOMBRE_CEMENTO.N, exposicion: NOMBRE_EXPOSICION["tres-caras"],
  esquema: COEF_FLECHA[0].nombre, coefManual: "0.104",
};

describe("recomendaciones de deformaciones", () => {
  it("el resolver calcula con los valores por defecto de la página", () => {
    const r = resolverDeformaciones(BASE)!;
    expect(r.n.asProv).toBeCloseTo((4 * Math.PI * 16 ** 2) / 4 / 100, 6);
    expect(r.n.phi).toBeGreaterThan(0);
  });

  it("flecha excedida: cada propuesta la deja cumpliendo", () => {
    const r = recomendarDeformaciones({ ...BASE, luz: "9", mqp: "150" });
    const todas = [...(r.apariencia ?? []), ...(r.luzCanto ?? [])];
    expect(todas.length).toBeGreaterThan(0);
    for (const p of todas) expect(p.utilizacion).toBeLessThanOrEqual(1);
  });
});
