import { describe, expect, it } from "vitest";
import {
  ALPHA_CEMENTO,
  calcularFluencia,
  calcularRetraccion,
  coeficienteKh,
  perimetroExpuestoM,
  tamanoTeoricoMm,
  type ClaseCemento,
  type DatosFluencia,
  type DatosRetraccion,
} from "./diferidas";

// Caso base: viga 0,30×0,50 de C30 con losa encima, ambiente interior húmedo
// 70 %, cargada a 28 días con cemento normal.
const base: DatosFluencia = {
  fckMPa: 30,
  hrPct: 70,
  t0Dias: 28,
  claseCemento: "N",
  h0Mm: tamanoTeoricoMm(0.3 * 0.5, perimetroExpuestoM("tres-caras", 0.3, 0.5)),
};

describe("fluencia: tamaño teórico h0 (ec. B.6)", () => {
  it("cuenta sólo las caras que secan", () => {
    // Viga exenta: u = 2(b+h) = 1,60 m
    expect(perimetroExpuestoM("cuatro-caras", 0.3, 0.5)).toBeCloseTo(1.6, 9);
    // Con losa encima la cara superior no seca: u = b + 2h = 1,30 m
    expect(perimetroExpuestoM("tres-caras", 0.3, 0.5)).toBeCloseTo(1.3, 9);
    // Losa corrida: sólo las dos caras grandes
    expect(perimetroExpuestoM("losa", 1, 0.2)).toBeCloseTo(2, 9);
  });

  it("h0 = 2Ac/u, y en una losa se reduce a su espesor", () => {
    expect(tamanoTeoricoMm(0.3 * 0.5, 1.6)).toBeCloseTo((2 * 0.15) / 1.6 * 1000, 6);
    // Resultado clásico: h0 = h en una losa que seca por las dos caras.
    const h = 0.2;
    expect(tamanoTeoricoMm(1 * h, perimetroExpuestoM("losa", 1, h))).toBeCloseTo(h * 1000, 9);
  });

  it("tapar una cara aumenta h0 y por lo tanto baja la fluencia", () => {
    const expuesta = calcularFluencia({
      ...base, h0Mm: tamanoTeoricoMm(0.15, perimetroExpuestoM("cuatro-caras", 0.3, 0.5)),
    });
    const conLosa = calcularFluencia(base);
    expect(conLosa.phi).toBeLessThan(expuesta.phi);
  });
});

describe("fluencia: coeficiente básico φ0 (ecs. B.2 a B.5)", () => {
  it("reproduce el caso base verificado a mano", () => {
    const r = calcularFluencia(base);
    expect(r.fcmMPa).toBe(38);
    // h0 = 2·0,15/1,30 = 230,77 mm
    expect(base.h0Mm).toBeCloseTo(230.769, 3);
    expect(r.usaHormigonResistente).toBe(true);
    expect(r.phiHR).toBeCloseTo(1.4379, 3);
    expect(r.betaFcm).toBeCloseTo(16.8 / Math.sqrt(38), 9);
    expect(r.betaT0).toBeCloseTo(1 / (0.1 + 28 ** 0.2), 9);
    expect(r.phi).toBeCloseTo(1.914, 2);
  });

  it("φ0 es el producto de los tres coeficientes, ec. (B.2)", () => {
    const r = calcularFluencia(base);
    expect(r.phi).toBeCloseTo(r.phiHR * r.betaFcm * r.betaT0, 12);
  });

  it("usa la (B.3a) sin los α cuando fcm ≤ 35", () => {
    // C25 -> fcm = 33
    const r = calcularFluencia({ ...base, fckMPa: 25 });
    expect(r.usaHormigonResistente).toBe(false);
    const terminoHumedad = (1 - 70 / 100) / (0.1 * Math.cbrt(base.h0Mm));
    expect(r.phiHR).toBeCloseTo(1 + terminoHumedad, 9);
  });

  it("cae en el límite fcm = 35 del lado de la (B.3a)", () => {
    // fck = 27 -> fcm = 35 exacto: la (B.3b) rige sólo por encima.
    const r = calcularFluencia({ ...base, fckMPa: 27 });
    expect(r.fcmMPa).toBe(35);
    expect(r.usaHormigonResistente).toBe(false);
  });
});

