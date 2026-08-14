import { describe, expect, it } from "vitest";
import {
  alpha1Torsion,
  KN,
  kshape,
  kvEntalladura,
  verificarCortante,
  verificarEntalladura,
  verificarTorsion,
} from "@/lib/calc/madera/cortante";
import { KCR } from "@/lib/calc/madera/materiales";

describe("cortante, art. 6.1.7", () => {
  it("reproduce el τmáx de la planilla con su bef", () => {
    // Hoja "Cortante": V = 135 kN sobre 0,196 × 0,98 con kcr = 1.
    const r = verificarCortante(135, 0.196, 0.98, 1, 2.4923076923076923);
    expect(r.tauDMPa).toBeCloseTo(1.0542482, 6);
    expect(r.aprovechamiento).toBeCloseTo(0.4230008, 6);
  });

  it("con el kcr que manda la norma el aprovechamiento sube un 49 %", () => {
    /*
     * La planilla pone kcr = 1 en la comprobación normal y 0,67 en la de
     * entalladura. Para MLE el art. 6.1.7(2) manda 0,67 en las dos: la anchura
     * eficaz baja a dos tercios y con ella la resistencia.
     */
    const conUno = verificarCortante(135, 0.196, 0.98, 1, 2.4923076923076923);
    const conNorma = verificarCortante(135, 0.196, 0.98, KCR.MLE, 2.4923076923076923);
    expect(conNorma.aprovechamiento / conUno.aprovechamiento).toBeCloseTo(1 / 0.67, 6);
    expect(conNorma.aprovechamiento).toBeCloseTo(0.6313445, 5);
  });

  it("el 1,5 es el pico parabólico de la sección rectangular", () => {
    const r = verificarCortante(100, 0.2, 0.4, 1, 3);
    const media = 100 / (0.2 * 0.4 * 1000);
    expect(r.tauDMPa).toBeCloseTo(1.5 * media, 9);
  });
});

describe("entalladura en el apoyo, art. 6.5.2", () => {
  const base = {
    tipo: "MLE" as const,
    cantoM: 1,
    cantoEficazM: 0.65,
    proyeccionM: 1.6,
    distanciaApoyoM: 0.25,
    lado: "mismo-lado" as const,
  };

  it("kn distingue los tres materiales, ec. (6.63)", () => {
    expect(KN.LVL).toBe(4.5);
    expect(KN.maciza).toBe(5);
    expect(KN.MLE).toBe(6.5);
  });

  it("reproduce el kv de la planilla", () => {
    const { kv, alpha, inclinacion } = kvEntalladura(base);
    expect(alpha).toBeCloseTo(0.65, 9);
    expect(inclinacion).toBeCloseTo(1.6 / 0.35, 9);
    expect(kv).toBeCloseTo(0.4001946, 6);
  });

  it("entallar del lado opuesto al apoyo no penaliza, ec. (6.61)", () => {
    const { kv } = kvEntalladura({ ...base, lado: "lado-opuesto" });
    expect(kv).toBe(1);
  });

  it("achaflanar la entalladura recupera resistencia", () => {
    const aEscuadra = kvEntalladura({ ...base, proyeccionM: 0 }).kv;
    const inclinada = kvEntalladura(base).kv;
    expect(inclinada).toBeGreaterThan(aEscuadra);
    // A escuadra el término 1,1·i^1,5 desaparece y kv se desploma.
    expect(aEscuadra).toBeLessThan(0.3);
  });

  it("entallar más profundo baja kv", () => {
    const poco = kvEntalladura({ ...base, cantoEficazM: 0.9, proyeccionM: 0.4 }).kv;
    const mucho = kvEntalladura({ ...base, cantoEficazM: 0.5, proyeccionM: 0.4 }).kv;
    expect(mucho).toBeLessThan(poco);
  });

  it("alejar la entalladura del apoyo también baja kv", () => {
    const cerca = kvEntalladura({ ...base, distanciaApoyoM: 0.05 }).kv;
    const lejos = kvEntalladura({ ...base, distanciaApoyoM: 0.6 }).kv;
    expect(lejos).toBeLessThan(cerca);
  });

  it("kv nunca pasa de 1", () => {
    const casi = kvEntalladura({ ...base, cantoEficazM: 0.995, proyeccionM: 2 }).kv;
    expect(casi).toBeLessThanOrEqual(1);
  });

  it("reproduce la comprobación completa de la planilla, que no verifica", () => {
    const r = verificarEntalladura({
      ...base,
      cortanteKN: 70,
      anchoM: 0.19,
      cantoM: 1,
      cantoEficazM: 0.65,
      kcr: 0.67,
      fvdMPa: 2.52,
    });
    expect(r.tauDMPa).toBeCloseTo(1.2689588, 6);
    expect(r.aprovechamiento).toBeCloseTo(1.2582756, 5);
    expect(r.verifica).toBe(false);
  });
});

describe("torsión, art. 6.1.8", () => {
  it("α1 reproduce el 0,246 de la tabla de la planilla para h/b = 2", () => {
    expect(alpha1Torsion(2)).toBeCloseTo(0.246, 9);
  });

  it("α1 crece con la esbeltez de la sección y tiende a 1/3", () => {
    expect(alpha1Torsion(1)).toBeCloseTo(0.208, 9);
    expect(alpha1Torsion(3)).toBeCloseTo(0.267, 9);
    expect(alpha1Torsion(1000)).toBeCloseTo(1 / 3, 3);
    expect(alpha1Torsion(4)).toBeGreaterThan(alpha1Torsion(2));
  });

  it("α1 interpola entre valores tabulados", () => {
    expect(alpha1Torsion(1.75)).toBeCloseTo((0.231 + 0.246) / 2, 9);
  });

  it("kshape se topa en 1,3 y no en 2", () => {
    /*
     * Con h/b = 2 la planilla acierta por casualidad, porque 1 + 0,15·2 = 1,3
     * cae justo en el tope. El error aparece recién en secciones más esbeltas.
     */
    expect(kshape("rectangular", 2)).toBeCloseTo(1.3, 9);
    expect(kshape("rectangular", 4)).toBeCloseTo(1.3, 9);
    expect(1 + 0.15 * 4).toBeCloseTo(1.6, 9); // lo que daría sin el tope correcto
    expect(kshape("rectangular", 1)).toBeCloseTo(1.15, 9);
    expect(kshape("circular", 5)).toBeCloseTo(1.2, 9);
  });

  it("reproduce la hoja de torsión de la planilla", () => {
    const r = verificarTorsion({
      torsorKNm: 3.24,
      anchoM: 0.1,
      cantoM: 0.2,
      forma: "rectangular",
      fvdMPa: 2.4923076923076923,
    });
    expect(r.alpha1).toBeCloseTo(0.246, 9);
    expect(r.tauTorDMPa).toBeCloseTo(6.5853659, 6);
    expect(r.kshape).toBeCloseTo(1.3, 9);
    // La planilla llama FS a la inversa; acá es aprovechamiento y no verifica.
    expect(r.aprovechamiento).toBeCloseTo(1 / 0.492, 3);
    expect(r.verifica).toBe(false);
  });
});
