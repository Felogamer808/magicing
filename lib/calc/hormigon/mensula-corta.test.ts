import { describe, expect, it } from "vitest";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";
import {
  calcularMensulaCorta,
  type DatosMensulaCorta,
  type GeometriaMensulaCorta,
} from "@/lib/calc/hormigon/mensula-corta";

/**
 * Caso de referencia: la ménsula de la planilla original, ahora resuelta sólo
 * con el Anejo 19 (2026-10-07). La planilla armaba por el mayor entre el Anejo
 * y la Instrucción según Montoya, con fyd topado en 400 MPa: los valores que
 * dependían de eso se recalcularon a mano y quedan escritos en cada test.
 *
 * HM-30 / B500S, γc = 1,5 y γs = 1,15 (art. 2.4.2.4, tabla A19.2.1).
 * ac = 200, hc = 500, h1 = 250, b = 400, pilar 400, placa 150 × 300, cnom = 35
 * (todo en mm). FEd = 450 kN y HEd = 67,5 kN = 0,15·FEd, ya mayorados.
 * Marco de ø20, cercos de ø10, adherencia buena, sin barra transversal soldada.
 *
 *   d   = 500 − 35 − 10 − 20/2               = 445 mm    = 0,445 m
 *   z   = 0,8·445                            = 356 mm
 *   tgθ = 356/200                            = 1,78      → θ = 60,67°
 *   fyd = 500/1,15                           = 434,78 MPa
 *   Ftd = 450·200/356 + 67,5                 = 320,31 kN (Anejo 19 §J.3)
 *   As  = 320,31/434,78·10                   = 7,37 cm²  → 3ø20 = 9,42 cm²
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
  it("fyd es fyk/γs, sin el tope de 400 MPa de la Instrucción", () => {
    expect(r.materiales.fydMPa).toBeCloseTo(434.782609, 6);
  });

  it("con B400S, menos fyd y más acero: 320,31/347,83", () => {
    const b400 = calcularMensulaCorta(
      derivarMateriales({ fck: 30, fyk: 400 }),
      geometria,
      datos
    );
    expect(b400.materiales.fydMPa).toBeCloseTo(347.826087, 6);
    expect(b400.tirante.asNecCm2).toBeCloseTo((320.308989 / 347.826087) * 10, 5);
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
    // σsd = 339,86 MPa con 3ø20: lb,rqd = 5·339,86/4,5725.
    expect(c60.anclaje.lbRqdMm).toBeCloseTo((20 / 4) * (339.858393 / 4.572479), 3);
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
});

describe("tirante principal", () => {
  it("Anejo 19 §J.3: Ftd = F·ac/z + H = 320,3 kN y As = Ftd/fyd", () => {
    expect(r.tirante.ftdKN).toBeCloseTo(320.308989, 6);
    expect(r.tirante.asTiranteCm2).toBeCloseTo(7.36710674, 6);
    expect(r.tirante.asNecCm2).toBeCloseTo(7.36710674, 6);
  });

  it("con vuelo largo el tirante crece con ac: 450·0,3/0,2528 + 67,5", () => {
    const larga = calcularMensulaCorta(
      materiales,
      { ...geometria, acM: 0.3, hcM: 0.45, h1M: 0.3 },
      datos
    );
    expect(larga.tirante.ftdKN).toBeCloseTo(494.71519, 5);
    expect(larga.tirante.asNecCm2).toBeCloseTo((494.71519 / 434.782609) * 10, 5);
  });

  it("el tirante gana a la cuantía mínima del art. 9.2.1.1", () => {
    expect(r.tirante.asMinimaCm2).toBeCloseTo(2.68097092, 6);
    expect(r.tirante.mandaCuantiaMinima).toBe(false);
  });

  it("con carga chica manda la cuantía mínima, ya no la mecánica del ACI", () => {
    const chica = calcularMensulaCorta(materiales, geometria, {
      ...datos,
      fEdKN: 60,
      hEdKN: 9,
    });
    expect(chica.tirante.mandaCuantiaMinima).toBe(true);
    expect(chica.tirante.asNecCm2).toBeCloseTo(2.68097092, 6);
  });

  it("resuelve 3ø20 y verifica", () => {
    expect(r.tirante.numeroBarras).toBe(3);
    expect(r.tirante.asRealCm2).toBeCloseTo(9.42477796, 6);
    expect(r.tirante.verificaAs).toBe(true);
    expect(r.tirante.aprovechamiento).toBeCloseTo(7.36710674 / 9.42477796, 6);
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

  it("tope del cortante, ec. (6.5): F/(b·d) ≤ 0,5·ν·fcd con ν = 0,6·(1 − fck/250)", () => {
    // 450/(0,4·0,445) = 2,53 MPa contra 0,5·0,6·0,88·20 = 5,28 MPa.
    expect(r.hormigon.cortanteMaximo.sigmaMPa).toBeCloseTo(2.52809, 5);
    expect(r.hormigon.cortanteMaximo.sigmaMaxMPa).toBeCloseTo(5.28, 9);
    expect(r.hormigon.cortanteMaximo.verifica).toBe(true);
  });

  it("aviso de degollamiento (Montoya §24.8.1): d0 ≥ d/2, sin entrar en el cumple", () => {
    expect(r.hormigon.d0M).toBeCloseTo(0.239776119, 9);
    expect(r.hormigon.d0MinM).toBeCloseTo(0.2225, 9);
    expect(r.hormigon.cumpleAvisoD0).toBe(true);
  });

  it("avisa del canto de borde insuficiente", () => {
    const flaca = calcularMensulaCorta(
      materiales,
      { ...geometria, h1M: 0.12 },
      datos
    );
    expect(flaca.hormigon.cumpleAvisoD0).toBe(false);
    // Con 120 mm de borde ya no cabe el doblado del marco.
    expect(flaca.modelo.cabeElDoblado).toBe(false);
  });
});

describe("cercos", () => {
  it("con ac ≤ hc/2 pide cercos horizontales: 0,25·As,main (§J.3(2))", () => {
    expect(r.cercos.caso).toBe("horizontales");
    expect(r.cercos.requeridos).toBe(true);
    expect(r.cercos.asNecCm2).toBeCloseTo(0.25 * 7.36710674, 6);
  });

  it("el área pide 2 cercos pero el despiece pone 3", () => {
    // Nunca menos de 3, y separación ≤ 150 mm dentro de la banda del tirante.
    expect(r.cercos.numeroPorArea).toBe(2);
    expect(r.cercos.numeroCercos).toBe(3);
    expect(r.cercos.asRealCm2).toBeCloseTo(4.71238898, 6);
    expect(r.cercos.verificaAs).toBe(true);
  });

  it("con ac > hc/2 y F > VRd,c pide verticales, 0,5·FEd/fyd (§J.3(3))", () => {
    const larga = calcularMensulaCorta(
      materiales,
      { ...geometria, acM: 0.3, hcM: 0.45, h1M: 0.3 },
      datos
    );
    expect(larga.cercos.caso).toBe("verticales");
    expect(larga.cercos.requeridos).toBe(true);
    expect(larga.cercos.asNecCm2).toBeCloseTo((0.5 * 450 / 434.782609) * 10, 6);
    expect(larga.cercos.numeroCercos).toBe(4);
  });

  it("con ac > hc/2 y F ≤ VRd,c no hacen falta cercos (§J.3(3))", () => {
    const liviana = calcularMensulaCorta(
      materiales,
      { ...geometria, acM: 0.3, hcM: 0.45, h1M: 0.3 },
      { ...datos, fEdKN: 50, hEdKN: 0 }
    );
    expect(liviana.cercos.vRdCKN).toBeGreaterThan(50);
    expect(liviana.cercos.requeridos).toBe(false);
    expect(liviana.cercos.numeroCercos).toBe(0);
    expect(liviana.cercos.verificaAs).toBe(true);
  });

  it("VRd,c de la ec. (6.2.a) con la cuantía real del marco", () => {
    // k = 1 + √(200/445) = 1,670; ρ = 9,425/(40·44,5) = 0,00529.
    const k = 1 + Math.sqrt(200 / 445);
    const rho = 9.42477796 / (40 * 44.5);
    const v = (0.18 / 1.5) * k * (100 * rho * 30) ** (1 / 3);
    expect(r.cercos.vRdCKN).toBeCloseTo(v * 0.4 * 0.445 * 1000, 6);
  });

  it("aviso de Montoya: cuenta los cercos por debajo de 2·d/3, sin quitarlos", () => {
    expect(r.cercos.limite2d3M).toBeCloseTo(0.296666667, 9);
    expect(r.cercos.cercosBajo2d3).toBe(1);
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
    // σsd = 3203,09/9,425 = 339,86 MPa con el acero realmente puesto.
    expect(r.anclaje.sigmaSdMPa).toBeCloseTo(3203.08989 / 9.42477796, 4);
    expect(r.anclaje.lbRqdMm).toBeCloseTo((20 / 4) * (339.858393 / 3.041292), 3);
  });

  it("baja fbd un 30 % con adherencia mala", () => {
    const mala = calcularMensulaCorta(materiales, geometria, {
      ...datos,
      condicionAdherencia: "mala",
    });
    expect(mala.anclaje.eta1).toBe(0.7);
    expect(mala.anclaje.fbdMPa).toBeCloseTo(2.128904, 6);
    expect(mala.anclaje.lbRqdMm).toBeCloseTo(558.740235 / 0.7, 3);
  });

  it("aplica α5 sólo del lado de la ménsula, donde hay presión transversal", () => {
    // Con 3 barras la luz libre es (330 − 60)/2 = 135: cd lo da el recubrimiento.
    expect(r.anclaje.cdMm).toBeCloseTo(45, 6);
    expect(r.anclaje.alfa1).toBe(1);
    expect(r.anclaje.alfa2).toBe(1);
    expect(r.anclaje.alfa3).toBe(1);
    expect(r.anclaje.alfa4).toBe(1);
    expect(r.anclaje.presionTransversalMPa).toBeCloseTo(10, 9);
    expect(r.anclaje.alfa5).toBeCloseTo(0.7, 9);
    // Ec. (8.5): el producto α2·α3·α5 no baja de 0,7, y acá lo toca justo.
    expect(r.anclaje.lbdMensulaMm).toBeCloseTo(0.7 * 558.740235, 3);
    expect(r.anclaje.lbdPilarMm).toBeCloseTo(558.740235, 3);
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
    expect(mala.anclaje.lbdPilarMm).toBeCloseTo(558.740235 / 0.7, 3);
    // 798,2 − 310 de tramo recto = 488,2 → 490 mm.
    expect(mala.anclaje.pataPilarMm).toBe(490);
    expect(mala.anclaje.verificaPilar).toBe(true);
  });

  it("nunca baja de la longitud mínima del art. 8.4.4(1)", () => {
    // lb,mín = máx(0,3·lb,rqd; 10ø; 100 mm).
    expect(r.anclaje.lbMinMm).toBeCloseTo(200, 9);
    expect(r.anclaje.lbMinMm).toBeGreaterThanOrEqual(0.3 * r.anclaje.lbRqdMm);
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
    // Sin el límite de 2·d/3 el paquete baja hasta donde queda vuelo para
    // cerrar el cerco, y el último se acorta siguiendo el intradós.
    expect(r.despiece.cercos.map((c) => c.luzM)).toEqual([
      expect.closeTo(0.615, 6),
      expect.closeTo(0.615, 6),
      expect.closeTo(0.44, 6),
    ]);
    // El cerco cerrado desarrolla dos veces la luz más dos veces el ancho.
    expect(r.despiece.cercos[0].desarrolloM).toBeCloseTo(1.89, 9);
    expect(r.despiece.luzCercoMaximaM).toBeCloseTo(0.615, 6);
    expect(r.despiece.luzCercoMinimaM).toBeCloseTo(0.44, 6);
  });

  it("en el caso vertical sólo van los verticales", () => {
    const larga = calcularMensulaCorta(
      materiales,
      { ...geometria, acM: 0.3, hcM: 0.45, h1M: 0.3 },
      datos
    );
    const verticales = larga.despiece.cercos.filter((c) => c.tipo === "vertical");
    const horizontales = larga.despiece.cercos.filter((c) => c.tipo === "horizontal");
    expect(verticales).toHaveLength(4);
    // La familia horizontal que cuantificaba Montoya ya no se agrega.
    expect(horizontales).toHaveLength(0);
    // Los verticales se acortan siguiendo el intradós inclinado.
    expect(verticales.map((c) => c.luzM)).toEqual([
      expect.closeTo(0.321310345, 8),
      expect.closeTo(0.300620690, 8),
      expect.closeTo(0.279931034, 8),
      expect.closeTo(0.259241379, 8),
    ]);
  });
});
