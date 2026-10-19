import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { leerDxf, type Punto } from "@/lib/dxf/leer";
import { ENDEREZAR_GRADOS, enderezar, exportarParaRevit, FORMATO_EXPORTACION, numerarMarcas } from "./exportar";
import { interpretar } from "./interpretar";

const lectura = leerDxf(readFileSync(path.join(__dirname, "..", "dxf", "prueba.dxf"), "utf8"));
const r = interpretar(lectura, { capaContorno: "FUNDACIONES", capaPilotes: "FUNDACIONES", escala: 0.001, zona: 0 })!;
const opciones = { escala: 0.001, largoPiloteM: 12, penetracionPiloteM: 0.1, desniveles: {}, archivo: "prueba.dxf" };

describe("exportarParaRevit", () => {
  const x = exportarParaRevit(r, opciones);

  it("declara formato, versión y unidad", () => {
    expect(x.formato).toBe(FORMATO_EXPORTACION);
    expect(x.version).toBe(1);
    expect(x.unidad).toBe("m");
    expect(x.archivo).toBe("prueba.dxf");
  });

  /** Origen a origen: la coordenada del CAD pasada a metros, sin corrimiento. */
  it("pasa todo a metros con las coordenadas del CAD", () => {
    const ct9 = x.cabezales.find((c) => c.centro[0] === 6);
    expect(ct9).toMatchObject({ nombre: "CT9", canto: 0.75, cotaSuperior: 0 });
    expect([ct9!.largo, ct9!.ancho].sort()).toEqual([0.8, 1.8]);
    const vr4 = x.vigas[0];
    expect(vr4).toMatchObject({ nombre: "VR4", ancho: 0.35, alto: 0.6, cotaSuperior: 0 });
    expect([vr4.inicio[0], vr4.fin[0]].sort((a, b) => a - b)).toEqual([0.9, 5.1]);
  });

  /**
   * "CT9 (1800x800x750)": en la familia, `#Ancho` es la primera medida y
   * `Length` la segunda. Los CT9 de prueba tienen los 1800 a lo largo de X.
   */
  it("dice qué lado del cabezal es la primera medida del rótulo y hacia dónde va", () => {
    const ct9 = x.cabezales.find((c) => c.centro[0] === 6)!;
    expect([ct9.a, ct9.b]).toEqual([1.8, 0.8]);
    expect(ct9.giroLadoA % 180).toBeCloseTo(0, 6);
  });

  /** Cara superior en 0, canto 0,75, la cabeza 10 cm adentro: −0,65. */
  it("pone la cabeza de cada pilote 10 cm dentro de la pieza que tiene encima", () => {
    expect(x.pilotes).toHaveLength(5);
    for (const p of x.pilotes) {
      expect(p.cotaCabeza).toBe(-0.65);
      expect(p.largo).toBe(12);
      expect(p.diametro).toBe(0.5);
      expect(p.bajo).toMatch(/^CT/);
    }
  });

  /** El CT14 de la planta real iba 1,30 m más abajo: sus pilotes bajan con él. */
  it("un cabezal con desnivel baja su cara superior y sus pilotes", () => {
    const i = r.cabezales.findIndex((c) => c.nombre === "CT2");
    const y = exportarParaRevit(r, { ...opciones, desniveles: { [i]: -1.3 } });
    expect(y.cabezales[i].cotaSuperior).toBe(-1.3);
    const piloteCT2 = y.pilotes.find((p) => p.bajo === "CT2");
    expect(piloteCT2?.cotaCabeza).toBe(-1.95);
  });

  it("lleva los avisos de la pantalla", () => {
    expect(x.avisos.some((a) => a.startsWith("CT2: dibujado"))).toBe(true);
  });

  /** Los dos CT9 de prueba se numeran; el CT2, que es único, queda igual. */
  it("numera las marcas que se repiten y deja las únicas", () => {
    expect(x.cabezales.map((c) => c.marca).sort()).toEqual(["CT2", "CT9-1", "CT9-2"]);
    expect(x.vigas[0].marca).toBe("VR4");
  });
});

describe("numerarMarcas", () => {
  /** Orden de lectura: de arriba abajo y, en la misma altura, de izquierda a derecha. */
  it("numera en orden de lectura de la planta", () => {
    const marcas = numerarMarcas([
      { nombre: "CT9", centro: [10, 0] },
      { nombre: "CT9", centro: [0, 5] },
      { nombre: "CT5", centro: [3, 3] },
      { nombre: "CT9", centro: [0, 0] },
    ]);
    expect(marcas).toEqual(["CT9-3", "CT9-1", "CT5", "CT9-2"]);
  });
});

describe("enderezar", () => {
  const largo = (a: Punto, b: Punto) => Math.hypot(b[0] - a[0], b[1] - a[1]);

  /** Como VR27 del REV08: 0,018° sobre 5,8 m. Revit avisa "slightly off axis". */
  it("endereza un error de dibujo sobre su punto medio, sin cambiar el largo", () => {
    const desvio = (0.018 * Math.PI) / 180;
    const ini: Punto = [10, 20];
    const fin: Punto = [10 + 5.8 * Math.cos(desvio), 20 + 5.8 * Math.sin(desvio)];
    const [a, b] = enderezar(ini, fin);
    expect(a[1]).toBeCloseTo(b[1], 12);
    expect(a[1]).toBeCloseTo((ini[1] + fin[1]) / 2, 12);
    expect(largo(a, b)).toBeCloseTo(5.8, 12);
  });

  it("también cerca de Y y en sentido contrario", () => {
    const [a, b] = enderezar([0, 0], [-0.001, -4]);
    expect(a[0]).toBeCloseTo(b[0], 12);
    expect(b[1]).toBeLessThan(a[1]);
  });

  /** Como VC5, VR8 o VR15: ~0,3°, puede ser a propósito. */
  it("no toca las vigas inclinadas a propósito", () => {
    const desvio = (ENDEREZAR_GRADOS * 2 * Math.PI) / 180;
    const fin: Punto = [6 * Math.cos(desvio), 6 * Math.sin(desvio)];
    expect(enderezar([0, 0], fin)).toEqual([[0, 0], fin]);
  });
});
