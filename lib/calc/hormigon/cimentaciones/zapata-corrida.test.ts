import { describe, expect, it } from "vitest";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";
import { calcularZapataCorrida } from "@/lib/calc/hormigon/cimentaciones/zapata-corrida";
import { calcularZapataAislada } from "@/lib/calc/hormigon/cimentaciones/zapata-aislada";

// Desde el 2026-10-06 la corrida sigue el Anejo 19 con el modelo de la aislada:
// los valores de la planilla (EHE-08, brazo 0,85·d) ya no aplican.

const materiales = derivarMateriales({ fck: 25, fyk: 500 });
const fyd = 500 / 1.15;
const geometria = { A: 1, H: 0.4, anchoPilar: 0.3, recubrimiento: 0.05 };
const datos = {
  carga: { Nk: 100, MkA: 0 },
  armadoPrincipal: { diametroMm: 16, separacionM: 0.15 },
  armadoSecundario: { numero: 4, diametroMm: 10 },
};

describe("zapata corrida con el muro centrado, a mano", () => {
  const r = calcularZapataCorrida(materiales, geometria, 300, datos);

  it("terreno: peso propio y tensión por metro", () => {
    expect(r.geotecnico.pesoPropioKN).toBeCloseTo(10, 9);
    expect(r.geotecnico.sigmaKPa).toBeCloseTo(110, 9);
    expect(r.geotecnico.verificaTension).toBe(true);
    expect(r.muroCentrado).toBe(true);
  });

  it("flexión por el art. 9.8.2.2: sección a 0,15·b dentro de la cara y z = 0,9·d", () => {
    const l = 0.35 + 0.15 * 0.3;
    const d = 0.4 - 0.05 - 0.008;
    const m = (150 * l ** 2) / 2;
    expect(r.principal.lM).toBeCloseTo(l, 9);
    expect(r.principal.dM).toBeCloseTo(d, 9);
    expect(r.principal.momentoKNm).toBeCloseTo(m, 9);
    expect(r.principal.asCalculadoCm2).toBeCloseTo((m / (0.9 * d) / fyd) * 10, 9);
  });

  it("la armadura real sale de la separación", () => {
    expect(r.asRealPrincipalCm2PorM).toBeCloseTo((Math.PI * 1.6 ** 2) / 4 / 0.15, 9);
  });

  it("cortante a d de la cara del muro", () => {
    expect(r.principal.vEdKN).toBeCloseTo(150 * (0.35 - 0.342), 9);
  });

  it("reparto: 20 % de la principal en todo el ancho (art. 9.3.1.1 (2))", () => {
    expect(r.secundario.asNecCm2).toBeCloseTo(0.2 * r.asRealPrincipalCm2PorM * 1, 9);
    expect(r.secundario.asRealCm2).toBeCloseTo(4 * (Math.PI * 1 ** 2) / 4, 9);
  });

  it("es la rebanada de 1 m de una zapata aislada con el mismo armado", () => {
    const aislada = calcularZapataAislada(
      materiales,
      { A: 1, B: 1, H: 0.4, anchoPilarA: 0.3, anchoPilarB: 1, recubrimiento: 0.05 },
      300,
      { cargas: { Nk: 100, MkA: 0, MkB: 0 }, armadoA: { numero: 1 / 0.15, diametroMm: 16, separacionM: 0.15 }, armadoB: { numero: 4, diametroMm: 10 } }
    );
    expect(r.principal.momentoKNm).toBeCloseTo(aislada.direccionA.momentoKNm, 9);
    expect(r.principal.asNecCm2).toBeCloseTo(aislada.direccionA.asNecCm2, 9);
    expect(r.principal.anclaje.lbdMm).toBeCloseTo(aislada.direccionA.anclaje.lbdMm, 9);
  });
});

describe("zapata corrida con el muro contra la medianera", () => {
  const medianera = { ...geometria, distanciaBorde: 0 };
  const sin = calcularZapataCorrida(materiales, medianera, 300, datos);
  const con = calcularZapataCorrida(materiales, medianera, 300, { ...datos, tirante: { brazoM: 3, phiGrados: 30 } });

  it("sin tirante, la excentricidad Nk·e0/(Nk + PP) sale del núcleo y no verifica", () => {
    expect(sin.geotecnico.excentricidadM).toBeCloseTo((100 * -0.35) / 110, 9);
    expect(sin.geotecnico.dentroDelNucleo).toBe(false);
    expect(sin.geotecnico.verificaTension).toBe(false);
  });

  it("con tirante la resultante queda centrada y el vuelo largo se arma con presión uniforme", () => {
    expect(con.geotecnico.excentricidadM).toBe(0);
    expect(con.geotecnico.sigmaKPa).toBeCloseTo(110, 9);
    const l = 0.7 + 0.15 * 0.3;
    expect(con.principal.momentoKNm).toBeCloseTo((150 * l ** 2) / 2, 9);
  });

  it("el tirante toma Nk·e/h por metro", () => {
    expect(con.tirante?.tkKN).toBeCloseTo(35 / 3, 9);
    expect(con.tirante?.verificaDeslizamiento).toBe(true);
  });
});
