import { describe, expect, it } from "vitest";
import { derivarMateriales } from "./materiales";
import { calcularTorsion, calcularVigaConTorsion } from "./vigas-torsion";

// Caso real de la hoja "VIGAS CON TORSION" de CALCULOS TODO.xlsx, con Td=30 kN·m
// cargado en la celda L22 (en la planilla queda en 0, que no ejercita nada).
// Todos los valores esperados salen de recalcular esa hoja con Excel.

const materiales = derivarMateriales({ fck: 30, fyk: 500 });
const geometria = { b: 0.2, h: 0.7, recubrimiento: 0.035 };

describe("torsión: sección hueca equivalente", () => {
  const r = calcularTorsion(materiales, geometria, { td: 30 });

  it("reproduce la geometría equivalente (t, ue, Ae)", () => {
    expect(r.tM).toBeCloseTo(0.0777777777777778, 9);
    expect(r.ueM).toBeCloseTo(1.48888888888889, 9);
    expect(r.aeM2).toBeCloseTo(0.0760493827160494, 9);
  });

  it("reproduce la resistencia de las bielas comprimidas", () => {
    expect(r.f1cdMPa).toBeCloseTo(12, 9);
    expect(r.tu1KNm).toBeCloseTo(42.5876543209877, 6);
    expect(r.verificaBielas).toBe(true);
  });

  it("reproduce la armadura de torsión transversal y longitudinal", () => {
    expect(r.atCm2PorM).toBeCloseTo(4.93100649350649, 6);
    expect(r.alCm2).toBeCloseTo(7.34172077922078, 6);
    expect(r.alPorCaraCm2).toBeCloseTo(1.83543019480519, 6);
  });

  it("no verifica las bielas si el torsor supera Tu1", () => {
    const sobrecargada = calcularTorsion(materiales, geometria, { td: 50 });
    expect(sobrecargada.verificaBielas).toBe(false);
  });
});

describe("viga con torsión: interacción con flexión y cortante", () => {
  const r = calcularVigaConTorsion(materiales, geometria, {
    torsion: { td: 30 },
    momentoPositivo: 219,
    momentoNegativo: 235,
    armaduraPositiva: { numero: 2, diametroMm: 25 },
    armaduraNegativa: { numero: 2, diametroMm: 25 },
    cortante: { vd: 405, diametroEstriboMm: 8, numeroRamas: 6 },
  });

  it("reproduce el canto útil de la planilla", () => {
    expect(r.d).toBeCloseTo(0.6465, 9);
  });

  it("suma Al/4 al As necesario de la armadura positiva", () => {
    expect(r.flexionPositiva.mu).toBeCloseTo(0.130992691325592, 9);
    expect(r.flexionPositiva.omega).toBeCloseTo(0.140922228579498, 9);
    expect(r.flexionPositiva.asCalculadoCm2).toBeCloseTo(8.38177231145141, 6);
    // As,nec = As por momento + Al/4 = 8.38177 + 1.83543
    expect(r.flexionPositiva.asNecCm2).toBeCloseTo(10.2172025062566, 6);
    expect(r.flexionPositiva.asRealCm2).toBeCloseTo(9.81747704246811, 6);
    expect(r.flexionPositiva.verificaAs).toBe(false);
  });

  it("suma Al/4 al As necesario de la armadura negativa", () => {
    expect(r.flexionNegativa.asCalculadoCm2).toBeCloseTo(9.04871799043734, 6);
    expect(r.flexionNegativa.asNecCm2).toBeCloseTo(10.8841481852425, 6);
    expect(r.flexionNegativa.verificaAs).toBe(false);
  });

  it("reproduce el cortante y suma At a la armadura transversal", () => {
    expect(r.cortante.k).toBeCloseTo(1.55619967815515, 9);
    expect(r.cortante.rhoL).toBeCloseTo(0.00759278966934888, 9);
    expect(r.cortante.vRdC).toBeCloseTo(57.0389322992922, 6);
    expect(r.cortante.vRdCMin).toBeCloseTo(68.7427874437413, 6);
    expect(r.cortante.vEdEstribos).toBeCloseTo(336.257212556259, 6);
    expect(r.cortante.a90NecCm2PorM).toBeCloseTo(14.4477619900429, 6);
    expect(r.cortante.a90MinCm2PorM).toBeCloseTo(1.93097876921126, 6);
    // A90 = max(nec, min) + At = 14.44776 + 4.93101
    expect(r.cortante.a90Cm2PorM).toBeCloseTo(19.3787684835494, 6);
  });

  it("reproduce el estribado adoptado (6 ramas φ8 cada 15 cm)", () => {
    expect(r.cortante.aEstriboCm2).toBeCloseTo(3.0159289474462, 6);
    expect(r.cortante.separacionNecM).toBeCloseTo(0.15563057838306, 6);
    expect(r.cortante.separacionMaxM).toBeCloseTo(0.3879, 6);
    expect(r.cortante.separacionAdoptadaM).toBeCloseTo(0.15, 9);
    expect(r.cortante.areaRealCm2PorM).toBeCloseTo(20.1061929829747, 6);
  });

  it("sin torsión, los resultados coinciden con la viga simple", () => {
    const sinTorsion = calcularVigaConTorsion(materiales, geometria, {
      torsion: { td: 0 },
      momentoPositivo: 219,
      momentoNegativo: 235,
      armaduraPositiva: { numero: 2, diametroMm: 25 },
      armaduraNegativa: { numero: 2, diametroMm: 25 },
      cortante: { vd: 405, diametroEstriboMm: 8, numeroRamas: 6 },
    });
    expect(sinTorsion.torsion.atCm2PorM).toBeCloseTo(0, 9);
    expect(sinTorsion.torsion.alCm2).toBeCloseTo(0, 9);
    // Sin el aporte de torsión, el As necesario vuelve al de flexión pura.
    expect(sinTorsion.flexionPositiva.asNecCm2).toBeCloseTo(8.38177231145141, 6);
    expect(sinTorsion.cortante.a90Cm2PorM).toBeCloseTo(14.4477619900429, 6);
  });
});
