import { describe, expect, it } from "vitest";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";
import { calcularZapataMedianeria } from "@/lib/calc/hormigon/cimentaciones/zapata-medianeria";

// No hay planilla de referencia para este tipo (no existe en el Excel original).
// Los valores están derivados a mano del Anejo 19 con la misma formulación que
// la zapata aislada; cada test deja la cuenta escrita.

/** Momento respecto de la sección de un trapecio de presiones de largo l. */
const momentoTrapecio = (b: number, l: number, sigmaSeccion: number, sigmaBorde: number) =>
  sigmaSeccion * b * l * (l / 2) + (sigmaBorde - sigmaSeccion) * b * (l / 2) * ((2 * l) / 3);

describe("zapata de medianería — pilar muy cerca del límite (fuera del núcleo)", () => {
  const materiales = derivarMateriales({ fck: 25, fyk: 500 });
  const geometria = {
    A: 1.5,
    B: 1.2,
    H: 0.5,
    anchoPilarA: 0.4,
    anchoPilarB: 0.4,
    recubrimiento: 0.05,
    distanciaColumnaLimite: 0.05,
  };

  const r = calcularZapataMedianeria(materiales, geometria, 1000, {
    cargas: { Nk: 300, MkA: 0, MkB: 0 },
    armadoA: { numero: 8, diametroMm: 16 },
    armadoB: { numero: 6, diametroMm: 12 },
  });

  it("la excentricidad incluye el peso propio y supera el núcleo central", () => {
    // Nk·e0 = 300·(−0,5) = −150 kN·m sobre Nk + PP = 322,5 kN. Antes se tomaba e0 solo.
    expect(r.geotecnico.pesoPropioKN).toBeCloseTo(22.5, 6);
    expect(r.excentricidadM).toBeCloseTo(-150 / 322.5, 6);
    expect(r.dentroDelNucleo).toBe(false);
    expect(r.geotecnico.verificaTension).toBe(false);
  });

  it("con despegue el borde interior no aporta presión", () => {
    expect(r.distribucionCalculoA.hayDespegue).toBe(true);
    expect(r.ladoInterior.sigmaMaxKPa).toBe(0);
    expect(r.ladoLimite.sigmaMaxKPa).toBeCloseTo(r.distribucionCalculoA.sigmaMaxKPa, 9);
  });

  it("el lado del límite, con vuelo menor que h/2, no tiene tirante que anclar", () => {
    expect(r.ladoLimite.lM).toBeCloseTo(0.05 + 0.15 * 0.4, 9);
    expect(r.ladoLimite.anclaje.comprobado).toBe(false);
    expect(r.ladoLimite.anclaje.verifica).toBe(true);
  });
});

