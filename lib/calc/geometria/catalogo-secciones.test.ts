import { describe, expect, it } from "vitest";
import {
  CATALOGO_SECCIONES,
  seccionPorId,
  valoresPorDefecto,
  type DefinicionSeccion,
} from "./catalogo-secciones";
import { calcularPropiedadesSeccion } from "./poligono";

/**
 * El motor ya está verificado en `poligono.test.ts` contra integración
 * numérica. Lo que se verifica acá es otra cosa: que cada contorno del catálogo
 * esté bien dibujado. Un vértice mal puesto no rompe nada —el motor integra
 * igual de contento— y devuelve un número plausible pero equivocado.
 *
 * El contraste es por descomposición en rectángulos con Steiner, que es como se
 * hace a mano y no comparte código con el contorno.
 */

function propsDe(def: DefinicionSeccion, cambios: Record<string, number> = {}) {
  const v = { ...valoresPorDefecto(def), ...cambios };
  const c = def.contorno(v);
  return { props: calcularPropiedadesSeccion(c.lleno, c.huecos), v };
}

/** Inercia de un conjunto de rectángulos respecto de su centroide común. */
function porRectangulos(rects: { b: number; h: number; yc: number }[]) {
  const area = rects.reduce((s, r) => s + r.b * r.h, 0);
  const yc = rects.reduce((s, r) => s + r.b * r.h * r.yc, 0) / area;
  const ix = rects.reduce(
    (s, r) => s + (r.b * r.h ** 3) / 12 + r.b * r.h * (r.yc - yc) ** 2,
    0
  );
  return { area, yc, ix };
}

