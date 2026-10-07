import { describe, expect, it } from "vitest";
import { recomendarVigaCentradora } from "./zapata-viga-centradora";
import { recomendarLosaFundacion } from "./losa-fundacion";

describe("recomendaciones de la zapata con viga centradora", () => {
  const BASE = {
    fck: "25", fyk: "500", sigmaAdmisible: "250", A: "1.5", B: "2", H: "0.5", recubrimiento: "0.05",
    distanciaColumnaLimite: "0", anchoPilarA: "0.3", anchoPilarB: "0.3", luz: "4", bViga: "0.4", hViga: "0.7",
    Nk: "500", MkA: "0", MkB: "0", numeroB: "10", diametroB: "16", numeroA: "8", diametroA: "12",
    formaAnclaje: "recta", numeroViga: "6", diametroViga: "20", diametroEstribo: "10", numeroRamas: "2",
  };

  it("tensión excedida: agrandar B primero, y cumple", () => {
    const r = recomendarVigaCentradora({ ...BASE, Nk: "900" }).tension ?? [];
    expect(r[0].accion).toMatch(/^B = /);
    for (const p of r) expect(p.utilizacion).toBeLessThanOrEqual(1);
  });

  it("viga corta: más barras arriba", () => {
    const r = recomendarVigaCentradora({ ...BASE, numeroViga: "2", diametroViga: "12" }).vigaFlexion ?? [];
    expect(r[0].accion).toMatch(/^Viga: \d+ Ø12 \(hoy 2 Ø12\)$/);
  });
});

describe("recomendaciones de la losa de fundación", () => {
  const BASE = {
    fck: "25", fyk: "500", longitud: "9", anchoTributario: "3", H: "0.5", recubrimiento: "0.05", sigmaAdmisible: "200",
    pos1: "1.5", Nk1: "200", pos2: "4.5", Nk2: "200", pos3: "7.5", Nk3: "200",
    diametroInferior: "16", separacionInferior: "0.15", diametroSuperior: "12", separacionSuperior: "0.15",
    pilarLargo: "0.3", pilarAncho: "0.3", diametroTransversal: "12", separacionTransversal: "0.15",
  };

  it("superior corta: cerrar la separación primero, y cumple", () => {
    const r = recomendarLosaFundacion({ ...BASE, pos1: "1", pos3: "8", Nk1: "400", Nk2: "400", Nk3: "400", diametroSuperior: "8", separacionSuperior: "0.3" }).superior ?? [];
    expect(r[0].accion).toMatch(/^Superior: Ø8 c\/0,\d\d \(hoy Ø8 c\/0,30\)$/);
    for (const p of r) expect(p.utilizacion).toBeLessThanOrEqual(1);
  });

  it("punzonamiento excedido: más canto primero, y cumple", () => {
    const r = recomendarLosaFundacion({ ...BASE, H: "0.3", Nk2: "1500" }).punzonamiento2 ?? [];
    expect(r[0].accion).toMatch(/^H = /);
    for (const p of r) expect(p.utilizacion).toBeLessThanOrEqual(1);
  });
});
