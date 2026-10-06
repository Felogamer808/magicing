import { describe, expect, it } from "vitest";
import { recomendarZapataAislada, type EntradaZapataAislada } from "./zapata-aislada";

const BASE: EntradaZapataAislada = {
  fck: 25,
  fyk: 500,
  sigmaAdmisibleKPa: 200,
  geometria: { A: 1.6, B: 1.6, H: 0.4, anchoPilarA: 0.3, anchoPilarB: 0.3, recubrimiento: 0.05 },
  datos: {
    cargas: { Nk: 400, MkA: 0, MkB: 0 },
    armadoA: { numero: 8, diametroMm: 12 },
    armadoB: { numero: 8, diametroMm: 12 },
    formaAnclaje: "gancho",
  },
};

describe("recomendaciones de la zapata aislada", () => {
  it("con margen no propone nada en la tensión", () => {
    expect(recomendarZapataAislada(BASE).tension).toBeUndefined();
  });

  it("tensión excedida: propone agrandar la base y cada propuesta cumple", () => {
    const r = recomendarZapataAislada({ ...BASE, datos: { ...BASE.datos, cargas: { Nk: 700, MkA: 0, MkB: 0 } } });
    expect(r.tension?.[0].accion).toMatch(/^A × B = /);
    for (const p of r.tension ?? []) expect(p.utilizacion).toBeLessThanOrEqual(1);
  });

  it("armadura corta: más barras del mismo diámetro primero", () => {
    const r = recomendarZapataAislada({
      ...BASE,
      datos: { ...BASE.datos, armadoA: { numero: 4, diametroMm: 12 }, armadoB: { numero: 4, diametroMm: 12 } },
    });
    expect(r["A.gobernante.as"]?.[0].accion).toMatch(/^A: \d+ Ø12 \(hoy 4 Ø12\)$/);
  });
});
