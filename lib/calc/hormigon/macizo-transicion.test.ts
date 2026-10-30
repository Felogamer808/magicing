import { describe, expect, it } from "vitest";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";
import { calcularMacizoTransicion, type DatosMacizo, type GeometriaMacizo } from "./macizo-transicion";

const hormigon = derivarMateriales({ fck: 30, fyk: 500 });
const fyd = 500 / 1.15;

/**
 * El caso que trajo el usuario (2026-10-29): pilar superior de 200 × 500 sobre
 * uno inferior de 600 × 250, con un macizo de 600 × 500 × 800. En el plano de
 * 500 el pilar superior queda centrado en el macizo y el inferior ocupa la
 * mitad: e = 125 mm, y la carga cae justo sobre la cara del pilar inferior.
 */
const geometria: GeometriaMacizo = {
  hM: 0.8,
  anchoM: 0.5,
  profundidadM: 0.6,
  recubrimientoM: 0.03,
  pilarSuperior: { enPlanoM: 0.5, transversalM: 0.2 },
  pilarInferior: { enPlanoM: 0.25, transversalM: 0.6 },
  excentricidadM: 0.125,
  bordeTraccionadoM: 0,
};
const datos: DatosMacizo = {
  nEdKN: 1000,
  mEdKNm: 0,
  u: { numero: 4, diametroMm: 16 },
  // Sin esperas comprimidas: el nudo C sólo con hormigón, el modelo de base.
  esperasComprimidas: { numero: 0, diametroMm: 16 },
  mandrilUMm: 64,
  patillaInferior: false,
  cercos: { diametroMm: 8, ramasX: 2, ramasY: 2, separacionM: 0.15 },
  inferior: { numero: 4, diametroMm: 12 },
};

