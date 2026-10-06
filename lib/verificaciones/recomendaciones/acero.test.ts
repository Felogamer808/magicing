import { describe, expect, it } from "vitest";
import { parametrosPorDefecto } from "@/lib/calc/acero/perfiles";
import { textoDeParametros } from "@/lib/calc/acero/seccion-campos";
import { resolverFlexionAcero } from "@/lib/calc/acero/resolver-flexion";
import { recomendarCompresionAcero, recomendarFlexionAcero } from "./acero";
import { recomendarSeccionMixta } from "./seccion-mixta";
import { recomendarTornillos } from "./tornillos";
import { recomendarUniones } from "./uniones";
import { DEFORMACION, DOS_CHAPAS, HAY_BLOQUE, HAY_DESLIZAMIENTO, HAY_TRACCION, CLASES, TIPOS_AGUJERO, UBS } from "@/lib/calc/acero/resolver-tornillos";

const PNI = { familia: "PNI", params: JSON.stringify(textoDeParametros(parametrosPorDefecto("PNI"))) };

describe("recomendaciones de metálicas", () => {
  const FLEXION = { ...PNI, lb: "3", cb: "1", fyFlexion: "250", eFlexion: "200000", mRequerido: "40" };

  it("el resolver lee la sección desde los campos guardados", () => {
    expect(resolverFlexionAcero(FLEXION)).not.toBeNull();
    expect(resolverFlexionAcero({ ...FLEXION, params: "{" })).not.toBeNull();
  });

  it("flexión excedida: el PNI siguiente primero, y cumple", () => {
    const r = recomendarFlexionAcero({ ...FLEXION, mRequerido: "45" }).flexion ?? [];
    expect(r[0].accion).toMatch(/^PNI \d+ \(hoy PNI 200\)$/);
    for (const p of r) expect(p.utilizacion).toBeLessThanOrEqual(1);
  });

  it("compresión excedida: cada propuesta cumple", () => {
    const r = recomendarCompresionAcero({
      ...PNI, lcx: "3.6", lcy: "1.5", kzl: "3.6", fy: "250", e: "200000", pRequerida: "450",
      conexion: "", tipoConector: "", separacionConectores: "0.4",
    }).compresion ?? [];
    expect(r.length).toBeGreaterThan(0);
    for (const p of r) expect(p.utilizacion).toBeLessThanOrEqual(1);
  });
});

describe("recomendaciones de la columna mixta", () => {
  const BASE = { es: "200000", fy: "250", fc: "30", ec: "28000", dMm: "300", tMm: "9.5", lM: "3", phiBarra: "12", nBarras: "5", p: "800", m: "100", v: "100", yG: "92.5", lFuego: "3" };
  it("axil excedido: tubo más grande primero, y cumple", () => {
    const r = recomendarSeccionMixta({ ...BASE, p: "4000" }).axil ?? [];
    expect(r[0].accion).toMatch(/^Tubo Ø /);
    for (const p of r) expect(p.utilizacion).toBeLessThanOrEqual(1);
  });
});

describe("recomendaciones de la unión abulonada", () => {
  const BASE = {
    filas: "2", columnas: "2", sx: "0.06", sy: "0.08", fx: "0", fy: "150", momento: "0", diametro: "20", grado: "A325",
    planosDeCorte: "1", espesor1: "10", fu1: "400", lc1: "35", deformacion1: DEFORMACION[0], dosChapas: DOS_CHAPAS[0],
    espesor2: "10", fu2: "400", lc2: "35", deformacion2: DEFORMACION[0], hayTraccion: HAY_TRACCION[0], traccionReq: "30",
    hayDeslizamiento: HAY_DESLIZAMIENTO[0], clase: CLASES[0], tipoAgujeroDesl: TIPOS_AGUJERO[0], tb: "142", chapasDeRelleno: "0",
    hayBloque: HAY_BLOQUE[0], corteLargo: "160", corteEspesor: "10", corteAgujeros: "2", traccionAncho: "60", traccionEspesor: "10",
    traccionAgujeros: "1", diametroAgujeroBloque: "22", ubs: UBS[0],
  };
  it("bulón excedido: diámetro mayor primero, y cumple", () => {
    const r = recomendarTornillos({ ...BASE, fy: "500" }).bulon ?? [];
    expect(r.length).toBeGreaterThan(0);
    for (const p of r) expect(p.utilizacion).toBeLessThanOrEqual(1);
  });
});

describe("recomendaciones de uniones soldadas y chapa de base", () => {
  const BASE = {
    hMm: "150", bMm: "240", tfMm: "15.9", twMm: "12.7", lado: "9.5", electrodo: "E60", px: "0", py: "160", pz: "0", mx: "40", my: "0", mz: "0",
    fy: "310", fu: "407.8", fck: "25", lx: "0.4", ly: "0.4", tChapa: "0.0095", dPerno: "15", lc: "0.137", nPernos: "12",
    ag: "0.041", ae: "0.038", nMax: "400", cortePerno: "41.5", momentoPernos: "25.2", distancias: "0.18, 0.127",
  };
  it("cordón excedido: lado mayor primero, y cumple", () => {
    const r = recomendarUniones({ ...BASE, mx: "60" }).soldadura ?? [];
    expect(r[0].accion).toMatch(/^Lado del cordón = /);
    for (const p of r) expect(p.utilizacion).toBeLessThanOrEqual(1);
  });
});
