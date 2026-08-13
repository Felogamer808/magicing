import { describe, expect, it } from "vitest";
import {
  kc90,
  pandeoEje,
  resistenciaEnAnguloMPa,
  verificarCompresion,
  verificarCompresionPerpendicular,
  verificarTraccion,
} from "./axil";

describe("tracción paralela, ec. (6.1)", () => {
  it("reproduce la hoja de tracción de la planilla", () => {
    const r = verificarTraccion(23.61, 0.24 * 0.39, 8.96);
    expect(r.sigmaT0dMPa).toBeCloseTo(0.2522436, 6);
  });
});

describe("pandeo de un eje, art. 6.3.2", () => {
  it("no reduce nada por debajo de λrel = 0,3", () => {
    const corto = pandeoEje(10, 24, 9.4, "MLE");
    expect(corto.lambdaRel).toBeLessThan(0.3);
    expect(corto.kc).toBe(1);
  });

  it("reproduce λrel de la planilla, hoja de flexocompresión", () => {
    // λ = 69,282, fc,0,k = 24 MPa, E0,05 = 9,4 GPa.
    const p = pandeoEje(69.282032302755098, 24, 9.4, "MLE");
    expect(p.lambdaRel).toBeCloseTo(1.1143265, 6);
  });

  it("kc sale de k y λrel, ecs. (6.25) y (6.27)", () => {
    const p = pandeoEje(69.282032302755098, 24, 9.4, "MLE");
    const kEsperado = 0.5 * (1 + 0.1 * (p.lambdaRel - 0.3) + p.lambdaRel ** 2);
    expect(p.k).toBeCloseTo(kEsperado, 9);
    expect(p.kc).toBeCloseTo(1 / (kEsperado + Math.sqrt(kEsperado ** 2 - p.lambdaRel ** 2)), 9);
    expect(p.kc).toBeLessThan(1);
  });

  it("la maciza pandea antes que la laminada por su βc mayor", () => {
    const maciza = pandeoEje(80, 24, 9.4, "maciza");
    const laminada = pandeoEje(80, 24, 9.4, "MLE");
    expect(maciza.kc).toBeLessThan(laminada.kc);
  });

  it("kc decrece con la esbeltez", () => {
    let previo = pandeoEje(20, 24, 9.4, "MLE").kc;
    for (let l = 30; l <= 200; l += 10) {
      const actual = pandeoEje(l, 24, 9.4, "MLE").kc;
      expect(actual).toBeLessThanOrEqual(previo + 1e-12);
      previo = actual;
    }
  });

  it("para esbelteces grandes tiende al pandeo de Euler", () => {
    const p = pandeoEje(300, 24, 9.4, "MLE");
    // kc ≈ 1/λrel² cuando λrel es grande: el término de imperfección se diluye.
    expect(p.kc).toBeCloseTo(1 / p.lambdaRel ** 2, 2);
  });
});

describe("compresión con pandeo", () => {
  const base = {
    axilKN: 12,
    areaM2: 0.1 * 0.2,
    radioGiroYM: Math.sqrt((0.1 * 0.2 ** 3) / 12 / (0.1 * 0.2)),
    radioGiroZM: Math.sqrt((0.2 * 0.1 ** 3) / 12 / (0.1 * 0.2)),
    longitudPandeoYM: 6,
    longitudPandeoZM: 3,
    fc0kMPa: 16,
    fc0dMPa: 7.3846153846153841,
    e005GPa: 4.7,
    tipo: "maciza" as const,
  };

  it("reproduce las esbelteces de la planilla", () => {
    const r = verificarCompresion(base);
    expect(r.ejeY.lambda).toBeCloseTo(103.9230485, 6);
    expect(r.ejeZ.lambda).toBeCloseTo(103.9230485, 6);
    expect(r.ejeY.lambdaRel).toBeCloseTo(1.9300700, 6);
    expect(r.sigmaC0dMPa).toBeCloseTo(0.6, 9);
  });

  it("manda el eje de menor kc", () => {
    const r = verificarCompresion({ ...base, longitudPandeoZM: 5 });
    expect(r.kc).toBe(Math.min(r.ejeY.kc, r.ejeZ.kc));
    expect(r.ejeZ.kc).toBeLessThan(r.ejeY.kc);
  });

  it("declara cuándo corresponde ir por el art. 6.2.4", () => {
    const rechoncho = verificarCompresion({
      ...base,
      longitudPandeoYM: 0.4,
      longitudPandeoZM: 0.4,
    });
    expect(rechoncho.sinInestabilidad).toBe(true);
    expect(rechoncho.kc).toBe(1);
    expect(verificarCompresion(base).sinInestabilidad).toBe(false);
  });
});