describe("catálogo — cada contorno cierra y da números sanos", () => {
  it.each(CATALOGO_SECCIONES.map((s) => [s.nombre, s] as const))(
    "%s da área positiva y ninguna propiedad NaN",
    (_nombre, def) => {
      const { props } = propsDe(def);
      expect(props.areaCm2).toBeGreaterThan(0);
      for (const [clave, valor] of Object.entries(props)) {
        if (typeof valor === "number") {
          expect(Number.isFinite(valor) || valor === Infinity, `${clave} = ${valor}`).toBe(true);
          expect(Number.isNaN(valor), `${clave} es NaN`).toBe(false);
        }
      }
      expect(props.ixCm4).toBeGreaterThan(0);
      expect(props.iyCm4).toBeGreaterThan(0);
      expect(props.i1Cm4).toBeGreaterThanOrEqual(props.i2Cm4);
    }
  );

  it("los ids del catálogo no se repiten", () => {
    const ids = CATALOGO_SECCIONES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("las dimensiones exteriores coinciden con lo que se pidió", () => {
    const { props } = propsDe(seccionPorId("rectangulo")!);
    expect(props.anchoTotalCm).toBeCloseTo(20, 9);
    expect(props.altoTotalCm).toBeCloseTo(40, 9);
  });
});

describe("catálogo — contra descomposición en rectángulos", () => {
  it("el perfil I coincide con la suma de sus tres chapas", () => {
    const { props, v } = propsDe(seccionPorId("perfil-i")!);
    const hAlma = v.hTotal - 2 * v.eAla;
    const esperado = porRectangulos([
      { b: v.bAla, h: v.eAla, yc: v.eAla / 2 },
      { b: v.eAlma, h: hAlma, yc: v.eAla + hAlma / 2 },
      { b: v.bAla, h: v.eAla, yc: v.hTotal - v.eAla / 2 },
    ]);
    expect(props.areaCm2).toBeCloseTo(esperado.area, 6);
    expect(props.centroideYCm).toBeCloseTo(esperado.yc, 6);
    expect(props.ixCm4).toBeCloseTo(esperado.ix, 4);
    // Doble simetría: el producto de inercia se anula y no hay giro principal.
    expect(props.ixyCm4).toBeCloseTo(0, 6);
    expect(props.anguloPrincipalGrados).toBeCloseTo(0, 6);
  });

  it("el perfil T coincide con la suma de ala y alma", () => {
    const { props, v } = propsDe(seccionPorId("perfil-t")!);
    const hAlma = v.hTotal - v.eAla;
    const esperado = porRectangulos([
      { b: v.eAlma, h: hAlma, yc: hAlma / 2 },
      { b: v.bAla, h: v.eAla, yc: hAlma + v.eAla / 2 },
    ]);
    expect(props.areaCm2).toBeCloseTo(esperado.area, 6);
    expect(props.centroideYCm).toBeCloseTo(esperado.yc, 6);
    expect(props.ixCm4).toBeCloseTo(esperado.ix, 4);
    expect(props.ixyCm4).toBeCloseTo(0, 6);
  });

  it("la T tiene el centroide arriba de la mitad y W distintos por fibra", () => {
    const { props, v } = propsDe(seccionPorId("perfil-t")!);
    expect(props.centroideYCm).toBeGreaterThan(v.hTotal / 2);
    expect(props.wxSuperiorCm3).toBeGreaterThan(props.wxInferiorCm3);
  });

  it("el I de alas desiguales corre el centroide hacia el ala grande", () => {
    const def = seccionPorId("perfil-i-asimetrico")!;
    const { props, v } = propsDe(def);
    expect(props.centroideYCm).toBeLessThan(v.hTotal / 2);
    // Y si se igualan las alas, vuelve al medio.
    const simetrico = propsDe(def, { bSup: 30, eSup: 3, bInf: 30, eInf: 3 });
    expect(simetrico.props.centroideYCm).toBeCloseTo(v.hTotal / 2, 6);
    expect(simetrico.props.ixyCm4).toBeCloseTo(0, 6);
  });
});

describe("catálogo — secciones circulares contra fórmula cerrada", () => {
  it("el círculo da πd⁴/64 dentro del error de discretización", () => {
    const { props, v } = propsDe(seccionPorId("circulo")!);
    expect(props.areaCm2 / ((Math.PI * v.d ** 2) / 4)).toBeCloseTo(1, 4);
    expect(props.ixCm4 / ((Math.PI * v.d ** 4) / 64)).toBeCloseTo(1, 4);
    expect(props.ixCm4).toBeCloseTo(props.iyCm4, 4);
  });

  /**
   * El error de aproximar el círculo por un polígono se mide en vez de darlo
   * por bueno. El polígono va inscripto, así que el defecto tiene signo: nunca
   * puede dar de más. Si alguien baja el número de lados, este test avisa.
   */
  it("error de discretización: el círculo queda corto y por menos de 5·10⁻⁵", () => {
    const { props, v } = propsDe(seccionPorId("circulo")!);
    const errorArea = props.areaCm2 / ((Math.PI * v.d ** 2) / 4) - 1;
    const errorInercia = props.ixCm4 / ((Math.PI * v.d ** 4) / 64) - 1;
    expect(errorArea).toBeLessThan(0);
    expect(errorInercia).toBeLessThan(0);
    expect(Math.abs(errorArea)).toBeLessThan(5e-5);
    expect(Math.abs(errorInercia)).toBeLessThan(5e-5);
  });

  it("el medio círculo pone el centroide en 4r/(3π) sobre la base", () => {
    const { props, v } = propsDe(seccionPorId("semicirculo")!);
    const r = v.d / 2;
    expect(props.centroideYCm).toBeCloseTo((4 * r) / (3 * Math.PI), 4);
    expect(props.areaCm2 / ((Math.PI * r ** 2) / 2)).toBeCloseTo(1, 4);
  });

  it("el círculo hueco da π(D⁴−d⁴)/64", () => {
    const { props, v } = propsDe(seccionPorId("circulo-hueco")!);
    const dInt = v.d - 2 * v.e;
    expect(props.ixCm4 / ((Math.PI * (v.d ** 4 - dInt ** 4)) / 64)).toBeCloseTo(1, 4);
    expect(props.areaCm2 / ((Math.PI * (v.d ** 2 - dInt ** 2)) / 4)).toBeCloseTo(1, 4);
  });

  it("el sector de 360° tiende al círculo completo", () => {
    const { props } = propsDe(seccionPorId("sector")!, { ang: 359.9 });
    expect(props.areaCm2 / (Math.PI * 15 ** 2)).toBeCloseTo(1, 3);
  });

  it("el hexágono regular tiene la misma inercia en las dos direcciones", () => {
    const { props } = propsDe(seccionPorId("poligono-regular")!, { n: 6 });
    expect(props.ixCm4).toBeCloseTo(props.iyCm4, 6);
    expect(props.ixyCm4).toBeCloseTo(0, 6);
  });
});

describe("catálogo — las secciones sin simetría son las que justifican el motor", () => {
  it("el ángulo de alas desiguales tiene ejes principales girados", () => {
    const { props } = propsDe(seccionPorId("perfil-l")!);
    expect(Math.abs(props.ixyCm4)).toBeGreaterThan(1);
    expect(Math.abs(props.anguloPrincipalGrados)).toBeGreaterThan(5);
    // La inercia principal mayor supera a las dos de los ejes coordenados: es
    // justamente lo que una tabla que sólo da Ix e Iy deja afuera.
    expect(props.i1Cm4).toBeGreaterThan(Math.max(props.ixCm4, props.iyCm4));
    expect(props.i2Cm4).toBeLessThan(Math.min(props.ixCm4, props.iyCm4));
  });

  it("el ángulo de alas iguales tiene el eje principal a 45°", () => {
    const { props } = propsDe(seccionPorId("perfil-l")!, { bH: 20, bV: 20 });
    expect(Math.abs(props.anguloPrincipalGrados)).toBeCloseTo(45, 3);
  });

  it("el perfil Z también tiene producto de inercia no nulo", () => {
    const { props } = propsDe(seccionPorId("perfil-z")!);
    expect(Math.abs(props.ixyCm4)).toBeGreaterThan(1);
    expect(Math.abs(props.anguloPrincipalGrados)).toBeGreaterThan(1);
  });

  it("el canal corre el centroide hacia el alma pero no gira los ejes", () => {
    const { props, v } = propsDe(seccionPorId("perfil-c")!);
    expect(props.centroideXCm).toBeLessThan(v.bAla / 2);
    expect(props.centroideYCm).toBeCloseTo(v.hTotal / 2, 6);
    // Tiene un eje de simetría horizontal, así que Ixy se anula igual.
    expect(props.ixyCm4).toBeCloseTo(0, 6);
  });
});

describe("catálogo — validaciones", () => {
  it("rechaza un espesor que se come el tubo rectangular", () => {
    const def = seccionPorId("rectangulo-hueco")!;
    expect(def.validar!({ ...valoresPorDefecto(def), e: 12 })).toMatch(/espesor/i);
    expect(def.validar!(valoresPorDefecto(def))).toBeNull();
  });

  it("rechaza un espesor que llega al centro del tubo circular", () => {
    const def = seccionPorId("circulo-hueco")!;
    expect(def.validar!({ ...valoresPorDefecto(def), e: 15 })).toMatch(/radio/i);
  });

  it("rechaza alas que se tocan en el perfil I", () => {
    const def = seccionPorId("perfil-i")!;
    expect(def.validar!({ ...valoresPorDefecto(def), eAla: 25 })).toMatch(/alma/i);
  });

  it("rechaza dimensiones en cero", () => {
    const def = seccionPorId("rectangulo")!;
    expect(def.validar!({ b: 0, h: 40 })).toMatch(/mayores que cero/);
  });

  it("rechaza un sector de 360° o más", () => {
    const def = seccionPorId("sector")!;
    expect(def.validar!({ d: 30, ang: 360 })).toMatch(/ángulo/i);
  });

  it("todas las secciones del catálogo aceptan sus propios valores por defecto", () => {
    for (const def of CATALOGO_SECCIONES) {
      expect(def.validar?.(valoresPorDefecto(def)) ?? null, def.nombre).toBeNull();
    }
  });
});
