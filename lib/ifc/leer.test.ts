import { readFileSync } from "fs";
import path from "path";
import { beforeAll, describe, expect, it } from "vitest";
import { leerIfc, type LecturaIfc } from "@/lib/ifc/leer";
import { crearProyecto, incorporarIfc } from "@/lib/proyectos/modelo";

/**
 * `prueba.ifc` está escrito a mano, en mm como exporta Revit: dos niveles,
 * una viga, dos pilares (uno circular), una losa, un muro, una zapata, una
 * riostra sin Name y fuera de los niveles, una puerta y un GlobalId repetido.
 */
let lectura: LecturaIfc;

beforeAll(async () => {
  lectura = await leerIfc(new Uint8Array(readFileSync(path.join(__dirname, "prueba.ifc"))));
});

const por = (nombre: string) => lectura.elementos.find((e) => e.nombre === nombre);

describe("leerIfc", () => {
  it("lee sólo los elementos estructurales y cuenta lo que saltea", () => {
    expect(lectura.elementos.map((e) => e.clase).sort()).toEqual([
      "IfcBeam",
      "IfcBeam",
      "IfcColumn",
      "IfcColumn",
      "IfcFooting",
      "IfcMember",
      "IfcSlab",
      "IfcWall",
    ]);
    expect(lectura.salteados).toEqual({ IfcDoor: 1 });
    expect(lectura.sinUnidades).toBe(false);
  });

  it("toma el nivel del IfcBuildingStorey que contiene a cada elemento", () => {
    expect(por("V-101")?.nivel).toBe("Nivel 2");
    expect(por("P-1")?.nivel).toBe("Nivel 1");
    expect(por("L-1")?.nivel).toBe("Nivel 2");
  });

  it("sin Name usa el Tag, y lo que cuelga del edificio queda sin nivel", () => {
    const riostra = lectura.elementos.find((e) => e.clase === "IfcMember");
    expect(riostra?.nombre).toBe("55001");
    expect(riostra?.nivel).toBeUndefined();
    expect(riostra?.seccion).toBeUndefined();
  });

  /** Las secciones vienen en mm: tienen que llegar en m. */
  it("lee las secciones que se pueden leer, en metros", () => {
    expect(por("V-101")?.seccion).toEqual({ tipo: "rectangular", anchoM: 0.2, altoM: 0.5 });
    expect(por("P-1")?.seccion).toEqual({ tipo: "circular", diametroM: 0.3 });
    expect(por("P-2")?.seccion).toEqual({ tipo: "rectangular", anchoM: 0.3, altoM: 0.4 });
    expect(por("L-1")?.seccion).toEqual({ tipo: "espesor", espesorM: 0.2 });
    expect(por("M-1")?.seccion).toEqual({ tipo: "espesor", espesorM: 0.2 });
    expect(por("Z-1")?.seccion).toEqual({ tipo: "espesor", espesorM: 0.6 });
  });

  it("al incorporarlo a un proyecto, el GlobalId repetido entra una sola vez", () => {
    const r = incorporarIfc(crearProyecto("Prueba"), lectura.elementos);
    expect(r.proyecto.elementos).toHaveLength(7);
    expect(r.yaEstaban).toBe(0);
    expect(r.repetidos).toBe(1);
    expect(r.creados).toEqual({
      IfcBeam: 1,
      IfcColumn: 2,
      IfcSlab: 1,
      IfcWall: 1,
      IfcFooting: 1,
      IfcMember: 1,
    });
    // Lo que se lee para la geometría no se guarda en el proyecto.
    expect(r.proyecto.elementos[0]).not.toHaveProperty("expressId");
  });
});
