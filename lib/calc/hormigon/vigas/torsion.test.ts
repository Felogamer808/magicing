import { describe, expect, it } from "vitest";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";
import { calcularTorsion, calcularVigaConTorsion } from "@/lib/calc/hormigon/vigas/torsion";

// La planilla asumía siempre un estribo de 6 mm para ubicar las barras. Estos
// casos reproducen sus números, así que lo fijan igual; el diámetro real se
// prueba aparte.
const ESTRIBO_PLANILLA_MM = 6;

// Caso real de la hoja "VIGAS CON TORSION" de CALCULOS TODO.xlsx, con Td=30 kN·m
// cargado en la celda L22 (en la planilla queda en 0, que no ejercita nada).
// Todos los valores esperados salen de recalcular esa hoja con Excel.

const materiales = derivarMateriales({ fck: 30, fyk: 500 });
const geometria = { b: 0.2, h: 0.7, recubrimiento: 0.035, diametroEstriboMm: ESTRIBO_PLANILLA_MM };

/*
 * Anejo 19, art. 6.3.2, a mano. b = 0,20, h = 0,70, fck = 30, Td = 30 kN·m:
 *   A/u = 0,14/1,8 = 0,077778 m (sin distancia al eje no hay mínimo)
 *   Ak = (0,2 − 0,077778)·(0,7 − 0,077778) = 0,076049 m², uk = 1,488889 m
 *   ν = 0,6·(1 − 30/250) = 0,528                                   (6.6)
 *   TRd,max = 2·0,528·20 000·0,076049·0,077778·0,5 = 62,4619 kN·m  (6.30)
 *   fctd = 0,7·0,3·30^(2/3)/1,5 = 1,35169 MPa                      (3.16)
 *   TRd,c = 2·0,076049·0,077778·1351,69 = 15,9903 kN·m
 *   At = 30/(2·0,076049·400 000)·10⁴ = 4,93101 cm²/m
 *   ΣAsl = 30·1,488889/(2·0,076049·434 783)·10⁴ = 6,75438 cm²      (6.28)
 * La planilla (EHE-08) daba Tu1 = 42,59 con 0,36·fcd y ΣAsl = 7,34 con 400 MPa.
 */
describe("torsión: sección hueca equivalente", () => {
  const r = calcularTorsion(materiales, geometria, { td: 30 });

  it("geometría equivalente (tef, uk, Ak)", () => {
    expect(r.tM).toBeCloseTo(0.0777777777777778, 9);
    expect(r.ueM).toBeCloseTo(1.48888888888889, 9);
    expect(r.aeM2).toBeCloseTo(0.0760493827160494, 9);
  });

  it("bielas con TRd,max de la (6.30)", () => {
    expect(r.nu).toBeCloseTo(0.528, 12);
    expect(r.tRdMaxKNm).toBeCloseTo(62.461893, 5);
    expect(r.verificaBielas).toBe(true);
  });

  it("armaduras: transversal con fywd, longitudinal con fyd (6.28)", () => {
    expect(r.atCm2PorM).toBeCloseTo(4.93100649350649, 6);
    expect(r.alCm2).toBeCloseTo(6.754383, 5);
    expect(r.alPorCaraCm2).toBeCloseTo(6.754383 / 4, 5);
  });

  it("torsor de fisuración con τt = fctd", () => {
    expect(r.fctdMPa).toBeCloseTo(1.351685, 5);
    expect(r.tRdCKNm).toBeCloseTo(15.990305, 5);
  });

  it("no verifica las bielas si el torsor supera TRd,max", () => {
    const sobrecargada = calcularTorsion(materiales, geometria, { td: 70 });
    expect(sobrecargada.verificaBielas).toBe(false);
  });

  it("el espesor no baja de 2 veces la distancia del borde al eje de la barra", () => {
    // c = 0,035 + 0,006 + 0,0125 = 0,0535 → 2c = 0,107 > A/u = 0,0778
    const conMinimo = calcularTorsion(materiales, geometria, { td: 30, distanciaEjeArmaduraM: 0.0535 });
    expect(conMinimo.tMinimoM).toBeCloseTo(0.107, 12);
    expect(conMinimo.tM).toBeCloseTo(0.107, 12);
    expect(conMinimo.aeM2).toBeCloseTo(0.093 * 0.593, 12);
  });
});