describe("zapata de medianería — dentro del núcleo, con vuelo distinto a cada lado", () => {
  const materiales = derivarMateriales({ fck: 25, fyk: 500 });
  const geometria = {
    A: 2.5,
    B: 1.2,
    H: 0.5,
    anchoPilarA: 0.4,
    anchoPilarB: 0.4,
    recubrimiento: 0.05,
    distanciaColumnaLimite: 0.7,
  };

  const r = calcularZapataMedianeria(materiales, geometria, 1000, {
    cargas: { Nk: 300, MkA: 0, MkB: 0 },
    armadoA: { numero: 8, diametroMm: 16 },
    armadoB: { numero: 6, diametroMm: 12 },
  });

  // Presión de cálculo lineal en x desde el límite: σ(x) = 276 − 100,8·x
  // (N = 450 kN, e = −0,35 m: 150 ± 126 kPa en los bordes).
  const sigma = (x: number) => 276 - 100.8 * x;

  it("queda dentro del núcleo y la tensión usa la excentricidad con peso propio", () => {
    const e = -105 / 337.5;
    expect(r.excentricidadM).toBeCloseTo(e, 6);
    expect(r.dentroDelNucleo).toBe(true);
    expect(r.geotecnico.pesoPropioKN).toBeCloseTo(37.5, 6);
    // Antes 156,25 kPa, con e = −0,35 m.
    expect(r.geotecnico.sigmaKPa).toBeCloseTo(337.5 / ((2.5 - 2 * Math.abs(e)) * 1.2), 6);
    expect(r.geotecnico.verificaTension).toBe(true);
  });

  it("presiones de cálculo en cada borde", () => {
    expect(r.ladoLimite.sigmaMaxKPa).toBeCloseTo(276, 6);
    expect(r.ladoInterior.sigmaMaxKPa).toBeCloseTo(24, 6);
  });

  it("cada vuelo se arma con su momento en la sección a 0,15·c (art. 9.8.2.2)", () => {
    const lLimite = 0.7 + 0.06;
    const lInterior = 1.4 + 0.06;
    expect(r.ladoLimite.lM).toBeCloseTo(lLimite, 9);
    expect(r.ladoInterior.lM).toBeCloseTo(lInterior, 9);

    const mLimite = momentoTrapecio(1.2, lLimite, sigma(lLimite), 276);
    const mInterior = momentoTrapecio(1.2, lInterior, sigma(2.5 - lInterior), 24);
    expect(r.ladoLimite.momentoKNm).toBeCloseTo(mLimite, 6);
    expect(r.ladoInterior.momentoKNm).toBeCloseTo(mInterior, 6);
    expect(r.ladoLimite.fsKN).toBeCloseTo(mLimite / (0.9 * 0.442), 6);
    expect(r.ladoInterior.fsKN).toBeCloseTo(mInterior / (0.9 * 0.442), 6);
  });

  it("cuantía mínima de la ec. (9.1) en los dos lados", () => {
    const fyd = 500 / 1.15;
    const fctmFl = 1.1 * 0.3 * 25 ** (2 / 3);
    const asMin = 1e4 * ((1.2 * 0.25) / 6 / 0.4) * (fctmFl / fyd);
    expect(r.ladoLimite.asMinCm2).toBeCloseTo(asMin, 6);
    expect(r.ladoInterior.asNecCm2).toBeGreaterThanOrEqual(asMin);
  });

  it("cortante a d de cada cara del pilar", () => {
    const d = 0.442;
    const corteLimite = ((276 + sigma(0.7 - d)) / 2) * 1.2 * (0.7 - d);
    const corteInterior = ((sigma(2.5 - (1.4 - d)) + 24) / 2) * 1.2 * (1.4 - d);
    expect(r.ladoLimite.vEdKN).toBeCloseTo(corteLimite, 6);
    expect(r.ladoInterior.vEdKN).toBeCloseTo(corteInterior, 6);
  });

  it("el vuelo máximo se mide desde la cara del pilar", () => {
    expect(r.vueloMaxM).toBeCloseTo(1.4, 9);
  });
});

describe("zapata de medianería — sanidad: a mayor excentricidad, mayor diferencia de presiones", () => {
  const materiales = derivarMateriales({ fck: 25, fyk: 500 });
  const base = { A: 2.5, B: 1.2, H: 0.5, anchoPilarA: 0.4, anchoPilarB: 0.4, recubrimiento: 0.05 };
  const datos = {
    cargas: { Nk: 300, MkA: 0, MkB: 0 },
    armadoA: { numero: 8, diametroMm: 16 },
    armadoB: { numero: 6, diametroMm: 12 },
  };

  it("un pilar más cerca del límite aumenta la presión en ese borde", () => {
    const lejos = calcularZapataMedianeria(materiales, { ...base, distanciaColumnaLimite: 0.9 }, 1000, datos);
    const cerca = calcularZapataMedianeria(materiales, { ...base, distanciaColumnaLimite: 0.6 }, 1000, datos);
    expect(cerca.ladoLimite.sigmaMaxKPa).toBeGreaterThan(lejos.ladoLimite.sigmaMaxKPa);
    expect(Math.abs(cerca.excentricidadM)).toBeGreaterThan(Math.abs(lejos.excentricidadM));
  });

  it("el momento en B entra en la tensión del terreno", () => {
    const sinMB = calcularZapataMedianeria(materiales, { ...base, distanciaColumnaLimite: 0.7 }, 1000, datos);
    const conMB = calcularZapataMedianeria(materiales, { ...base, distanciaColumnaLimite: 0.7 }, 1000, {
      ...datos,
      cargas: { Nk: 300, MkA: 0, MkB: 40 },
    });
    expect(conMB.geotecnico.sigmaKPa).toBeGreaterThan(sinMB.geotecnico.sigmaKPa);
  });

  it("con la resultante fuera de la base no verifica", () => {
    const r = calcularZapataMedianeria(materiales, { ...base, distanciaColumnaLimite: 0 }, 1000, {
      ...datos,
      cargas: { Nk: 300, MkA: -800, MkB: 0 },
    });
    expect(r.geotecnico.sigmaKPa).toBe(Infinity);
    expect(r.geotecnico.verificaTension).toBe(false);
    expect(r.ladoLimite.verificaAs).toBe(false);
  });
});
