import { describe, expect, it } from "vitest";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";
import { calcularMacizoTransicion, type DatosMacizo, type GeometriaMacizo } from "./macizo-transicion";

const hormigon = derivarMateriales({ fck: 30, fyk: 500 });

/**
 * El caso que trajo el usuario (2026-10-29): pilar superior de 200 × 500 sobre
 * uno inferior de 600 × 250, con un macizo de 600 × 500 × 800. En el plano de
 * 500 el pilar superior queda centrado en el macizo y el inferior ocupa la
 * mitad: e = 125 mm, y la carga cae justo sobre la cara del pilar inferior.
 */
const geometria: GeometriaMacizo = {
  hM: 0.8,
  anchoM: 0.5,
  profundidadM: 0.6,
  recubrimientoM: 0.03,
  pilarSuperior: { enPlanoM: 0.5, transversalM: 0.2 },
  pilarInferior: { enPlanoM: 0.25, transversalM: 0.6 },
  excentricidadM: 0.125,
  bordeTraccionadoM: 0,
};
const datos: DatosMacizo = {
  nEdKN: 1000,
  mEdKNm: 0,
  tirante: { numero: 3, diametroMm: 12 },
  esperas: { numero: 3, diametroMm: 16 },
  diametroEstriboMm: 8,
  formaAnclajeTirante: "gancho",
};

