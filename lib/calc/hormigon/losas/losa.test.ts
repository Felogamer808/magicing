import { describe, expect, it } from "vitest";
import { calcularLosa, calcularMomentoResistenteLosa } from "@/lib/calc/hormigon/losas/losa";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";

// Caso real de la hoja "LOSAS" de CALCULOS TODO.xlsx:
// fck=30, fyk=500, e=0.15, rg positivos = rg negativos = 0.02,
// Mx+ = 50, My+ = 30, Mx- = 40, My- = 20 (kN·m/m).

const materiales = derivarMateriales({ fck: 30, fyk: 500 });
const geometria = { e: 0.15, recubrimientoPositivo: 0.02, recubrimientoNegativo: 0.02 };

const datos = {
  momentoPositivoX: 50,
  momentoPositivoY: 30,
  momentoNegativoX: 40,
  momentoNegativoY: 20,
  armadoPositivoX: { diametroMm: 12, separacionM: 0.1 },
  armadoPositivoY: { diametroMm: 10, separacionM: 0.15 },
  armadoNegativoX: { diametroMm: 12, separacionM: 0.15 },
  armadoNegativoY: { diametroMm: 10, separacionM: 0.15 },
};

describe("losa: cuantías mínimas", () => {
  const r = calcularLosa(materiales, geometria, datos);

  /*
   * La planilla daba 2,76 (0,04·e·fcd/fyd) y 2,70 (1,8 ‰·e), de la EHE‑08.
   * Anejo 19, art. 9.3.1.1 (1) → 9.2.1.1 (1), ec. (9.1), por metro, a mano:
   *   fctm,fl = (1,6 − 0,15)·0,3·30^(2/3) = 1,45·2,8965 = 4,19988 MPa  (3.23)
   *   As,min = 1·0,15·4,19988/(4,8·434,78)·10⁴ = 3,01866 cm²/m
   * En losas finas sube respecto de la EHE: fctm,fl crece al bajar el espesor.
   */
  it("aplica la cuantía mínima del Anejo 19, ec. (9.1), por metro", () => {
    expect(r.fctmFlMPa).toBeCloseTo(4.199879, 5);
    expect(r.asMinCm2PorM).toBeCloseTo(3.018663, 5);
    expect(r.positivo.y.asMinCm2PorM).toBeCloseTo(3.018663, 5);
  });
});

describe("losa: armado positivo", () => {
  const r = calcularLosa(materiales, geometria, datos);

  it("reproduce los cantos útiles, con X apoyada sobre Y", () => {
    // dy = e - rg - φy/2 = 0.15 - 0.02 - 0.005
    expect(r.positivo.y.dM).toBeCloseTo(0.125, 9);
    // dx = e - rg - φy - φx/2 = 0.15 - 0.02 - 0.010 - 0.006
    expect(r.positivo.x.dM).toBeCloseTo(0.114, 9);
  });

  it("reproduce el armado en X (que suma la malla de Y)", () => {
    expect(r.positivo.x.asNecCm2PorM).toBeCloseTo(11.306636412761, 6);
    expect(r.positivo.x.separacionNecM).toBeCloseTo(0.100027392232749, 9);
    expect(r.positivo.x.separacionMaxM).toBeCloseTo(0.1, 9);
    // As real X = φ12/10cm (11.31) + malla Y φ10/15cm (5.24)
    expect(r.positivo.x.asRealCm2PorM).toBeCloseTo(16.5457213089062, 6);
    expect(r.positivo.x.verificaAs).toBe(true);
    // Anclaje, Anejo 19 art. 8.4 (la planilla daba 205 mm con la EHE-08). A mano:
    //   e = 0,15 ≤ 0,25 → adherencia buena, η1 = 1 (fig. A19.8.2)
    //   fbd = 2,25·0,7·0,3·30^(2/3)/1,5 = 3,04129 MPa                (8.2)
    //   σsd = 434,78·11,3066/16,5457 = 297,112 MPa
    //   lb,rqd = (12/4)·297,112/3,04129 = 293,078 mm                  (8.3)
    //   cd = mín((100 − 12)/2, 20 + 10) = 30 → α2 = 1 − 0,15·(30 − 12)/12 = 0,775
    //   lbd = 0,775·293,078 = 227,135 mm (> mín. 120)
    expect(r.positivo.x.situacionAdherencia).toBe("buena");
    expect(r.positivo.x.anclaje.sigmaSdMPa).toBeCloseTo(297.111790, 5);
    expect(r.positivo.x.cdMm).toBeCloseTo(30, 9);
    expect(r.positivo.x.anclaje.lbdMm).toBeCloseTo(227.135379, 5);
  });

  it("reproduce el armado en Y, que con φ10/15cm no llega", () => {
    expect(r.positivo.y.asNecCm2PorM).toBeCloseTo(5.81394, 4);
    expect(r.positivo.y.asRealCm2PorM).toBeCloseTo(5.23598775598299, 6);
    expect(r.positivo.y.verificaAs).toBe(false);
    // As,nec > As,real → σsd = fyd. lb,rqd = 2,5·434,78/3,04129 = 357,400;
    // cd = mín(70, 20) = 20 → α2 = 0,85; lbd = 303,790 mm
    expect(r.positivo.y.anclaje.sigmaSdMPa).toBeCloseTo(434.782609, 5);
    expect(r.positivo.y.anclaje.lbdMm).toBeCloseTo(303.789697, 5);
  });

  it("sin la convención de malla general, X no suma la armadura de Y", () => {
    const sinMalla = calcularLosa(materiales, geometria, { ...datos, xIncluyeMallaEnY: false });
    expect(sinMalla.positivo.x.asRealCm2PorM).toBeCloseTo(16.5457213089062 - 5.23598775598299, 6);
  });
});

