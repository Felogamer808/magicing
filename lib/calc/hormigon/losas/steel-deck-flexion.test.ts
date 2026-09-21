import { describe, expect, it } from "vitest";
import {
  aMinTabuladoMm,
  calcularSteelDeckFlexion,
  ksArmaduraPasiva,
  type GeometriaSteelDeckFlexion,
  type MaterialesSteelDeckFlexion,
  type ResistenciaFuego,
} from "./steel-deck-flexion";

// Este módulo no viene de una única hoja del Excel de referencia: la hoja
// "Resistencia a flexión" mezcla dos convenciones distintas de dónde se mide
// la posición de las barras (una desde arriba, otra apoyada en la chapa) y
// dos alturas de losa distintas, así que no hay un caso único para copiar tal
// cual. Los casos de acá son de mano, con números redondos elegidos para que
// se puedan verificar a mano (fyp,d = 200 MPa, fcd = 20 MPa exactos).

describe("steel-deck-flexion: sólo chapa (barras en 0, caso de mano)", () => {
  // fypk=230 -> fypd=200 exacto. fck=30, γc=1,5 -> fcd=20 exacto (sin αcc
  // aparte: el 0,85 ya está en Fc=0,85·fcd·b·xpl, EN 1994-1-1 §9.7.2(5)).
  const materiales: MaterialesSteelDeckFlexion = { fypkMPa: 230, fckMPa: 30, fykBarrasMPa: 500 };
  const geometria: GeometriaSteelDeckFlexion = {
    espesorTotalM: 0.15,
    alturaNervioM: 0.05,
    apMm2PorM: 1000,
    dpM: 0.1,
    diametroBarraMm: 0,
    separacionBarraMm: 200,
    recubrimientoBarraM: 0.045,
    anchoNervioM: 0.2,
  };
  const r = calcularSteelDeckFlexion(materiales, geometria, 10, { resistenciaFuego: "R90", etaFi: 0.7 });

  it("reproduce Np, el bloque comprimido y Mpl,rd de una flexión simple con un solo acero", () => {
    // Np = 1000 mm²/m · 200 MPa / 1000 = 200 kN/m
    expect(r.frio.npChapaKN).toBeCloseTo(200, 6);
    expect(r.frio.npBarrasKN).toBeCloseTo(0, 9);
    // xpl = 200·1000 / (0,85·20·1e6) = 0,0117647... m
    expect(r.frio.xplM).toBeCloseTo(0.0117647, 6);
    expect(r.frio.bloqueDentroDeHc).toBe(true);
    // z = dp - xpl/2 = 0,1 - 0,00588... ; Mpl,rd = 200·z
    expect(r.frio.zM).toBeCloseTo(0.0941176, 6);
    expect(r.frio.mPlRdKNm).toBeCloseTo(18.8235, 3);
    expect(r.frio.verificaFlexion).toBe(true);
  });
});

