import { describe, expect, it } from "vitest";
import { calcularFluencia, perimetroExpuestoM, tamanoTeoricoMm } from "@/lib/calc/hormigon/comun/diferidas";
import { FLUENCIA_EFICAZ_SIN_DATO } from "@/lib/calc/hormigon/pilares/pilar";
import { COACCIONES_PILAR, MODOS_FLUENCIA, resolverPilar } from "@/lib/calc/hormigon/pilares/resolver-pilar";

const BASE = {
  fck: "30", fyk: "500", b: "0.3", h: "0.4", altura: "3", rec: "0.03", nEd: "1000",
  coaccionH: COACCIONES_PILAR[0], betaH: "1", arriostradoH: "Arriostrado", m01H: "0", m02H: "30", vEdH: "20",
  coaccionB: COACCIONES_PILAR[1], betaB: "1", arriostradoB: "Sin arriostrar", m01B: "0", m02B: "0", vEdB: "0",
  modoFluencia: MODOS_FLUENCIA[0], phiEf: "1.2", hr: "60", t0: "28", cemento: "", exposicion: "", relacionMqp: "0.6",
  phi: "16", nCaraB: "3", nCaraH: "3", phiCerco: "8", sepCercos: "0.2", ramasH: "2", ramasB: "2",
};

describe("resolverPilar", () => {
  it("toma β de la coacción, o el escrito a mano con \"Otro\"", () => {
    expect(resolverPilar(BASE)!.beta).toEqual({ h: 1, b: 0.7 });
    const otro = resolverPilar({ ...BASE, coaccionH: COACCIONES_PILAR[4], betaH: "1.3" })!;
    expect(otro.beta.h).toBe(1.3);
    expect(otro.r.flexion.h.longitudEfectivaM).toBeCloseTo(3.9, 9);
  });

  it("lee el arriostramiento por dirección", () => {
    const r = resolverPilar(BASE)!.r;
    expect(r.flexion.b.rm).toBe(1);
  });

  it("fluencia: sin dato, cargada, o φ(∞,t0)·M0Eqp/M0Ed con el Apéndice B", () => {
    expect(resolverPilar(BASE)!.r.fluenciaEficaz).toBeCloseTo(FLUENCIA_EFICAZ_SIN_DATO, 9);
    expect(resolverPilar({ ...BASE, modoFluencia: MODOS_FLUENCIA[1] })!.r.fluenciaEficaz).toBeCloseTo(1.2, 9);
    const calculada = resolverPilar({ ...BASE, modoFluencia: MODOS_FLUENCIA[2] })!;
    const h0 = tamanoTeoricoMm(0.12, perimetroExpuestoM("cuatro-caras", 0.3, 0.4));
    const phi = calcularFluencia({ fckMPa: 30, hrPct: 60, t0Dias: 28, claseCemento: "N", h0Mm: h0 }).phi;
    expect(calculada.fluencia.h0Mm).toBeCloseTo(h0, 9);
    expect(calculada.r.fluenciaEficaz).toBeCloseTo(phi * 0.6, 9);
    expect(calculada.r.fluenciaAdoptada).toBe(false);
  });

  it("rechaza barras por cara menores que 2 y recubrimientos que no dejan lugar", () => {
    expect(resolverPilar({ ...BASE, nCaraB: "1" })).toBeNull();
    expect(resolverPilar({ ...BASE, nCaraB: "2.5" })).toBeNull();
    expect(resolverPilar({ ...BASE, rec: "0.15" })).toBeNull();
    expect(resolverPilar({ ...BASE, modoFluencia: MODOS_FLUENCIA[2], relacionMqp: "1.5" })).toBeNull();
  });
});
