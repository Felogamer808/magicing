import { describe, expect, it } from "vitest";
import { calcularCompresion, OMEGA_C, tensionCritica } from "@/lib/calc/acero/compresion";
import { propiedades } from "@/lib/calc/acero/perfiles";

const FY = 250e6;
const E = 200e9;

// La hoja "Hoja2" de AISC 360.xlsx resolvía E3 para un 2PNC180 con E = 200 GPa,
// Fy = 250 MPa, KL = 3,6 m en el eje fuerte y 1,5 m en el débil. Sus celdas de
// tensión son el contraste: no dependen de las propiedades de sección, solo de
// la esbeltez, así que sirven aunque la columna del perfil tuviera errores.
describe("tensión crítica: contraste contra las celdas de la planilla", () => {
  it("reproduce Fe y Fcr de la rama inelástica", () => {
    // Celda G12 de la planilla: KL/r = 51,575439048.
    const r = tensionCritica(51.575439048480028, FY, E);
    expect(r.fePa).toBeCloseTo(742068289.83835077, 2); // G13
    expect(r.fcrPa).toBeCloseTo(217120584.66189185, 2); // G15
    expect(r.esbeltezLimite).toBeCloseTo(133.21891757554556, 6); // G14
    expect(r.regimen).toBe("inelástico (E3-2)");
  });

  it("reproduce Fe y Fcr del eje débil de la planilla", () => {
    // Celda G22: KL/r = 21,4897662702.
    const r = tensionCritica(21.489766270200011, FY, E);
    expect(r.fePa).toBeCloseTo(4274313349.4689007, 2); // G23
    expect(r.fcrPa).toBeCloseTo(243954164.50956708, 2); // G25
    expect(r.regimen).toBe("inelástico (E3-2)");
  });

  it("cruza a la rama elástica pasada la esbeltez límite", () => {
    const limite = 4.71 * Math.sqrt(E / FY);

    const justoAntes = tensionCritica(limite - 0.01, FY, E);
    const justoDespues = tensionCritica(limite + 0.01, FY, E);

    expect(justoAntes.regimen).toBe("inelástico (E3-2)");
    expect(justoDespues.regimen).toBe("elástico (E3-3)");
    // Las dos ramas casi se encuentran en el límite, pero no exactamente: ahí
    // Fy/Fe = 2,25, y 0,658^2,25 = 0,3901·Fy contra 0,877·Fe = 0,3898·Fy. El
    // escalón de 0,09 % es de los coeficientes redondeados de la norma, no del
    // código, así que la tolerancia lo admite en lugar de disimularlo.
    expect(justoAntes.fcrPa / justoDespues.fcrPa).toBeCloseTo(1, 2);
    expect(justoAntes.fcrPa / justoDespues.fcrPa).toBeGreaterThan(1);
  });

  it("Fcr nunca supera Fy: no se puede pandear por encima de la fluencia", () => {
    for (const esbeltez of [5, 20, 50, 100, 150, 250]) {
      expect(tensionCritica(esbeltez, FY, E).fcrPa).toBeLessThanOrEqual(FY);
    }
  });
});

