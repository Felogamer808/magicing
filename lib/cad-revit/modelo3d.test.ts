import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { leerDxf } from "@/lib/dxf/leer";
import { interpretar } from "./interpretar";
import { ALTURA_TRAMO_PILAR_M, piezas3D } from "./modelo3d";
import { plantaParaGuardar } from "./proyecto";

const lectura = leerDxf(readFileSync(path.join(__dirname, "..", "dxf", "prueba.dxf"), "utf8"));
const r = interpretar(lectura, { capaContorno: "FUNDACIONES", capaPilotes: "FUNDACIONES", escala: 0.001, zona: 0 })!;
const planta = plantaParaGuardar(r, 0.001, "prueba.dxf", { largoPiloteM: 12 });
const piezas = piezas3D(planta);
const pieza = (id: string) => piezas.find((p) => p.id === id)!;

describe("piezas3D", () => {
  it("una pieza por cabezal, viga y pilote, y un tramo de pilar por cabezal", () => {
    expect(piezas.map((p) => p.id).sort()).toEqual(
      ["CT2", "CT2-P1", "CT9-1", "CT9-1-P1", "CT9-1-P2", "CT9-2", "CT9-2-P1", "CT9-2-P2", "VR4", "pilar:CT2", "pilar:CT9-1", "pilar:CT9-2"].sort()
    );
  });

  /** CT9 (1800x800x750) con la cara superior en 0: su centro a −0,375. */
  it("el cabezal es una caja con sus medidas y la cara superior en 0", () => {
    const ct9 = pieza("CT9-1");
    expect(ct9.forma).toBe("caja");
    expect([ct9.medidas[0], ct9.medidas[2]].sort()).toEqual([0.8, 1.8]);
    expect(ct9.medidas[1]).toBeCloseTo(0.75, 9);
    expect(ct9.centro[1]).toBeCloseTo(-0.375, 9);
  });

  /** VR4: 350x600 de cara a cara, 4,2 m. */
  it("la viga va de cara a cara con su sección, la cara superior en 0", () => {
    const vr = pieza("VR4");
    expect(vr.medidas[0]).toBeCloseTo(4.2, 6);
    expect(vr.medidas.slice(1)).toEqual([0.6, 0.35]);
    expect(vr.centro[1]).toBeCloseTo(-0.3, 9);
  });

  /** Cabeza 10 cm dentro del cabezal: −0,75 + 0,1 = −0,65; 12 m de largo. */
  it("el pilote cuelga de su cabezal con la cabeza 10 cm adentro", () => {
    const p = pieza("CT9-1-P1");
    expect(p.forma).toBe("cilindro");
    expect(p.medidas).toEqual([0.5, 12, 0.5]);
    expect(p.centro[1] + 6).toBeCloseTo(-0.65, 9);
  });

  it("el tramo de pilar sale de la cara superior con el pilar cargado", () => {
    const conPilar = piezas3D(planta, new Map([["CT9-1", { ladoPilotesM: 0.3, ladoTransversalM: 0.5 }]]));
    const p = conPilar.find((x) => x.id === "pilar:CT9-1")!;
    expect(p.medidas).toEqual([0.3, ALTURA_TRAMO_PILAR_M, 0.5]);
    expect(p.centro[1]).toBeCloseTo(ALTURA_TRAMO_PILAR_M / 2, 9);
  });

  /** El CT14 de ascensor iba 1,30 m más abajo: el 3D lo baja igual que Revit. */
  it("un cabezal con desnivel baja con sus pilotes", () => {
    const i = r.cabezales.findIndex((c) => c.nombre === "CT2");
    const bajada = piezas3D({ ...planta, desniveles: { [i]: -1.3 } });
    expect(bajada.find((p) => p.id === "CT2")!.centro[1]).toBeCloseTo(-1.3 - 0.375, 9);
    expect(bajada.find((p) => p.id === "CT2-P1")!.centro[1] + 6).toBeCloseTo(-1.3 - 0.75 + 0.1, 9);
  });

  it("queda centrada en la zona, no en el origen del CAD", () => {
    const xs = piezas.map((p) => p.centro[0]);
    expect(Math.max(...xs) + Math.min(...xs)).toBeLessThan(10);
  });
});