describe("macizo de transición: pilar descentrado sobre pilar", () => {
  it("con la carga sobre la cara del pilar hacen falta esperas: nudo C a k1·ν'·fcd", () => {
    const r = calcularMacizoTransicion(hormigon, geometria, datos);
    // ν' = 0,88; σ = 17,6 MPa; b = 0,60 → 10 560 kN por m de ancho.
    // Esperas a 0,030 + 0,008 + 0,008 = 0,046 de la cara: yT = −0,079; D = 0,204.
    // 10 560·a·(0,204 − a/2) = 1000·0,204 → a = 0,204 − √(0,204² − 408/10 560).
    const a = 0.204 - Math.sqrt(0.204 ** 2 - 408 / 10560);
    expect(r.sinTraccion).toBe(false);
    expect(r.yEsperasM).toBeCloseTo(-0.079, 9);
    expect(r.anchoNudoCM).toBeCloseTo(a, 9);
    expect(r.compresionCKN).toBeCloseTo(10560 * a, 6);
    expect(r.traccionEsperasKN).toBeCloseTo(10560 * a - 1000, 6);
    expect(r.traccionEsperasKN).toBeCloseTo(577.8, 1);
    expect(r.nudoC.aprovechamiento).toBeCloseTo(204 / ((10560 * 0.204 ** 2) / 2), 9);
  });

  it("el tirante cierra el equilibrio por los dos lados", () => {
    const r = calcularMacizoTransicion(hormigon, geometria, datos);
    // z = 0,80 − (0,038 + 0,008) = 0,754
    expect(r.zM).toBeCloseTo(0.754, 9);
    const porCarga = (1000 * (r.yCargaM - r.yNudoCM)) / r.zM;
    const porEsperas = (r.traccionEsperasKN * (r.yNudoCM - r.yEsperasM)) / r.zM;
    expect(r.traccionTiranteKN).toBeCloseTo(porCarga, 9);
    expect(r.traccionTiranteKN).toBeCloseTo(porEsperas, 6);
    // Las bielas: componente vertical igual a lo que baja o sube en cada nudo.
    expect(r.compresionBielaBCKN * Math.sin((r.anguloBielaBCGrados * Math.PI) / 180)).toBeCloseTo(1000, 6);
    expect(r.compresionBielaACKN * Math.sin((r.anguloBielaACGrados * Math.PI) / 180)).toBeCloseTo(
      r.traccionEsperasKN,
      6
    );
  });

  it("la U lleva la mayor de Ts y T, y los nudos usan k1, k2 y k3", () => {
    const r = calcularMacizoTransicion(hormigon, geometria, datos);
    expect(r.asNecUCm2).toBeCloseTo((Math.max(r.traccionEsperasKN, r.traccionTiranteKN) * 10) / fyd, 9);
    expect(r.asNecUCm2).toBeCloseTo((r.traccionEsperasKN * 10) / fyd, 9); // manda la rama de las esperas
    expect(r.verificaU).toBe(false); // 4Ø16 = 8,04 cm² contra 13,3
    expect(r.nudoA!.sigmaMaxMPa).toBeCloseTo(0.75 * 0.88 * 20, 9);
    expect(r.nudoBApoyo.sigmaMaxMPa).toBeCloseTo(0.85 * 0.88 * 20, 9);
    // Nudo B: 1000 kN sobre 0,50 × 0,20 → 10 MPa.
    expect(r.nudoBApoyo.sigmaMPa).toBeCloseTo(10, 9);
  });

  it("doblado en A con carga: mandril de la ec. (8.1)", () => {
    const r = calcularMacizoTransicion(hormigon, geometria, datos);
    // Fbt: Ts/4 = 144 kN, pero la barra no pasa de fyd·A = 434,8·2,011/10 = 87,4 kN.
    const fbt = (fyd * Math.PI * 1.6 ** 2) / 4 / 10;
    // ab: separación (600 − 2·38 − 16)/3 = 169,3 → 84,7; contra el paramento 38 + 8 = 46 → 46.
    const mandril = (fbt * 1000 * (1 / 46 + 1 / 32)) / 20;
    expect(r.dobladoA!.fuerzaBarraKN).toBeCloseTo(fbt, 9);
    expect(r.dobladoA!.abMm).toBeCloseTo(46, 9);
    expect(r.dobladoA!.mandrilNecMm).toBeCloseTo(mandril, 6);
    expect(r.dobladoA!.mandrilNecMm).toBeGreaterThan(r.mandrilMinimoTablaMm); // 232 contra 64
    expect(r.dobladoA!.verifica).toBe(false);
    expect(calcularMacizoTransicion(hormigon, geometria, { ...datos, mandrilUMm: 240 }).dobladoA!.verifica).toBe(true);
  });

  it("T se ancla en la rama del lado de la carga; la patilla inferior suma el vuelo", () => {
    const sin = calcularMacizoTransicion(hormigon, geometria, datos);
    const con = calcularMacizoTransicion(hormigon, geometria, { ...datos, patillaInferior: true });
    expect(sin.anclajeTirante!.sigmaSdMPa).toBeCloseTo((sin.traccionTiranteKN * 10) / (4 * 2.0106193), 3);
    // Con patilla: el vuelo del macizo sobre el pilar, 0,375 − 0,125 = 0,25 m, menos cobertura y radio.
    expect(con.anclajeTirante!.disponibleMm).toBeGreaterThan(sin.anclajeTirante!.disponibleMm);
  });

  it("con la resultante bien adentro del pilar no hay esperas traccionadas ni tirante", () => {
    const r = calcularMacizoTransicion(hormigon, { ...geometria, excentricidadM: 0.02 }, datos);
    // Ancho centrado en la carga hasta la cara: 2·(0,125 − 0,02) = 0,21 → 1000/(0,21·0,6) = 7,94 MPa < 17,6.
    expect(r.sinTraccion).toBe(true);
    expect(r.traccionEsperasKN).toBe(0);
    expect(r.traccionTiranteKN).toBe(0);
    expect(r.nudoA).toBeNull();
    expect(r.dobladoA).toBeNull();
    expect(r.anclajeTirante).toBeNull();
    expect(r.nudoC.sigmaMPa).toBeCloseTo(1000 / (0.21 * 0.6) / 1000, 9);
    // Sin tirante, el nudo B es sólo de compresión: k1.
    expect(r.nudoBApoyo.sigmaMaxMPa).toBeCloseTo(0.88 * 20, 9);
  });

  it("es continuo en el paso de sin tracción a con tracción", () => {
    // Justo en el límite: 1000/(2·(0,125 − e)·0,6) = 17,6 → e = 0,125 − 1000/(2·0,6·17 600).
    const eLimite = 0.125 - 1000 / (2 * 0.6 * 17600);
    const antes = calcularMacizoTransicion(hormigon, { ...geometria, excentricidadM: eLimite - 1e-7 }, datos);
    const despues = calcularMacizoTransicion(hormigon, { ...geometria, excentricidadM: eLimite + 1e-7 }, datos);
    expect(antes.sinTraccion).toBe(true);
    expect(despues.sinTraccion).toBe(false);
    expect(despues.traccionEsperasKN).toBeLessThan(0.01);
    expect(despues.anchoNudoCM).toBeCloseTo(antes.anchoNudoCM, 4);
  });

  it("el Md del pilar superior corre la carga: e total = e + Md/Nd, y M del pilar inferior = Nd·e total", () => {
    const r = calcularMacizoTransicion(hormigon, geometria, { ...datos, mEdKNm: 30 });
    expect(r.excentricidadTotalM).toBeCloseTo(0.155, 9);
    expect(r.mPilarInferiorKNm).toBeCloseTo(155, 9);
    expect(r.traccionEsperasKN).toBeGreaterThan(calcularMacizoTransicion(hormigon, geometria, datos).traccionEsperasKN);
    // El nudo B se achica a 0,50 − 2·0,03 = 0,44.
    expect(r.nudoBApoyo.sigmaMPa).toBeCloseTo(1000 / (0.44 * 0.2) / 1000, 9);
  });

  it("si el pilar no puede dar el brazo, el nudo C no verifica", () => {
    const r = calcularMacizoTransicion(hormigon, { ...geometria, excentricidadM: 0.3, anchoM: 0.8 }, { ...datos, nEdKN: 3000 });
    expect(r.nudoC.verifica).toBe(false);
    expect(r.nudoC.aprovechamiento).toBeGreaterThan(1);
  });

  it("cercos horizontales: los de toda la altura, ramas en Y contra la tracción transversal", () => {
    const r = calcularMacizoTransicion(hormigon, geometria, datos);
    // Altura útil 0,80 − 0,046 − 0,038 = 0,716 → cada 0,15: 5 cercos.
    expect(r.numeroCercos).toBe(5);
    expect(r.asCercosYCm2).toBeCloseTo(5 * 2 * ((Math.PI * 0.8 ** 2) / 4), 9);
    expect(r.asNecCercosYCm2).toBeCloseTo(r.zonaCargada.traccionD.asNecCm2, 9);
    // En X el pilar superior ocupa todo el ancho del macizo: la carga no se abre.
    expect(r.asNecCercosXCm2).toBe(0);
    expect(r.verificaCercos).toBe(true);
    expect(r.separacionMaxCercosM).toBe(0.3);
  });

  it("cara inferior: mínimo de la malla de gran canto, 0,001·Ac por m y nunca menos de 1,5 cm²/m", () => {
    const r = calcularMacizoTransicion(hormigon, geometria, datos);
    // 0,001·0,60·1 m = 6 cm²/m; 4Ø12 en 0,60 m = 7,54 cm²/m.
    expect(r.asMinInferiorCm2PorM).toBeCloseTo(6, 9);
    expect(r.asInferiorCm2PorM).toBeCloseTo((4 * Math.PI * 1.2 ** 2) / 4 / 0.6, 9);
    expect(r.verificaInferior).toBe(true);
  });

  it("la carga concentrada usa el art. 6.7 con el pilar superior sobre el macizo", () => {
    const r = calcularMacizoTransicion(hormigon, geometria, datos);
    expect(r.zonaCargada.ac0M2).toBeCloseTo(0.5 * 0.2, 12);
    expect(r.zonaCargada.verificaAplastamiento).toBe(true);
  });
});

