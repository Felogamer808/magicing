import { describe, expect, it } from "vitest";
import {
  COEF_FLECHA,
  K_SISTEMA,
  calcularFlecha,
  calcularLuzCanto,
  type DatosFlecha,
  type DatosLuzCanto,
  type SistemaEstructural,
} from "./deformaciones";

const baseLuzCanto: DatosLuzCanto = {
  sistema: "simplemente-apoyada",
  luzEfM: 6,
  dM: 0.45,
  fckMPa: 30,
  fykMPa: 500,
  rho: 0.004,
  rhoComp: 0,
  asReqCm2: 10,
  asProvCm2: 10,
  alaAnchaEnT: false,
  soportaTabiques: false,
};

describe("deformaciones: relación luz/canto (art. 7.4.2)", () => {
  it("reproduce la ec. (7.16.a) cuando ρ ≤ ρ0", () => {
    const r = calcularLuzCanto({ ...baseLuzCanto, rho: 0.004 });
    const raiz = Math.sqrt(30);
    const rho0 = 1e-3 * raiz;
    expect(r.rho0).toBeCloseTo(rho0, 12);
    expect(r.usaRamaArmada).toBe(false);
    expect(r.ldBase).toBeCloseTo(
      11 + (1.5 * raiz * rho0) / 0.004 + 3.2 * raiz * (rho0 / 0.004 - 1) ** 1.5,
      9
    );
  });

  it("pasa a la ec. (7.16.b) cuando ρ > ρ0 y ahí sí cuenta ρ'", () => {
    const r = calcularLuzCanto({ ...baseLuzCanto, rho: 0.01, rhoComp: 0.002 });
    const raiz = Math.sqrt(30);
    const rho0 = 1e-3 * raiz;
    expect(r.usaRamaArmada).toBe(true);
    expect(r.ldBase).toBeCloseTo(
      11 + (1.5 * raiz * rho0) / (0.01 - 0.002) + (1 / 12) * raiz * Math.sqrt(0.002 / rho0),
      9
    );
  });

  /**
   * La tabla A19.7.4 trae, además de K, el l/d indicativo para ρ=1,5% y ρ=0,5%.
   * Esos valores salen de la misma ec. (7.16) con el hormigón del estudio
   * paramétrico, así que sirven de contraste independiente de la implementación.
   * La tolerancia es de 1 porque la tabla está redondeada a entero y, según su
   * propia NOTA 1, los valores se eligieron para quedar del lado de la seguridad.
   */
  it("reproduce los l/d indicativos de la tabla A19.7.4 en los cinco sistemas", () => {
    const tabulados: { sistema: SistemaEstructural; ldAlta: number; ldBaja: number }[] = [
      { sistema: "simplemente-apoyada", ldAlta: 14, ldBaja: 20 },
      { sistema: "extremo-continua", ldAlta: 18, ldBaja: 26 },
      { sistema: "vano-interior", ldAlta: 20, ldBaja: 30 },
      { sistema: "losa-plana", ldAlta: 17, ldBaja: 24 },
      { sistema: "voladizo", ldAlta: 6, ldBaja: 8 },
    ];

    for (const { sistema, ldAlta, ldBaja } of tabulados) {
      const alta = calcularLuzCanto({ ...baseLuzCanto, sistema, rho: 0.015 });
      const baja = calcularLuzCanto({ ...baseLuzCanto, sistema, rho: 0.005 });
      expect(Math.abs(alta.ldBase - ldAlta)).toBeLessThanOrEqual(1);
      expect(Math.abs(baja.ldBase - ldBaja)).toBeLessThanOrEqual(1);
    }
  });

  it("usa los K de la tabla A19.7.4", () => {
    expect(K_SISTEMA["simplemente-apoyada"]).toBe(1.0);
    expect(K_SISTEMA["extremo-continua"]).toBe(1.3);
    expect(K_SISTEMA["vano-interior"]).toBe(1.5);
    expect(K_SISTEMA["losa-plana"]).toBe(1.2);
    expect(K_SISTEMA.voladizo).toBe(0.4);
  });

  it("la corrección de tensión (7.17) es neutra con fyk=500 y As,req=As,prov, y premia el exceso de armadura", () => {
    const justa = calcularLuzCanto(baseLuzCanto);
    expect(justa.factorTension).toBeCloseTo(1, 9);

    // 25 % más de armadura de la necesaria: la tensión en servicio baja y el
    // l/d admisible sube en la misma proporción.
    const sobrearmada = calcularLuzCanto({ ...baseLuzCanto, asProvCm2: 12.5 });
    expect(sobrearmada.factorTension).toBeCloseTo(1.25, 9);
    expect(sobrearmada.ldAdm).toBeCloseTo(justa.ldAdm * 1.25, 9);
  });

  it("aplica 0,8 con ala ancha en T", () => {
    const r = calcularLuzCanto({ ...baseLuzCanto, alaAnchaEnT: true });
    expect(r.factorAla).toBe(0.8);
    expect(r.ldAdm).toBeCloseTo(calcularLuzCanto(baseLuzCanto).ldAdm * 0.8, 9);
  });

  it("aplica 7/leff a vigas de más de 7 m con tabiques, y nada si no hay tabiques", () => {
    const conTabiques = calcularLuzCanto({ ...baseLuzCanto, luzEfM: 10, soportaTabiques: true });
    expect(conTabiques.factorLuzLarga).toBeCloseTo(7 / 10, 9);

    const sinTabiques = calcularLuzCanto({ ...baseLuzCanto, luzEfM: 10, soportaTabiques: false });
    expect(sinTabiques.factorLuzLarga).toBe(1);

    // Por debajo del umbral no corrige aunque haya tabiques.
    const corta = calcularLuzCanto({ ...baseLuzCanto, luzEfM: 6, soportaTabiques: true });
    expect(corta.factorLuzLarga).toBe(1);
  });

  it("en losa plana el umbral de la corrección por luz es 8,5 m, no 7", () => {
    const losa = calcularLuzCanto({
      ...baseLuzCanto, sistema: "losa-plana", luzEfM: 10, soportaTabiques: true,
    });
    expect(losa.factorLuzLarga).toBeCloseTo(8.5 / 10, 9);

    const losaCorta = calcularLuzCanto({
      ...baseLuzCanto, sistema: "losa-plana", luzEfM: 8, soportaTabiques: true,
    });
    expect(losaCorta.factorLuzLarga).toBe(1);
  });

  it("verifica comparando l/d real contra el admisible", () => {
    // d=0,45 y luz 6 m dan l/d=13,3, holgado contra los ~26 admisibles.
    const holgado = calcularLuzCanto(baseLuzCanto);
    expect(holgado.ldReal).toBeCloseTo(6 / 0.45, 9);
    expect(holgado.verifica).toBe(true);

    // Mismo elemento con un canto que lo deja muy esbelto.
    const esbelto = calcularLuzCanto({ ...baseLuzCanto, dM: 0.15 });
    expect(esbelto.ldReal).toBeCloseTo(40, 9);
    expect(esbelto.verifica).toBe(false);
  });
});

