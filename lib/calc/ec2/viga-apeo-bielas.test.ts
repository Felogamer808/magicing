import { describe, expect, it } from "vitest";
import { derivarMateriales } from "./materiales";
import {
  calcularVigaApeoBielas,
  type DatosVigaApeo,
  type GeometriaVigaApeo,
} from "./viga-apeo-bielas";

/**
 * Caso de referencia, resuelto a mano paso a paso (no viene de la planilla: es
 * método general de norma, así que los valores se contrastan contra el
 * desarrollo escrito abajo y contra tests de coherencia y monotonía).
 *
 * HM-30 / B500S, γc = 1,5 y γs = 1,15 (art. 2.4.2.4 tabla A19.2.1N).
 * Viga de apeo de 5,00 × 2,00 × 0,50 m, pilar de 0,40 m centrado, Nd = 2000 kN
 * ya mayorado, más 30 kN/m repartidos. Apoyos de 0,40 m con 0,30 m de voladizo.
 *
 *   d  = 2,00 − 0,05 − 0,012 − 0,025/2      = 1,9255 m
 *   R  = 2000·2,5/5 + 30·5/2                = 1075 kN
 *   M  = 1075·2,5 − 30·2,5²/2               = 2593,75 kN·m
 *   ν' = 1 − 30/250                         = 0,88
 *   σ_sup = 1,00·0,88·20                    = 17,60 MPa      (ec. 6.60, k1 = 1,0)
 *   z  = (d/2)·[1 + √(1 − 2M/(σ_sup·b·d²))] = 1,8457 m
 *   θ  = atan(1,8457/2,5)                   = 36,46°
 *   T  = R/tg θ                             = 1456,1 kN
 *   As = T/fyd = 1456,1/434,78·10           = 33,49 cm²
 */
const materiales = derivarMateriales({ fck: 30, fyk: 500 });

const geometria: GeometriaVigaApeo = {
  luzM: 5,
  hM: 2,
  bM: 0.5,
  recubrimientoM: 0.05,
  posicionCargaM: 2.5,
  anchoPilarApeadoM: 0.4,
  anchoApoyoIzqM: 0.4,
  anchoApoyoDerM: 0.4,
  voladizoIzqM: 0.3,
  voladizoDerM: 0.3,
};

const datos: DatosVigaApeo = {
  ndPilarKN: 2000,
  qdKNPorM: 30,
  transmision: "directa",
  tirante: { numero: 8, diametroMm: 25 },
  diametroEstriboMm: 12,
  mallaHorizontal: { diametroMm: 12, separacionM: 0.2 },
  mallaVertical: { diametroMm: 12, separacionM: 0.2 },
};

const r = calcularVigaApeoBielas(materiales, geometria, datos);

describe("clasificación de la región", () => {
  it("con luz 5,00 y canto 2,00 es viga de gran canto para el Anejo 19", () => {
    // Art. 5.3.1(3): es viga si la luz supera 3 veces el canto. 5,00 ≤ 6,00.
    expect(r.region.esGranCantoAnejo19).toBe(true);
    expect(r.region.relacionLuzCanto).toBeCloseTo(2.5, 9);
  });

  it("pero no lo es para Montoya, que corta en luz/canto < 2", () => {
    // §24.7.1. Los dos criterios discrepan a propósito y el resultado los
    // muestra por separado en vez de elegir uno.
    expect(r.region.esGranCantoMontoya).toBe(false);
    expect(r.region.luzMontoyaM).toBeCloseTo(5, 9);
  });

  it("la carga está a menos de 2·d del apoyo, así que igual es región D", () => {
    expect(r.region.aIzqSobreD).toBeCloseTo(2.5 / 1.9255, 6);
    expect(r.region.cargaProximaAlApoyo).toBe(true);
    expect(r.region.esRegionD).toBe(true);
  });

  it("una viga esbelta con la carga lejos del apoyo queda fuera del modelo", () => {
    const esbelta = calcularVigaApeoBielas(
      materiales,
      { ...geometria, luzM: 12, hM: 0.8, posicionCargaM: 6 },
      datos
    );
    expect(esbelta.region.esGranCantoAnejo19).toBe(false);
    expect(esbelta.region.cargaProximaAlApoyo).toBe(false);
    expect(esbelta.region.esRegionD).toBe(false);
  });
});

