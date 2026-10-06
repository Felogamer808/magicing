import { describe, expect, it } from "vitest";
import { NOMBRE_CEMENTO, NOMBRE_EXPOSICION } from "@/lib/calc/hormigon/comun/diferidas";
import { COACCIONES, resolverMuro } from "@/lib/calc/hormigon/muros/resolver-muro";
import { recomendarMuro } from "./muro";

const BASE = {
  fck: "30", fyk: "500", espesor: "0.3", longitud: "4", altura: "2.5", coaccion: COACCIONES[0], rec: "0.04",
  nEd: "600", m01: "0", m02: "0", relacionMqp: "0.7", phiV: "12", sepV: "200", phiH: "12", sepH: "200",
  hr: "70", t0: "28", cemento: NOMBRE_CEMENTO.N, exposicion: NOMBRE_EXPOSICION["cuatro-caras"],
};

describe("recomendaciones del muro", () => {
  it("el resolver calcula la fluencia con las cuatro caras por defecto", () => {
    const r = resolverMuro({ ...BASE, exposicion: "" })!;
    expect(r.r.fluencia.basica).toBeCloseTo(resolverMuro(BASE)!.r.fluencia.basica, 9);
  });

  it("flexocompresión excedida: cada propuesta cumple", () => {
    const r = recomendarMuro({ ...BASE, nEd: "1500", m02: "260", m01: "130" }).resistencia ?? [];
    expect(r.length).toBeGreaterThan(0);
    for (const p of r) expect(p.utilizacion).toBeLessThanOrEqual(1);
  });

  it("separación horizontal excedida: bajarla a 400 mm, el máximo", () => {
    const [p] = recomendarMuro({ ...BASE, sepH: "450" }).sepH ?? [];
    expect(p.accion).toBe("Horizontal: Ø12 c/400 mm (hoy Ø12 c/450 mm)");
  });
});
