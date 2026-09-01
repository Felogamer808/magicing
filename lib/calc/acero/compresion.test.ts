import { describe, expect, it } from "vitest";
import {
  KI_CANALES_ESPALDA_CON_ESPALDA,
  calcularCompresion,
  esbeltezModificadaE6,
  OMEGA_C,
  tensionCritica,
  tensionCriticaTorsionalPa,
} from "@/lib/calc/acero/compresion";
import { propiedades, radioGiroIndividualPNCM } from "@/lib/calc/acero/perfiles";

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

// El HEB200 del catálogo (Ix=5696 cm⁴, Iy=2003 cm⁴, J=59,28 cm⁴, Iw=171,1·10⁹ mm⁶,
// A=78,1 cm²) contrasta a mano la ec. (E4-2): con KzL = 3 m da Fe ≈ 1079,70 MPa,
// muy por encima de Fy, así que siempre cae en la rama inelástica —el término en
// Iw domina y G·J solo, con KzL → ∞, ya da Fy/Fe ≈ 0,42 < 2,25, lejos del límite
// elástico—. No hace falta forzar la rama elástica: alcanza con reproducir el
// número exacto de la ecuación y la lógica de gobierno.
describe("pandeo torsional, art. E4", () => {
  const HEB200_IX_M4 = 5696 / 1e8;
  const HEB200_IY_M4 = 2003 / 1e8;
  const HEB200_J_M4 = 59.28 / 1e8;
  const HEB200_CW_M6 = (171.1e9) / 1e18;
  const HEB200_AREA_M2 = 78.1 / 1e4;

  it("reproduce Fe de la ec. (E4-2) para un HEB200 con KzL = 3 m", () => {
    const fePa = tensionCriticaTorsionalPa(3, E, HEB200_CW_M6, HEB200_J_M4, HEB200_IX_M4, HEB200_IY_M4);
    expect(fePa).toBeCloseTo(1079704236.632864, 0);
  });

  it("G sale de E con ν = 0,3 fijo: G = E/2,6", () => {
    // Con KzL → ∞ el término en Cw se anula y sólo queda G·J/(Ix+Iy).
    const fePa = tensionCriticaTorsionalPa(1e9, E, HEB200_CW_M6, HEB200_J_M4, HEB200_IX_M4, HEB200_IY_M4);
    const gPa = E / 2.6;
    expect(fePa).toBeCloseTo((gPa * HEB200_J_M4) / (HEB200_IX_M4 + HEB200_IY_M4), 0);
  });

  it("no se evalúa si no se pasa kzLM", () => {
    const r = calcularCompresion({
      familia: "HEB",
      params: { altura: 200 },
      lcxM: 3,
      lcyM: 3,
      fyPa: FY,
      ePa: E,
    });
    expect(r.pandeoTorsional).toBeUndefined();
    expect(r.gobierna).not.toBe("torsional");
  });

  it("no se evalúa en el PNC suelto, que no es doblemente simétrico", () => {
    const p = propiedades("PNC", { altura: 200 });
    expect(p.doblementeSimetrica).toBe(false);

    const r = calcularCompresion({
      familia: "PNC",
      params: { altura: 200 },
      lcxM: 3,
      lcyM: 3,
      fyPa: FY,
      ePa: E,
      kzLM: 3,
    });
    expect(r.pandeoTorsional).toBeUndefined();
  });

  it("puede gobernar cuando la longitud de pandeo flexional es chica y la torsional no", () => {
    const r = calcularCompresion({
      familia: "HEB",
      params: { altura: 200 },
      lcxM: 0.01,
      lcyM: 0.01,
      fyPa: FY,
      ePa: E,
      kzLM: 3,
    });

    expect(r.pandeoTorsional).toBeDefined();
    expect(r.pandeoTorsional!.regimen).toBe("inelástico (E3-2)");
    expect(r.pandeoTorsional!.pnKN).toBeCloseTo(226908697.5537007 * HEB200_AREA_M2 / 1000, 3);
    expect(r.pandeoTorsional!.admisibleKN).toBeCloseTo(r.pandeoTorsional!.pnKN / OMEGA_C, 6);
    expect(r.gobierna).toBe("torsional");
    expect(r.admisibleKN).toBeCloseTo(r.pandeoTorsional!.admisibleKN, 9);
    expect(r.admisibleKN).toBeLessThan(r.ejeFuerte.admisibleKN);
    expect(r.admisibleKN).toBeLessThan(r.ejeDebil.admisibleKN);
  });
});