describe("modelo de bielas y tirantes", () => {
  it("canto útil y equilibrio externo", () => {
    expect(r.modelo.dM).toBeCloseTo(1.9255, 9);
    expect(r.modelo.reaccionIzqKN).toBeCloseTo(1075, 9);
    expect(r.modelo.reaccionDerKN).toBeCloseTo(1075, 9);
    expect(r.modelo.momentoKNm).toBeCloseTo(2593.75, 9);
  });

  it("el brazo sale del tope del nudo superior", () => {
    expect(r.bielas.nuPrima).toBeCloseTo(0.88, 9);
    expect(r.modelo.zNudoM).toBeCloseTo(1.8457, 3);
    expect(r.modelo.verificaCabezaComprimida).toBe(true);
    // No clasifica como viga pared de Montoya, así que no hay z alternativo.
    expect(r.modelo.zMontoyaM).toBeNull();
    expect(r.modelo.zAdoptadoM).toBeCloseTo(r.modelo.zNudoM, 9);
  });

  it("inclinación y compresión de las bielas", () => {
    expect(r.modelo.anguloBielaIzqGrados).toBeCloseTo(36.46, 1);
    expect(r.modelo.compresionBielaIzqKN).toBeCloseTo(1810, 0);
  });

  it("la tracción del tirante sale del equilibrio del nudo de apoyo", () => {
    expect(r.modelo.traccionTiranteKN).toBeCloseTo(1456.1, 0);
  });

  it("sin carga repartida el tirante se reduce exactamente a M/z", () => {
    // Comprobación de coherencia del modelo: con una única carga puntual el
    // equilibrio de nudos y la fórmula de flexión tienen que dar lo mismo.
    const puntual = calcularVigaApeoBielas(materiales, geometria, { ...datos, qdKNPorM: 0 });
    expect(puntual.modelo.traccionTiranteKN).toBeCloseTo(
      puntual.modelo.momentoKNm / puntual.modelo.zAdoptadoM,
      6
    );
  });

  it("con carga repartida el tirante es mayor que M/z", () => {
    // El nudo de apoyo ve la reacción completa; usar M/z subestimaría el tirante.
    expect(r.modelo.traccionTiranteKN).toBeGreaterThan(
      r.modelo.momentoKNm / r.modelo.zAdoptadoM
    );
  });

  it("si el momento no entra en la cabeza comprimida, avisa en vez de dar NaN", () => {
    const sobrecargada = calcularVigaApeoBielas(materiales, geometria, {
      ...datos,
      ndPilarKN: 40000,
    });
    expect(sobrecargada.modelo.verificaCabezaComprimida).toBe(false);
    expect(Number.isFinite(sobrecargada.modelo.zAdoptadoM)).toBe(true);
    expect(sobrecargada.bielas.nudoSuperior.verifica).toBe(false);
  });
});

describe("tirante", () => {
  it("As necesario con fyd pleno", () => {
    expect(r.tirante.fydMPa).toBeCloseTo(500 / 1.15, 9);
    expect(r.tirante.asNecEc2Cm2).toBeCloseTo(33.49, 1);
  });

  it("no aplica el tope de 400 MPa porque no clasifica como viga pared", () => {
    expect(r.tirante.topeAplicado).toBe(false);
    expect(r.tirante.asNecCm2).toBeCloseTo(r.tirante.asNecEc2Cm2, 9);
  });

  it("8Ø25 verifican y entran en los 0,50 m de ancho", () => {
    expect(r.tirante.asRealCm2).toBeCloseTo(39.27, 2);
    expect(r.tirante.verificaAs).toBe(true);
    expect(r.tirante.aprovechamiento).toBeCloseTo(0.853, 2);
    expect(r.tirante.bNecM).toBeCloseTo(0.499, 9);
    expect(r.tirante.verificaBNec).toBe(true);
    expect(r.tirante.separacionMm).toBeCloseTo(50.14, 1);
  });

  it("el tirante se reparte en 0,12·luz", () => {
    // Montoya §24.7.3.e: no va concentrado en una fila pegada al borde.
    expect(r.tirante.alturaRepartoM).toBeCloseTo(0.6, 9);
  });

  it("en viga pared el tope de Montoya encarece la armadura", () => {
    // Con luz/canto = 1,5 sí clasifica, así que manda fyd ≯ 400 MPa
    // (§24.7.3.c, pág. 391 / impresa 357, contrastado contra el PDF).
    const pared = calcularVigaApeoBielas(
      materiales,
      { ...geometria, luzM: 3, posicionCargaM: 1.5 },
      datos
    );
    expect(pared.region.esGranCantoMontoya).toBe(true);
    expect(pared.tirante.topeAplicado).toBe(true);
    expect(pared.tirante.fydTopadoMPa).toBe(400);
    expect(pared.tirante.asNecCm2).toBeCloseTo(pared.tirante.asNecMontoyaCm2, 9);
    // 434,78/400 − 1 ≈ 8,7 % más de acero por el mismo esfuerzo.
    expect(pared.tirante.asNecCm2 / pared.tirante.asNecEc2Cm2).toBeCloseTo(500 / 1.15 / 400, 6);
  });

  it("en viga pared el brazo lo gobierna el menor de los dos criterios", () => {
    const pared = calcularVigaApeoBielas(
      materiales,
      { ...geometria, luzM: 3, posicionCargaM: 1.5 },
      datos
    );
    expect(pared.modelo.zMontoyaM).not.toBeNull();
    expect(pared.modelo.zAdoptadoM).toBeCloseTo(
      Math.min(pared.modelo.zNudoM, pared.modelo.zMontoyaM ?? Infinity),
      9
    );
  });
});

