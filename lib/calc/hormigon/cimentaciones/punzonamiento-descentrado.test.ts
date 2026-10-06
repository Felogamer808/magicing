import { describe, expect, it } from "vitest";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";
import { calcularZapataAislada, moduloPerimetroM2 } from "@/lib/calc/hormigon/cimentaciones/zapata-aislada";
import {
  calcularPunzonamientoDescentrado,
  contorno,
  propiedadesContorno,
  type EntradaPunzonamientoDescentrado,
} from "@/lib/calc/hormigon/cimentaciones/punzonamiento-descentrado";

const materiales = derivarMateriales({ fck: 30, fyk: 500 });
const base: EntradaPunzonamientoDescentrado = {
  A: 2.4, B: 2.4, anchoPilarA: 0.4, anchoPilarB: 0.4, bordeA: 1, bordeB: 1,
  dA: 0.442, dB: 0.426, nk: 800, mkA: 0, mkB: 0, excCalculoA: 0, excCalculoB: 0,
  asRealACm2: 16, asRealBCm2: 16,
};
const sinRecorte = { izq: false, der: false, sup: false, inf: false };

describe("punzonamiento descentrado — geometría del perímetro", () => {
  it("sin recorte, el W numérico coincide con la ec. (6.41) generalizada", () => {
    const a = 0.8;
    const p = propiedadesContorno(contorno(base, a, sinRecorte));
    expect(p.u).toBeCloseTo(2 * (0.4 + 0.4) + 2 * Math.PI * a, 2);
    expect(p.wA / moduloPerimetroM2(0.4, 0.4, a)).toBeCloseTo(1, 3);
  });

  it("pilar de borde: u = 2(c1 + s) + c2 + π·a (fig. A19.6.15)", () => {
    const a = 0.8;
    const p = propiedadesContorno(contorno({ ...base, bordeA: 0 }, a, { ...sinRecorte, izq: true }));
    expect(p.u).toBeCloseTo(2 * 0.4 + 0.4 + Math.PI * a, 2);
  });
});

describe("punzonamiento descentrado — contra el cálculo auditado", () => {
  it("con el pilar centrado y sin momento da lo mismo que el pilar centrado", () => {
    const geo = { A: 2.4, B: 2.4, H: 0.5, anchoPilarA: 0.4, anchoPilarB: 0.4, recubrimiento: 0.05 };
    const datos = { cargas: { Nk: 800, MkA: 0, MkB: 0 }, armadoA: { numero: 8, diametroMm: 16 }, armadoB: { numero: 8, diametroMm: 16 } };
    const centrado = calcularZapataAislada(materiales, geo, 1000, datos).punzonamiento;
    const nuevo = calcularPunzonamientoDescentrado(materiales, {
      ...base, dA: 0.442, dB: 0.426,
      asRealACm2: 8 * Math.PI * 0.8 ** 2, asRealBCm2: 8 * Math.PI * 0.8 ** 2,
    });
    expect(nuevo.situacion).toBe("interior");
    expect(nuevo.aprovechamiento).toBeCloseTo(centrado.aprovechamiento, 2);
  });
});

describe("punzonamiento descentrado — pilar contra la medianera", () => {
  const borde = { ...base, A: 1.5, bordeA: 0, excCalculoA: -0.55 };

  it("sin momento propio: perímetro de borde y β = 1 (ec. (6.39) sin momento)", () => {
    const r = calcularPunzonamientoDescentrado(materiales, borde);
    expect(r.situacion).toBe("borde");
    expect(r.beta).toBeCloseTo(1, 9);
  });

  it("con el momento propio hacia el interior, β = u1/u1* > 1 (ec. (6.44))", () => {
    const r = calcularPunzonamientoDescentrado(materiales, { ...borde, mkA: 30 });
    expect(r.situacion).toBe("borde");
    expect(r.beta).toBeGreaterThan(1);
  });

  it("descuenta la presión real: bajo el pilar de borde es mayor que la media y el punzonamiento baja", () => {
    const real = calcularPunzonamientoDescentrado(materiales, borde);
    const media = calcularPunzonamientoDescentrado(materiales, { ...borde, excCalculoA: 0 });
    expect(real.aprovechamiento).toBeLessThan(media.aprovechamiento);
  });
});
