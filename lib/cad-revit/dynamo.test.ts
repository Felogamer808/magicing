import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { FORMATO_EXPORTACION } from "./exportar";

/**
 * El script de Dynamo se escribe en revit/colocar-fundaciones.py y se publica
 * envuelto en public/revit/colocar-fundaciones-magicing.dyn (lo arma
 * scripts/armar-dyn.mjs). Si alguien cambia el .py y no regenera el .dyn, la
 * página ofrece un script viejo: esto lo detecta.
 */
const raiz = path.join(__dirname, "..", "..");
const py = readFileSync(path.join(raiz, "revit", "colocar-fundaciones.py"), "utf8").replace(/\r\n/g, "\n").trim();
const dyn = JSON.parse(readFileSync(path.join(raiz, "public", "revit", "colocar-fundaciones-magicing.dyn"), "utf8"));

describe("script de Dynamo", () => {
  const nodo = dyn.Nodes.find((n: { NodeType: string }) => n.NodeType === "PythonScriptNode");

  it("el .dyn publicado lleva el código actual del .py (si falla: node scripts/armar-dyn.mjs)", () => {
    expect(nodo.Code).toBe(py);
  });

  it("corre en el motor Python 3, que es el de Revit 2026", () => {
    expect(nodo.Engine).toBe("CPython3");
  });

  it("tiene sus dos entradas conectadas: archivo y nivel", () => {
    expect(nodo.Inputs).toHaveLength(2);
    const extremos = dyn.Connectors.map((c: { End: string }) => c.End);
    for (const entrada of nodo.Inputs) expect(extremos).toContain(entrada.Id);
  });

  it("lee el mismo formato que exporta MagicIng", () => {
    expect(py).toContain(`"${FORMATO_EXPORTACION}"`);
  });
});