/*
 * Notas del curso Estructuras de Acero (FING, UdelaR), art. E6.2: columnas
 * armadas con conectores intermedios. La planilla AISC 360.xlsx no traía este
 * caso; las fórmulas se contrastaron a mano contra el apunte, no contra una
 * celda de referencia.
 */
describe("esbeltez modificada de columnas armadas, art. E6.2", () => {
  it("atornillado sin pretensar: ec. (E6-1) siempre, sin umbral", () => {
    // (Lc/r)0 = 50, a = 1 m, ri = 0,02 m → a/ri = 50.
    const r = esbeltezModificadaE6(50, 1, 0.02, "atornillado-sin-pretensar", 0.75);
    expect(r.relacion).toBeCloseTo(50, 9);
    expect(r.ecuacion).toBe("E6-1");
    expect(r.esbeltezModificada).toBeCloseTo(Math.sqrt(50 ** 2 + 50 ** 2), 9);

    // Vale igual con a/ri chico: no hay rama sin corrección para este conector.
    const chico = esbeltezModificadaE6(50, 0.2, 0.02, "atornillado-sin-pretensar", 0.75);
    expect(chico.ecuacion).toBe("E6-1");
    expect(chico.esbeltezModificada).toBeGreaterThan(50);
  });

  it("soldado o pretensado, a/ri ≤ 40: ec. (E6-2a), sin corrección", () => {
    const r = esbeltezModificadaE6(50, 0.6, 0.02, "soldado-o-pretensado", 0.75);
    expect(r.relacion).toBeCloseTo(30, 9);
    expect(r.ecuacion).toBe("E6-2a");
    expect(r.esbeltezModificada).toBe(50);
  });

  it("soldado o pretensado, a/ri > 40: ec. (E6-2b), atenuada por Ki", () => {
    // a = 1 m, ri = 0,02 m → a/ri = 50.
    const r = esbeltezModificadaE6(50, 1, 0.02, "soldado-o-pretensado", 0.75);
    expect(r.relacion).toBeCloseTo(50, 9);
    expect(r.ecuacion).toBe("E6-2b");
    expect(r.esbeltezModificada).toBeCloseTo(Math.sqrt(50 ** 2 + (0.75 * 50) ** 2), 9);
  });

  it("el conector soldado tiene un escalón en a/ri = 40, y es de la norma", () => {
    /*
     * Justo por encima de 40 la ec. (E6-2b) no arranca en cero: entra con
     * (Ki·40)² ya adentro de la raíz, así que hay un salto discreto contra la
     * ec. (E6-2a) que un instante antes no corregía nada. A diferencia del
     * empalme de E3 (que es continuo salvo redondeo), acá el escalón es real y
     * no un artefacto de precisión: las dos ecuaciones de la norma no se tocan
     * en el punto de quiebre.
     */
    const justoAntes = esbeltezModificadaE6(50, 40 * 0.02, 0.02, "soldado-o-pretensado", 0.75);
    const justoDespues = esbeltezModificadaE6(50, 40.01 * 0.02, 0.02, "soldado-o-pretensado", 0.75);

    expect(justoAntes.esbeltezModificada).toBe(50);
    expect(justoDespues.esbeltezModificada).toBeGreaterThan(50);
    expect(justoDespues.esbeltezModificada - justoAntes.esbeltezModificada).toBeGreaterThan(0.4);
  });

  it("la corrección nunca baja la esbeltez: sumar un término al cuadrado no puede achicar la raíz", () => {
    for (const tipo of ["atornillado-sin-pretensar", "soldado-o-pretensado"] as const) {
      for (const a of [0.1, 0.5, 1, 2]) {
        const r = esbeltezModificadaE6(60, a, 0.025, tipo, 0.75);
        expect(r.esbeltezModificada).toBeGreaterThanOrEqual(60);
      }
    }
  });
});

