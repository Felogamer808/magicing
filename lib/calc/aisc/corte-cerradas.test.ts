import { describe, expect, it } from "vitest";
import { calcularG4, calcularG5, coeficienteCv2, OMEGA_V } from "./corte-cerradas";
import { calcularCorteSegunSeccion } from "./seleccion-articulo";
import { propiedades } from "./perfiles";

const FY = 250e6;
const E = 200e9;
const base = { fyPa: FY, ePa: E } as const;

describe("Cv2: coeficiente de pandeo por corte del alma", () => {
  it("vale 1 hasta el primer límite y después baja", () => {
    const kv = 5;
    const limite = 1.1 * Math.sqrt((kv * E) / FY);

    expect(coeficienteCv2(limite * 0.9, kv, FY, E)).toBe(1);
    expect(coeficienteCv2(limite * 1.1, kv, FY, E)).toBeLessThan(1);
    expect(coeficienteCv2(limite * 3, kv, FY, E)).toBeLessThan(
      coeficienteCv2(limite * 1.1, kv, FY, E)
    );
  });

  it("las tres ramas empalman en sus límites", () => {
    const kv = 5;
    const l1 = 1.1 * Math.sqrt((kv * E) / FY);
    const l2 = 1.37 * Math.sqrt((kv * E) / FY);

    // En el primer límite, la ec. G2-10 devuelve exactamente 1.
    expect(coeficienteCv2(l1, kv, FY, E)).toBeCloseTo(1, 9);
    // En el segundo, G2-10 da 1,10/1,37 = 0,8029 y G2-11 da 1,51/1,37² = 0,8045.
    // El escalón de 0,2 % es de los coeficientes redondeados de la norma: el
    // empalme exacto pediría 1,10·1,37 = 1,507, y el articulado escribe 1,51.
    // Se admite en lugar de disimularlo, igual que el salto de las ramas de E3.
    expect(coeficienteCv2(l2 * 0.9999, kv, FY, E)).toBeCloseTo(
      coeficienteCv2(l2 * 1.0001, kv, FY, E),
      2
    );
  });
});

describe("G4: corte de tubos rectangulares y cajones", () => {
  it("aplica Vn = 0,6·Fy·Aw·Cv2 con las dos almas", () => {
    const params = { alto: 200, ancho: 100, espesor: 6 };
    const p = propiedades("tubo-rectangular", params);
    const r = calcularG4({ ...base, familia: "tubo-rectangular", params });

    expect(r.awM2).toBeCloseTo(2 * p.hAlmaM * p.twM, 12);
    expect(r.kv).toBe(5);
    expect(r.vnKN).toBeCloseTo((0.6 * FY * r.awM2 * r.cv2) / 1000, 6);
    expect(r.admisibleKN).toBeCloseTo(r.vnKN / OMEGA_V, 9);
  });

  it("no tiene la excepción de Ωv = 1,50 de los perfiles I laminados", () => {
    const r = calcularG4({ ...base, familia: "tubo-rectangular", params: { alto: 200, ancho: 100, espesor: 6 } });
    expect(r.omegaV).toBe(1.67);
  });

  it("un alma robusta llega a Cv2 = 1", () => {
    const grueso = calcularG4({ ...base, familia: "tubo-rectangular", params: { alto: 200, ancho: 100, espesor: 12 } });
    const fino = calcularG4({ ...base, familia: "tubo-rectangular", params: { alto: 400, ancho: 100, espesor: 3 } });

    expect(grueso.cv2).toBe(1);
    expect(fino.cv2).toBeLessThan(1);
  });

  it("sirve también para el cajón de dos PNC", () => {
    const r = calcularG4({ ...base, familia: "2PNC-cajon", params: { altura: 180 } });
    expect(r.admisibleKN).toBeGreaterThan(0);
    expect(r.designacion).toBe("2PNC180 cajón");
  });
});

describe("G5: corte de tubos redondos", () => {
  it("solo la mitad del área trabaja al corte", () => {
    const params = { diametro: 168.3, espesor: 6 };
    const p = propiedades("tubo-redondo", params);
    const r = calcularG5({ ...base, familia: "tubo-redondo", params, lvM: 2 });

    expect(r.areaM2).toBeCloseTo(p.areaM2, 12);
    expect(r.vnKN).toBeCloseTo((r.fcrPa * p.areaM2) / 2 / 1000, 6);
  });

  /**
   * La nota de usuario del artículo dice que en secciones corrientes gobierna la
   * fluencia y Fcr vale 0,6·Fy; el pandeo aparece con D/t por encima de 100.
   */
  it("en secciones corrientes gobierna la fluencia", () => {
    const r = calcularG5({ ...base, familia: "tubo-redondo", params: { diametro: 168.3, espesor: 6 }, lvM: 2 });

    expect(r.gobierna).toBe("fluencia");
    expect(r.fcrPa).toBeCloseTo(0.6 * FY, 6);
    expect(r.relacionDt).toBeLessThan(100);
  });

  it("con la pared muy fina pasa a gobernar el pandeo", () => {
    const r = calcularG5({ ...base, familia: "tubo-redondo", params: { diametro: 600, espesor: 3 }, lvM: 6 });

    expect(r.relacionDt).toBeGreaterThan(100);
    expect(r.gobierna).toBe("pandeo");
    expect(r.fcrPa).toBeLessThan(0.6 * FY);
  });

  it("Lv más largo no puede aumentar la resistencia", () => {
    const params = { diametro: 600, espesor: 3 };
    const corto = calcularG5({ ...base, familia: "tubo-redondo", params, lvM: 1 });
    const largo = calcularG5({ ...base, familia: "tubo-redondo", params, lvM: 10 });

    expect(largo.admisibleKN).toBeLessThanOrEqual(corto.admisibleKN + 1e-9);
  });
});

describe("elección del artículo de corte según la sección", () => {
  it("manda cada sección al artículo que le corresponde", () => {
    const casos = [
      ["PNI", { altura: 200 }, "G2"],
      ["PNC", { altura: 180 }, "G2"],
      ["2PNC-almas", { altura: 180 }, "G2"],
      ["2PNC-cajon", { altura: 180 }, "G4"],
      ["tubo-rectangular", { alto: 200, ancho: 100, espesor: 6 }, "G4"],
      ["tubo-redondo", { diametro: 168.3, espesor: 6 }, "G5"],
    ] as const;

    for (const [familia, params, articulo] of casos) {
      const r = calcularCorteSegunSeccion({ ...base, familia, params, lvM: 2 });
      expect(r.articulo).toBe(articulo);
      expect(r.admisibleKN).toBeGreaterThan(0);
    }
  });
});
