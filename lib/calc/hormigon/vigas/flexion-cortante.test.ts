import { describe, expect, it } from "vitest";
// Las magnitudes del agotamiento (x, z y la deformación del acero) se derivan de
// ω y alimentan el diagrama de rotura. Se comprueban acá y no en el dibujo.
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";
import {
  calcularCantoUtil,
  calcularCortante,
  calcularDisposicionArmadura,
  calcularFlexion,
} from "@/lib/calc/hormigon/vigas/flexion-cortante";

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
    const d = calcularCantoUtil(
      { b: 0.9, h: 0.7, recubrimiento: 0.04 },
      { numero: 10, diametroMm: 10 }
    );
    expect(d).toBeCloseTo(0.649, 9);
  });
});

describe("flexión positiva (bloque VIGA)", () => {
  const materiales = derivarMateriales({ fck: 30, fyk: 500 });
  const geometria = { b: 0.9, h: 0.7, recubrimiento: 0.04 };
  const d = calcularCantoUtil(geometria, { numero: 10, diametroMm: 10 });

  const r = calcularFlexion(materiales, geometria, d, {
    momento: 32,
    armaduraReal: { numero: 10, diametroMm: 10 },
  });

  it("reproduce μ, ω y As calculado", () => {
    expect(r.mu).toBeCloseTo(0.00422073494074748, 9);
    expect(r.omega).toBeCloseTo(0.00422968003735669, 9);
    expect(r.asCalculadoCm2).toBeCloseTo(1.13645581051722, 6);
  });

  it("reproduce los mínimos mecánico y geométrico", () => {
    expect(r.asMinMecanicoCm2).toBeCloseTo(12.09087, 4);
    expect(r.asMinGeometricoCm2).toBeCloseTo(17.64, 6);
    expect(r.asNecCm2).toBeCloseTo(17.64, 6); // domina el mínimo geométrico
  });

  it("reproduce As real y no verifica (igual que en Excel: I13=FALSO)", () => {
    expect(r.asRealCm2).toBeCloseTo(7.85398163397448, 6);
    expect(r.verificaAs).toBe(false);
  });

  it("entra en una sola fila (b=0.9m sobra espacio para 10φ10)", () => {
    expect(r.capas).toEqual([10]);
    expect(r.capacidadPorFila).toBeGreaterThanOrEqual(10);
    expect(r.distanciaCentroideM).toBeCloseTo(0.051, 6);
    expect(r.verificaEntraEnAncho).toBe(true);
  });
});

describe("flexión negativa (bloque VIGA, con mínimo corregido)", () => {
  const materiales = derivarMateriales({ fck: 30, fyk: 500 });
  const geometria = { b: 0.9, h: 0.7, recubrimiento: 0.04 };
  const d = calcularCantoUtil(geometria, { numero: 10, diametroMm: 10 }); // mismo canto que la positiva, como en la planilla

  const r = calcularFlexion(materiales, geometria, d, {
    momento: 14,
    armaduraReal: { numero: 5, diametroMm: 12 },
  });

  it("reproduce μ, ω y As calculado", () => {
    expect(r.mu).toBeCloseTo(0.00184657153657702, 9);
    expect(r.omega).toBeCloseTo(0.00184827960532674, 9);
    expect(r.asCalculadoCm2).toBeCloseTo(0.496606854036821, 6);
  });

  it("aplica el mínimo geométrico también en negativa (a diferencia del Excel original)", () => {
    expect(r.asNecCm2).toBeCloseTo(17.64, 6);
    expect(r.asRealCm2).toBeCloseTo(5.65486677646163, 6);
    // En la planilla original esto daba VERDADERO por el bug de L9=MAX(L8) sin mínimo.
    expect(r.verificaAs).toBe(false);
  });
});

describe("cortante (bloque VIGA)", () => {
  const materiales = derivarMateriales({ fck: 30, fyk: 500 });
  const geometria = { b: 0.9, h: 0.7, recubrimiento: 0.04 };
  const d = calcularCantoUtil(geometria, { numero: 10, diametroMm: 10 });
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
  const geometria = { b: 0.3, h: 0.5, recubrimiento: 0.04 };
  const armadura = { numero: 6, diametroMm: 20 };

  it("calcula la capacidad por fila y reparte en 2 capas de 3", () => {
    const disposicion = calcularDisposicionArmadura(geometria, armadura);
    expect(disposicion.capacidadPorFila).toBe(5);
    expect(disposicion.capas).toEqual([3, 3]);
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

describe("geometría del agotamiento", () => {
  const materiales = derivarMateriales({ fck: 25, fyk: 500 });
  const geometria = { b: 0.3, h: 0.5, recubrimiento: 0.04 };
  const d = 0.45;
  const armadura = { diametroMm: 16, numero: 4 };

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
