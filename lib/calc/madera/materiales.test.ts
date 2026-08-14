import { describe, expect, it } from "vitest";
import {
  BETA_C,
  GAMMA_M,
  GAMMA_M_ACCIDENTAL,
  KCR,
  kdef,
  kh,
  kmod,
  kmodUnion,
  resistenciaDeCalculo,
} from "@/lib/calc/madera/materiales";

describe("kmod, tabla 3.1", () => {
  it("las clases de servicio 1 y 2 comparten valores", () => {
    for (const d of ["permanente", "larga", "media", "corta", "instantanea"] as const) {
      expect(kmod("maciza", 1, d)).toBe(kmod("maciza", 2, d));
    }
  });

  it("la clase 3 castiga todas las duraciones", () => {
    expect(kmod("MLE", 3, "permanente")).toBeCloseTo(0.5, 9);
    expect(kmod("MLE", 3, "instantanea")).toBeCloseTo(0.9, 9);
    expect(kmod("MLE", 3, "media")).toBeLessThan(kmod("MLE", 2, "media"));
  });

  it("crece con lo breve de la carga", () => {
    const serie = (["permanente", "larga", "media", "corta", "instantanea"] as const).map((d) =>
      kmod("maciza", 1, d)
    );
    for (let i = 1; i < serie.length; i++) expect(serie[i]).toBeGreaterThan(serie[i - 1]);
    expect(serie).toEqual([0.6, 0.7, 0.8, 0.9, 1.1]);
  });

  it("maciza, MLE y LVL comparten fila en la tabla", () => {
    expect(kmod("maciza", 2, "media")).toBe(kmod("MLE", 2, "media"));
    expect(kmod("MLE", 2, "media")).toBe(kmod("LVL", 2, "media"));
  });
});

describe("kdef, tabla 3.2", () => {
  it("la clase 3 más que duplica la fluencia de la clase 2", () => {
    expect(kdef("maciza", 1)).toBeCloseTo(0.6, 9);
    expect(kdef("maciza", 2)).toBeCloseTo(0.8, 9);
    expect(kdef("maciza", 3)).toBeCloseTo(2.0, 9);
  });
});

describe("γM, tabla 2.3", () => {
  it("baja al encolar y vuelve a bajar en microlaminada", () => {
    expect(GAMMA_M.maciza).toBeCloseTo(1.3, 9);
    expect(GAMMA_M.MLE).toBeCloseTo(1.25, 9);
    expect(GAMMA_M.LVL).toBeCloseTo(1.2, 9);
  });

  it("en combinación accidental vale 1", () => {
    expect(GAMMA_M_ACCIDENTAL).toBe(1);
  });
});

describe("kh, ecs. (3.1), (3.2) y (3.3)", () => {
  it("vale 1 a partir del canto de referencia de cada material", () => {
    expect(kh("maciza", 0.15)).toBeCloseTo(1, 9);
    expect(kh("maciza", 0.3)).toBeCloseTo(1, 9);
    expect(kh("MLE", 0.6)).toBeCloseTo(1, 9);
    expect(kh("MLE", 1.2)).toBeCloseTo(1, 9);
  });

  it("en maciza sigue (150/h)^0,2 con tope 1,3", () => {
    expect(kh("maciza", 0.1)).toBeCloseTo(Math.pow(150 / 100, 0.2), 9);
    // El tope muerde recién por debajo de 150/1,3^5 = 32,8 mm.
    expect(kh("maciza", 0.02)).toBeCloseTo(1.3, 9);
  });

  it("en MLE el tope es 1,1 y no 1,3", () => {
    /*
     * Es la diferencia que la planilla original tenía mal. Con canto de 150 mm
     * la expresión da 1,149, que la norma corta en 1,1: usar 1,3 como tope deja
     * pasar un 4,5 % de sobrerresistencia.
     */
    expect(Math.pow(600 / 150, 0.1)).toBeGreaterThan(1.1);
    expect(kh("MLE", 0.15)).toBeCloseTo(1.1, 9);
    // Y por encima de 231 mm la expresión manda sola, sin tocar el tope.
    expect(kh("MLE", 0.3)).toBeCloseTo(Math.pow(600 / 300, 0.1), 9);
    expect(kh("MLE", 0.3)).toBeLessThan(1.1);
  });

  it("en LVL hace falta el exponente s del fabricante", () => {
    // Sin s no se inventa un valor: se devuelve 1, que es el lado seguro.
    expect(kh("LVL", 0.2)).toBeCloseTo(1, 9);
    expect(kh("LVL", 0.2, 0.12)).toBeCloseTo(Math.pow(300 / 200, 0.12), 9);
    expect(kh("LVL", 0.05, 0.12)).toBeCloseTo(1.2, 9);
  });
});

describe("kcr, art. 6.1.7(2)", () => {
  it("recorta un tercio del ancho en maciza y laminada", () => {
    expect(KCR.maciza).toBeCloseTo(0.67, 9);
    expect(KCR.MLE).toBeCloseTo(0.67, 9);
    expect(KCR.LVL).toBeCloseTo(1, 9);
  });

  it("usar 1,0 donde corresponde 0,67 sobrestima la resistencia un 49 %", () => {
    // La cuenta que justifica el aviso en pantalla.
    expect(1 / KCR.maciza - 1).toBeCloseTo(0.4925, 3);
  });
});

describe("βc, ec. (6.29)", () => {
  it("la laminada tolera el doble de imperfección que la maciza", () => {
    expect(BETA_C.maciza).toBeCloseTo(0.2, 9);
    expect(BETA_C.MLE).toBeCloseTo(0.1, 9);
    expect(BETA_C.LVL).toBeCloseTo(0.1, 9);
  });
});

describe("kmod de uniones, ec. (2.6)", () => {
  it("es la media geométrica de los dos materiales", () => {
    expect(kmodUnion(0.6, 0.9)).toBeCloseTo(Math.sqrt(0.54), 9);
    // Queda por debajo de la media aritmética: la unión no premia al más flojo.
    expect(kmodUnion(0.6, 0.9)).toBeLessThan(0.75);
  });
});

describe("resistencia de cálculo, ec. (2.14)", () => {
  it("aplica kmod, γM y los factores de tamaño", () => {
    const r = resistenciaDeCalculo(24, { kmod: 0.8, gammaM: 1.25, kh: 1.1, ksys: 1.1 });
    expect(r.factores).toBeCloseTo(1.21, 9);
    expect(r.valor).toBeCloseTo((0.8 * 1.21 * 24) / 1.25, 9);
  });

  it("sin kh ni ksys es la división desnuda", () => {
    const r = resistenciaDeCalculo(24, { kmod: 0.8, gammaM: 1.25 });
    expect(r.factores).toBe(1);
    expect(r.valor).toBeCloseTo((0.8 * 24) / 1.25, 9);
  });

  it("reproduce el fm,d de la hoja de flexión simple de la planilla", () => {
    // MLE, kmod 0,8, γM 1,25, kh = 1 (canto 0,98 m > 0,6 m), ksys = 1, fm,k = 8.
    const r = resistenciaDeCalculo(8, {
      kmod: 0.8,
      gammaM: 1.25,
      kh: kh("MLE", 0.98),
      ksys: 1,
    });
    expect(r.valor).toBeCloseTo(5.12, 9);
  });
});
