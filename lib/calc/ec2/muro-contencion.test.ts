import { describe, expect, it } from "vitest";
import { calcularMomentosElementos } from "./muro-contencion";

/**
 * Momentos en las tres piezas. Son voladizos independientes, así que cada uno se
 * comprueba contra su propia integral: no hay una fórmula global que los ate.
 */
describe("momentos en hastial, talón y puntera", () => {
  const base = {
    A: 2, hZap: 0.3, esp: 0.25, hMuro: 3.2,
    hAct: 3.5, q: 5, gammaKNm3: 18, ka: 0.5, puntera: 0.6,
  };

  it("el hastial toma el empuje sobre su propia altura, no sobre la total", () => {
    const m = calcularMomentosElementos(base, 200, 100);
    // Sobre el hastial actúan 3,5 − 0,3 = 3,2 m de terreno.
    expect(m.alturaHastialM).toBeCloseTo(3.2, 9);

    const h = 3.2;
    const ea = (18 * 0.5 * h ** 2) / 2;
    const eq = 0.5 * 5 * h;
    expect(m.hastialKNm).toBeCloseTo(1.5 * (ea * (h / 3) + eq * (h / 2)), 6);
  });

  it("el momento del hastial crece con el cubo de la altura", () => {
    const bajo = calcularMomentosElementos({ ...base, hAct: 2.3, hMuro: 2 }, 200, 100);
    const alto = calcularMomentosElementos({ ...base, hAct: 4.3, hMuro: 4 }, 200, 100);
    // Sin sobrecarga el término dominante va con h³: al doble de altura, ocho veces.
    const sinQBajo = calcularMomentosElementos({ ...base, q: 0, hAct: 2.3, hMuro: 2 }, 200, 100);
    const sinQAlto = calcularMomentosElementos({ ...base, q: 0, hAct: 4.3, hMuro: 4 }, 200, 100);
    expect(sinQAlto.hastialKNm / sinQBajo.hastialKNm).toBeCloseTo((4 / 2) ** 3, 6);
    expect(alto.hastialKNm).toBeGreaterThan(bajo.hastialKNm);
  });

  it("el talón cuenta tierra, sobrecarga y peso propio sobre su vuelo", () => {
    const m = calcularMomentosElementos(base, 200, 100);
    // Talón = A − puntera − espesor = 2 − 0,6 − 0,25.
    expect(m.talonM).toBeCloseTo(1.15, 9);

    const carga = 18 * (3.5 - 0.3) + 5 + 25 * 0.3;
    expect(m.talonKNm).toBeCloseTo(1.5 * ((carga * 1.15 ** 2) / 2), 6);
  });

  it("sin puntera toda la zapata es talón y el momento de puntera es cero", () => {
    const m = calcularMomentosElementos({ ...base, puntera: 0 }, 200, 100);
    expect(m.punteraM).toBe(0);
    expect(m.punteraKNm).toBe(0);
    expect(m.talonM).toBeCloseTo(2 - 0.25, 9);
  });

  it("la puntera se levanta por la reacción, descontando su peso propio", () => {
    const m = calcularMomentosElementos(base, 200, 100);
    const sigmaMedia = 200 / 2;
    const gradiente = 100 / (2 ** 2 / 6);

    expect(m.sigmaPunteraBordeKPa).toBeCloseTo(sigmaMedia + gradiente, 6);
    // En el arranque la presión ya bajó, porque el diagrama es lineal.
    expect(m.sigmaPunteraArranqueKPa).toBeLessThan(m.sigmaPunteraBordeKPa);
    expect(m.punteraKNm).toBeGreaterThan(0);
  });

  it("una puntera más larga da más momento", () => {
    const corta = calcularMomentosElementos({ ...base, puntera: 0.3 }, 200, 100);
    const larga = calcularMomentosElementos({ ...base, puntera: 0.9 }, 200, 100);
    expect(larga.punteraKNm).toBeGreaterThan(corta.punteraKNm);
    // Y deja menos talón.
    expect(larga.talonM).toBeLessThan(corta.talonM);
  });

  it("los tres momentos salen mayorados con γf = 1,5", () => {
    const m = calcularMomentosElementos(base, 200, 100);
    const sinMayorar = calcularMomentosElementos({ ...base, gammaKNm3: 18 }, 200, 100);
    // Comprobación directa sobre el talón, que es el más simple de invertir.
    const carga = 18 * (3.5 - 0.3) + 5 + 25 * 0.3;
    expect(sinMayorar.talonKNm / ((carga * m.talonM ** 2) / 2)).toBeCloseTo(1.5, 9);
  });
});
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
