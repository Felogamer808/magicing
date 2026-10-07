import { describe, expect, it } from "vitest";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";
import { calcularFranjaLosa } from "@/lib/calc/hormigon/losas/losa-fundacion";

// Caso de mano: tres pilares iguales y simétricos. Con γF = 1,5 la reacción es
// uniforme, q = 1,5·600/9 = 100 kN/m, y cada pilar baja 300 kN de cálculo.
// M(x) = 50·x² − 300·(x − 1,5) entre los pilares 1 y 2: 112,5 kN·m bajo cada
// pilar y 0 en el medio del tramo, así que la cara superior no tracciona.
const materiales = derivarMateriales({ fck: 25, fyk: 500 });
const geometria = { longitudM: 9, anchoTributarioM: 3, H: 0.5, recubrimiento: 0.05, pilarLargoM: 0.3, pilarAnchoM: 0.3 };
const datos = {
  pilares: [
    { posicionM: 1.5, Nk: 200 },
    { posicionM: 4.5, Nk: 200 },
    { posicionM: 7.5, Nk: 200 },
  ],
  inferior: { diametroMm: 16, separacionM: 0.15 },
  superior: { diametroMm: 12, separacionM: 0.15 },
  transversalInferior: { diametroMm: 12, separacionM: 0.15 },
};

describe("franja de losa — tres pilares iguales, simétrica", () => {
  const r = calcularFranjaLosa(materiales, geometria, 200, datos);

  it("terreno: sin excentricidad, σ = (600 + peso propio)/(9·3)", () => {
    expect(r.geotecnico.excentricidadM).toBeCloseTo(0, 9);
    expect(r.geotecnico.pesoPropioKN).toBeCloseTo(25 * 9 * 3 * 0.5, 6);
    expect(r.geotecnico.sigmaKPa).toBeCloseTo((600 + 337.5) / 27, 6);
    expect(r.geotecnico.verificaTension).toBe(true);
  });

  it("momento de 112,5 kN·m bajo el pilar, 37,5 kN·m por metro, y la superior no se exige", () => {
    expect(r.inferior.mEdKNm).toBeCloseTo(112.5, 1);
    expect(r.inferior.mEdKNmPorM).toBeCloseTo(37.5, 2);
    expect(r.superior.necesaria).toBe(false);
  });

  it("flexión por metro con el Anejo 19: ω = 1 − √(1 − 2μ), fyd = fyk/γs", () => {
    const d = 0.5 - 0.05 - 0.008;
    const fcd = 25 / 1.5;
    const mu = 37.5 / (d ** 2 * fcd * 1000);
    const omega = 1 - Math.sqrt(1 - 2 * mu);
    expect(r.inferior.flexion.d).toBeCloseTo(d, 9);
    expect(r.inferior.flexion.asCalculadoCm2).toBeCloseTo((1e4 * omega * d * fcd) / (500 / 1.15), 2);
    expect(r.inferior.flexion.asRealCm2).toBeCloseTo((Math.PI * 1.6 ** 2) / 4 / 0.15, 6);
    expect(r.inferior.flexion.verificaAs).toBe(true);
  });

  it("separación máxima de losas: mín(300 mm; 3h)", () => {
    expect(r.inferior.separacionMaxM).toBeCloseTo(0.3, 9);
    expect(r.inferior.verificaSeparacion).toBe(true);
    const fina = calcularFranjaLosa(materiales, { ...geometria, H: 0.08 }, 200, datos);
    expect(fina.inferior.separacionMaxM).toBeCloseTo(0.24, 9);
    const abierta = calcularFranjaLosa(materiales, geometria, 200, { ...datos, inferior: { diametroMm: 16, separacionM: 0.35 } });
    expect(abierta.inferior.verificaSeparacion).toBe(false);
  });

  it("cortante a d de la cara: V = 100·x − 300 en x = 1,65 + d, contra VRd,c de la ec. (6.2)", () => {
    const d = 0.442;
    expect(r.cortante.vEdKN).toBeCloseTo(Math.abs(100 * (1.65 + d) - 300), 1);
    const k = 1 + Math.sqrt(200 / 442);
    const rho = (Math.PI * 1.6 ** 2) / 4 / 0.15 / (1e4 * d);
    const vRdc = Math.max((0.18 / 1.5) * k * (100 * rho * 25) ** (1 / 3), 0.035 * k ** 1.5 * 5);
    expect(r.cortante.vRdCKN).toBeCloseTo(vRdc * 3 * d * 1000, 1);
    expect(r.cortante.verifica).toBe(true);
  });

  it("punzonamiento: los tres pilares son interiores y se descuenta la reacción dentro del perímetro", () => {
    const sigmaCalculo = (1.5 * 600) / 27;
    for (const p of r.punzonamiento) {
      expect(p.situacion).toBe("interior");
      expect(p.beta).toBe(1);
      const a = p.aCriticaM;
      const area = 0.09 + 1.2 * a + Math.PI * a ** 2;
      expect(p.vEdRedKN).toBeCloseTo(300 - sigmaCalculo * area, 0);
    }
  });
});

describe("franja de losa — bordes", () => {
  it("a lo ancho la losa sigue: con un ancho tributario angosto el pilar sigue siendo interior", () => {
    const r = calcularFranjaLosa(materiales, { ...geometria, anchoTributarioM: 1 }, 200, datos);
    for (const p of r.punzonamiento) expect(p.situacion).toBe("interior");
  });

  it("a lo largo, un pilar contra el extremo de la franja es de borde", () => {
    const r = calcularFranjaLosa(materiales, geometria, 200, {
      ...datos,
      pilares: [{ posicionM: 0.15, Nk: 200 }, ...datos.pilares.slice(1)],
    });
    expect(r.punzonamiento[0].situacion).toBe("borde");
    expect(r.pilaresDentro).toBe(true);
  });

  it("un pilar que se sale de la franja se marca", () => {
    const r = calcularFranjaLosa(materiales, geometria, 200, {
      ...datos,
      pilares: [{ posicionM: 0.1, Nk: 200 }, ...datos.pilares.slice(1)],
    });
    expect(r.pilaresDentro).toBe(false);
  });

  it("agregar carga sin agregar área aumenta la presión de contacto", () => {
    const base = calcularFranjaLosa(materiales, geometria, 200, datos);
    const cargada = calcularFranjaLosa(materiales, geometria, 200, {
      ...datos,
      pilares: datos.pilares.map((p) => ({ ...p, Nk: 2 * p.Nk })),
    });
    expect(cargada.geotecnico.sigmaKPa).toBeGreaterThan(base.geotecnico.sigmaKPa);
  });
});
