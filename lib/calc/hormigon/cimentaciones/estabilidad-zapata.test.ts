import { describe, expect, it } from "vitest";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";
import { calcularDeslizamiento, calcularVuelco } from "@/lib/calc/hormigon/cimentaciones/estabilidad-zapata";
import { calcularZapataAislada } from "@/lib/calc/hormigon/cimentaciones/zapata-aislada";
import { calcularZapataCorrida } from "@/lib/calc/hormigon/cimentaciones/zapata-corrida";

// DB SE-C, tabla 2.1, pág. 12: vuelco con 0,9 / 1,8; deslizamiento con γR = 1,5
// y δ′ = 3/4·φ′ (art. 4.2.3.1 (4)). Las cuentas van escritas en cada test.

describe("vuelco", () => {
  // Zapata 2 × 1,5 × 0,5: PP = 37,5 kN.
  const base = { nkPermanenteKN: 300, pesoZapataKN: 37.5, cantoM: 0.5 };

  it("pilar centrado: Mdst = Mk + Hk·H respecto del borde hacia el que empuja", () => {
    const r = calcularVuelco({ ...base, direccion: { dimM: 2, posicionPilarM: 1, mkKNm: 50, hkKN: 40 } });
    // Mdst = 50 + 40·0,5 = 70; Mstb = 300·1 + 37,5·1 = 337,5.
    expect(r.borde).toBe("fin");
    expect(r.momentoDesestabilizadorKNm).toBeCloseTo(70, 9);
    expect(r.momentoEstabilizadorKNm).toBeCloseTo(337.5, 9);
    expect(r.efectoDesestabilizadorKNm).toBeCloseTo(1.8 * 70, 9);
    expect(r.efectoEstabilizadorKNm).toBeCloseTo(0.9 * 337.5, 9);
    expect(r.aprovechamiento).toBeCloseTo(126 / 303.75, 9);
    expect(r.verifica).toBe(true);
  });

  it("pilar contra la medianera volcando hacia ella: el pilar casi no estabiliza", () => {
    // Pilar de 0,30 al ras: su eje a 0,15 del borde de inicio.
    const r = calcularVuelco({ ...base, direccion: { dimM: 2, posicionPilarM: 0.15, mkKNm: -60, hkKN: 0 } });
    // Mstb = 300·0,15 + 37,5·1 = 82,5 → 0,9·82,5 = 74,25 < 1,8·60 = 108.
    expect(r.borde).toBe("inicio");
    expect(r.momentoEstabilizadorKNm).toBeCloseTo(82.5, 9);
    expect(r.verifica).toBe(false);
  });

  it("sin momento ni horizontal no hay vuelco", () => {
    const r = calcularVuelco({ ...base, direccion: { dimM: 2, posicionPilarM: 0.3, mkKNm: 0, hkKN: 0 } });
    expect(r.borde).toBe("ninguno");
    expect(r.verifica).toBe(true);
  });

  it("una horizontal que se opone al momento lo descuenta", () => {
    const r = calcularVuelco({ ...base, direccion: { dimM: 2, posicionPilarM: 1, mkKNm: 50, hkKN: -40 } });
    expect(r.momentoDesestabilizadorKNm).toBeCloseTo(30, 9);
  });
});

describe("deslizamiento", () => {
  it("la resultante horizontal contra (N,perm + PP)·tan(3/4·φ′)/1,5", () => {
    const r = calcularDeslizamiento({
      horizontalAKN: 30, horizontalBKN: 40, nkPermanenteKN: 300, pesoZapataKN: 37.5, phiGrados: 30,
    });
    const roz = 337.5 * Math.tan((22.5 * Math.PI) / 180);
    expect(r.horizontalKN).toBeCloseTo(50, 9);
    expect(r.deltaGrados).toBeCloseTo(22.5, 9);
    expect(r.rozamientoKN).toBeCloseTo(roz, 9);
    expect(r.rozamientoCalculoKN).toBeCloseTo(roz / 1.5, 9); // 93,2 kN
    expect(r.aprovechamiento).toBeCloseTo(50 / (roz / 1.5), 9);
    expect(r.verifica).toBe(true);
  });
});

