import { describe, expect, it } from "vitest";
import { resolverVigaFlexionCortante } from "@/lib/calc/hormigon/vigas/resolver";

/** Datos por defecto de la página de vigas. */
const BASE: Record<string, string> = {
  fck: "30", fyk: "500", b: "0.3", h: "0.6", recubrimiento: "0.04",
  momentoPos: "200", numeroPos: "4", diametroPos: "20", numeroPos2: "0", diametroPos2: "20",
  momentoNeg: "0", numeroNeg: "2", diametroNeg: "16", numeroNeg2: "0", diametroNeg2: "16",
  vd: "150", diametroEstribo: "8", numeroRamas: "2",
};

/**
 * Mínimo del apoyo en construcción monolítica: Anejo 19, art. 9.2.1.2 (1),
 * pág. 140, β1 = 0,15 del máximo momento del vano.
 */
describe("momento mínimo de apoyo (β1)", () => {
  it("en construcción monolítica dimensiona el apoyo para 0,15·M+ si el negativo cargado es menor", () => {
    const r = resolverVigaFlexionCortante({ ...BASE, monolitica: "si" })!;
    expect(r.gobiernaMinimoApoyo).toBe(true);
    expect(r.momentoNegativoCalculo).toBeCloseTo(30, 10);

    // Debe dar lo mismo que cargar a mano ese momento sin la regla.
    const aMano = resolverVigaFlexionCortante({ ...BASE, momentoNeg: "30" })!;
    expect(r.flexionNegativa.asNecCm2).toBeCloseTo(aMano.flexionNegativa.asNecCm2, 10);
  });

  it("respeta el negativo cargado cuando ya supera el mínimo", () => {
    const r = resolverVigaFlexionCortante({ ...BASE, momentoNeg: "80", monolitica: "si" })!;
    expect(r.gobiernaMinimoApoyo).toBe(false);
    expect(r.momentoNegativoCalculo).toBe(80);
  });

  it("sin la opción —o en un cálculo guardado antes de que existiera— no aplica el mínimo", () => {
    for (const campos of [{ ...BASE, monolitica: "no" }, BASE]) {
      const r = resolverVigaFlexionCortante(campos)!;
      expect(r.gobiernaMinimoApoyo).toBe(false);
      expect(r.momentoNegativoCalculo).toBe(0);
    }
  });
});
