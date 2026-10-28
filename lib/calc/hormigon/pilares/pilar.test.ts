import { describe, expect, it } from "vitest";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";
import {
  FLUENCIA_EFICAZ_SIN_DATO,
  barrasPilar,
  bloqueRectangular,
  capasPilar,
  calcularPilar,
  cercosAutomaticos,
  exponenteEsviada,
  maximoBarrasCara,
  redondearSeparacionCercos,
  type ArmaduraPilar,
  type EsfuerzosPilar,
  type GeometriaPilar,
} from "@/lib/calc/hormigon/pilares/pilar";

// Caso de mano: 30 × 30 cm, 3 m de altura libre, β = 1, arriostrado,
// HA-25 / B500, recubrimiento 3 cm al cerco Ø8, 8Ø16 (3 por cara), NEd = 1000 kN
// sin momentos de primer orden. Barras a r = 0,03 + 0,008 + 0,008 = 0,046 m.
const materiales = derivarMateriales({ fck: 25, fyk: 500 });
const geometria: GeometriaPilar = { bM: 0.3, hM: 0.3, alturaLibreM: 3, recubrimientoM: 0.03, tamanoMaximoAridoMm: 20 };
const armadura: ArmaduraPilar = {
  diametroEsquinaMm: 16, barrasCaraB: 3, diametroCaraBMm: 16, barrasCaraH: 3, diametroCaraHMm: 16,
  diametroCercoMm: 8, separacionCercosM: 0.15, separacionCercosNudoM: 0.1, ramasH: 2, ramasB: 2,
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
    // Zona de nudo: 0,10 ≤ 0,144 cumple; 0,15 no.
    expect(r.armado.verificaSeparacionNudo).toBe(true);
    const nudo = calcularPilar(materiales, geometria, { ...armadura, separacionCercosNudoM: 0.15 }, esfuerzos);
    expect(nudo.armado.verificaSeparacionNudo).toBe(false);
  });

  it("separación redondeada hacia abajo a 2,5 cm, nunca menos de 2,5 cm", () => {
    expect(redondearSeparacionCercos(0.24)).toBeCloseTo(0.225, 12);
    expect(redondearSeparacionCercos(0.225)).toBeCloseTo(0.225, 12);
    expect(redondearSeparacionCercos(0.144)).toBeCloseTo(0.125, 12);
    expect(redondearSeparacionCercos(0.01)).toBeCloseTo(0.025, 12);
  });

  it("cercos automáticos: Ø mínimo comercial y s,máx redondeada; 0,6·s,máx junto a los nudos", () => {
    // Ø16: Ø ≥ máx(6; 4) → Ø6; s,máx = mín(240; 300; 300) mm → 22,5 cm; 0,6·0,24 = 0,144 → 12,5 cm.
    expect(cercosAutomaticos(materiales, geometria, armadura, esfuerzos)).toEqual({
      diametroCercoMm: 6, separacionCercosM: 0.225, separacionCercosNudoM: 0.125, gobiernaCortante: false,
    });
    // Ø25: Ø ≥ 6,25 → Ø8; s,máx = mín(375; 300; 300) mm → 30 cm; 0,18 → 17,5 cm.
    const gruesas = cercosAutomaticos(materiales, geometria, { ...armadura, diametroEsquinaMm: 25, diametroCaraBMm: 25, diametroCaraHMm: 25 }, esfuerzos);
    expect(gruesas.diametroCercoMm).toBe(8);
    expect(gruesas.separacionCercosM).toBeCloseTo(0.3, 12);
    expect(gruesas.separacionCercosNudoM).toBeCloseTo(0.175, 12);
  });

  it("cercos automáticos: si el cortante pide menos de 10 cm, sube el Ø", () => {
    // VEd = 100 kN > VRd,c. Con 2 ramas: s = Asw·z·fywd/VEd, z = 0,9·d y
    // d = 0,30 − (0,03 + Øc + 0,008). Ø6 → 5,7 cm y Ø8 → 9,99 cm no llegan a 10;
    // Ø10 → 15,5 cm, que se redondea a 15.
    const conCortante = { ...esfuerzos, h: { ...sinMomentos, vEdKN: 100 } };
    const s = (dc: number) => ((2 * Math.PI * (dc / 10) ** 2) / 4 / 1e4) * 0.9 * (0.3 - 0.038 - dc / 1000) * fyd * 1000 / 100;
    expect(s(6)).toBeLessThan(0.1);
    expect(s(8)).toBeLessThan(0.1);
    expect(s(10)).toBeCloseTo(0.1549, 3);
    expect(cercosAutomaticos(materiales, geometria, armadura, conCortante)).toEqual({
      diametroCercoMm: 10, separacionCercosM: 0.15, separacionCercosNudoM: 0.125, gobiernaCortante: true,
    });
    const r = calcularPilar(materiales, geometria, { ...armadura, diametroCercoMm: 10, separacionCercosM: 0.15 }, conCortante);
    expect(r.cortante.h.verifica).toBe(true);
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

// Esquinas Ø20 y, en las caras de ancho b, una intermedia Ø16; las caras h sin
// intermedias. Ejes: esquinas a 0,03 + 0,008 + 0,010 = 0,048 de cada cara; la
// intermedia a 0,03 + 0,008 + 0,008 = 0,046.
const mixta: ArmaduraPilar = { ...armadura, diametroEsquinaMm: 20, diametroCaraBMm: 16, barrasCaraH: 2, diametroCaraHMm: 6 };
const a20 = (Math.PI * 2 ** 2) / 4;
const a16 = (Math.PI * 1.6 ** 2) / 4;

describe("pilar — esquinas y filas con Ø distinto", () => {
  it("cada barra contra el cerco con su Ø, las intermedias a paso constante entre esquinas", () => {
    const barras = barrasPilar(geometria, mixta);
    expect(barras).toHaveLength(6);
    const esquina = barras.find((b) => b.fila === "esquina")!;
    expect(esquina.xM).toBeCloseTo(0.048, 12);
    expect(esquina.yM).toBeCloseTo(0.048, 12);
    const fila = barras.filter((b) => b.fila === "b").map((b) => [b.xM, b.yM]);
    expect(fila[0][0]).toBeCloseTo(0.15, 12);
    expect(fila[0][1]).toBeCloseTo(0.046, 12);
    expect(fila[1][1]).toBeCloseTo(0.254, 12);
  });

  it("capas: en h la fila y las esquinas quedan a profundidades distintas; en b se suman", () => {
    const enH = capasPilar(geometria, mixta, "h").sort((p, q) => p.uM - q.uM);
    expect(enH.map((c) => c.uM)).toEqual([0.046, 0.048, 0.252, 0.254].map((u) => expect.closeTo(u, 12)));
    expect(enH[0].areaM2).toBeCloseTo(a16 / 1e4, 12);
    expect(enH[1].areaM2).toBeCloseTo((2 * a20) / 1e4, 12);
    const enB = capasPilar(geometria, mixta, "b").sort((p, q) => p.uM - q.uM);
    expect(enB).toHaveLength(3);
    expect(enB[1].areaM2).toBeCloseTo((2 * a16) / 1e4, 12);
  });

  it("áreas por cara y total; el Ø de una fila vacía no cuenta", () => {
    const r = calcularPilar(materiales, geometria, mixta, esfuerzos);
    expect(r.numeroBarras).toBe(6);
    expect(r.asTotalCm2).toBeCloseTo(4 * a20 + 2 * a16, 9);
    expect(r.armado.asCara.h).toBeCloseTo(2 * a20 + a16, 9);
    expect(r.armado.asCara.b).toBeCloseTo(2 * a20, 9);
    // La fila h vacía tiene Ø6, que no llega a 12, pero no hay barras de ese Ø.
    expect(r.armado.verificaDiametro).toBe(true);
  });

  it("cortante: d hasta el baricentro de la cara traccionada", () => {
    const r = calcularPilar(materiales, geometria, mixta, esfuerzos);
    expect(r.cortante.h.dM).toBeCloseTo((2 * a20 * 0.252 + a16 * 0.254) / (2 * a20 + a16), 12);
    expect(r.cortante.b.dM).toBeCloseTo(0.252, 12);
  });

  it("cercos: Ø mínimo con el Ø mayor (9.5.3(1)) y s,máx con el menor (9.5.3(3))", () => {
    const r = calcularPilar(materiales, geometria, { ...mixta, diametroEsquinaMm: 25, diametroCaraBMm: 12 }, esfuerzos);
    expect(r.armado.diametroCercoMinimoMm).toBeCloseTo(6.25, 12);
    expect(r.armado.separacionMaximaM).toBeCloseTo(0.18, 12);
  });

  it("separación libre del art. 8.2(2): máx(Ø; dg + 5 mm; 20 mm)", () => {
    // Paso (0,30 − 2·0,048)/2 = 0,102; libre 0,102 − (0,020 + 0,016)/2 = 0,084.
    const r = calcularPilar(materiales, geometria, mixta, esfuerzos);
    expect(r.armado.separacionBarras.h.libreM).toBeCloseTo(0.084, 12);
    expect(r.armado.separacionBarras.h.exigidaM).toBeCloseTo(0.025, 12);
    // Caras h, sólo las esquinas: 0,30 − 2·0,048 − 0,020 = 0,184.
    expect(r.armado.separacionBarras.b.libreM).toBeCloseTo(0.184, 12);
    expect(r.armado.verificaSeparacionBarras).toBe(true);
    // 7 Ø16 en 30 cm: paso 0,208/6 = 0,0347, libre 0,0187 < 0,025.
    const apretada = calcularPilar(materiales, geometria, { ...armadura, barrasCaraB: 7 }, esfuerzos);
    expect(apretada.armado.separacionBarras.h.libreM).toBeCloseTo(0.208 / 6 - 0.016, 12);
    expect(apretada.armado.verificaSeparacionBarras).toBe(false);
    // 6 Ø16: libre 0,0256, cumple con dg = 20 y no con dg = 32 (exige 37 mm).
    expect(calcularPilar(materiales, geometria, { ...armadura, barrasCaraB: 6 }, esfuerzos).armado.verificaSeparacionBarras).toBe(true);
    const gruesa = calcularPilar(materiales, { ...geometria, tamanoMaximoAridoMm: 32 }, { ...armadura, barrasCaraB: 6 }, esfuerzos);
    expect(gruesa.armado.separacionBarras.h.exigidaM).toBeCloseTo(0.037, 12);
    expect(gruesa.armado.verificaSeparacionBarras).toBe(false);
  });
});

describe("pilar — cuántas barras entran por cara (art. 8.2(2))", () => {
  it("30 cm con Ø16: entran 6, la 7.ª deja 18,7 mm libres < 25", () => {
    expect(maximoBarrasCara(geometria, armadura, "h")).toBe(6);
    // Con dg = 32 se exigen 37 mm: con 5, paso 0,052 y libre 0,036.
    expect(maximoBarrasCara({ ...geometria, tamanoMaximoAridoMm: 32 }, armadura, "h")).toBe(4);
  });

  it("la intermedia más fina no alcanza si manda el par esquina-intermedia; cada par mira su lado", () => {
    // Esquinas Ø16, intermedias Ø12 en 30 cm: con 7, paso 0,0347 y libre junto a la esquina 0,0207 < 0,025.
    expect(maximoBarrasCara(geometria, { ...armadura, diametroCaraBMm: 12 }, "h")).toBe(6);
    // h = 60 cm: con 13, paso 0,508/12 = 0,0423 y libre 0,0263; con 14, 0,0231.
    expect(maximoBarrasCara({ ...geometria, hM: 0.6 }, armadura, "b")).toBe(13);
  });
});
