import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { leerDxf } from "@/lib/dxf/leer";
import { calcularCimentacion } from "@/lib/mcp/cimentaciones";
import { crearProyecto, incorporarPlanta } from "@/lib/proyectos/modelo";
import type { ElementoProyecto, PilarCargado, Proyecto } from "@/lib/proyectos/tipos";
import { derivarCargas, ndPilar, reaccionPalanca } from "./cargas";
import { interpretar } from "./interpretar";
import { piezasDePlanta } from "./proyecto";

const lectura = leerDxf(readFileSync(path.join(__dirname, "..", "dxf", "prueba.dxf"), "utf8"));
const r = interpretar(lectura, { capaContorno: "FUNDACIONES", capaPilotes: "FUNDACIONES", escala: 0.001, zona: 0 })!;
const base = crearProyecto("Prueba");
const piezas = piezasDePlanta(r, { escala: 0.001, largoPiloteM: 12, materiales: base.materiales });
const planta = incorporarPlanta(base, piezas, "prueba.dxf").proyecto;

const elemento = (p: Proyecto, marca: string) => p.elementos.find((e) => e.cad?.marca === marca) as ElementoProyecto;
const campos = (p: Proyecto, marca: string) => elemento(p, marca).calculos[0].campos;
const conPilar = (p: Proyecto, marca: string, pilar: PilarCargado): Proyecto => ({
  ...p,
  elementos: p.elementos.map((e) => (e.cad?.marca === marca ? { ...e, pilar } : e)),
});

describe("derivarCargas", () => {
  const cargado = derivarCargas({
    ...conPilar(
      conPilar(conPilar(planta, "CT9-1", { gKN: 400, qKN: 100, ladoPilotesM: 0.3 }), "CT9-2", { gKN: 300, qKN: 50 }),
      "CT2",
      { gKN: 400, qKN: 100, ladoPilotesM: 0.3, ladoTransversalM: 0.4 }
    ),
    suelo: { friccionKNm2: 30, puntaKNm2: 800, factorSeguridad: 2.5 },
  });

  /** 1,35·400 + 1,5·100 = 690. */
  it("al cabezal va el Nd del pilar y el lado del pilar en la dirección de los pilotes", () => {
    expect(ndPilar({ gKN: 400, qKN: 100 })).toBeCloseTo(690, 9);
    expect(campos(cargado, "CT9-1")).toMatchObject({ ndPilar: "690", anchoPilar: "0.3" });
  });

  /** Envolvente de Robot con viento: gana sobre 1,35·G + 1,5·Q; el Nk de los pilotes no cambia. */
  it("con Nd a mano, el cabezal y las vigas usan ese y los pilotes siguen con G + Q", () => {
    expect(ndPilar({ gKN: 400, qKN: 100, ndKN: 900 })).toBe(900);
    const conNd = derivarCargas(conPilar(cargado, "CT9-1", { gKN: 400, qKN: 100, ladoPilotesM: 0.3, ndKN: 900 }));
    expect(campos(conNd, "CT9-1").ndPilar).toBe("900");
    expect(campos(conNd, "CT9-1-P1").Nk).toBe("263.5");
    const extremos = elemento(conNd, "VR4").cad!.extremos!;
    const vr = campos(conNd, "VR4");
    expect(extremos[0] === "CT9-1" ? vr.n1d : vr.n2d).toBe("900");
  });

  it("con Nd a mano y sin G ni Q, el cabezal ya tiene su Nd", () => {
    expect(ndPilar({ ndKN: 750 })).toBe(750);
  });

  it("al cabezal de 1 pilote, el Nd y los dos lados del pilar", () => {
    expect(campos(cargado, "CT2")).toMatchObject({ ndPilar: "690", pilarX: "0.3", pilarY: "0.4" });
  });

  /** CT9 de 1,8 × 0,8 × 0,75: 27 kN de peso propio. (400 + 100 + 27) / 2 = 263,5. */
  it("a cada pilote, G + Q + peso propio del cabezal repartido, y el suelo del proyecto", () => {
    for (const marca of ["CT9-1-P1", "CT9-1-P2"]) {
      expect(campos(cargado, marca)).toMatchObject({ Nk: "263.5", friccion: "30", punta: "800", factorSeguridad: "2.5" });
    }
  });

  /** CT9-2: 1,35·300 + 1,5·50 = 480. */
  it("a la viga de atado, los Nd de los pilares de sus extremos", () => {
    const extremos = elemento(cargado, "VR4").cad!.extremos!;
    const nd = (m: string | null) => (m === "CT9-1" ? "690" : "480");
    expect(campos(cargado, "VR4")).toMatchObject({ n1d: nd(extremos[0]), n2d: nd(extremos[1]) });
  });

  it("sin cargas, los campos derivados quedan vacíos y la pieza no se evalúa", () => {
    const sin = derivarCargas(planta);
    expect(campos(sin, "CT9-1").ndPilar).toBe("");
    expect(campos(sin, "CT9-1-P1").Nk).toBe("");
  });

  /** Si se borra una carga, el valor viejo no se queda: deja de corresponder. */
  it("al quitar la carga, borra el valor derivado que había", () => {
    const sinCarga = derivarCargas(conPilar(cargado, "CT9-1", { ladoPilotesM: 0.3 }));
    expect(campos(sinCarga, "CT9-1").ndPilar).toBe("");
    expect(campos(sinCarga, "CT9-1-P1").Nk).toBe("");
  });

  it("no toca la geometría ni la armadura", () => {
    expect(campos(cargado, "CT9-1")).toMatchObject({ ladoX: "1.8", hCab: "0.75", nPrinc: "" });
  });

  it("no cambia nada si ya está todo derivado", () => {
    expect(derivarCargas(cargado)).toBe(cargado);
  });

  /** Con armadura cargada a mano, el cabezal ya se puede calcular. */
  it("con cargas y armadura, el cabezal se evalúa", () => {
    const c = {
      ...campos(cargado, "CT9-1"),
      ...{ nPrinc: "7", phiPrinc: "16", nSec: "7", phiSec: "10", nEstV: "10", phiEstV: "8", nCercos: "2", nEstH: "5", phiEstH: "10" },
    };
    expect(calcularCimentacion("cabezales", c).ok).toBe(true);
  });

  it("con cargas y cercos, el cabezal de 1 pilote se evalúa", () => {
    const c = { ...campos(cargado, "CT2"), nCercosSup: "3", phiCercosSup: "10", nCercosInf: "3", phiCercosInf: "12" };
    expect(calcularCimentacion("cabezal-un-pilote", c).ok).toBe(true);
  });
});