describe("macizo de transición con esperas comprimidas (caso O132, macizo 1, vista 13)", () => {
  // fck 30, Nd 1244 kN; macizo 0,8 × 0,5 × 0,6, rec 0,02; U 4Ø20 con mandril 250;
  // esperas comprimidas 4Ø20; cercos Ø10 c/0,15. Control a mano del usuario:
  // c ≈ 105 mm, Cc ≈ 1110 kN, Ts ≈ 370 kN, T ≈ 80 kN, nudo A ≈ 7 MPa, U ≈ 8,5 cm²,
  // mandril en A ≈ 240 mm.
  const caso = (mandril: number | null) =>
    calcularMacizoTransicion(
      hormigon,
      { ...geometria, recubrimientoM: 0.02 },
      {
        nEdKN: 1244,
        mEdKNm: 0,
        u: { numero: 4, diametroMm: 20 },
        esperasComprimidas: { numero: 4, diametroMm: 20 },
        mandrilUMm: mandril,
        patillaInferior: false,
        cercos: { diametroMm: 10, ramasX: 2, ramasY: 2, separacionM: 0.15 },
        inferior: { numero: 4, diametroMm: 12 },
      }
    );

  it("el nudo C suma la fuerza de las esperas comprimidas, As'·Es·εc2, y Ts baja", () => {
    const r = caso(250);
    // σs' = 200 000 · 0,002 = 400 MPa; Fs' = 4·π·2²/4 · 400 / 10 = 502,7 kN.
    expect(r.sigmaEsperasComprimidasMPa).toBe(400);
    expect(r.compresionEsperasKN).toBeCloseTo(502.65, 1);
    // d'' = 0,02 + 0,010 + 0,010 = 0,040; yT = −0,085; D = 0,21; ys' = 0,085.
    // 10 560·c·(0,21 − c/2) = 1244·0,21 − 502,65·0,17
    const momentoNeto = 1244 * 0.21 - 502.65 * 0.17;
    const c = 0.21 - Math.sqrt(0.21 ** 2 - (2 * momentoNeto) / 10560);
    expect(r.anchoNudoCM).toBeCloseTo(c, 4);
    expect(r.anchoNudoCM * 1000).toBeCloseTo(106, 0);
    expect(r.compresionHormigonCKN).toBeCloseTo(10560 * c, 0);
    expect(r.traccionEsperasKN).toBeCloseTo(10560 * c + 502.65 - 1244, 0);
    expect(r.zM).toBeCloseTo(0.76, 9);
    expect(r.traccionTiranteKN).toBeCloseTo(80.2, 0);
    expect(r.nudoA!.sigmaMPa).toBeCloseTo(6.8, 1);
    expect(r.asNecUCm2).toBeCloseTo((r.traccionEsperasKN * 10) / fyd, 9);
    expect(r.verificaU).toBe(true);
  });

  it("todo cumple, y el anclaje a compresión de las esperas comprimidas es recto en la altura del macizo", () => {
    const r = caso(250);
    expect(r.nudoC.verifica && r.nudoA!.verifica && r.nudoBApoyo.verifica && r.nudoBBiela.verifica).toBe(true);
    expect(r.dobladoA!.verifica && r.dobladoB!.verifica && r.anclajeTirante!.verifica).toBe(true);
    expect(r.verificaCercos && r.verificaInferior && r.zonaCargada.verificaAplastamiento).toBe(true);
    expect(r.anclajeEsperasComprimidas!.disponibleMm).toBeCloseTo(800 - 30, 9);
    expect(r.anclajeEsperasComprimidas!.verifica).toBe(true);
  });

  it("doblado en A: Fbt = Ts/n sin tope, y manda la barra de borde con ab = rec + Ø/2", () => {
    const d = caso(250).dobladoA!;
    expect(d.limitadaPorFyd).toBe(false);
    expect(d.fuerzaBarraKN).toBeCloseTo(d.fuerzaTotalKN / 4, 9);
    // Borde: 30 + 10 = 40. Interior: (600 − 60 − 20)/3 / 2 = 86,7. Manda el borde.
    expect(d.abBordeMm).toBeCloseTo(40, 9);
    expect(d.abInteriorMm).toBeCloseTo(520 / 3 / 2, 9);
    expect(d.barraQueManda).toBe("borde");
    expect(d.mandrilNecMm).toBeCloseTo((d.fuerzaBarraKN * 1000 * (1 / 40 + 1 / 40)) / 20, 9);
    expect(d.mandrilNecMm).toBeCloseTo(237, 0);
    expect(d.verifica).toBe(true);
  });

  it("con el mandril en blanco se informa el requerido y no se marca si cumple", () => {
    const r = caso(null);
    expect(r.dobladoA!.verifica).toBeNull();
    expect(r.dobladoA!.mandrilNecMm).toBeCloseTo(237, 0);
    expect(r.dobladoB!.verifica).toBeNull();
  });

  it("si la U no alcanza para Ts, Fbt es el tope fyd·A de una barra (el caso de 5Ø20 con Ts = 995)", () => {
    const d = calcularMacizoTransicion(hormigon, geometria, { ...datos, nEdKN: 1244, u: { numero: 5, diametroMm: 20 } }).dobladoA!;
    expect(d.fuerzaRepartidaKN).toBeGreaterThan(d.topeBarraKN);
    expect(d.limitadaPorFyd).toBe(true);
    expect(d.topeBarraKN).toBeCloseTo((fyd * Math.PI * 2 ** 2) / 4 / 10, 9); // 136,6 kN
    expect(d.fuerzaBarraKN).toBeCloseTo(136.6, 1);
  });
});
