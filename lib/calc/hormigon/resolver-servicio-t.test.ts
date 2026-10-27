import { describe, expect, it } from "vitest";
import { COEF_FLECHA, NOMBRE_SISTEMA } from "@/lib/calc/hormigon/deformaciones";
import { NOMBRE_CEMENTO, NOMBRE_EXPOSICION } from "@/lib/calc/hormigon/comun/diferidas";
import { resolverDeformaciones } from "./resolver-deformaciones";
import { resolverFisuracion } from "./resolver-fisuracion";

// Alma 0,30 × 0,60 con ala 1,20 × 0,20; vano simple de 6 m: b1 = 0,45 y
// 0,2·0,45 + 0,1·6 = 0,69 > 0,45, así que manda el ancho real, b_eff = 1,20.
const ALA = { anchoAla: "1.2", espesorAla: "0.2", tramoL0: "simple", luz1: "6", luz2: "6", l0: "6" };

const FISU = {
  fck: "30", fyk: "500", esGPa: "200", rg: "0.04", k2: "0.5", wAdm: "0.3",
  h: "0.6", b: "0.3", mqp: "120", numero1: "6", phi1: "16", numero2: "0", phi2: "10", familia2: "No",
};

describe("fisuración: T desde los campos", () => {
  it("sin tipo de sección es el rectángulo de antes", () => {
    const r = resolverFisuracion(FISU)!;
    expect(r.seccionT).toBeNull();
    expect(r.r.acEficazM2).toBeCloseTo(0.3 * r.r.hcEfM, 12);
  });

  it("el signo decide de qué lado queda el ala", () => {
    const inv = resolverFisuracion({ ...FISU, ...ALA, tipoSeccion: "t-invertida" })!;
    expect(inv.seccionT?.anchoEficaz.anchoEficazM).toBeCloseTo(1.2, 12);
    expect(inv.seccionT?.alaComprimida).toBe(false);
    expect(inv.r.acEficazM2).toBeCloseTo(1.2 * 0.12, 9);

    expect(resolverFisuracion({ ...FISU, ...ALA, tipoSeccion: "t-invertida", signoMomento: "negativo" })!.seccionT?.alaComprimida).toBe(true);
    expect(resolverFisuracion({ ...FISU, ...ALA, tipoSeccion: "t" })!.seccionT?.alaComprimida).toBe(true);
  });

  it("con T pedida y el ala incompleta no calcula un rectángulo", () => {
    expect(resolverFisuracion({ ...FISU, ...ALA, tipoSeccion: "t", anchoAla: "" })).toBeNull();
  });
});

const DEF = {
  fck: "30", fyk: "500", esGPa: "200", b: "0.3", h: "0.6", d: "0.55", dComp: "0.05", luz: "6",
  numeroAs: "6", phiAs: "16", capa2: "No", numeroAs2: "0", phiAs2: "16", numeroAsComp: "0", phiAsComp: "12",
  asReq: "10", sistema: NOMBRE_SISTEMA["simplemente-apoyada"], alaEnT: "No", tabiques: "No",
  mqp: "120", hr: "70", t0: "28", cemento: NOMBRE_CEMENTO.N, exposicion: NOMBRE_EXPOSICION["cuatro-caras"],
  esquema: COEF_FLECHA[0].nombre, coefManual: "0.104",
};

describe("deformaciones: T desde los campos", () => {
  it("T invertida en vano: ala traccionada, 0,8 automático y h0 con la T real", () => {
    const r = resolverDeformaciones({ ...DEF, ...ALA, tipoSeccion: "t-invertida" })!;
    expect(r.seccionT?.alaComprimida).toBe(false);
    // b_eff/bw = 4 > 3, aunque el campo manual diga que no
    expect(r.luzCanto.factorAla).toBe(0.8);
    // ρ sobre el alma (criterio del usuario)
    expect(r.rho).toBeCloseTo(r.n.asProv / 1e4 / (0.3 * 0.55), 12);
    // Por cuatro caras h0 da 0,20 m igual que el rectángulo (casualidad de
    // estos números); por tres no: T invertida 2·0,36/(3,6 − 0,3) = 0,218 m,
    // rectángulo 2·0,18/(0,3 + 1,2) = 0,24 m.
    const tres = { exposicion: NOMBRE_EXPOSICION["tres-caras"] };
    expect(resolverDeformaciones({ ...DEF, ...ALA, ...tres, tipoSeccion: "t-invertida" })!.n.phi).not.toBeCloseTo(
      resolverDeformaciones({ ...DEF, ...tres })!.n.phi, 6
    );
    const rect = resolverDeformaciones(DEF)!;
    expect(r.flecha.mcrKNm).toBeGreaterThan(rect.flecha.mcrKNm);
  });

  it("en voladizo el momento es negativo y el ala de la T queda traccionada", () => {
    const r = resolverDeformaciones({ ...DEF, ...ALA, tipoSeccion: "t", sistema: NOMBRE_SISTEMA.voladizo })!;
    expect(r.seccionT?.alaComprimida).toBe(false);
  });
});