describe("macizo de transición: pilar descentrado sobre pilar", () => {
  it("con la carga sobre la cara del pilar hacen falta esperas: nudo C a k1·ν'·fcd", () => {
    const r = calcularMacizoTransicion(hormigon, geometria, datos);
    // ν' = 0,88; σ = 17,6 MPa; b = 0,60 → 10 560 kN por m de ancho.
    // Esperas a 0,030 + 0,008 + 0,008 = 0,046 de la cara: yT = −0,079; D = 0,204.
    // 10 560·a·(0,204 − a/2) = 1000·0,204 → a = 0,204 − √(0,204² − 408/10 560).
    const a = 0.204 - Math.sqrt(0.204 ** 2 - 408 / 10560);
    expect(r.sinTraccion).toBe(false);
    expect(r.yEsperasM).toBeCloseTo(-0.079, 9);
    expect(r.anchoNudoCM).toBeCloseTo(a, 9);
    expect(r.compresionCKN).toBeCloseTo(10560 * a, 6);
    expect(r.traccionEsperasKN).toBeCloseTo(10560 * a - 1000, 6);
    expect(r.traccionEsperasKN).toBeCloseTo(577.8, 1);
    expect(r.nudoC.aprovechamiento).toBeCloseTo(204 / ((10560 * 0.204 ** 2) / 2), 9);
  });

  it("el tirante cierra el equilibrio por los dos lados", () => {
    const r = calcularMacizoTransicion(hormigon, geometria, datos);
    // z = 0,80 − (0,038 + 0,006) = 0,756
    expect(r.zM).toBeCloseTo(0.756, 9);
    const porCarga = (1000 * (r.yCargaM - r.yNudoCM)) / r.zM;
    const porEsperas = (r.traccionEsperasKN * (r.yNudoCM - r.yEsperasM)) / r.zM;
    expect(r.traccionTiranteKN).toBeCloseTo(porCarga, 9);
    expect(r.traccionTiranteKN).toBeCloseTo(porEsperas, 6);
    expect(r.traccionTiranteKN).toBeCloseTo(98.8, 1);
    // Las bielas: componente vertical igual a lo que baja o sube en cada nudo.
    expect(r.compresionBielaBCKN * Math.sin((r.anguloBielaBCGrados * Math.PI) / 180)).toBeCloseTo(1000, 6);
    expect(r.compresionBielaACKN * Math.sin((r.anguloBielaACGrados * Math.PI) / 180)).toBeCloseTo(
      r.traccionEsperasKN,
      6
    );
  });

  it("armaduras: As = T/fyd, y el nudo A con k3 = 0,75", () => {
    const r = calcularMacizoTransicion(hormigon, geometria, datos);
    expect(r.asNecEsperasCm2).toBeCloseTo((r.traccionEsperasKN * 10) / (500 / 1.15), 9);
    expect(r.verificaEsperas).toBe(false); // 3Ø16 = 6,03 cm² contra 13,3
    expect(r.asNecTiranteCm2).toBeCloseTo((r.traccionTiranteKN * 10) / (500 / 1.15), 9);
    expect(r.nudoA!.sigmaMaxMPa).toBeCloseTo(0.75 * 0.88 * 20, 9);
    expect(r.nudoBApoyo.sigmaMaxMPa).toBeCloseTo(0.85 * 0.88 * 20, 9);
    // Nudo B: 1000 kN sobre 0,50 × 0,20 → 10 MPa.
    expect(r.nudoBApoyo.sigmaMPa).toBeCloseTo(10, 9);
  });

  it("con la resultante bien adentro del pilar no hay esperas traccionadas ni tirante", () => {
    const r = calcularMacizoTransicion(hormigon, { ...geometria, excentricidadM: 0.02 }, datos);
    // Ancho centrado en la carga hasta la cara: 2·(0,125 − 0,02) = 0,21 → 1000/(0,21·0,6) = 7,94 MPa < 17,6.
    expect(r.sinTraccion).toBe(true);
    expect(r.traccionEsperasKN).toBe(0);
    expect(r.traccionTiranteKN).toBe(0);
    expect(r.nudoA).toBeNull();
    expect(r.anclajeEsperas).toBeNull();
    expect(r.anclajeTirante).toBeNull();
    expect(r.nudoC.sigmaMPa).toBeCloseTo(1000 / (0.21 * 0.6) / 1000, 9);
    // Sin tirante, el nudo B es sólo de compresión: k1.
    expect(r.nudoBApoyo.sigmaMaxMPa).toBeCloseTo(0.88 * 20, 9);
  });

  it("es continuo en el paso de sin tracción a con tracción", () => {
    // Justo en el límite: 1000/(2·(0,125 − e)·0,6) = 17,6 → e = 0,125 − 1000/(2·0,6·17 600).
    const eLimite = 0.125 - 1000 / (2 * 0.6 * 17600);
    const antes = calcularMacizoTransicion(hormigon, { ...geometria, excentricidadM: eLimite - 1e-7 }, datos);
    const despues = calcularMacizoTransicion(hormigon, { ...geometria, excentricidadM: eLimite + 1e-7 }, datos);
    expect(antes.sinTraccion).toBe(true);
    expect(despues.sinTraccion).toBe(false);
    expect(despues.traccionEsperasKN).toBeLessThan(0.01);
    expect(despues.anchoNudoCM).toBeCloseTo(antes.anchoNudoCM, 4);
  });

  it("el Md del pilar superior corre la carga: e total = e + Md/Nd, y M del pilar inferior = Nd·e total", () => {
    const r = calcularMacizoTransicion(hormigon, geometria, { ...datos, mEdKNm: 30 });
    expect(r.excentricidadTotalM).toBeCloseTo(0.155, 9);
    expect(r.mPilarInferiorKNm).toBeCloseTo(155, 9);
    expect(r.traccionEsperasKN).toBeGreaterThan(calcularMacizoTransicion(hormigon, geometria, datos).traccionEsperasKN);
    // El nudo B se achica a 0,50 − 2·0,03 = 0,44.
    expect(r.nudoBApoyo.sigmaMPa).toBeCloseTo(1000 / (0.44 * 0.2) / 1000, 9);
  });

  it("si el pilar no puede dar el brazo, el nudo C no verifica", () => {
    const r = calcularMacizoTransicion(hormigon, { ...geometria, excentricidadM: 0.3, anchoM: 0.8 }, { ...datos, nEdKN: 3000 });
    expect(r.nudoC.verifica).toBe(false);
    expect(r.nudoC.aprovechamiento).toBeGreaterThan(1);
  });

  it("la carga concentrada usa el art. 6.7 con el pilar superior sobre el macizo", () => {
    const r = calcularMacizoTransicion(hormigon, geometria, datos);
    expect(r.zonaCargada.ac0M2).toBeCloseTo(0.5 * 0.2, 12);
    expect(r.zonaCargada.verificaAplastamiento).toBe(true);
  });

  it("anclajes: las esperas cuentan la patilla sobre el tirante hasta la cara opuesta", () => {
    const r = calcularMacizoTransicion(hormigon, geometria, datos);
    // Mandril Ø16 = 64 mm → radio por el eje 40 mm. u = 2·0,044 = 88 mm.
    // Cara opuesta del macizo en y = −0,125 + 0,50 = 0,375.
    // Vertical 88 − (38 + 8) − 40 = 2; arco π/2·40 = 62,8; horizontal (0,375 + 0,079)·1000 − 38 − 40 = 376.
    expect(r.mandrilEsperasMm).toBe(64);
    expect(r.anclajeEsperas!.disponibleMm).toBeCloseTo(2 + (Math.PI / 2) * 40 + 376, 6);
    expect(r.anclajeEsperas!.sigmaSdMPa).toBeCloseTo(500 / 1.15, 9); // As insuficiente: tope fyd
  });
});