const baseFlecha: DatosFlecha = {
  bM: 0.3,
  hM: 0.5,
  dM: 0.45,
  dCompM: 0.05,
  asCm2: 10,
  asCompCm2: 0,
  fckMPa: 30,
  fctmMPa: 0.3 * 30 ** (2 / 3),
  esGPa: 200,
  phiFluencia: 2,
  epsilonCs: 0.0003,
  mqpKNm: 80,
  luzM: 6,
  coefFlecha: 5 / 48,
};

describe("deformaciones: flecha calculada (art. 7.4.3)", () => {
  it("arma el módulo efectivo de la ec. (7.20) y la relación de módulos", () => {
    const r = calcularFlecha(baseFlecha);
    const ecm = 22 * ((30 + 8) / 10) ** 0.3;
    expect(r.ecmGPa).toBeCloseTo(ecm, 9);
    expect(r.ecEffGPa).toBeCloseTo(ecm / 3, 9);
    expect(r.alphaE).toBeCloseTo(200 / (ecm / 3), 9);
    // Sin fluencia, el módulo efectivo es el secante y las dos αe coinciden.
    const sinFluencia = calcularFlecha({ ...baseFlecha, phiFluencia: 0 });
    expect(sinFluencia.ecEffGPa).toBeCloseTo(ecm, 9);
    expect(sinFluencia.alphaE).toBeCloseTo(sinFluencia.alphaECorto, 9);
  });

  it("la fibra neutra fisurada queda por encima de la sin fisurar, y su inercia por debajo", () => {
    const r = calcularFlecha(baseFlecha);
    expect(r.fisurada.xM).toBeLessThan(r.sinFisurar.xM);
    expect(r.fisurada.iM4).toBeLessThan(r.sinFisurar.iM4);
    // Sección sin fisurar de 0,30×0,50 con poca armadura: la fibra neutra cae
    // cerca del medio canto, algo por debajo por la armadura de tracción.
    expect(r.sinFisurar.xM).toBeGreaterThan(0.25);
    expect(r.sinFisurar.xM).toBeLessThan(0.3);
  });

  it("calcula Mcr con el módulo resistente de la sección sin fisurar", () => {
    const r = calcularFlecha(baseFlecha);
    const w = r.sinFisurar.iM4 / (0.5 - r.sinFisurar.xM);
    expect(r.mcrKNm).toBeCloseTo(baseFlecha.fctmMPa * w * 1000, 6);
  });

  it("con M por debajo de Mcr la sección no fisura: ζ=0 y la curvatura es la del estado I", () => {
    const r = calcularFlecha({ ...baseFlecha, mqpKNm: 20 });
    expect(r.fisura).toBe(false);
    expect(r.zeta).toBe(0);
    const esperada = 20 / 1000 / (r.ecEffGPa * 1000 * r.sinFisurar.iM4);
    expect(r.curvaturaFlexion).toBeCloseTo(esperada, 12);
  });

  it("con M por encima de Mcr interpola con la ec. (7.19) y β=0,5", () => {
    const r = calcularFlecha(baseFlecha);
    expect(r.fisura).toBe(true);
    expect(r.zeta).toBeCloseTo(1 - 0.5 * (r.mcrKNm / 80) ** 2, 9);

    // ec. (7.18): la curvatura cae entre la del estado I y la del II.
    const cI = 80 / 1000 / (r.ecEffGPa * 1000 * r.sinFisurar.iM4);
    const cII = 80 / 1000 / (r.ecEffGPa * 1000 * r.fisurada.iM4);
    expect(r.curvaturaFlexion).toBeGreaterThan(cI);
    expect(r.curvaturaFlexion).toBeLessThan(cII);
    expect(r.curvaturaFlexion).toBeCloseTo(r.zeta * cII + (1 - r.zeta) * cI, 12);
  });

  it("la curvatura de retracción sale de la ec. (7.21) y se anula sin retracción", () => {
    const r = calcularFlecha(baseFlecha);
    const crI = (0.0003 * r.alphaE * r.sinFisurar.sM3) / r.sinFisurar.iM4;
    const crII = (0.0003 * r.alphaE * r.fisurada.sM3) / r.fisurada.iM4;
    expect(r.curvaturaRetraccion).toBeCloseTo(r.zeta * crII + (1 - r.zeta) * crI, 12);
    expect(r.curvaturaRetraccion).toBeGreaterThan(0);

    const sinRetraccion = calcularFlecha({ ...baseFlecha, epsilonCs: 0 });
    expect(sinRetraccion.curvaturaRetraccion).toBe(0);
    expect(sinRetraccion.curvaturaTotal).toBeCloseTo(sinRetraccion.curvaturaFlexion, 12);
  });

  it("la flecha sale de a = k·L²·(1/r) con la curvatura total", () => {
    const r = calcularFlecha(baseFlecha);
    expect(r.flechaTotalMm).toBeCloseTo((5 / 48) * 36 * r.curvaturaTotal * 1000, 9);
    // Caso de mano completo: 0,30×0,50, As=10 cm², Mqp=80 kNm, φ=2, L=6 m.
    expect(r.flechaTotalMm).toBeCloseTo(15.644, 2);
  });

  it("la flecha instantánea es menor que la total, y la diferida es la resta", () => {
    const r = calcularFlecha(baseFlecha);
    expect(r.flechaInstantaneaMm).toBeGreaterThan(0);
    expect(r.flechaInstantaneaMm).toBeLessThan(r.flechaTotalMm);
    expect(r.flechaDiferidaMm).toBeCloseTo(r.flechaTotalMm - r.flechaInstantaneaMm, 9);
  });

  it("compara contra L/250 de apariencia y L/500 de daño a lo adyacente", () => {
    const r = calcularFlecha(baseFlecha);
    expect(r.limiteAparienciaMm).toBeCloseTo((6 / 250) * 1000, 9);
    expect(r.limiteDanioMm).toBeCloseTo((6 / 500) * 1000, 9);
    expect(r.verificaApariencia).toBe(r.flechaTotalMm <= r.limiteAparienciaMm);
    expect(r.verificaDanio).toBe(r.flechaDiferidaMm <= r.limiteDanioMm);
    expect(r.verifica).toBe(r.verificaApariencia && r.verificaDanio);
  });

  it("más fluencia da más flecha, y más armadura menos", () => {
    const base = calcularFlecha(baseFlecha);
    expect(calcularFlecha({ ...baseFlecha, phiFluencia: 3 }).flechaTotalMm).toBeGreaterThan(
      base.flechaTotalMm
    );
    expect(calcularFlecha({ ...baseFlecha, asCm2: 20 }).flechaTotalMm).toBeLessThan(
      base.flechaTotalMm
    );
    // Un canto mayor baja la flecha mucho más rápido que la armadura: es la
    // razón de ser del chequeo de luz/canto.
    expect(calcularFlecha({ ...baseFlecha, hM: 0.6, dM: 0.55 }).flechaTotalMm).toBeLessThan(
      base.flechaTotalMm
    );
  });

  it("la armadura de compresión reduce la flecha", () => {
    const sin = calcularFlecha(baseFlecha);
    const con = calcularFlecha({ ...baseFlecha, asCompCm2: 5 });
    expect(con.flechaTotalMm).toBeLessThan(sin.flechaTotalMm);
  });
});

