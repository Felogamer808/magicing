import { describe, expect, it } from "vitest";
import {
  alturasDisponibles,
  componerDoblePNCAlmas,
  familias,
  parametrosDe,
  propiedades,
  type Familia,
} from "@/lib/calc/acero/perfiles";

// La tabla se transcribe del catálogo de ArcelorMittal "Perfiles y barras"
// (dimensiones EN 10365:2017). Los valores de abajo son los de ese catálogo, y
// coinciden con las cuatro columnas de PNI que traía cargadas la planilla
// "AISC 360.xlsx". El 2PNC180 de la planilla NO sirve de contraste: sus valores
// estaban puestos a mano y son incorrectos; ver el bloque del final.

describe("PNI: contraste contra el catálogo", () => {
  it("PNI80", () => {
    const p = propiedades("PNI", { altura: 80 } );
    expect(p.hM).toBeCloseTo(0.08, 6);
    expect(p.bM).toBeCloseTo(0.042, 6);
    expect(p.twM).toBeCloseTo(0.0039, 6);
    expect(p.tfM).toBeCloseTo(0.0059, 6);
    expect(p.areaM2).toBeCloseTo(7.6e-4, 8);
    expect(p.ixM4).toBeCloseTo(77.8e-8, 12);
    expect(p.sxM3).toBeCloseTo(19.5e-6, 10);
    expect(p.zxM3).toBeCloseTo(22.8e-6, 10);
    expect(p.rxM).toBeCloseTo(0.032, 6);
    expect(p.iyM4).toBeCloseTo(6.29e-8, 12);
    expect(p.ryM).toBeCloseTo(0.0091, 6);
    expect(p.jM4).toBeCloseTo(0.87e-8, 12);
  });

  it("PNI100, PNI120 y PNI140 coinciden en área, inercia y módulos", () => {
    const esperado = [
      { altura: 100, area: 10.6e-4, ix: 171e-8, sx: 34.2e-6, zx: 39.8e-6, iy: 12.2e-8, j: 1.6e-8 },
      { altura: 120, area: 14.2e-4, ix: 328e-8, sx: 54.7e-6, zx: 63.6e-6, iy: 21.5e-8, j: 2.71e-8 },
      { altura: 140, area: 18.2e-4, ix: 573e-8, sx: 81.9e-6, zx: 95.4e-6, iy: 35.2e-8, j: 4.32e-8 },
    ];
    for (const e of esperado) {
      const p = propiedades("PNI", { altura: e.altura });
      expect(p.areaM2).toBeCloseTo(e.area, 8);
      expect(p.ixM4).toBeCloseTo(e.ix, 12);
      expect(p.sxM3).toBeCloseTo(e.sx, 10);
      expect(p.zxM3).toBeCloseTo(e.zx, 10);
      expect(p.iyM4).toBeCloseTo(e.iy, 12);
      expect(p.jM4).toBeCloseTo(e.j, 12);
    }
  });
});

// Estas comprobaciones no verifican la norma: verifican la transcripción. Un dígito
// mal copiado en cualquiera de las tres tablas rompe alguna de estas relaciones,
// que valen por geometría para cualquier sección.
describe("coherencia interna del catálogo", () => {
  const simples: Familia[] = ["PNI", "PNC", "HEB"];

  for (const familia of simples) {
    describe(familia, () => {
      for (const altura of alturasDisponibles(familia)) {
        it(`${familia}${altura}`, () => {
          const p = propiedades(familia, { altura } );

          // r = √(I/A), por definición del radio de giro. Se compara en relativo
          // porque las tablas publican r con tres cifras significativas: el PNI280
          // trae 11,1 cm donde el cálculo da 11,15, y eso es redondeo, no error.
          // Un dígito mal transcripto se va muy por encima del 1 %.
          // La banda es del 1 % porque el redondeo se acumula: A, I y r vienen
          // los tres con tres cifras. El PNI140 publica ry = 1,40 cm donde el
          // cálculo da 1,391, y eso ya son 0,64 %.
          for (const cociente of [
            p.rxM / Math.sqrt(p.ixM4 / p.areaM2),
            p.ryM / Math.sqrt(p.iyM4 / p.areaM2),
          ]) {
            expect(cociente).toBeGreaterThan(0.99);
            expect(cociente).toBeLessThan(1.01);
          }

          // S = I/c con c = h/2. Se aparta poco porque las tablas toman la fibra
          // extrema real, con los acuerdos de laminación.
          const sxGeometrico = p.ixM4 / (p.hM / 2);
          expect(p.sxM3 / sxGeometrico).toBeGreaterThan(0.97);
          expect(p.sxM3 / sxGeometrico).toBeLessThan(1.03);

          // El factor de forma de un perfil laminado cae siempre en esta banda.
          expect(p.zxM3 / p.sxM3).toBeGreaterThan(1.05);
          expect(p.zxM3 / p.sxM3).toBeLessThan(1.35);
          expect(p.zyM3 / p.syM3).toBeGreaterThan(1.1);

          // El eje fuerte tiene que serlo.
          expect(p.ixM4).toBeGreaterThan(p.iyM4);
          expect(p.hiM).toBeCloseTo(p.hM - 2 * p.tfM, 9);
          // El alma recta descuenta además los acuerdos de laminación.
          expect(p.hAlmaM).toBeGreaterThan(0);
          expect(p.hAlmaM).toBeLessThanOrEqual(p.hiM + 1e-9);
          expect(p.cwM6).toBeGreaterThan(0);
        });
      }
    });
  }

  it("cada familia declara los parámetros que necesita", () => {
    for (const familia of familias) {
      const parametros = parametrosDe(familia);
      expect(parametros.length).toBeGreaterThan(0);
      // Los desplegables de altura tienen que traer opciones; los tubos no usan
      // catálogo y se definen por dimensiones, así que no declaran ninguna.
      for (const p of parametros) {
        if (p.tipo === "lista") expect(p.opciones?.length ?? 0).toBeGreaterThan(0);
        expect(p.porDefecto).toBeGreaterThanOrEqual(0);
      }
      const deCatalogo = parametros.some((p) => p.tipo === "lista");
      expect(alturasDisponibles(familia).length > 0).toBe(deCatalogo);
    }
  });
});

