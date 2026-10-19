import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { leerDxf } from "@/lib/dxf/leer";
import { estadoDeElemento } from "@/lib/proyectos/estado";
import { armarArchivo, crearProyecto, incorporarPlanta, leerArchivo } from "@/lib/proyectos/modelo";
import type { ElementoProyecto, Proyecto } from "@/lib/proyectos/tipos";
import { interpretar } from "./interpretar";
import { A_MANO, estadosDePlanta, marcasDePlanta, piezasDePlanta } from "./proyecto";

const lectura = leerDxf(readFileSync(path.join(__dirname, "..", "dxf", "prueba.dxf"), "utf8"));
const r = interpretar(lectura, { capaContorno: "FUNDACIONES", capaPilotes: "FUNDACIONES", escala: 0.001, zona: 0 })!;
const materiales = { fckMPa: 30, fykMPa: 500, recubrimientoM: 0.05 };
const piezas = piezasDePlanta(r, { escala: 0.001, largoPiloteM: 12, materiales });
const pieza = (marca: string) => piezas.find((p) => p.origen.marca === marca)!;

describe("piezasDePlanta", () => {
  it("lleva cada pieza con la marca que va a Revit", () => {
    expect(piezas.map((p) => p.origen.marca).sort()).toEqual(
      ["CT2", "CT2-P1", "CT9-1", "CT9-1-P1", "CT9-1-P2", "CT9-2", "CT9-2-P1", "CT9-2-P2", "VR4"].sort()
    );
  });

  /** CT9 (1800x800x750) con los dos pilotes a lo largo de los 1800. */
  it("un cabezal de 2 pilotes va a la verificación de cabezales con su geometría", () => {
    const ct9 = pieza("CT9-1");
    expect(ct9.verificacion).toBe("cabezales");
    expect(ct9.geometria).toEqual({ ladoX: "1.8", ladoY: "0.8", hCab: "0.75", dPilote: "0.5" });
    expect(ct9.materiales).toEqual({ fck: "30", fyk: "500", rg: "0.05" });
    expect(ct9.origen.medidasM?.map((x) => Math.round(x * 1000) / 1000).sort()).toEqual([0.75, 0.8, 1.8]);
  });

  it("un cabezal de 1 pilote va a su verificación, con x según el largo del cabezal", () => {
    const ct2 = pieza("CT2");
    expect(ct2.verificacion).toBe("cabezal-un-pilote");
    expect(ct2.origen.sinVerificacion).toBeUndefined();
    const [largo, ancho, canto] = ct2.origen.medidasM!.map((x) => String(Math.round(x * 1000) / 1000));
    expect(ct2.geometria).toMatchObject({ ladoX: largo, ladoY: ancho, hCab: canto });
    expect(ct2.aMano).toEqual(A_MANO["cabezal-un-pilote"]);
  });

  /** VR4 de cara a cara entre los dos CT9: de x = 0,9 a x = 5,1. */
  it("una riostra va a viga de atado, con la luz de cara a cara y los cabezales que ata", () => {
    const vr4 = pieza("VR4");
    expect(vr4.verificacion).toBe("viga-atado");
    expect(vr4.geometria).toMatchObject({ b: "0.35", h: "0.6", luz: "4.2" });
    expect(Number(vr4.geometria.distanciaEjes)).toBeGreaterThan(4.2);
    expect(vr4.origen.extremos?.slice().sort()).toEqual(["CT9-1", "CT9-2"]);
  });

  /**
   * Una centradora pasa por encima del pilote del pilar (nodo CT6/7/8) y
   * sigue: el nodo se encuentra a lo largo de la viga, no sólo en la punta.
   */
  it("encuentra el nodo de pilar sobre viga aunque la viga siga más allá del pilote", () => {
    const nodo = { nombre: "CT6", rotulo: [0, 0] as [number, number], pilotes: [5] };
    const conNodo = {
      ...r,
      pilotes: [...r.pilotes, { centro: [-1000, 0] as [number, number], diametro: 500 }],
      nodos: [nodo],
      vigas: [{ ...r.vigas[0], nombre: "VC1", inicio: [-2000, 0] as [number, number], fin: [0, 0] as [number, number] }],
    };
    const vc = piezasDePlanta(conNodo, { escala: 0.001, largoPiloteM: 12, materiales }).find((p) => p.origen.marca === "VC1")!;
    expect(vc.origen.extremos?.[0]).toBe("CT6");
    expect(vc.verificacion).toBe("viga-centradora-pilotes");
  });

  /**
   * La misma VC1: de CT6 (pilote en x = −1 m) a CT9-1 (centro en x = 0). La
   * viga sobresale 1 m más allá del pilote de CT6 y nada más allá del centro
   * de CT9-1: CT6 es el medianero, se dibuje la viga en un sentido o en el otro.
   * l − e = del pilote de CT6 al centro de CT9-1 = 1 m.
   */
  it("una centradora va a su verificación, con el medianero primero y l − e del plano", () => {
    for (const [inicio, fin] of [[[-2000, 0], [0, 0]], [[0, 0], [-2000, 0]]] as [number, number][][]) {
      const conNodo = {
        ...r,
        pilotes: [...r.pilotes, { centro: [-1000, 0] as [number, number], diametro: 500 }],
        nodos: [{ nombre: "CT6", rotulo: [0, 0] as [number, number], pilotes: [5] }],
        vigas: [{ ...r.vigas[0], nombre: "VC1", inicio: inicio as [number, number], fin: fin as [number, number] }],
      };
      const vc = piezasDePlanta(conNodo, { escala: 0.001, largoPiloteM: 12, materiales }).find((p) => p.origen.marca === "VC1")!;
      expect(vc.origen.extremos).toEqual(["CT6", "CT9-1"]);
      expect(vc.geometria).toEqual({ b: "0.35", h: "0.6", luzApoyos: "1", dPilote: "0.5" });
      expect(vc.aMano).toEqual(A_MANO["viga-centradora-pilotes"]);
      expect(vc.materiales.eacc).toBe("0.1");
    }
  });

  it("una centradora sin pieza en un extremo queda no evaluable", () => {
    const sola = { ...r, vigas: [{ ...r.vigas[0], nombre: "VC1", inicio: [20000, 20000] as [number, number], fin: [22000, 20000] as [number, number] }] };
    const vc = piezasDePlanta(sola, { escala: 0.001, largoPiloteM: 12, materiales }).find((p) => p.origen.marca === "VC1")!;
    expect(vc.verificacion).toBeUndefined();
    expect(vc.origen.sinVerificacion).toMatch(/centradora/);
  });

  it("cada pilote, con el largo elegido y la pieza que tiene encima", () => {
    const p = pieza("CT9-1-P2");
    expect(p.verificacion).toBe("pilotes");
    expect(p.geometria).toEqual({ diametro: "0.5", longitud: "12" });
    expect(p.origen.bajo).toBe("CT9-1");
  });
});

