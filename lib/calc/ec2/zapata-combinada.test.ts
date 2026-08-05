import { describe, expect, it } from "vitest";
import { derivarMateriales } from "./materiales";
import { calcularZapataCombinada } from "./zapata-combinada";

// No hay planilla de referencia (no existe en el Excel original). El caso de
// prueba es simétrico a propósito para poder verificar el diagrama de momentos
// contra la fórmula clásica de una viga con dos apoyos y voladizos iguales bajo
// carga uniforme (M en el apoyo = w·e²/2; M en el centro del tramo = w·e²/2 − w·L²/8),
// con el signo invertido porque acá la "carga" es la reacción del suelo (hacia
// arriba) y los "apoyos" son las cargas de los pilares (hacia abajo).

describe("zapata combinada — caso simétrico (2 columnas iguales)", () => {
  const materiales = derivarMateriales({ fck: 25, fyk: 500 });
  const geometria = { A: 6, B: 1, H: 0.6, recubrimiento: 0.05 };

  const r = calcularZapataCombinada(materiales, geometria, 1000, {
    columna1: { posicionM: 1, Nk: 200 },
    columna2: { posicionM: 5, Nk: 200 },
    armadoInferior: { diametroMm: 16, separacionM: 0.15 },
    armadoSuperior: { diametroMm: 12, separacionM: 0.15 },
    armadoSecundario: { numero: 6, diametroMm: 10 },
  });

  it("no tiene excentricidad (carga y geometría simétricas) y da presión uniforme", () => {
    expect(r.excentricidadM).toBeCloseTo(0, 6);
    expect(r.dentroDelNucleo).toBe(true);
    expect(r.geotecnico.pesoPropioKN).toBeCloseTo(90, 6);
    expect(r.geotecnico.sigmaKPa).toBeCloseTo(81.6667, 2);
    expect(r.geotecnico.verificaTension).toBe(true);
  });

  it("reproduce el momento positivo (bajo los pilares) según w·e²/2 = 50 kN·m", () => {
    expect(r.inferior.mKNm).toBeCloseTo(50, 0);
    expect([1, 5]).toContain(Math.round(r.inferior.posicionM));
  });

  it("reproduce el momento negativo (entre pilares) según w·e²/2 − w·L²/8 = −150 kN·m", () => {
    expect(r.superior.mKNm).toBeCloseTo(150, 0);
    expect(r.superior.posicionM).toBeCloseTo(3, 1);
  });

  it("da armaduras necesarias positivas (en este caso domina el mínimo en ambas caras)", () => {
    expect(r.inferior.asNecCm2PorM).toBeGreaterThan(0);
    // Con H=0.6m el mínimo mecánico domina sobre el As calculado por momento en
    // ambas caras, así que superior e inferior empatan en el mínimo (9.2 cm²/m).
    expect(r.superior.asNecCm2PorM).toBeGreaterThanOrEqual(r.inferior.asNecCm2PorM);
  });

  it("calcula un cortante máximo coherente con el equilibrio (Vmax ≈ Nd − w·e)", () => {
    // Justo antes de cada columna, V = w·e = 100·1 = 100; justo después, V = 100−300 = −200.
    expect(r.cortante.vEdKN).toBeCloseTo(200, 0);
  });
});

describe("zapata combinada — sanidad: una columna más cargada corre el centro de presiones hacia ella", () => {
  const materiales = derivarMateriales({ fck: 25, fyk: 500 });
  const geometria = { A: 6, B: 1, H: 0.6, recubrimiento: 0.05 };
  const armaduras = {
    armadoInferior: { diametroMm: 16, separacionM: 0.15 },
    armadoSuperior: { diametroMm: 12, separacionM: 0.15 },
    armadoSecundario: { numero: 6, diametroMm: 10 },
  };

  it("con la columna 2 más cargada, la excentricidad se corre hacia x2", () => {
    const r = calcularZapataCombinada(materiales, geometria, 1000, {
      columna1: { posicionM: 1, Nk: 150 },
      columna2: { posicionM: 5, Nk: 300 },
      ...armaduras,
    });
    expect(r.excentricidadM).toBeGreaterThan(0);
  });
});
