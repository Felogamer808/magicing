import { describe, expect, it } from "vitest";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";
import {
  FLUENCIA_EFICAZ_SIN_DATO,
  bloqueRectangular,
  calcularPilar,
  exponenteEsviada,
  type ArmaduraPilar,
  type EsfuerzosPilar,
  type GeometriaPilar,
} from "@/lib/calc/hormigon/pilares/pilar";

// Caso de mano: 30 × 30 cm, 3 m de altura libre, β = 1, arriostrado,
// HA-25 / B500, recubrimiento 3 cm al cerco Ø8, 8Ø16 (3 por cara), NEd = 1000 kN
// sin momentos de primer orden. Barras a r = 0,03 + 0,008 + 0,008 = 0,046 m.
const materiales = derivarMateriales({ fck: 25, fyk: 500 });
const geometria: GeometriaPilar = { bM: 0.3, hM: 0.3, alturaLibreM: 3, recubrimientoM: 0.03 };
const armadura: ArmaduraPilar = {
  diametroMm: 16, barrasCaraB: 3, barrasCaraH: 3,
  diametroCercoMm: 8, separacionCercosM: 0.15, ramasH: 2, ramasB: 2,
};
const sinMomentos = { beta: 1, arriostrado: true, m01KNm: 0, m02KNm: 0, vEdKN: 50 };
const esfuerzos: EsfuerzosPilar = { nEdKN: 1000, h: sinMomentos, b: sinMomentos };

const areaBarra = (Math.PI * 1.6 ** 2) / 4;
const asTotal = 8 * areaBarra;
const fcd = 25 / 1.5;
const fyd = 500 / 1.15;

describe("pilar — esbeltez y segundo orden (arts. 5.8.3 y 5.8.8)", () => {
  const r = calcularPilar(materiales, geometria, armadura, esfuerzos);
  const f = r.flexion.h;

  it("sin φef toma A = 0,7, es decir φef = 2,14", () => {
    expect(r.fluenciaAdoptada).toBe(true);
    expect(FLUENCIA_EFICAZ_SIN_DATO).toBeCloseTo(2.142857, 5);
    expect(f.factorA).toBeCloseTo(0.7, 9);
  });

  it("λlim de la ec. (5.13) con B = 1 + √(1 + 2ω) y C = 0,7", () => {
    const n = 1000 / (0.09 * fcd * 1000);
    const omega = ((asTotal / 1e4) * fyd) / (0.09 * fcd);
    expect(r.axilReducido).toBeCloseTo(n, 9);
    expect(f.factorB).toBeCloseTo(1 + Math.sqrt(1 + 2 * omega), 9);
    expect(f.factorC).toBeCloseTo(0.7, 9);
    expect(f.lambdaLimite).toBeCloseTo((20 * 0.7 * f.factorB * 0.7) / Math.sqrt(n), 6);
    expect(f.lambda).toBeCloseTo(3 / (0.3 / Math.sqrt(12)), 6);
    expect(f.ignoraSegundoOrden).toBe(false);
  });

  it("curvatura con d = h/2 + is, Kr y Kφ (ecs. 5.34-5.37)", () => {
    // is² = 6 barras a 0,104 m del centro sobre 8 barras.
    const is = Math.sqrt((6 * 0.104 ** 2) / 8);
    expect(f.dCurvaturaM).toBeCloseTo(0.15 + is, 9);
    const omega = ((asTotal / 1e4) * fyd) / (0.09 * fcd);
    const n = 1000 / (0.09 * fcd * 1000);
    const kr = (1 + omega - n) / (1 + omega - 0.4);
    const kPhi = 1 + (0.35 + 25 / 200 - f.lambda / 150) * FLUENCIA_EFICAZ_SIN_DATO;
    expect(f.kr).toBeCloseTo(kr, 9);
    expect(f.kPhi).toBeCloseTo(kPhi, 9);
    const curvatura = (kr * kPhi * (fyd / 200000)) / (0.45 * (0.15 + is));
    expect(f.curvatura).toBeCloseTo(curvatura, 9);
    expect(f.c).toBe(10);
    expect(f.m2KNm).toBeCloseTo((1000 * curvatura * 9) / 10, 6);
  });

  it("MEd = NEd·ei + M2 por encima del mínimo NEd·e0", () => {
    expect(f.eiM).toBeCloseTo(3 / 400, 9);
    expect(f.e0M).toBeCloseTo(0.02, 9);
    expect(f.mEdKNm).toBeCloseTo(7.5 + f.m2KNm, 6);
    expect(f.gobierna).toBe("segundo-orden");
    expect(f.mEdSinImperfeccionKNm).toBeCloseTo(f.m2KNm, 6);
  });

  it("pilar corto: λ ≤ λlim, sin M2, y manda el mínimo", () => {
    const corto = calcularPilar(materiales, { ...geometria, alturaLibreM: 1.5 }, armadura, esfuerzos);
    expect(corto.flexion.h.ignoraSegundoOrden).toBe(true);
    expect(corto.flexion.h.m2KNm).toBe(0);
    expect(corto.flexion.h.mEdKNm).toBeCloseTo(1000 * 0.02, 9);
    expect(corto.flexion.h.gobierna).toBe("minimo");
  });

  it("sin arriostrar, rm = 1 y M2 se suma en el extremo de M02", () => {
    const ladeable = { ...sinMomentos, arriostrado: false, m01KNm: -30, m02KNm: 40 };
    const s = calcularPilar(materiales, geometria, armadura, { ...esfuerzos, h: ladeable });
    expect(s.flexion.h.rm).toBe(1);
    expect(s.flexion.h.mEdKNm).toBeCloseTo(40 + 1000 * 0.0075 + s.flexion.h.m2KNm, 6);
  });

  it("arriostrado con momentos de signo contrario: rm < 0 y M0e de la ec. (5.32)", () => {
    const doble = { ...sinMomentos, m01KNm: -20, m02KNm: 40 };
    const s = calcularPilar(materiales, geometria, armadura, { ...esfuerzos, h: doble });
    expect(s.flexion.h.rm).toBeCloseTo(-0.5, 9);
    expect(s.flexion.h.factorC).toBeCloseTo(2.2, 9);
    expect(s.flexion.h.m0eKNm).toBeCloseTo(Math.max(0.6 * 40 - 0.4 * 20, 0.4 * 40), 9);
  });

  it("ordena los momentos aunque se carguen al revés", () => {
    const alReves = { ...sinMomentos, m01KNm: -40, m02KNm: 20 };
    const s = calcularPilar(materiales, geometria, armadura, { ...esfuerzos, h: alReves });
    expect(s.flexion.h.m02KNm).toBeCloseTo(40, 9);
    expect(s.flexion.h.m01KNm).toBeCloseTo(-20, 9);
  });
});

