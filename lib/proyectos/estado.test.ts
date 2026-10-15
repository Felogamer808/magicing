import { describe, expect, it } from "vitest";
import { calcularCimentacion } from "@/lib/mcp/cimentaciones";
import { estadoDeCalculo, estadoDeElemento } from "./estado";
import { crearCalculo, crearElemento } from "./modelo";
import type { CalculoGuardado, ElementoProyecto } from "./tipos";

/**
 * Zapata aislada de 2,0 × 1,5 con los valores por defecto de la página, salvo
 * la carga y la parrilla: con los 6 Ø16 por defecto falla la armadura en B.
 */
const zapataQueVerifica = crearCalculo("zapatas", {
  Nk: "300",
  MkA: "0",
  MkB: "0",
  numeroA: "10",
  numeroB: "10",
});
const zapataQueNoVerifica = crearCalculo("zapatas", { Nk: "3000" });
const vigaSinResolver = crearCalculo("vigas-flexion-cortante", { b: "0,20" });

function elementoCon(...calculos: CalculoGuardado[]): ElementoProyecto {
  return { ...crearElemento("Z-1"), calculos };
}

describe("estadoDeCalculo", () => {
  /** El estado tiene que decir lo mismo que el resolver de la página: no hay lógica propia. */
  it("coincide con el resolver de la página", () => {
    const si = calcularCimentacion("zapatas", zapataQueVerifica.campos);
    const no = calcularCimentacion("zapatas", zapataQueNoVerifica.campos);
    expect(si.ok && si.cumple).toBe(true);
    expect(no.ok && !no.cumple).toBe(true);
    expect(estadoDeCalculo(zapataQueVerifica)).toBe("verifica");
    expect(estadoDeCalculo(zapataQueNoVerifica)).toBe("no-verifica");
  });

  it("una verificación sin resolver por campos no se puede evaluar", () => {
    expect(estadoDeCalculo(vigaSinResolver)).toBe("no-evaluable");
  });

  it("con datos con los que la página no calcula, tampoco", () => {
    expect(estadoDeCalculo(crearCalculo("zapatas", { A: "" }))).toBe("no-evaluable");
    expect(estadoDeCalculo(crearCalculo("zapatas", { campoQueNoExiste: "1" }))).toBe("no-evaluable");
  });
});

describe("estadoDeElemento", () => {
  it("sin cálculos queda sin verificar", () => {
    expect(estadoDeElemento(elementoCon())).toBe("sin-verificar");
  });

  it("verifica si todos sus cálculos verifican", () => {
    expect(estadoDeElemento(elementoCon(zapataQueVerifica))).toBe("verifica");
  });

  it("no verifica si alguno falla, aunque haya otros sin evaluar", () => {
    expect(estadoDeElemento(elementoCon(zapataQueVerifica, zapataQueNoVerifica))).toBe("no-verifica");
    expect(estadoDeElemento(elementoCon(vigaSinResolver, zapataQueNoVerifica))).toBe("no-verifica");
  });

  it("si ninguno falla pero alguno no se puede evaluar, no se da por verificado", () => {
    expect(estadoDeElemento(elementoCon(zapataQueVerifica, vigaSinResolver))).toBe("no-evaluable");
  });
});