describe("anclaje del tirante", () => {
  it("lb y lb neta con la misma expresión que el resto del proyecto", () => {
    expect(r.anclaje.lbMm).toBe(1138);
    expect(r.anclaje.lbNetaMm).toBeCloseTo(970.5, 0);
  });

  it("el apoyo de 0,40 m con 0,30 m de voladizo no da para anclar recto", () => {
    // Art. 6.5.4(7): la longitud se cuenta desde la cara interior del apoyo.
    expect(r.anclaje.disponibleIzqM).toBeCloseTo(0.65, 9);
    expect(r.anclaje.verificaAnclajeIzq).toBe(false);
    // Art. 9.7(3): hay que doblar, poner cercos en U o dispositivos de anclaje.
    expect(r.anclaje.requiereAnclajeMecanico).toBe(true);
  });
});

describe("bielas y nudos", () => {
  it("la biela lleva tracción transversal, así que su tope es 0,6·ν'·fcd", () => {
    expect(r.bielas.bielaIzq.sigmaMaxMPa).toBeCloseTo(10.56, 9);
    expect(r.bielas.anchoBielaIzqM).toBeCloseTo(0.3574, 3);
    expect(r.bielas.bielaIzq.sigmaMPa).toBeCloseTo(10.13, 1);
    expect(r.bielas.bielaIzq.verifica).toBe(true);
  });

  it("el nudo superior es CCC, k1 = 1,0", () => {
    expect(r.bielas.nudoSuperior.sigmaMaxMPa).toBeCloseTo(17.6, 9);
    expect(r.bielas.nudoSuperior.sigmaMPa).toBeCloseTo(10, 9);
    expect(r.bielas.nudoSuperior.verifica).toBe(true);
  });

  it("el nudo de apoyo es CCT, k2 = 0,85, y Montoya lo topa más bajo", () => {
    expect(r.bielas.nudoApoyoIzq.sigmaMaxMPa).toBeCloseTo(14.96, 9);
    expect(r.bielas.nudoApoyoIzqMontoya.sigmaMaxMPa).toBeCloseTo(14, 9);
    expect(r.bielas.nudoApoyoIzq.sigmaMPa).toBeCloseTo(5.375, 9);
    // Con fck = 30 manda Montoya; los dos criterios se cruzan en fck ≈ 44 MPa.
    expect(r.bielas.gobiernaMontoyaEnNudos).toBe(true);
  });

  it("por encima de fck ≈ 44 MPa el que manda pasa a ser el Anejo 19", () => {
    const alta = calcularVigaApeoBielas(derivarMateriales({ fck: 50, fyk: 500 }), geometria, datos);
    // 0,85·(1 − 50/250) = 0,68 < 0,70.
    expect(alta.bielas.gobiernaMontoyaEnNudos).toBe(false);
  });

  it("la biela se agota antes que el nudo de apoyo al crecer la carga", () => {
    // Es el modo típico de estas piezas: la biela es corta, muy inclinada y con
    // tracción transversal, y su tope es el más bajo de los tres.
    const cargada = calcularVigaApeoBielas(materiales, geometria, { ...datos, ndPilarKN: 3200 });
    expect(cargada.bielas.bielaIzq.verifica).toBe(false);
    expect(cargada.bielas.nudoApoyoIzq.verifica).toBe(true);
  });

  it("la tensión de la biela crece con la carga", () => {
    const cargada = calcularVigaApeoBielas(materiales, geometria, { ...datos, ndPilarKN: 2600 });
    expect(cargada.bielas.bielaIzq.sigmaMPa).toBeGreaterThan(r.bielas.bielaIzq.sigmaMPa);
  });
});

