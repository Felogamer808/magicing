import { describe, expect, it } from "vitest";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";
import { calcularVigaCentradoraPilotes, type DatosVigaCentradoraPilotes } from "./viga-centradora-pilotes";

const materiales = derivarMateriales({ fck: 30, fyk: 500 });

/**
 * VC2 del ALTAMIRA REV08 (P9 → CT10): N₁d = 783,4 kN (envolvente ELU de Robot
 * de P9), e = 0,748 m y l − e = 4,771 m (verificación a mano de la planilla,
 * hoja Centradoras), viga 800×600 con 8Ø25 arriba.
 */
const VC2: DatosVigaCentradoraPilotes = {
  b: 0.8,
  h: 0.6,
  recubrimiento: 0.04,
  excentricidadM: 0.748,
  luzApoyosM: 4.771,
  ladoPilarM: 0.4,
  diametroPiloteM: 0.5,
  n1dKN: 783.4,
  excentricidadAccidentalM: 0.1,
  superior: { numero: 8, diametroMm: 25 },
  inferior: { numero: 8, diametroMm: 25 },
  diametroEstriboMm: 8,
  numeroRamas: 4,
  nqpKN: 550,
  wMaxMm: 0.3,
};

describe("viga centradora sobre pilotes: palanca", () => {
  const r = calcularVigaCentradoraPilotes(materiales, VC2);

  it("l = e + distancia entre apoyos; q = 1,35·25·b·h", () => {
    expect(r.luzM).toBeCloseTo(5.519, 9);
    expect(r.pesoVigaKNPorM).toBeCloseTo(16.2, 9);
    expect(r.momentoAccidentalKNm).toBeCloseTo(78.34, 9);
  });

  /**
   * R₁ = (783,4·5,519 + 16,2·5,519²/2 + 78,34)/4,771
   *    = (4323,585 + 246,721 + 78,34)/4,771 = 974,35 kN
   * ΔN = 974,35 − 783,4 − 16,2·5,519 = 101,54 kN
   */
  it("reacción en el pilote y alivio del apoyo lejano", () => {
    expect(r.reaccionPiloteKN).toBeCloseTo(974.354, 2);
    expect(r.alivioLejanoKN).toBeCloseTo(101.546, 2);
  });

  /**
   * M = 783,4·0,748 + 78,34 + 16,2·0,748²/2 = 585,98 + 78,34 + 4,53 = 668,86 kN·m
   * (la planilla da 664 con el F de Robot; la palanca de JM da algo más).
   * V = 974,35 − 783,4 − 16,2·0,748 = 178,84 kN.
   */
  it("momento en el pilote y cortante del tramo", () => {
    expect(r.momentoKNm).toBeCloseTo(668.855, 2);
    expect(r.momentoVanoKNm).toBe(0);
    expect(r.cortanteTramoKN).toBeCloseTo(178.837, 2);
    expect(r.flexion.verificaAs).toBe(true);
    expect(r.flexionVano).toBeNull();
  });

  /**
   * d = 0,6 − 0,04 − 0,008 − 0,0125 = 0,5395 m.
   * a_v = 0,748 − 0,4/2 − (√π/2)·0,5/2 = 0,3264 m, entre 0,5d y 2d:
   * β = 0,3264/(2·0,5395) = 0,3025.
   * VEd = 783,4 + 16,2·0,748 = 795,52 kN; reducido 0,3025·783,4 + 12,12 = 249,1 kN.
   * (6.5): 0,5·0,8·0,5395·0,6·(1 − 30/250)·20·1000 = 2278,85 kN.
   */
  it("voladizo pilar–pilote con β = a_v/2d", () => {
    const v = r.voladizo;
    expect(r.flexion.d).toBeCloseTo(0.5395, 9);
    expect(v.avM).toBeCloseTo(0.748 - 0.2 - (Math.sqrt(Math.PI) / 4) * 0.5, 9);
    expect(v.beta).toBeCloseTo(0.30251, 4);
    expect(v.vEdKN).toBeCloseTo(795.518, 2);
    expect(v.vEdReducidoKN).toBeCloseTo(0.30251 * 783.4 + 12.1176, 1);
    expect(v.vLimite65KN).toBeCloseTo(2278.85, 1);
    expect(v.verifica65).toBe(true);
    expect(v.sinReduccion).toBe(false);
  });
});

