import { describe, expect, it } from "vitest";
import { distribucionPresiones } from "./zapata-aislada";

/**
 * El reparto de presiones bajo la base alimenta el diagrama, pero es cálculo:
 * distingue la zapata que apoya entera de la que se despegó por un borde, y esa
 * diferencia no la muestra la tensión por área eficaz.
 */
describe("distribución de presiones bajo la base", () => {
  it("sin excentricidad la presión es uniforme", () => {
    const d = distribucionPresiones(600, 2, 2, 0);
    expect(d.hayDespegue).toBe(false);
    expect(d.longitudContactoM).toBeCloseTo(2, 9);
    // 600 kN sobre 4 m² son 150 kPa parejos.
    expect(d.sigmaMaxKPa).toBeCloseTo(150, 9);
    expect(d.sigmaMinKPa).toBeCloseTo(150, 9);
  });

  it("dentro del núcleo central el diagrama es trapecial y conserva la resultante", () => {
    const lM = 2, bM = 2, nKN = 600, e = 0.2;
    const d = distribucionPresiones(nKN, lM, bM, e);

    expect(d.limiteNucleoM).toBeCloseTo(lM / 6, 9);
    expect(d.hayDespegue).toBe(false);
    // El volumen del trapecio tiene que devolver la carga aplicada.
    const resultante = ((d.sigmaMaxKPa + d.sigmaMinKPa) / 2) * lM * bM;
    expect(resultante).toBeCloseTo(nKN, 6);
  });

  it("justo en el borde del núcleo la presión mínima se anula", () => {
    const d = distribucionPresiones(600, 2, 2, 2 / 6);
    expect(d.hayDespegue).toBe(false);
    expect(d.sigmaMinKPa).toBeCloseTo(0, 9);
    expect(d.sigmaMaxKPa).toBeCloseTo(300, 6);
  });

  it("fuera del núcleo se despega un borde y la cuña conserva la resultante", () => {
    const lM = 2, bM = 2, nKN = 600, e = 0.5;
    const d = distribucionPresiones(nKN, lM, bM, e);

    expect(d.hayDespegue).toBe(true);
    // El triángulo mide 3·(L/2 − e) y su baricentro cae bajo la resultante.
    expect(d.longitudContactoM).toBeCloseTo(3 * (lM / 2 - e), 9);
    expect(d.sigmaMinKPa).toBe(0);
    const resultante = (d.sigmaMaxKPa / 2) * d.longitudContactoM * bM;
    expect(resultante).toBeCloseTo(nKN, 6);
  });

  it("las dos ramas empalman en el límite del núcleo", () => {
    const antes = distribucionPresiones(600, 2, 2, 2 / 6 - 1e-9);
    const despues = distribucionPresiones(600, 2, 2, 2 / 6 + 1e-9);

    expect(despues.sigmaMaxKPa).toBeCloseTo(antes.sigmaMaxKPa, 4);
    expect(despues.longitudContactoM).toBeCloseTo(antes.longitudContactoM, 6);
  });

  it("más excentricidad concentra más la carga", () => {
    const poca = distribucionPresiones(600, 2, 2, 0.4);
    const mucha = distribucionPresiones(600, 2, 2, 0.7);

    expect(mucha.longitudContactoM).toBeLessThan(poca.longitudContactoM);
    expect(mucha.sigmaMaxKPa).toBeGreaterThan(poca.sigmaMaxKPa);
  });
});
import { derivarMateriales } from "./materiales";
import { calcularZapataAislada } from "./zapata-aislada";

// Casos extraídos/verificados con Excel COM sobre "CALCULOS TODO.xlsx", hoja "Zapatas",
// bloque "ZAPATA AISLADA CON MOMENTO".

