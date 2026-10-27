import { describe, expect, it } from "vitest";
import { areaEntre, estadoFisurado, estadoSinFisurar, franjasSeccion } from "./seccion-franjas";
import { propiedadesT } from "@/lib/calc/hormigon/vigas/seccion-t";

/*
 * Sin planilla de referencia: contrastado a mano y contra propiedadesT, que ya
 * está contrastada en seccion-t.test.ts.
 */
describe("franjas de la sección", () => {
  it("sin ala, o con ala no más ancha que el alma, es el rectángulo", () => {
    expect(franjasSeccion(0.3, 0.6)).toEqual([{ desdeM: 0, hastaM: 0.6, anchoM: 0.3 }]);
    expect(franjasSeccion(0.3, 0.6, { anchoM: 0.3, espesorM: 0.15, comprimida: true })).toHaveLength(1);
  });

  it("el ala va del lado comprimido o del traccionado", () => {
    const comp = franjasSeccion(0.3, 0.6, { anchoM: 1.5, espesorM: 0.15, comprimida: true });
    expect(comp[0]).toEqual({ desdeM: 0, hastaM: 0.15, anchoM: 1.5 });
    const trac = franjasSeccion(0.3, 0.6, { anchoM: 1.5, espesorM: 0.15, comprimida: false });
    expect(trac[1].anchoM).toBe(1.5);
    expect(trac[1].desdeM).toBeCloseTo(0.45, 12);
  });

  it("área entre dos profundidades cruza la unión ala–alma", () => {
    const trac = franjasSeccion(0.3, 0.6, { anchoM: 1.5, espesorM: 0.15, comprimida: false });
    // 0,1 m de alma (0,35 a 0,45) y 0,15 de ala
    expect(areaEntre(trac, 0.35, 0.6).areaM2).toBeCloseTo(0.3 * 0.1 + 1.5 * 0.15, 12);
  });
});

describe("estado sin fisurar", () => {
  it("sin armadura coincide con las propiedades brutas de la T", () => {
    const p = propiedadesT(0.3, 0.6, 1.5, 0.15);
    const comp = estadoSinFisurar(franjasSeccion(0.3, 0.6, { anchoM: 1.5, espesorM: 0.15, comprimida: true }), 0.55, 0.05, 0, 0, 6);
    expect(comp.xM).toBeCloseTo(p.baricentroDesdeAlaM, 12);
    expect(comp.iM4).toBeCloseTo(p.inerciaM4, 12);
    // Dada vuelta, la fibra neutra se mide desde el otro borde; la inercia es la misma.
    const trac = estadoSinFisurar(franjasSeccion(0.3, 0.6, { anchoM: 1.5, espesorM: 0.15, comprimida: false }), 0.55, 0.05, 0, 0, 6);
    expect(trac.xM).toBeCloseTo(0.6 - p.baricentroDesdeAlaM, 12);
    expect(trac.iM4).toBeCloseTo(p.inerciaM4, 12);
  });
});

describe("estado fisurado", () => {
  it("rectángulo: la cuadrática de siempre", () => {
    // 0,3·x²/2 = 0,06·(0,55 − x)
    const e = estadoFisurado(franjasSeccion(0.3, 0.6), 0.55, 0, 0.004, 0, 15);
    const x = (-0.06 + Math.sqrt(0.06 ** 2 + 2 * 0.3 * 0.06 * 0.55)) / 0.3;
    expect(e.xM).toBeCloseTo(x, 10);
    expect(e.iM4).toBeCloseTo((0.3 * x ** 3) / 3 + 0.06 * (0.55 - x) ** 2, 10);
  });

  it("ala comprimida con la fibra neutra en el alma", () => {
    // ala 1,5 × 0,10, αe·As = 0,06, d = 0,55:
    // 1,5·0,1·(x − 0,05) + 0,3·(x − 0,1)²/2 = 0,06·(0,55 − x) → 0,15x² + 0,18x − 0,039 = 0
    const e = estadoFisurado(
      franjasSeccion(0.3, 0.6, { anchoM: 1.5, espesorM: 0.1, comprimida: true }),
      0.55, 0, 0.004, 0, 15
    );
    expect(e.xM).toBeCloseTo(0.1874008, 6);
    expect(e.iM4).toBeCloseTo(0.0109123, 6);
  });

  it("ala traccionada: con la fibra neutra en el alma es el rectángulo bw", () => {
    const t = estadoFisurado(franjasSeccion(0.3, 0.6, { anchoM: 1.5, espesorM: 0.15, comprimida: false }), 0.55, 0, 0.004, 0, 15);
    const r = estadoFisurado(franjasSeccion(0.3, 0.6), 0.55, 0, 0.004, 0, 15);
    expect(t.xM).toBeCloseTo(r.xM, 10);
    expect(t.iM4).toBeCloseTo(r.iM4, 10);
  });
});
