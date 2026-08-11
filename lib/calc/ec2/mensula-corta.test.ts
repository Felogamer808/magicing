import { describe, expect, it } from "vitest";
import { derivarMateriales } from "./materiales";
import {
  calcularMensulaCorta,
  type DatosMensulaCorta,
  type GeometriaMensulaCorta,
} from "./mensula-corta";

/**
 * Caso de referencia: la ménsula que resuelve la planilla original
 * (`web/mensula-corta/index.html`), que trabaja en mm y N. Los valores esperados
 * salen de ejecutar aquel motor tal cual, no de recalcularlos acá: si el port
 * cambia un número, el test lo dice.
 *
 * HM-30 / B500S, γc = 1,5 y γs = 1,15 (art. 2.4.2.4, tabla A19.2.1).
 * ac = 200, hc = 500, h1 = 250, b = 400, pilar 400, placa 150 × 300, cnom = 35
 * (todo en mm). FEd = 450 kN y HEd = 67,5 kN = 0,15·FEd, ya mayorados.
 * Marco de ø20, cercos de ø10, adherencia buena, sin barra transversal soldada.
 *
 *   d   = 500 − 35 − 10 − 20/2               = 445 mm    = 0,445 m
 *   z   = 0,8·445                            = 356 mm
 *   tgθ = 356/200                            = 1,78      → θ = 60,67°
 *   fyd = mín(500/1,15; 400)                 = 400 MPa   (tope de ménsula corta)
 *   Ftd = 450·200/356 + 67,5                 = 320,31 kN (Anejo 19 §J.3)
 *   FtdM= 450/1,4 + 67,5                     = 388,93 kN (Instrucción, §24.8.3.b)
 *   As  = 388,93/400·10                      = 9,72 cm²  → 4ø20 = 12,57 cm²
 */
const materiales = derivarMateriales({ fck: 30, fyk: 500 });

const geometria: GeometriaMensulaCorta = {
  acM: 0.2,
  hcM: 0.5,
  h1M: 0.25,
  bM: 0.4,
  hcolM: 0.4,
  apM: 0.15,
  bpM: 0.3,
  recubrimientoM: 0.035,
};

const datos: DatosMensulaCorta = {
  fEdKN: 450,
  hEdKN: 67.5,
  diametroPrincipalMm: 20,
  diametroCercoMm: 10,
};

const r = calcularMensulaCorta(materiales, geometria, datos);

describe("materiales", () => {
  it("topa fyd en 400 MPa aunque B500S dé 434,8", () => {
    // Montoya §24.8.2.d y §24.8.3.b, c y e, págs. 394-395. Es un tope del
    // elemento, no del material: no sale de γs.
    expect(r.materiales.fydCalculadoMPa).toBeCloseTo(434.782609, 6);
    expect(r.materiales.fydMPa).toBe(400);
    expect(r.materiales.topeFydAplicado).toBe(true);
    // El tope encarece toda la armadura de la ménsula un 8,7 %.
    expect(r.materiales.sobrecostoPorTope).toBeCloseTo(0.0869565, 6);
  });

  it("con B400S el tope no muerde y fyd es fyk/γs", () => {
    const b400 = calcularMensulaCorta(
      derivarMateriales({ fck: 30, fyk: 400 }),
      geometria,
      datos
    );
    expect(b400.materiales.fydMPa).toBeCloseTo(347.826087, 6);
    expect(b400.materiales.topeFydAplicado).toBe(false);
    expect(b400.materiales.sobrecostoPorTope).toBe(0);
    // Menos fyd, más acero: 11,18 cm² contra 9,72.
    expect(b400.tirante.asNecCm2).toBeCloseTo(11.1816964, 6);
  });

  it("ν′ = 1 − fck/250", () => {
    expect(r.materiales.nuPrima).toBeCloseTo(0.88, 9);
  });

  it("por encima de C50 usa la rama logarítmica de fctm", () => {
    // derivarMateriales sólo trae 0,30·fck^(2/3), que en C60 daría 4,58 MPa
    // contra los 4,35 de la tabla A19.3.1. El motor calcula la rama que falta.
    const c60 = calcularMensulaCorta(
      derivarMateriales({ fck: 60, fyk: 500 }),
      geometria,
      datos
    );
    expect(c60.materiales.fctmMPa).toBeCloseTo(4.354742, 6);
    expect(c60.tirante.asMinimaCm2).toBeCloseTo(4.03074949, 6);
    expect(c60.anclaje.fbdMPa).toBeCloseTo(4.572479, 6);
    expect(c60.anclaje.lbRqdMm).toBeCloseTo(338.437305, 6);
  });
});