describe("zapata aislada (caso original de la planilla, Mk=0)", () => {
  const materiales = derivarMateriales({ fck: 30, fyk: 500 });
  const geometria = {
    A: 0.7,
    B: 0.7,
    H: 0.3,
    anchoPilarA: 1.4,
    anchoPilarB: 1.4,
    recubrimiento: 0.04,
  };

  const r = calcularZapataAislada(materiales, geometria, 1000, {
    cargas: { Nk: 27, MkA: 0, MkB: 0 },
    armadoA: { numero: 4, diametroMm: 12 },
    armadoB: { numero: 4, diametroMm: 12 },
  });

  it("reproduce el peso propio y la presión geotécnica", () => {
    expect(r.geotecnico.pesoPropioKN).toBeCloseTo(3.675, 6);
    expect(r.geotecnico.sigmaKPa).toBeCloseTo(62.6020408163265, 6);
    expect(r.geotecnico.verificaTension).toBe(true);
    expect(r.esRigida).toBe(true);
  });

  it("reproduce el armado en dirección A (sin excentricidad)", () => {
    expect(r.direccionA.sigmaMaxKPa).toBeCloseTo(82.6530612244898, 6);
    expect(r.direccionA.lM).toBeCloseTo(0, 9);
    expect(r.direccionA.dM).toBeCloseTo(0.254, 6);
    expect(r.direccionA.tdKN).toBeCloseTo(0, 9);
    expect(r.direccionA.asNecCm2).toBeCloseTo(3.864, 3);
    expect(r.direccionA.asRealCm2).toBeCloseTo(4.5238934211693, 6);
    expect(r.direccionA.verificaAs).toBe(true);
    expect(r.direccionA.lbIMm).toBeCloseTo(300, 6);
    expect(r.direccionA.dmMm).toBeCloseTo(144, 6);
  });

  it("reproduce el armado en dirección B (sin excentricidad)", () => {
    expect(r.direccionB.dM).toBeCloseTo(0.242, 6);
    expect(r.direccionB.asNecCm2).toBeCloseTo(3.864, 3);
    expect(r.direccionB.asRealCm2).toBeCloseTo(4.5238934211693, 6);
    expect(r.direccionB.verificaAs).toBe(true);
  });
});

describe("zapata aislada con excentricidad (Mk A ≠ Mk B, corregido)", () => {
  const materiales = derivarMateriales({ fck: 25, fyk: 500 });
  const geometria = {
    A: 2,
    B: 1.5,
    H: 0.5,
    anchoPilarA: 0.4,
    anchoPilarB: 0.3,
    recubrimiento: 0.05,
  };

  const r = calcularZapataAislada(materiales, geometria, 300, {
    cargas: { Nk: 500, MkA: 50, MkB: 20 },
    armadoA: { numero: 8, diametroMm: 16 },
    armadoB: { numero: 6, diametroMm: 16 },
  });

  it("reproduce el peso propio y la presión por el método del área efectiva", () => {
    expect(r.geotecnico.pesoPropioKN).toBeCloseTo(37.5, 6);
    expect(r.geotecnico.sigmaKPa).toBeCloseTo(210.28951486698, 5);
    expect(r.geotecnico.verificaTension).toBe(true);
  });

  it("reproduce el armado en dirección A", () => {
    expect(r.direccionA.sigmaMaxKPa).toBeCloseTo(325, 6);
    expect(r.direccionA.sigmaMinKPa).toBeCloseTo(175, 6);
    expect(r.direccionA.sigmaCriticaKPa).toBeCloseTo(257.5, 6);
    expect(r.direccionA.lM).toBeCloseTo(0.9, 6);
    expect(r.direccionA.dM).toBeCloseTo(0.442, 6);
    expect(r.direccionA.tdKN).toBeCloseTo(489.136944370508, 3);
    expect(r.direccionA.asMinMecanicoCm2).toBeCloseTo(11.5, 3);
    expect(r.direccionA.asMinGeometricoCm2).toBeCloseTo(6.75, 3);
    expect(r.direccionA.asNecCm2).toBeCloseTo(12.2284236092627, 3);
    expect(r.direccionA.asRealCm2).toBeCloseTo(16.0849543863797, 3);
    expect(r.direccionA.verificaAs).toBe(true);
    expect(r.direccionA.lbIMm).toBeCloseTo(400, 6);
    expect(r.direccionA.dmMm).toBeCloseTo(192, 6);
  });

  it("usa Mk B (no Mk A) para el armado en dirección B — corrige el bug de la planilla", () => {
    expect(r.direccionB.sigmaMaxKPa).toBeCloseTo(290, 6);
    expect(r.direccionB.sigmaMinKPa).toBeCloseTo(210, 6);
    expect(r.direccionB.sigmaCriticaKPa).toBeCloseTo(254, 6);
    expect(r.direccionB.lM).toBeCloseTo(0.675, 6);
    expect(r.direccionB.dM).toBeCloseTo(0.426, 6);
    expect(r.direccionB.tdKN).toBeCloseTo(349.803231151616, 3);
    expect(r.direccionB.asMinMecanicoCm2).toBeCloseTo(15.3333333333333, 3);
    expect(r.direccionB.asMinGeometricoCm2).toBeCloseTo(9, 3);
    expect(r.direccionB.asNecCm2).toBeCloseTo(15.3333333333333, 3);
    expect(r.direccionB.asRealCm2).toBeCloseTo(12.0637157897848, 3);
    expect(r.direccionB.verificaAs).toBe(false);
    expect(r.direccionB.lbIMm).toBeCloseTo(400, 6);
    expect(r.direccionB.dmMm).toBeCloseTo(192, 6);
  });
});

