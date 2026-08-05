import { describe, expect, it } from "vitest";
import { derivarMateriales } from "./materiales";
import { calcularPilote } from "./pilote";

// No hay planilla de referencia (no existe en el Excel original). Fórmula
// estática clásica de capacidad por fuste + punta, y compresión simple de
// hormigón armado (EC2). Valores esperados derivados a mano.

describe("pilote — capacidad geotécnica insuficiente", () => {
  const materiales = derivarMateriales({ fck: 25, fyk: 500 });

  const r = calcularPilote(
    materiales,
    { diametroM: 0.4, longitudM: 10 },
    { friccionKPa: 30, puntaKPa: 800, factorSeguridad: 2.5 },
    { numero: 6, diametroMm: 16, diametroEstriboMm: 8 },
    { Nk: 300 }
  );

  it("reproduce el perímetro, el área de punta y las capacidades por fuste/punta", () => {
    expect(r.geotecnico.perimetroM).toBeCloseTo(1.2566, 3);
    expect(r.geotecnico.areaTipM2).toBeCloseTo(0.12566, 4);
    expect(r.geotecnico.qSkinKN).toBeCloseTo(376.99, 1);
    expect(r.geotecnico.qTipKN).toBeCloseTo(100.53, 1);
    expect(r.geotecnico.qUltKN).toBeCloseTo(477.52, 1);
    expect(r.geotecnico.qAdmisibleKN).toBeCloseTo(191.01, 1);
  });

  it("no verifica: la carga supera la capacidad admisible", () => {
    expect(r.geotecnico.verificaCapacidad).toBe(false);
  });

  it("la sección estructural sí resiste (la geotecnia gobierna, como es habitual en pilotes)", () => {
    expect(r.estructural.ndKN).toBeCloseTo(450, 6);
    expect(r.estructural.nRdKN).toBeCloseTo(2287.5, 0);
    expect(r.estructural.verificaEstructural).toBe(true);
    expect(r.estructural.asMinCm2).toBeCloseTo(2.513, 2);
    expect(r.estructural.verificaAsMin).toBe(true);
  });
});

describe("pilote — capacidad suficiente con menor carga", () => {
  const materiales = derivarMateriales({ fck: 25, fyk: 500 });

  const r = calcularPilote(
    materiales,
    { diametroM: 0.4, longitudM: 10 },
    { friccionKPa: 30, puntaKPa: 800, factorSeguridad: 2.5 },
    { numero: 6, diametroMm: 16, diametroEstriboMm: 8 },
    { Nk: 150 }
  );

  it("verifica con una carga menor a la admisible", () => {
    expect(r.geotecnico.qAdmisibleKN).toBeCloseTo(191.01, 1);
    expect(r.geotecnico.verificaCapacidad).toBe(true);
  });
});

describe("pilote — sanidad: mayor longitud o diámetro aumentan la capacidad", () => {
  const materiales = derivarMateriales({ fck: 25, fyk: 500 });
  const armadura = { numero: 6, diametroMm: 16, diametroEstriboMm: 8 };

  it("más longitud embebida aumenta la capacidad por fuste", () => {
    const corto = calcularPilote(materiales, { diametroM: 0.4, longitudM: 8 }, { friccionKPa: 30, puntaKPa: 800, factorSeguridad: 2.5 }, armadura, { Nk: 150 });
    const largo = calcularPilote(materiales, { diametroM: 0.4, longitudM: 16 }, { friccionKPa: 30, puntaKPa: 800, factorSeguridad: 2.5 }, armadura, { Nk: 150 });
    expect(largo.geotecnico.qAdmisibleKN).toBeGreaterThan(corto.geotecnico.qAdmisibleKN);
  });

  it("mayor diámetro aumenta la capacidad estructural", () => {
    const chico = calcularPilote(materiales, { diametroM: 0.3, longitudM: 10 }, { friccionKPa: 30, puntaKPa: 800, factorSeguridad: 2.5 }, armadura, { Nk: 150 });
    const grande = calcularPilote(materiales, { diametroM: 0.6, longitudM: 10 }, { friccionKPa: 30, puntaKPa: 800, factorSeguridad: 2.5 }, armadura, { Nk: 150 });
    expect(grande.estructural.nRdKN).toBeGreaterThan(chico.estructural.nRdKN);
  });
});
