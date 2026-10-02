import { describe, expect, it } from "vitest";
// Las magnitudes del agotamiento (x, z y la deformación del acero) se derivan de
// ω y alimentan el diagrama de rotura. Se comprueban acá y no en el dibujo.
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";
import {
  calcularCantoUtil,
  calcularCortante,
  calcularDisposicionArmadura,
  calcularFlexion,
  momentoReducidoLimite,
} from "@/lib/calc/hormigon/vigas/flexion-cortante";

// La planilla asumía siempre un estribo de 6 mm para ubicar las barras. Estos
// casos reproducen sus números, así que lo fijan igual; el diámetro real se
// prueba aparte.
const ESTRIBO_PLANILLA_MM = 6;

// Caso real extraído de la planilla "CALCULOS TODO.xlsx", hoja "VIGAS 1", bloque "VIGA".
// Los valores esperados son los que produce Excel; sirven para garantizar paridad numérica.

describe("materiales EC2", () => {
  const materiales = derivarMateriales({ fck: 30, fyk: 500 });

  it("deriva fcd, fctm, fyd y fydEstribos como en la planilla", () => {
    expect(materiales.fcd).toBeCloseTo(20, 6);
    expect(materiales.fctm).toBeCloseTo(2.89646815381689, 6);
    expect(materiales.fyd).toBeCloseTo(434.782608695652, 6);
    expect(materiales.fydEstribos).toBeCloseTo(400, 6);
  });
});

describe("canto útil", () => {
  it("coincide con F7 de la planilla", () => {
    const d = calcularCantoUtil({ b: 0.9, h: 0.7, recubrimiento: 0.04, diametroEstriboMm: ESTRIBO_PLANILLA_MM }, [{ numero: 10, diametroMm: 10 }]);
    expect(d).toBeCloseTo(0.649, 9);
  });
});

describe("flexión positiva (bloque VIGA)", () => {
  const materiales = derivarMateriales({ fck: 30, fyk: 500 });
  const geometria = { b: 0.9, h: 0.7, recubrimiento: 0.04, diametroEstriboMm: ESTRIBO_PLANILLA_MM };
  const d = calcularCantoUtil(geometria, [{ numero: 10, diametroMm: 10 }]);

  const r = calcularFlexion(materiales, geometria, d, {
    momento: 32,
    armaduraReal: [{ numero: 10, diametroMm: 10 }],
  });

  it("reproduce μ, ω y As calculado", () => {
    expect(r.mu).toBeCloseTo(0.00422073494074748, 9);
    expect(r.omega).toBeCloseTo(0.00422968003735669, 9);
    expect(r.asCalculadoCm2).toBeCloseTo(1.13645581051722, 6);
  });

  /*
   * La planilla daba 17,64 cm²: mínimo geométrico de 2,8 ‰ de la EHE‑08, que
   * no es del Anejo 19. El valor de acá sale a mano de la ec. (9.1),
   * art. 9.2.1.1 (1), pág. 140, con fctm,fl de la ec. (3.23), pág. 31:
   *   h = 700 mm → 1,6 − 0,7 = 0,9 < 1, fctm,fl = fctm = 0,3·30^(2/3) = 2,8965 MPa
   *   W/z = (0,9·0,7²/6)/(0,8·0,7) = 0,13125 m²
   *   As,min = 0,13125 · 2,8965/434,78 · 10⁴ = 8,7437 cm²
   */
  it("aplica la cuantía mínima del Anejo 19, ec. (9.1)", () => {
    expect(r.fctmFlMPa).toBeCloseTo(2.896468, 5);
    expect(r.asMinCm2).toBeCloseTo(8.743713, 5);
    expect(r.asNecCm2).toBeCloseTo(8.743713, 5); // gobierna el mínimo: As calculado es 1,14 cm²
  });

  it("en cantos chicos fctm,fl crece con (1,6 − h)", () => {
    const losa = { b: 1, h: 0.2, recubrimiento: 0.03, diametroEstriboMm: ESTRIBO_PLANILLA_MM };
    const rLosa = calcularFlexion(materiales, losa, 0.16, { momento: 5, armaduraReal: [{ numero: 5, diametroMm: 10 }] });
    expect(rLosa.fctmFlMPa).toBeCloseTo(1.4 * 2.896468, 5);
  });

  it("reproduce As real y no verifica (igual que en Excel: I13=FALSO)", () => {
    expect(r.asRealCm2).toBeCloseTo(7.85398163397448, 6);
    expect(r.verificaAs).toBe(false);
  });

  it("entra en una sola fila (b=0.9m sobra espacio para 10φ10)", () => {
    expect(r.capas).toEqual([{ numero: 10, diametroMm: 10, distanciaM: expect.any(Number) }]);
    expect(r.capacidadPorGrupo[0]).toBeGreaterThanOrEqual(10);
    expect(r.distanciaCentroideM).toBeCloseTo(0.051, 6);
    expect(r.verificaEntraEnAncho).toBe(true);
  });
});