describe("incorporarPlanta", () => {
  const vacio = crearProyecto("Prueba");
  const { proyecto, creados } = incorporarPlanta(vacio, piezas, "prueba.dxf");
  const elemento = (p: Proyecto, marca: string) => p.elementos.find((e) => e.cad?.marca === marca) as ElementoProyecto;

  it("crea un elemento por pieza", () => {
    expect(proyecto.elementos).toHaveLength(9);
    expect(creados).toEqual({ cabezal: 3, viga: 1, pilote: 5 });
    expect(elemento(proyecto, "VR4").cad?.archivo).toBe("prueba.dxf");
  });

  /**
   * Lo que se carga a mano entra vacío: con el valor por defecto, el CT9
   * diría "verifica" o "no verifica" con una armadura que nadie cargó.
   */
  it("deja vacío lo que se carga a mano, así no calcula con valores por defecto", () => {
    const calculo = elemento(proyecto, "CT9-1").calculos[0];
    for (const clave of A_MANO.cabezales) expect(calculo.campos[clave]).toBe("");
    expect(estadoDeElemento(elemento(proyecto, "CT9-1"))).toBe("no-evaluable");
  });

  it("una pieza sin verificación es no evaluable, no pendiente", () => {
    const ct2 = elemento(proyecto, "CT2");
    const sinVerificacion = { ...ct2, calculos: [], cad: { ...ct2.cad!, sinVerificacion: "Cabezal de 4 pilotes" } };
    expect(estadoDeElemento(sinVerificacion)).toBe("no-evaluable");
  });

  it("el cabezal de 1 pilote entra con los campos a mano vacíos", () => {
    const calculo = elemento(proyecto, "CT2").calculos[0];
    expect(calculo.verificacion).toBe("cabezal-un-pilote");
    for (const clave of A_MANO["cabezal-un-pilote"]) expect(calculo.campos[clave]).toBe("");
    expect(estadoDeElemento(elemento(proyecto, "CT2"))).toBe("no-evaluable");
  });

  /** Otra revisión del plano: el canto cambia, la armadura cargada se queda. */
  it("volver a traer la planta actualiza la geometría y respeta lo cargado a mano", () => {
    const conArmadura: Proyecto = {
      ...proyecto,
      elementos: proyecto.elementos.map((e) =>
        e.cad?.marca === "CT9-1"
          ? { ...e, calculos: [{ ...e.calculos[0], campos: { ...e.calculos[0].campos, nPrinc: "7", phiPrinc: "16" } }] }
          : e
      ),
    };
    const rev = piezas.map((p) =>
      p.origen.marca === "CT9-1" ? { ...p, geometria: { ...p.geometria, hCab: "0.9" } } : p
    );
    const otra = incorporarPlanta(conArmadura, rev, "prueba-rev2.dxf");
    expect(otra.proyecto.elementos).toHaveLength(9);
    expect(otra.creados).toEqual({});
    expect(otra.actualizados).toBe(9);
    const campos = elemento(otra.proyecto, "CT9-1").calculos[0].campos;
    expect(campos).toMatchObject({ hCab: "0.9", nPrinc: "7", phiPrinc: "16" });
    expect(elemento(otra.proyecto, "CT9-1").cad?.archivo).toBe("prueba-rev2.dxf");
  });

  it("lo que ya no está en la planta no se borra: se informa", () => {
    const sinCT2 = piezas.filter((p) => !p.origen.marca.startsWith("CT2"));
    const otra = incorporarPlanta(proyecto, sinCT2, "prueba.dxf");
    expect(otra.proyecto.elementos).toHaveLength(9);
    expect(otra.yaNoEstan.sort()).toEqual(["CT2", "CT2-P1"]);
  });

  it("da el estado de cada pieza de la planta, buscándola por su marca", () => {
    const marcas = marcasDePlanta(r);
    const armado = {
      ...proyecto,
      elementos: proyecto.elementos.map((e) =>
        e.cad?.marca === "CT9-1"
          ? {
              ...e,
              calculos: [
                {
                  ...e.calculos[0],
                  campos: {
                    ...e.calculos[0].campos,
                    ...{ anchoPilar: "0.3", ndPilar: "690", nPrinc: "7", phiPrinc: "16", nSec: "7", phiSec: "10" },
                    ...{ nEstV: "10", phiEstV: "8", nCercos: "2", nEstH: "5", phiEstH: "10" },
                  },
                },
              ],
            }
          : e
      ),
    };
    const estados = estadosDePlanta(r, armado);
    const de = (marca: string) => estados.cabezales[marcas.cabezales.indexOf(marca)];
    expect(["verifica", "no-verifica"]).toContain(de("CT9-1"));
    expect(de("CT9-2")).toBe("no-evaluable");
    expect(estados.pilotes).toHaveLength(5);
    expect(estadosDePlanta(r, crearProyecto("Vacío")).vigas).toEqual([null]);
  });

  it("el vínculo con el CAD sobrevive a exportar e importar el proyecto", () => {
    const leido = leerArchivo(JSON.stringify(armarArchivo([proyecto])));
    expect(leido.ok).toBe(true);
    expect(elemento(leido.proyectos[0], "VR4").cad).toEqual(elemento(proyecto, "VR4").cad);
  });
});
