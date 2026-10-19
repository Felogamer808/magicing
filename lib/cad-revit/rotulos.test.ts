import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { leerDxf } from "@/lib/dxf/leer";
import { capasConCirculos, pilotes, reconocerRotulo, rotulos, sugerirEscala } from "./rotulos";

const lectura = leerDxf(readFileSync(path.join(__dirname, "..", "dxf", "prueba.dxf"), "utf8"));

describe("reconocerRotulo", () => {
  it("cabezal con medidas: planta y canto", () => {
    expect(reconocerRotulo("CT9 (1800x800x750)\nN.S.C.:", [0, 0])).toMatchObject({
      tipo: "cabezal",
      nombre: "CT9",
      medidas: [1800, 800, 750],
    });
  });

  /** CT6, CT7 y CT8 de la planta real: pilar sobre viga con pilotes, sin medidas propias. */
  it("cabezal sin medidas", () => {
    const r = reconocerRotulo("CT6", [0, 0]);
    expect(r).toMatchObject({ tipo: "cabezal", nombre: "CT6" });
    expect(r).not.toHaveProperty("medidas");
  });

  it("viga centradora y riostra, con ancho × alto", () => {
    expect(reconocerRotulo("VC1\n1000x600", [0, 0])).toMatchObject({ tipo: "viga", nombre: "VC1", anchoAlto: [1000, 600] });
    expect(reconocerRotulo("VR21 450x550", [0, 0])).toMatchObject({ nombre: "VR21", anchoAlto: [450, 550] });
  });

  it("lo que no es un rótulo de fundación no se reconoce", () => {
    expect(reconocerRotulo("LÍMITE DEL PREDIO", [0, 0])).toBeNull();
    expect(reconocerRotulo("PLANILLA DE VIGAS", [0, 0])).toBeNull();
    expect(reconocerRotulo("P23", [0, 0])).toBeNull();
  });
});

describe("en la planta de prueba", () => {
  it("encuentra los rótulos sin importar la capa", () => {
    expect(rotulos(lectura.entidades).map((r) => r.nombre).sort()).toEqual(["CT9", "CT9", "VR4"]);
  });

  it("los pilotes son los círculos de la capa elegida", () => {
    expect(capasConCirculos(lectura)).toEqual([{ capa: "FUNDACIONES", circulos: 4 }]);
    const p = pilotes(lectura.entidades, "FUNDACIONES");
    expect(p).toHaveLength(4);
    expect(p[0].diametro).toBe(500);
  });

  /** La planta declara metros; un pilote de 500 m no existe, uno de 500 mm sí. */
  it("deduce la unidad de los pilotes, no de lo que declara el archivo", () => {
    expect(lectura.unidadDeclarada).toBe("metros");
    expect(sugerirEscala(pilotes(lectura.entidades, "FUNDACIONES"))).toBe(0.001);
    expect(sugerirEscala([{ centro: [0, 0], diametro: 0.5 }])).toBe(1);
    expect(sugerirEscala([])).toBeNull();
  });
});