describe("flexión negativa (bloque VIGA, con mínimo corregido)", () => {
  const materiales = derivarMateriales({ fck: 30, fyk: 500 });
  const geometria = { b: 0.9, h: 0.7, recubrimiento: 0.04, diametroEstriboMm: ESTRIBO_PLANILLA_MM };
  const d = calcularCantoUtil(geometria, [{ numero: 10, diametroMm: 10 }]); // mismo canto que la positiva, como en la planilla

  const r = calcularFlexion(materiales, geometria, d, {
    momento: 14,
    armaduraReal: [{ numero: 5, diametroMm: 12 }],
  });

  it("reproduce μ, ω y As calculado", () => {
    expect(r.mu).toBeCloseTo(0.00184657153657702, 9);
    expect(r.omega).toBeCloseTo(0.00184827960532674, 9);
    expect(r.asCalculadoCm2).toBeCloseTo(0.496606854036821, 6);
  });

  // Antes 17,64 cm² (2,8 ‰ de la EHE‑08); ahora la ec. (9.1) del Anejo 19,
  // igual que en positiva porque W es el mismo respecto de las dos caras.
  it("aplica la cuantía mínima también en negativa (a diferencia del Excel original)", () => {
    expect(r.asNecCm2).toBeCloseTo(8.743713, 5);
    expect(r.asRealCm2).toBeCloseTo(5.65486677646163, 6);
    // En la planilla original esto daba VERDADERO por el bug de L9=MAX(L8) sin mínimo.
    expect(r.verificaAs).toBe(false);
  });
});

describe("cortante (bloque VIGA)", () => {
  const materiales = derivarMateriales({ fck: 30, fyk: 500 });
  const geometria = { b: 0.9, h: 0.7, recubrimiento: 0.04, diametroEstriboMm: ESTRIBO_PLANILLA_MM };
  const d = calcularCantoUtil(geometria, [{ numero: 10, diametroMm: 10 }]);
  const asNegativaRealCm2 = 5.65486677646163;

  const r = calcularCortante(materiales, geometria, d, asNegativaRealCm2, {
    vd: 1076,
    diametroEstriboMm: 10,
    numeroRamas: 6,
  });

  // La planilla daba 3504,6 kN con 0,30·fcd·b·d, que es la Vu1 de la EHE-08.
  // El art. 6.2.3(3) usa el brazo z = 0,9d en vez del canto útil d, y con
  // α_cw = 1, ν1 = 0,6 y θ = 45° queda 0,27·fcd·b·d = 3154,14 kN.
  it("agota las bielas según el art. 6.2.3(3), no según la Vu1 de la EHE-08", () => {
    expect(r.vRdMax).toBeCloseTo(3154.14, 3);
    expect(r.verificaVRdMax).toBe(true);
  });

  it("reproduce k y ρl", () => {
    expect(r.k).toBeCloseTo(1.55512738165337, 4);
    expect(r.rhoL).toBeCloseTo(0.00096813332930348, 6);
  });

  // Estos cuatro tests ya no reproducen la planilla, y es a propósito. La hoja
  // calculaba VRd,c con C_Rd,c = 0,15/γc y el mínimo con 0,075/γc·k^1,5·√fck:
  // el segundo es el mínimo de la EHE-08 (la norma anterior) y el primero no es
  // de ninguna norma, parece un 0,18 mal transcripto. Se unificó contra el
  // Anejo 19, art. 6.2.2, ec. (6.2.a) y (6.2.b), pág. 76.
  //
  // Con la cuantía baja de este caso (ρl = 0,097 %) manda el mínimo, así que el
  // cambio pesa: VRd,c adoptado baja de 310,2 a 217,2 kN y los estribos tienen
  // que tomar 93 kN más. La separación necesaria pasa de 14,4 a 12,8 cm.
  it("aplica C_Rd,c = 0,18/γc y v_min = 0,035·k^1,5·√fck (Anejo 19, 6.2.2)", () => {
    expect(r.vRdC).toBeCloseTo(155.520112802738, 3);
    expect(r.vRdCMin).toBeCloseTo(217.152498327503, 3);
  });

  it("reproduce el cortante a resistir por estribos y las áreas necesarias", () => {
    expect(r.vEdEstribos).toBeCloseTo(858.847501672497, 3);
    expect(r.a90NecCm2PorM).toBeCloseTo(36.7594376678864, 3);
    expect(r.a90MinCm2PorM).toBeCloseTo(8.68940446145067, 3);
    expect(r.a90Cm2PorM).toBeCloseTo(36.7594376678864, 3);
  });

  it("reproduce la separación adoptada y el área real (6 ramas φ10 cada 10 cm)", () => {
    expect(r.aEstriboCm2).toBeCloseTo(4.71238898038469, 6);
    expect(r.separacionNecM).toBeCloseTo(0.128195350074724, 6);
    expect(r.separacionMaxM).toBeCloseTo(0.3894, 6);
    expect(r.separacionAdoptadaM).toBeCloseTo(0.1, 6);
    expect(r.areaRealCm2PorM).toBeCloseTo(47.1238898038469, 3);
  });

  it("el mínimo manda sólo con cuantías bajas, como pide el articulado", () => {
    // Con ρl alta el término principal supera al mínimo y la (6.2.a) gobierna.
    const conCuantiaAlta = calcularCortante(materiales, geometria, d, 120, {
      vd: 1076,
      diametroEstriboMm: 10,
      numeroRamas: 6,
    });
    expect(conCuantiaAlta.vRdC).toBeGreaterThan(conCuantiaAlta.vRdCMin);
    expect(r.vRdCMin).toBeGreaterThan(r.vRdC);
  });
});

