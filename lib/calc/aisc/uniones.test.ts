import { describe, expect, it } from "vitest";
import {
  calcularChapaBase,
  calcularSoldaduraH,
  fuerzasEnPernos,
  ladoMinimoCordonMm,
  tensionAdmisibleSoldadura,
} from "./uniones";

// Caso real de la hoja "SOLDADURA H PILAR Y FACHADA": perfil H 150x240,
// tf=15.9, tw=12.7, cordón de 9.5 mm, electrodo E60, Py=160 kN, Mx=40 kN·m.

const perfil = { hMm: 150, bMm: 240, tfMm: 15.9, twMm: 12.7 };

describe("soldadura: tensión admisible y lado del cordón", () => {
  it("reproduce la tensión admisible de cada electrodo", () => {
    expect(tensionAdmisibleSoldadura("E60")).toBeCloseTo(126600, 6);
    expect(tensionAdmisibleSoldadura("E70")).toBeCloseTo(147660, 6);
    expect(tensionAdmisibleSoldadura("E80")).toBeCloseTo(168750, 6);
  });

  it("reproduce la tabla de lado mínimo según el espesor menor", () => {
    expect(ladoMinimoCordonMm(5)).toBe(3);
    expect(ladoMinimoCordonMm(12.7)).toBe(5);
    expect(ladoMinimoCordonMm(15)).toBe(6);
    expect(ladoMinimoCordonMm(25)).toBe(8);
  });
});

describe("soldadura de perfil H", () => {
  const r = calcularSoldaduraH(perfil, 9.5, "E60", {
    pxKN: 0,
    pyKN: 160,
    pzKN: 0,
    mxKNm: 40,
    myKNm: 0,
    mzKNm: 0,
  });

  it("reproduce garganta, longitud e inercias del cordón", () => {
    expect(r.dMinMm).toBe(5);
    expect(r.dMaxMm).toBeCloseTo(10.7, 9);
    expect(r.gargantaMm).toBeCloseTo(6.7175144212722, 9);
    expect(r.longitudMm).toBeCloseTo(1234.6, 9);
    expect(r.ixMm4).toBeCloseTo(36595767.1929577, 4);
    expect(r.iyMm4).toBeCloseTo(30652453.9619453, 4);
    expect(r.ipMm4).toBeCloseTo(67248221.154903, 4);
  });

  it("reproduce las tensiones por fuerza directa y por momento", () => {
    expect(r.tauXPKPa).toBeCloseTo(0, 6);
    expect(r.tauYPKPa).toBeCloseTo(19292.3486814136, 5);
    expect(r.tauZPKPa).toBeCloseTo(0, 6);
    expect(r.tauXMKPa).toBeCloseTo(0, 6);
    expect(r.tauYMKPa).toBeCloseTo(0, 6);
    expect(r.tauZMKPa).toBeCloseTo(131162.710012094, 4);
  });

  it("reproduce la tensión resultante y verifica contra el electrodo E60", () => {
    expect(r.tauKPa).toBeCloseTo(132573.946216298, 4);
    expect(r.verifica).toBe(false); // 132574 > 126600
    expect(r.ladoEnRango).toBe(true);
  });

  it("con electrodo E80 la misma unión sí verifica", () => {
    const conE80 = calcularSoldaduraH(perfil, 9.5, "E80", {
      pxKN: 0, pyKN: 160, pzKN: 0, mxKNm: 40, myKNm: 0, mzKNm: 0,
    });
    expect(conE80.verifica).toBe(true);
  });
});

describe("reparto del momento entre filas de pernos", () => {
  it("reproduce el caso de 8 pernos", () => {
    const f = fuerzasEnPernos(25.2, [0.18, 0.127]);
    expect(f[0]).toBeCloseTo(35.0768659717282, 6);
    expect(f[1]).toBeCloseTo(24.7486776578304, 6);
  });

  it("reproduce el caso de 12 pernos", () => {
    const f = fuerzasEnPernos(25.2, [0.18, 0.16, 0.09]);
    expect(f[0]).toBeCloseTo(22.7254509018036, 6);
    expect(f[1]).toBeCloseTo(20.2004008016032, 6);
    expect(f[2]).toBeCloseTo(11.3627254509018, 6);
  });

  it("reproduce el caso de 24 pernos", () => {
    const f = fuerzasEnPernos(597.7, [0.46, 0.44, 0.398, 0.325, 0.23, 0.119]);
    expect(f[0]).toBeCloseTo(109.019175561865, 6);
    expect(f[1]).toBeCloseTo(104.279211407001, 6);
    expect(f[2]).toBeCloseTo(94.3252866817872, 6);
  });
});

describe("chapa de base de pilar", () => {
  // Hoja "CHAPA PILARES 1": chapa 0.4x0.4x0.0095, perno φ15, lc=0.137, 12 pernos.
  const r = calcularChapaBase(
    { fyKPa: 310000, fuKPa: 407800, fckKPa: 25000 },
    {
      lxM: 0.4, lyM: 0.4, tM: 0.0095,
      diametroPernoMm: 15, lcM: 0.137, numeroPernos: 12,
      agM2: 0.041, aeM2: 0.038,
    },
    { nMaxKN: 400, cortePorPernoKN: 41.5, momentoKNm: 25.2, distanciasPernosM: [0.18, 0.127] }
  );

  it("reproduce el aplastamiento del hormigón", () => {
    expect(r.aplastamientoHormigon.admisibleKN).toBeCloseTo(589.558621355487, 5);
    expect(r.aplastamientoHormigon.verifica).toBe(true);
  });

  it("reproduce el aplastamiento de la chapa", () => {
    expect(r.aplastamientoChapa.admisibleKN).toBeCloseTo(69.7338, 5);
    expect(r.aplastamientoChapa.verifica).toBe(true);
  });

  it("reproduce la tracción en la chapa", () => {
    expect(r.traccionChapa.admisibleKN).toBeCloseTo(7748.2, 4);
    expect(r.traccionChapa.verifica).toBe(true);
  });

  it("reproduce el corte y la tracción en los pernos", () => {
    expect(r.cortePernos.admisibleKN).toBeCloseTo(16.4344565690916, 6);
    expect(r.traccionPernos.admisibleKN).toBeCloseTo(36.5210145979813, 6);
    // La fila más traccionada toma 35.08 kN, por debajo de los 36.52 admisibles.
    expect(r.traccionPernos.solicitacionKN).toBeCloseTo(35.0768659717282, 6);
    expect(r.traccionPernos.verifica).toBe(true);
  });
});
