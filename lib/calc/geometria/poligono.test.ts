import { describe, expect, it } from "vitest";
import { areaConSigno, calcularPropiedadesSeccion, type Punto } from "./poligono";

/**
 * Este motor no salió de la planilla ni de ninguna tabla: integra sobre el
 * contorno. Así que no alcanza con comparar contra un valor apuntado — hay que
 * contrastarlo contra algo independiente. Se hace de tres maneras:
 *
 *  1. Contra las fórmulas cerradas que sí son incuestionables (bh³/12 del
 *     rectángulo, bh³/36 del triángulo, πr⁴/4 del círculo).
 *  2. Contra integración numérica por celdas, que no comparte una sola línea de
 *     código con el motor. Si los dos dan lo mismo, el error tendría que estar
 *     en los dos a la vez y de la misma forma.
 *  3. Contra invariantes que tienen que cumplirse sí o sí: el área no cambia al
 *     rotar, Ix + Iy tampoco, y en los ejes principales Ixy se anula.
 */

/** Contorno rectangular apoyado en el origen, esquina inferior izquierda. */
function rectangulo(bCm: number, hCm: number, x0 = 0, y0 = 0): Punto[] {
  return [
    { xCm: x0, yCm: y0 },
    { xCm: x0 + bCm, yCm: y0 },
    { xCm: x0 + bCm, yCm: y0 + hCm },
    { xCm: x0, yCm: y0 + hCm },
  ];
}

/** Polígono regular de n lados inscripto en una circunferencia de radio r. */
function poligonoRegular(n: number, rCm: number): Punto[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (2 * Math.PI * i) / n;
    return { xCm: rCm * Math.cos(a), yCm: rCm * Math.sin(a) };
  });
}

function rotar(contorno: readonly Punto[], grados: number): Punto[] {
  const t = (grados * Math.PI) / 180;
  const c = Math.cos(t);
  const s = Math.sin(t);
  return contorno.map((p) => ({
    xCm: p.xCm * c - p.yCm * s,
    yCm: p.xCm * s + p.yCm * c,
  }));
}

/**
 * Integración numérica por barrido de celdas, sin ninguna relación con el
 * motor: se decide si el centro de cada celda cae dentro del polígono por el
 * criterio del número de cruces, y se acumulan los momentos a lo bruto.
 */
function integrarPorCeldas(contorno: readonly Punto[], divisiones = 900) {
  const xs = contorno.map((p) => p.xCm);
  const ys = contorno.map((p) => p.yCm);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const dx = (xMax - xMin) / divisiones;
  const dy = (yMax - yMin) / divisiones;
  const dA = dx * dy;

  const dentro = (x: number, y: number) => {
    let cruces = 0;
    for (let i = 0; i < contorno.length; i++) {
      const a = contorno[i];
      const b = contorno[(i + 1) % contorno.length];
      if (a.yCm > y !== b.yCm > y) {
        const xCorte = a.xCm + ((y - a.yCm) * (b.xCm - a.xCm)) / (b.yCm - a.yCm);
        if (x < xCorte) cruces++;
      }
    }
    return cruces % 2 === 1;
  };

  let area = 0;
  let sx = 0;
  let sy = 0;
  let ixx = 0;
  let iyy = 0;
  for (let i = 0; i < divisiones; i++) {
    const x = xMin + (i + 0.5) * dx;
    for (let j = 0; j < divisiones; j++) {
      const y = yMin + (j + 0.5) * dy;
      if (!dentro(x, y)) continue;
      area += dA;
      sx += y * dA;
      sy += x * dA;
      ixx += y * y * dA;
      iyy += x * x * dA;
    }
  }
  const cx = sy / area;
  const cy = sx / area;
  return { area, cx, cy, ix: ixx - area * cy * cy, iy: iyy - area * cx * cx };
}

