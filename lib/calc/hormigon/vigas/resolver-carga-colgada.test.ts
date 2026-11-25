import { describe, expect, it } from "vitest";
import { MODOS_PORCENTAJE, TIPOS_CARGA_COLGADA, resolverCargaColgada } from "@/lib/calc/hormigon/vigas/resolver-carga-colgada";

const PILAR = {
  tipo: TIPOS_CARGA_COLGADA[1], nd: "1000", fck: "25", fyk: "500", h: "0.6",
  ladoPilar: "0.3", anchoPilar: "0.3", nBarrasPilar: "4", phiPilar: "16",
  diametroEstribo: "10", numeroRamas: "2", modoPorcentaje: MODOS_PORCENTAJE[0], porcentaje: "50",
};

describe("resolverCargaColgada", () => {
  it("sin tipo, sigue siendo la viga que llega a otra", () => {
    const r = resolverCargaColgada({ reaccion: "200", fyk: "500", diametroEstribo: "10", numeroRamas: "2", h: "0.5", h2: "0.4", a: "0.3" });
    expect(r?.tipo).toBe("viga");
  });

  it("pilar con % calculado: el ejemplo de 30×30 con 4φ16 cuelga ≈ 178 kN", () => {
    const r = resolverCargaColgada(PILAR);
    expect(r?.tipo).toBe("pilar");
    if (r?.tipo !== "pilar") return;
    expect(r.r.cargaColgadaKN).toBeCloseTo(177.9, 1);
  });

  it("pilar con % impuesto", () => {
    const r = resolverCargaColgada({ ...PILAR, modoPorcentaje: MODOS_PORCENTAJE[1] });
    if (r?.tipo !== "pilar") throw new Error("tipo");
    expect(r.r.cargaColgadaKN).toBeCloseTo(500, 9);
  });

  it("porcentaje impuesto fuera de 0–100: datos no válidos", () => {
    expect(resolverCargaColgada({ ...PILAR, modoPorcentaje: MODOS_PORCENTAJE[1], porcentaje: "120" })).toBeNull();
  });
});
