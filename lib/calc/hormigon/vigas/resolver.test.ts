import { describe, expect, it } from "vitest";
import { resolverVigaFlexionCortante } from "@/lib/calc/hormigon/vigas/resolver";

/** Datos por defecto de la página de vigas. */
const BASE: Record<string, string> = {
  fck: "30", fyk: "500", b: "0.3", h: "0.6", recubrimiento: "0.04",
  momentoPos: "200", numeroPos: "4", diametroPos: "20", numeroPos2: "0", diametroPos2: "20",
  momentoNeg: "0", numeroNeg: "2", diametroNeg: "16", numeroNeg2: "0", diametroNeg2: "16",
  vd: "150", diametroEstribo: "8", numeroRamas: "2",
};

/**
 * Mínimo del apoyo en construcción monolítica: Anejo 19, art. 9.2.1.2 (1),
 * pág. 140, β1 = 0,15 del máximo momento del vano.
 */
describe("momento mínimo de apoyo (β1)", () => {
  it("en construcción monolítica dimensiona el apoyo para 0,15·M+ si el negativo cargado es menor", () => {
    const r = resolverVigaFlexionCortante({ ...BASE, monolitica: "si" })!;
    expect(r.gobiernaMinimoApoyo).toBe(true);
    expect(r.momentoNegativoCalculo).toBeCloseTo(30, 10);

    // Debe dar lo mismo que cargar a mano ese momento sin la regla.
    const aMano = resolverVigaFlexionCortante({ ...BASE, momentoNeg: "30" })!;
    expect(r.flexionNegativa.asNecCm2).toBeCloseTo(aMano.flexionNegativa.asNecCm2, 10);
  });

  it("respeta el negativo cargado cuando ya supera el mínimo", () => {
    const r = resolverVigaFlexionCortante({ ...BASE, momentoNeg: "80", monolitica: "si" })!;
    expect(r.gobiernaMinimoApoyo).toBe(false);
    expect(r.momentoNegativoCalculo).toBe(80);
  });

  it("sin la opción —o en un cálculo guardado antes de que existiera— no aplica el mínimo", () => {
    for (const campos of [{ ...BASE, monolitica: "no" }, BASE]) {
      const r = resolverVigaFlexionCortante(campos)!;
      expect(r.gobiernaMinimoApoyo).toBe(false);
      expect(r.momentoNegativoCalculo).toBe(0);
    }
  });
});

/*
 * Cada momento con su canto útil. Con BASE (h = 0,60, r = 0,04, estribo Ø8):
 *   inferior 4Ø20: centroide a 0,040 + 0,008 + 0,010 = 0,058 → d⁺ = 0,542 m
 *   superior 2Ø16: centroide a 0,040 + 0,008 + 0,008 = 0,056 → d⁻ = 0,544 m
 */
describe("canto útil de cada cara", () => {
  const r = resolverVigaFlexionCortante({ ...BASE, momentoNeg: "60" })!;

  it("d⁺ hasta la armadura inferior, d⁻ hasta la superior", () => {
    expect(r.d).toBeCloseTo(0.542, 9);
    expect(r.dNegativo).toBeCloseTo(0.544, 9);
  });

  it("el momento negativo se calcula con d⁻", () => {
    expect(r.flexionPositiva.d).toBeCloseTo(0.542, 9);
    expect(r.flexionNegativa.d).toBeCloseTo(0.544, 9);
    // μ⁻ = 60 / (0,3 · 0,544² · 20 · 1000)
    expect(r.flexionNegativa.mu).toBeCloseTo(60 / (0.3 * 0.544 ** 2 * 20000), 9);
  });
});

describe("el cortante va con d⁻", () => {
  it("k = 1 + √(200/d) con d⁻ = 544 mm, coherente con ρl de la armadura superior", () => {
    const r = resolverVigaFlexionCortante(BASE)!;
    expect(r.cortante.k).toBeCloseTo(1 + Math.sqrt(200 / 544), 9);
  });
});

