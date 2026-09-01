import { describe, expect, it } from "vitest";
import {
  areaBulonM2,
  areaNetaBloqueM2,
  bulonMasExigido,
  calcularBloqueDeCorte,
  OMEGA_J,
  repartoElasticoBulones,
  resistenciaBulonKN,
  resistenciaChapaKN,
  resistenciaCorteBulonKN,
  resistenciaTraccionBulonKN,
  type PosicionBulon,
} from "@/lib/calc/acero/tornillos";

const FU_A36 = 400e6;
const FY_A36 = 248e6;

describe("área y resistencias del bulón, tabla J3.2", () => {
  it("reproduce el Ab = 314 mm² del M20 que da el apunte", () => {
    expect(areaBulonM2(20) * 1e6).toBeCloseTo(314.159, 2);
  });

  it("reproduce la resistencia a corte de un M20 A325", () => {
    // Rn = Fnv·Ab = 372 MPa · 314,159 mm² = 116,87 kN.
    expect(resistenciaCorteBulonKN(20, "A325")).toBeCloseTo(116.87, 1);
  });

  it("reproduce la resistencia a tracción de un M20 A325", () => {
    // Rn = Fnt·Ab = 620 MPa · 314,159 mm² = 194,78 kN.
    expect(resistenciaTraccionBulonKN(20, "A325")).toBeCloseTo(194.78, 1);
  });

  it("A307 es bastante más débil que A325, mismo diámetro", () => {
    expect(resistenciaCorteBulonKN(20, "A307")).toBeLessThan(resistenciaCorteBulonKN(20, "A325"));
    // 186/372 = exactamente la mitad: A307 corta con la mitad de Fnv de A325.
    expect(resistenciaCorteBulonKN(20, "A307") / resistenciaCorteBulonKN(20, "A325")).toBeCloseTo(0.5, 6);
  });
});

describe("resistencia de la chapa, ecs. (J3-6a) a (J3-6d)", () => {
  const base = { diametroMm: 20, espesorMm: 10, fuPa: FU_A36, deformacionControlada: true };

  it("reproduce aplastamiento y arrancamiento con deformación controlada", () => {
    const r = resistenciaChapaKN({ ...base, distanciaLibreMm: 25 });
    // Aplastamiento: 2,4·0,02·0,01·400e6 = 192 kN.
    expect(r.aplastamientoKN).toBeCloseTo(192, 1);
    // Arrancamiento: 1,2·0,025·0,01·400e6 = 120 kN.
    expect(r.arrancamientoKN).toBeCloseTo(120, 1);
    expect(r.gobierna).toBe("arrancamiento");
    expect(r.gobiernaKN).toBeCloseTo(120, 1);
  });

  it("con borde alejado, gobierna el aplastamiento y no el arrancamiento", () => {
    const r = resistenciaChapaKN({ ...base, distanciaLibreMm: 50 });
    // Arrancamiento: 1,2·0,05·0,01·400e6 = 240 kN > 192 kN de aplastamiento.
    expect(r.arrancamientoKN).toBeCloseTo(240, 1);
    expect(r.gobierna).toBe("aplastamiento");
    expect(r.gobiernaKN).toBeCloseTo(192, 1);
  });

  it("sin controlar deformaciones, los coeficientes suben a 3,0 y 1,5", () => {
    const controlada = resistenciaChapaKN({ ...base, distanciaLibreMm: 25 });
    const sinControlar = resistenciaChapaKN({ ...base, distanciaLibreMm: 25, deformacionControlada: false });
    expect(sinControlar.aplastamientoKN).toBeCloseTo(240, 1); // 3,0·0,02·0,01·400e6
    expect(sinControlar.arrancamientoKN).toBeCloseTo(150, 1); // 1,5·0,025·0,01·400e6
    expect(sinControlar.gobiernaKN).toBeGreaterThan(controlada.gobiernaKN);
  });
});

