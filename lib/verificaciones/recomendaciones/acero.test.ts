import { describe, expect, it } from "vitest";
import { parametrosPorDefecto } from "@/lib/calc/acero/perfiles";
import { textoDeParametros } from "@/lib/calc/acero/seccion-campos";
import { resolverFlexionAcero } from "@/lib/calc/acero/resolver-flexion";
import { recomendarCompresionAcero, recomendarFlexionAcero } from "./acero";

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
