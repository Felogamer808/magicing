import { describe, expect, it } from "vitest";
import { recomendarZapataCombinada, type EntradaZapataCombinada } from "./zapata-combinada";

/** Z.5 de la obra: 3,10 × 0,80 × 0,30 contra la medianera, 65 y 76 kN, con tirante. */
const Z5: EntradaZapataCombinada = {
  fck: 25,
  fyk: 500,
  sigmaAdmisibleKPa: 150,
  geometria: { L: 3.1, B: 0.8, H: 0.3, recubrimiento: 0.04, distanciaBordeB: 0 },
  datos: {
    pilares: [
      { posicionM: 0.3, Nk: 65, anchoLargoM: 0.6, anchoAnchoM: 0.15 },
      { posicionM: 2.8, Nk: 76, anchoLargoM: 0.6, anchoAnchoM: 0.15 },
    ],
    inferior: { numero: 6, diametroMm: 10 },
    superior: { numero: 6, diametroMm: 10 },
    transversal: { diametroMm: 10, separacionM: 0.15 },
    formaAnclaje: "gancho",
    tirante: { brazoM: 3, phiGrados: 30 },
  },
};

describe("recomendaciones de la zapata combinada", () => {
  it("Z.5: la transversal se resuelve cerrando la separación a 0,14", () => {
    const r = recomendarZapataCombinada(Z5);
    expect(r["inicio.as"]?.[0].accion).toBe("Transversal Ø10 c/0,14 (hoy Ø10 c/0,15)");
    expect(r["inicio.as"]?.[0].utilizacion).toBeLessThanOrEqual(1);
  });

  it("Z.5: lo que cumple con margen no trae propuestas", () => {
    const r = recomendarZapataCombinada(Z5);
    expect(r.tension).toBeUndefined();
    expect(r.bielas2).toBeUndefined();
  });

  it("bielas que fallan: propone alargar, subir H o agrandar el pilar, en ese orden", () => {
    const chico: EntradaZapataCombinada = {
      ...Z5,
      datos: {
        ...Z5.datos,
        pilares: [Z5.datos.pilares[0], { ...Z5.datos.pilares[1], Nk: 400, anchoLargoM: 0.2, anchoAnchoM: 0.15 }],
      },
    };
    const r = recomendarZapataCombinada(chico).bielas2 ?? [];
    expect(r.length).toBeGreaterThan(0);
    for (const p of r) expect(p.utilizacion).toBeLessThanOrEqual(1);
  });
});

describe("recomendaciones del tirante", () => {
  it("anclaje justo en el piso de 100 mm: sólo la patilla lo mejora", async () => {
    const { recomendarArmaduraTirante } = await import("./armadura-tirante");
    const r = recomendarArmaduraTirante({
      fck: 25, fyk: 500, tdKN: 7.65,
      barras: { tipo: "numero", numero: 2, diametroMm: 10 },
      anchoApoyoM: 0.14, recubrimientoM: 0.03, forma: "recta", pataMm: 0, situacion: "buena",
    });
    expect(r.as).toBeUndefined();
    expect(r.anclaje?.at(-1)?.accion).toMatch(/^Terminar en patilla con pata de \d+ mm \(hoy recta\)$/);
    for (const p of r.anclaje ?? []) expect(p.utilizacion).toBeLessThan(0.9);
  });
});
