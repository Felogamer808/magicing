import { describe, expect, it } from "vitest";
import { calcularCabezalDosPilotes } from "@/lib/calc/hormigon/cimentaciones/cabezal-pilotes";
import { calcularCabezalNPilotes, type GeometriaCabezalN } from "@/lib/calc/hormigon/cimentaciones/cabezal-n-pilotes";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";

// No hay planilla de encepados de más de 2 pilotes: se contrasta contra el de
// 2 (el modelo es su generalización) y contra la cuenta a mano.

const materiales = derivarMateriales({ fck: 30, fyk: 500 });
const barras = { numero: 8, diametroMm: 16 };
const datos = {
  ndPilarKN: 2000,
  armaduraA: barras,
  armaduraB: barras,
  estriboVerticalMm: 8,
  separacionVerticalM: 0.2,
  estribosHorizontales: { numero: 4, diametroMm: 10 },
};
const geometria = (pilotes: GeometriaCabezalN["pilotes"], ladoAM: number, ladoBM: number): GeometriaCabezalN => ({
  ladoAM, ladoBM, hM: 0.8, pilarAM: 0.4, pilarBM: 0.4, diametroPiloteM: 0.5, recubrimientoM: 0.05, pilotes,
});

describe("cabezal de n pilotes: la generalización del de 2", () => {
  // La hoja "Cabezal 2 pilotes": 1,6 × 0,6 × 0,6, pilar 0,3, pilote 0,5, Nd 1040.
  const dos = calcularCabezalDosPilotes(
    materiales,
    { anchoPilarM: 0.3, ladoXM: 1.6, ladoYM: 0.6, hM: 0.6, diametroPiloteM: 0.5, recubrimientoM: 0.05 },
    {
      ndPilarKN: 1040,
      armaduraPrincipal: { numero: 7, diametroMm: 16 },
      armaduraSecundaria: { numero: 7, diametroMm: 10 },
      estribosVerticales: { numero: 10, diametroMm: 8, numeroCercos: 2 },
      estribosHorizontales: { numero: 5, diametroMm: 10 },
    }
  );
  const n = calcularCabezalNPilotes(
    materiales,
    {
      ladoAM: 1.6, ladoBM: 0.6, hM: 0.6, pilarAM: 0.3, pilarBM: 0.3, diametroPiloteM: 0.5, recubrimientoM: 0.05,
      pilotes: [{ aM: -0.625, bM: 0 }, { aM: 0.625, bM: 0 }],
    },
    {
      ndPilarKN: 1040,
      armaduraA: { numero: 7, diametroMm: 16 },
      armaduraB: { numero: 7, diametroMm: 10 },
      estriboVerticalMm: 8,
      separacionVerticalM: 0.2,
      estribosHorizontales: { numero: 5, diametroMm: 10 },
    }
  );

  it("con 2 pilotes da el mismo tirante, la misma biela y el mismo anclaje", () => {
    expect(n.reaccionPiloteKN).toBeCloseTo(dos.principal.ndPorPiloteKN, 9);
    expect(n.direccionA.dM).toBeCloseTo(dos.principal.dM, 9);
    expect(n.direccionA.tdKN).toBeCloseTo(dos.principal.tdKN, 9);
    expect(n.direccionA.asNecCm2).toBeCloseTo(dos.principal.asNecCm2, 9);
    expect(n.direccionA.disponibleAnclajeMm).toBeCloseTo(dos.principal.disponibleAnclajeMm, 9);
    expect(n.pilotes[0].anguloBielaGrados).toBeCloseTo(dos.bielas.anguloBielaGrados, 9);
    expect(n.pilotes[0].sigmaBielaMPa).toBeCloseTo(dos.bielas.sigmaBielaMPa, 9);
    // En la otra dirección no hay brazo: ningún tirante.
    expect(n.direccionB.tdKN).toBe(0);
  });

  it("con menos de 3 pilotes no es su caso", () => {
    expect(n.geometriaValida).toBe(false);
  });
});