describe("resistencia del bulón completo: vástago y chapas", () => {
  it("gobierna la chapa cuando es más débil que el vástago", () => {
    const r = resistenciaBulonKN({
      diametroMm: 20,
      grado: "A325",
      planosDeCorte: 1,
      chapas: [{ espesorMm: 6, distanciaLibreMm: 25, fuPa: FU_A36, deformacionControlada: true }],
    });
    // Con 6 mm de chapa el aplastamiento (2,4·0,02·0,006·400e6 ≈ 115,2 kN) y el
    // arrancamiento (1,2·0,025·0,006·400e6 = 72 kN) quedan bien por debajo de
    // los 116,87 kN del vástago A325.
    expect(r.modoDeFalla).toBe("chapa");
    expect(r.nominalKN).toBeCloseTo(72, 1);
    expect(r.admisibleKN).toBeCloseTo(72 / OMEGA_J, 6);
  });

  it("gobierna el vástago cuando la chapa es gruesa y de buen acero", () => {
    const r = resistenciaBulonKN({
      diametroMm: 16,
      grado: "A307",
      planosDeCorte: 1,
      chapas: [{ espesorMm: 25, distanciaLibreMm: 60, fuPa: 500e6, deformacionControlada: true }],
    });
    expect(r.modoDeFalla).toBe("corte del vástago");
    expect(r.nominalKN).toBeCloseTo(resistenciaCorteBulonKN(16, "A307"), 6);
  });

  it("duplicar los planos de corte duplica la resistencia del vástago", () => {
    const simple = resistenciaBulonKN({
      diametroMm: 20, grado: "A325", planosDeCorte: 1,
      chapas: [{ espesorMm: 25, distanciaLibreMm: 60, fuPa: 500e6, deformacionControlada: true }],
    });
    const doble = resistenciaBulonKN({
      diametroMm: 20, grado: "A325", planosDeCorte: 2,
      chapas: [{ espesorMm: 25, distanciaLibreMm: 60, fuPa: 500e6, deformacionControlada: true }],
    });
    expect(doble.resistenciaCorteKN).toBeCloseTo(2 * simple.resistenciaCorteKN, 6);
  });

  it("con dos chapas de distinto espesor, gobierna la más fina", () => {
    const r = resistenciaBulonKN({
      diametroMm: 20,
      grado: "A325",
      planosDeCorte: 1,
      chapas: [
        { espesorMm: 6, distanciaLibreMm: 40, fuPa: FU_A36, deformacionControlada: true },
        { espesorMm: 20, distanciaLibreMm: 40, fuPa: FU_A36, deformacionControlada: true },
      ],
    });
    const soloFina = resistenciaChapaKN({
      diametroMm: 20, espesorMm: 6, distanciaLibreMm: 40, fuPa: FU_A36, deformacionControlada: true,
    });
    expect(r.resistenciaChapas).toHaveLength(2);
    expect(r.nominalKN).toBeCloseTo(soloFina.gobiernaKN, 6);
  });
});

describe("reparto elástico en un grupo de bulones, art. 8.2.1", () => {
  const cuadrado: PosicionBulon[] = [
    { xM: 0.05, yM: 0.05 },
    { xM: 0.05, yM: -0.05 },
    { xM: -0.05, yM: 0.05 },
    { xM: -0.05, yM: -0.05 },
  ];

  it("corte concéntrico se reparte en partes iguales", () => {
    const r = repartoElasticoBulones(cuadrado, 0, 100, 0);
    for (const b of r) {
      expect(b.vyKN).toBeCloseTo(25, 6);
      expect(b.vxKN).toBeCloseTo(0, 9);
      expect(b.vKN).toBeCloseTo(25, 6);
    }
  });

  it("con sólo momento, los cuatro bulones de un grupo cuadrado quedan igual de exigidos", () => {
    // Ip = 4·(0,05² + 0,05²) = 0,02. Con M = 10 kN·m, cada bulón toma
    // Vx = ∓M/Ip·y, Vy = ±M/Ip·x, y los dos términos valen 25 kN en valor
    // absoluto por la simetría del cuadrado: V = √(25² + 25²) ≈ 35,36 kN.
    const r = repartoElasticoBulones(cuadrado, 0, 0, 10);
    for (const b of r) {
      expect(b.vKN).toBeCloseTo(35.355, 2);
    }
  });

  it("el signo de Vx y Vy sigue la ec. del apunte, no un valor absoluto", () => {
    const r = repartoElasticoBulones(cuadrado, 0, 0, 10);
    const superior = r.find((b) => b.posicion.xM > 0 && b.posicion.yM > 0)!;
    const inferior = r.find((b) => b.posicion.xM > 0 && b.posicion.yM < 0)!;
    // Vx = -M/Ip·y: con y positivo, Vx negativo; con y negativo, Vx positivo.
    expect(superior.vxKN).toBeLessThan(0);
    expect(inferior.vxKN).toBeGreaterThan(0);
    // Vy = +M/Ip·x: con x positivo en los dos, Vy positivo en los dos.
    expect(superior.vyKN).toBeGreaterThan(0);
    expect(inferior.vyKN).toBeGreaterThan(0);
  });

  it("corte y momento juntos exigen más a un bulón que a los otros", () => {
    const r = repartoElasticoBulones(cuadrado, 0, 100, 10);
    const max = bulonMasExigido(r)!;
    const min = r.reduce((a, b) => (b.vKN < a.vKN ? b : a));
    expect(max.vKN).toBeGreaterThan(min.vKN);
  });

  it("una fila vertical de bulones concentra el giro en los extremos", () => {
    // Grupo asimétrico: 3 bulones en línea, separados 0,08 m.
    const fila: PosicionBulon[] = [{ xM: 0, yM: 0.08 }, { xM: 0, yM: 0 }, { xM: 0, yM: -0.08 }];
    const r = repartoElasticoBulones(fila, 0, 0, 5);
    const [arriba, medio, abajo] = r;
    expect(medio.vKN).toBeCloseTo(0, 9); // en el centroide, momento no genera corte
    expect(arriba.vKN).toBeCloseTo(abajo.vKN, 9);
    expect(arriba.vKN).toBeGreaterThan(0);
  });

  it("grupo vacío no rompe: devuelve arreglo vacío y bulonMasExigido null", () => {
    expect(repartoElasticoBulones([], 10, 10, 5)).toEqual([]);
    expect(bulonMasExigido([])).toBeNull();
  });
});