describe("kc,90, art. 6.1.5", () => {
  const base = {
    tipo: "MLE" as const,
    conifera: true,
    apoyo: "aislado" as const,
    longitudContactoM: 0.2,
    distanciaVecinaM: 2,
    cantoM: 0.16,
  };

  it("apoyos aislados en laminada con ℓ ≤ 400 mm llegan a 1,75", () => {
    expect(kc90(base).kc90).toBeCloseTo(1.75, 9);
  });

  it("con ℓ > 400 mm la laminada se queda en 1,5", () => {
    expect(kc90({ ...base, longitudContactoM: 0.5 }).kc90).toBeCloseTo(1.5, 9);
  });

  it("la maciza sobre apoyo continuo llega sólo a 1,25", () => {
    expect(kc90({ ...base, tipo: "maciza", apoyo: "continuo" }).kc90).toBeCloseTo(1.25, 9);
    expect(kc90({ ...base, apoyo: "continuo" }).kc90).toBeCloseTo(1.5, 9);
  });

  it("sin ℓ1 ≥ 2h no hay incremento, y se dice por qué", () => {
    const r = kc90({ ...base, distanciaVecinaM: 0.2 });
    expect(r.kc90).toBe(1);
    expect(r.motivo).toContain("ℓ1 ≥ 2h");
  });

  it("en frondosas la norma no tabula incremento", () => {
    expect(kc90({ ...base, conifera: false }).kc90).toBe(1);
  });

  it("nunca pasa del tope de 1,75", () => {
    for (const tipo of ["maciza", "MLE", "LVL"] as const) {
      for (const apoyo of ["continuo", "aislado"] as const) {
        expect(kc90({ ...base, tipo, apoyo }).kc90).toBeLessThanOrEqual(1.75);
      }
    }
  });
});

describe("compresión perpendicular, ecs. (6.3) y (6.4)", () => {
  it("reproduce el área eficaz de la planilla", () => {
    // Apoyo de 0,2 m con vuelo a = 0 y ℓ1 = 0: sólo ensancha 30 mm hacia dentro.
    const r = verificarCompresionPerpendicular({
      cargaKN: 3.24,
      anchoApoyoM: 0.1,
      longitudContactoM: 0.2,
      vueloM: 0,
      distanciaVecinaM: 0,
      fc90dMPa: 1.5923076923076922,
      kc90: 1.5,
    });
    expect(r.incrementoExtremoM).toBe(0);
    expect(r.longitudEficazM).toBeCloseTo(0.2, 9);
    expect(r.areaEficazM2).toBeCloseTo(0.02, 9);
  });

  it("con vuelo y separación suficientes ensancha 30 mm a cada lado", () => {
    const r = verificarCompresionPerpendicular({
      cargaKN: 50,
      anchoApoyoM: 0.1,
      longitudContactoM: 0.2,
      vueloM: 0.1,
      distanciaVecinaM: 1.5,
      fc90dMPa: 1.6,
      kc90: 1,
    });
    expect(r.incrementoExtremoM).toBeCloseTo(0.03, 9);
    expect(r.incrementoInteriorM).toBeCloseTo(0.03, 9);
    expect(r.longitudEficazM).toBeCloseTo(0.26, 9);
    // El ensanchamiento no es decorativo: baja la tensión un 23 %.
    expect(r.longitudEficazM / 0.2).toBeCloseTo(1.3, 9);
  });

  it("el vuelo acota el ensanchamiento del extremo", () => {
    const r = verificarCompresionPerpendicular({
      cargaKN: 50,
      anchoApoyoM: 0.1,
      longitudContactoM: 0.2,
      vueloM: 0.01,
      distanciaVecinaM: 1.5,
      fc90dMPa: 1.6,
      kc90: 1,
    });
    expect(r.incrementoExtremoM).toBeCloseTo(0.01, 9);
  });
});

describe("compresión en ángulo con la fibra, ec. (6.16)", () => {
  const fc0 = 16;
  const fc90 = 1.6;

  it("a 0° devuelve fc,0,d y a 90° el valor perpendicular", () => {
    expect(resistenciaEnAnguloMPa(fc0, fc90, 1, 0)).toBeCloseTo(fc0, 9);
    expect(resistenciaEnAnguloMPa(fc0, fc90, 1, 90)).toBeCloseTo(fc90, 9);
    expect(resistenciaEnAnguloMPa(fc0, fc90, 1.5, 90)).toBeCloseTo(1.5 * fc90, 9);
  });

  it("cae muy rápido al salirse de la fibra", () => {
    /*
     * Con fc,0/fc,90 = 10, a 30° ya se perdió más de la mitad del camino hacia
     * el valor perpendicular. Es la razón de que los apoyos inclinados y los
     * ensambles a media madera se verifiquen siempre por esta expresión y no
     * interpolando a ojo.
     */
    const a30 = resistenciaEnAnguloMPa(fc0, fc90, 1, 30);
    expect(a30).toBeLessThan(fc0 / 2);
    expect(a30).toBeGreaterThan(fc90);
  });

  it("decrece monótonamente con el ángulo", () => {
    let previo = resistenciaEnAnguloMPa(fc0, fc90, 1, 0);
    for (let a = 5; a <= 90; a += 5) {
      const actual = resistenciaEnAnguloMPa(fc0, fc90, 1, a);
      expect(actual).toBeLessThanOrEqual(previo + 1e-9);
      previo = actual;
    }
  });
});
