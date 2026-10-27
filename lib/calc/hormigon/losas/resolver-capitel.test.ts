import { describe, expect, it } from "vitest";
import { BLANQUEAR_CAPITELES, camposCapitelDesdePunzonamiento } from "@/lib/verificaciones/vinculos";
import { resolverCapitel } from "./resolver-capitel";
import { resolverPunzonamiento } from "./resolver-punzonamiento";

// Un caso que la losa sola no aguanta: 0,20 de losa sobre un pilar de 0,30
// con 900 kN. En u0: 1,15·900/(1,2·0,163) = 5,29 MPa contra 0,4·ν·fcd = 4,22.
const punzonamiento = {
  posicion: "Interior", betaModo: "Recomendado", beta: "1.15",
  fck: "30", fyk: "500", espesor: "0.20", recubrimiento: "0.025",
  c1: "0.30", c2: "0.30", distBordeC1: "0", distBordeC2: "0",
  phiNegY: "12", sNegY: "0.15", phiNegZ: "12", sNegZ: "0.15", vEd: "900",
  phiCerco: "8", ramas: "12", sr: "0.12", st: "0.20", nPerimetros: "3", distPrimer: "0.08",
};

describe("de punzonamiento a capitel", () => {
  it("el caso de partida no verifica en la cara del pilar", () => {
    expect(resolverPunzonamiento(punzonamiento)!.r.caraPilar.verifica).toBe(false);
  });

  it("lleva la losa, el pilar, los negativos y la carga; el capitel queda por cargar", () => {
    const destino = camposCapitelDesdePunzonamiento(punzonamiento);
    expect(destino).toMatchObject({ forma: "Rectangular", c1: "0.30", vEd: "900", sNegZ: "0.15" });
    expect(destino.phiCerco).toBeUndefined();
    expect(BLANQUEAR_CAPITELES).toEqual(["lH1", "lH2", "hH"]);
    expect(resolverCapitel({ ...destino, lH1: "", lH2: "", hH: "" })).toBeNull();
  });

  /** Con un capitel de 0,45 de vuelo y 0,25 de canto (chico), la cara del pilar pasa con d_H. */
  it("con el capitel cargado calcula, y la biela mejora con el canto del capitel", () => {
    const r = resolverCapitel({ ...camposCapitelDesdePunzonamiento(punzonamiento), lH1: "0.45", lH2: "0.45", hH: "0.25" })!;
    expect(r.r.tipo).toBe("chico");
    const sin = resolverPunzonamiento(punzonamiento)!;
    expect(r.r.caraPilar.vEdMPa).toBeLessThan(sin.r.caraPilar.vEdMPa);
  });
});
