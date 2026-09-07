import { describe, expect, it } from "vitest";
import {
  apDerivadaMm2PorM,
  CATALOGO_DECKPANEL_ARMCO,
  ESPESOR_DECKPANEL_ESTANDAR_MM,
  FY_ACERO_DECKPANEL_MPA,
  PERFIL_DECKPANEL,
  yInfChapaM,
} from "./deckpanel-armco";

// Folleto ARMCO Deckpanel, ver. 1.1 — los números de estos tests están
// tomados directo de la tabla "Características nominales" y "Sobrecarga
// máxima admisible" del folleto.

describe("geometría del perfil, igual para los tres espesores", () => {
  it("el paso de nervio entra exacto 3 veces en el ancho efectivo", () => {
    expect(PERFIL_DECKPANEL.anchoEfectivoM / PERFIL_DECKPANEL.pasoNervioM).toBeCloseTo(3, 9);
  });

  it("reproduce la altura de nervio del folleto, 63 mm", () => {
    expect(PERFIL_DECKPANEL.alturaNervioM).toBeCloseTo(0.063, 9);
  });
});

describe("acero base, Grado 37", () => {
  it("reproduce fy = 37 ksi en MPa", () => {
    expect(FY_ACERO_DECKPANEL_MPA).toBeCloseTo(255.11, 1);
  });
});

describe("0,912 mm es el espesor de stock estándar", () => {
  it("es el que se toma por defecto", () => {
    expect(ESPESOR_DECKPANEL_ESTANDAR_MM).toBe(0.912);
    expect(CATALOGO_DECKPANEL_ARMCO[ESPESOR_DECKPANEL_ESTANDAR_MM]).toBeDefined();
  });
});

describe("catálogo por espesor: Ix, Sx y peso propio", () => {
  it("reproduce los tres espesores con sus propiedades nominales", () => {
    expect(CATALOGO_DECKPANEL_ARMCO[0.759]).toMatchObject({
      pesoChapaKgM2: 7.6, ixCm4PorM: 72.31, sxSupCm3PorM: 22.33, sxInfCm3PorM: 23.23,
    });
    expect(CATALOGO_DECKPANEL_ARMCO[0.912]).toMatchObject({
      pesoChapaKgM2: 9.06, ixCm4PorM: 86.81, sxSupCm3PorM: 26.82, sxInfCm3PorM: 27.89,
    });
    expect(CATALOGO_DECKPANEL_ARMCO[1.214]).toMatchObject({
      pesoChapaKgM2: 11.96, ixCm4PorM: 114.63, sxSupCm3PorM: 35.4, sxInfCm3PorM: 36.83,
    });
  });

  it("reproduce el peso propio total (chapa + hormigón) del 0,912 mm por espesor de hormigón", () => {
    const fila = CATALOGO_DECKPANEL_ARMCO[0.912];
    expect(fila.pesoPropioTotalPorHcCm).toEqual({ 5: 206, 6: 230, 8: 278, 10: 326, 12: 374 });
  });
});

describe("yInfChapaM: derivado de Ix/Sx,inferior, no una hipótesis", () => {
  it("reproduce a mano el 0,912 mm: Ix/SxInf/100 = 86,81/27,89/100", () => {
    expect(yInfChapaM(0.912)).toBeCloseTo(86.81 / 27.89 / 100, 9);
    expect(yInfChapaM(0.912) * 1000).toBeCloseTo(31.13, 1);
  });

  it("da prácticamente el mismo valor en los tres espesores: es geometría del perfil, no del espesor", () => {
    const y759 = yInfChapaM(0.759);
    const y912 = yInfChapaM(0.912);
    const y1214 = yInfChapaM(1.214);
    expect(y759).toBeCloseTo(y912, 3);
    expect(y1214).toBeCloseTo(y912, 3);
  });

  it("ySup + yInf reproduce la altura de nervio del folleto (63 mm): consistencia cruzada de Ix/Sx", () => {
    const fila = CATALOGO_DECKPANEL_ARMCO[0.912];
    const ySupM = fila.ixCm4PorM / fila.sxSupCm3PorM / 100;
    const yInfM = yInfChapaM(0.912);
    expect((ySupM + yInfM) * 1000).toBeCloseTo(63.49, 1);
  });

  it("lanza si se pide un espesor que no está en el catálogo", () => {
    expect(() => yInfChapaM(1)).toThrow();
  });
});

describe("apDerivadaMm2PorM: derivada del peso, no de catálogo", () => {
  it("reproduce a mano el 0,912 mm: peso/densidad·1e6 = 9,06/7850·1e6", () => {
    expect(apDerivadaMm2PorM(0.912)).toBeCloseTo((9.06 / 7850) * 1e6, 3);
    expect(apDerivadaMm2PorM(0.912)).toBeCloseTo(1154.1, 0);
  });

  it("crece con el espesor de chapa, como el peso", () => {
    expect(apDerivadaMm2PorM(0.759)).toBeLessThan(apDerivadaMm2PorM(0.912));
    expect(apDerivadaMm2PorM(0.912)).toBeLessThan(apDerivadaMm2PorM(1.214));
  });

  it("el factor de expansión respecto del área plana equivalente (espesor·1000mm) es un rango típico de perfil corrugado", () => {
    const espesorMm = 0.912;
    const areaPlanaMm2PorM = espesorMm * 1000;
    const factor = apDerivadaMm2PorM(espesorMm) / areaPlanaMm2PorM;
    expect(factor).toBeGreaterThan(1.1);
    expect(factor).toBeLessThan(1.6);
  });
});
