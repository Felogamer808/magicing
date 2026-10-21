import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { leerDxf } from "@/lib/dxf/leer";
import { crearProyecto, incorporarPlanta, leerArchivo, armarArchivo } from "@/lib/proyectos/modelo";
import type { PilarCargado, Proyecto } from "@/lib/proyectos/tipos";
import { derivarCargas } from "./cargas";
import { descargasPilotes, diametroSugerido, maximaPorDiametro, modoPilotes } from "./descargas";
import { interpretar } from "./interpretar";
import { piezasDePlanta } from "./proyecto";

const lectura = leerDxf(readFileSync(path.join(__dirname, "..", "dxf", "prueba.dxf"), "utf8"));
const r = interpretar(lectura, { capaContorno: "FUNDACIONES", capaPilotes: "FUNDACIONES", escala: 0.001, zona: 0 })!;
const base = crearProyecto("Prueba");
const planta = incorporarPlanta(base, piezasDePlanta(r, { escala: 0.001, largoPiloteM: 12, materiales: base.materiales }), "prueba.dxf").proyecto;
const conPilar = (p: Proyecto, marca: string, pilar: PilarCargado): Proyecto => ({
  ...p,
  elementos: p.elementos.map((e) => (e.cad?.marca === marca ? { ...e, pilar } : e)),
});

/** Tabla de prueba, no de una pilotera real. */
const tabla = [
  { diametroM: 0.4, cargaKN: 220 },
  { diametroM: 0.5, cargaKN: 300 },
  { diametroM: 0.6, cargaKN: 400 },
];

const cargado = derivarCargas({
  ...conPilar(conPilar(planta, "CT9-1", { gKN: 400, qKN: 100 }), "CT9-2", { gKN: 300, qKN: 50 }),
  pilotes: { capacidades: tabla },
});
const fila = (marca: string) => descargasPilotes(cargado).find((d) => d.marca === marca)!;

describe("descargas a pilotes", () => {
  it("sin definir, el modo es sólo descargas", () => {
    expect(modoPilotes(planta)).toBe("descargas");
    expect(modoPilotes({ ...planta, pilotes: { modo: "verificar" } })).toBe("verificar");
  });

  /** CT9-1: (400 + 100 + 27) / 2 = 263,5. Con ⌀500 toma 300; el ⌀400 (220) no alcanza. */
  it("da la descarga de cada pilote, lo que toma su diámetro y el más chico que alcanza", () => {
    expect(fila("CT9-1-P1")).toMatchObject({ bajo: "CT9-1", diametroM: 0.5, nkKN: 263.5, admisibleKN: 300, sugeridoM: 0.5 });
  });

  /** CT9-2: (300 + 50 + 27) / 2 = 188,5: alcanza un ⌀400. */
  it("sugiere un diámetro más chico si alcanza", () => {
    expect(fila("CT9-2-P2")).toMatchObject({ nkKN: 188.5, sugeridoM: 0.4 });
  });

  it("sin cargas en el pilar, no hay descarga ni sugerencia", () => {
    expect(fila("CT2-P1")).toMatchObject({ nkKN: null, sugeridoM: null });
  });

  it("ningún diámetro alcanza: no sugiere", () => {
    expect(diametroSugerido(tabla, 450)).toBeNull();
  });

  it("resume la descarga máxima por diámetro", () => {
    expect(maximaPorDiametro(descargasPilotes(cargado))).toEqual([{ diametroM: 0.5, cantidad: 5, maximaKN: 263.5 }]);
  });

  it("el modo y la tabla sobreviven a exportar e importar", () => {
    const p = { ...cargado, pilotes: { modo: "verificar" as const, capacidades: tabla } };
    const leido = leerArchivo(JSON.stringify(armarArchivo([p])));
    expect(leido.ok).toBe(true);
    expect(leido.proyectos[0].pilotes).toEqual(p.pilotes);
  });
});