describe("deformaciones: coeficientes de flecha", () => {
  it("trae los valores exactos de los esquemas de referencia", () => {
    const porId = Object.fromEntries(COEF_FLECHA.map((c) => [c.id, c.valor]));
    expect(porId["apoyada-uniforme"]).toBeCloseTo(5 / 48, 12);
    expect(porId["apoyada-puntual"]).toBeCloseTo(1 / 12, 12);
    expect(porId["empotrada-uniforme"]).toBeCloseTo(1 / 16, 12);
    expect(porId["voladizo-uniforme"]).toBeCloseTo(1 / 4, 12);
    expect(porId["voladizo-puntual"]).toBeCloseTo(1 / 3, 12);
  });

  /**
   * Contraste del coeficiente contra la flecha elástica conocida: una biapoyada
   * con carga uniforme sin fisurar tiene que dar 5qL⁴/(384·EI) por las dos vías.
   */
  it("el coeficiente 5/48 reproduce 5qL⁴/(384·EI) en régimen sin fisurar", () => {
    // q bajo a propósito: Mqp = 22,5 kNm queda por debajo de Mcr ≈ 39,5 kNm,
    // así que la sección trabaja entera y la flecha tiene que coincidir con la
    // elástica de resistencia de materiales.
    const q = 5; // kN/m
    const L = 6;
    const mqp = (q * L ** 2) / 8;
    // Sin fluencia ni retracción y con un Mcr alto (sección sin fisurar).
    const r = calcularFlecha({
      ...baseFlecha, mqpKNm: mqp, luzM: L, phiFluencia: 0, epsilonCs: 0,
    });
    expect(r.fisura).toBe(false);

    const eiMNm2 = r.ecmGPa * 1000 * r.sinFisurar.iM4;
    const flechaElasticaMm = ((5 * (q / 1000) * L ** 4) / (384 * eiMNm2)) * 1000;
    expect(r.flechaTotalMm).toBeCloseTo(flechaElasticaMm, 9);
  });
});