describe("armadura que no entra en una fila (viga angosta)", () => {
  // b=0.3m, recubrimiento=0.04m, estribo asumido 6mm: ancho disponible = 0.208m.
  // 6 barras φ20 con separación mínima de 20mm no entran en una fila (caben 5) → 2 filas de 3.
  const geometria = { b: 0.3, h: 0.5, recubrimiento: 0.04, diametroEstriboMm: ESTRIBO_PLANILLA_MM };
  const armadura = [{ numero: 6, diametroMm: 20 }];

  it("calcula la capacidad por fila y reparte en 2 capas de 3", () => {
    const disposicion = calcularDisposicionArmadura(geometria, armadura);
    expect(disposicion.capacidadPorGrupo).toEqual([5]);
    expect(disposicion.filas.map((f) => f.numero)).toEqual([3, 3]);
    expect(disposicion.filas.every((f) => f.diametroMm === 20)).toBe(true);
    expect(disposicion.verificaEntraEnAncho).toBe(true);
  });

  it("el centroide se aleja de la fibra traccionada y el canto útil se achica", () => {
    const disposicion = calcularDisposicionArmadura(geometria, armadura);
    // capa 0: 0.04+0.006+0.01=0.056 · capa 1: 0.056+(0.02+0.02)=0.096 → promedio 0.076
    expect(disposicion.distanciaCentroideM).toBeCloseTo(0.076, 6);

    const d = calcularCantoUtil(geometria, armadura);
    expect(d).toBeCloseTo(0.5 - 0.076, 6);
  });
});