describe("motor de polígonos — contra fórmula cerrada", () => {
  it("el rectángulo reproduce bh³/12 sin que la fórmula esté escrita", () => {
    const r = calcularPropiedadesSeccion(rectangulo(20, 40));
    expect(r.areaCm2).toBeCloseTo(800, 9);
    expect(r.centroideXCm).toBeCloseTo(10, 9);
    expect(r.centroideYCm).toBeCloseTo(20, 9);
    expect(r.ixCm4).toBeCloseTo((20 * 40 ** 3) / 12, 6);
    expect(r.iyCm4).toBeCloseTo((40 * 20 ** 3) / 12, 6);
    // Con dos ejes de simetría el producto de inercia tiene que anularse.
    expect(r.ixyCm4).toBeCloseTo(0, 9);
    expect(r.perimetroCm).toBeCloseTo(120, 9);
  });

  it("el módulo resistente del rectángulo es bh²/6 en las dos fibras", () => {
    const r = calcularPropiedadesSeccion(rectangulo(20, 40));
    expect(r.wxSuperiorCm3).toBeCloseTo((20 * 40 ** 2) / 6, 6);
    expect(r.wxInferiorCm3).toBeCloseTo((20 * 40 ** 2) / 6, 6);
  });

  it("el radio de giro del rectángulo es h/√12", () => {
    const r = calcularPropiedadesSeccion(rectangulo(20, 40));
    expect(r.radioGiroXCm).toBeCloseTo(40 / Math.sqrt(12), 9);
    expect(r.radioGiroYCm).toBeCloseTo(20 / Math.sqrt(12), 9);
  });

  it("el triángulo da bh³/36 y el centroide a un tercio de la altura", () => {
    const t: Punto[] = [
      { xCm: 0, yCm: 0 },
      { xCm: 30, yCm: 0 },
      { xCm: 12, yCm: 24 },
    ];
    const r = calcularPropiedadesSeccion(t);
    expect(r.areaCm2).toBeCloseTo((30 * 24) / 2, 9);
    expect(r.centroideYCm).toBeCloseTo(8, 9);
    expect(r.ixCm4).toBeCloseTo((30 * 24 ** 3) / 36, 6);
  });

  it("un polígono de muchos lados converge a πr⁴/4 del círculo", () => {
    const r = calcularPropiedadesSeccion(poligonoRegular(2000, 10));
    expect(r.areaCm2).toBeCloseTo(Math.PI * 100, 2);
    expect(r.ixCm4).toBeCloseTo((Math.PI * 10 ** 4) / 4, 1);
    expect(r.iyCm4).toBeCloseTo((Math.PI * 10 ** 4) / 4, 1);
  });

  it("el contorno se puede dar en cualquier sentido de giro", () => {
    const horario = [...rectangulo(20, 40)].reverse();
    const r = calcularPropiedadesSeccion(horario);
    expect(r.areaCm2).toBeCloseTo(800, 9);
    expect(r.ixCm4).toBeCloseTo((20 * 40 ** 3) / 12, 6);
    // El área con signo sí cambia: es lo que permite descontar huecos.
    expect(areaConSigno(horario)).toBeLessThan(0);
  });
});

describe("motor de polígonos — contra integración numérica independiente", () => {
  // Perfil en T: ala de 30×8 arriba, alma de 10×32 abajo. Un solo eje de
  // simetría, así que el centroide no está a media altura y eso es justamente
  // lo que se quiere contrastar.
  const perfilT: Punto[] = [
    { xCm: 10, yCm: 0 },
    { xCm: 20, yCm: 0 },
    { xCm: 20, yCm: 32 },
    { xCm: 30, yCm: 32 },
    { xCm: 30, yCm: 40 },
    { xCm: 0, yCm: 40 },
    { xCm: 0, yCm: 32 },
    { xCm: 10, yCm: 32 },
  ];

  it("la T coincide con el barrido por celdas", () => {
    const r = calcularPropiedadesSeccion(perfilT);
    const n = integrarPorCeldas(perfilT);
    expect(r.areaCm2).toBeCloseTo(n.area, 1);
    expect(r.centroideYCm).toBeCloseTo(n.cy, 2);
    expect(r.ixCm4 / n.ix).toBeCloseTo(1, 3);
    expect(r.iyCm4 / n.iy).toBeCloseTo(1, 3);
  });

  it("la T tiene el centroide corrido hacia el ala y dos W distintos", () => {
    const r = calcularPropiedadesSeccion(perfilT);
    // 320 cm² de alma con centro en 16 y 240 cm² de ala con centro en 36.
    const yEsperado = (320 * 16 + 240 * 36) / 560;
    expect(r.centroideYCm).toBeCloseTo(yEsperado, 9);
    expect(r.wxSuperiorCm3).toBeGreaterThan(r.wxInferiorCm3);
  });

  it("el ángulo, que no es simétrico, coincide con el barrido", () => {
    const angulo: Punto[] = [
      { xCm: 0, yCm: 0 },
      { xCm: 20, yCm: 0 },
      { xCm: 20, yCm: 4 },
      { xCm: 4, yCm: 4 },
      { xCm: 4, yCm: 25 },
      { xCm: 0, yCm: 25 },
    ];
    const r = calcularPropiedadesSeccion(angulo);
    const n = integrarPorCeldas(angulo);
    expect(r.areaCm2).toBeCloseTo(n.area, 1);
    expect(r.centroideXCm).toBeCloseTo(n.cx, 2);
    expect(r.centroideYCm).toBeCloseTo(n.cy, 2);
    expect(r.ixCm4 / n.ix).toBeCloseTo(1, 3);
  });
});

