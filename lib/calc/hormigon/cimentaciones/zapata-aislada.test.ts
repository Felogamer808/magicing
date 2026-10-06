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

  // El armado de la planilla era EHE-08 y ya no se compara: ver el caso
  // siguiente, recalculado a mano con el Anejo 19. Acá el pilar es más ancho
  // que la zapata, así que no hay vuelo y gobierna la mínima.
  it("sin vuelo no hay tracción que anclar y gobierna la cuantía mínima", () => {
    expect(r.direccionA.dM).toBeCloseTo(0.254, 6);
    expect(r.direccionB.dM).toBeCloseTo(0.242, 6);
    expect(r.direccionA.fsKN).toBe(0);
    expect(r.direccionA.anclaje.verifica).toBe(true);
    expect(r.direccionA.anclaje.comprobado).toBe(false);
    // ec. (9.1): b·h²/6 / (0,8·h) · fctm,fl / fyd, con fctm,fl = 1,3·fctm.
    const fctmFl = 1.3 * 0.3 * 30 ** (2 / 3);
    expect(r.direccionA.asMinCm2).toBeCloseTo(1e4 * ((0.7 * 0.3 ** 2) / 6 / (0.8 * 0.3)) * (fctmFl / (500 / 1.15)), 6);
    expect(r.direccionA.asNecCm2).toBeCloseTo(r.direccionA.asMinCm2, 9);
    expect(r.direccionA.verificaAs).toBe(true);
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

  /*
   * Recalculado a mano con el Anejo 19, art. 9.8.2.2: sección de cálculo a
   * 0,15·c dentro de la cara del pilar, F_s = M/(0,9·d), As = F_s/fyd sin tope.
   * La planilla (EHE-08) daba Td = M/(0,85·d) con la sección a c/4 y fyd ≤ 400.
   */
  const fyd = 500 / 1.15;
  const fctmFl = 1.1 * 0.3 * 25 ** (2 / 3); // (1,6 − 0,5)·fctm
  const momentoTrapecio = (b: number, l: number, sigmaSeccion: number, sigmaBorde: number) =>
    sigmaSeccion * b * l * (l / 2) + (sigmaBorde - sigmaSeccion) * b * (l / 2) * ((2 * l) / 3);

  it("dirección A: Fs = M/(0,9·d) en la sección a 0,15·c", () => {
    const l = 0.8 + 0.15 * 0.4; // 0,86 m
    const sigmaSeccion = 175 + (150 * (2 - l)) / 2; // 260,5 kPa
    const m = momentoTrapecio(1.5, l, sigmaSeccion, 325);
    expect(r.direccionA.sigmaMaxKPa).toBeCloseTo(325, 6);
    expect(r.direccionA.sigmaMinKPa).toBeCloseTo(175, 6);
    expect(r.direccionA.lM).toBeCloseTo(l, 9);
    expect(r.direccionA.sigmaCriticaKPa).toBeCloseTo(sigmaSeccion, 6);
    expect(r.direccionA.momentoKNm).toBeCloseTo(m, 6);
    expect(r.direccionA.fsKN).toBeCloseTo(m / (0.9 * 0.442), 6);
    expect(r.direccionA.asCalculadoCm2).toBeCloseTo((1e4 * m) / (0.9 * 0.442) / (fyd * 1000), 6);
    // Mínima, ec. (9.1): 1,5·0,5²/6 / 0,4 · fctm,fl/fyd = 10,14 cm²; gobierna.
    expect(r.direccionA.asMinCm2).toBeCloseTo(1e4 * ((1.5 * 0.25) / 6 / 0.4) * (fctmFl / fyd), 6);
    expect(r.direccionA.asNecCm2).toBeCloseTo(r.direccionA.asMinCm2, 9);
    expect(r.direccionA.verificaAs).toBe(true);
    expect(r.direccionA.verificaDiametroMinimo).toBe(true);
  });

  it("dirección B usa Mk B y no llega a la mínima con 6φ16", () => {
    const l = 0.6 + 0.15 * 0.3; // 0,645 m
    const sigmaSeccion = 210 + (80 * (1.5 - l)) / 1.5;
    const m = momentoTrapecio(2, l, sigmaSeccion, 290);
    expect(r.direccionB.sigmaMaxKPa).toBeCloseTo(290, 6);
    expect(r.direccionB.sigmaMinKPa).toBeCloseTo(210, 6);
    expect(r.direccionB.momentoKNm).toBeCloseTo(m, 6);
    expect(r.direccionB.fsKN).toBeCloseTo(m / (0.9 * 0.426), 6);
    // Mínima: 2·0,5²/6 / 0,4 · fctm,fl/fyd = 13,52 cm² > 12,06 cm² reales.
    expect(r.direccionB.asMinCm2).toBeCloseTo(1e4 * ((2 * 0.25) / 6 / 0.4) * (fctmFl / fyd), 6);
    expect(r.direccionB.asRealCm2).toBeCloseTo(12.0637157897848, 6);
    expect(r.direccionB.verificaAs).toBe(false);
  });

  it("el anclaje se comprueba desde x = h/2 y ancla F_s(x) en x − recubrimiento", () => {
    const a = r.direccionA.anclaje;
    expect(a.xM).toBeGreaterThanOrEqual(0.25 - 1e-9);
    expect(a.xM).toBeLessThanOrEqual(r.direccionA.lM + 1e-9);
    expect(a.disponibleMm).toBeCloseTo((a.xM - 0.05) * 1000, 6);
    expect(a.fsKN).toBeLessThanOrEqual(r.direccionA.fsKN + 1e-9);
    expect(a.verifica).toBe(a.lbdMm <= a.disponibleMm);
  });
});