describe("pilar — diagrama de interacción (art. 6.1)", () => {
  const r = calcularPilar(materiales, geometria, armadura, esfuerzos);

  it("compresión uniforme εc3 = 1,75 ‰: σs = 350 MPa menos el hormigón desplazado", () => {
    expect(r.nRdMaxKN).toBeCloseTo(fcd * 0.09 * 1000 + (asTotal / 1e4) * (350 - fcd) * 1000, 3);
  });

  it("punto x = h/2 calculado a mano", () => {
    // εs sup = 3,5‰·0,104/0,15 → fluye; capa media en el eje neutro; inferior en tracción.
    const capa = (3 * areaBarra) / 1e4;
    const fc = fcd * 1000 * 0.3 * 0.12;
    const n = fc + capa * (fyd - fcd) * 1000 - capa * fyd * 1000;
    const m = fc * (0.15 - 0.06) + capa * (fyd - fcd) * 1000 * 0.104 + capa * fyd * 1000 * 0.104;
    const p = r.flexion.h.diagrama.find((q) => Math.abs(q.nRdKN - n) < 1e-6);
    expect(p).toBeDefined();
    expect(p!.mRdKNm).toBeCloseTo(m, 6);
  });

  it("el caso de referencia verifica a flexión en las dos direcciones", () => {
    expect(r.flexion.h.verifica).toBe(true);
    expect(r.flexion.h.mRdKNm).toBeGreaterThan(r.flexion.h.mEdKNm);
    expect(r.verificaAxil).toBe(true);
  });

  it("bloque para fck > 50: ecs. (3.20) y (3.22) y tabla A19.3.1", () => {
    const b = bloqueRectangular(70);
    expect(b.lambda).toBeCloseTo(0.75, 9);
    expect(b.eta).toBeCloseTo(0.9, 9);
    expect(b.epsilonCu3).toBeCloseTo((2.6 + 35 * 0.2 ** 4) / 1000, 9);
    expect(b.epsilonC3).toBeCloseTo((1.75 + 0.55 * 0.5) / 1000, 9);
  });
});

describe("pilar — flexión esviada (art. 5.8.9)", () => {
  it("exponente a interpolado de la tabla", () => {
    expect(exponenteEsviada(0.05)).toBe(1);
    expect(exponenteEsviada(0.4)).toBeCloseTo(1.25, 9);
    expect(exponenteEsviada(0.85)).toBeCloseTo(1.75, 9);
    expect(exponenteEsviada(1.2)).toBe(2);
  });

  it("excentricidades parecidas: no cumple (5.38) y se aplica la (5.39) con la imperfección en una sola dirección", () => {
    const r = calcularPilar(materiales, geometria, armadura, esfuerzos);
    const e = r.esviada;
    expect(e.cumple538).toBe(false);
    const nRd = (0.09 * fcd + (asTotal / 1e4) * fyd) * 1000;
    expect(e.nRdKN).toBeCloseTo(nRd, 6);
    const a = exponenteEsviada(1000 / nRd);
    const f = r.flexion.h;
    expect(e.valor).toBeCloseTo((f.mEdKNm / f.mRdKNm) ** a + (f.mEdSinImperfeccionKNm / f.mRdKNm) ** a, 9);
  });

  it("momento casi sólo en una dirección: cumple (5.38) y no hace falta la (5.39)", () => {
    const uno = calcularPilar(materiales, { ...geometria, alturaLibreM: 1.5 }, armadura, {
      ...esfuerzos,
      h: { ...sinMomentos, m01KNm: 100, m02KNm: 100 },
    });
    expect(uno.esviada.relacionExcentricidades).toBeLessThanOrEqual(0.2);
    expect(uno.esviada.cumple538).toBe(true);
    expect(uno.esviada.verifica).toBe(true);
  });
});