describe("sección en T y en T invertida", () => {
  const T = {
    ...BASE, tipoSeccion: "t", anchoAla: "1.5", espesorAla: "0.15", l0: "6",
    diametroAla: "8", separacionAla: "0.2", capasAla: "1",
  };

  it("sin el campo calcula como siempre: rectangular", () => {
    const r = resolverVigaFlexionCortante(BASE);
    expect(r?.seccionT).toBeNull();
    expect(r?.flexionPositiva.alaComprimida).toBeUndefined();
  });

  it("T: con positivo el ala colabora y pide menos armadura que el rectángulo del alma", () => {
    const t = resolverVigaFlexionCortante(T)!;
    const rect = resolverVigaFlexionCortante(BASE)!;
    expect(t.seccionT?.anchoEficaz.anchoEficazM).toBeCloseTo(1.5, 9);
    expect(t.flexionPositiva.alaComprimida?.bloqueEnAla).toBe(true);
    expect(t.flexionPositiva.asCalculadoCm2).toBeLessThan(rect.flexionPositiva.asCalculadoCm2);
    // El negativo tracciona el ala: no colabora a compresión.
    expect(t.flexionNegativa.alaComprimida).toBeUndefined();
  });

  it("T: el mínimo de cada cara sale del W de la T respecto de esa fibra", () => {
    const t = resolverVigaFlexionCortante(T)!;
    // La fibra del ala está más cerca del baricentro: W mayor y mínimo mayor arriba.
    expect(t.flexionNegativa.asMinCm2).toBeGreaterThan(t.flexionPositiva.asMinCm2);
  });

  it("T: el rasante sale del momento positivo, con Δx = l0/4", () => {
    const t = resolverVigaFlexionCortante(T)!;
    expect(t.seccionT?.momentoAlaComprimidaKNm).toBe(200);
    expect(t.seccionT?.rasante?.deltaXM).toBeCloseTo(1.5, 9);
    // 1 capa Ø8 c/0,20 = 2,51 cm²/m
    expect(t.seccionT?.asTransversalAlaCm2PorM).toBeCloseTo(2.513, 3);
  });

  it("T invertida: el positivo es un rectángulo del alma y el ala colabora con el negativo", () => {
    const inv = resolverVigaFlexionCortante({ ...T, tipoSeccion: "t-invertida", momentoNeg: "150" })!;
    const rect = resolverVigaFlexionCortante({ ...BASE, momentoNeg: "150" })!;
    expect(inv.flexionPositiva.alaComprimida).toBeUndefined();
    expect(inv.flexionNegativa.alaComprimida).toBeDefined();
    expect(inv.seccionT?.momentoAlaComprimidaKNm).toBe(150);
    // Las barras inferiores van en el ala: con el mismo canto útil, la misma armadura por momento.
    expect(inv.flexionPositiva.asCalculadoCm2).toBeCloseTo(rect.flexionPositiva.asCalculadoCm2, 6);
  });

  it("sin datos válidos del ala no calcula", () => {
    expect(resolverVigaFlexionCortante({ ...T, anchoAla: "0.2" })).toBeNull();
    expect(resolverVigaFlexionCortante({ ...T, espesorAla: "0.7" })).toBeNull();
    expect(resolverVigaFlexionCortante({ ...T, l0: "" })).toBeNull();
  });
});

describe("l0 desde la fig. A19.5.2", () => {
  const INV = {
    ...BASE, tipoSeccion: "t-invertida", anchoAla: "1.5", espesorAla: "0.15", l0: "6",
    diametroAla: "8", separacionAla: "0.2", capasAla: "1", momentoNeg: "150",
  };

  it("sin el campo del caso usa el l0 cargado, como antes", () => {
    expect(resolverVigaFlexionCortante(INV)?.seccionT?.ala.l0M).toBe(6);
    expect(resolverVigaFlexionCortante(INV)?.seccionT?.tramoL0).toBe("manual");
  });

  it("sobre un apoyo: 0,15·(l1 + l2), y el ancho eficaz baja", () => {
    const r = resolverVigaFlexionCortante({ ...INV, tramoL0: "apoyo", luz1: "6", luz2: "5" })!;
    expect(r.seccionT?.ala.l0M).toBeCloseTo(1.65, 9);
    // b1 = 0,6: 0,2·0,6 + 0,165 = 0,285 ≤ 0,33 → b_eff = 2·0,285 + 0,3 = 0,87
    expect(r.seccionT?.anchoEficaz.anchoEficazM).toBeCloseTo(0.87, 9);
  });

  it("sin las luces que pide el caso no calcula", () => {
    expect(resolverVigaFlexionCortante({ ...INV, tramoL0: "apoyo", luz1: "6", luz2: "" })).toBeNull();
  });
});

describe("estribos por zonas", () => {
  const zonas = { ...BASE, vd: "300", zonasCortante: "si", vdCentro: "60", luzVano: "6", diametroEstriboVano: "6", numeroRamasVano: "2" };

  it("sin el campo, una sola zona como siempre", () => {
    expect(resolverVigaFlexionCortante(BASE)!.cortanteZonas).toBeNull();
  });

  it("el Vd cargado es el del apoyo; la zona de apoyo sale calculada", () => {
    const r = resolverVigaFlexionCortante(zonas)!;
    expect(r.cortanteZonas).not.toBeNull();
    expect(r.cortanteZonas!.apoyo.separacionAdoptadaM).toBeCloseTo(r.cortante.separacionAdoptadaM, 9);
    expect(r.cortanteZonas!.largoApoyoM).toBeGreaterThan(0);
    expect(r.cortanteZonas!.largoApoyoM).toBeLessThanOrEqual(3);
  });

  it("el Vd del centro no puede superar al del apoyo, y hace falta la luz", () => {
    expect(resolverVigaFlexionCortante({ ...zonas, vdCentro: "400" })).toBeNull();
    expect(resolverVigaFlexionCortante({ ...zonas, luzVano: "" })).toBeNull();
  });
});

