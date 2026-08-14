import { describe, expect, it } from "vitest";
import {
  areaPorMetroCm2,
  calcularMuro,
  cuantiaHorizontalMinima,
  diagramaInteraccion,
  momentoResistente,
} from "@/lib/calc/hormigon/muros/portante";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";

const materiales = derivarMateriales({ fck: 30, fyk: 500 });

/*
 * Caso base deliberadamente robusto: 30 cm de espesor y 2,5 m de altura dan
 * λ = 28,9 contra λlim = 33,4, o sea justo del lado en que los efectos de
 * segundo orden se pueden ignorar. Con 25 cm y 3 m —que suena igual de
 * corriente— λ ya se va a 41,6 y hay que sumarlos: el criterio es más exigente
 * de lo que parece a ojo.
 */
const geometria = {
  espesorM: 0.3,
  longitudM: 4,
  alturaLibreM: 2.5,
  beta: 1,
  recubrimientoMecanicoM: 0.04,
};

const armadura = {
  diametroVerticalMm: 12,
  separacionVerticalMm: 200,
  diametroHorizontalMm: 10,
  separacionHorizontalMm: 200,
  dosCaras: true,
};

const esfuerzos = { nEdKN: 600, m01KNm: 0, m02KNm: 0 };

const r = calcularMuro(materiales, geometria, armadura, esfuerzos, 500);

describe("clasificación, art. 9.6.1(1)", () => {
  it("es muro cuando la longitud llega a cuatro veces el espesor", () => {
    expect(r.clasificacion.relacionLongitudEspesor).toBeCloseTo(4 / 0.3, 6);
    expect(r.clasificacion.esMuro).toBe(true);
  });

  it("por debajo de esa relación deja de aplicar el artículo de muros", () => {
    const angosto = calcularMuro(
      materiales, { ...geometria, longitudM: 0.9 }, armadura, esfuerzos, 500
    );
    expect(angosto.clasificacion.relacionLongitudEspesor).toBeLessThan(4);
    expect(angosto.clasificacion.esMuro).toBe(false);
  });
});

describe("esbeltez, art. 5.8.3", () => {
  it("el radio de giro y λ salen de la sección bruta", () => {
    expect(r.esbeltez.radioGiroM).toBeCloseTo(0.3 / Math.sqrt(12), 9);
    expect(r.esbeltez.longitudEfectivaM).toBeCloseTo(2.5, 9);
    expect(r.esbeltez.lambda).toBeCloseTo(2.5 / (0.3 / Math.sqrt(12)), 6);
  });

  it("λlim aplica la ec. (5.13) con sus tres factores", () => {
    const { factorA, factorB, factorC, axilReducido, lambdaLimite } = r.esbeltez;
    expect(factorA).toBeCloseTo(0.7, 9);
    expect(lambdaLimite).toBeCloseTo(
      (20 * factorA * factorB * factorC) / Math.sqrt(axilReducido), 6
    );
  });

  it("sin momentos de extremo C vale 0,7, que es el caso del muro", () => {
    expect(r.esbeltez.factorC).toBeCloseTo(0.7, 9);
  });

  it("alargar el muro lo vuelve esbelto y obliga al segundo orden", () => {
    const corto = calcularMuro(materiales, geometria, armadura, esfuerzos, 500);
    const largo = calcularMuro(
      materiales, { ...geometria, alturaLibreM: 9 }, armadura, esfuerzos, 500
    );
    expect(corto.esbeltez.ignoraSegundoOrden).toBe(true);
    expect(largo.esbeltez.ignoraSegundoOrden).toBe(false);
    expect(largo.esbeltez.lambda).toBeGreaterThan(largo.esbeltez.lambdaLimite);
  });

  it("más axil baja λlim: la barra comprimida pandea antes", () => {
    const flojo = calcularMuro(materiales, geometria, armadura, { ...esfuerzos, nEdKN: 300 }, 500);
    const cargado = calcularMuro(materiales, geometria, armadura, { ...esfuerzos, nEdKN: 1200 }, 500);
    expect(cargado.esbeltez.lambdaLimite).toBeLessThan(flojo.esbeltez.lambdaLimite);
  });
});

describe("momentos, arts. 6.1(4) y 5.8.8", () => {
  it("la excentricidad mínima es h/30 con piso de 20 mm", () => {
    expect(r.momentos.excentricidadMinimaM).toBeCloseTo(0.02, 9);
    // Con un muro grueso manda h/30 y no el piso.
    const grueso = calcularMuro(
      materiales, { ...geometria, espesorM: 0.9 }, armadura, esfuerzos, 500
    );
    expect(grueso.momentos.excentricidadMinimaM).toBeCloseTo(0.03, 9);
  });

  it("sin momentos aplicados el de cálculo sale de la excentricidad mínima", () => {
    expect(r.momentos.m0EdKNm).toBeCloseTo(600 * 0.02, 6);
  });

  it("el momento equivalente sigue la ec. (5.32) y su piso", () => {
    const conMomentos = calcularMuro(
      materiales, geometria, armadura, { nEdKN: 600, m01KNm: 10, m02KNm: 40 }, 500
    );
    expect(conMomentos.momentos.m0eKNm).toBeCloseTo(
      Math.max(0.6 * 40 + 0.4 * 10, 0.4 * 40), 6
    );
  });

  it("si no hay segundo orden, M2 es cero y MEd es el de primer orden", () => {
    expect(r.esbeltez.ignoraSegundoOrden).toBe(true);
    expect(r.momentos.m2KNm).toBe(0);
    expect(r.momentos.mEdKNm).toBeCloseTo(r.momentos.m0EdKNm, 9);
  });

  it("cuando hay segundo orden, M2 = NEd·e2 con e2 = (1/r)·l0²/10", () => {
    const esbelto = calcularMuro(
      materiales, { ...geometria, alturaLibreM: 9 }, armadura, esfuerzos, 500
    );
    expect(esbelto.momentos.curvatura).toBeGreaterThan(0);
    expect(esbelto.momentos.e2M).toBeCloseTo(
      (esbelto.momentos.curvatura * 9 ** 2) / 10, 9
    );
    expect(esbelto.momentos.m2KNm).toBeCloseTo(600 * esbelto.momentos.e2M, 6);
    expect(esbelto.momentos.mEdKNm).toBeGreaterThan(esbelto.momentos.m0EdKNm);
  });
});