describe("armadura con dos capas de diámetro distinto (ej. 2Ø16 + 2Ø20)", () => {
  const geometria = { b: 0.3, h: 0.5, recubrimiento: 0.04, diametroEstriboMm: ESTRIBO_PLANILLA_MM };
  const grupos = [
    { numero: 2, diametroMm: 16 },
    { numero: 2, diametroMm: 20 },
  ];

  it("no auto-reparte cada grupo (entran solos) y apila un grupo sobre el otro", () => {
    const disposicion = calcularDisposicionArmadura(geometria, grupos);
    expect(disposicion.filas).toHaveLength(2);
    expect(disposicion.filas[0]).toMatchObject({ numero: 2, diametroMm: 16 });
    expect(disposicion.filas[1]).toMatchObject({ numero: 2, diametroMm: 20 });
    expect(disposicion.verificaEntraEnAncho).toBe(true);
  });

  it("la separación vertical entre filas usa el mayor de los dos diámetros (art. 8.2(2))", () => {
    const disposicion = calcularDisposicionArmadura(geometria, grupos);
    // fila 0 (Ø16): borde = 0.04+0.006+0.008 = 0.054
    const distanciaFila0 = 0.04 + 0.006 + 0.016 / 2;
    expect(disposicion.filas[0].distanciaM).toBeCloseTo(distanciaFila0, 9);
    // separación libre vertical = max(16, 20, 20)/1000 = 0.02 (manda el Ø20, el mayor en juego)
    const bordeFila1 = 0.04 + 0.006 + 0.016 + 0.02;
    const distanciaFila1 = bordeFila1 + 0.02 / 2;
    expect(disposicion.filas[1].distanciaM).toBeCloseTo(distanciaFila1, 9);
  });

  it("el centroide pondera por área, no por cantidad de barras", () => {
    const disposicion = calcularDisposicionArmadura(geometria, grupos);
    const areaCm2 = (diametroMm: number) => (Math.PI * diametroMm ** 2) / 4 / 100;
    const area16 = 2 * areaCm2(16);
    const area20 = 2 * areaCm2(20);
    const distanciaFila0 = 0.04 + 0.006 + 0.016 / 2;
    const distanciaFila1 = 0.04 + 0.006 + 0.016 + 0.02 + 0.02 / 2;
    const centroideEsperado = (area16 * distanciaFila0 + area20 * distanciaFila1) / (area16 + area20);
    expect(disposicion.distanciaCentroideM).toBeCloseTo(centroideEsperado, 9);
    expect(disposicion.areaTotalCm2).toBeCloseTo(area16 + area20, 6);
  });

  it("cada grupo se auto-reparte primero si no entra solo, y después se apilan los grupos", () => {
    // Grupo 0: 8Ø20 no entra en una sola fila (caben 5) → se reparte en 2 filas antes de
    // apilar el grupo 1 encima.
    const grupos2 = [
      { numero: 8, diametroMm: 20 },
      { numero: 2, diametroMm: 12 },
    ];
    const disposicion = calcularDisposicionArmadura(geometria, grupos2);
    expect(disposicion.filas.map((f) => ({ numero: f.numero, diametroMm: f.diametroMm }))).toEqual([
      { numero: 4, diametroMm: 20 },
      { numero: 4, diametroMm: 20 },
      { numero: 2, diametroMm: 12 },
    ]);
  });
});

describe("geometría del agotamiento", () => {
  const materiales = derivarMateriales({ fck: 25, fyk: 500 });
  const geometria = { b: 0.3, h: 0.5, recubrimiento: 0.04, diametroEstriboMm: ESTRIBO_PLANILLA_MM };
  const d = 0.45;
  const armadura = [{ diametroMm: 16, numero: 4 }];

  const flexion = (momento: number) =>
    calcularFlexion(materiales, geometria, d, { momento, armaduraReal: armadura });

  it("x y z salen de ω por las relaciones del bloque rectangular", () => {
    const r = flexion(150);
    // ω·d = 0,8·x, y z = d·(1 − ω/2).
    expect(r.xM).toBeCloseTo((r.omega * d) / 0.8, 9);
    expect(r.zM).toBeCloseTo(d * (1 - r.omega / 2), 9);
    // El brazo siempre queda entre la fibra neutra y el canto útil.
    expect(r.zM).toBeLessThan(d);
    expect(r.zM).toBeGreaterThan(d - r.xM);
  });

  it("el equilibrio cierra: la compresión del bloque iguala a la tracción", () => {
    const r = flexion(150);
    const compresionKN = 0.8 * r.xM * geometria.b * materiales.fcd * 1000;
    const traccionKN = (r.asCalculadoCm2 / 1e4) * materiales.fyd * 1000;
    expect(compresionKN).toBeCloseTo(traccionKN, 3);
  });

  it("más momento baja la fibra neutra y acerca el acero a no fluir", () => {
    const flojo = flexion(80);
    const cargado = flexion(260);

    expect(cargado.xM).toBeGreaterThan(flojo.xM);
    expect(cargado.zM).toBeLessThan(flojo.zM);
    expect(cargado.deformacionAcero).toBeLessThan(flojo.deformacionAcero);
  });

  it("la deformación del acero sale del diagrama de deformaciones con εcu = 3,5 ‰", () => {
    const r = flexion(150);
    expect(r.deformacionAcero).toBeCloseTo((0.0035 * (d - r.xM)) / r.xM, 9);
    // Con esta armadura y este momento la sección es dúctil: el acero fluye.
    expect(r.deformacionAcero).toBeGreaterThan(materiales.fyd / 200000);
  });
});

