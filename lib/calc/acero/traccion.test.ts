import { describe, expect, it } from "vitest";
import {
  areaNetaM2,
  calcularTraccion,
  factorUCaso2,
  OMEGA_T_FLUENCIA,
  OMEGA_T_ROTURA,
  type AgujeroTraccion,
  type PasoZigzag,
} from "@/lib/calc/acero/traccion";
import { propiedades } from "@/lib/calc/acero/perfiles";

const FY = 248e6; // A36
const FU = 400e6;

/*
 * Ejemplo 1 del capítulo 6 del apunte (FING, Estructuras de Acero): barra
 * angular L5"x5"x3/8" en tracción pura, cinco tornillos de Ø16 mm en zigzag.
 * Ag = 2330 mm², x̄ = 35,2 mm. La sección crítica es b-b: dos agujeros más un
 * escalón en diagonal (s = 35 mm, g = 44 mm), t = 9,53 mm en los dos.
 *
 * El apunte resuelve el ejemplo en LRFD (φ), así que las cargas admisibles no
 * se contrastan directo — acá se usa ASD (Ω) en todo el resto del repo. Lo que
 * sí se contrasta uno a uno son las resistencias nominales Pn, que no dependen
 * del método.
 */
describe("área neta y shear lag: reproduce el ejemplo del apunte", () => {
  const agujeros: AgujeroTraccion[] = [
    { diametroMm: 18, espesorMm: 9.53 },
    { diametroMm: 18, espesorMm: 9.53 },
  ];
  const zigzag: PasoZigzag[] = [{ sMm: 35, gMm: 44, espesorMm: 9.53 }];

  it("reproduce An de la sección a-a: un solo agujero, sin diagonal", () => {
    const an = areaNetaM2(2330e-6, [{ diametroMm: 18, espesorMm: 9.53 }], []);
    expect(an * 1e6).toBeCloseTo(2139, 0);
  });

  it("reproduce An de la sección b-b: dos agujeros más el escalón en diagonal", () => {
    const an = areaNetaM2(2330e-6, agujeros, zigzag);
    // 2330 − 2·20·9,53 + 9,53·35²/(4·44) ≈ 2015,13 mm², contra los 2015 mm²
    // redondeados del apunte.
    expect(an * 1e6).toBeCloseTo(2015.13, 1);
    expect(an * 1e6).toBeCloseTo(2015, 0);
  });

  it("b-b es la sección crítica: tiene menos área neta que a-a", () => {
    const aa = areaNetaM2(2330e-6, [{ diametroMm: 18, espesorMm: 9.53 }], []);
    const bb = areaNetaM2(2330e-6, agujeros, zigzag);
    expect(bb).toBeLessThan(aa);
  });

  it("reproduce U del Caso 2 con x̄ = 35,2 mm y L = 175 mm", () => {
    const u = factorUCaso2(35.2, 175);
    expect(u).toBeCloseTo(1 - 35.2 / 175, 9);
    expect(u).toBeCloseTo(0.8, 2);
  });

  it("reproduce Pn de fluencia y de rotura del ejemplo", () => {
    /*
     * Este repositorio no tiene ángulos en el catálogo, así que las ecs. (D2-1)
     * y (D2-2) se arman a mano con el área y el U del ejemplo, en vez de pasar
     * por `calcularTraccion` con una familia que no es la del ejemplo.
     */
    const areaBrutaM2 = 2330e-6;
    const an = areaNetaM2(areaBrutaM2, agujeros, zigzag);
    const u = factorUCaso2(35.2, 175);
    const ae = an * u;

    const pnFluenciaKN = (FY * areaBrutaM2) / 1000;
    const pnRoturaKN = (FU * ae) / 1000;

    expect(pnFluenciaKN).toBeCloseTo(577.84, 1); // "577.8 kN" del apunte
    expect(pnRoturaKN).toBeCloseTo(644.0, 0); // "645 kN" del apunte, con su propio redondeo intermedio
  });
});