describe("modelo de bielas y tirantes", () => {
  it("reproduce el canto útil, el brazo y el ángulo de la biela", () => {
    expect(r.modelo.dM).toBeCloseTo(0.445, 9);
    expect(r.modelo.zM).toBeCloseTo(0.356, 9);
    expect(r.modelo.tanTheta).toBeCloseTo(1.78, 9);
    expect(r.modelo.thetaGrados).toBeCloseTo(60.672821, 6);
  });

  it("es ménsula corta y el ángulo cae en el rango del §J.3(1)", () => {
    // ac = 0,200 < z = 0,356, y 1,0 ≤ 1,78 ≤ 2,5.
    expect(r.modelo.esMensulaCorta).toBe(true);
    expect(r.modelo.tanEnRango).toBe(true);
  });

  it("detecta el vuelo que ya no es ménsula corta", () => {
    // Con ac = 0,40 m el vuelo supera el brazo: fuera del §J.3(1), la pieza se
    // calcula como voladizo a flexión y este motor no aplica.
    const larga = calcularMensulaCorta(
      materiales,
      { ...geometria, acM: 0.4 },
      datos
    );
    expect(larga.modelo.esMensulaCorta).toBe(false);
    expect(larga.modelo.tanEnRango).toBe(false);
  });

  it("acepta H = 0,15·F y rechaza más", () => {
    expect(r.modelo.relacionHF).toBeCloseTo(0.15, 9);
    expect(r.modelo.hDentroDeRango).toBe(true);
    const conMasH = calcularMensulaCorta(materiales, geometria, {
      ...datos,
      hEdKN: 135,
    });
    expect(conMasH.modelo.hDentroDeRango).toBe(false);
  });
});

describe("tirante principal, por los dos métodos", () => {
  it("Anejo 19 §J.3 da 320,3 kN y la Instrucción 388,9 kN", () => {
    expect(r.tirante.ftdAnejoKN).toBeCloseTo(320.308989, 6);
    expect(r.tirante.ftdInstruccionKN).toBeCloseTo(388.928571, 6);
    expect(r.tirante.asAnejoCm2).toBeCloseTo(8.00772472, 6);
    expect(r.tirante.asInstruccionCm2).toBeCloseTo(9.72321429, 6);
  });

  it("con vuelo corto gobierna la Instrucción, que no depende de ac", () => {
    expect(r.tirante.mandaInstruccion).toBe(true);
    expect(r.tirante.asNecCm2).toBeCloseTo(9.72321429, 6);
  });

  it("con vuelo largo se da vuelta y gobierna el Anejo", () => {
    // ac = 0,30 sobre hc = 0,45: la lectura geométrica crece con el vuelo, la de
    // la Instrucción no. Por eso se calculan las dos y se arma por la mayor.
    const larga = calcularMensulaCorta(
      materiales,
      { ...geometria, acM: 0.3, hcM: 0.45, h1M: 0.3 },
      datos
    );
    expect(larga.tirante.ftdAnejoKN).toBeCloseTo(494.71519, 5);
    expect(larga.tirante.ftdInstruccionKN).toBeCloseTo(388.928571, 6);
    expect(larga.tirante.mandaInstruccion).toBe(false);
    expect(larga.tirante.asNecCm2).toBeCloseTo(12.3678797, 6);
  });

  it("el tirante gana a las dos cuantías mínimas", () => {
    expect(r.tirante.asMinimaCm2).toBeCloseTo(2.68097092, 6);
    expect(r.tirante.asMecanicaAciCm2).toBeCloseTo(3.56, 9);
    expect(r.tirante.mandaCuantiaMinima).toBe(false);
  });

  it("con carga chica manda la cuantía mecánica del ACI", () => {
    // §24.8.2.c: "más bien severa, no figura en la Instrucción española y es
    // determinante en muchos casos". Con FEd = 60 kN el tirante pide 1,72 cm² y
    // la cuantía mecánica 3,56.
    const chica = calcularMensulaCorta(materiales, geometria, {
      ...datos,
      fEdKN: 60,
      hEdKN: 9,
    });
    expect(chica.tirante.asInstruccionCm2).toBeCloseTo(1.29642857, 6);
    expect(chica.tirante.asMecanicaAciCm2).toBeCloseTo(3.56, 9);
    expect(chica.tirante.mandaCuantiaMinima).toBe(true);
    expect(chica.tirante.asNecCm2).toBeCloseTo(3.56, 9);
  });

  it("resuelve 4ø20 y verifica", () => {
    expect(r.tirante.numeroBarras).toBe(4);
    expect(r.tirante.asRealCm2).toBeCloseTo(12.5663706, 6);
    expect(r.tirante.verificaAs).toBe(true);
    expect(r.tirante.aprovechamiento).toBeCloseTo(0.773751, 5);
  });

  it("nunca baja de dos barras", () => {
    const chica = calcularMensulaCorta(materiales, geometria, {
      ...datos,
      fEdKN: 20,
      hEdKN: 3,
      diametroPrincipalMm: 25,
    });
    expect(chica.tirante.numeroBarras).toBe(2);
  });
});