describe("motor de polígonos — invariantes", () => {
  const angulo: Punto[] = [
    { xCm: 0, yCm: 0 },
    { xCm: 20, yCm: 0 },
    { xCm: 20, yCm: 4 },
    { xCm: 4, yCm: 4 },
    { xCm: 4, yCm: 25 },
    { xCm: 0, yCm: 25 },
  ];

  it("el ángulo tiene producto de inercia no nulo: sin eje de simetría", () => {
    const r = calcularPropiedadesSeccion(angulo);
    expect(Math.abs(r.ixyCm4)).toBeGreaterThan(1);
  });

  it("rotar la sección no cambia el área ni la suma Ix + Iy", () => {
    const base = calcularPropiedadesSeccion(angulo);
    const girado = calcularPropiedadesSeccion(rotar(angulo, 37));
    expect(girado.areaCm2).toBeCloseTo(base.areaCm2, 8);
    expect(girado.ixCm4 + girado.iyCm4).toBeCloseTo(base.ixCm4 + base.iyCm4, 6);
  });

  it("las inercias principales no cambian al rotar la sección", () => {
    const base = calcularPropiedadesSeccion(angulo);
    const girado = calcularPropiedadesSeccion(rotar(angulo, 37));
    expect(girado.i1Cm4).toBeCloseTo(base.i1Cm4, 6);
    expect(girado.i2Cm4).toBeCloseTo(base.i2Cm4, 6);
  });

  it("girar la sección al ángulo principal anula el producto de inercia", () => {
    const base = calcularPropiedadesSeccion(angulo);
    const alineado = calcularPropiedadesSeccion(rotar(angulo, -base.anguloPrincipalGrados));
    expect(alineado.ixyCm4).toBeCloseTo(0, 6);
    // Y ahí Ix pasa a ser la inercia principal mayor.
    expect(alineado.ixCm4).toBeCloseTo(base.i1Cm4, 6);
  });

  it("I1 ≥ I2 siempre, y en una sección simétrica coinciden con Ix e Iy", () => {
    const r = calcularPropiedadesSeccion(rectangulo(20, 40));
    expect(r.i1Cm4).toBeGreaterThanOrEqual(r.i2Cm4);
    expect(r.i1Cm4).toBeCloseTo(r.ixCm4, 6);
    expect(r.i2Cm4).toBeCloseTo(r.iyCm4, 6);
    expect(r.anguloPrincipalGrados).toBeCloseTo(0, 9);
  });

  it("trasladar la sección no cambia ninguna inercia centroidal", () => {
    const base = calcularPropiedadesSeccion(angulo);
    const lejos = calcularPropiedadesSeccion(
      angulo.map((p) => ({ xCm: p.xCm + 1000, yCm: p.yCm - 250 }))
    );
    expect(lejos.ixCm4).toBeCloseTo(base.ixCm4, 4);
    expect(lejos.iyCm4).toBeCloseTo(base.iyCm4, 4);
    expect(lejos.ixyCm4).toBeCloseTo(base.ixyCm4, 4);
  });
});

describe("motor de polígonos — huecos", () => {
  it("el rectángulo hueco da la resta de las dos inercias", () => {
    const r = calcularPropiedadesSeccion(rectangulo(20, 40), [rectangulo(16, 36, 2, 2)]);
    expect(r.areaCm2).toBeCloseTo(800 - 576, 9);
    expect(r.ixCm4).toBeCloseTo((20 * 40 ** 3) / 12 - (16 * 36 ** 3) / 12, 6);
    expect(r.iyCm4).toBeCloseTo((40 * 20 ** 3) / 12 - (36 * 16 ** 3) / 12, 6);
  });

  it("el hueco se descuenta igual escrito en cualquier sentido de giro", () => {
    const derecho = calcularPropiedadesSeccion(rectangulo(20, 40), [rectangulo(16, 36, 2, 2)]);
    const alReves = calcularPropiedadesSeccion(rectangulo(20, 40), [
      [...rectangulo(16, 36, 2, 2)].reverse(),
    ]);
    expect(alReves.areaCm2).toBeCloseTo(derecho.areaCm2, 9);
    expect(alReves.ixCm4).toBeCloseTo(derecho.ixCm4, 6);
  });

  it("un hueco descentrado corre el centroide hacia el lado lleno", () => {
    const r = calcularPropiedadesSeccion(rectangulo(20, 40), [rectangulo(8, 8, 2, 28)]);
    expect(r.centroideYCm).toBeLessThan(20);
    expect(r.centroideXCm).toBeGreaterThan(10);
  });

  it("una sección de área nula se rechaza en vez de devolver infinitos", () => {
    expect(() => calcularPropiedadesSeccion(rectangulo(10, 10), [rectangulo(10, 10)])).toThrow(
      /área nula/
    );
  });

  it("un contorno de menos de tres vértices se rechaza", () => {
    expect(() =>
      calcularPropiedadesSeccion([
        { xCm: 0, yCm: 0 },
        { xCm: 1, yCm: 1 },
      ])
    ).toThrow(/tres vértices/);
  });
});