describe("anclaje y diámetro mínimo de la parrilla (art. 9.8.2)", () => {
  const materiales = derivarMateriales({ fck: 25, fyk: 500 });
  const geometria = { A: 2.4, B: 2.4, H: 0.4, anchoPilarA: 0.3, anchoPilarB: 0.3, recubrimiento: 0.05 };
  const calcular = (diametroMm: number, formaAnclaje: "recta" | "gancho", Nk = 900) =>
    calcularZapataAislada(materiales, geometria, 500, {
      cargas: { Nk, MkA: 0, MkB: 0 },
      armadoA: { numero: 14, diametroMm },
      armadoB: { numero: 14, diametroMm },
      formaAnclaje,
    });

  it("la patilla acorta la longitud necesaria respecto de la barra recta", () => {
    // φ12 con 50 mm de recubrimiento: cd > 3φ, así que la patilla tiene α1 = 0,7
    // (tabla A19.8.2). Con φ20 no, y las dos darían lo mismo.
    const recta = calcular(12, "recta", 2500).direccionA.anclaje;
    const patilla = calcular(12, "gancho", 2500).direccionA.anclaje;
    expect(recta.lbdMm).toBeGreaterThan(120); // por encima de lb,min = 10φ
    expect(patilla.lbdMm).toBeLessThan(recta.lbdMm);
  });

  it("exige φ ≥ 12 mm", () => {
    expect(calcular(10, "recta").direccionA.verificaDiametroMinimo).toBe(false);
    expect(calcular(12, "recta").direccionA.verificaDiametroMinimo).toBe(true);
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

// ─── Pilar descentrado ───────────────────────────────────────────────────────
// Son los tests de la antigua zapata de medianería, con los mismos números: la
// medianería es esta zapata con el pilar contra el borde de inicio en A.
// No hay planilla de referencia para este tipo (no existe en el Excel original).
// Los valores están derivados a mano del Anejo 19 con la misma formulación que
// la zapata aislada; cada test deja la cuenta escrita.

/** Momento respecto de la sección de un trapecio de presiones de largo l. */
const momentoTrapecio = (b: number, l: number, sigmaSeccion: number, sigmaBorde: number) =>
  sigmaSeccion * b * l * (l / 2) + (sigmaBorde - sigmaSeccion) * b * (l / 2) * ((2 * l) / 3);

describe("pilar descentrado (ex zapata de medianería) — pilar muy cerca del límite (fuera del núcleo)", () => {
  const materiales = derivarMateriales({ fck: 25, fyk: 500 });
  const geometria = {
    A: 1.5,
    B: 1.2,
    H: 0.5,
    anchoPilarA: 0.4,
    anchoPilarB: 0.4,
    recubrimiento: 0.05,
    distanciaBordeA: 0.05,
  };

  const r = calcularZapataAislada(materiales, geometria, 1000, {
    cargas: { Nk: 300, MkA: 0, MkB: 0 },
    armadoA: { numero: 8, diametroMm: 16 },
    armadoB: { numero: 6, diametroMm: 12 },
  });

  it("la excentricidad incluye el peso propio y supera el núcleo central", () => {
    // Nk·e0 = 300·(−0,5) = −150 kN·m sobre Nk + PP = 322,5 kN. Antes se tomaba e0 solo.
    expect(r.geotecnico.pesoPropioKN).toBeCloseTo(22.5, 6);
    expect(r.excentricidadA).toBeCloseTo(-150 / 322.5, 6);
    expect(r.dentroDelNucleo).toBe(false);
    expect(r.geotecnico.verificaTension).toBe(false);
  });

  it("con despegue el borde interior no aporta presión", () => {
    expect(r.vuelosA.distribucion.hayDespegue).toBe(true);
    expect(r.vuelosA.fin.sigmaMaxKPa).toBe(0);
    expect(r.vuelosA.inicio.sigmaMaxKPa).toBeCloseTo(r.vuelosA.distribucion.sigmaMaxKPa, 9);
  });

  it("el lado del límite, con vuelo menor que h/2, no tiene tirante que anclar", () => {
    expect(r.vuelosA.inicio.lM).toBeCloseTo(0.05 + 0.15 * 0.4, 9);
    expect(r.vuelosA.inicio.anclaje.comprobado).toBe(false);
    expect(r.vuelosA.inicio.anclaje.verifica).toBe(true);
  });
});

describe("pilar descentrado (ex zapata de medianería) — dentro del núcleo, con vuelo distinto a cada lado", () => {
  const materiales = derivarMateriales({ fck: 25, fyk: 500 });
  const geometria = {
    A: 2.5,
    B: 1.2,
    H: 0.5,
    anchoPilarA: 0.4,
    anchoPilarB: 0.4,
    recubrimiento: 0.05,
    distanciaBordeA: 0.7,
  };

  const r = calcularZapataAislada(materiales, geometria, 1000, {
    cargas: { Nk: 300, MkA: 0, MkB: 0 },
    armadoA: { numero: 8, diametroMm: 16 },
    armadoB: { numero: 6, diametroMm: 12 },
  });

  // Presión de cálculo lineal en x desde el límite: σ(x) = 276 − 100,8·x
  // (N = 450 kN, e = −0,35 m: 150 ± 126 kPa en los bordes).
  const sigma = (x: number) => 276 - 100.8 * x;

  it("queda dentro del núcleo y la tensión usa la excentricidad con peso propio", () => {
    const e = -105 / 337.5;
    expect(r.excentricidadA).toBeCloseTo(e, 6);
    expect(r.dentroDelNucleo).toBe(true);
    expect(r.geotecnico.pesoPropioKN).toBeCloseTo(37.5, 6);
    // Antes 156,25 kPa, con e = −0,35 m.
    expect(r.geotecnico.sigmaKPa).toBeCloseTo(337.5 / ((2.5 - 2 * Math.abs(e)) * 1.2), 6);
    expect(r.geotecnico.verificaTension).toBe(true);
  });

  it("presiones de cálculo en cada borde", () => {
    expect(r.vuelosA.inicio.sigmaMaxKPa).toBeCloseTo(276, 6);
    expect(r.vuelosA.fin.sigmaMaxKPa).toBeCloseTo(24, 6);
  });

  it("cada vuelo se arma con su momento en la sección a 0,15·c (art. 9.8.2.2)", () => {
    const lLimite = 0.7 + 0.06;
    const lInterior = 1.4 + 0.06;
    expect(r.vuelosA.inicio.lM).toBeCloseTo(lLimite, 9);
    expect(r.vuelosA.fin.lM).toBeCloseTo(lInterior, 9);

    const mLimite = momentoTrapecio(1.2, lLimite, sigma(lLimite), 276);
    const mInterior = momentoTrapecio(1.2, lInterior, sigma(2.5 - lInterior), 24);
    expect(r.vuelosA.inicio.momentoKNm).toBeCloseTo(mLimite, 6);
    expect(r.vuelosA.fin.momentoKNm).toBeCloseTo(mInterior, 6);
    expect(r.vuelosA.inicio.fsKN).toBeCloseTo(mLimite / (0.9 * 0.442), 6);
    expect(r.vuelosA.fin.fsKN).toBeCloseTo(mInterior / (0.9 * 0.442), 6);
  });

  it("cuantía mínima de la ec. (9.1) en los dos lados", () => {
    const fyd = 500 / 1.15;
    const fctmFl = 1.1 * 0.3 * 25 ** (2 / 3);
    const asMin = 1e4 * ((1.2 * 0.25) / 6 / 0.4) * (fctmFl / fyd);
    expect(r.vuelosA.inicio.asMinCm2).toBeCloseTo(asMin, 6);
    expect(r.vuelosA.fin.asNecCm2).toBeGreaterThanOrEqual(asMin);
  });

  it("cortante a d de cada cara del pilar", () => {
    const d = 0.442;
    const corteLimite = ((276 + sigma(0.7 - d)) / 2) * 1.2 * (0.7 - d);
    const corteInterior = ((sigma(2.5 - (1.4 - d)) + 24) / 2) * 1.2 * (1.4 - d);
    expect(r.vuelosA.inicio.vEdKN).toBeCloseTo(corteLimite, 6);
    expect(r.vuelosA.fin.vEdKN).toBeCloseTo(corteInterior, 6);
  });

  it("el vuelo máximo se mide desde la cara del pilar", () => {
    expect(r.vueloMaxM).toBeCloseTo(1.4, 9);
  });
});

describe("pilar descentrado (ex zapata de medianería) — sanidad: a mayor excentricidad, mayor diferencia de presiones", () => {
  const materiales = derivarMateriales({ fck: 25, fyk: 500 });
  const base = { A: 2.5, B: 1.2, H: 0.5, anchoPilarA: 0.4, anchoPilarB: 0.4, recubrimiento: 0.05 };
  const datos = {
    cargas: { Nk: 300, MkA: 0, MkB: 0 },
    armadoA: { numero: 8, diametroMm: 16 },
    armadoB: { numero: 6, diametroMm: 12 },
  };

  it("un pilar más cerca del límite aumenta la presión en ese borde", () => {
    const lejos = calcularZapataAislada(materiales, { ...base, distanciaBordeA: 0.9 }, 1000, datos);
    const cerca = calcularZapataAislada(materiales, { ...base, distanciaBordeA: 0.6 }, 1000, datos);
    expect(cerca.vuelosA.inicio.sigmaMaxKPa).toBeGreaterThan(lejos.vuelosA.inicio.sigmaMaxKPa);
    expect(Math.abs(cerca.excentricidadA)).toBeGreaterThan(Math.abs(lejos.excentricidadA));
  });

  it("el momento en B entra en la tensión del terreno", () => {
    const sinMB = calcularZapataAislada(materiales, { ...base, distanciaBordeA: 0.7 }, 1000, datos);
    const conMB = calcularZapataAislada(materiales, { ...base, distanciaBordeA: 0.7 }, 1000, {
      ...datos,
      cargas: { Nk: 300, MkA: 0, MkB: 40 },
    });
    expect(conMB.geotecnico.sigmaKPa).toBeGreaterThan(sinMB.geotecnico.sigmaKPa);
  });

  it("con la resultante fuera de la base no verifica", () => {
    const r = calcularZapataAislada(materiales, { ...base, distanciaBordeA: 0 }, 1000, {
      ...datos,
      cargas: { Nk: 300, MkA: -800, MkB: 0 },
    });
    expect(r.geotecnico.sigmaKPa).toBe(Infinity);
    expect(r.geotecnico.verificaTension).toBe(false);
    expect(r.vuelosA.inicio.verificaAs).toBe(false);
  });
});
