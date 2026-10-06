import { describe, expect, it } from "vitest";
import { ESPESOR_DECKPANEL_ESTANDAR_MM } from "@/lib/calc/hormigon/losas/deckpanel-armco";
import { ETIQUETA_ESPESOR, resolverSteelDeck } from "@/lib/calc/hormigon/losas/resolver-steel-deck";
import { recomendarSteelDeck } from "./losa-steel-deck";

const BASE = {
  espesorTotal: "0.15", espesorDeckpanel: ETIQUETA_ESPESOR(ESPESOR_DECKPANEL_ESTANDAR_MM), fykBarras: "500",
  phiBarra: "10", numeroBarrasPorNervio: "1", recBarra: "0.025", fck: "25", mEd: "20", resistenciaFuego: "R60",
  etaFi: "0.7", luz: "4", anchoTrib: "1", m: "165", k: "0", gammaVs: "1.25", lsSobreL: "0.25",
  gPp: "4.5", gAdd: "0", q: "7.55", gammaG: "1.35", gammaQ: "1.5", anclajePresente: "No",
  diametroPerno: "25.4", numeroPernos: "1", sepPernos: "0.3",
};

describe("recomendaciones de la losa steel deck", () => {
  it("el resolver calcula flexión y rasante por separado", () => {
    const r = resolverSteelDeck(BASE);
    expect(r.flexion).not.toBeNull();
    expect(resolverSteelDeck({ ...BASE, luz: "" }).flexion).not.toBeNull();
    expect(resolverSteelDeck({ ...BASE, luz: "" }).rasante).toBeNull();
  });

  it("momento excedido: más barras primero, y cumple", () => {
    const r = recomendarSteelDeck({ ...BASE, mEd: "40" }).frio ?? [];
    expect(r.length).toBeGreaterThan(0);
    for (const p of r) expect(p.utilizacion).toBeLessThanOrEqual(1);
  });
});