describe("calcularTraccion, ecs. (D2-1) y (D2-2)", () => {
  it("sin agujeros, Ag = An = Ae", () => {
    const r = calcularTraccion({
      familia: "PNI",
      params: { altura: 140 },
      lM: 3,
      fyPa: FY,
      fuPa: FU,
    });
    expect(r.areaNetaM2).toBeCloseTo(r.areaBrutaM2, 9);
    expect(r.areaEfectivaM2).toBeCloseTo(r.areaBrutaM2, 9);
    expect(r.u).toBe(1);
  });

  it("aplica Ωt = 1,67 en fluencia y Ωt = 2,00 en rotura", () => {
    const r = calcularTraccion({
      familia: "PNI",
      params: { altura: 140 },
      lM: 3,
      fyPa: FY,
      fuPa: FU,
    });
    expect(r.admisibleFluenciaKN).toBeCloseTo(r.pnFluenciaKN / OMEGA_T_FLUENCIA, 6);
    expect(r.admisibleRoturaKN).toBeCloseTo(r.pnRoturaKN / OMEGA_T_ROTURA, 6);
    expect(OMEGA_T_FLUENCIA).toBe(1.67);
    expect(OMEGA_T_ROTURA).toBe(2.0);
  });

  it("con acero A36 y sección sin descontar, gobierna la fluencia", () => {
    // Fy/Fu = 0,62 en A36. Sin pérdida de sección Ae = Ag y Pn,rotura/Pn,fluencia
    // = (Fu·Ωt,fluencia)/(Fy·Ωt,rotura) = (400·1,67)/(248·2,00) ≈ 1,35: rotura
    // más de un 35 % por encima, así que fluencia manda con margen.
    const r = calcularTraccion({
      familia: "HEB",
      params: { altura: 200 },
      lM: 3,
      fyPa: FY,
      fuPa: FU,
    });
    expect(r.gobierna).toBe("fluencia");
    expect(r.admisibleKN).toBeCloseTo(r.admisibleFluenciaKN, 9);
  });

  it("perder sección neta puede pasar a que gobierne la rotura", () => {
    const sano = calcularTraccion({
      familia: "PNC",
      params: { altura: 120 },
      lM: 3,
      fyPa: FY,
      fuPa: FU,
    });
    expect(sano.gobierna).toBe("fluencia");

    // Le como buena parte de la sección con agujeros grandes y U castigado:
    // ronda el 0,744 de Ae/Ag que el apunte da como umbral en A36.
    const agujerado = calcularTraccion({
      familia: "PNC",
      params: { altura: 120 },
      lM: 3,
      fyPa: FY,
      fuPa: FU,
      agujeros: [
        { diametroMm: 24, espesorMm: 9 },
        { diametroMm: 24, espesorMm: 9 },
      ],
      u: 0.85,
    });
    expect(agujerado.gobierna).toBe("rotura");
    expect(agujerado.admisibleKN).toBeLessThan(sano.admisibleKN);
  });

  it("gobierna siempre el menor de los dos admisibles", () => {
    const r = calcularTraccion({
      familia: "tubo-redondo",
      params: { diametro: 168.3, espesor: 6 },
      lM: 4,
      fyPa: FY,
      fuPa: FU,
    });
    expect(r.admisibleKN).toBeCloseTo(Math.min(r.admisibleFluenciaKN, r.admisibleRoturaKN), 9);
  });

  it("D1: la nota de esbeltez es informativa, no bloquea la verificación", () => {
    const largo = calcularTraccion({
      familia: "PNI",
      params: { altura: 80 },
      lM: 30, // deliberadamente muy larga
      fyPa: FY,
      fuPa: FU,
      pRequeridaKN: 1,
    });
    expect(largo.esbeltez).toBeGreaterThan(300);
    expect(largo.superaEsbeltezRecomendada).toBe(true);
    // La barra sigue verificando aunque la esbeltez sea alta: D1 es una sugerencia.
    expect(largo.verifica).toBe(true);
  });

  it("verifica contra la carga requerida cuando se la pasa", () => {
    const base = {
      familia: "HEB" as const,
      params: { altura: 200 },
      lM: 3,
      fyPa: FY,
      fuPa: FU,
    };
    const sinCarga = calcularTraccion(base);
    expect(sinCarga.verifica).toBeNull();
    expect(sinCarga.aprovechamiento).toBeNull();

    const admisible = sinCarga.admisibleKN;
    expect(calcularTraccion({ ...base, pRequeridaKN: admisible * 0.5 }).verifica).toBe(true);
    expect(calcularTraccion({ ...base, pRequeridaKN: admisible * 1.5 }).verifica).toBe(false);
    expect(calcularTraccion({ ...base, pRequeridaKN: admisible * 0.5 }).aprovechamiento).toBeCloseTo(0.5, 6);
  });

  it("el radio de giro mínimo es el menor entre rx y ry", () => {
    const r = calcularTraccion({
      familia: "PNI",
      params: { altura: 140 },
      lM: 3,
      fyPa: FY,
      fuPa: FU,
    });
    const p = propiedades("PNI", { altura: 140 });
    expect(r.rMinM).toBeCloseTo(Math.min(p.rxM, p.ryM), 9);
    expect(r.rMinM).toBeCloseTo(p.ryM, 9); // en el PNI, ry es siempre el chico
    expect(r.esbeltez).toBeCloseTo(3 / r.rMinM, 9);
  });
});

describe("factorUCaso2", () => {
  it("sin excentricidad, U = 1: toda la sección transmite la fuerza", () => {
    expect(factorUCaso2(0, 175)).toBe(1);
  });

  it("crece la penalización cuanto más corta la conexión", () => {
    const corta = factorUCaso2(35.2, 100);
    const larga = factorUCaso2(35.2, 300);
    expect(corta).toBeLessThan(larga);
  });
});
