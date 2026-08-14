import { describe, expect, it } from "vitest";
import { barrasPorMetro, calcularFisuracion } from "@/lib/calc/hormigon/fisuracion";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";

// Casos de la hoja "ELS Fisuración": fck=30, fyk=500, rg=0.02, k2=0.5,
// wadm=0.3 mm, Es=200 GPa.
//
// Los valores esperados YA NO son los de la planilla. La hoja calculaba con el
// art. 49.2.4 de la EHE-08 (wk = β·sm·εsm) y acá se pasó al método del Anejo 19,
// art. 7.3.4 (wk = s_r,max·(εsm − εcm)), que es la norma que la página declara.
// No es un coeficiente distinto: cambian el área eficaz, el piso de la
// deformación media (0,6·σs/Es en vez de 0,4) y la separación de fisuras.

const materiales = derivarMateriales({ fck: 30, fyk: 500 });
const parametros = { recubrimientoM: 0.02, k2: 0.5, wAdmMm: 0.3, esGPa: 200 };

describe("fisuración: zona 1 (losa de 18 cm, dos familias)", () => {
  // b=1 m, φ8 cada 15 cm y φ10 cada 20 cm, Mqp = 22 kN·m
  const r = calcularFisuracion(materiales, parametros, {
    hM: 0.18,
    bM: 1,
    n1: barrasPorMetro(1, 0.15),
    diametro1Mm: 8,
    n2: barrasPorMetro(1, 0.2),
    diametro2Mm: 10,
    mqpKNm: 22,
  });

  it("usa el diámetro equivalente de la ec. (7.12), ponderado por área", () => {
    // (6,67·8² + 5·10²)/(6,67·8 + 5·10) = 926,7/103,3
    expect(r.diametroEqMm).toBeCloseTo(8.96774193548387, 9);
  });

  it("resuelve la fibra neutra y el área eficaz", () => {
    expect(r.dM).toBeCloseTo(0.155, 9);
    expect(r.xM).toBeCloseTo(0.0329013192845142, 9);
    // hc,ef = mín(2,5·(h−d), (h−x)/3, h/2) — acá manda (h−x)/3
    expect(r.hcEfM).toBeCloseTo(0.0490328935718286, 9);
    expect(r.acEficazM2).toBeCloseTo(0.0490328935718286, 9);
    expect(r.asM2).toBeCloseTo(0.000727802298081635, 12);
    expect(r.rhoPEf).toBeCloseTo(0.0148431439604002, 9);
  });

  it("reproduce las tensiones y la deformación media", () => {
    expect(r.alphaE).toBeCloseTo(6.09077050345734, 9);
    expect(r.sigmaSMPa).toBeCloseTo(209.868651819313, 6);
    expect(r.epsilonSmMenosCm).toBeCloseTo(0.000629605955457938, 12);
  });

  it("reproduce la abertura de fisura y verifica", () => {
    expect(r.srMaxMm).toBeCloseTo(191.228284930132, 6);
    expect(r.wkMm).toBeCloseTo(0.120398467044018, 9);
    expect(r.verifica).toBe(true);
  });
});

describe("fisuración: zona x (sección de 43 cm, una sola familia)", () => {
  // 7φ16 por metro, sin segunda familia, Mqp = 143 kN·m
  const r = calcularFisuracion(materiales, parametros, {
    hM: 0.43,
    bM: 1,
    n1: 7,
    diametro1Mm: 16,
    n2: 2,
    diametro2Mm: 0,
    mqpKNm: 143,
  });

  it("ignora la familia de diámetro nulo en el diámetro equivalente", () => {
    expect(r.diametroEqMm).toBe(16);
    expect(r.sMm).toBeCloseTo(142.857142857143, 6);
  });

  it("reproduce el resto del cálculo", () => {
    expect(r.dM).toBeCloseTo(0.402, 9);
    expect(r.xM).toBeCloseTo(0.0748881647911314, 9);
    // Acá manda h/2 = 0,215 contra 2,5(h−d) = 0,07: gobierna el segundo.
    expect(r.hcEfM).toBeCloseTo(0.07, 9);
    expect(r.asM2).toBeCloseTo(0.00140743350880823, 12);
    expect(r.rhoPEf).toBeCloseTo(0.0201061929829747, 9);
    expect(r.sigmaSMPa).toBeCloseTo(269.47833720637, 6);
    expect(r.epsilonSmMenosCm).toBeCloseTo(0.00102399122532327, 12);
  });

  // Este caso verificaba con el método de la EHE (wk = 0,215 mm) y ahora no.
  // Las barras quedan a 142,9 mm y el límite 5(c+φ/2) es 140 mm: por 3 mm cae
  // en la ec. (7.14), donde la separación de fisuras la fija el canto —
  // 1,3·(h−x) = 462 mm— y no la adherencia de las barras.
  it("cruza al tope de la ec. (7.14) y deja de verificar", () => {
    expect(r.usaTopeSeparacionAmplia).toBe(true);
    expect(r.srMaxMm).toBeCloseTo(1.3 * (0.43 - r.xM) * 1000, 9);
    expect(r.srMaxMm).toBeCloseTo(461.645385771529, 6);
    expect(r.wkMm).toBeCloseTo(0.472720824241024, 9);
    expect(r.verifica).toBe(false);
  });

  it("juntando las barras vuelve a la ec. (7.11) y la abertura cae a menos de la mitad", () => {
    const masJuntas = calcularFisuracion(materiales, parametros, {
      hM: 0.43,
      bM: 1,
      n1: 10,
      diametro1Mm: 16,
      n2: 0,
      diametro2Mm: 0,
      mqpKNm: 143,
    });
    expect(masJuntas.usaTopeSeparacionAmplia).toBe(false);
    expect(masJuntas.srMaxMm).toBeLessThan(r.srMaxMm / 2);
    expect(masJuntas.verifica).toBe(true);
  });
});

describe("fisuración: sensibilidad", () => {
  const zona = { hM: 0.18, bM: 1, n1: 10, diametro1Mm: 10, n2: 0, diametro2Mm: 0, mqpKNm: 22 };

  it("más momento abre más la fisura", () => {
    const flojo = calcularFisuracion(materiales, parametros, { ...zona, mqpKNm: 12 });
    const cargado = calcularFisuracion(materiales, parametros, { ...zona, mqpKNm: 30 });
    expect(cargado.wkMm).toBeGreaterThan(flojo.wkMm);
  });

  it("más recubrimiento abre más la fisura en superficie", () => {
    const poco = calcularFisuracion(materiales, { ...parametros, recubrimientoM: 0.02 }, zona);
    const mucho = calcularFisuracion(materiales, { ...parametros, recubrimientoM: 0.04 }, zona);
    expect(mucho.wkMm).toBeGreaterThan(poco.wkMm);
  });

  it("el piso de 0,6·σs/Es acota la colaboración del hormigón", () => {
    // Con muy poco momento el término de rigidización se comería toda la
    // deformación; el articulado no deja bajar de 0,6·σs/Es.
    const casiSinCarga = calcularFisuracion(materiales, parametros, { ...zona, mqpKNm: 3 });
    expect(casiSinCarga.epsilonSmMenosCm).toBeCloseTo(
      (0.6 * casiSinCarga.sigmaSMPa) / (200 * 1000),
      12
    );
  });
});
