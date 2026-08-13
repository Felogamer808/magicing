import { describe, expect, it } from "vitest";
import {
  comprobarFlechas,
  componentesFlecha,
  flechaDistribuidaMm,
  flechaPuntualMm,
} from "./deformaciones";
import { kdef } from "./materiales";

describe("flecha instantánea", () => {
  // Hoja "Deflexión" de la planilla: 0,07 × 0,14, luz 4,3 m, E = 9,5 GPa.
  const b = 0.07;
  const h = 0.14;
  const I = (b * h ** 3) / 12;
  const E = 9.5;
  const G = E / 16;

  it("reproduce la flecha distribuida de la planilla", () => {
    const r = flechaDistribuidaMm(0.3, 4.3, E, G, I, h);
    expect(r.totalMm).toBeCloseTo(8.9253165, 5);
  });

  it("separa la parte de flexión de la de cortante", () => {
    const r = flechaDistribuidaMm(0.3, 4.3, E, G, I, h);
    expect(r.flexionMm + r.cortanteMm).toBeCloseTo(r.totalMm, 12);
    // Con l/h ≈ 31 el cortante aporta poco, pero no cero.
    expect(r.cortanteMm / r.totalMm).toBeGreaterThan(0.001);
    expect(r.cortanteMm / r.totalMm).toBeLessThan(0.02);
  });

  it("el coeficiente 24/25 sale del área reducida, no de la norma", () => {
    /*
     * wcortante/wflexión = 0,96·(E/G)·(h/l)² para carga distribuida sale de
     * dividir q·l²/(8·G·As) por 5·q·l⁴/(384·E·I) con As = 5/6·A. Se comprueba
     * acá para que el coeficiente no quede como número mágico.
     */
    const r = flechaDistribuidaMm(1, 4, E, G, I, h);
    const esperado = ((24 * E) / (25 * G)) * (h / 4) ** 2;
    expect(r.cortanteMm / r.flexionMm).toBeCloseTo(esperado, 12);
  });

  it("el coeficiente 6/5 de la carga puntual sale de la misma cuenta", () => {
    const r = flechaPuntualMm(10, 4, E, G, I, h);
    const esperado = ((6 * E) / (5 * G)) * (h / 4) ** 2;
    expect(r.cortanteMm / r.flexionMm).toBeCloseTo(esperado, 12);
  });

  it("en vigas de canto el cortante deja de ser despreciable", () => {
    // l/h = 5: la contribución de cortante pasa del 35 %.
    const canto = 0.8;
    const inercia = (0.2 * canto ** 3) / 12;
    const r = flechaDistribuidaMm(20, 4, E, G, inercia, canto);
    expect(r.cortanteMm / r.totalMm).toBeGreaterThan(0.25);
  });

  it("devuelve cero con datos degenerados en vez de infinito", () => {
    expect(flechaDistribuidaMm(5, 4, 10, 0.6, 0, 0.2).totalMm).toBe(0);
    expect(flechaPuntualMm(5, 0, 10, 0.6, 1e-4, 0.2).totalMm).toBe(0);
  });
});