describe("secciones de geometría libre", () => {
  it("el tubo redondo cumple las relaciones de la corona circular", () => {
    const p = propiedades("tubo-redondo", { diametro: 168.3, espesor: 6 });
    const dExt = 0.1683;
    const dInt = dExt - 2 * 0.006;

    expect(p.areaM2).toBeCloseTo((Math.PI / 4) * (dExt ** 2 - dInt ** 2), 9);
    expect(p.ixM4).toBeCloseTo((Math.PI / 64) * (dExt ** 4 - dInt ** 4), 12);
    // Sección de revolución: los dos ejes son iguales.
    expect(p.iyM4).toBeCloseTo(p.ixM4, 15);
    expect(p.ryM).toBeCloseTo(p.rxM, 12);
    // En la sección circular cerrada, J es el momento polar: el doble del axial.
    expect(p.jM4).toBeCloseTo(2 * p.ixM4, 12);
    expect(p.esCerrada).toBe(true);
    expect(p.cwM6).toBe(0);
  });

  it("el tubo rectangular distingue los dos ejes según el lado", () => {
    const p = propiedades("tubo-rectangular", { alto: 200, ancho: 100, espesor: 6 });

    expect(p.ixM4).toBeGreaterThan(p.iyM4);
    expect(p.rxM).toBeGreaterThan(p.ryM);
    expect(p.esCerrada).toBe(true);

    // Un tubo cuadrado tiene que dar los dos ejes iguales.
    const cuadrado = propiedades("tubo-rectangular", { alto: 150, ancho: 150, espesor: 6 });
    expect(cuadrado.iyM4).toBeCloseTo(cuadrado.ixM4, 15);
  });

  it("rechaza espesores imposibles en lugar de devolver un área negativa", () => {
    expect(() => propiedades("tubo-redondo", { diametro: 100, espesor: 60 })).toThrow();
    expect(() => propiedades("tubo-rectangular", { alto: 100, ancho: 50, espesor: 30 })).toThrow();
  });
});

/**
 * Las dos formas de componer dos PNC. Comparten `Ix` —los dos perfiles están a
 * la misma altura en ambas— y se separan en el eje débil y, sobre todo, en la
 * torsión: al cerrarse, el cajón pasa a resistir por Bredt.
 */
describe("2PNC: soldado por las almas contra cajón", () => {
  const almas = propiedades("2PNC-almas", { altura: 180 });
  const cajon = propiedades("2PNC-cajon", { altura: 180 });

  it("comparten el eje fuerte", () => {
    expect(cajon.ixM4).toBeCloseTo(almas.ixM4, 12);
    expect(cajon.zxM3).toBeCloseTo(almas.zxM3, 10);
    expect(cajon.areaM2).toBeCloseTo(almas.areaM2, 10);
  });

  it("el cajón es mucho más rígido en el eje débil", () => {
    // El brazo de Steiner pasa de ys a b − ys: en el PNC180, de 19,2 a 50,8 mm.
    expect(cajon.iyM4).toBeGreaterThan(almas.iyM4);
    expect(cajon.ryM).toBeGreaterThan(almas.ryM);
  });

  it("cerrar la sección multiplica la constante de torsión", () => {
    // Dos secciones abiertas suman sus J; una cerrada resiste por circulación,
    // y la diferencia es de dos órdenes o más.
    expect(cajon.jM4 / almas.jM4).toBeGreaterThan(100);
    expect(cajon.esCerrada).toBe(true);
    expect(almas.esCerrada).toBe(false);
    // Al cerrarse el alabeo deja de importar.
    expect(cajon.cwM6).toBe(0);
    expect(almas.cwM6).toBeGreaterThan(0);
  });
});

