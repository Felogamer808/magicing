import { describe, expect, it } from "vitest";
import { propiedades } from "@/lib/calc/acero/perfiles";
import { calcularAlaMensula, calcularF9 } from "@/lib/calc/acero/flexion-te";
import { calcularG3, coeficienteCv2, KV_TE } from "@/lib/calc/acero/corte-te";
import { calcularFlexionSegunSeccion, calcularCorteSegunSeccion } from "@/lib/calc/acero/seleccion-articulo";
import { calcularFlexion, SeccionFueraDeAlcance } from "@/lib/calc/acero/flexion";
import { calcularCompresion } from "@/lib/calc/acero/compresion";

// La pieza del apoyo de losa: ala 150×10, alto total 150, alma 15, largo
// 1,175 m. Los valores esperados están hechos a mano, en mm.
const T = { anchoAla: 150, espesorAla: 10, alto: 150, espesorAlma: 15 };
const base = { familia: "te-armada" as const, params: T, fyPa: 250e6, ePa: 200e9 };

describe("T armada: propiedades", () => {
  const p = propiedades("te-armada", T);

  it("área, baricentro e inercia", () => {
    expect(p.areaM2 * 1e6).toBeCloseTo(3600, 6);
    expect(p.te!.yGM * 1000).toBeCloseTo(48.75, 6);
    expect(p.ixM4 * 1e12).toBeCloseTo(8_364_375, 0);
  });

  it("dos módulos elásticos, y el de la sección es el menor", () => {
    expect(p.te!.sxAlaM3 * 1e9).toBeCloseTo(8_364_375 / 48.75, 0);
    expect(p.te!.sxPuntaM3 * 1e9).toBeCloseTo(8_364_375 / 101.25, 0);
    expect(p.sxM3).toBe(p.te!.sxPuntaM3);
  });

  it("eje neutro plástico en el alma y módulo plástico", () => {
    // El ala (1500 mm²) no llega a la mitad del área: el ENP cae a 30 mm.
    expect(p.te!.yPlasticoM * 1000).toBeCloseTo(30, 6);
    expect(p.zxM3 * 1e9).toBeCloseTo(37_500 + 3_000 + 108_000, 0);
  });

  it("eje débil y torsión", () => {
    expect(p.iyM4 * 1e12).toBeCloseTo(2_812_500 + 39_375, 0);
    expect(p.jM4 * 1e12).toBeCloseTo((150 * 1000 + 145 * 3375) / 3, 0);
  });

  it("rechaza chapas imposibles", () => {
    expect(() => propiedades("te-armada", { ...T, alto: 8 })).toThrow();
    expect(() => propiedades("te-armada", { ...T, anchoAla: 10 })).toThrow();
  });
});

describe("F9: punta del alma comprimida", () => {
  const r = calcularF9({ ...base, lbM: 1.175, puntaAlma: "comprimida", mRequeridoKNm: 10 });

  it("Mp = My con el módulo hacia la punta", () => {
    expect(r.myKNm).toBeCloseTo((250 * 8_364_375) / 101.25 / 1e6, 3);
    expect(r.mpKNm).toBe(r.myKNm);
  });

  it("pandeo lateral con B negativo: Mcr grande, acotado por My", () => {
    expect(r.coeficienteB).toBeLessThan(0);
    expect(r.coeficienteB).toBeCloseTo(-1.074, 2);
    expect(r.mcrKNm).toBeCloseTo(101.8, 0);
    expect(r.estados[1].mnKNm).toBeCloseTo(r.myKNm, 6);
  });

  it("alma compacta (d/tw = 10): Fcr = Fy", () => {
    const alma = r.estados.find((e) => e.nombre === "Pandeo local del alma")!;
    expect(alma.ecuacion).toContain("F9-17");
    expect(alma.mnKNm).toBeCloseTo(r.myKNm, 6);
  });

  it("Mn = 20,65 kN·m y admisible 12,37", () => {
    expect(r.mnKNm).toBeCloseTo(20.65, 2);
    expect(r.admisibleKNm).toBeCloseTo(20.65 / 1.67, 2);
    expect(r.verifica).toBe(true);
    expect(r.lpM).toBeNull();
  });

  it("alma esbelta: entra la ec. F9-19 y baja de My", () => {
    const delgada = calcularF9({ ...base, params: { ...T, alto: 300, espesorAlma: 6 }, lbM: 0.5, puntaAlma: "comprimida" });
    const alma = delgada.estados.find((e) => e.nombre === "Pandeo local del alma")!;
    expect(alma.ecuacion).toContain("F9-19");
    expect(delgada.gobierna).toBe("Pandeo local del alma");
  });

  it("F9-18 empalma con F9-17 y F9-19 en sus límites", () => {
    const raiz = Math.sqrt(200e9 / 250e6);
    const f18 = (rel: number) => 1.43 - 0.515 * rel * Math.sqrt(250e6 / 200e9);
    expect(f18(0.84 * raiz)).toBeCloseTo(1, 1);
    expect(f18(1.52 * raiz)).toBeCloseTo((1.52 * 200e9) / (1.52 * raiz) ** 2 / 250e6, 1);
  });
});