describe("steel-deck-flexion: chapa + barras adicionales", () => {
  const materiales: MaterialesSteelDeckFlexion = { fypkMPa: 230, fckMPa: 30, fykBarrasMPa: 500 };
  const geometria: GeometriaSteelDeckFlexion = {
    espesorTotalM: 0.15,
    // 0,045 en vez de 0,05: dan el mismo hcM en teoría (0,10 m) pero
    // 0,15 - 0,05 cae justo en un error de redondeo de punto flotante
    // (0,09999999999999999), y acá interesa un margen que no dependa de eso.
    alturaNervioM: 0.045,
    apMm2PorM: 1000,
    dpM: 0.1,
    diametroBarraMm: 10,
    separacionBarraMm: 200,
    recubrimientoBarraM: 0.045,
    anchoNervioM: 0.2,
  };
  const r = calcularSteelDeckFlexion(materiales, geometria, 15, { resistenciaFuego: "R90", etaFi: 0.7 });

  it("suma la tracción de las barras y aumenta el momento resistente frente al caso de sólo chapa", () => {
    // As = π·10²/4 · 1000/200 = 125π mm²/m (mismo valor que la hoja "Deckpanel - Rasante" del Excel)
    expect(r.frio.asBarrasMm2PorM).toBeCloseTo(125 * Math.PI, 6);
    expect(r.frio.npBarrasKN).toBeCloseTo(170.738731173358, 6);
    expect(r.frio.npKN).toBeCloseTo(370.738731173358, 6);
    expect(r.frio.dBarrasM).toBeCloseTo(0.105, 9);
    expect(r.frio.hcM).toBeCloseTo(0.105, 9);
    expect(r.frio.xplM).toBeCloseTo(0.021808, 4);
    expect(r.frio.zM).toBeCloseTo(0.091399, 4);
    expect(r.frio.mPlRdKNm).toBeCloseTo(33.885, 2);
    expect(r.frio.verificaFlexion).toBe(true);
    expect(r.frio.aprovechamiento).toBeCloseTo(15 / 33.885, 3);
  });

  it("en incendio, la chapa se descarta y sólo tracciona la armadura reducida por temperatura", () => {
    // El ancho de nervio (200 mm) y el recubrimiento (45 mm) coinciden exactos
    // con el par tabulado de la Tabla 5.5 para R90, así que Δa = 0 y θcr = 500 °C.
    expect(r.fuego.aMinTabMm).toBeCloseTo(45, 9);
    expect(r.fuego.thetaCrC).toBeCloseTo(500, 6);
    expect(r.fuego.thetaCrEnRangoValido).toBe(true);
    expect(r.fuego.ksTheta).toBeCloseTo(ksArmaduraPasiva(500), 9);
    // Np,fi = 125π mm²/m · (ks(500)·500 MPa) / 1000
    expect(r.fuego.npFiKN).toBeCloseTo(125 * Math.PI * (ksArmaduraPasiva(500) * 500) / 1000, 4);
    // xpl,fi se arma con fck directo (30 MPa), no con el fcd frío (20 MPa):
    // γc,fi = 1,0 en incendio, igual que γs,fi = 1,0 ya aplicado del lado del
    // acero. z,fi = 0,105 − xpl,fi/2; Mfi,Rd = Np,fi·z,fi.
    expect(r.fuego.mFiRdKNm).toBeCloseTo(12.0979, 2);
    // MEd,fi = ηfi·MEd = 0,7·15 = 10,5 kNm/m ≤ Mfi,Rd
    expect(r.fuego.mEdFiKNm).toBeCloseTo(10.5, 9);
    expect(r.fuego.verificaFuego).toBe(true);
    expect(r.fuego.espesorAlaMinMm).toBe(100);
    expect(r.fuego.verificaEspesorAla).toBe(true);
  });

  it("con la misma armadura, una resistencia al fuego más exigente da una barra más caliente y un momento menor", () => {
    // R120 exige más recubrimiento tabulado que el que tiene esta barra
    // (misma lógica que R90, pero la Tabla 5.5 pide más para R120), así que
    // la temperatura estimada sube por encima de los 500 °C de referencia.
    const r120 = calcularSteelDeckFlexion(materiales, geometria, 15, { resistenciaFuego: "R120", etaFi: 0.7 });
    expect(r120.fuego.thetaCrC).toBeGreaterThan(r.fuego.thetaCrC);
    expect(r120.fuego.mFiRdKNm).toBeLessThan(r.fuego.mFiRdKNm);
  });
});

describe("ksArmaduraPasiva: curva de referencia de la fig. 5.1 de EC2-1-2", () => {
  it("vale 1 hasta 350 °C y decrece por tramos hasta anularse a partir de 1200 °C", () => {
    expect(ksArmaduraPasiva(20)).toBe(1);
    expect(ksArmaduraPasiva(350)).toBe(1);
    expect(ksArmaduraPasiva(400)).toBeCloseTo(1 - (0.4 * 50) / 150, 9);
    expect(ksArmaduraPasiva(600)).toBeCloseTo(0.61 - (0.5 * 100) / 200, 9);
    expect(ksArmaduraPasiva(900)).toBeCloseTo(0.1 - (0.1 * 200) / 500, 9);
    expect(ksArmaduraPasiva(1200)).toBeCloseTo(0, 9);
    expect(ksArmaduraPasiva(1300)).toBe(0);
  });

  it("es monótona no creciente con la temperatura", () => {
    const temperaturas = [20, 100, 300, 350, 450, 500, 600, 700, 800, 1000, 1200];
    for (let i = 1; i < temperaturas.length; i++) {
      expect(ksArmaduraPasiva(temperaturas[i])).toBeLessThanOrEqual(ksArmaduraPasiva(temperaturas[i - 1]));
    }
  });
});

describe("aMinTabuladoMm: Tabla 5.5 de EC2-1-2 (vigas simplemente apoyadas)", () => {
  it("devuelve el valor tabulado exacto en los puntos de la tabla", () => {
    expect(aMinTabuladoMm("R90", 150)).toBe(55);
    expect(aMinTabuladoMm("R90", 200)).toBe(45);
    expect(aMinTabuladoMm("R90", 300)).toBe(40);
    expect(aMinTabuladoMm("R90", 400)).toBe(35);
  });

  it("interpola linealmente entre columnas", () => {
    expect(aMinTabuladoMm("R90", 250)).toBeCloseTo(42.5, 9);
  });

  it("no da dato por debajo del primer nervio tabulado, y adopta el último valor por encima", () => {
    expect(aMinTabuladoMm("R90", 100)).toBeNull();
    expect(aMinTabuladoMm("R90", 1000)).toBe(35);
  });
});

