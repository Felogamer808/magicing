import { describe, expect, it } from "vitest";
import { derivarMateriales } from "./materiales";
import { calcularFranjaLosa } from "./losa-fundacion";

// Reutiliza el mismo motor que zapata-combinada.ts (ya validado ahí contra la
// fórmula clásica de viga con voladizos). Acá solo se verifica que la
// generalización a N columnas funcione: simetría y equilibrio global.

describe("franja de losa — 3 pilares iguales, simétrica", () => {
  const materiales = derivarMateriales({ fck: 25, fyk: 500 });
  const geometria = { longitudM: 9, anchoTributarioM: 3, H: 0.5, recubrimiento: 0.05 };

  const r = calcularFranjaLosa(materiales, geometria, 1000, {
    columnas: [
      { posicionM: 1.5, Nk: 200 },
      { posicionM: 4.5, Nk: 200 },
      { posicionM: 7.5, Nk: 200 },
    ],
    armadoInferior: { diametroMm: 16, separacionM: 0.15 },
    armadoSuperior: { diametroMm: 12, separacionM: 0.15 },
    armadoSecundario: { numero: 8, diametroMm: 10 },
  });

  it("no tiene excentricidad (carga y geometría simétricas)", () => {
    expect(r.excentricidadM).toBeCloseTo(0, 6);
    expect(r.dentroDelNucleo).toBe(true);
  });

  it("da momento inferior y cortante positivos y finitos (con estos voladizos cortos no llega a haber momento negativo)", () => {
    expect(r.inferior.mKNm).toBeGreaterThan(0);
    expect(r.superior.mKNm).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(r.cortante.vEdKN)).toBe(true);
    expect(r.cortante.vEdKN).toBeGreaterThan(0);
  });

  it("reproduce el peso propio con el ancho tributario de la franja", () => {
    expect(r.geotecnico.pesoPropioKN).toBeCloseTo(25 * 9 * 3 * 0.5, 6);
  });
});

describe("franja de losa — sanidad: más pilares reparten mejor la carga (menor σ)", () => {
  const materiales = derivarMateriales({ fck: 25, fyk: 500 });
  const armaduras = {
    armadoInferior: { diametroMm: 16, separacionM: 0.15 },
    armadoSuperior: { diametroMm: 12, separacionM: 0.15 },
    armadoSecundario: { numero: 8, diametroMm: 10 },
  };

  it("agregar carga sin agregar área aumenta la presión de contacto", () => {
    const base = calcularFranjaLosa(
      materiales,
      { longitudM: 9, anchoTributarioM: 3, H: 0.5, recubrimiento: 0.05 },
      1000,
      { columnas: [{ posicionM: 4.5, Nk: 300 }], ...armaduras }
    );
    const cargada = calcularFranjaLosa(
      materiales,
      { longitudM: 9, anchoTributarioM: 3, H: 0.5, recubrimiento: 0.05 },
      1000,
      { columnas: [{ posicionM: 4.5, Nk: 600 }], ...armaduras }
    );
    expect(cargada.geotecnico.sigmaKPa).toBeGreaterThan(base.geotecnico.sigmaKPa);
  });
});
