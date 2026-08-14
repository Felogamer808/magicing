import { describe, expect, it } from "vitest";
import {
  CUATRO_CARAS,
  D0_MM,
  KFI,
  TRES_CARAS,
  betaN,
  k0,
  relacionIncendioFrio,
  resistenciaEnIncendioMPa,
  seccionReducida,
} from "@/lib/calc/madera/fuego";
import { GAMMA_M, kmod } from "@/lib/calc/madera/materiales";

describe("velocidad de carbonización, tabla 3.1", () => {
  it("en coníferas la maciza carboniza más rápido que la laminada", () => {
    /*
     * 0,8 contra 0,7 mm/min. Encolar reduce las fendas por donde progresa el
     * frente de llama. Es la distinción que más se pasa por alto, y usar 0,7 en
     * maciza subestima lo quemado un 14 %: va del lado inseguro.
     */
    expect(betaN("maciza", "conifera")).toBeCloseTo(0.8, 9);
    expect(betaN("MLE", "conifera")).toBeCloseTo(0.7, 9);
    expect(betaN("maciza", "conifera") / betaN("MLE", "conifera")).toBeCloseTo(8 / 7, 6);
  });

  it("las frondosas densas son las que mejor aguantan", () => {
    expect(betaN("maciza", "frondosa-densa")).toBeCloseTo(0.55, 9);
    expect(betaN("maciza", "frondosa-ligera")).toBeCloseTo(0.7, 9);
    expect(betaN("maciza", "frondosa-densa")).toBeLessThan(betaN("maciza", "conifera"));
  });

  it("LVL carboniza como la laminada", () => {
    expect(betaN("LVL", "lvl")).toBeCloseTo(0.7, 9);
  });
});

describe("k0, tabla 4.1", () => {
  it("crece linealmente hasta los 20 minutos y después vale 1", () => {
    expect(k0(0)).toBe(0);
    expect(k0(10)).toBeCloseTo(0.5, 9);
    expect(k0(20)).toBe(1);
    expect(k0(90)).toBe(1);
  });
});

describe("sección reducida, ec. (4.1)", () => {
  it("reproduce la sección eficaz de la planilla", () => {
    // Hoja "Flexión simple", columna de fuego: 0,14 × 0,364, MLE, 30 min.
    const r = seccionReducida(0.14, 0.364, 30, 0.7, TRES_CARAS);
    expect(r.k0).toBe(1);
    expect(r.profundidadCarbonizadaM).toBeCloseTo(0.021, 9);
    expect(r.profundidadEficazM).toBeCloseTo(0.028, 9);
    expect(r.anchoEficazM).toBeCloseTo(0.084, 9);
    expect(r.cantoEficazM).toBeCloseTo(0.336, 9);
  });

  it("reproduce la sección eficaz de la hoja de compresión", () => {
    // 0,13 × 0,365, MLE, 51,688 min, tres caras.
    const r = seccionReducida(0.13, 0.365, 51.687984881494202, 0.7, TRES_CARAS);
    expect(r.anchoEficazM).toBeCloseTo(0.0436368, 6);
    expect(r.cantoEficazM).toBeCloseTo(0.3218184, 6);
  });

  it("descuenta 7 mm además de lo carbonizado", () => {
    const r = seccionReducida(0.2, 0.4, 30, 0.7, TRES_CARAS);
    expect(r.profundidadEficazM - r.profundidadCarbonizadaM).toBeCloseTo(D0_MM / 1000, 12);
  });

  it("cuatro caras se comen el doble de canto que tres", () => {
    const tres = seccionReducida(0.2, 0.4, 60, 0.7, TRES_CARAS);
    const cuatro = seccionReducida(0.2, 0.4, 60, 0.7, CUATRO_CARAS);
    expect(cuatro.anchoEficazM).toBeCloseTo(tres.anchoEficazM, 12);
    expect(tres.cantoEficazM - cuatro.cantoEficazM).toBeCloseTo(tres.profundidadEficazM, 12);
  });

  it("la pérdida de área castiga mucho más a las secciones chicas", () => {
    /*
     * A 60 minutos con βn = 0,7 se pierden 4,9 cm por cara expuesta. A una
     * vigueta de 10 × 20 le quedan 2 mm de anchura —el 1,5 % del área, o sea
     * nada aprovechable—, mientras que a una viga de 30 × 60 le sobra el 60 %.
     * Es la razón de que en madera la resistencia al fuego se compre con
     * escuadría y no con tratamientos.
     */
    const chica = seccionReducida(0.1, 0.2, 60, 0.7, TRES_CARAS);
    const grande = seccionReducida(0.3, 0.6, 60, 0.7, TRES_CARAS);
    expect(chica.profundidadEficazM).toBeCloseTo(0.049, 9);
    expect(chica.anchoEficazM).toBeCloseTo(0.002, 9);
    expect(chica.fraccionAreaRestante).toBeLessThan(0.02);
    expect(grande.fraccionAreaRestante).toBeGreaterThan(0.55);
  });

  it("por debajo de 20 minutos k0 alivia el descuento", () => {
    const diez = seccionReducida(0.2, 0.4, 10, 0.7, TRES_CARAS);
    expect(diez.k0).toBeCloseTo(0.5, 9);
    expect(diez.profundidadEficazM).toBeCloseTo(0.007 + 0.0035, 9);
  });

  it("no devuelve dimensiones negativas", () => {
    const r = seccionReducida(0.06, 0.1, 120, 0.8, CUATRO_CARAS);
    expect(r.anchoEficazM).toBe(0);
    expect(r.cantoEficazM).toBe(0);
    expect(r.agotada).toBe(true);
  });
});

describe("resistencia en incendio", () => {
  it("kfi distingue maciza de laminada, tabla 2.1", () => {
    expect(KFI.maciza).toBeCloseTo(1.25, 9);
    expect(KFI.MLE).toBeCloseTo(1.15, 9);
  });

  it("eleva el característico al percentil 20", () => {
    expect(resistenciaEnIncendioMPa(24, "maciza")).toBeCloseTo(30, 9);
    expect(resistenciaEnIncendioMPa(24, "MLE")).toBeCloseTo(27.6, 9);
  });

  it("reproduce el fm,d de la columna de fuego de la planilla", () => {
    // MLE, fm,k = 24 MPa, kmod,fi = 1 y γM,fi = 1.
    expect(resistenciaEnIncendioMPa(24, "MLE")).toBeCloseTo(27.599999999999998, 9);
  });

  it("la tensión resistente en incendio duplica a la de frío en maciza", () => {
    /*
     * 1,25/1,0 contra 0,8/1,3. Es el dato que ordena todo el problema: si la
     * resistencia sube y la pieza igual falla, lo que falta es sección, no
     * clase resistente.
     */
    const relacion = relacionIncendioFrio("maciza", kmod("maciza", 1, "media"), GAMMA_M.maciza);
    expect(relacion).toBeCloseTo(1.25 / (0.8 / 1.3), 9);
    expect(relacion).toBeGreaterThan(2);
  });

  it("con carga permanente la ganancia es todavía mayor", () => {
    const conMedia = relacionIncendioFrio("MLE", kmod("MLE", 1, "media"), GAMMA_M.MLE);
    const conPermanente = relacionIncendioFrio("MLE", kmod("MLE", 1, "permanente"), GAMMA_M.MLE);
    expect(conPermanente).toBeGreaterThan(conMedia);
  });
});
