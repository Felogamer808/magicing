import { describe, expect, it } from "vitest";
import { calcularF7, calcularF8 } from "./flexion-cerradas";
import { OMEGA_B } from "./flexion";
import { calcularFlexionSegunSeccion } from "./seleccion-articulo";
import { propiedades } from "./perfiles";

const FY = 250e6;
const E = 200e9;
const base = { cb: 1, fyPa: FY, ePa: E } as const;

describe("F8: flexión de tubos redondos", () => {
  it("una pared gruesa es compacta y alcanza el momento plástico", () => {
    const params = { diametro: 168.3, espesor: 10 };
    const p = propiedades("tubo-redondo", params);
    const r = calcularF8({ ...base, familia: "tubo-redondo", params, lbM: 3 });

    expect(r.clase).toBe("compacta");
    expect(r.mnKNm).toBeCloseTo((FY * p.zxM3) / 1000, 6);
    expect(r.admisibleKNm).toBeCloseTo(r.mnKNm / OMEGA_B, 9);
    // D/t = 16,8 contra un límite de 0,07·E/Fy = 56.
    expect(r.relacionDt).toBeCloseTo(16.83, 2);
    expect(r.limiteCompacta).toBeCloseTo(56, 6);
  });

  it("adelgazar la pared baja la clase y la resistencia", () => {
    const grueso = calcularF8({ ...base, familia: "tubo-redondo", params: { diametro: 300, espesor: 12 }, lbM: 3 });
    const fino = calcularF8({ ...base, familia: "tubo-redondo", params: { diametro: 300, espesor: 3 }, lbM: 3 });

    expect(grueso.clase).toBe("compacta");
    expect(fino.clase).not.toBe("compacta");
    expect(fino.mnKNm / fino.mpKNm).toBeLessThan(1);
    // Mp sigue siendo el tope en las tres ramas.
    expect(grueso.mnKNm).toBeLessThanOrEqual(grueso.mpKNm * (1 + 1e-9));
    expect(fino.mnKNm).toBeLessThanOrEqual(fino.mpKNm * (1 + 1e-9));
  });

  it("avisa cuando D/t sale del alcance del artículo", () => {
    // 0,45·E/Fy = 360 con estos materiales.
    const dentro = calcularF8({ ...base, familia: "tubo-redondo", params: { diametro: 300, espesor: 3 }, lbM: 3 });
    const fuera = calcularF8({ ...base, familia: "tubo-redondo", params: { diametro: 600, espesor: 1.5 }, lbM: 3 });

    expect(dentro.limiteAplicabilidad).toBeCloseTo(360, 6);
    expect(dentro.advertencia).toBeUndefined();
    expect(fuera.relacionDt).toBeGreaterThan(360);
    expect(fuera.advertencia).toMatch(/fuera de su alcance/);
  });

  it("no depende de Lb: el tubo redondo no pandea lateralmente", () => {
    const params = { diametro: 200, espesor: 8 };
    const corto = calcularF8({ ...base, familia: "tubo-redondo", params, lbM: 1 });
    const largo = calcularF8({ ...base, familia: "tubo-redondo", params, lbM: 30 });

    expect(largo.mnKNm).toBeCloseTo(corto.mnKNm, 9);
  });
});