describe("en la zapata aislada", () => {
  const materiales = derivarMateriales({ fck: 25, fyk: 500 });
  const geometria = { A: 2, B: 1.5, H: 0.5, anchoPilarA: 0.4, anchoPilarB: 0.3, recubrimiento: 0.05 };
  const armado = { armadoA: { numero: 8, diametroMm: 16 }, armadoB: { numero: 8, diametroMm: 16 } };

  it("sin horizontales ni φ′ da lo de siempre y no inventa el deslizamiento", () => {
    const sin = calcularZapataAislada(materiales, geometria, 300, { cargas: { Nk: 500, MkA: 50, MkB: 20 }, ...armado });
    const con = calcularZapataAislada(materiales, geometria, 300, {
      cargas: { Nk: 500, MkA: 50, MkB: 20, HkA: 0, HkB: 0 }, ...armado,
    });
    expect(con.geotecnico.sigmaKPa).toBeCloseTo(sin.geotecnico.sigmaKPa, 9);
    expect(sin.deslizamiento).toBeNull();
    expect(sin.vuelcoA?.verifica).toBe(true);
  });

  it("la horizontal suma Hk·H al momento en la base", () => {
    const conH = calcularZapataAislada(materiales, geometria, 300, {
      cargas: { Nk: 500, MkA: 50, MkB: 0, HkA: 40 }, ...armado,
    });
    const equivalente = calcularZapataAislada(materiales, geometria, 300, {
      cargas: { Nk: 500, MkA: 50 + 40 * 0.5, MkB: 0 }, ...armado,
    });
    expect(conH.geotecnico.sigmaKPa).toBeCloseTo(equivalente.geotecnico.sigmaKPa, 9);
    expect(conH.vuelcoA?.momentoDesestabilizadorKNm).toBeCloseTo(70, 9);
  });

  it("sólo la carga permanente estabiliza y frena", () => {
    const r = calcularZapataAislada(materiales, geometria, 300, {
      cargas: { Nk: 500, MkA: 50, MkB: 0, HkA: 40, NkPermanente: 200 }, ...armado, phiGrados: 30,
    });
    const pp = 25 * 2 * 1.5 * 0.5;
    expect(r.vuelcoA?.momentoEstabilizadorKNm).toBeCloseTo(200 * 1 + pp * 1, 9);
    expect(r.deslizamiento?.rozamientoKN).toBeCloseTo((200 + pp) * Math.tan((22.5 * Math.PI) / 180), 9);
  });

  it("con tirante no hay vuelco en A y la base frena el tirante más la horizontal", () => {
    const r = calcularZapataAislada(
      materiales,
      { ...geometria, distanciaBordeA: 0 },
      300,
      { cargas: { Nk: 500, MkA: 0, MkB: 0, HkA: 20 }, ...armado, tirante: { brazoM: 3, phiGrados: 30 } }
    );
    expect(r.vuelcoA).toBeNull();
    // Tk = −(Nk·e0 + Hk·H)/h, con e0 = 0,2 − 1 = −0,8: −(−400 + 10)/3 = 130 kN.
    expect(r.tirante?.tkKN).toBeCloseTo(130, 9);
    expect(r.tirante?.horizontalBaseKN).toBeCloseTo(150, 9);
    expect(r.deslizamiento?.horizontalKN).toBeCloseTo(150, 9);
  });
});

describe("en la zapata corrida", () => {
  const materiales = derivarMateriales({ fck: 25, fyk: 500 });
  it("vuelco y deslizamiento por metro", () => {
    const r = calcularZapataCorrida(
      materiales,
      { A: 1.6, H: 0.4, anchoPilar: 0.3, recubrimiento: 0.05 },
      200,
      {
        carga: { Nk: 150, MkA: 10, HkA: 15 },
        armadoPrincipal: { diametroMm: 12, separacionM: 0.2 },
        armadoSecundario: { numero: 8, diametroMm: 10 },
        phiGrados: 28,
      }
    );
    const pp = 25 * 1.6 * 1 * 0.4; // 16 kN/m
    // Mdst = 10 + 15·0,4 = 16; Mstb = 150·0,8 + 16·0,8 = 132,8.
    expect(r.vuelco?.momentoDesestabilizadorKNm).toBeCloseTo(16, 9);
    expect(r.vuelco?.momentoEstabilizadorKNm).toBeCloseTo(150 * 0.8 + pp * 0.8, 9);
    expect(r.deslizamiento?.horizontalKN).toBeCloseTo(15, 9);
    expect(r.deslizamiento?.verifica).toBe(true);
  });
});

