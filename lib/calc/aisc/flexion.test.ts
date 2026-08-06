import { describe, expect, it } from "vitest";
import { calcularFlexion, OMEGA_B } from "./flexion";
import { propiedades } from "./perfiles";

const FY = 250e6;
const E = 200e9;

const base = { cb: 1, fyPa: FY, ePa: E } as const;

describe("flexión F2: estados límite y zonas", () => {
  it("con Lb ≤ Lp manda la plastificación, Mn = Fy·Zx", () => {
    const p = propiedades("PNI", 200);
    const r = calcularFlexion({ ...base, familia: "PNI", altura: 200, lbM: 0.5 });

    expect(r.zona).toBe("plastificación (Lb ≤ Lp)");
    expect(r.mnKNm).toBeCloseTo((FY * p.zxM3) / 1000, 6);
    expect(r.mnKNm).toBeCloseTo(r.mpKNm, 9);
    expect(r.admisibleKNm).toBeCloseTo(r.mpKNm / OMEGA_B, 9);
    expect(r.fcrPa).toBeNull();
  });

  it("recorre las tres zonas al alargar Lb", () => {
    const corto = calcularFlexion({ ...base, familia: "HEB", altura: 200, lbM: 1 });
    const medio = calcularFlexion({ ...base, familia: "HEB", altura: 200, lbM: 6 });
    const largo = calcularFlexion({ ...base, familia: "HEB", altura: 200, lbM: 25 });

    expect(corto.zona).toBe("plastificación (Lb ≤ Lp)");
    expect(medio.zona).toBe("inelástica (Lp < Lb ≤ Lr)");
    expect(largo.zona).toBe("elástica (Lb > Lr)");
    expect(largo.fcrPa).not.toBeNull();
  });

  it("Mn baja monótonamente con Lb y nunca supera Mp", () => {
    let anterior = Infinity;
    for (const lbM of [0.5, 1, 2, 3, 5, 8, 12, 20, 30]) {
      const r = calcularFlexion({ ...base, familia: "HEB", altura: 240, lbM });
      expect(r.mnKNm).toBeLessThanOrEqual(r.mpKNm * (1 + 1e-9));
      expect(r.mnKNm).toBeLessThanOrEqual(anterior * (1 + 1e-9));
      anterior = r.mnKNm;
    }
  });

  /**
   * La comprobación más fuerte del módulo: en Lb = Lr las dos ramas tienen que
   * dar lo mismo. La ec. F2-2 vale ahí 0,7·Fy·Sx por construcción, así que si la
   * ec. F2-4 evaluada en Lr da otra cosa, es que Lr (ec. F2-6) está mal.
   */
  it("las ramas inelástica y elástica coinciden en Lb = Lr", () => {
    for (const [familia, altura] of [
      ["PNI", 200],
      ["HEB", 240],
      ["2PNC", 180],
    ] as const) {
      const p = propiedades(familia, altura);
      const enLr = calcularFlexion({ ...base, familia, altura, lbM: 1 });
      const justoDespues = calcularFlexion({
        ...base,
        familia,
        altura,
        lbM: enLr.lrM * 1.0001,
      });

      const mrKNm = (0.7 * FY * p.sxM3) / 1000;
      expect(justoDespues.zona).toBe("elástica (Lb > Lr)");
      expect(justoDespues.mnKNm / mrKNm).toBeCloseTo(1, 2);
    }
  });

  it("Lp es menor que Lr en todos los perfiles", () => {
    for (const [familia, altura] of [
      ["PNI", 80],
      ["PNI", 300],
      ["HEB", 100],
      ["HEB", 300],
      ["2PNC", 180],
    ] as const) {
      const r = calcularFlexion({ ...base, familia, altura, lbM: 1 });
      expect(r.lpM).toBeGreaterThan(0);
      expect(r.lrM).toBeGreaterThan(r.lpM);
    }
  });

  it("Cb mayor aumenta Mn en la zona inelástica, sin pasar de Mp", () => {
    const cb1 = calcularFlexion({ ...base, familia: "HEB", altura: 200, lbM: 6 });
    const cb23 = calcularFlexion({ ...base, cb: 2.3, familia: "HEB", altura: 200, lbM: 6 });

    expect(cb23.mnKNm).toBeGreaterThan(cb1.mnKNm);
    expect(cb23.mnKNm).toBeLessThanOrEqual(cb23.mpKNm * (1 + 1e-9));
  });
});

describe("alcance del artículo F2", () => {
  it("los perfiles del catálogo son compactos con Fy = 250 MPa", () => {
    for (const [familia, altura] of [
      ["PNI", 80],
      ["PNI", 300],
      ["HEB", 100],
      ["HEB", 300],
    ] as const) {
      const r = calcularFlexion({ ...base, familia, altura, lbM: 1 });
      expect(r.compacta.ala).toBe(true);
      expect(r.compacta.alma).toBe(true);
    }
  });

  it("acepta el PNC simple usando el coeficiente c de la ec. F2-8b", () => {
    const canal = calcularFlexion({ ...base, familia: "PNC", altura: 180, lbM: 2 });
    const perfilI = calcularFlexion({ ...base, familia: "PNI", altura: 180, lbM: 2 });

    // En secciones doblemente simétricas c vale exactamente 1 (ec. F2-8a), y de
    // hecho la ec. F2-8b se reduce a 1 al sustituir Cw = Iy·ho²/4. En un canal
    // el alabeo es menor que ese valor, así que c sale por encima de 1.
    expect(perfilI.c).toBe(1);
    expect(canal.c).toBeGreaterThan(1);
    expect(canal.c).toBeLessThan(1.5);
    expect(canal.mnKNm).toBeGreaterThan(0);
  });

  it("separar los dos PNC alarga Lp y Lr", () => {
    const juntos = calcularFlexion({ ...base, familia: "2PNC", altura: 180, lbM: 2 });
    const separados = calcularFlexion({
      ...base,
      familia: "2PNC",
      altura: 180,
      lbM: 2,
      separacionM: 0.12,
    });

    // Más inercia débil = más resistencia al vuelco lateral.
    expect(separados.lpM).toBeGreaterThan(juntos.lpM);
    expect(separados.lrM).toBeGreaterThan(juntos.lrM);
    // El eje fuerte no cambia: Mp es el mismo.
    expect(separados.mpKNm).toBeCloseTo(juntos.mpKNm, 9);
  });
});