// Cortante unidireccional y punzonamiento (EC2 6.2.2 / 6.4) no vienen de la planilla
// original (no los tenía). Los valores esperados están derivados a mano de la norma;
// se comparan con tolerancia amplia y se acompañan de chequeos de sanidad/monotonía.
describe("cortante y punzonamiento (EC2, sin equivalente en la planilla)", () => {
  const materiales = derivarMateriales({ fck: 25, fyk: 500 });
  const geometria = {
    A: 3,
    B: 3,
    H: 0.6,
    anchoPilarA: 0.4,
    anchoPilarB: 0.4,
    recubrimiento: 0.05,
  };
  const armado = { numero: 10, diametroMm: 16 };

  const r = calcularZapataAislada(materiales, geometria, 1000, {
    cargas: { Nk: 800, MkA: 0, MkB: 0 },
    armadoA: armado,
    armadoB: armado,
  });

  it("reproduce el cortante unidireccional en ambas direcciones", () => {
    expect(r.direccionA.vEdKN).toBeCloseTo(303, 0);
    expect(r.direccionA.vRdCKN).toBeCloseTo(580, 0);
    expect(r.direccionA.verificaCorte).toBe(true);

    expect(r.direccionB.vEdKN).toBeCloseTo(310, 0);
    expect(r.direccionB.vRdCKN).toBeCloseTo(568, 0);
    expect(r.direccionB.verificaCorte).toBe(true);
  });

  it("reproduce el punzonamiento en el perímetro crítico", () => {
    expect(r.punzonamiento.dPromedioM).toBeCloseTo(0.534, 3);
    expect(r.punzonamiento.u1M).toBeCloseTo(4.754, 2);
    expect(r.punzonamiento.vEdKN).toBeCloseTo(1111, 0);
    expect(r.punzonamiento.vRdCKN).toBeCloseTo(1935, 0);
    expect(r.punzonamiento.verificaPunzonamiento).toBe(true);
  });

  it("el perímetro crítico cae dentro de 2d, no en 2d", () => {
    // Antes se comprobaba sólo el perímetro de 2d y daba un aprovechamiento de
    // 0,34. Barriendo los perímetros interiores como pide el art. 6.4.4(2), el
    // que gobierna está a 0,94·d y el aprovechamiento real es 0,57: un 68 % más
    // alto. Esta zapata sigue verificando, pero una que antes diera 0,62 en
    // realidad estaría por encima de 1.
    expect(r.punzonamiento.aCriticaM).toBeLessThan(2 * r.punzonamiento.dPromedioM);
    expect(r.punzonamiento.aCriticaM / r.punzonamiento.dPromedioM).toBeCloseTo(0.94, 2);
    expect(r.punzonamiento.aprovechamiento).toBeCloseTo(0.574, 3);
  });

  it("el punzonamiento deja de verificar con una carga mucho mayor (misma armadura)", () => {
    const rSobrecargada = calcularZapataAislada(materiales, geometria, 1000, {
      cargas: { Nk: 3000, MkA: 0, MkB: 0 },
      armadoA: armado,
      armadoB: armado,
    });
    expect(rSobrecargada.punzonamiento.vEdKN).toBeGreaterThan(rSobrecargada.punzonamiento.vRdCKN);
    expect(rSobrecargada.punzonamiento.verificaPunzonamiento).toBe(false);
  });

  it("la sección crítica de cortante cae dentro del pilar cuando el vuelo es chico (VEd=0)", () => {
    const rCompacta = calcularZapataAislada(
      materiales,
      { A: 0.9, B: 0.9, H: 0.6, anchoPilarA: 0.4, anchoPilarB: 0.4, recubrimiento: 0.05 },
      1000,
      { cargas: { Nk: 800, MkA: 0, MkB: 0 }, armadoA: armado, armadoB: armado }
    );
    expect(rCompacta.direccionA.vEdKN).toBe(0);
    expect(rCompacta.direccionA.verificaCorte).toBe(true);
  });
});
