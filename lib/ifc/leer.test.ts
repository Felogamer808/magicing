import { readFileSync } from "fs";
import path from "path";
import { beforeAll, describe, expect, it } from "vitest";
import { leerIfc, type LecturaIfc } from "@/lib/ifc/leer";
import { crearProyecto, incorporarIfc } from "@/lib/proyectos/modelo";

/**
 * `prueba.ifc` está escrito a mano, en mm como exporta Revit: dos niveles,
 * una viga, dos pilares (uno circular), una losa, un muro, una zapata, una
 * riostra sin Name y fuera de los niveles, una puerta y un GlobalId repetido.
 * Más una viga armada como la exporta Revit (VR4), que es la que dejó a la
 * vista que el perfil no siempre se apoya igual.
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
      "IfcBeam",
      "IfcColumn",
      "IfcColumn",
      "IfcFooting",
      "IfcFooting",
      "IfcMember",
      "IfcPile",
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

  describe("una viga exportada por Revit", () => {
    /** El Name de Revit es "Familia:Tipo:Id"; en los planos la pieza se llama por su Marca. */
    it("se nombra por su Marca, no por el Name", () => {
      const viga = lectura.elementos.find((e) => e.globalId === "1Yb3lFz0j4_O9qWUcQ7vF2");
      expect(viga?.nombre).toBe("VR4");
      expect(viga?.nivel).toBe("Nivel 2");
    });

    /**
     * Revit apoya el perfil con su X vertical: XDim = 450 es la altura. Leer
     * XDim como ancho daba 0,45 × 0,30, al revés. Y el recorte (Clipping) no
     * tiene que dejarla sin sección.
     */
    it("da ancho × alto según qué lado del perfil queda vertical, aunque esté recortada", () => {
      expect(por("VR4")?.seccion).toEqual({ tipo: "rectangular", anchoM: 0.3, altoM: 0.45 });
    });
  });

  /**
   * Revit 2026, con la configuración de la oficina, exportó cabezales y
   * pilotes como IfcSlab BASESLAB aunque sus familias declaran IfcExportAs.
   * Sin esto el pilote figuraba como losa de 10 m de "espesor".
   */
  describe("piezas que Revit exporta con otra clase de la que declaran", () => {
    it("toma la clase de IfcExportAs", () => {
      expect(por("P01")?.clase).toBe("IfcPile");
      expect(por("CT5")?.clase).toBe("IfcFooting");
      // Reutiliza la geometría de Z-1 en el archivo de prueba: 600 de canto.
      expect(por("CT5")?.seccion).toEqual({ tipo: "espesor", espesorM: 0.6 });
    });

    it("si la geometría es una malla, la sección sale del parámetro de la familia", () => {
      expect(por("P01")?.seccion).toEqual({ tipo: "circular", diametroM: 0.4 });
    });
  });

  it("al incorporarlo a un proyecto, el GlobalId repetido entra una sola vez", () => {
    const r = incorporarIfc(crearProyecto("Prueba"), lectura.elementos);
    expect(r.proyecto.elementos).toHaveLength(10);
    expect(r.yaEstaban).toBe(0);
    expect(r.repetidos).toBe(1);
    expect(r.creados).toEqual({
      IfcBeam: 2,
      IfcColumn: 2,
      IfcSlab: 1,
      IfcWall: 1,
      IfcFooting: 2,
      IfcPile: 1,
      IfcMember: 1,
    });
    // Lo que se lee para la geometría no se guarda en el proyecto.
    expect(r.proyecto.elementos[0]).not.toHaveProperty("expressId");
  });
});