describe("cerco del ala", () => {
  const T = {
    ...BASE, tipoSeccion: "t-invertida", anchoAla: "1.5", espesorAla: "0.15", l0: "6",
    diametroAla: "8", separacionAla: "0.2", capasAla: "1", momentoNeg: "150",
  };
  const cerco = { ...T, transversalAla: "cerco" };

  /** Ø8 c/0,20 en una capa: 2,51 cm²/m. */
  it("con barras, la armadura del ala es la cargada", () => {
    const barras = resolverVigaFlexionCortante(T)!;
    expect(barras.seccionT!.asTransversalAlaCm2PorM).toBeCloseTo((Math.PI * 0.8 ** 2) / 4 / 0.2, 9);
    expect(barras.seccionT!.separacionCercoAlaM).toBeNull();
  });

  /** El cerco del ala va a la separación del alma, con sus 2 ramas horizontales; no usa la separación cargada. */
  it("con cerco, va a la separación del cerco del alma con 2 ramas", () => {
    const r = resolverVigaFlexionCortante({ ...cerco, separacionAla: "" })!;
    const s = r.cortante.separacionAdoptadaM;
    expect(r.seccionT!.separacionCercoAlaM).toBeCloseTo(s, 9);
    expect(r.seccionT!.asTransversalAlaCm2PorM).toBeCloseTo((2 * Math.PI * 0.8 ** 2) / 4 / s, 9);
  });

  /** Con un cerco del ala fino el rasante pide más juntos: la separación de los dos cercos baja a la suya. */
  it("si el rasante pide más que el cortante, la separación de los dos es la del rasante", () => {
    const fino = resolverVigaFlexionCortante({ ...cerco, diametroAla: "6", momentoNeg: "400", vd: "50" })!;
    const sRas = fino.seccionT!.separacionPorRasanteM!;
    expect(sRas).toBeGreaterThan(0);
    expect(fino.cortante.separacionAdoptadaM).toBeLessThanOrEqual(sRas + 1e-9);
    expect(fino.seccionT!.rasante!.verificaArmadura).toBe(true);
  });
});

describe("V en el borde del apoyo", () => {
  // Anejo 19, art. 6.2.1 (8): el Vd puede tomarse a d del borde, pero VRd,max se comprueba con el del apoyo.
  it("comprueba las bielas con el V del borde si es mayor, y los estribos con el Vd", () => {
    const sinBorde = resolverVigaFlexionCortante(BASE)!;
    const vRdMax = sinBorde.cortante.vRdMax;
    const r = resolverVigaFlexionCortante({ ...BASE, vdBorde: String(vRdMax * 1.1) })!;
    expect(r.vdBielasKN).toBeCloseTo(vRdMax * 1.1, 6);
    expect(r.cortante.verificaVRdMax).toBe(false);
    expect(r.cortante.separacionAdoptadaM).toBe(sinBorde.cortante.separacionAdoptadaM);
  });

  it("en blanco o menor que Vd no cambia nada", () => {
    const r = resolverVigaFlexionCortante({ ...BASE, vdBorde: "" })!;
    expect(r.vdBielasKN).toBe(r.v.vd);
    expect(resolverVigaFlexionCortante({ ...BASE, vdBorde: "1" })!.vdBielasKN).toBe(r.v.vd);
  });
});

describe("tamaño del árido (art. 8.2(2))", () => {
  it("vacío deja la separación de la planilla; cargado, la exige con dg + 5 mm", () => {
    // Ancho disponible 0,30 − 2·(0,04 + 0,008) = 0,204: con 20 mm entran 5 Ø20; con dg = 32 (37 mm), 4.
    const cinco = { ...BASE, numeroPos: "5" };
    expect(resolverVigaFlexionCortante(cinco)!.flexionPositiva.capacidadPorGrupo).toEqual([5]);
    expect(resolverVigaFlexionCortante({ ...cinco, dg: "" })!.flexionPositiva.capacidadPorGrupo).toEqual([5]);
    expect(resolverVigaFlexionCortante({ ...cinco, dg: "32" })!.flexionPositiva.capacidadPorGrupo).toEqual([4]);
  });
});