describe("F7: flexión de tubos rectangulares y cajones", () => {
  it("evalúa los cuatro estados límite y se queda con el menor", () => {
    const params = { alto: 200, ancho: 100, espesor: 6 };
    const r = calcularF7({ ...base, familia: "tubo-rectangular", params, lbM: 3 });

    expect(r.estados.length).toBe(4);
    expect(r.mnKNm).toBeCloseTo(Math.min(...r.estados.map((e) => e.mnKNm)), 9);
    expect(r.estados.some((e) => e.nombre === r.gobierna)).toBe(true);
    expect(r.admisibleKNm).toBeCloseTo(r.mnKNm / OMEGA_B, 9);
  });

  it("un tubo de pared gruesa llega al momento plástico", () => {
    const params = { alto: 200, ancho: 100, espesor: 12 };
    const p = propiedades("tubo-rectangular", params);
    const r = calcularF7({ ...base, familia: "tubo-rectangular", params, lbM: 2 });

    expect(r.mnKNm).toBeCloseTo((FY * p.zxM3) / 1000, 6);
    expect(r.gobierna).toMatch(/Plastificación|local|lateral/);
  });

  it("adelgazar la pared hace aparecer el pandeo local del ala", () => {
    const grueso = calcularF7({ ...base, familia: "tubo-rectangular", params: { alto: 200, ancho: 200, espesor: 12 }, lbM: 2 });
    const fino = calcularF7({ ...base, familia: "tubo-rectangular", params: { alto: 200, ancho: 200, espesor: 3 }, lbM: 2 });

    const alaGruesa = grueso.estados.find((e) => e.nombre.includes("ala"))!;
    const alaFina = fino.estados.find((e) => e.nombre.includes("ala"))!;

    expect(alaGruesa.clase).toBe("compacta");
    expect(alaFina.clase).not.toBe("compacta");
    expect(alaFina.mnKNm).toBeLessThan(fino.mpKNm);
  });

  /**
   * El pandeo lateral-torsional casi nunca gobierna en secciones cerradas: la
   * constante de torsión es tan alta que Lp sale enorme. Es lo que dice la nota
   * de usuario del artículo, y sirve de comprobación de las ecs. F7-12 y F7-13.
   */
  it("Lp sale muy largo, y Lr todavía más", () => {
    const r = calcularF7({ ...base, familia: "tubo-rectangular", params: { alto: 200, ancho: 100, espesor: 6 }, lbM: 2 });

    expect(r.lpM).toBeGreaterThan(2);
    expect(r.lrM).toBeGreaterThan(r.lpM);
  });

  it("el cajón de dos PNC usa los límites de sección armada, no los de HSS", () => {
    const cajon = calcularF7({ ...base, familia: "2PNC-cajon", params: { altura: 180 }, lbM: 2 });

    expect(cajon.mnKNm).toBeGreaterThan(0);
    expect(cajon.designacion).toBe("2PNC180 cajón");
  });

  it("flexionar por el eje débil da menos que por el fuerte en sección no cuadrada", () => {
    const params = { alto: 200, ancho: 100, espesor: 6 };
    const fuerte = calcularF7({ ...base, familia: "tubo-rectangular", params, lbM: 2 });
    const debil = calcularF7({ ...base, familia: "tubo-rectangular", params, lbM: 2, eje: "débil" });

    expect(debil.mnKNm).toBeLessThan(fuerte.mnKNm);
  });

  it("en un tubo cuadrado los dos ejes dan lo mismo", () => {
    const params = { alto: 150, ancho: 150, espesor: 6 };
    const fuerte = calcularF7({ ...base, familia: "tubo-rectangular", params, lbM: 2 });
    const debil = calcularF7({ ...base, familia: "tubo-rectangular", params, lbM: 2, eje: "débil" });

    expect(debil.mnKNm).toBeCloseTo(fuerte.mnKNm, 9);
  });
});

describe("elección del artículo según la sección", () => {
  it("manda cada sección al artículo que le corresponde", () => {
    const casos = [
      ["PNI", { altura: 200 }, "F2"],
      ["PNC", { altura: 180 }, "F2"],
      ["2PNC-almas", { altura: 180 }, "F2"],
      ["2PNC-cajon", { altura: 180 }, "F7"],
      ["tubo-rectangular", { alto: 200, ancho: 100, espesor: 6 }, "F7"],
      ["tubo-redondo", { diametro: 168.3, espesor: 6 }, "F8"],
    ] as const;

    for (const [familia, params, articulo] of casos) {
      const r = calcularFlexionSegunSeccion({ ...base, familia, params, lbM: 2 });
      expect(r.articulo).toBe(articulo);
      expect(r.admisibleKNm).toBeGreaterThan(0);
    }
  });

  it("verifica contra el momento requerido en las tres vías", () => {
    for (const [familia, params] of [
      ["PNI", { altura: 200 }],
      ["tubo-rectangular", { alto: 200, ancho: 100, espesor: 6 }],
      ["tubo-redondo", { diametro: 168.3, espesor: 6 }],
    ] as const) {
      const sonda = calcularFlexionSegunSeccion({ ...base, familia, params, lbM: 2 });
      const admisible = sonda.admisibleKNm;

      const holgado = calcularFlexionSegunSeccion({ ...base, familia, params, lbM: 2, mRequeridoKNm: admisible * 0.5 });
      const pasado = calcularFlexionSegunSeccion({ ...base, familia, params, lbM: 2, mRequeridoKNm: admisible * 1.5 });

      expect(holgado.verifica).toBe(true);
      expect(pasado.verifica).toBe(false);
      expect(holgado.aprovechamiento).toBeCloseTo(0.5, 6);
    }
  });
});