/**
 * VC1 de CT6 (nodo, pilote en x = −1 m) a CT9-1 (centro en x = 0), como en
 * proyecto.test.ts: l − e = 1 m, viga 0,35 × 0,6.
 */
describe("derivarCargas con una viga centradora", () => {
  const conNodo = {
    ...r,
    pilotes: [...r.pilotes, { centro: [-1000, 0] as [number, number], diametro: 500 }],
    nodos: [{ nombre: "CT6", rotulo: [0, 0] as [number, number], pilotes: [5] }],
    vigas: [...r.vigas, { ...r.vigas[0], nombre: "VC1", inicio: [-2000, 0] as [number, number], fin: [0, 0] as [number, number] }],
  };
  const conVC = incorporarPlanta(base, piezasDePlanta(conNodo, { escala: 0.001, largoPiloteM: 12, materiales: base.materiales }), "prueba.dxf").proyecto;
  const conE = (p: Proyecto, e: string): Proyecto => ({
    ...p,
    elementos: p.elementos.map((x) =>
      x.cad?.marca === "VC1" ? { ...x, calculos: x.calculos.map((c) => ({ ...c, campos: { ...c.campos, excentricidad: e } })) } : x
    ),
  });
  const cargado = derivarCargas(conE(conPilar(conVC, "CT6", { gKN: 400, qKN: 100 }), "0.5"));
  const piloteCT6 = elemento(cargado, "VC1").cad!.extremos![0] + "-P1";

  it("N₁d es el Nd del pilar medianero", () => {
    expect(elemento(cargado, "VC1").cad!.extremos).toEqual(["CT6", "CT9-1"]);
    expect(campos(cargado, "VC1").n1d).toBe("690");
  });

  /**
   * R₁ = (500·1,5 + 25·0,35·0,6·1,5²/2)/1 = 750 + 5,906 = 755,9 kN. En el nodo
   * no hay cabezal: va entero a su pilote.
   */
  it("el pilote medianero recibe la reacción de la palanca", () => {
    expect(reaccionPalanca(500, { excentricidadM: 0.5, luzApoyosM: 1, qKNm: 5.25 })).toBeCloseTo(755.906, 3);
    expect(campos(cargado, piloteCT6).Nk).toBe("755.9");
  });

  it("sin e cargada, el pilote sigue con G + Q", () => {
    const sinE = derivarCargas(conE(conPilar(conVC, "CT6", { gKN: 400, qKN: 100 }), ""));
    expect(campos(sinE, piloteCT6).Nk).toBe("500");
  });

  it("con e y armadura, la centradora se evalúa", () => {
    const c = {
      ...campos(cargado, "VC1"),
      ...{ ladoPilar: "0.3", numeroSup: "4", diametroSup: "16", numeroInf: "3", diametroInf: "12", diametroEstribo: "8", numeroRamas: "2" },
    };
    expect(calcularCimentacion("viga-centradora-pilotes", c).ok).toBe(true);
  });
});
