import { describe, expect, it } from "vitest";
import { recomendarLosa } from "./losas";

const BASE = {
  fck: "30", fyk: "500", e: "0.15", rgPos: "0.02", rgNeg: "0.02", formaAnclaje: "Recta",
  mxPos: "15", myPos: "10", mxNeg: "15", myNeg: "10",
  phiPosX: "12", sPosX: "0.1", phiPosY: "10", sPosY: "0.15",
  phiNegX: "12", sNegX: "0.15", phiNegY: "10", sNegY: "0.15",
};

describe("recomendaciones de la losa", () => {
  it("negativo X corto: cerrar la separación primero, y cumple", () => {
    const r = recomendarLosa({ ...BASE, mxNeg: "45" }).asNegX ?? [];
    expect(r[0].accion).toMatch(/^negativo X: Ø12 c\/0,\d\d \(hoy Ø12 c\/0,15\)$/);
    for (const p of r) expect(p.utilizacion).toBeLessThanOrEqual(1);
  });

  it("separación constructiva excedida: bajarla a 3h", () => {
    const r = recomendarLosa({ ...BASE, e: "0.08", sPosY: "0.3" }).sepPosY ?? [];
    expect(r[0].accion).toBe("positivo Y: Ø10 c/0,24 (hoy Ø10 c/0,30)");
  });
});
