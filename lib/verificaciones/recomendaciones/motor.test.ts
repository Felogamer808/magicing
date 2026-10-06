import { describe, expect, it } from "vitest";
import { AL_LIMITE, pasos, recomendar, type Palanca, type Problema } from "./motor";

/** Un problema de juguete: una barra con demanda fija y capacidad = área. */
interface D { area: number; otra: number }
const problema = (datos: D): Problema<D, D, "resiste" | "otra"> => ({
  datos,
  calcular: (d) => (d.area > 0 ? d : null),
  utilizaciones: (d) => ({ resiste: 10 / d.area, otra: d.area / d.otra }),
  nombres: { resiste: "resistencia", otra: "otra comprobación" },
});
const subirArea: Palanca<D> = {
  *candidatos(d) {
    for (const a of pasos(d.area, 1, d.area + 20)) yield { datos: { ...d, area: a }, accion: `área ${a}` };
  },
};

describe("motor de recomendaciones", () => {
  it("con margen no propone nada", () => {
    expect(recomendar(problema({ area: 20, otra: 100 }), "resiste", [subirArea])).toEqual([]);
  });

  it("si falla, propone el primer paso que cumple", () => {
    const [r] = recomendar(problema({ area: 8, otra: 100 }), "resiste", [subirArea]);
    expect(r.accion).toBe("área 10");
    expect(r.utilizacion).toBe(1);
    expect(r.fallanOtras).toEqual([]);
  });

  it("si está justa, busca salir de la zona justa", () => {
    const [r] = recomendar(problema({ area: 10.5, otra: 100 }), "resiste", [subirArea]);
    expect(r.utilizacion).toBeLessThan(AL_LIMITE);
    expect(r.accion).toBe("área 11.5");
  });

  it("avisa qué rompe el cambio y lo pone detrás de los que no rompen nada", () => {
    const romper: Palanca<D> = { candidatos: (d) => [{ datos: { ...d, area: 12, otra: 11 }, accion: "rompe" }] };
    const r = recomendar(problema({ area: 8, otra: 100 }), "resiste", [romper, subirArea]);
    expect(r.map((x) => x.accion)).toEqual(["área 10", "rompe"]);
    expect(r[1].fallanOtras).toEqual(["otra comprobación"]);
  });

  it("no cuenta como rota la que ya fallaba", () => {
    const [r] = recomendar(problema({ area: 8, otra: 5 }), "resiste", [subirArea]);
    expect(r.fallanOtras).toEqual([]);
  });

  it("pasos redondea y corta en el tope", () => {
    expect([...pasos(0.3, 0.05, 0.45)]).toEqual([0.35, 0.4, 0.45]);
  });
});
