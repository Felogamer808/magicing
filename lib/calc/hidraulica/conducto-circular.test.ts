import { describe, expect, it } from "vitest";
import {
  LLENADO_CAUDAL_MAXIMO,
  calcularConductoCircular,
  caudalParaLlenado,
  seccionMojada,
} from "./conducto-circular";

/*
 * A diferencia del resto del proyecto, acá no hay una planilla contra la cual
 * contrastar: la sección arranca de cero. Los casos se comprueban contra la
 * geometría exacta, que se puede escribir a mano, y contra propiedades del
 * escurrimiento que tienen que cumplirse sí o sí.
 */

describe("geometría de la sección mojada", () => {
  it("a media sección da medio círculo y radio hidráulico D/4", () => {
    const s = seccionMojada(1, 0.5);
    expect(s.anguloRad).toBeCloseTo(Math.PI, 9);
    expect(s.areaM2).toBeCloseTo(Math.PI / 8, 9);
    expect(s.perimetroM).toBeCloseTo(Math.PI / 2, 9);
    // Curiosidad conocida: a media sección R vale lo mismo que a sección llena.
    expect(s.radioHidraulicoM).toBeCloseTo(0.25, 9);
  });

  it("lleno da el círculo completo", () => {
    const s = seccionMojada(2, 1);
    expect(s.anguloRad).toBeCloseTo(2 * Math.PI, 9);
    expect(s.areaM2).toBeCloseTo(Math.PI, 9);
    expect(s.perimetroM).toBeCloseTo(2 * Math.PI, 9);
    expect(s.radioHidraulicoM).toBeCloseTo(0.5, 9);
  });

  it("vacío no tiene área ni perímetro", () => {
    const s = seccionMojada(1, 0);
    expect(s.areaM2).toBeCloseTo(0, 12);
    expect(s.perimetroM).toBeCloseTo(0, 12);
  });
});

describe("caudal por Manning", () => {
  const base = { caudalM3s: 0, diametroM: 0.3, pendiente: 0.005, manning: 0.013 };

  it("el máximo no está en el conducto lleno", () => {
    const lleno = caudalParaLlenado(base, 1);
    const casiLleno = caudalParaLlenado(base, LLENADO_CAUDAL_MAXIMO);
    // Pasado 0,938 el perímetro crece más rápido que el área y el caudal baja.
    expect(casiLleno).toBeGreaterThan(lleno);
  });

  it("crece con la pendiente según su raíz", () => {
    const q1 = caudalParaLlenado({ ...base, pendiente: 0.004 }, 0.6);
    const q2 = caudalParaLlenado({ ...base, pendiente: 0.016 }, 0.6);
    // Cuadruplicar la pendiente duplica el caudal.
    expect(q2 / q1).toBeCloseTo(2, 6);
  });

  it("es inversamente proporcional a la rugosidad", () => {
    const q1 = caudalParaLlenado({ ...base, manning: 0.010 }, 0.6);
    const q2 = caudalParaLlenado({ ...base, manning: 0.020 }, 0.6);
    expect(q1 / q2).toBeCloseTo(2, 6);
  });
});

describe("dimensionado del conducto", () => {
  const limites = { velocidadMinimaMs: 0.6, velocidadMaximaMs: 3, llenadoMaximo: 0.75 };
  const datos = { caudalM3s: 0.03, diametroM: 0.3, pendiente: 0.005, manning: 0.013 };

  it("encuentra el llenado que transporta el caudal pedido", () => {
    const r = calcularConductoCircular(datos, limites);
    // La bisección tiene que devolver una sección que reproduzca el caudal.
    expect(r.caudalVerificacionM3s).toBeCloseTo(datos.caudalM3s, 6);
    expect(r.seccion.llenado).toBeGreaterThan(0);
    expect(r.seccion.llenado).toBeLessThan(LLENADO_CAUDAL_MAXIMO);
  });

  it("la velocidad es el caudal sobre el área mojada", () => {
    const r = calcularConductoCircular(datos, limites);
    expect(r.velocidadMs).toBeCloseTo(datos.caudalM3s / r.seccion.areaM2, 6);
  });

  it("avisa cuando el conducto no da para el caudal pedido", () => {
    const r = calcularConductoCircular({ ...datos, caudalM3s: 5 }, limites);
    expect(r.desborda).toBe(true);
    // Si desborda no se declara ninguna comprobación cumplida: no hay régimen
    // a superficie libre del cual hablar.
    expect(r.verificaLlenado).toBe(false);
    expect(r.verificaVelocidadMinima).toBe(false);
    expect(r.verificaVelocidadMaxima).toBe(false);
  });

  it("con poco caudal la velocidad cae y no autolimpia", () => {
    const r = calcularConductoCircular({ ...datos, caudalM3s: 0.0005 }, limites);
    expect(r.velocidadMs).toBeLessThan(limites.velocidadMinimaMs);
    expect(r.verificaVelocidadMinima).toBe(false);
  });

  it("con mucha pendiente la velocidad se pasa del máximo", () => {
    const r = calcularConductoCircular({ ...datos, pendiente: 0.3 }, limites);
    expect(r.velocidadMs).toBeGreaterThan(limites.velocidadMaximaMs);
    expect(r.verificaVelocidadMaxima).toBe(false);
  });

  it("un conducto holgado verifica el grado de llenado y uno justo no", () => {
    const holgado = calcularConductoCircular({ ...datos, diametroM: 0.4 }, limites);
    const justo = calcularConductoCircular({ ...datos, diametroM: 0.2 }, limites);
    expect(holgado.seccion.llenado).toBeLessThan(justo.seccion.llenado);
    expect(holgado.verificaLlenado).toBe(true);
    expect(justo.verificaLlenado).toBe(false);
  });
});