describe("bloque de corte, ec. (J4-5)", () => {
  it("sin agujeros en el plano de corte, la fluencia siempre topa a la rotura en A36", () => {
    /*
     * Es una propiedad del acero, no del caso particular: 0,6·Fu·Agv (rotura,
     * sin descuento) es siempre mayor que 0,6·Fy·Agv (el tope de fluencia)
     * porque Fy/Fu = 0,62 en A36 y 0,6 > 0,6·0,62. Sin agujeros en el plano de
     * corte, la fluencia gobierna siempre, por más agujeros que tenga el plano
     * de tracción.
     */
    const r = calcularBloqueDeCorte({
      planoCorte: { areaBrutaM2: 0.001, agujeros: [] },
      planoTraccion: { areaBrutaM2: 0.0005, agujeros: [{ diametroMm: 18, espesorMm: 10 }] },
      ubs: 1.0,
      fyPa: FY_A36,
      fuPa: FU_A36,
    });
    expect(r.nominalKN).toBeCloseTo(r.rnFluenciaKN, 9);
    expect(r.rnFluenciaKN).toBeLessThan(r.rnRoturaKN);
  });

  it("con agujeros también en el plano de corte, la rotura puede pasar a gobernar", () => {
    const r = calcularBloqueDeCorte({
      planoCorte: {
        areaBrutaM2: 0.001,
        agujeros: [{ diametroMm: 18, espesorMm: 10 }, { diametroMm: 18, espesorMm: 10 }],
      },
      planoTraccion: { areaBrutaM2: 0.0005, agujeros: [{ diametroMm: 18, espesorMm: 10 }] },
      ubs: 1.0,
      fyPa: FY_A36,
      fuPa: FU_A36,
    });
    // Anv = 0,001 − 2·0,0002 = 0,0006; Ant = 0,0005 − 0,0002 = 0,0003.
    expect(r.rnRoturaKN).toBeCloseTo(264, 0);
    expect(r.rnFluenciaKN).toBeCloseTo(268.8, 0);
    expect(r.nominalKN).toBeCloseTo(264, 0);
    expect(r.rnRoturaKN).toBeLessThan(r.rnFluenciaKN);
    expect(r.admisibleKN).toBeCloseTo(264 / OMEGA_J, 0);
  });

  it("Ubs = 0,5 baja la resistencia frente a Ubs = 1,0", () => {
    const comun = {
      planoCorte: { areaBrutaM2: 0.001, agujeros: [] },
      planoTraccion: { areaBrutaM2: 0.0005, agujeros: [] },
      fyPa: FY_A36,
      fuPa: FU_A36,
    };
    const uniforme = calcularBloqueDeCorte({ ...comun, ubs: 1.0 });
    const noUniforme = calcularBloqueDeCorte({ ...comun, ubs: 0.5 });
    expect(noUniforme.nominalKN).toBeLessThan(uniforme.nominalKN);
  });

  it("areaNetaBloqueM2 reutiliza la misma cuenta que el área neta de tracción", () => {
    const plano = { areaBrutaM2: 0.001, agujeros: [{ diametroMm: 20, espesorMm: 12 }] };
    // (20+2)·12 mm² = 264 mm² = 0,000264 m².
    expect(areaNetaBloqueM2(plano) * 1e6).toBeCloseTo(1000 - 264, 3);
  });
});
