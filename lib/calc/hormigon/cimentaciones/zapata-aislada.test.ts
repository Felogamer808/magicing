import { describe, expect, it } from "vitest";
import { distribucionPresiones } from "@/lib/calc/hormigon/cimentaciones/zapata-aislada";

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
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";
import {
  calcularZapataAislada,
  cargaEntreSeccionYBorde,
  coeficienteKMomento,
  moduloPerimetroM2,
  presionEn,
} from "@/lib/calc/hormigon/cimentaciones/zapata-aislada";

describe("carga del terreno entre una sección y el borde", () => {
  it("sobre toda la base devuelve la carga aplicada, con o sin despegue", () => {
    for (const e of [0, 0.2, 0.5, 0.9]) {
      const d = distribucionPresiones(600, 2, 1.5, e);
      expect(cargaEntreSeccionYBorde(d, 2, 1.5, 0).fuerzaKN).toBeCloseTo(600, 6);
    }
  });

  it("sin despegue coincide con el trapecio integrado a mano", () => {
    const d = distribucionPresiones(600, 2, 1.5, 0.2);
    const s = 1.2;
    const sigmaS = presionEn(d, 2, s);
    const l = 2 - s;
    const momento = sigmaS * 1.5 * l * (l / 2) + (d.sigmaMaxKPa - sigmaS) * 1.5 * (l / 2) * ((2 * l) / 3);
    expect(cargaEntreSeccionYBorde(d, 2, 1.5, s).momentoKNm).toBeCloseTo(momento, 9);
  });

  it("con despegue el tramo levantado no aporta presión", () => {
    const d = distribucionPresiones(600, 2, 2, 0.5);
    // La cuña mide 1,5 m: el primer medio metro está levantado.
    expect(presionEn(d, 2, 0.3)).toBe(0);
    expect(presionEn(d, 2, 2)).toBeCloseTo(d.sigmaMaxKPa, 9);
  });

  it("con la resultante fuera de la base no devuelve cero", () => {
    const d = distribucionPresiones(600, 2, 2, 1.2);
    expect(cargaEntreSeccionYBorde(d, 2, 2, 1).momentoKNm).toBe(Infinity);
  });
});

/**
 * Los datos con que se encontraron los tres errores: pilar liviano sobre una
 * zapata cuyo peso propio pesa en la resultante, con momento suficiente para
 * despegar un borde.
 */