describe("fuego: R30 lo concede EN 1994-1-2 §4.3.2(5), sin calcular", () => {
  const materiales: MaterialesSteelDeckFlexion = { fypkMPa: 230, fckMPa: 30, fykBarrasMPa: 500 };
  // Nervio del ARMCO Deckpanel: 122 mm, más angosto que la Tabla 5.5 para R90.
  const geometria: GeometriaSteelDeckFlexion = {
    espesorTotalM: 0.15,
    alturaNervioM: 0.063,
    apMm2PorM: 1130,
    dpM: 0.119,
    diametroBarraMm: 10,
    separacionBarraMm: 305,
    recubrimientoBarraM: 0.025,
    anchoNervioM: 0.122,
  };
  const paraR = (resistenciaFuego: ResistenciaFuego) =>
    calcularSteelDeckFlexion(materiales, geometria, 10, { resistenciaFuego, etaFi: 0.7 }).fuego;

  it("marca R30 como concedida y no la resuelve por la Tabla 5.5", () => {
    const r = paraR("R30");
    expect(r.concedidaPorEc4).toBe(true);
    expect(r.aMinTabMm).toBeNull();
    expect(r.bMinTabuladoMinimoMm).toBeNull();
    expect(r.verificaFuego).toBe(true);
  });

  it("no confunde la concesión con el nervio angosto: son motivos distintos", () => {
    expect(paraR("R30").nervioMasAngostoQueLaTabla).toBe(false);
    expect(paraR("R90").concedidaPorEc4).toBe(false);
  });

  it("en R30 el criterio de aislamiento se sigue comprobando", () => {
    // Tabla 5.8, columna 2: 60 mm para REI 30.
    expect(paraR("R30").espesorAlaMinMm).toBe(60);
  });
});

describe("fuego: el nervio del Deckpanel contra la Tabla 5.5", () => {
  const materiales: MaterialesSteelDeckFlexion = { fypkMPa: 230, fckMPa: 30, fykBarrasMPa: 500 };
  const geometria: GeometriaSteelDeckFlexion = {
    espesorTotalM: 0.15,
    alturaNervioM: 0.063,
    apMm2PorM: 1130,
    dpM: 0.119,
    diametroBarraMm: 10,
    separacionBarraMm: 305,
    recubrimientoBarraM: 0.025,
    anchoNervioM: 0.122,
  };
  const paraR = (resistenciaFuego: ResistenciaFuego) =>
    calcularSteelDeckFlexion(materiales, geometria, 10, { resistenciaFuego, etaFi: 0.7 }).fuego;

  /** R60 arranca en bmin=120 y el nervio tiene 122: entra, por poco. */
  it("R60 entra en la tabla y da resultado", () => {
    const r = paraR("R60");
    expect(r.nervioMasAngostoQueLaTabla).toBe(false);
    expect(r.bMinTabuladoMinimoMm).toBe(120);
    expect(r.aMinTabMm).not.toBeNull();
    expect(r.mFiRdKNm).toBeGreaterThan(0);
  });

  /** De R90 en adelante la tabla arranca en 150, 200, 240 y 280. */
  it("R90 y superiores quedan fuera por nervio angosto, no por recubrimiento", () => {
    for (const resistencia of ["R90", "R120", "R180", "R240"] as const) {
      const r = paraR(resistencia);
      expect(r.nervioMasAngostoQueLaTabla).toBe(true);
      expect(r.aMinTabMm).toBeNull();
      expect(r.bMinTabuladoMinimoMm).toBeGreaterThan(122);
    }
  });

  it("subir el recubrimiento no destraba el nervio angosto", () => {
    const conMasRecubrimiento = calcularSteelDeckFlexion(
      materiales, { ...geometria, recubrimientoBarraM: 0.05 }, 10,
      { resistenciaFuego: "R90", etaFi: 0.7 }
    ).fuego;
    expect(conMasRecubrimiento.nervioMasAngostoQueLaTabla).toBe(true);
  });

  it("un nervio más ancho sí destraba R90", () => {
    const nervioAncho = calcularSteelDeckFlexion(
      materiales, { ...geometria, anchoNervioM: 0.2 }, 10,
      { resistenciaFuego: "R90", etaFi: 0.7 }
    ).fuego;
    expect(nervioAncho.nervioMasAngostoQueLaTabla).toBe(false);
    expect(nervioAncho.aMinTabMm).toBe(45);
  });
});
