import { describe, expect, it } from "vitest";
import { rigidezDeSeccion, type SeccionVigaLibre } from "./viga-libre-modelo";

const seccion = (s: Partial<SeccionVigaLibre>): SeccionVigaLibre => ({
  tipoSeccion: "rectangular", b: "0.3", h: "0.6", anchoAla: "1.2", espesorAla: "0.15", fck: "30", ...s,
});

describe("rigidez de la viga libre con la sección bruta y Ecm", () => {
  it("rectangular 30 × 60 con HA-30: I = b·h³/12 y Ecm = 22·(38/10)^0,3", () => {
    const r = rigidezDeSeccion(seccion({}));
    expect(r.motivo).toBeNull();
    expect(r.inerciaM4).toBeCloseTo(0.0054, 8);
    expect(r.eGPa).toBeCloseTo(32.837, 3);
    expect(r.eiKNm2).toBeCloseTo(32.837e6 * 0.0054, -2);
  });

  it("T 30 × 60 con ala 1,20 × 0,15, a mano por Steiner", () => {
    // Ala: A = 0,18, y = 0,075. Alma: A = 0,135, y = 0,375. yc = 0,203571.
    // I = 1,2·0,15³/12 + 0,18·0,128571² + 0,3·0,45³/12 + 0,135·0,171429²
    //   = 0,0003375 + 0,0029755 + 0,0022781 + 0,0039673 = 0,0095585
    const r = rigidezDeSeccion(seccion({ tipoSeccion: "t" }));
    expect(r.inerciaM4).toBeCloseTo(0.0095585, 6);
    // La invertida es la misma sección dada vuelta.
    expect(rigidezDeSeccion(seccion({ tipoSeccion: "t-invertida" })).inerciaM4).toBeCloseTo(r.inerciaM4, 12);
  });

  it("acepta coma decimal", () => {
    expect(rigidezDeSeccion(seccion({ b: "0,3", h: "0,6" })).inerciaM4).toBeCloseTo(0.0054, 8);
  });

  it("sin datos válidos dice por qué y no da EI", () => {
    expect(rigidezDeSeccion(seccion({ h: "" })).motivo).toMatch(/b o h/);
    expect(rigidezDeSeccion(seccion({ tipoSeccion: "t", anchoAla: "0.2" })).motivo).toMatch(/ala/);
    expect(rigidezDeSeccion(seccion({ fck: "0" })).motivo).toMatch(/fck/);
    expect(rigidezDeSeccion(seccion({ fck: "0" })).eiKNm2).toBeNaN();
  });
});