describe("armado, art. 9.6", () => {
  it("la cuantía vertical va entre 0,002·Ac y 0,04·Ac", () => {
    expect(r.armado.asVerticalMinimaCm2).toBeCloseTo(0.002 * 0.3 * 1e4, 9);
    expect(r.armado.asVerticalMaximaCm2).toBeCloseTo(0.04 * 0.3 * 1e4, 9);
    expect(r.armado.verificaVerticalMinima).toBe(true);
    expect(r.armado.verificaVerticalMaxima).toBe(true);
  });

  it("la cuantía horizontal mínima depende del acero, art. 9.6.3(1)", () => {
    expect(cuantiaHorizontalMinima(500)).toBeCloseTo(0.0032, 9);
    expect(cuantiaHorizontalMinima(400)).toBeCloseTo(0.004, 9);
    // Con B400 el mismo muro pide más armadura horizontal.
    const conB400 = calcularMuro(materiales, geometria, armadura, esfuerzos, 400);
    expect(conB400.armado.asHorizontalMinimaCm2).toBeGreaterThan(r.armado.asHorizontalMinimaCm2);
  });

  it("la separación vertical es la menor entre 400 mm y tres espesores", () => {
    expect(r.armado.separacionVerticalMaximaMm).toBeCloseTo(400, 9);
    // En un muro fino manda el triple del espesor.
    const fino = calcularMuro(
      materiales, { ...geometria, espesorM: 0.1 }, armadura, esfuerzos, 500
    );
    expect(fino.armado.separacionVerticalMaximaMm).toBeCloseTo(300, 9);
    expect(fino.armado.verificaSeparacionVertical).toBe(true);
  });

  it("la horizontal no puede pasar de 400 mm, art. 9.6.3(2)", () => {
    const separada = calcularMuro(
      materiales, geometria, { ...armadura, separacionHorizontalMm: 450 }, esfuerzos, 500
    );
    expect(separada.armado.verificaSeparacionHorizontal).toBe(false);
  });

  it("pide armadura transversal recién por encima de 0,02·Ac, art. 9.6.4(1)", () => {
    expect(r.armado.requiereArmaduraTransversal).toBe(false);
    const muyArmado = calcularMuro(
      materiales, geometria, { ...armadura, diametroVerticalMm: 25, separacionVerticalMm: 100 },
      esfuerzos, 500
    );
    expect(muyArmado.armado.asVerticalCm2).toBeGreaterThan(0.02 * 0.3 * 1e4);
    expect(muyArmado.armado.requiereArmaduraTransversal).toBe(true);
  });

  it("el área por metro cuenta las dos caras cuando corresponde", () => {
    const unaCara = areaPorMetroCm2(12, 200, 1);
    expect(areaPorMetroCm2(12, 200, 2)).toBeCloseTo(2 * unaCara, 9);
  });
});

describe("diagrama de interacción", () => {
  const d = diagramaInteraccion(0.25, 0.04, 5.65, materiales);

  it("arranca en flexión casi pura y llega a la compresión uniforme", () => {
    const nMax = Math.max(...d.map((p) => p.nRdKN));
    // La compresión pura no puede superar el hormigón más las dos capas de acero.
    const tope = materiales.fcd * 1000 * 0.25 + 2 * (5.65 / 1e4) * materiales.fyd * 1000;
    expect(nMax).toBeLessThanOrEqual(tope * 1.02);
    expect(nMax).toBeGreaterThan(0.8 * tope);
  });

  it("el momento resistente tiene un máximo y después cae", () => {
    /*
     * Rasgo propio de la flexión compuesta, y la razón de construir el diagrama
     * entero: la resistencia a momento crece con el axil hasta el punto
     * balanceado —del orden de 0,4·Ac·fcd, unos 2000 kN acá— y a partir de ahí
     * baja. Un diagrama monótono estaría mal.
     */
    const cercaDelBalanceado = momentoResistente(d, 2000);
    expect(cercaDelBalanceado).toBeGreaterThan(momentoResistente(d, 300));
    expect(cercaDelBalanceado).toBeGreaterThan(momentoResistente(d, 4500));
  });

  it("más armadura agranda el diagrama", () => {
    const flaco = diagramaInteraccion(0.25, 0.04, 3, materiales);
    const gordo = diagramaInteraccion(0.25, 0.04, 10, materiales);
    expect(momentoResistente(gordo, 600)).toBeGreaterThan(momentoResistente(flaco, 600));
  });

  it("la verificación compara el par (NEd, MEd) contra el diagrama", () => {
    expect(r.resistencia.mRdKNm).toBeGreaterThan(0);
    expect(r.resistencia.verifica).toBe(r.momentos.mEdKNm <= r.resistencia.mRdKNm);
    expect(r.resistencia.aprovechamiento).toBeCloseTo(
      r.momentos.mEdKNm / r.resistencia.mRdKNm, 9
    );
  });
});