describe("zapata liviana con despegue", () => {
  const materiales = derivarMateriales({ fck: 30, fyk: 500 });
  const geometria = { A: 0.8, B: 0.8, H: 0.3, anchoPilarA: 0.1, anchoPilarB: 0.1, recubrimiento: 0.04 };
  const armado = { numero: 6, diametroMm: 10 };
  const calcular = (Nk: number) =>
    calcularZapataAislada(materiales, geometria, 150, {
      cargas: { Nk, MkA: 5, MkB: 5 },
      armadoA: armado,
      armadoB: armado,
    });

  it("la excentricidad del terreno incluye el peso propio", () => {
    const r = calcular(14);
    // PP = 4,8 kN; e = 5 / 18,8. Con e = 5/14, como antes, daba 2.559 kPa.
    const anchoEficaz = 0.8 - (2 * 5) / 18.8;
    expect(r.geotecnico.sigmaKPa).toBeCloseTo(18.8 / anchoEficaz ** 2, 6);
    expect(r.geotecnico.verificaTension).toBe(false);
  });

  it("el armado usa la cuña de presiones, no un trapecio con tracciones", () => {
    const r = calcular(14);
    // e de cálculo = 5/14 > 0,8/6: la cuña mide 3·(0,4 − e) y σmáx = 2·Nd/(c·B).
    const cuna = 3 * (0.4 - 5 / 14);
    expect(r.direccionA.sigmaMaxKPa).toBeCloseTo((2 * 1.5 * 14) / (cuna * 0.8), 6);
    expect(r.direccionA.sigmaMinKPa).toBe(0);
  });

  it("con la resultante fuera de la base no verifica", () => {
    // Nk = 1: e = 5 / 5,8 = 0,86 m, más que media base. Antes daba 0,07 kPa y "cumple".
    const r = calcular(1);
    expect(r.geotecnico.sigmaKPa).toBe(Infinity);
    expect(r.geotecnico.verificaTension).toBe(false);
    expect(r.direccionA.verificaAs).toBe(false);
  });
});

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
    // La planilla daba 210,29: tomaba e = Mk/Nk sin el peso propio. Con la
    // resultante real, e = Mk/(Nk+PP): 537,5 / (1,8140 × 1,4256) = 207,85.
    expect(r.geotecnico.sigmaKPa).toBeCloseTo(207.854916969925, 5);
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
    // Sin momento la (6.51) da β = 1. Antes se aplicaba el 1,15 del art.
    // 6.4.3 (6), pensado para losas: 1111 / 1,15 = 966.
    expect(r.punzonamiento.beta).toBeCloseTo(1, 9);
    expect(r.punzonamiento.vEdKN).toBeCloseTo(966, 0);
    expect(r.punzonamiento.vRdCKN).toBeCloseTo(1935, 0);
    expect(r.punzonamiento.verificaPunzonamiento).toBe(true);
  });

  it("el perímetro crítico cae dentro de 2d, no en 2d", () => {
    // Comprobando sólo el perímetro de 2d el aprovechamiento sería un 68 % más
    // bajo. Barriendo los perímetros interiores como pide el art. 6.4.4(2), el
    // que gobierna está a 0,94·d. (0,499 = 0,574 / 1,15, sin el β de losas.)
    expect(r.punzonamiento.aCriticaM).toBeLessThan(2 * r.punzonamiento.dPromedioM);
    expect(r.punzonamiento.aCriticaM / r.punzonamiento.dPromedioM).toBeCloseTo(0.94, 2);
    expect(r.punzonamiento.aprovechamiento).toBeCloseTo(0.4994, 3);
  });

  it("en la cara del pilar compara con 0,4·ν·fcd (ec. 6.53)", () => {
    const c = r.punzonamiento.caraPilar;
    // u0 = 1,6 m; v = 1200 kN / (1,6 · 0,534) = 1,404 MPa.
    expect(c.u0M).toBeCloseTo(1.6, 9);
    expect(c.vEdMPa).toBeCloseTo(1200 / (1.6 * 0.534) / 1000, 6);
    // ν = 0,6·(1 − 25/250) = 0,54; 0,4 · 0,54 · 16,67 = 3,6 MPa.
    expect(c.vRdMaxMPa).toBeCloseTo(3.6, 6);
    expect(c.verifica).toBe(true);
  });

  it("con momento suma kA·MEd·u/W a VEd,red en el perímetro crítico (ec. 6.51)", () => {
    const rM = calcularZapataAislada(materiales, geometria, 1000, {
      cargas: { Nk: 800, MkA: 100, MkB: 0 },
      armadoA: armado,
      armadoB: armado,
    });
    const p = rM.punzonamiento;
    const a = p.aCriticaM;
    // Pilar cuadrado: k = 0,60. W = c²/2 + c² + 2ca + 4a² + πac.
    const w = 0.4 ** 2 / 2 + 0.4 ** 2 + 2 * 0.4 * a + 4 * a ** 2 + Math.PI * a * 0.4;
    expect(p.vEdKN).toBeCloseTo(p.vEdRedKN + (0.6 * 150 * p.u1M) / w, 6);
    expect(p.beta).toBeGreaterThan(1);
    expect(p.aprovechamiento).toBeGreaterThan(r.punzonamiento.aprovechamiento);
    expect(rM.punzonamiento.caraPilar.beta).toBeGreaterThan(1);
  });

  it("con vuelo menor que 2d no barre perímetros fuera de la zapata", () => {
    const rCorta = calcularZapataAislada(
      materiales,
      { A: 0.9, B: 0.9, H: 0.6, anchoPilarA: 0.4, anchoPilarB: 0.4, recubrimiento: 0.05 },
      1000,
      { cargas: { Nk: 800, MkA: 0, MkB: 0 }, armadoA: armado, armadoB: armado }
    );
    expect(rCorta.punzonamiento.hayPerimetroDentro).toBe(true);
    expect(rCorta.punzonamiento.aCriticaM).toBeLessThanOrEqual(0.25 + 1e-9);
  });
});

describe("coeficientes de la ec. (6.51)", () => {
  it("k sigue la tabla A19.6.1 e interpola entre sus valores", () => {
    expect(coeficienteKMomento(0.2, 1)).toBeCloseTo(0.45, 9);
    expect(coeficienteKMomento(1, 1)).toBeCloseTo(0.6, 9);
    expect(coeficienteKMomento(1.5, 1)).toBeCloseTo(0.65, 9);
    expect(coeficienteKMomento(3, 1)).toBeCloseTo(0.8, 9);
    expect(coeficienteKMomento(5, 1)).toBeCloseTo(0.8, 9);
  });

  it("W a distancia 2d es la ec. (6.41)", () => {
    const c1 = 0.5, c2 = 0.3, d = 0.45;
    const w641 = c1 ** 2 / 2 + c1 * c2 + 4 * c2 * d + 16 * d ** 2 + 2 * Math.PI * d * c1;
    expect(moduloPerimetroM2(c1, c2, 2 * d)).toBeCloseTo(w641, 9);
  });
});

describe("cortante y punzonamiento (continuación)", () => {
  const materiales = derivarMateriales({ fck: 25, fyk: 500 });
  const geometria = { A: 3, B: 3, H: 0.6, anchoPilarA: 0.4, anchoPilarB: 0.4, recubrimiento: 0.05 };
  const armado = { numero: 10, diametroMm: 16 };

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
