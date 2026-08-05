import { describe, expect, it } from "vitest";
import { calcularMuroContencion } from "./muro-contencion";

// Caso real de la hoja "VERIF MUROS CONTENCION": γ=18, φ=34°, c=5 kPa,
// σadm=100 kPa, zapata 0.5x0.3, muro 3.2x0.15, suelo activo 3.2 m, pasivo 0,
// sobrecarga 5 kN/m².

const suelo = { gammaKNm3: 18, phiGrados: 34, cKPa: 5, sigmaAdmisibleKPa: 100 };
const geometria = {
  anchoZapataM: 0.5,
  cantoZapataM: 0.3,
  alturaMuroM: 3.2,
  espesorMuroM: 0.15,
  alturaSueloActivoM: 3.2,
  alturaSueloPasivoM: 0,
  sobrecargaKPa: 5,
};
const apoyos = { l1Caso2M: 2, l1Caso3M: 0.95, l2Caso3M: 2.45 };

const r = calcularMuroContencion(suelo, geometria, apoyos);

describe("muro de contención: empujes", () => {
  it("aplica el piso de 0,5 al coeficiente activo", () => {
    expect(r.empujes.ka).toBeCloseTo(0.5, 9);
    expect(r.empujes.kp).toBeCloseTo(2, 9);
    expect(r.empujes.alturaTotalM).toBeCloseTo(3.5, 9);
  });

  it("reproduce los empujes activos y el momento volcador", () => {
    expect(r.empujes.empujeSueloKN).toBeCloseTo(46.08, 6);
    expect(r.empujes.empujeSobrecargaKN).toBeCloseTo(8, 6);
    expect(r.empujes.momentoVolcadorKNm).toBeCloseTo(61.952, 6);
  });

  it("reproduce los pesos estabilizadores", () => {
    expect(r.empujes.pesoMuroKN).toBeCloseTo(12, 6);
    expect(r.empujes.pesoZapataKN).toBeCloseTo(3.75, 6);
    expect(r.empujes.pesoSueloActivoKN).toBeCloseTo(10.08, 6);
    expect(r.empujes.pesoSueloPasivoKN).toBeCloseTo(0, 9);
    expect(r.empujes.empujePasivoKN).toBeCloseTo(0, 9);
  });
});

describe("muro de contención: vuelco", () => {
  // La planilla tomaba el peso del alzado con brazo A/2 (0.25 m) en lugar del
  // centro de gravedad del propio alzado (esp/2 = 0.075 m), lo que sobrestimaba
  // el momento estabilizador. Acá se usa esp/2, coherente con el brazo del suelo
  // sobre la zapata y con la otra hoja de muros de la planilla.
  it("reproduce el momento estabilizador con el brazo del alzado corregido", () => {
    // 12·0.075 + 3.75·0.25 + 10.08·0.325 = 0.9 + 0.9375 + 3.276
    expect(r.empujes.momentoEstabilizadorKNm).toBeCloseTo(5.1135, 6);
  });

  it("no verifica el vuelco: este muro necesita apuntalamiento", () => {
    expect(r.vuelco.factorSeguridad).toBeCloseTo(5.1135 / 61.952, 6);
    expect(r.vuelco.verifica).toBe(false);
  });
});

describe("muro de contención: deslizamiento", () => {
  it("reproduce el caso 1, sólo zapata", () => {
    expect(r.deslizamientoSoloZapata.nKN).toBeCloseTo(26.83, 6);
    expect(r.deslizamientoSoloZapata.fhAdmKN).toBeCloseTo(20.5970635068823, 6);
    expect(r.deslizamientoSoloZapata.fhMaxKN).toBeCloseTo(54.08, 6);
    expect(r.deslizamientoSoloZapata.factorSeguridad).toBeCloseTo(0.380862860704185, 6);
    expect(r.deslizamientoSoloZapata.verifica).toBe(false);
  });

  it("reproduce el caso con apoyo en contrapiso, donde sólo pasa R1 por rozamiento", () => {
    expect(r.deslizamientoApoyoContrapiso.fhMaxKN).toBeCloseTo(23.104, 6);
    expect(r.deslizamientoApoyoContrapiso.factorSeguridad).toBeCloseTo(0.891493399709241, 6);
    expect(r.deslizamientoApoyoContrapiso.verifica).toBe(false);
  });
});

describe("muro de contención: tensión del suelo", () => {
  it("reproduce el caso 1", () => {
    expect(r.tensionSueloCaso1.nKN).toBeCloseTo(30.83, 6);
    expect(r.tensionSueloCaso1.momentoKNm).toBeCloseTo(98.304, 6);
    expect(r.tensionSueloCaso1.sigmaKPa).toBeCloseTo(2420.956, 4);
    expect(r.tensionSueloCaso1.verifica).toBe(false);
  });

  it("reproduce los casos 2 y 3, mucho menos exigidos al estar apuntalados", () => {
    expect(r.tensionSueloCasos23.momentoKNm).toBeCloseTo(0.9249, 6);
    expect(r.tensionSueloCasos23.sigmaKPa).toBeCloseTo(83.8576, 4);
    expect(r.tensionSueloCasos23.verifica).toBe(true);
  });
});

describe("muro de contención: reacciones de los apoyos", () => {
  it("reproduce el caso 2, apoyo en contrapiso", () => {
    expect(r.apoyoContrapiso.r2KN).toBeCloseTo(30.976, 6);
    expect(r.apoyoContrapiso.r1KN).toBeCloseTo(-23.104, 6);
  });

  it("reproduce el caso 3, contrapiso más losa superior", () => {
    expect(r.apoyoContrapisoYLosa.r2KN).toBeCloseTo(4.31673469387755, 6);
    expect(r.apoyoContrapisoYLosa.r1KN).toBeCloseTo(49.7632653061225, 6);
  });
});

describe("muro de contención: un muro que sí verifica", () => {
  const robusto = calcularMuroContencion(
    suelo,
    { ...geometria, anchoZapataM: 2.5, cantoZapataM: 0.4, espesorMuroM: 0.3, sobrecargaKPa: 0 },
    apoyos
  );

  it("con zapata ancha el vuelco verifica", () => {
    expect(robusto.vuelco.factorSeguridad).toBeGreaterThan(1.5);
    expect(robusto.vuelco.verifica).toBe(true);
  });
});
