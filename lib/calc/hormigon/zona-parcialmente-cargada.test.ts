import { describe, expect, it } from "vitest";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";
import { calcularZonaCargada, type DatosZonaCargada } from "@/lib/calc/hormigon/zona-parcialmente-cargada";

/**
 * Sin planilla de referencia: los casos se arman para que cada límite de la
 * fig. A19.6.29 gobierne por separado, y los valores salen de geometría exacta.
 *
 * HA-30 / B500S: fcd = 30/1,5 = 20 MPa, fyd = 500/1,15 = 434,78 MPa.
 * Placa 0,20 × 0,30 m → Ac0 = 0,06 m², Ac0·fcd = 1200 kN.
 */
const materiales = derivarMateriales({ fck: 30, fyk: 500 });

function datos(cambios: Partial<DatosZonaCargada> = {}): DatosZonaCargada {
  return {
    nEdKN: 2000,
    direccionB: { cargadaM: 0.2, anchoPiezaM: 2, distanciaBordeM: 1 },
    direccionD: { cargadaM: 0.3, anchoPiezaM: 2, distanciaBordeM: 1 },
    alturaM: 2,
    ...cambios,
  };
}

describe("calcularZonaCargada — aplastamiento, ec. (6.63)", () => {
  it("bloque grande y carga centrada: gobierna el tope de 3·fcd·Ac0", () => {
    const r = calcularZonaCargada(materiales, datos());
    expect(r.ac0M2).toBeCloseTo(0.06, 10);
    expect(r.k).toBe(3);
    expect(r.limite).toBe("3 veces el área cargada");
    expect(r.ac1M2).toBeCloseTo(9 * 0.06, 10);
    expect(r.fRduKN).toBeCloseTo(3 * 1200, 6);
    expect(r.verificaAplastamiento).toBe(true);
  });

  it("Ac1 homotética: b2/b1 = d2/d1", () => {
    const r = calcularZonaCargada(materiales, datos());
    expect(r.b2M / 0.2).toBeCloseTo(r.d2M / 0.3, 10);
  });

  it("poca altura: gobierna h ≥ b2 − b1 en la dirección más chica", () => {
    // k = (0,2 + 0,1)/0,2 = 1,5 por b; por d sería (0,3 + 0,1)/0,3 = 1,333 → manda d.
    const r = calcularZonaCargada(materiales, datos({ alturaM: 0.1 }));
    expect(r.limite).toBe("altura en la dirección d");
    expect(r.k).toBeCloseTo(0.4 / 0.3, 10);
    expect(r.fRduKN).toBeCloseTo(1200 * (0.4 / 0.3), 6);
  });

  it("carga cerca de un borde: Ac1 centrada no puede pasarlo", () => {
    // Borde a 0,15 m del centro en b: b2 ≤ 0,30 → k = 1,5.
    const r = calcularZonaCargada(
      materiales,
      datos({ direccionB: { cargadaM: 0.2, anchoPiezaM: 2, distanciaBordeM: 0.15 } })
    );
    expect(r.limite).toBe("borde en la dirección b");
    expect(r.k).toBeCloseTo(1.5, 10);
    expect(r.fRduKN).toBeCloseTo(1800, 6);
    expect(r.verificaAplastamiento).toBe(false);
    expect(r.aprovechamiento).toBeCloseTo(2000 / 1800, 10);
  });

  it("carga al ras del borde: sin confinamiento, FRdu = Ac0·fcd", () => {
    const r = calcularZonaCargada(
      materiales,
      datos({ direccionB: { cargadaM: 0.2, anchoPiezaM: 2, distanciaBordeM: 0.1 } })
    );
    expect(r.k).toBeCloseTo(1, 10);
    expect(r.fRduKN).toBeCloseTo(1200, 6);
  });
});

describe("calcularZonaCargada — tracciones transversales, ec. (6.58)/(6.59)", () => {
  it("pieza angosta respecto de su altura: discontinuidad parcial, ec. (6.58)", () => {
    // b = 0,6 ≤ H/2 = 1 → T = ¼·(0,6 − 0,2)/0,6·2000 = 333,33 kN
    const r = calcularZonaCargada(
      materiales,
      datos({ direccionB: { cargadaM: 0.2, anchoPiezaM: 0.6, distanciaBordeM: 0.3 } })
    );
    expect(r.traccionB.tipo).toBe("parcial");
    expect(r.traccionB.ecuacion).toBe("(6.58)");
    expect(r.traccionB.tKN).toBeCloseTo(1000 / 3, 6);
    expect(r.traccionB.asNecCm2).toBeCloseTo((1000 / 3 / (500 / 1.15)) * 10, 6);
  });

  it("pieza ancha: discontinuidad total, ec. (6.59) con h = H/2", () => {
    // b = 2 > H/2 = 1 → h = 1, T = ¼·(1 − 0,7·0,3/1)·2000 = 395 kN en d
    const r = calcularZonaCargada(materiales, datos());
    expect(r.traccionD.tipo).toBe("total");
    expect(r.traccionD.ecuacion).toBe("(6.59)");
    expect(r.traccionD.tKN).toBeCloseTo(395, 6);
    expect(r.traccionD.fueraDeRango).toBe(false);
  });

  it("discontinuidad total con a > H/2 queda marcada fuera de rango", () => {
    const r = calcularZonaCargada(
      materiales,
      datos({ alturaM: 0.4, direccionD: { cargadaM: 0.3, anchoPiezaM: 2, distanciaBordeM: 1 } })
    );
    expect(r.traccionD.tipo).toBe("total");
    expect(r.traccionD.fueraDeRango).toBe(true);
  });

  it("T crece con el ancho de la pieza en discontinuidad parcial", () => {
    const angosta = calcularZonaCargada(
      materiales,
      datos({ direccionB: { cargadaM: 0.2, anchoPiezaM: 0.4, distanciaBordeM: 0.2 } })
    );
    const ancha = calcularZonaCargada(
      materiales,
      datos({ direccionB: { cargadaM: 0.2, anchoPiezaM: 0.8, distanciaBordeM: 0.2 } })
    );
    expect(ancha.traccionB.tKN).toBeGreaterThan(angosta.traccionB.tKN);
  });
});