describe("situación extraordinaria (tabla 2.1: vuelco 0,9 / 1,2; deslizamiento γR = 1,1)", () => {
  const materiales = derivarMateriales({ fck: 25, fyk: 500 });

  it("vuelco: el mismo caso con 1,2 sobre lo que vuelca", () => {
    const r = calcularVuelco({
      nkPermanenteKN: 300, pesoZapataKN: 37.5, cantoM: 0.5, situacion: "extraordinaria",
      direccion: { dimM: 2, posicionPilarM: 1, mkKNm: 50, hkKN: 40 },
    });
    expect(r.gammaDesestabilizadoras).toBe(1.2);
    expect(r.efectoDesestabilizadorKNm).toBeCloseTo(1.2 * 70, 9);
    expect(r.efectoEstabilizadorKNm).toBeCloseTo(0.9 * 337.5, 9);
  });

  it("deslizamiento: rozamiento de cálculo con γR = 1,1", () => {
    const r = calcularDeslizamiento({
      horizontalAKN: 30, horizontalBKN: 40, nkPermanenteKN: 300, pesoZapataKN: 37.5, phiGrados: 30,
      situacion: "extraordinaria",
    });
    expect(r.gammaR).toBe(1.1);
    expect(r.rozamientoCalculoKN).toBeCloseTo((337.5 * Math.tan((22.5 * Math.PI) / 180)) / 1.1, 9);
  });

  describe("en la zapata aislada", () => {
    const geometria = { A: 2, B: 1.5, H: 0.5, anchoPilarA: 0.4, anchoPilarB: 0.3, recubrimiento: 0.05 };
    const datos = {
      cargas: { Nk: 500, MkA: 0, MkB: 0 },
      armadoA: { numero: 8, diametroMm: 16 },
      armadoB: { numero: 8, diametroMm: 16 },
      phiGrados: 30,
    };
    // Sismo: Mdst = 150 + 100·0,5 = 200; Mstb = 300·1 + 37,5·1 = 337,5.
    const sismo = { Nk: 400, NkPermanente: 300, MkA: 150, MkB: 0, HkA: 100 };
    const r = calcularZapataAislada(materiales, geometria, 300, { ...datos, extraordinaria: sismo });

    it("sin cargas extraordinarias no se comprueba", () => {
      expect(calcularZapataAislada(materiales, geometria, 300, datos).extraordinaria).toBeNull();
    });

    it("la persistente no cambia por agregar la extraordinaria", () => {
      const sola = calcularZapataAislada(materiales, geometria, 300, datos);
      expect(r.geotecnico.sigmaKPa).toBeCloseTo(sola.geotecnico.sigmaKPa, 9);
      expect(r.vuelcoA?.borde).toBe("ninguno");
    });

    it("vuelco: 1,2·200 = 240 ≤ 0,9·337,5 = 303,75 (con 1,8 serían 360 y no verificaría)", () => {
      expect(r.extraordinaria?.vuelcoA?.efectoDesestabilizadorKNm).toBeCloseTo(240, 9);
      expect(r.extraordinaria?.vuelcoA?.efectoEstabilizadorKNm).toBeCloseTo(303.75, 9);
      expect(r.extraordinaria?.vuelcoA?.verifica).toBe(true);
    });

    it("deslizamiento: 100 contra 337,5·tan 22,5° / 1,1 = 127,1", () => {
      expect(r.extraordinaria?.deslizamiento?.horizontalKN).toBeCloseTo(100, 9);
      expect(r.extraordinaria?.deslizamiento?.rozamientoCalculoKN).toBeCloseTo(
        (337.5 * Math.tan((22.5 * Math.PI) / 180)) / 1.1, 9
      );
      expect(r.extraordinaria?.deslizamiento?.verifica).toBe(true);
    });

    it("tensión contra 1,5·σadm, con despegue admitido", () => {
      // e = 200 / 437,5 = 0,457 > 2/6: fuera del núcleo, pero dentro de la base.
      const e = 200 / 437.5;
      expect(r.extraordinaria?.excentricidadA).toBeCloseTo(e, 9);
      expect(r.extraordinaria?.sigmaAdmisibleKPa).toBeCloseTo(450, 9);
      expect(r.extraordinaria?.sigmaKPa).toBeCloseTo(437.5 / ((2 - 2 * e) * 1.5), 9);
      expect(r.extraordinaria?.verificaTension).toBe(true);
    });

    it("si la resultante sale de la base, no verifica", () => {
      const fuera = calcularZapataAislada(materiales, geometria, 300, {
        ...datos, extraordinaria: { Nk: 100, MkA: 300, MkB: 0 },
      });
      expect(fuera.extraordinaria?.sigmaKPa).toBe(Infinity);
      expect(fuera.extraordinaria?.verificaTension).toBe(false);
    });
  });

  it("en la zapata corrida, por metro", () => {
    const r = calcularZapataCorrida(
      materiales,
      { A: 1.6, H: 0.4, anchoPilar: 0.3, recubrimiento: 0.05 },
      200,
      {
        carga: { Nk: 150, MkA: 0 },
        extraordinaria: { Nk: 150, MkA: 10, HkA: 15 },
        armadoPrincipal: { diametroMm: 12, separacionM: 0.2 },
        armadoSecundario: { numero: 8, diametroMm: 10 },
        phiGrados: 28,
      }
    );
    expect(r.vuelco?.borde).toBe("ninguno");
    expect(r.extraordinaria?.vuelco?.efectoDesestabilizadorKNm).toBeCloseTo(1.2 * 16, 9);
    expect(r.extraordinaria?.deslizamiento?.gammaR).toBe(1.1);
    expect(r.extraordinaria?.sigmaAdmisibleKPa).toBeCloseTo(300, 9);
  });
});