describe("fluencia: cómo responde a cada variable", () => {
  it("más humedad ambiente da menos fluencia", () => {
    const seco = calcularFluencia({ ...base, hrPct: 40 });
    const humedo = calcularFluencia({ ...base, hrPct: 90 });
    expect(humedo.phi).toBeLessThan(seco.phi);
  });

  it("cargar más tarde da menos fluencia", () => {
    const joven = calcularFluencia({ ...base, t0Dias: 7 });
    const maduro = calcularFluencia({ ...base, t0Dias: 90 });
    expect(maduro.phi).toBeLessThan(joven.phi);
  });

  it("un hormigón más resistente fluye menos", () => {
    const bajo = calcularFluencia({ ...base, fckMPa: 25 });
    const alto = calcularFluencia({ ...base, fckMPa: 50 });
    expect(alto.phi).toBeLessThan(bajo.phi);
  });
});

describe("fluencia: corrección por tipo de cemento (ec. B.9)", () => {
  it("usa los exponentes del articulado", () => {
    expect(ALPHA_CEMENTO.S).toBe(-1);
    expect(ALPHA_CEMENTO.N).toBe(0);
    expect(ALPHA_CEMENTO.R).toBe(1);
  });

  it("con clase N la corrección es neutra: el exponente es cero", () => {
    const r = calcularFluencia({ ...base, claseCemento: "N" });
    expect(r.t0CorregidoDias).toBeCloseTo(28, 9);
  });

  it("el cemento rápido madura antes y fluye menos que el lento", () => {
    const lento = calcularFluencia({ ...base, claseCemento: "S" });
    const normal = calcularFluencia({ ...base, claseCemento: "N" });
    const rapido = calcularFluencia({ ...base, claseCemento: "R" });
    // El rápido corre t0 hacia arriba (hormigón más maduro al cargar).
    expect(rapido.t0CorregidoDias).toBeGreaterThan(normal.t0CorregidoDias);
    expect(lento.t0CorregidoDias).toBeLessThan(normal.t0CorregidoDias);
    expect(rapido.phi).toBeLessThan(lento.phi);
  });

  it("respeta el piso de 0,5 días de la ec. (B.9)", () => {
    // Carga muy temprana con cemento lento: sin el tope, t0 bajaría de 0,5.
    const r = calcularFluencia({ ...base, t0Dias: 0.5, claseCemento: "S" });
    expect(r.t0CorregidoDias).toBeGreaterThanOrEqual(0.5);
  });
});

const baseRetraccion: DatosRetraccion = {
  fckMPa: 30,
  hrPct: 70,
  claseCemento: "N",
  h0Mm: tamanoTeoricoMm(0.3 * 0.5, perimetroExpuestoM("tres-caras", 0.3, 0.5)),
};

describe("retracción: kh (tabla A19.3.3)", () => {
  it("devuelve los valores tabulados en sus puntos", () => {
    expect(coeficienteKh(100)).toBeCloseTo(1.0, 9);
    expect(coeficienteKh(200)).toBeCloseTo(0.85, 9);
    expect(coeficienteKh(300)).toBeCloseTo(0.75, 9);
    expect(coeficienteKh(500)).toBeCloseTo(0.7, 9);
  });

  it("interpola linealmente entre puntos", () => {
    expect(coeficienteKh(150)).toBeCloseTo(0.925, 9);
    expect(coeficienteKh(400)).toBeCloseTo(0.725, 9);
  });

  it("no extrapola fuera de la tabla: se queda en los extremos", () => {
    expect(coeficienteKh(50)).toBeCloseTo(1.0, 9);
    expect(coeficienteKh(2000)).toBeCloseTo(0.7, 9);
  });
});