describe("cabezal de 4 pilotes en cuadro", () => {
  const s = 1.25;
  const r = calcularCabezalNPilotes(
    materiales,
    geometria([{ aM: -s / 2, bM: -s / 2 }, { aM: s / 2, bM: -s / 2 }, { aM: -s / 2, bM: s / 2 }, { aM: s / 2, bM: s / 2 }], 1.9, 1.9),
    datos
  );

  /** PP = 1,9²·0,8·25 = 72,2 kN; R = (2000 + 1,35·72,2)/4 = 524,37 kN. */
  it("reparte la carga por igual", () => {
    expect(r.geometriaValida).toBe(true);
    expect(r.pesoPropioKN).toBeCloseTo(72.2, 9);
    expect(r.reaccionPiloteKN).toBeCloseTo(524.3675, 9);
  });

  /** Dos bandas de (N/4)·(s/2 − a/4)/(0,85·d): d_A = 0,8 − 0,05 − 0,008 − 0,008 = 0,734. */
  it("cada dirección lleva dos bandas como el tirante de 2 pilotes", () => {
    expect(r.direccionA.dM).toBeCloseTo(0.734, 9);
    expect(r.direccionB.dM).toBeCloseTo(0.718, 9);
    expect(r.direccionA.tdKN).toBeCloseTo((2 * 524.3675 * (0.625 - 0.1)) / (0.85 * 0.734), 6);
    expect(r.direccionB.tdKN).toBeCloseTo((2 * 524.3675 * (0.625 - 0.1)) / (0.85 * 0.718), 6);
  });

  /** Cada esquina ancla dos tirantes: k3 = 0,75, ec. (6.62). */
  it("el nudo de cada pilote es de esquina", () => {
    const fcd = materiales.fcd;
    for (const p of r.pilotes) {
      expect(p.tirantes).toBe(2);
      expect(p.sigmaNudoMaxMPa).toBeCloseTo(0.75 * (1 - 30 / 250) * fcd, 9);
    }
  });

  /** 0,95 − 0,625 + 0,25 − 0,05 = 0,525 m hasta el borde. */
  it("el anclaje arranca en la cara interior del pilote", () => {
    expect(r.direccionA.disponibleAnclajeMm).toBeCloseTo(525, 6);
  });
});

describe("cabezal de 6 pilotes en 2 × 3", () => {
  const s = 1.25;
  const pilotes = [-s, 0, s].flatMap((a) => [-s / 2, s / 2].map((b) => ({ aM: a, bM: b })));
  const r = calcularCabezalNPilotes(materiales, geometria(pilotes, 3.15, 1.9), datos);
  const R = r.reaccionPiloteKN;

  /** En A tiran sólo los dos del extremo; los del medio caen dentro de a/4. */
  it("a lo largo, la banda toma los dos pilotes del extremo", () => {
    expect(r.direccionA.tdKN).toBeCloseTo((2 * R * (s - 0.1)) / (0.85 * r.direccionA.dM), 6);
    expect(r.direccionA.brazoMaxM).toBeCloseTo(s, 9);
  });

  it("a lo ancho, tiran los tres de cada fila", () => {
    expect(r.direccionB.tdKN).toBeCloseTo((3 * R * (s / 2 - 0.1)) / (0.85 * r.direccionB.dM), 6);
  });

  /** Los del medio anclan sólo el tirante en B: k2 = 0,85. */
  it("los pilotes del medio anclan un solo tirante", () => {
    const medio = r.pilotes.filter((p) => p.aM === 0);
    expect(medio).toHaveLength(2);
    for (const p of medio) expect(p.tirantes).toBe(1);
    expect(r.pilotes.filter((p) => p.tirantes === 2)).toHaveLength(4);
  });
});

describe("cabezal de 5 pilotes con uno bajo el pilar", () => {
  const r = calcularCabezalNPilotes(
    materiales,
    geometria([{ aM: 0, bM: 0 }, { aM: -0.9, bM: -0.9 }, { aM: 0.9, bM: -0.9 }, { aM: -0.9, bM: 0.9 }, { aM: 0.9, bM: 0.9 }], 2.4, 2.4),
    datos
  );

  it("el pilote central recibe la biela vertical y no ancla tirantes", () => {
    const centro = r.pilotes[0];
    expect(centro.tirantes).toBe(0);
    expect(centro.anguloBielaGrados).toBeCloseTo(90, 9);
    expect(centro.sigmaBielaMPa).toBeCloseTo(centro.sigmaNudoMPa, 9);
  });

  it("un pilote fuera del cabezal invalida la geometría", () => {
    const fuera = calcularCabezalNPilotes(
      materiales,
      geometria([{ aM: 0, bM: 0 }, { aM: 1.1, bM: 0 }, { aM: -1.1, bM: 0 }], 2.4, 2.4),
      datos
    );
    expect(fuera.geometriaValida).toBe(false);
  });
});