describe("losa: armado negativo", () => {
  const r = calcularLosa(materiales, geometria, datos);

  it("reproduce As necesaria y real en X", () => {
    expect(r.negativo.x.asNecCm2PorM).toBeCloseTo(8.81026701892389, 6);
    expect(r.negativo.x.asRealCm2PorM).toBeCloseTo(7.5398223686155, 6);
    expect(r.negativo.x.verificaAs).toBe(false);
    // σsd = fyd; lb,rqd = 3·434,78/3,04129 = 428,880; cd = 30 → α2 = 0,775;
    // lbd = 332,382 mm. Arriba, pero con e ≤ 0,25 sigue siendo adherencia buena.
    expect(r.negativo.x.situacionAdherencia).toBe("buena");
    expect(r.negativo.x.anclaje.lbdMm).toBeCloseTo(332.381669, 5);
  });

  it("redondea la separación máxima a múltiplos de 2 cm", () => {
    expect(r.negativo.x.separacionMaxM).toBeCloseTo(0.12, 9);
    expect(r.negativo.y.separacionMaxM).toBeCloseTo(0.2, 9);
  });
});

describe("losa: momento resistente de un armado dado", () => {
  it("reproduce el bloque de momento resistente (φ12/15cm)", () => {
    const r = calcularMomentoResistenteLosa(materiales, 0.15, 0.02, {
      diametroMm: 12,
      separacionM: 0.15,
    });
    expect(r.asRealCm2PorM).toBeCloseTo(7.5398223686155, 6);
    expect(r.dM).toBeCloseTo(0.124, 9);
    expect(r.momentoKNmPorM).toBeCloseTo(37.9628551257742, 5);
  });
});

describe("losa: adherencia y forma del anclaje", () => {
  it("con e > 0,25 m la armadura superior pasa a adherencia mala y la inferior no", () => {
    const gruesa = calcularLosa(materiales, { ...geometria, e: 0.3 }, datos);
    expect(gruesa.positivo.x.situacionAdherencia).toBe("buena");
    expect(gruesa.negativo.x.situacionAdherencia).toBe("mala");
    expect(gruesa.negativo.x.anclaje.eta1).toBe(0.7);
  });

  it("con gancho y cd ≤ 3Ø no hay reducción por forma (α1 = 1, tabla A19.8.2)", () => {
    const conGancho = calcularLosa(materiales, geometria, { ...datos, formaAnclaje: "gancho" });
    expect(conGancho.positivo.x.anclaje.alfa1).toBe(1);
  });
});

describe("losa: cara superior sin momento negativo", () => {
  const sinNegativo = { ...datos, momentoPositivoX: 14, momentoNegativoX: 0, momentoNegativoY: 0 };

  it("sin momento no se exige armadura ni mínimo: la ec. (9.1) es de tracción", () => {
    const r = calcularLosa(materiales, geometria, sinNegativo);
    expect(r.negativo.x.requerida).toBe(false);
    expect(r.negativo.x.asNecCm2PorM).toBe(0);
    expect(r.negativo.x.verificaAs).toBe(true);
    // La positiva sigue con su mínimo.
    expect(r.positivo.x.requerida).toBe(true);
  });

  it("con empotramiento parcial en apoyo intermedio arma el 25 % del positivo, art. 9.3.1.2 (2)", () => {
    const r = calcularLosa(materiales, geometria, { ...sinNegativo, empotramientoParcialX: "intermedio" });
    expect(r.negativo.x.requerida).toBe(true);
    expect(r.negativo.x.gobiernaEmpotramiento).toBe(true);
    expect(r.negativo.x.momentoKNmPorM).toBeCloseTo(3.5, 9);
    expect(r.negativo.x.asNecCm2PorM).toBeGreaterThanOrEqual(r.asMinCm2PorM);
    // Y no se toca.
    expect(r.negativo.y.requerida).toBe(false);
  });

  it("en apoyo extremo alcanza con el 15 %", () => {
    const r = calcularLosa(materiales, geometria, { ...sinNegativo, empotramientoParcialX: "extremo" });
    expect(r.negativo.x.momentoKNmPorM).toBeCloseTo(2.1, 9);
  });

  it("si el negativo cargado es mayor, manda el cargado", () => {
    const r = calcularLosa(materiales, geometria, { ...datos, empotramientoParcialX: "intermedio" });
    expect(r.negativo.x.gobiernaEmpotramiento).toBe(false);
    expect(r.negativo.x.momentoKNmPorM).toBe(40);
  });
});