/*
 * Límite para que la armadura de tracción fluya. A mano, B500 (fyd = 434,78):
 *   εyd = 434,78/200000 = 2,1739 ‰
 *   ξlim = 3,5/(3,5 + 2,1739) = 0,61686   (tabla 3.1 y art. 3.2.7 (4))
 *   ωlim = 0,8·0,61686 = 0,49349           (art. 3.1.7 (3), ec. (3.19))
 *   μlim = 0,49349·(1 − 0,49349/2) = 0,37172
 */
describe("límite de μ: el acero tiene que fluir", () => {
  const materiales = derivarMateriales({ fck: 30, fyk: 500 });
  const geometria = { b: 0.3, h: 0.5, recubrimiento: 0.03, diametroEstriboMm: ESTRIBO_PLANILLA_MM };
  const d = 0.45;
  const armadura = [{ numero: 6, diametroMm: 25 }];

  it("μlim de B500 = 0,37172", () => {
    expect(momentoReducidoLimite(materiales.fyd)).toBeCloseTo(0.371722, 5);
  });

  it("por debajo del límite calcula As y el acero fluye", () => {
    // μ = 0,36: M = 0,36·0,3·0,45²·20·1000 = 437,4 kN·m
    const r = calcularFlexion(materiales, geometria, d, { momento: 437.4, armaduraReal: armadura });
    expect(r.sobrearmada).toBe(false);
    expect(r.mu).toBeCloseTo(0.36, 9);
    expect(r.deformacionAcero).toBeGreaterThanOrEqual(materiales.fyd / 200000);
  });

  it("por encima del límite marca la sección sobrearmada, sin As inventada", () => {
    // μ = 0,40: M = 486 kN·m. Con μ > 0,5 antes daba NaN sin explicación.
    for (const momento of [486, 700]) {
      const r = calcularFlexion(materiales, geometria, d, { momento, armaduraReal: armadura });
      expect(r.sobrearmada).toBe(true);
      expect(r.verificaAs).toBe(false);
      expect(Number.isNaN(r.asNecCm2)).toBe(true);
      expect(Number.isFinite(r.mu)).toBe(true);
    }
  });
});

/*
 * El estribo es el que se carga, no 6 mm fijos. A mano, b = 0,30, h = 0,50,
 * r = 0,04, 3Ø16 en una fila:
 *   Ø6:  centroide a 0,040 + 0,006 + 0,008 = 0,054 → d = 0,446 m
 *   Ø10: centroide a 0,040 + 0,010 + 0,008 = 0,058 → d = 0,442 m
 * y el ancho disponible baja de 0,30 − 2·0,046 = 0,208 a 0,30 − 2·0,050 = 0,200.
 */
describe("diámetro de estribo cargado", () => {
  const armadura = [{ numero: 3, diametroMm: 16 }];
  const conEstribo = (mm: number) => ({ b: 0.3, h: 0.5, recubrimiento: 0.04, diametroEstriboMm: mm });

  it("corre el canto útil con el diámetro real", () => {
    expect(calcularCantoUtil(conEstribo(6), armadura)).toBeCloseTo(0.446, 9);
    expect(calcularCantoUtil(conEstribo(10), armadura)).toBeCloseTo(0.442, 9);
  });

  it("achica el ancho disponible: 7Ø12 entran en una fila con Ø6 y no con Ø10", () => {
    // Por fila caben floor((ancho + s)/(Ø + s)), con s = máx(Ø, 20 mm) = 0,020:
    //   Ø6:  floor((0,208 + 0,020)/(0,012 + 0,020)) = floor(7,125) = 7
    //   Ø10: floor((0,200 + 0,020)/(0,012 + 0,020)) = floor(6,875) = 6
    const ancho6 = calcularDisposicionArmadura(conEstribo(6), [{ numero: 7, diametroMm: 12 }]);
    const ancho10 = calcularDisposicionArmadura(conEstribo(10), [{ numero: 7, diametroMm: 12 }]);
    expect(ancho6.capacidadPorGrupo[0]).toBe(7);
    expect(ancho10.capacidadPorGrupo[0]).toBe(6);
    expect(ancho6.filas).toHaveLength(1);
    expect(ancho10.filas).toHaveLength(2);
  });
});
