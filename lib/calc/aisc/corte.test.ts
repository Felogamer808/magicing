import { describe, expect, it } from "vitest";
import { calcularCorte } from "./corte";
import { propiedades } from "./perfiles";

const FY = 250e6;
const E = 200e9;
const base = { fyPa: FY, ePa: E } as const;

describe("corte G2: resistencia del alma", () => {
  it("aplica Vn = 0,6·Fy·Aw·Cv1 con Aw = d·tw", () => {
    const p = propiedades("PNI", { altura: 200 });
    const r = calcularCorte({ ...base, familia: "PNI", params: { altura: 200 } });

    expect(r.awM2).toBeCloseTo(p.hM * p.twM, 9);
    expect(r.vnKN).toBeCloseTo((0.6 * FY * r.awM2 * r.cv1) / 1000, 6);
    expect(r.admisibleKN).toBeCloseTo(r.vnKN / r.omegaV, 9);
  });

  /**
   * Lo más fácil de pasar por alto del capítulo: el coeficiente de seguridad no
   * es 1,67 para todos. Las almas robustas de perfiles I laminados van con 1,50
   * (art. G1(a)), lo que las hace un 11 % más resistentes que si se aplicara el
   * coeficiente general.
   */
  it("usa Ωv = 1,50 en almas robustas de perfiles I, y 1,67 en el resto", () => {
    const perfilI = calcularCorte({ ...base, familia: "HEB", params: { altura: 200 } });
    const canal = calcularCorte({ ...base, familia: "PNC", params: { altura: 200 } });

    expect(perfilI.almaRobusta).toBe(true);
    expect(perfilI.omegaV).toBe(1.5);
    expect(perfilI.cv1).toBe(1);

    // Los canales quedan fuera de la excepción, aunque el alma sea igual de robusta.
    expect(canal.almaRobusta).toBe(false);
    expect(canal.omegaV).toBe(1.67);
  });

  it("todos los perfiles I del catálogo tienen alma robusta con Fy = 250 MPa", () => {
    for (const familia of ["PNI", "HEB"] as const) {
      // El PNI arranca en 80, el HEB en 100: se prueban alturas que existan en las dos.
      for (const altura of [200, 300]) {
        const r = calcularCorte({ ...base, familia, params: { altura } });
        expect(r.esbeltezAlma).toBeLessThanOrEqual(2.24 * Math.sqrt(E / FY));
        expect(r.almaRobusta).toBe(true);
      }
    }
  });

  it("el 2PNC aporta las dos almas", () => {
    const simple = calcularCorte({ ...base, familia: "PNC", params: { altura: 180 } });
    const doble = calcularCorte({ ...base, familia: "2PNC-almas", params: { altura: 180 } });

    expect(doble.awM2).toBeCloseTo(2 * simple.awM2, 9);
    expect(doble.vnKN).toBeCloseTo(2 * simple.vnKN, 6);
  });

  it("los rigidizadores suben kv y nunca lo bajan de 5,34", () => {
    const sin = calcularCorte({ ...base, familia: "PNC", params: { altura: 300 } });
    const juntos = calcularCorte({
      ...base,
      familia: "PNC",
      params: { altura: 300 },
      separacionRigidizadoresM: 0.2,
    });
    const lejos = calcularCorte({
      ...base,
      familia: "PNC",
      params: { altura: 300 },
      separacionRigidizadoresM: 10,
    });

    expect(sin.kv).toBe(5.34);
    expect(juntos.kv).toBeGreaterThan(5.34);
    // Con a/h > 3 la norma vuelve a 5,34: el rigidizador deja de tener efecto.
    expect(lejos.kv).toBe(5.34);
  });

  it("Cv1 nunca pasa de 1 y baja al crecer la esbeltez del alma", () => {
    // Un alma muy esbelta se fuerza bajando Fy… no: se fuerza subiendo Fy, que
    // es lo que corre el límite 1,10·√(kv·E/Fy) hacia abajo.
    const normal = calcularCorte({ ...base, familia: "PNC", params: { altura: 300 } });
    const aceroAlto = calcularCorte({ ...base, familia: "PNC", params: { altura: 300 }, fyPa: 690e6 });

    expect(normal.cv1).toBeLessThanOrEqual(1);
    expect(aceroAlto.cv1).toBeLessThanOrEqual(normal.cv1);
  });

  it("verifica contra el corte requerido cuando se lo pasa", () => {
    const sinCarga = calcularCorte({ ...base, familia: "PNI", params: { altura: 240 } });
    expect(sinCarga.verifica).toBeNull();

    const admisible = sinCarga.admisibleKN;
    expect(
      calcularCorte({ ...base, familia: "PNI", params: { altura: 240 }, vRequeridoKN: admisible * 0.5 })
        .verifica
    ).toBe(true);
    expect(
      calcularCorte({ ...base, familia: "PNI", params: { altura: 240 }, vRequeridoKN: admisible * 1.2 })
        .verifica
    ).toBe(false);
  });
});
