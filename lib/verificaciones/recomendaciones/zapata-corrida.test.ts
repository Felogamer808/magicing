import { describe, expect, it } from "vitest";
import { recomendarZapataCorrida, type EntradaZapataCorrida } from "./zapata-corrida";

/** H = 0,30: la mínima de la ec. (9.1) pide 5,41 cm²/m y Ø10 c/0,15 da 5,24. */
const BASE: EntradaZapataCorrida = {
  fck: 25,
  fyk: 500,
  sigmaAdmisibleKPa: 150,
  geometria: { A: 1, H: 0.3, anchoPilar: 0.2, recubrimiento: 0.04 },
  datos: {
    carga: { Nk: 80, MkA: 0 },
    armadoPrincipal: { diametroMm: 10, separacionM: 0.15 },
    armadoSecundario: { numero: 6, diametroMm: 10 },
    formaAnclaje: "gancho",
  },
};

describe("recomendaciones de la zapata corrida", () => {
  it("mínima sin cubrir: cerrar la separación a 0,14 primero", () => {
    const r = recomendarZapataCorrida(BASE);
    expect(r["gobernante.as"]?.[0].accion).toBe("Ø10 c/0,14 (hoy Ø10 c/0,15)");
    expect(r["gobernante.as"]?.[0].utilizacion).toBeLessThanOrEqual(1);
  });

  it("tensión excedida: ensanchar", () => {
    const r = recomendarZapataCorrida({ ...BASE, datos: { ...BASE.datos, carga: { Nk: 200, MkA: 0 } } });
    expect(r.tension?.[0].accion).toMatch(/^A = /);
    expect(r.tension?.[0].utilizacion).toBeLessThanOrEqual(1);
  });
});