describe("viga con torsión: interacción con flexión y cortante", () => {
  const r = calcularVigaConTorsion(materiales, geometria, {
    torsion: { td: 30 },
    momentoPositivo: 219,
    momentoNegativo: 235,
    armaduraPositiva: { numero: 2, diametroMm: 25 },
    armaduraNegativa: { numero: 2, diametroMm: 25 },
    cortante: { vd: 405, diametroEstriboMm: 8, numeroRamas: 6 },
  });

  it("reproduce el canto útil de la planilla", () => {
    expect(r.d).toBeCloseTo(0.6465, 9);
  });

  it("suma Al/4 al As necesario de la armadura positiva", () => {
    expect(r.flexionPositiva.mu).toBeCloseTo(0.130992691325592, 9);
    expect(r.flexionPositiva.omega).toBeCloseTo(0.140922228579498, 9);
    expect(r.flexionPositiva.asCalculadoCm2).toBeCloseTo(8.38177231145141, 6);
    // Con tef = 0,107 (mínimo 2c): Ak = 0,055149, uk = 1,372 y
    // ΣAsl = 30·1,372/(2·0,055149·434 783)·10⁴ = 8,58293 cm², Al/4 = 2,14573.
    // As,nec = As por momento + Al/4 = 8,38177 + 2,14573
    expect(r.torsion.alPorCaraCm2).toBeCloseTo(2.145732, 5);
    expect(r.flexionPositiva.asNecCm2).toBeCloseTo(8.38177231145141 + 2.145732, 5);
    expect(r.flexionPositiva.asRealCm2).toBeCloseTo(9.81747704246811, 6);
    expect(r.flexionPositiva.verificaAs).toBe(false);
  });

  it("suma Al/4 al As necesario de la armadura negativa", () => {
    expect(r.flexionNegativa.asCalculadoCm2).toBeCloseTo(9.04871799043734, 6);
    expect(r.flexionNegativa.asNecCm2).toBeCloseTo(9.04871799043734 + 2.145732, 5);
    expect(r.flexionNegativa.verificaAs).toBe(false);
  });

  // El cortante ya no reproduce la planilla: se unificó contra el Anejo 19,
  // art. 6.2.2 (ver la nota en vigas-flexion-cortante.test.ts). Acá la cuantía
  // es alta (ρl = 0,76 %), así que pasa a mandar el término principal en vez del
  // mínimo y el efecto neto es chico: VRd,c adoptado baja de 68,74 a 68,45 kN.
  it("reproduce el cortante y suma At a la armadura transversal", () => {
    expect(r.cortante.k).toBeCloseTo(1.55619967815515, 9);
    expect(r.cortante.rhoL).toBeCloseTo(0.00759278966934888, 9);
    expect(r.cortante.vRdC).toBeCloseTo(68.4467187591506, 6);
    expect(r.cortante.vRdCMin).toBeCloseTo(48.1199512106189, 6);
    expect(r.cortante.vEdEstribos).toBeCloseTo(336.553281240849, 6);
    expect(r.cortante.a90NecCm2PorM).toBeCloseTo(14.4604829956539, 6);
    expect(r.cortante.a90MinCm2PorM).toBeCloseTo(1.93097876921126, 6);
    // At = 30/(2·0,055149·400 000)·10⁴ = 6,79976 cm²/m
    // A90 = max(nec, min) + At = 14,46048 + 6,79976
    expect(r.torsion.atCm2PorM).toBeCloseTo(6.799761, 5);
    expect(r.cortante.a90Cm2PorM).toBeCloseTo(14.4604829956539 + 6.799761, 5);
  });

  it("estribado adoptado (6 ramas φ8 cada 14 cm)", () => {
    expect(r.cortante.aEstriboCm2).toBeCloseTo(3.0159289474462, 6);
    // s = 3,01593/21,26024 = 0,14186 m, redondeada al centímetro: 0,14
    expect(r.cortante.separacionNecM).toBeCloseTo(3.0159289474462 / (14.4604829956539 + 6.799761), 5);
    expect(r.cortante.separacionMaxM).toBeCloseTo(0.3879, 6);
    expect(r.cortante.separacionAdoptadaM).toBeCloseTo(0.14, 9);
    expect(r.cortante.areaRealCm2PorM).toBeCloseTo(3.0159289474462 / 0.14, 6);
  });

  // Este mismo caso es la mejor ilustración de por qué hacía falta la
  // comprobación: cada esfuerzo verifica cómodo por separado —Td = 30 contra
  // TRd,max = 62,3, y Vd = 405 contra VRd,max = 698,2— pero los dos comprimen
  // las mismas bielas y la suma pasa de 1. Con 2Ø25 y estribo de 6 mm,
  // c = 0,0535 y tef = 2c = 0,107 m: Ak = 0,093·0,593 = 0,055149 m² y
  // TRd,max = 2·0,528·20 000·0,055149·0,107·0,5 = 62,3140 kN·m.
  it("detecta lo que las dos comprobaciones sueltas dejaban pasar", () => {
    expect(r.torsion.verificaBielas).toBe(true);
    expect(r.cortante.verificaVRdMax).toBe(true);

    expect(r.torsion.tM).toBeCloseTo(0.107, 12);
    expect(r.torsion.tRdMaxKNm).toBeCloseTo(62.313958, 5);
    expect(r.interaccionBielas).toBeCloseTo(30 / 62.313958 + 405 / r.cortante.vRdMax, 6);
    expect(r.interaccionBielas).toBeGreaterThan(1);
    expect(r.verificaInteraccionBielas).toBe(false);
  });

  it("con esos esfuerzos hace falta armadura de torsión (6.31)", () => {
    expect(r.interaccionFisuracion).toBeGreaterThan(1);
    expect(r.soloArmaduraMinima).toBe(false);
  });

  it("con esfuerzos chicos alcanza la armadura mínima (6.31)", () => {
    const chica = calcularVigaConTorsion(materiales, geometria, {
      torsion: { td: 2 },
      momentoPositivo: 50,
      momentoNegativo: 50,
      armaduraPositiva: { numero: 2, diametroMm: 25 },
      armaduraNegativa: { numero: 2, diametroMm: 25 },
      cortante: { vd: 20, diametroEstriboMm: 8, numeroRamas: 2 },
    });
    // 2/15,95 + 20/VRd,c: los dos términos chicos, la suma bajo 1.
    expect(chica.interaccionFisuracion).toBeLessThan(1);
    expect(chica.soloArmaduraMinima).toBe(true);
  });

  it("con esfuerzos moderados la interacción se cumple", () => {
    const moderada = calcularVigaConTorsion(materiales, geometria, {
      torsion: { td: 12 },
      momentoPositivo: 219,
      momentoNegativo: 235,
      armaduraPositiva: { numero: 2, diametroMm: 25 },
      armaduraNegativa: { numero: 2, diametroMm: 25 },
      cortante: { vd: 200, diametroEstriboMm: 8, numeroRamas: 6 },
    });
    expect(moderada.interaccionBielas).toBeLessThan(1);
    expect(moderada.verificaInteraccionBielas).toBe(true);
  });

  it("sin torsión, los resultados coinciden con la viga simple", () => {
    const sinTorsion = calcularVigaConTorsion(materiales, geometria, {
      torsion: { td: 0 },
      momentoPositivo: 219,
      momentoNegativo: 235,
      armaduraPositiva: { numero: 2, diametroMm: 25 },
      armaduraNegativa: { numero: 2, diametroMm: 25 },
      cortante: { vd: 405, diametroEstriboMm: 8, numeroRamas: 6 },
    });
    expect(sinTorsion.torsion.atCm2PorM).toBeCloseTo(0, 9);
    expect(sinTorsion.torsion.alCm2).toBeCloseTo(0, 9);
    // Sin el aporte de torsión, el As necesario vuelve al de flexión pura.
    expect(sinTorsion.flexionPositiva.asNecCm2).toBeCloseTo(8.38177231145141, 6);
    expect(sinTorsion.cortante.a90Cm2PorM).toBeCloseTo(14.4604829956539, 6);
  });
});