describe("viga centradora sobre pilotes: casos límite", () => {
  /**
   * Con e = 0 y sin M_acc la palanca no existe: la viga es una biapoyada
   * cargada por su peso, M⁺ = q·l²/8 en el centro, y en el pilote M = 0.
   */
  it("sin excentricidad, el tramo es una biapoyada bajo su peso", () => {
    const r = calcularVigaCentradoraPilotes(materiales, { ...VC2, excentricidadM: 0, excentricidadAccidentalM: 0 });
    expect(r.momentoKNm).toBeCloseTo(0, 9);
    expect(r.momentoVanoKNm).toBeCloseTo((16.2 * 4.771 ** 2) / 8, 6);
    expect(r.flexionVano).not.toBeNull();
    expect(r.cortanteTramoKN).toBeCloseTo((16.2 * 4.771) / 2, 6);
  });

  /** a_v < 0,5d: se toma a_v = 0,5d y β = 0,25. */
  it("pilar casi sobre el pilote: β no baja de 0,25", () => {
    const r = calcularVigaCentradoraPilotes(materiales, { ...VC2, excentricidadM: 0.3 });
    expect(r.voladizo.beta).toBeCloseTo(0.25, 9);
  });

  /** a_v ≥ 2d: no hay reducción, el voladizo es una viga más. */
  it("voladizo largo: sin β", () => {
    const r = calcularVigaCentradoraPilotes(materiales, { ...VC2, excentricidadM: 1.6 });
    expect(r.voladizo.sinReduccion).toBe(true);
    expect(r.voladizo.beta).toBe(1);
    expect(r.voladizo.requiereEstribos).toBe(true);
  });

  it("sin distancia entre apoyos la palanca no existe", () => {
    const r = calcularVigaCentradoraPilotes(materiales, { ...VC2, luzApoyosM: 0 });
    expect(r.geometriaValida).toBe(false);
  });

  it("diámetro mínimo de 12 mm (art. 9.8.3 (1))", () => {
    const r = calcularVigaCentradoraPilotes(materiales, { ...VC2, superior: { numero: 20, diametroMm: 10 } });
    expect(r.verificaDiametro).toBe(false);
  });
});

describe("resolver de la viga centradora sobre pilotes", () => {
  it("un campo vacío no es cero: sin e no calcula", async () => {
    const { resolverVigaCentradoraPilotes } = await import("./resolver-viga-centradora-pilotes");
    const { CAMPOS_CIMENTACIONES } = await import("@/lib/mcp/campos-cimentaciones");
    const porDefecto = Object.fromEntries(CAMPOS_CIMENTACIONES["viga-centradora-pilotes"].map((c) => [c.clave, c.porDefecto]));
    expect(resolverVigaCentradoraPilotes(porDefecto)).not.toBeNull();
    expect(resolverVigaCentradoraPilotes({ ...porDefecto, excentricidad: "" })).toBeNull();
    expect(resolverVigaCentradoraPilotes({ ...porDefecto, excentricidad: "0" })).not.toBeNull();
  });
});

/**
 * Contraste con la planilla ALTAMIRA_Fundaciones_02_Calculo_REV08.xlsx, hojas
 * Centradoras y Vigas (EHE-08 + JM § 25.5.2). Entradas: N₁d = Nd ELU máx del
 * pilar (hoja Pilares), l − e del plano REV08 (`piezasDePlanta`), e del pilar
 * de Robot llevado al DXF con el corrimiento (+55588, −58426) mm, y la
 * armadura adoptada en la planilla.
 *
 * La palanca es la misma, así que el Md coincide en las VC con un pilote
 * medianero (VC1, VC2, VC5, VC6). En VC3 y VC4 el medianero es un cabezal de 2
 * pilotes y la planilla toma el F de Robot con tres ecuaciones: la palanca
 * plana da −8 % y +5 %. El cortante no se compara: la planilla lo saca de Robot.
 */
