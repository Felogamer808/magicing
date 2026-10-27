import { describe, expect, it } from "vitest";
import { resolverVigaTorsion } from "./resolver-torsion";

/** Valores por defecto de la página de torsión. */
const BASE: Record<string, string> = {
  fck: "30", fyk: "500", b: "0.3", h: "0.7", recubrimiento: "0.035",
  momentoPos: "219", numeroPos: "2", diametroPos: "25",
  momentoNeg: "235", numeroNeg: "3", diametroNeg: "25",
  vd: "405", diametroEstribo: "10", numeroRamas: "2", td: "30",
};
const T = { ...BASE, tipoSeccion: "t", anchoAla: "1.5", espesorAla: "0.2", l0: "6" };

describe("torsión con sección en T", () => {
  it("rectangular: todo el torsor al alma, como siempre", () => {
    const r = resolverVigaTorsion(BASE)!;
    expect(r.seccionT).toBeNull();
    expect(r.torsion.atCm2PorM).toBeGreaterThan(0);
  });

  it("T: el alma toma su parte según la rigidez de Saint-Venant y los vuelos el resto", () => {
    const r = resolverVigaTorsion(T)!;
    const t = r.seccionT!;
    expect(t.reparto.fraccionAlma + 2 * t.reparto.fraccionVuelo).toBeCloseTo(1, 12);
    expect(t.tdAlma).toBeCloseTo(30 * t.reparto.fraccionAlma, 9);
    expect(t.vuelo?.tdKNm).toBeCloseTo(30 * t.reparto.fraccionVuelo, 9);
    // Menos torsor que el rectángulo: menos At/s en el alma.
    expect(r.torsion.atCm2PorM).toBeLessThan(resolverVigaTorsion(BASE)!.torsion.atCm2PorM);
  });

  it("T: la flexión cuenta el ala comprimida con el positivo", () => {
    const r = resolverVigaTorsion(T)!;
    expect(r.flexionPositiva.alaComprimida).toBeDefined();
    expect(r.flexionNegativa.alaComprimida).toBeUndefined();
  });

  it("el vuelo se verifica como pared delgada con su espesor eficaz mínimo", () => {
    const v = resolverVigaTorsion(T)!.seccionT!.vuelo!;
    // c = 0,035 + 0,010 + 0,0125 = 0,0575 → tef ≥ 0,115 en un ala de 0,20
    expect(v.torsion.tM).toBeCloseTo(0.115, 9);
    expect(v.modelable).toBe(true);
    expect(v.torsion.tRdMaxKNm).toBeGreaterThan(0);
  });

  it("con un ala más fina que 2·tef el modelo del vuelo no aplica, y se dice", () => {
    const v = resolverVigaTorsion({ ...T, espesorAla: "0.1" })!.seccionT!.vuelo!;
    expect(v.modelable).toBe(false);
    expect(v.requiereArmadura).toBe(false);
  });
});
