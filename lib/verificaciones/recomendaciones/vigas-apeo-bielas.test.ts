import { describe, expect, it } from "vitest";
import { ADHERENCIAS, TRANSMISIONES, resolverApeoBielas } from "@/lib/calc/hormigon/vigas/resolver-apeo-bielas";
import { recomendarApeoBielas } from "./vigas-apeo-bielas";

const BASE = {
  fck: "30", fyk: "500", rg: "0.05", luz: "5", h: "2", b: "0.5", posCarga: "2.5", anchoPilar: "0.4",
  anchoApoyoIzq: "0.4", anchoApoyoDer: "0.4", voladizoIzq: "0.3", voladizoDer: "0.3", nd: "2000", qd: "30",
  transmision: TRANSMISIONES[0], adherencia: ADHERENCIAS[0],
  nTirante: "8", phiTirante: "25", nTirante2: "0", phiTirante2: "25", phiEstribo: "12", dg: "0.02",
  phiMallaH: "12", sepMallaH: "0.2", phiMallaV: "12", sepMallaV: "0.2",
  phiCuelgue: "12", sepCuelgue: "0.1", ramasCuelgue: "4", cantoColgado: "0.6",
};

describe("recomendaciones de la viga de apeo por bielas", () => {
  it("la transmisión llega al resolver desde su rótulo", () => {
    expect(resolverApeoBielas(BASE)!.r.cuelgue).toBeFalsy();
    expect(resolverApeoBielas({ ...BASE, transmision: TRANSMISIONES[2] })!.r.cuelgue).toBeTruthy();
  });

  it("tirante corto: más barras primero, y cumple", () => {
    const r = recomendarApeoBielas({ ...BASE, nTirante: "4" }).tirante ?? [];
    expect(r[0].accion).toMatch(/^Tirante: \d+ Ø25 \(hoy 4 Ø25\)$/);
    for (const p of r) expect(p.utilizacion).toBeLessThanOrEqual(1);
  });
});
