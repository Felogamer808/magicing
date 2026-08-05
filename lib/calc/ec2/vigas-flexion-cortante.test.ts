import { describe, expect, it } from "vitest";
import { derivarMateriales } from "./materiales";
import {
  calcularCantoUtil,
  calcularCortante,
  calcularDisposicionArmadura,
  calcularFlexion,
} from "./vigas-flexion-cortante";

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

  it("reproduce VRd,max y su verificación", () => {
    expect(r.vRdMax).toBeCloseTo(3504.6, 3);
    expect(r.verificaVRdMax).toBe(true);
  });

  it("reproduce k y ρl", () => {
    expect(r.k).toBeCloseTo(1.55512738165337, 4);
    expect(r.rhoL).toBeCloseTo(0.00096813332930348, 6);
  });

  it("reproduce VRd,c y VRd,c,min", () => {
    expect(r.vRdC).toBeCloseTo(129.600094002281, 3);
    expect(r.vRdCMin).toBeCloseTo(310.217854753575, 3);
  });

  it("reproduce el cortante a resistir por estribos y las áreas necesarias", () => {
    expect(r.vEdEstribos).toBeCloseTo(765.782145246425, 3);
    expect(r.a90NecCm2PorM).toBeCloseTo(32.7761575606242, 3);
    expect(r.a90MinCm2PorM).toBeCloseTo(8.68940446145067, 3);
    expect(r.a90Cm2PorM).toBeCloseTo(32.7761575606242, 3);
  });

  it("reproduce la separación adoptada y el área real (6 ramas φ10 cada 10 cm)", () => {
    expect(r.aEstriboCm2).toBeCloseTo(4.71238898038469, 6);
    expect(r.separacionNecM).toBeCloseTo(0.143774906246055, 6);
    expect(r.separacionMaxM).toBeCloseTo(0.3894, 6);
    expect(r.separacionAdoptadaM).toBeCloseTo(0.1, 6);
    expect(r.areaRealCm2PorM).toBeCloseTo(47.1238898038469, 3);
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
