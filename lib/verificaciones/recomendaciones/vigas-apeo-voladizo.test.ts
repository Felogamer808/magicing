import { describe, expect, it } from "vitest";
import { recomendarApeoVoladizo } from "./vigas-apeo-voladizo";

/** La viga real que motivó la página: el nudo bajo el pilar apeado de 0,14 × 0,50 no verifica. */
const BASE = {
  fck: "30", fyk: "500", rec: "0.02", h: "0.89", b: "0.77", luz: "1.24", voladizo: "0.33",
  extremoLibre: "0.07", extremoLejano: "0.10", cargaAncho: "0.14", cargaProf: "0.50",
  apoyoCAncho: "0.20", apoyoCProf: "0.60", apoyoLAncho: "0.20", apoyoLProf: "0.60",
  elemLAncho: "0.14", elemLProf: "0.77", p: "1485", nMax: "500", nMin: "350",
  nTirante: "6", phiTirante: "20", phiEstribo: "12", forma: "recta", nPilar: "4", phiPilar: "12",
  sepEstribo: "0.125", phiPiel: "12", sepPiel: "0.125", phiHorquilla: "20",
};

describe("recomendaciones de la viga de apeo en voladizo", () => {
  it("nudo bajo el pilar apeado: agrandar el apoyo de la carga, y cumple", () => {
    const r = recomendarApeoVoladizo(BASE).nudoCargaApoyo ?? [];
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].accion).toMatch(/^Pilar apeado, /);
    for (const p of r) expect(p.utilizacion).toBeLessThanOrEqual(1);
  });

  it("anclaje recto que no entra: propone horquillas cuando ellas cumplen todo", () => {
    // Con 4Ø25 y fck 40 las horquillas Ø25 alcanzan, entran en la capa y el
    // doblado de la U interior verifica la ec. (8.1); recto, sigue sin entrar.
    const caso = { ...BASE, fck: "40", nTirante: "4", phiTirante: "25", phiHorquilla: "25" };
    const r = recomendarApeoVoladizo(caso).anclajeCarga ?? [];
    const horquillas = r.find((p) => /horquillas/.test(p.accion));
    expect(horquillas).toBeDefined();
    expect(horquillas!.utilizacion).toBeLessThanOrEqual(1);
  });

  it("estribos demasiado separados: achicar la separación", () => {
    const r = recomendarApeoVoladizo({ ...BASE, sepEstribo: "0.20" }).mallaVertical ?? [];
    expect(r.length).toBeGreaterThan(0);
    for (const p of r) expect(p.utilizacion).toBeLessThanOrEqual(1);
  });
});