describe("pilar — cortante (arts. 6.2.2 y 6.2.3)", () => {
  const d = 0.3 - 0.046;
  const rho = (3 * areaBarra) / 1e4 / (0.3 * d);
  const k = 1 + Math.sqrt(200 / (d * 1000));
  const sigmaCp = Math.min(1000 / 90, 0.2 * fcd);
  const vRdc = (Math.max(0.12 * k * (100 * rho * 25) ** (1 / 3), 0.035 * k ** 1.5 * 5) + 0.15 * sigmaCp) * 0.3 * d * 1000;

  it("VRd,c con k1·σcp, σcp topado en 0,2·fcd", () => {
    const r = calcularPilar(materiales, geometria, armadura, esfuerzos);
    expect(r.cortante.h.sigmaCpMPa).toBeCloseTo(0.2 * fcd, 9);
    expect(r.cortante.h.vRdCKN).toBeCloseTo(vRdc, 6);
    expect(r.cortante.h.requiereCercos).toBe(false);
    expect(r.cortante.h.verifica).toBe(true);
  });

  it("con VEd > VRd,c manda VRd,s de la ec. (6.8), cot θ = 1, sin sumar el hormigón", () => {
    const r = calcularPilar(materiales, geometria, armadura, { ...esfuerzos, h: { ...sinMomentos, vEdKN: 100 } });
    const asw = (2 * Math.PI * 0.8 ** 2) / 4 / 1e4;
    expect(r.cortante.h.requiereCercos).toBe(true);
    expect(r.cortante.h.vRdSKN).toBeCloseTo((asw / 0.15) * 0.9 * d * fyd * 1000, 6);
    expect(r.cortante.h.vRdMaxKN).toBeCloseTo((0.3 * 0.9 * d * 0.6 * (1 - 25 / 250) * fcd * 1000) / 2, 6);
    expect(r.cortante.h.verifica).toBe(false);
  });
});

describe("pilar — detalles de armado (art. 9.5)", () => {
  it("mínimo por cara 0,05·NEd/fyc,d con fyc,d ≤ 400 MPa, máximo 4 %", () => {
    const r = calcularPilar(materiales, geometria, armadura, esfuerzos);
    expect(r.armado.fycdMPa).toBe(400);
    expect(r.armado.asMinimaCaraCm2).toBeCloseTo(1.25, 9);
    expect(r.armado.verificaMinimaCara.h).toBe(true);
    expect(r.armado.asMaximaCm2).toBeCloseTo(36, 9);
    expect(r.armado.verificaMaxima).toBe(true);
  });

  it("cercos: Ø ≥ máx(6; Ø/4) y s ≤ mín(15Ø; 300 mm; lado menor), 0,6·s junto a los nudos", () => {
    const r = calcularPilar(materiales, geometria, armadura, esfuerzos);
    expect(r.armado.diametroCercoMinimoMm).toBe(6);
    expect(r.armado.separacionMaximaM).toBeCloseTo(0.24, 9);
    expect(r.armado.separacionZonaNudoM).toBeCloseTo(0.144, 9);
    const ancho = calcularPilar(materiales, geometria, { ...armadura, separacionCercosM: 0.25 }, esfuerzos);
    expect(ancho.armado.verificaSeparacion).toBe(false);
  });

  it("barras sujetas a ≤ 150 mm: con 5 por cara y 2 ramas la del medio queda a 204 mm", () => {
    const r = calcularPilar(materiales, { ...geometria, bM: 0.5 }, { ...armadura, barrasCaraB: 5 }, esfuerzos);
    // paso = (0,5 − 2·0,046)/4 = 0,102; la del medio, a dos pasos de la esquina.
    expect(r.armado.distanciaLibre.h).toBeCloseTo(2 * 0.102, 9);
    expect(r.armado.verificaSujecion).toBe(false);
    const atado = calcularPilar(materiales, { ...geometria, bM: 0.5 }, { ...armadura, barrasCaraB: 5, ramasH: 3 }, esfuerzos);
    expect(atado.armado.distanciaLibre.h).toBeCloseTo(0.102, 9);
    expect(atado.armado.verificaSujecion).toBe(true);
  });

  it("h > 4·b deja de ser pilar (art. 9.5.1)", () => {
    const r = calcularPilar(materiales, { ...geometria, bM: 0.2, hM: 0.9 }, armadura, esfuerzos);
    expect(r.armado.esPilar).toBe(false);
  });
});
