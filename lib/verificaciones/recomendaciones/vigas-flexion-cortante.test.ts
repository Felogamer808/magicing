import { describe, expect, it } from "vitest";
import { recomendarVigaFlexionCortante } from "./vigas-flexion-cortante";

const BASE = {
  fck: "30", fyk: "500", b: "0.3", h: "0.6", recubrimiento: "0.04",
  momentoPos: "150", numeroPos: "4", diametroPos: "16", numeroPos2: "0", diametroPos2: "16",
  momentoNeg: "80", numeroNeg: "3", diametroNeg: "16", numeroNeg2: "0", diametroNeg2: "16",
  vd: "200", diametroEstribo: "8", numeroRamas: "2", monolitica: "si",
};

describe("recomendaciones de la viga a flexión y cortante", () => {
  it("con margen no propone nada", () => {
    expect(recomendarVigaFlexionCortante(BASE)).toEqual({});
  });

  it("flexión positiva corta: más barras primero, todas cumplen", () => {
    const r = recomendarVigaFlexionCortante({ ...BASE, momentoPos: "320" }).positiva ?? [];
    expect(r[0].accion).toMatch(/^Inferior capa 1: \d+ Ø16 \(hoy 4 Ø16\)$/);
    for (const p of r) expect(p.utilizacion).toBeLessThanOrEqual(1);
  });

  it("no entra ni una barra en el ancho: barras más finas o más ancho, sin utilización", () => {
    const r = recomendarVigaFlexionCortante({ ...BASE, b: "0.12", diametroEstribo: "12", diametroPos: "32", numeroPos: "2" }).anchoInferior ?? [];
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].utilizacion).toBeUndefined();
  });

  it("bielas del alma: ensanchar primero", () => {
    const r = recomendarVigaFlexionCortante({ ...BASE, vd: "1200" }).bielas ?? [];
    expect(r[0].accion).toMatch(/^b = /);
  });
});