describe("columna armada dentro de calcularCompresion", () => {
  const comun = {
    familia: "2PNC-almas" as const,
    params: { altura: 180 },
    lcxM: 3.6,
    lcyM: 3.6,
    fyPa: FY,
    ePa: E,
  };

  it("ri sale del catálogo del canal simple, no de la sección compuesta", () => {
    const riM = radioGiroIndividualPNCM(180);
    // ry de la fila PNC180 del catálogo: 2,02 cm.
    expect(riM).toBeCloseTo(0.0202, 6);
    // Y es distinto del ry de la sección ya compuesta con los dos canales.
    const compuesta = propiedades("2PNC-almas", { altura: 180 });
    expect(riM).not.toBeCloseTo(compuesta.ryM, 3);
  });

  it("sin columnaArmada, el resultado no trae el bloque y el eje débil queda igual que antes", () => {
    const sinCorregir = calcularCompresion(comun);
    expect(sinCorregir.columnaArmada).toBeUndefined();
  });

  it("con columnaArmada, sólo se corrige el eje débil", () => {
    const sinCorregir = calcularCompresion(comun);
    const conConectores = calcularCompresion({
      ...comun,
      columnaArmada: { aM: 0.4, tipo: "atornillado-sin-pretensar" },
    });

    expect(conConectores.columnaArmada).toBeDefined();
    expect(conConectores.ejeDebil.esbeltez).toBeGreaterThan(sinCorregir.ejeDebil.esbeltez);
    expect(conConectores.ejeDebil.admisibleKN).toBeLessThan(sinCorregir.ejeDebil.admisibleKN);
    // El eje fuerte no tiene término de Steiner en la composición: no depende
    // de los conectores y no se toca.
    expect(conConectores.ejeFuerte.admisibleKN).toBeCloseTo(sinCorregir.ejeFuerte.admisibleKN, 9);
  });

  it("usa Ki = 0,75, canales espalda con espalda", () => {
    const r = calcularCompresion({
      ...comun,
      columnaArmada: { aM: 2, tipo: "soldado-o-pretensado" },
    });
    expect(r.columnaArmada!.ki).toBe(KI_CANALES_ESPALDA_CON_ESPALDA);
    expect(r.columnaArmada!.ki).toBe(0.75);
  });

  it("ignora columnaArmada en familias que no son 2PNC-almas", () => {
    const r = calcularCompresion({
      familia: "2PNC-cajon",
      params: { altura: 180 },
      lcxM: 3.6,
      lcyM: 3.6,
      fyPa: FY,
      ePa: E,
      columnaArmada: { aM: 0.2, tipo: "atornillado-sin-pretensar" },
    });
    expect(r.columnaArmada).toBeUndefined();
  });

  it("el art. E6.2(a) limita la separación entre conectores, y se puede despejar", () => {
    const holgado = calcularCompresion({
      ...comun,
      columnaArmada: { aM: 0.15, tipo: "atornillado-sin-pretensar" },
    });
    expect(holgado.columnaArmada!.cumpleSeparacionMaxima).toBe(true);
    expect(0.15).toBeLessThanOrEqual(holgado.columnaArmada!.separacionMaximaM);

    const apretado = calcularCompresion({
      ...comun,
      columnaArmada: { aM: 3, tipo: "atornillado-sin-pretensar" },
    });
    expect(apretado.columnaArmada!.cumpleSeparacionMaxima).toBe(false);
    expect(3).toBeGreaterThan(apretado.columnaArmada!.separacionMaximaM);
  });

  it("reproduce a mano el caso soldado con a/ri > 40 sobre el catálogo real", () => {
    const riM = radioGiroIndividualPNCM(180);
    const aM = 41 * riM; // a/ri = 41, apenas sobre el umbral.
    const r = calcularCompresion({
      ...comun,
      columnaArmada: { aM, tipo: "soldado-o-pretensado" },
    });

    const p = propiedades("2PNC-almas", { altura: 180 });
    const esbeltez0 = comun.lcyM / p.ryM;
    const esperado = Math.sqrt(esbeltez0 ** 2 + (0.75 * 41) ** 2);

    expect(r.columnaArmada!.ecuacion).toBe("E6-2b");
    expect(r.columnaArmada!.esbeltezGeometrica).toBeCloseTo(esbeltez0, 6);
    expect(r.ejeDebil.esbeltez).toBeCloseTo(esperado, 6);
    expect(r.ejeDebil.esbeltez).toBeCloseTo(r.columnaArmada!.esbeltezModificada, 9);
  });
});