describe("compresión de un perfil completo", () => {
  it("aplica Pn = Fcr·Ag y el coeficiente ASD Ωc = 1,67", () => {
    const r = calcularCompresion({
      familia: "PNI",
      params: { altura: 140 },
      lcxM: 3.6,
      lcyM: 1.5,
      fyPa: FY,
      ePa: E,
    });
    const p = propiedades("PNI", { altura: 140 } );

    expect(r.ejeFuerte.esbeltez).toBeCloseTo(3.6 / p.rxM, 6);
    expect(r.ejeFuerte.pnKN).toBeCloseTo((r.ejeFuerte.fcrPa * p.areaM2) / 1000, 6);
    expect(r.ejeFuerte.admisibleKN).toBeCloseTo(r.ejeFuerte.pnKN / OMEGA_C, 6);
    expect(OMEGA_C).toBe(1.67);
  });

  it("gobierna el eje de menor resistencia admisible", () => {
    // El PNI tiene ry muy chico: con longitudes parecidas manda siempre el débil.
    const r = calcularCompresion({
      familia: "PNI",
      params: { altura: 140 },
      lcxM: 3.6,
      lcyM: 3.6,
      fyPa: FY,
      ePa: E,
    });

    expect(r.gobierna).toBe("débil");
    expect(r.admisibleKN).toBeCloseTo(r.ejeDebil.admisibleKN, 9);
    expect(r.ejeDebil.admisibleKN).toBeLessThan(r.ejeFuerte.admisibleKN);
  });

  it("avisa cuando la esbeltez pasa de 200, como sugiere la nota de E2", () => {
    const corto = calcularCompresion({
      familia: "HEB",
      params: { altura: 200 },
      lcxM: 3,
      lcyM: 3,
      fyPa: FY,
      ePa: E,
    });
    const largo = calcularCompresion({
      familia: "PNI",
      params: { altura: 80 },
      lcxM: 6,
      lcyM: 6,
      fyPa: FY,
      ePa: E,
    });

    expect(corto.superaEsbeltezRecomendada).toBe(false);
    expect(largo.esbeltezMaxima).toBeGreaterThan(200);
    expect(largo.superaEsbeltezRecomendada).toBe(true);
  });

  it("verifica contra la carga requerida cuando se la pasa", () => {
    const base = {
      familia: "HEB" as const,
      params: { altura: 200 },
      lcxM: 3,
      lcyM: 3,
      fyPa: FY,
      ePa: E,
    };
    const sinCarga = calcularCompresion(base);
    expect(sinCarga.verifica).toBeNull();
    expect(sinCarga.aprovechamiento).toBeNull();

    const admisible = sinCarga.admisibleKN;
    expect(calcularCompresion({ ...base, pRequeridaKN: admisible * 0.5 }).verifica).toBe(true);
    expect(calcularCompresion({ ...base, pRequeridaKN: admisible * 1.5 }).verifica).toBe(false);
    expect(
      calcularCompresion({ ...base, pRequeridaKN: admisible * 0.5 })!.aprovechamiento
    ).toBeCloseTo(0.5, 6);
  });

  /**
   * E3 es pandeo por flexión y vale igual para secciones cerradas: no se le pone
   * guarda, a diferencia de F2 y G2. Lo que sí puede gobernar en tubos de pared
   * fina es el pandeo local del art. E7, que todavía no está.
   */
  it("resuelve tubos, que en E3 no tienen restricción de alcance", () => {
    const redondo = calcularCompresion({
      familia: "tubo-redondo",
      params: { diametro: 168.3, espesor: 6 },
      lcxM: 4,
      lcyM: 4,
      fyPa: FY,
      ePa: E,
    });
    const rectangular = calcularCompresion({
      familia: "tubo-rectangular",
      params: { alto: 200, ancho: 100, espesor: 6 },
      lcxM: 4,
      lcyM: 4,
      fyPa: FY,
      ePa: E,
    });

    // El tubo redondo tiene el mismo radio de giro en los dos ejes: ninguno gobierna
    // por geometría, y con longitudes iguales las dos resistencias coinciden.
    expect(redondo.ejeFuerte.admisibleKN).toBeCloseTo(redondo.ejeDebil.admisibleKN, 6);
    expect(redondo.admisibleKN).toBeGreaterThan(0);
    expect(redondo.designacion).toBe("Ø168,3×6");

    // El rectangular es más flexible en el eje corto, y ahí manda.
    expect(rectangular.gobierna).toBe("débil");
    expect(rectangular.designacion).toBe("□200×100×6");
  });

  it("separar los dos PNC sube la resistencia del eje débil", () => {
    const comun = {
      familia: "2PNC-almas" as const,
      params: { altura: 180 },
      lcxM: 3.6,
      lcyM: 3.6,
      fyPa: FY,
      ePa: E,
    };
    const juntos = calcularCompresion(comun);
    const separados = calcularCompresion({ ...comun, params: { altura: 180, separacion: 120 } });

    expect(separados.ejeDebil.admisibleKN).toBeGreaterThan(juntos.ejeDebil.admisibleKN);
    expect(separados.ejeFuerte.admisibleKN).toBeCloseTo(juntos.ejeFuerte.admisibleKN, 6);
  });
});