describe("hormigón", () => {
  it("comprueba el nudo bajo la placa con el ancho de la placa", () => {
    // Ec. (6.61), k2 = 0,85. 450 kN sobre 150 × 300 mm = 10,0 MPa.
    expect(r.hormigon.nudo.sigmaMPa).toBeCloseTo(10, 9);
    expect(r.hormigon.nudo.sigmaMaxMPa).toBeCloseTo(14.96, 9);
    expect(r.hormigon.nudo.verifica).toBe(true);
  });

  it("comprueba la biela con el tope reducido por tracción transversal", () => {
    // Ec. (6.56), 0,6·ν′·fcd.
    expect(r.hormigon.cantoNudoM).toBeCloseTo(0.11, 9);
    expect(r.hormigon.anchoBielaM).toBeCloseTo(0.184653123, 9);
    expect(r.hormigon.compresionBielaKN).toBeCloseTo(516.151513, 6);
    expect(r.hormigon.biela.sigmaMPa).toBeCloseTo(9.317498, 6);
    expect(r.hormigon.biela.sigmaMaxMPa).toBeCloseTo(10.56, 9);
    expect(r.hormigon.biela.verifica).toBe(true);
  });

  it("acusa la biela agotada cuando el vuelo la tumba", () => {
    const larga = calcularMensulaCorta(
      materiales,
      { ...geometria, acM: 0.3, hcM: 0.45, h1M: 0.3 },
      datos
    );
    expect(larga.hormigon.biela.sigmaMPa).toBeCloseTo(11.209144, 6);
    expect(larga.hormigon.biela.verifica).toBe(false);
  });

  it("topa la tensión tangencial en 0,25·fcd y nunca en más de 5 MPa", () => {
    // Montoya §24.8.2.e: con C30, 0,25·20 = 5,0, justo el tope absoluto.
    expect(r.hormigon.tangencial.sigmaMPa).toBeCloseTo(2.52809, 5);
    expect(r.hormigon.tangencial.sigmaMaxMPa).toBe(5);
    const c60 = calcularMensulaCorta(
      derivarMateriales({ fck: 60, fyk: 500 }),
      geometria,
      datos
    );
    expect(c60.hormigon.tangencial.sigmaMaxMPa).toBe(5);
  });

  it("comprueba el degollamiento en el borde del área cargada", () => {
    // Montoya §24.8.1: d0 ≥ d/2 o puede abrirse una fisura oblicua.
    expect(r.hormigon.d0M).toBeCloseTo(0.239776119, 9);
    expect(r.hormigon.d0MinM).toBeCloseTo(0.2225, 9);
    expect(r.hormigon.verificaD0).toBe(true);
  });

  it("detecta el canto de borde insuficiente", () => {
    const flaca = calcularMensulaCorta(
      materiales,
      { ...geometria, h1M: 0.12 },
      datos
    );
    expect(flaca.hormigon.verificaD0).toBe(false);
    // Con 120 mm de borde ya no cabe el doblado del marco.
    expect(flaca.modelo.cabeElDoblado).toBe(false);
  });
});

