import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { leerDxf, type LecturaDxf } from "@/lib/dxf/leer";
import { interpretar, opcionesSugeridas, zonas } from "./interpretar";

const lectura = leerDxf(readFileSync(path.join(__dirname, "..", "dxf", "prueba.dxf"), "utf8"));

/**
 * La misma planta repetida 100 m más a la derecha y, a otros 100 m, una
 * "planilla" con un rótulo de viga suelto: como el DXF real, que traía planta
 * de pilotes, de fundaciones y planilla de vigas en el mismo espacio modelo.
 */
function conOtrosDibujos(l: LecturaDxf): LecturaDxf {
  const mover = (dx: number) =>
    l.entidades.map((e) => {
      const m = (p: [number, number]): [number, number] => [p[0] + dx, p[1]];
      switch (e.tipo) {
        case "linea":
          return { ...e, a: m(e.a), b: m(e.b) };
        case "polilinea":
          return { ...e, puntos: e.puntos.map(m) };
        case "circulo":
          return { ...e, centro: m(e.centro) };
        default:
          return { ...e, posicion: m(e.posicion) };
      }
    });
  return {
    ...l,
    entidades: [
      ...l.entidades,
      ...mover(100000),
      { tipo: "texto", capa: "Cotas", posicion: [200000, 0], texto: "VR4 350x600", rotacionGrados: 0 },
    ],
  };
}

describe("opcionesSugeridas", () => {
  it("propone la capa con círculos y la escala que deducen los pilotes", () => {
    expect(opcionesSugeridas(lectura)).toEqual({ capaContorno: "FUNDACIONES", capaPilotes: "FUNDACIONES", escala: 0.001 });
  });
});

describe("zonas", () => {
  it("separa los dibujos que están lejos entre sí", () => {
    const z = zonas(conOtrosDibujos(lectura), "FUNDACIONES", 0.001);
    expect(z).toHaveLength(2);
    expect(z[0].caja.max[0]).toBeLessThan(10000);
    expect(z[1].caja.min[0]).toBeGreaterThan(90000);
  });

  /** En la planta de prueba, el CT2 suelto está a 2,2 m del resto: un cabezal aislado no se pierde. */
  it("un cabezal aislado a un par de metros queda en la misma zona", () => {
    expect(zonas(lectura, "FUNDACIONES", 0.001)).toHaveLength(1);
  });
});

describe("interpretar", () => {
  it("interpreta sólo la zona elegida: no mezcla la otra planta ni la planilla", () => {
    const l = conOtrosDibujos(lectura);
    const o = { capaContorno: "FUNDACIONES", capaPilotes: "FUNDACIONES", escala: 0.001 };
    const r = interpretar(l, { ...o, zona: 0 })!;
    expect(r.cabezales.map((c) => c.nombre).sort()).toEqual(["CT2", "CT9", "CT9"]);
    expect(r.vigas.map((v) => v.nombre)).toEqual(["VR4"]);
    expect(r.cabezales.every((c) => c.rect.centro[0] < 10000)).toBe(true);
    expect(interpretar(l, { ...o, zona: 9 })).toBeNull();
  });
});
