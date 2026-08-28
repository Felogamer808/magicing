import { describe, expect, it } from "vitest";
import { calcularAnclaje, calcularSolape, mandrilMinimoMm } from "@/lib/calc/hormigon/comun/anclaje";

const materiales = { fckMPa: 30, fykMPa: 500 };

describe("calcularAnclaje", () => {
  it("recta, buena adherencia, tracción: reproduce fbd, lb,rqd y lbd", () => {
    const r = calcularAnclaje(materiales, {
      diametroMm: 16,
      situacion: "buena",
      forma: "recta",
      esfuerzo: "traccion",
      recubrimientoMm: 32,
    });
    expect(r.fctdMPa).toBeCloseTo(1.3516851384478814, 9);
    expect(r.fbdMPa).toBeCloseTo(3.041291561507733, 9);
    expect(r.lbRqdMm).toBeCloseTo(571.8394305873218, 6);
    expect(r.alfa1).toBeCloseTo(1, 9);
    expect(r.alfa2).toBeCloseTo(0.85, 9);
    expect(r.lbMinMm).toBeCloseTo(171.55182917619652, 6);
    expect(r.lbdMm).toBeCloseTo(486.0635159992235, 6);
  });

  it("gancho con recubrimiento generoso (cd ≤ 3φ): α1 no baja de 1,0", () => {
    const r = calcularAnclaje(materiales, {
      diametroMm: 16,
      situacion: "buena",
      forma: "gancho",
      esfuerzo: "traccion",
      recubrimientoMm: 32, // = 2φ, no > 3φ=48
    });
    expect(r.alfa1).toBeCloseTo(1, 9);
    expect(r.alfa2).toBeCloseTo(1, 9);
    expect(r.lbdMm).toBeCloseTo(571.8394305873218, 6);
  });

  it("gancho con recubrimiento amplio (cd > 3φ) y mala adherencia: α1=0,7", () => {
    const r = calcularAnclaje(materiales, {
      diametroMm: 20,
      situacion: "mala",
      forma: "gancho",
      esfuerzo: "traccion",
      recubrimientoMm: 70, // > 3*20=60
    });
    expect(r.eta1).toBeCloseTo(0.7, 9);
    expect(r.fbdMPa).toBeCloseTo(2.128904093055413, 9);
    expect(r.lbRqdMm).toBeCloseTo(1021.1418403345032, 6);
    expect(r.alfa1).toBeCloseTo(0.7, 9);
    expect(r.alfa2).toBeCloseTo(0.925, 9);
    expect(r.lbdMm).toBeCloseTo(661.1893416165908, 6);
  });

  it("en compresión el gancho no cuenta: se comporta como recta (α1=α2=1)", () => {
    const r = calcularAnclaje(materiales, {
      diametroMm: 16,
      situacion: "buena",
      forma: "gancho",
      esfuerzo: "compresion",
      recubrimientoMm: 32,
    });
    expect(r.alfa1).toBeCloseTo(1, 9);
    expect(r.alfa2).toBeCloseTo(1, 9);
    // lb,min con 0,6·lb,rqd (compresión) en vez de 0,3·lb,rqd (tracción).
    expect(r.lbMinMm).toBeCloseTo(343.10365835239304, 6);
    expect(r.lbdMm).toBeCloseTo(571.8394305873218, 6);
  });

  it("mandril mínimo: 4φ hasta 16 mm, 7φ por encima", () => {
    expect(mandrilMinimoMm(16)).toBe(64);
    expect(mandrilMinimoMm(20)).toBe(140);
  });
});

describe("calcularSolape", () => {
  const base = calcularAnclaje(materiales, {
    diametroMm: 16,
    situacion: "buena",
    forma: "recta",
    esfuerzo: "traccion",
    recubrimientoMm: 32,
  });

  it("50% de barras solapadas: α6 = √2, por encima del mínimo", () => {
    const s = calcularSolape(base, 16, 50);
    expect(s.alfa6).toBeCloseTo(1.4142135623730951, 9);
    expect(s.l0MinMm).toBeCloseTo(242.61092347088956, 6);
    expect(s.l0Mm).toBeCloseTo(687.3976165008538, 6);
  });

  it("20% de barras solapadas: α6 tocando el piso de 1,0, gobierna lb,rqd·α1·α2", () => {
    const s = calcularSolape(base, 16, 20);
    expect(s.alfa6).toBeCloseTo(1, 9);
    expect(s.l0MinMm).toBeCloseTo(240, 6);
    expect(s.l0Mm).toBeCloseTo(486.0635159992235, 6);
  });
});