describe("cercos", () => {
  it("con ac ≤ hc/2 pide cercos horizontales", () => {
    expect(r.cercos.caso).toBe("horizontales");
    // §J.3(2): 0,25·As,princ = 2,43 cm². §24.8.3.c: 0,2·Fvd/fyd = 2,25 cm².
    expect(r.cercos.asAnejoCm2).toBeCloseTo(2.43080357, 6);
    expect(r.cercos.asInstruccionCm2).toBeCloseTo(2.25, 9);
    expect(r.cercos.asNecCm2).toBeCloseTo(2.43080357, 6);
    expect(r.cercos.mandaInstruccion).toBe(false);
  });

  it("el área pide 2 cercos pero el despiece pone 3", () => {
    // Nunca menos de 3, y separación ≤ 150 mm dentro de la banda del tirante.
    expect(r.cercos.numeroPorArea).toBe(2);
    expect(r.cercos.numeroCercos).toBe(3);
    expect(r.cercos.asRealCm2).toBeCloseTo(4.71238898, 6);
    expect(r.cercos.verificaAs).toBe(true);
    expect(r.cercos.horizontales).toBeNull();
  });

  it("con ac > hc/2 pide verticales y además la familia horizontal", () => {
    // El articulado cuantifica los verticales (§J.3(3): 0,5·FEd/fyd) pero su
    // propia fig. A19.J.6(b) dibuja además horizontales sin ponerles número.
    // Montoya §24.8.1, pág. 393: cercos verticales solos son "inoperantes,
    // error grave que se comete con alguna frecuencia". Van las dos familias.
    const larga = calcularMensulaCorta(
      materiales,
      { ...geometria, acM: 0.3, hcM: 0.45, h1M: 0.3 },
      datos
    );
    expect(larga.cercos.caso).toBe("verticales");
    expect(larga.cercos.asNecCm2).toBeCloseTo(5.625, 9);
    expect(larga.cercos.numeroPorArea).toBe(4);
    expect(larga.cercos.numeroCercos).toBe(4);
    expect(larga.cercos.horizontales).not.toBeNull();
    expect(larga.cercos.horizontales?.asNecCm2).toBeCloseTo(2.25, 9);
    expect(larga.cercos.horizontales?.numeroCercos).toBe(3);
    expect(larga.cercos.horizontales?.verificaAs).toBe(true);
  });

  it("acredita como A₂ sólo los 2/3 superiores del canto útil", () => {
    expect(r.cercos.limite2d3M).toBeCloseTo(0.296666667, 9);
  });
});

describe("anclaje del marco", () => {
  it("reproduce la cadena fctd → fbd → lb,rqd", () => {
    // fctk;0,05 = 0,7·fctm (tabla A19.3.1), fctd con αct = 1,00 (ec. 3.16),
    // fbd = 2,25·η1·η2·fctd (ec. 8.2), lb,rqd = (ø/4)·(σsd/fbd) (ec. 8.3).
    expect(r.anclaje.fctdMPa).toBeCloseTo(1.351685, 6);
    expect(r.anclaje.eta1).toBe(1);
    expect(r.anclaje.eta2).toBe(1);
    expect(r.anclaje.fbdMPa).toBeCloseTo(3.041292, 6);
    expect(r.anclaje.sigmaSdMPa).toBeCloseTo(309.499523, 6);
    expect(r.anclaje.lbRqdMm).toBeCloseTo(508.82909, 5);
  });

  it("baja fbd un 30 % con adherencia mala", () => {
    const mala = calcularMensulaCorta(materiales, geometria, {
      ...datos,
      condicionAdherencia: "mala",
    });
    expect(mala.anclaje.eta1).toBe(0.7);
    expect(mala.anclaje.fbdMPa).toBeCloseTo(2.128904, 6);
    expect(mala.anclaje.lbRqdMm).toBeCloseTo(726.898699, 5);
  });

  it("aplica α5 sólo del lado de la ménsula, donde hay presión transversal", () => {
    expect(r.anclaje.cdMm).toBeCloseTo(38.333333, 6);
    expect(r.anclaje.alfa1).toBe(1);
    expect(r.anclaje.alfa2).toBe(1);
    expect(r.anclaje.alfa3).toBe(1);
    expect(r.anclaje.alfa4).toBe(1);
    expect(r.anclaje.presionTransversalMPa).toBeCloseTo(10, 9);
    expect(r.anclaje.alfa5).toBeCloseTo(0.7, 9);
    // Ec. (8.5): el producto α2·α3·α5 no baja de 0,7, y acá lo toca justo.
    expect(r.anclaje.lbdMensulaMm).toBeCloseTo(356.180363, 5);
    expect(r.anclaje.lbdPilarMm).toBeCloseTo(508.82909, 5);
  });

  it("cuenta lo disponible sobre el eje de la barra y verifica los dos lados", () => {
    // Art. 8.4.3(3): la pata exterior y el retorno por el intradós cuentan.
    expect(r.anclaje.disponibleMensulaMm).toBeCloseTo(685.478576, 5);
    expect(r.anclaje.verificaMensula).toBe(true);
    // Del lado del pilar la pata se dimensiona, no se comprueba.
    expect(r.anclaje.pataPilarMm).toBe(300);
    expect(r.anclaje.disponiblePilarMm).toBeCloseTo(610, 9);
    expect(r.anclaje.verificaPilar).toBe(true);
  });

  it("alarga la pata del pilar cuando crece lbd", () => {
    const mala = calcularMensulaCorta(materiales, geometria, {
      ...datos,
      condicionAdherencia: "mala",
    });
    expect(mala.anclaje.lbdPilarMm).toBeCloseTo(726.898699, 5);
    expect(mala.anclaje.pataPilarMm).toBe(420);
    expect(mala.anclaje.verificaPilar).toBe(true);
  });

  it("nunca baja de la longitud mínima del art. 8.4.4(1)", () => {
    // lb,mín = máx(0,3·lb,rqd; 10ø; 100 mm).
    expect(r.anclaje.lbMinMm).toBeCloseTo(200, 9);
  });
});