describe("tracción transversal del campo de compresiones", () => {
  it("con b > H/2 usa la ec. (6.59), discontinuidad total", () => {
    expect(r.traccionTransversal.bRepartoM).toBeCloseTo(2, 9);
    expect(r.traccionTransversal.discontinuidadParcial).toBe(false);
    // T = ¼·(1 − 0,7·a/h)·F = 0,25·(1 − 0,7·0,40/2,00)·2000
    expect(r.traccionTransversal.traccionKN).toBeCloseTo(430, 9);
    expect(r.traccionTransversal.asNecCm2).toBeCloseTo(10.75, 9);
    expect(r.traccionTransversal.asRealCm2).toBeCloseTo(22.62, 2);
    expect(r.traccionTransversal.verificaAs).toBe(true);
  });

  it("con b ≤ H/2 cambia a la ec. (6.58), discontinuidad parcial", () => {
    const parcial = calcularVigaApeoBielas(materiales, geometria, { ...datos, anchoRepartoM: 0.9 });
    expect(parcial.traccionTransversal.discontinuidadParcial).toBe(true);
    // T = ¼·(b − a)/b·F = 0,25·(0,90 − 0,40)/0,90·2000
    expect(parcial.traccionTransversal.traccionKN).toBeCloseTo((0.25 * 0.5 * 2000) / 0.9, 6);
  });
});

describe("malla ortogonal mínima", () => {
  it("mínimo por cara y dirección de 0,001·Ac, art. 9.7(1)", () => {
    // Ac por metro = 500 mm · 1000 mm → 0,001·Ac = 500 mm²/m = 5 cm²/m,
    // por encima del piso de 150 mm²/m.
    expect(r.malla.asMinCm2PorM).toBeCloseTo(5, 9);
    expect(r.malla.horizontalCm2PorM).toBeCloseTo(5.65, 2);
    expect(r.malla.verificaHorizontal).toBe(true);
    expect(r.malla.verificaVertical).toBe(true);
  });

  it("el piso de 150 mm²/m manda en vigas finas", () => {
    const fina = calcularVigaApeoBielas(materiales, { ...geometria, bM: 0.12 }, datos);
    expect(fina.malla.asMinCm2PorM).toBeCloseTo(1.5, 9);
  });

  it("separación máxima: menor entre 300 mm y dos espesores, art. 9.7(2)", () => {
    expect(r.malla.separacionMaxM).toBeCloseTo(0.3, 9);
    expect(r.malla.verificaSeparacionHorizontal).toBe(true);
    const separada = calcularVigaApeoBielas(materiales, geometria, {
      ...datos,
      mallaVertical: { diametroMm: 12, separacionM: 0.35 },
    });
    expect(separada.malla.verificaSeparacionVertical).toBe(false);
  });
});

describe("cuelgue", () => {
  it("con carga directa no hay armadura de cuelgue", () => {
    expect(r.cuelgue).toBeNull();
  });

  it("con carga colgada hay que colgar el 100 % de Nd", () => {
    // Montoya §24.9.1: es la hipótesis más desfavorable y la que más se olvida.
    const colgada = calcularVigaApeoBielas(materiales, geometria, {
      ...datos,
      transmision: "colgada",
      cuelgue: { diametroMm: 12, separacionM: 0.1, numeroRamas: 4, cantoElementoColgadoM: 0.6 },
    });
    expect(colgada.cuelgue?.fraccionColgada).toBe(1);
    expect(colgada.cuelgue?.cargaColgadaKN).toBeCloseTo(2000, 9);
    // As = 2000/400·10 = 50 cm², con fyd de estribos topado en 400 MPa.
    expect(colgada.cuelgue?.asNecCm2).toBeCloseTo(50, 9);
    expect(colgada.cuelgue?.verificaCantoMinimo).toBe(true);
  });

  it("con apoyo indirecto se cuelga el 65 %", () => {
    const indirecta = calcularVigaApeoBielas(materiales, geometria, {
      ...datos,
      transmision: "indirecta",
      cuelgue: { diametroMm: 12, separacionM: 0.1, numeroRamas: 4, cantoElementoColgadoM: 0 },
    });
    expect(indirecta.cuelgue?.fraccionColgada).toBeCloseTo(0.65, 9);
    expect(indirecta.cuelgue?.cargaColgadaKN).toBeCloseTo(1300, 9);
  });

  it("h ≥ 1,2·a: si el elemento colgado es muy alto, no se forman las bielas", () => {
    const alta = calcularVigaApeoBielas(materiales, geometria, {
      ...datos,
      transmision: "colgada",
      cuelgue: { diametroMm: 12, separacionM: 0.1, numeroRamas: 4, cantoElementoColgadoM: 1.8 },
    });
    expect(alta.cuelgue?.cantoMinimoM).toBeCloseTo(2.16, 9);
    expect(alta.cuelgue?.verificaCantoMinimo).toBe(false);
  });
});