describe("fluencia, ecs. (2.2) a (2.5)", () => {
  it("la permanente fluye entera y la variable sólo su parte casi permanente", () => {
    const c = componentesFlecha({
      instantaneaGMm: 10, instantaneaQMm: 10, kdef: 0.8, psi2: 0.3, contraflechaMm: 0,
    });
    expect(c.fluenciaGMm).toBeCloseTo(8, 9);
    expect(c.fluenciaQMm).toBeCloseTo(10 * 0.3 * 0.8, 9);
    expect(c.finalMm).toBeCloseTo(20 + 8 + 2.4, 9);
  });

  it("aplicar kdef a todo, como la planilla, sobrestima la flecha final", () => {
    /*
     * La planilla multiplica la flecha total por (1 + kdef). Con la mitad de la
     * carga variable y ψ2 = 0,3 eso da 36 mm contra los 30,4 que salen de las
     * ecs. (2.3) a (2.5): un 18 % de más. Es conservador, pero engorda la viga
     * sin necesidad.
     */
    const c = componentesFlecha({
      instantaneaGMm: 10, instantaneaQMm: 10, kdef: 0.8, psi2: 0.3, contraflechaMm: 0,
    });
    const comoLaPlanilla = 20 * (1 + 0.8);
    expect(comoLaPlanilla).toBeCloseTo(36, 9);
    expect(c.finalMm).toBeCloseTo(30.4, 9);
    expect(comoLaPlanilla).toBeGreaterThan(c.finalMm);
  });

  it("con ψ2 = 1 las dos formas coinciden", () => {
    const c = componentesFlecha({
      instantaneaGMm: 10, instantaneaQMm: 10, kdef: 0.8, psi2: 1, contraflechaMm: 0,
    });
    expect(c.finalMm).toBeCloseTo(20 * 1.8, 9);
  });

  it("la clase de servicio 3 triplica la flecha de la parte permanente", () => {
    const clase1 = componentesFlecha({
      instantaneaGMm: 10, instantaneaQMm: 0, kdef: kdef("maciza", 1), psi2: 0.3, contraflechaMm: 0,
    });
    const clase3 = componentesFlecha({
      instantaneaGMm: 10, instantaneaQMm: 0, kdef: kdef("maciza", 3), psi2: 0.3, contraflechaMm: 0,
    });
    expect(clase1.finalMm).toBeCloseTo(16, 9);
    expect(clase3.finalMm).toBeCloseTo(30, 9);
  });

  it("la contraflecha se descuenta sólo de la neta, ec. (7.2)", () => {
    const c = componentesFlecha({
      instantaneaGMm: 10, instantaneaQMm: 10, kdef: 0.8, psi2: 0.3, contraflechaMm: 12,
    });
    expect(c.netaFinalMm).toBeCloseTo(c.finalMm - 12, 9);
    expect(c.finalMm).toBeCloseTo(30.4, 9);
  });
});

describe("límites de la tabla 7.2", () => {
  const c = componentesFlecha({
    instantaneaGMm: 8, instantaneaQMm: 6, kdef: 0.8, psi2: 0.3, contraflechaMm: 0,
  });

  it("compara las tres flechas contra su propio límite", () => {
    const r = comprobarFlechas(c, 5, "dos-apoyos", true);
    expect(r.map((x) => x.etiqueta)).toEqual(["winst", "wnet,fin", "wfin"]);
    expect(r[0].limiteMm).toBeCloseTo(5000 / 500, 9);
    expect(r[1].limiteMm).toBeCloseTo(5000 / 350, 9);
    expect(r[2].limiteMm).toBeCloseTo(5000 / 300, 9);
  });

  it("el extremo laxo del rango es bastante más permisivo", () => {
    const estricto = comprobarFlechas(c, 5, "dos-apoyos", true);
    const laxo = comprobarFlechas(c, 5, "dos-apoyos", false);
    expect(laxo[2].limiteMm / estricto[2].limiteMm).toBeCloseTo(2, 9);
    expect(laxo.every((x, i) => x.limiteMm >= estricto[i].limiteMm)).toBe(true);
  });

  it("el voladizo tiene límites más flojos, medidos sobre su propio vuelo", () => {
    const viga = comprobarFlechas(c, 3, "dos-apoyos", true);
    const voladizo = comprobarFlechas(c, 3, "voladizo", true);
    expect(voladizo[0].limiteMm).toBeGreaterThan(viga[0].limiteMm);
  });

  it("marca cuál no verifica", () => {
    const grande = componentesFlecha({
      instantaneaGMm: 30, instantaneaQMm: 20, kdef: 2, psi2: 0.3, contraflechaMm: 0,
    });
    const r = comprobarFlechas(grande, 5, "dos-apoyos", true);
    expect(r.every((x) => !x.verifica)).toBe(true);
    expect(r[2].aprovechamiento).toBeGreaterThan(1);
  });
});
