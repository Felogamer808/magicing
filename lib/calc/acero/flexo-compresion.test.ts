import { describe, expect, it } from "vitest";
import { calcularFlexoCompresion } from "@/lib/calc/acero/flexo-compresion";
import { calcularCompresion } from "@/lib/calc/acero/compresion";
import { calcularFlexion, calcularFlexionEjeDebil } from "@/lib/calc/acero/flexion";

const FY = 250e6;
const E = 200e9;

const base = {
  familia: "HEB" as const,
  params: { altura: 200 },
  lcxM: 4,
  lcyM: 4,
  lbM: 4,
  cb: 1,
  fyPa: FY,
  ePa: E,
};

describe("flexo-compresión H1.1", () => {
  it("toma las admisibles de los capítulos E y F sin recalcularlas", () => {
    const r = calcularFlexoCompresion({
      ...base,
      pRequeridaKN: 500,
      mrxKNm: 50,
      mryKNm: 10,
    });

    const comun = { familia: base.familia, params: base.params, fyPa: FY, ePa: E };
    expect(r.pcKN).toBeCloseTo(
      calcularCompresion({ ...comun, lcxM: 4, lcyM: 4 }).admisibleKN,
      9
    );
    expect(r.mcxKNm).toBeCloseTo(
      calcularFlexion({ ...comun, lbM: 4, cb: 1 }).admisibleKNm,
      9
    );
    expect(r.mcyKNm).toBeCloseTo(calcularFlexionEjeDebil(comun).admisibleKNm, 9);
  });

  it("elige H1-1a cuando la axial pesa 0,2 o más, y H1-1b por debajo", () => {
    const sinCarga = calcularFlexoCompresion({
      ...base,
      pRequeridaKN: 1,
      mrxKNm: 1,
      mryKNm: 0,
    });
    const pc = sinCarga.pcKN;

    const mucha = calcularFlexoCompresion({
      ...base,
      pRequeridaKN: pc * 0.5,
      mrxKNm: 10,
      mryKNm: 0,
    });
    const poca = calcularFlexoCompresion({
      ...base,
      pRequeridaKN: pc * 0.1,
      mrxKNm: 10,
      mryKNm: 0,
    });

    expect(mucha.ecuacion).toBe("H1-1a");
    expect(poca.ecuacion).toBe("H1-1b");
  });

  /**
   * Las dos ecuaciones tienen que dar lo mismo en Pr/Pc = 0,2: ahí H1-1a vale
   * 0,2 + (8/9)·F y H1-1b vale 0,1 + F. Se cruzan exactamente cuando F = 0,9.
   * Es la comprobación que valida que los coeficientes 8/9 y 1/2 están bien.
   */
  it("las dos ramas coinciden en Pr/Pc = 0,2 con el término de flexión en 0,9", () => {
    const sonda = calcularFlexoCompresion({
      ...base,
      pRequeridaKN: 1,
      mrxKNm: 1,
      mryKNm: 0,
    });
    const pc = sonda.pcKN;
    const mcx = sonda.mcxKNm;

    // Justo por encima y por debajo del umbral, con Mrx/Mcx = 0,9.
    const arriba = calcularFlexoCompresion({
      ...base,
      pRequeridaKN: pc * 0.2001,
      mrxKNm: mcx * 0.9,
      mryKNm: 0,
    });
    const abajo = calcularFlexoCompresion({
      ...base,
      pRequeridaKN: pc * 0.1999,
      mrxKNm: mcx * 0.9,
      mryKNm: 0,
    });

    expect(arriba.ecuacion).toBe("H1-1a");
    expect(abajo.ecuacion).toBe("H1-1b");
    expect(arriba.interaccion).toBeCloseTo(abajo.interaccion, 3);
    expect(arriba.interaccion).toBeCloseTo(1, 3);
  });

  it("verifica exactamente cuando la interacción no pasa de 1", () => {
    const sonda = calcularFlexoCompresion({
      ...base,
      pRequeridaKN: 1,
      mrxKNm: 1,
      mryKNm: 0,
    });

    const justo = calcularFlexoCompresion({
      ...base,
      pRequeridaKN: sonda.pcKN * 0.9,
      mrxKNm: 0,
      mryKNm: 0,
    });
    expect(justo.interaccion).toBeCloseTo(0.9, 6);
    expect(justo.verifica).toBe(true);

    const pasado = calcularFlexoCompresion({
      ...base,
      pRequeridaKN: sonda.pcKN * 1.1,
      mrxKNm: 0,
      mryKNm: 0,
    });
    expect(pasado.verifica).toBe(false);
  });

  it("los términos suman la interacción y crecen con su solicitación", () => {
    const r = calcularFlexoCompresion({
      ...base,
      pRequeridaKN: 400,
      mrxKNm: 40,
      mryKNm: 15,
    });

    expect(r.terminos.axial + r.terminos.flexionX + r.terminos.flexionY).toBeCloseTo(
      r.interaccion,
      9
    );

    const conMasMy = calcularFlexoCompresion({
      ...base,
      pRequeridaKN: 400,
      mrxKNm: 40,
      mryKNm: 30,
    });
    expect(conMasMy.interaccion).toBeGreaterThan(r.interaccion);
  });

  /**
   * Con Pr = 0 no hay carga axial: es el caso de una viga con momento en los
   * dos ejes y ninguna axial, no una columna. La H1-1a nunca se activa acá
   * —Pr/Pc = 0 siempre cae por debajo de 0,2— y la H1-1b se reduce sola a
   * Mrx/Mcx + Mry/Mcy ≤ 1, sin término axial: no hace falta una fórmula
   * aparte para flexión biaxial pura, el caso límite de H1-1b ya lo resuelve.
   */
  it("con Pr = 0 se reduce a la interacción de flexión biaxial pura", () => {
    const r = calcularFlexoCompresion({
      ...base,
      pRequeridaKN: 0,
      mrxKNm: 40,
      mryKNm: 10,
    });

    expect(r.ecuacion).toBe("H1-1b");
    expect(r.relacionAxial).toBe(0);
    expect(r.terminos.axial).toBe(0);
    expect(r.interaccion).toBeCloseTo(40 / r.mcxKNm + 10 / r.mcyKNm, 9);
    // Verificado además contra el navegador: HEB200, Fy=250MPa, Lb=Lc=4m
    // da Mcx≈91,32kN·m y Mcy≈45,87kN·m, interacción≈0,656.
    expect(r.interaccion).toBeCloseTo(0.656, 3);
  });

  it("el eje débil es más flexible: el mismo momento consume más ahí", () => {
    const r = calcularFlexoCompresion({
      ...base,
      pRequeridaKN: 300,
      mrxKNm: 30,
      mryKNm: 30,
    });

    expect(r.mcyKNm).toBeLessThan(r.mcxKNm);
    expect(r.terminos.flexionY).toBeGreaterThan(r.terminos.flexionX);
  });
});