describe("viga centradora sobre pilotes: contraste con la planilla REV08", () => {
  const casos = [
    { vc: "VC1", b: 1.0, h: 0.6, e: 0.657, luz: 3.389, nd: 494.7, lado: 0.149, d: 0.4, arm: [9, 20], md: 378.8, r1: 645 },
    { vc: "VC2", b: 0.8, h: 0.6, e: 0.748, luz: 4.772, nd: 783.4, lado: 0.2, d: 0.5, arm: [8, 25], md: 664.1, r1: 970.9 },
    { vc: "VC5", b: 0.9, h: 0.7, e: 0.492, luz: 5.296, nd: 1186.7, lado: 0.213, d: 0.6, arm: [8, 25], md: 704.8, r1: 1390 },
    { vc: "VC6", b: 0.9, h: 0.8, e: 0.782, luz: 3.131, nd: 1515.8, lado: 0.142, d: 0.6, arm: [17, 20], md: 1335.7, r1: 1942 },
  ] as const;
  for (const c of casos) {
    it(`${c.vc}: Md y R del pilote como la planilla, y la armadura adoptada alcanza`, () => {
      const r = calcularVigaCentradoraPilotes(materiales, {
        ...VC2,
        b: c.b, h: c.h, excentricidadM: c.e, luzApoyosM: c.luz, n1dKN: c.nd, ladoPilarM: c.lado, diametroPiloteM: c.d,
        superior: { numero: c.arm[0], diametroMm: c.arm[1] },
      });
      expect(Math.abs(r.momentoKNm / c.md - 1)).toBeLessThan(0.01);
      expect(Math.abs(r.reaccionPiloteKN / c.r1 - 1)).toBeLessThan(0.035);
      expect(r.flexion.verificaAs).toBe(true);
    });
  }
});

describe("viga centradora sobre pilotes: anclaje superior y fisuración", () => {
  const r = calcularVigaCentradoraPilotes(materiales, VC2);

  /** Pilar de 0,40 y rec 0,04: 360 mm de recta. h = 0,60 > 0,25: adherencia mala. */
  it("ancla desde la cara interior del pilar hasta la exterior", () => {
    expect(r.anclajeSuperior.situacion).toBe("mala");
    expect(r.anclajeSuperior.disponibleMm).toBeCloseTo(360, 9);
    const sigma = (r.momentoKNm * 10) / (r.flexion.zM * r.flexion.asRealCm2);
    expect(r.anclajeSuperior.sigmaSdMPa).toBeCloseTo(Math.min(sigma, materiales.fyd), 9);
    expect(r.anclajeSuperior.verifica).toBe(r.anclajeSuperior.disponibleMm >= r.anclajeSuperior.lbdMm);
  });

  /** La patilla baja hasta h − 2·rec = 0,52 m. */
  it("con patilla suma la pata", () => {
    const g = calcularVigaCentradoraPilotes(materiales, { ...VC2, formaAnclaje: "gancho" });
    expect(g.anclajeSuperior.disponibleMm).toBeCloseTo(880, 9);
  });

  /** Mqp = 550·0,748 + 25·0,8·0,6·0,748²/2 = 411,4 + 3,357 = 414,76 kN·m, sin M_acc. */
  it("fisura con el momento cuasipermanente en el pilote", () => {
    expect(r.fisuracion.mqpKNm).toBeCloseTo(414.757, 3);
    expect(r.fisuracion.resultado.wkMm).toBeGreaterThan(0);
    const menos = calcularVigaCentradoraPilotes(materiales, { ...VC2, nqpKN: 300 });
    expect(menos.fisuracion.resultado.wkMm).toBeLessThan(r.fisuracion.resultado.wkMm);
  });
});