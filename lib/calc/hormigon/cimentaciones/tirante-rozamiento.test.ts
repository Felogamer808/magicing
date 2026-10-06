import { describe, expect, it } from "vitest";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";
import { calcularAnclaje } from "@/lib/calc/hormigon/comun/anclaje";
import { calcularTiranteRozamiento, verificarArmaduraTirante } from "./tirante-rozamiento";
import { calcularZapataAislada } from "./zapata-aislada";

const materiales = derivarMateriales({ fck: 25, fyk: 500 });

/**
 * Pilar de 0,40 contra el límite en una zapata de 1,50: excentricidad −0,50 m.
 * Tirante a 3,50 m de la base, zapata de 0,50, φ = 30°. Todo a mano.
 */
describe("par tirante–terreno", () => {
  const r = calcularTiranteRozamiento(materiales, {
    nkKN: 300, pesoZapataKN: 22.5, momentoCentroKNm: 300 * -0.5, mkPilarKNm: 0,
    brazoM: 3.5, cantoZapataM: 0.5, phiGrados: 30,
  });

  it("el tirante anula el momento respecto del centro de la base: Tk = N·e/h, hacia adentro", () => {
    expect(r.tkKN).toBeCloseTo(150 / 3.5, 9);
  });

  it("arma el tirante en ELU con γF = 1,5 y fyd", () => {
    expect(r.tdKN).toBeCloseTo(1.5 * 150 / 3.5, 9);
    expect(r.asTiranteCm2).toBeCloseTo((1.5 * 150 / 3.5) * 1000 / (500 / 1.15) / 100, 9);
  });

  it("deslizamiento del DB SE-C: δ = 3/4·φ, sin mayorar, γR = 1,5", () => {
    expect(r.deltaGrados).toBeCloseTo(22.5, 9);
    expect(r.rozamientoResistenteKN).toBeCloseTo(322.5 * Math.tan((22.5 * Math.PI) / 180) / 1.5, 9);
    expect(r.verificaDeslizamiento).toBe(true);
  });

  it("al pilar le queda el momento del tirante con brazo h − H, y el cortante Tk", () => {
    expect(r.mPilarArranqueKNm).toBeCloseTo((150 / 3.5) * 3, 9);
    expect(r.vPilarKN).toBeCloseTo(150 / 3.5, 9);
  });

  it("con poco rozamiento no verifica", () => {
    const flojo = calcularTiranteRozamiento(materiales, {
      nkKN: 300, pesoZapataKN: 22.5, momentoCentroKNm: -150, mkPilarKNm: 0,
      brazoM: 1, cantoZapataM: 0.5, phiGrados: 20,
    });
    expect(flojo.verificaDeslizamiento).toBe(false);
  });

  it("sin palanca (brazo ≤ canto) la geometría no vale", () => {
    const sin = calcularTiranteRozamiento(materiales, {
      nkKN: 300, pesoZapataKN: 22.5, momentoCentroKNm: -150, mkPilarKNm: 0,
      brazoM: 0.5, cantoZapataM: 0.5, phiGrados: 30,
    });
    expect(sin.geometriaValida).toBe(false);
    expect(sin.verificaDeslizamiento).toBe(false);
  });
});

describe("zapata aislada de medianería con tirante", () => {
  const geometria = {
    A: 1.5, B: 1.2, H: 0.5, anchoPilarA: 0.4, anchoPilarB: 0.4, recubrimiento: 0.05, distanciaBordeA: 0,
  };
  const datos = {
    cargas: { Nk: 300, MkA: 0, MkB: 0 },
    armadoA: { numero: 8, diametroMm: 16 },
    armadoB: { numero: 6, diametroMm: 12 },
  };
  const sin = calcularZapataAislada(materiales, geometria, 1000, datos);
  const con = calcularZapataAislada(materiales, geometria, 1000, { ...datos, tirante: { brazoM: 3.5, phiGrados: 30 } });

  it("sin tirante, la resultante sale del núcleo; con tirante queda centrada", () => {
    expect(sin.dentroDelNucleo).toBe(false);
    expect(con.excentricidadA).toBe(0);
    expect(con.dentroDelNucleo).toBe(true);
    expect(con.geotecnico.sigmaKPa).toBeCloseTo(322.5 / (1.5 * 1.2), 9);
  });

  it("los vuelos en A se calculan con presión uniforme", () => {
    expect(con.vuelosA.distribucion.hayDespegue).toBe(false);
    expect(con.vuelosA.distribucion.sigmaMaxKPa).toBeCloseTo(con.vuelosA.distribucion.sigmaMinKPa, 9);
  });

  it("devuelve el tirante sólo cuando se pide", () => {
    expect(sin.tirante).toBeUndefined();
    expect(con.tirante?.tkKN).toBeCloseTo(300 * 0.55 / 3.5, 9);
  });

  it("la dirección B no cambia", () => {
    expect(con.vuelosB.fin.momentoKNm).toBeCloseTo(sin.vuelosB.fin.momentoKNm, 9);
  });
});

describe("armadura del tirante", () => {
  const td = (1.5 * 150) / 3.5;
  const as4phi12 = 4 * (Math.PI * 1.2 ** 2) / 4;
  const base = {
    tdKN: td, diametroMm: 12, asRealCm2: as4phi12, anchoApoyoM: 0.4, recubrimientoM: 0.03,
    forma: "recta" as const, pataMm: 150, situacion: "buena" as const,
  };
  const r = verificarArmaduraTirante(materiales, base);

  it("As necesaria = Td/fyd y se compara con la real", () => {
    expect(r.asNecCm2).toBeCloseTo((td * 1000) / (500 / 1.15) / 100, 9);
    expect(r.verificaAs).toBe(true);
  });

  it("ancla Td/As real (no fyd) con el anclaje del art. 8.4", () => {
    const sigma = (td * 10) / as4phi12;
    expect(r.sigmaSdMPa).toBeCloseTo(sigma, 9);
    const esperado = calcularAnclaje(
      { fckMPa: 25, fykMPa: 500 },
      { diametroMm: 12, situacion: "buena", forma: "recta", esfuerzo: "traccion", recubrimientoMm: 30, sigmaSdMPa: sigma }
    ).lbdMm;
    expect(r.lbdMm).toBeCloseTo(esperado, 9);
  });

  it("disponible desde la cara interior: ancho − rec; con patilla suma la pata cargada", () => {
    expect(r.disponibleMm).toBeCloseTo(370, 9);
    const g = verificarArmaduraTirante(materiales, { ...base, forma: "gancho" });
    expect(g.disponibleMm).toBeCloseTo(520, 9);
  });

  it("con la separación, cd es el menor entre el recubrimiento y la mitad de la luz libre", () => {
    const conSep = verificarArmaduraTirante(materiales, { ...base, separacionM: 0.05 });
    const esperado = calcularAnclaje(
      { fckMPa: 25, fykMPa: 500 },
      { diametroMm: 12, situacion: "buena", forma: "recta", esfuerzo: "traccion", recubrimientoMm: 19, sigmaSdMPa: conSep.sigmaSdMPa }
    ).lbdMm;
    expect(conSep.lbdMm).toBeCloseTo(esperado, 9);
  });
});