describe("despiece", () => {
  it("arma el marco cerrado y devuelve el desarrollo de la barra", () => {
    // Pata en el pilar + tramo superior + bajada exterior + retorno por el
    // intradós — fig. A19.J.6, letra A.
    expect(r.despiece.vueloTotalM).toBeCloseTo(0.335, 9);
    expect(r.despiece.yTiranteM).toBeCloseTo(0.055, 9);
    expect(r.despiece.patalPilarM).toBeCloseTo(0.3, 9);
    expect(r.despiece.tramoSuperiorM).toBeCloseTo(0.645, 9);
    expect(r.despiece.bajadaExteriorM).toBeCloseTo(0.18358209, 8);
    expect(r.despiece.retornoIntradosM).toBeCloseTo(0.336896486, 8);
    expect(r.despiece.desarrolloBarraM).toBeCloseTo(1.465478576, 8);
  });

  it("ubica los tres cercos y les da su luz", () => {
    expect(r.despiece.cercos).toHaveLength(3);
    expect(r.despiece.cercos.every((c) => c.tipo === "horizontal")).toBe(true);
    expect(r.despiece.cercos.map((c) => c.luzM)).toEqual([
      expect.closeTo(0.615, 6),
      expect.closeTo(0.615, 6),
      expect.closeTo(0.537167, 5),
    ]);
    // El cerco cerrado desarrolla dos veces la luz más dos veces el ancho.
    expect(r.despiece.cercos[0].desarrolloM).toBeCloseTo(1.89, 9);
    expect(r.despiece.luzCercoMaximaM).toBeCloseTo(0.615, 6);
    expect(r.despiece.luzCercoMinimaM).toBeCloseTo(0.537167, 5);
  });

  it("en el caso vertical devuelve las dos familias", () => {
    const larga = calcularMensulaCorta(
      materiales,
      { ...geometria, acM: 0.3, hcM: 0.45, h1M: 0.3 },
      datos
    );
    const verticales = larga.despiece.cercos.filter((c) => c.tipo === "vertical");
    const horizontales = larga.despiece.cercos.filter((c) => c.tipo === "horizontal");
    expect(verticales).toHaveLength(4);
    expect(horizontales).toHaveLength(3);
    // Los verticales se acortan siguiendo el intradós inclinado.
    expect(verticales.map((c) => c.luzM)).toEqual([
      expect.closeTo(0.321310345, 8),
      expect.closeTo(0.300620690, 8),
      expect.closeTo(0.279931034, 8),
      expect.closeTo(0.259241379, 8),
    ]);
    expect(horizontales.every((c) => Math.abs(c.luzM - 0.715) < 1e-6)).toBe(true);
  });
});