// La constante de torsión es la columna que más se aparta entre fuentes, y donde
// una tabla vieja pasa desapercibida: no interviene en compresión ni en la
// plastificación, solo en el pandeo lateral-torsional. Estos valores son los `It`
// del catálogo.
describe("PNC: constante de torsión contra el catálogo", () => {
  const itCatalogo: Record<number, number> = {
    80: 2.2, 100: 2.81, 120: 4.15, 140: 5.68, 160: 7.39, 180: 9.55,
    200: 11.9, 220: 16.0, 240: 19.7, 260: 25.5, 280: 31.0, 300: 37.4,
  };

  for (const [altura, valorIt] of Object.entries(itCatalogo)) {
    it(`PNC${altura}`, () => {
      expect(propiedades("PNC", { altura: Number(altura) } ).jM4).toBeCloseTo(valorIt / 1e8, 12);
    });
  }

  it("PNC80 usa los módulos plásticos del catálogo", () => {
    const p = propiedades("PNC", { altura: 80 } );
    expect(p.zxM3).toBeCloseTo(32.3e-6, 10);
    expect(p.zyM3).toBeCloseTo(11.9e-6, 10);
  });
});

describe("HEB: contraste contra el catálogo", () => {
  it("HEB300", () => {
    const p = propiedades("HEB", { altura: 300 } );
    expect(p.areaM2).toBeCloseTo(149.1e-4, 8);
    expect(p.ixM4).toBeCloseTo(25170e-8, 11);
    expect(p.sxM3).toBeCloseTo(1678e-6, 9);
    expect(p.zxM3).toBeCloseTo(1869e-6, 9);
    expect(p.iyM4).toBeCloseTo(8563e-8, 11);
    expect(p.jM4).toBeCloseTo(185.0e-8, 11);
    // Iw = 1688 x 10⁹ mm⁶, y 1 mm⁶ = 1e-18 m⁶.
    expect(p.cwM6).toBeCloseTo(1.688e-6, 12);
    // En sección doblemente simétrica vale Cw = Iy·ho²/4: sirve de control
    // cruzado entre el Iw tabulado y el Iy tabulado, que son columnas distintas.
    const hoM = p.hM - p.tfM;
    expect(p.cwM6 / ((p.iyM4 * hoM ** 2) / 4)).toBeCloseTo(1, 2);
    expect(p.hAlmaM).toBeCloseTo(0.208, 6);
  });
});

describe("2PNC compuesto a partir del PNC simple", () => {
  it("duplica el eje fuerte y deja rx igual al del perfil simple", () => {
    const simple = propiedades("PNC", { altura: 180 } );
    const doble = componerDoblePNCAlmas(180, 0);

    expect(doble.areaM2).toBeCloseTo(2 * simple.areaM2, 10);
    expect(doble.ixM4).toBeCloseTo(2 * simple.ixM4, 12);
    expect(doble.zxM3).toBeCloseTo(2 * simple.zxM3, 10);
    // Duplicar área e inercia deja el radio de giro intacto.
    expect(doble.rxM).toBeCloseTo(simple.rxM, 6);
    // Dos secciones abiertas independientes: las constantes de torsión se suman.
    expect(doble.jM4).toBeCloseTo(2 * simple.jM4, 12);
  });

  it("separar los perfiles solo hace crecer el eje débil", () => {
    const juntos = componerDoblePNCAlmas(180, 0);
    const separados = componerDoblePNCAlmas(180, 0.1);

    expect(separados.iyM4).toBeGreaterThan(juntos.iyM4);
    expect(separados.ryM).toBeGreaterThan(juntos.ryM);
    expect(separados.ixM4).toBeCloseTo(juntos.ixM4, 12);
    expect(separados.rxM).toBeCloseTo(juntos.rxM, 9);
  });

  // Los tres errores que traía la columna 2PNC180 de la planilla. Se dejan como
  // test para que no vuelvan a colarse si alguien recarga la tabla desde el Excel.
  describe("errores de la planilla que no se replican", () => {
    const p = componerDoblePNCAlmas(180, 0);

    it("Iy no es igual a Ix: son ejes distintos", () => {
      // La planilla ponía 2,76e-5 en los dos, y de ahí rx = ry.
      expect(p.iyM4).not.toBeCloseTo(p.ixM4, 9);
      expect(p.iyM4).toBeLessThan(p.ixM4 / 3);
      expect(p.ryM).toBeLessThan(p.rxM);
    });

    it("J queda tres órdenes por debajo de Ix, como en toda sección abierta", () => {
      // La planilla ponía J = 2,21e-5 m⁴, del mismo orden que Ix: un factor 100.
      expect(p.ixM4 / p.jM4).toBeGreaterThan(50);
    });

    it("Zx sale del módulo plástico tabulado, no de 1,09·Sx", () => {
      const aproximacionPlanilla = 1.09 * p.sxM3;
      expect(p.zxM3).not.toBeCloseTo(aproximacionPlanilla, 7);
      expect(p.zxM3 / p.sxM3).toBeGreaterThan(1.1);
    });
  });

  it("el área coincide con la de la planilla dentro del 2 %", () => {
    // Único valor de la columna 2PNC180 que sí era razonable: 5664,87 mm².
    const p = componerDoblePNCAlmas(180, 0);
    expect(p.areaM2).toBeGreaterThan(0.98 * 5664.87e-6);
    expect(p.areaM2).toBeLessThan(1.02 * 5664.87e-6);
  });
});
