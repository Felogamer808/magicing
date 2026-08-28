import { describe, expect, it } from "vitest";
import { calcularTorsionViga } from "@/lib/calc/estatica/torsion-viga";

describe("calcularTorsionViga", () => {
  it("par puntual en la punta: torsor constante en todo el vuelo", () => {
    const r = calcularTorsionViga({ largoM: 4, cargas: [{ tipo: "puntual", xM: 4, torsorKNm: 10 }] });
    expect(r.reaccionApoyoKNm).toBeCloseTo(10, 9);
    expect(r.torsorMax.valor).toBeCloseTo(10, 9);
    expect(r.puntos.every((p) => Math.abs(p.torsorKNm - 10) < 1e-9)).toBe(true);
  });

  it("par puntual a mitad de camino: cae a cero después del punto de aplicación", () => {
    const r = calcularTorsionViga({ largoM: 4, cargas: [{ tipo: "puntual", xM: 2, torsorKNm: 10 }] });
    expect(r.reaccionApoyoKNm).toBeCloseTo(10, 9);

    const antes = r.puntos.filter((p) => p.xM === 2);
    expect(antes.map((p) => p.torsorKNm).sort((a, b) => a - b)).toEqual([0, 10]);

    const enLaPunta = r.puntos.find((p) => p.xM === 4)!;
    expect(enLaPunta.torsorKNm).toBeCloseTo(0, 9);
  });

  it("carga repartida en todo el vuelo: torsor lineal, máximo en el empotramiento", () => {
    const r = calcularTorsionViga({
      largoM: 4,
      cargas: [{ tipo: "repartida", desdeM: 0, hastaM: 4, torsorPorMetroKNmM: 5 }],
    });
    expect(r.reaccionApoyoKNm).toBeCloseTo(20, 9);
    expect(r.torsorMax.valor).toBeCloseTo(20, 9);
    expect(r.puntos.find((p) => p.xM === 4)!.torsorKNm).toBeCloseTo(0, 9);
  });

  it("carga repartida en un tramo interior: constante antes, lineal dentro, cero después", () => {
    const r = calcularTorsionViga({
      largoM: 4,
      cargas: [{ tipo: "repartida", desdeM: 1, hastaM: 3, torsorPorMetroKNmM: 5 }],
    });
    expect(r.reaccionApoyoKNm).toBeCloseTo(10, 9);
    expect(r.puntos.find((p) => p.xM === 1 && p.torsorKNm > 5)!.torsorKNm).toBeCloseTo(10, 9);
    expect(r.puntos.find((p) => p.xM === 3)!.torsorKNm).toBeCloseTo(0, 9);
    expect(r.puntos.find((p) => p.xM === 4)!.torsorKNm).toBeCloseTo(0, 9);
  });

  describe("apoyada-simetrica", () => {
    it("par puntual en el centro: cada apoyo toma la mitad, con signo opuesto", () => {
      const r = calcularTorsionViga(
        { largoM: 4, cargas: [{ tipo: "puntual", xM: 2, torsorKNm: 10 }] },
        "apoyada-simetrica"
      );
      expect(r.reaccionApoyoKNm).toBeCloseTo(5, 9);
      expect(r.torsorMax.valor).toBeCloseTo(5, 9);

      const enElCentro = r.puntos.filter((p) => p.xM === 2).map((p) => p.torsorKNm).sort((a, b) => a - b);
      expect(enElCentro).toEqual([-5, 5]);

      expect(r.puntos.find((p) => p.xM === 0)!.torsorKNm).toBeCloseTo(5, 9);
      expect(r.puntos.find((p) => p.xM === 4)!.torsorKNm).toBeCloseTo(-5, 9);
    });

    it("carga repartida en todo el tramo: torsor lineal y antisimétrico, cero en el centro", () => {
      const r = calcularTorsionViga(
        { largoM: 4, cargas: [{ tipo: "repartida", desdeM: 0, hastaM: 4, torsorPorMetroKNmM: 5 }] },
        "apoyada-simetrica"
      );
      expect(r.reaccionApoyoKNm).toBeCloseTo(10, 9);
      expect(r.puntos.find((p) => p.xM === 0)!.torsorKNm).toBeCloseTo(10, 9);
      expect(r.puntos.find((p) => p.xM === 4)!.torsorKNm).toBeCloseTo(-10, 9);
      // Recta entre los dos extremos: cruza por cero exactamente en el centro.
      expect(r.puntos).toHaveLength(2);
    });
  });
});
