import { describe, expect, it } from "vitest";
import { CASOS_VIGA, FAMILIAS_CASO, casoPorId } from "./casos-viga";
import { calcularVigaContinua } from "./viga-continua";

const EI = 20000;

function resolverPorDefecto(caso: (typeof CASOS_VIGA)[number]) {
  const v: Record<string, number> = {};
  for (const p of caso.parametros) v[p.clave] = p.porDefecto;
  expect(caso.validar?.(v) ?? null).toBeNull();
  return calcularVigaContinua({ ...caso.armar(v), eiKNm2: EI });
}

describe("catálogo de casos", () => {
  it("no repite identificadores", () => {
    expect(new Set(CASOS_VIGA.map((c) => c.id)).size).toBe(CASOS_VIGA.length);
  });

  it("todas las familias declaradas tienen al menos un caso", () => {
    for (const f of FAMILIAS_CASO) {
      expect(CASOS_VIGA.some((c) => c.familia === f.id)).toBe(true);
    }
  });

  it("todo caso pertenece a una familia declarada", () => {
    const ids = new Set(FAMILIAS_CASO.map((f) => f.id));
    for (const c of CASOS_VIGA) expect(ids.has(c.familia)).toBe(true);
  });

  it("la normalización apunta a parámetros que el caso tiene", () => {
    for (const c of CASOS_VIGA) {
      if (!c.normalizacion) continue;
      const claves = c.parametros.map((p) => p.clave);
      expect(claves).toContain(c.normalizacion.claveCarga);
      expect(claves).toContain(c.normalizacion.claveLuz);
    }
  });

  it("casoPorId cae al primero cuando el guardado ya no existe", () => {
    expect(casoPorId("no-existe").id).toBe(CASOS_VIGA[0].id);
  });
});

describe("cada caso resuelve con sus valores por defecto", () => {
  for (const caso of CASOS_VIGA) {
    it(`${caso.id} cierra equilibrio y da números finitos`, () => {
      const r = resolverPorDefecto(caso);
      expect(r.desequilibrioKN).toBeCloseTo(0, 6);
      expect(r.reacciones.length).toBeGreaterThan(0);
      for (const p of r.puntos) {
        expect(Number.isFinite(p.cortanteKN)).toBe(true);
        expect(Number.isFinite(p.momentoKNm)).toBe(true);
        expect(Number.isFinite(p.flechaMm)).toBe(true);
      }
      expect(Number.isFinite(r.momentoMax.valor)).toBe(true);
      expect(Number.isFinite(r.momentoMin.valor)).toBe(true);
      expect(Number.isFinite(r.flechaMax.valor)).toBe(true);
    });
  }
});

describe("coeficientes de tabla de algunos casos armados desde el catálogo", () => {
  const armar = (id: string, cambios: Record<string, number> = {}) => {
    const caso = casoPorId(id);
    const v: Record<string, number> = {};
    for (const p of caso.parametros) v[p.clave] = p.porDefecto;
    Object.assign(v, cambios);
    return { caso, v, r: calcularVigaContinua({ ...caso.armar(v), eiKNm2: EI }) };
  };

  it("apoyada uniforme da 0,125·qL²", () => {
    const { v, r } = armar("simple-uniforme");
    expect(r.momentoMax.valor / (v.q * v.L ** 2)).toBeCloseTo(0.125, 9);
  });

  it("biempotrada uniforme da −0,08333·qL² en apoyo y 0,04167·qL² en vano", () => {
    const { v, r } = armar("biempotrada-uniforme");
    expect(r.momentoMin.valor / (v.q * v.L ** 2)).toBeCloseTo(-1 / 12, 9);
    expect(r.momentoMax.valor / (v.q * v.L ** 2)).toBeCloseTo(1 / 24, 9);
  });

  it("empotrada-apoyada uniforme da 9/128·qL² en vano", () => {
    const { v, r } = armar("empotrada-apoyada-uniforme");
    expect(r.momentoMax.valor / (v.q * v.L ** 2)).toBeCloseTo(9 / 128, 9);
  });

  it("dos tramos iguales dan 1,25·qL en el apoyo central", () => {
    const { v, r } = armar("dos-tramos-uniforme");
    expect(r.reacciones[1].rKN / (v.q * v.L1)).toBeCloseTo(1.25, 9);
  });

  it("tres tramos iguales dan −0,10·qL² en los apoyos interiores", () => {
    const { v, r } = armar("tres-tramos-uniforme");
    expect(r.momentoMin.valor / (v.q * v.L1 ** 2)).toBeCloseTo(-0.1, 8);
  });

  it("el volado L/(2√2) iguala el momento de apoyo con el de vano", () => {
    // Óptimo clásico de la viga con dos volados: q·c²/2 = q·L²/8 − q·c²/2, de
    // donde c = L/(2√2) = 0,3536·L contra la luz entre apoyos. Expresado contra
    // la longitud total ese mismo volado es el 0,207 de la tabla — la
    // equivalencia se comprueba abajo, que es donde se cae el error clásico.
    const luz = 6;
    const c = luz / (2 * Math.SQRT2);
    const { r } = armar("apoyada-dos-volados", { L: luz, c1: c, c2: c });
    expect(Math.abs(r.momentoMin.valor)).toBeCloseTo(r.momentoMax.valor, 6);
    expect(c / (luz + 2 * c)).toBeCloseTo(0.2071, 4);
  });

  it("cargar un solo vano de dos tramos alivia el apoyo central respecto de cargarlos ambos", () => {
    const ambos = armar("dos-tramos-uniforme").r;
    const uno = armar("dos-tramos-un-vano").r;
    expect(Math.abs(uno.momentoMin.valor)).toBeLessThan(Math.abs(ambos.momentoMin.valor));
    // Pero el momento de vano crece, que es justo el motivo de estudiar la alternada.
    expect(uno.momentoMax.valor).toBeGreaterThan(ambos.momentoMax.valor);
  });
});