describe("retracción: contraste contra la tabla A19.3.2", () => {
  /**
   * La tabla publica εcd,0 en ‰ para cemento Clase N. Son los mismos valores
   * que tiene que devolver la ec. (B.11), así que sirven de control externo de
   * la implementación — 30 celdas, no un caso suelto.
   */
  const HRS = [20, 40, 60, 80, 90, 100];
  const TABLA: Record<number, number[]> = {
    20: [0.62, 0.58, 0.49, 0.3, 0.17, 0.0],
    40: [0.48, 0.46, 0.38, 0.24, 0.13, 0.0],
    60: [0.38, 0.36, 0.3, 0.19, 0.1, 0.0],
    80: [0.3, 0.28, 0.24, 0.15, 0.08, 0.0],
    90: [0.27, 0.25, 0.21, 0.13, 0.07, 0.0],
  };

  it("reproduce las 30 celdas dentro del redondeo de la tabla", () => {
    for (const [fckTxt, esperados] of Object.entries(TABLA)) {
      HRS.forEach((hrPct, i) => {
        const r = calcularRetraccion({
          fckMPa: Number(fckTxt), hrPct, claseCemento: "N", h0Mm: 200,
        });
        // La tabla está redondeada a dos decimales de ‰.
        expect(Math.abs(r.epsilonCd0 * 1000 - esperados[i])).toBeLessThan(0.006);
      });
    }
  });

  it("se anula con el hormigón sumergido: βHR es cero en HR=100 %", () => {
    const r = calcularRetraccion({ ...baseRetraccion, hrPct: 100 });
    expect(r.betaHR).toBeCloseTo(0, 12);
    expect(r.epsilonCd).toBeCloseTo(0, 12);
    // La autógena no depende del ambiente: sigue estando.
    expect(r.epsilonCa).toBeGreaterThan(0);
  });
});

describe("retracción: total εcs = εcd + εca (art. 3.1.4(6))", () => {
  it("suma la parte por secado y la autógena", () => {
    const r = calcularRetraccion(baseRetraccion);
    expect(r.epsilonCd).toBeCloseTo(r.kh * r.epsilonCd0, 12);
    expect(r.epsilonCs).toBeCloseTo(r.epsilonCd + r.epsilonCa, 12);
  });

  it("la autógena sale de la ec. (3.12) y sólo depende de fck", () => {
    expect(calcularRetraccion(baseRetraccion).epsilonCa).toBeCloseTo(2.5 * (30 - 10) * 1e-6, 12);
    expect(calcularRetraccion({ ...baseRetraccion, fckMPa: 50 }).epsilonCa)
      .toBeCloseTo(2.5 * (50 - 10) * 1e-6, 12);
    // Con el ambiente cambiado, la autógena no se mueve.
    const seco = calcularRetraccion({ ...baseRetraccion, hrPct: 40 });
    const humedo = calcularRetraccion({ ...baseRetraccion, hrPct: 90 });
    expect(seco.epsilonCa).toBeCloseTo(humedo.epsilonCa, 12);
    expect(seco.epsilonCd).toBeGreaterThan(humedo.epsilonCd);
  });

  it("da un orden de magnitud razonable para una viga de interior", () => {
    // El valor que la página traía cargado a mano era 0,0003.
    const r = calcularRetraccion(baseRetraccion);
    expect(r.epsilonCs).toBeGreaterThan(1e-4);
    expect(r.epsilonCs).toBeLessThan(6e-4);
  });

  it("una sección más gruesa retrae menos, por kh", () => {
    const delgada = calcularRetraccion({ ...baseRetraccion, h0Mm: 100 });
    const gruesa = calcularRetraccion({ ...baseRetraccion, h0Mm: 600 });
    expect(gruesa.epsilonCd).toBeLessThan(delgada.epsilonCd);
  });

  it("el cemento rápido retrae más por secado que el lento", () => {
    const porClase = (claseCemento: ClaseCemento) =>
      calcularRetraccion({ ...baseRetraccion, claseCemento }).epsilonCd0;
    expect(porClase("R")).toBeGreaterThan(porClase("N"));
    expect(porClase("N")).toBeGreaterThan(porClase("S"));
  });
});
