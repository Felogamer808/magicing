import { describe, expect, it } from "vitest";
import { derivarMateriales, materialesAccidentales } from "@/lib/calc/hormigon/comun/materiales";
import { tensionCortanteBase } from "@/lib/calc/hormigon/comun/cortante";
import { calcularFlexion } from "@/lib/calc/hormigon/vigas/flexion-cortante";
import { calcularZapataAislada } from "@/lib/calc/hormigon/cimentaciones/zapata-aislada";
import { calcularZapataCorrida } from "@/lib/calc/hormigon/cimentaciones/zapata-corrida";
import { calcularZapataCombinada } from "@/lib/calc/hormigon/cimentaciones/zapata-combinada";

/*
 * El hormigón de las zapatas en la situación extraordinaria: combinación
 * accidental sin mayorar (γ = 1,0) y γc = 1,3, γs = 1,0 (Anejo 19, tabla
 * A19.2.1, pág. 20). Con las mismas cargas que la persistente, los esfuerzos
 * de cálculo bajan exactamente en 1,5, porque las presiones son lineales en γ.
 */
const materiales = derivarMateriales({ fck: 25, fyk: 500 });

describe("materiales en situación accidental", () => {
  const acc = materialesAccidentales(materiales);

  it("γc = 1,3 y γs = 1,0; los estribos siguen topados en 0,8·fyk", () => {
    expect(acc.fcd).toBeCloseTo(25 / 1.3, 9);
    expect(acc.fyd).toBeCloseTo(500, 9);
    expect(acc.fydEstribos).toBeCloseTo(400, 9);
    expect(acc.gammaC).toBe(1.3);
  });

  it("C_Rd,c = 0,18/γc sube en 1,5/1,3", () => {
    expect(tensionCortanteBase(1.6, 0.005, 25, 1.3)).toBeCloseTo((tensionCortanteBase(1.6, 0.005, 25) * 1.5) / 1.3, 9);
  });
});

describe("zapata aislada con las mismas cargas en las dos situaciones", () => {
  const cargas = { Nk: 800, MkA: 60, MkB: 20 };
  const r = calcularZapataAislada(
    materiales,
    { A: 2, B: 1.5, H: 0.5, anchoPilarA: 0.4, anchoPilarB: 0.3, recubrimiento: 0.05 },
    300,
    { cargas, armadoA: { numero: 8, diametroMm: 16 }, armadoB: { numero: 8, diametroMm: 16 }, extraordinaria: cargas }
  );
  const h = r.extraordinaria!.hormigon;

  it("el momento del vuelo y el punzonamiento bajan en 1,5", () => {
    expect(h.direccionA.momentoKNm).toBeCloseTo(r.direccionA.momentoKNm / 1.5, 9);
    expect(h.direccionB.momentoKNm).toBeCloseTo(r.direccionB.momentoKNm / 1.5, 9);
    expect(h.punzonamiento.vEdKN).toBeCloseTo(r.punzonamiento.vEdKN / 1.5, 6);
  });

  it("piden menos acero y el hormigón resiste igual o más", () => {
    expect(h.direccionA.asNecCm2).toBeLessThan(r.direccionA.asNecCm2);
    const razon = h.punzonamiento.vRdCKN / r.punzonamiento.vRdCKN;
    expect(razon).toBeGreaterThanOrEqual(1 - 1e-9);
    expect(razon).toBeLessThanOrEqual(1.5 / 1.3 + 1e-9);
  });
});

describe("zapata corrida con las mismas cargas en las dos situaciones", () => {
  const carga = { Nk: 150, MkA: 10 };
  const r = calcularZapataCorrida(materiales, { A: 1.6, H: 0.4, anchoPilar: 0.3, recubrimiento: 0.05 }, 200, {
    carga,
    armadoPrincipal: { diametroMm: 12, separacionM: 0.2 },
    armadoSecundario: { numero: 8, diametroMm: 10 },
    extraordinaria: carga,
  });

  it("el momento del vuelo baja en 1,5", () => {
    expect(r.extraordinaria!.hormigon.principal.momentoKNm).toBeCloseTo(r.principal.momentoKNm / 1.5, 9);
  });
});

describe("zapata combinada simétrica en la extraordinaria, a mano", () => {
  const pilar = { Nk: 200, anchoLargoM: 0.4, anchoAnchoM: 0.4 };
  const r = calcularZapataCombinada(materiales, { L: 6, B: 1, H: 0.6, recubrimiento: 0.05 }, 300, {
    pilares: [{ ...pilar, posicionM: 1 }, { ...pilar, posicionM: 5 }],
    inferior: { numero: 6, diametroMm: 16 },
    superior: { numero: 6, diametroMm: 12 },
    transversal: { diametroMm: 12, separacionM: 0.2 },
    extraordinaria: [{ Nk: 200 }, { Nk: 200 }],
  });
  const h = r.extraordinaria!.hormigon;

  // Persistente: w = 1,5·400/6 = 100 kN/m → M+ = 50, M− = 150. Accidental: w = 66,7.
  it("los momentos son los de la persistente divididos por 1,5", () => {
    expect(h.inferior.mEdKNm).toBeCloseTo(50 / 1.5, 1);
    expect(h.superior.mEdKNm).toBeCloseTo(150 / 1.5, 1);
  });

  it("cada cara se arma con fyd = fyk/1,0 y fcd = fck/1,3", () => {
    const esperado = calcularFlexion(
      materialesAccidentales(materiales),
      { b: 1, h: 0.6, recubrimiento: 0.05, diametroEstriboMm: 0 },
      h.superior.flexion.d,
      { momento: h.superior.mEdKNm, armaduraReal: [{ numero: 6, diametroMm: 12 }] }
    );
    expect(h.superior.flexion.asNecCm2).toBeCloseTo(esperado.asNecCm2, 9);
  });
});
