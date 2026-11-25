import { describe, expect, it } from "vitest";
import { resolverUnionVigaViga } from "./resolver-union-viga-viga";

/** Los campos de la página con el caso del usuario, como texto. */
const campos: Record<string, string> = {
  fck: "25", gammaC: "1,5", fyk: "500", gammaS: "1,15",
  b: "200", h: "500", d: "450", vd: "80", nd: "",
  rugosidad: "baja", union: "articulada", md: "", z: "", dinamica: "no",
  numero1: "2", diametro1: "12", posicion1: "superior",
  numero2: "2", diametro2: "12", posicion2: "inferior",
  numero3: "", diametro3: "", posicion3: "superior",
};

describe("resolver de la unión viga-viga", () => {
  it("pasa kN a N y da el mismo V_Rd que el motor", () => {
    const res = resolverUnionVigaViga(campos);
    if (!res.ok) throw new Error(res.motivo);
    expect(res.v.grupos).toHaveLength(2);
    expect(res.r.vRdN / 1000).toBeCloseTo(108.6, 1);
  });

  it("con momento y z en blanco, z = 0,9·d y Md en kN·m pasa a N·mm", () => {
    const res = resolverUnionVigaViga({ ...campos, union: "momento", md: "10" });
    if (!res.ok) throw new Error(res.motivo);
    expect(res.v.z).toBeCloseTo(405, 9);
    expect(res.v.zPorDefecto).toBe(true);
    // 10·10⁶ / (405·400)
    expect(res.r.asFlexionMm2).toBeCloseTo(10e6 / (405 * 400), 9);
  });

  it("articulada ignora el Md cargado", () => {
    const res = resolverUnionVigaViga({ ...campos, md: "50" });
    if (!res.ok) throw new Error(res.motivo);
    expect(res.r.asFlexionMm2).toBe(0);
  });

  it("dice qué falta en vez de calcular", () => {
    expect(resolverUnionVigaViga({ ...campos, d: "" }).ok).toBe(false);
    expect(resolverUnionVigaViga({ ...campos, d: "600" }).ok).toBe(false);
    expect(resolverUnionVigaViga({ ...campos, fck: "60" }).ok).toBe(false);
    expect(resolverUnionVigaViga({ ...campos, numero1: "", numero2: "" }).ok).toBe(false);
  });
});