describe("F9: punta del alma traccionada", () => {
  const r = calcularF9({ ...base, lbM: 1.175, puntaAlma: "traccionada" });

  it("Mp = Fy·Zx topado por 1,6·My", () => {
    // Fy·Zx = 37,1 > 1,6·My = 33,0: manda el tope.
    expect(r.mpKNm).toBeCloseTo(1.6 * r.myKNm, 6);
  });

  it("Lb < Lp: el pandeo lateral no aplica", () => {
    expect(r.lpM).toBeCloseTo(1.76 * Math.sqrt(2_851_875 / 3600) * Math.sqrt(800) / 1000, 4);
    expect(r.estados[1].mnKNm).toBe(Infinity);
  });

  it("ala compacta (bf/2tf = 7,5): el pandeo local del ala no aplica", () => {
    expect(r.estados[2].mnKNm).toBe(Infinity);
    expect(r.mnKNm).toBeCloseTo(33.04, 1);
  });

  it("con Lb largo, el pandeo lateral baja la resistencia y es continuo en Lp", () => {
    const enLp = calcularF9({ ...base, lbM: r.lpM! + 1e-6, puntaAlma: "traccionada" });
    expect(enLp.estados[1].mnKNm).toBeCloseTo(r.mpKNm, 2);
    const largo = calcularF9({ ...base, lbM: 30, puntaAlma: "traccionada" });
    expect(largo.gobierna).toBe("Pandeo lateral-torsional");
  });
});

describe("despacho por forma de sección", () => {
  it("la T va por F9 y G3", () => {
    expect(calcularFlexionSegunSeccion({ ...base, lbM: 1, cb: 1, puntaAlma: "traccionada" }).articulo).toBe("F9");
    expect(calcularCorteSegunSeccion(base).articulo).toBe("G3");
  });

  it("sin orientación se toma la punta comprimida", () => {
    const r = calcularFlexionSegunSeccion({ ...base, lbM: 1, cb: 1 });
    expect(r.articulo === "F9" && r.puntaAlma).toBe("comprimida");
  });

  it("F2 y la compresión rechazan la T", () => {
    expect(() => calcularFlexion({ ...base, lbM: 1, cb: 1 })).toThrow(SeccionFueraDeAlcance);
    expect(() => calcularCompresion({ ...base, lcxM: 1, lcyM: 1 } as Parameters<typeof calcularCompresion>[0])).toThrow();
  });
});

describe("G3: corte de la T", () => {
  it("alma robusta: Vn = 0,6·Fy·d·tw", () => {
    const r = calcularG3({ ...base, vRequeridoKN: 50 });
    expect(r.cv2).toBe(1);
    expect(r.vnKN).toBeCloseTo(337.5, 6);
    expect(r.admisibleKN).toBeCloseTo(337.5 / 1.67, 6);
    expect(r.verifica).toBe(true);
  });

  it("Cv2 continuo en los dos límites", () => {
    const b = Math.sqrt((KV_TE * 200e9) / 250e6);
    expect(coeficienteCv2(1.1 * b + 1e-9, KV_TE, 250e6, 200e9)).toBeCloseTo(1, 6);
    const enLimite = 1.37 * b;
    expect(coeficienteCv2(enLimite - 1e-9, KV_TE, 250e6, 200e9)).toBeCloseTo(
      coeficienteCv2(enLimite + 1e-9, KV_TE, 250e6, 200e9),
      1
    );
  });
});

describe("ala en ménsula", () => {
  const r = calcularAlaMensula({ bfM: 0.15, tfM: 0.01, twM: 0.015, fyPa: 250e6, reaccionIzqKNm: 20, reaccionDerKNm: 20 });

  it("faja de 1 m: Mn = Fy·tf²/4 y vuelo desde la cara del alma", () => {
    expect(r.vueloM).toBeCloseTo(0.0675, 9);
    expect(r.mnKNmM).toBeCloseTo(6.25, 6);
    expect(r.mAdmisibleKNmM).toBeCloseTo(6.25 / 1.67, 6);
    expect(r.vAdmisibleKNM).toBeCloseTo(1000, 6);
  });

  it("reacción admisible por lado: manda la flexión", () => {
    expect(r.reaccionAdmisibleKNm).toBeCloseTo(6.25 / 1.67 / 0.0675, 3);
    expect(r.izquierdo.momentoKNmM).toBeCloseTo(1.35, 6);
    expect(r.verifica).toBe(true);
    expect(r.torsionKNmM).toBe(0);
  });

  it("cargas distintas: torsión y el lado cargado no verifica", () => {
    const d = calcularAlaMensula({ bfM: 0.15, tfM: 0.01, twM: 0.015, fyPa: 250e6, reaccionIzqKNm: 60, reaccionDerKNm: 10 });
    expect(d.izquierdo.verificaFlexion).toBe(false);
    expect(d.derecho.verificaFlexion).toBe(true);
    expect(d.verifica).toBe(false);
    expect(d.torsionKNmM).toBeCloseTo(50 * 0.075, 6);
  });
});
