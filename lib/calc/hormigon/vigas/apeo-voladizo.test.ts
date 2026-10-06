import { describe, expect, it } from "vitest";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";
import { calcularApeoVoladizo, type GeometriaApeoVoladizo } from "@/lib/calc/hormigon/vigas/apeo-voladizo";

// No hay planilla para este caso. Los valores salen de la estática del modelo
// y de las ecuaciones del Anejo 19, con la cuenta escrita en cada test.

/**
 * La viga que motivó el módulo: pilar de 0,14 × 0,50 en voladizo a 0,33 m del
 * apoyo cercano, luz 1,24 m entre pilares de 0,20 × 0,60, canto 0,89 y
 * espesor 0,77. Sobre el apoyo lejano baja un tabique de 0,14.
 */
const materiales = derivarMateriales({ fck: 30, fyk: 500 });
const geometria: GeometriaApeoVoladizo = {
  hM: 0.89,
  bM: 0.77,
  recubrimientoM: 0.02,
  luzM: 1.24,
  voladizoM: 0.33,
  extremoLibreM: 0.07,
  extremoLejanoM: 0.1,
  carga: { anchoM: 0.14, profundidadM: 0.5 },
  apoyoCercano: { anchoM: 0.2, profundidadM: 0.6 },
  apoyoLejano: { anchoM: 0.2, profundidadM: 0.6 },
  elementoLejano: { anchoM: 0.14, profundidadM: 0.77 },
};
const datos = {
  pEdKN: 1485,
  nLejanoMaxKN: 500,
  nLejanoMinKN: 350,
  tirante: { numero: 6, diametroMm: 20 },
  diametroEstriboMm: 12,
  formaAnclajeTirante: "recta" as const,
  armaduraPilarLejano: { numero: 4, diametroMm: 12 },
};

describe("viga de apeo con carga en voladizo — el caso real", () => {
  const r = calcularApeoVoladizo(materiales, geometria, datos);
  const z = 0.89 - (0.02 + 0.012 + 0.01); // 0,848 m

  it("clasifica la pieza: viga de gran canto y ménsula corta", () => {
    expect(r.esGranCanto).toBe(true); // 1,24 < 3·0,89
    expect(r.esMensulaCorta).toBe(true); // a_c = 0,23 < z
    expect(r.zM).toBeCloseTo(z, 9);
  });

  it("equilibrio: el voladizo levanta el apoyo lejano con P·a/L", () => {
    const v = (1485 * 0.33) / 1.24; // 395,2 kN
    expect(r.levantamientoKN).toBeCloseTo(v, 6);
    expect(r.reaccionCercanaKN).toBeCloseTo(1485 + v, 6);
    expect(r.reaccionLejanaMaxKN).toBeCloseTo(500 - v, 6); // +104,8: comprimido
    expect(r.reaccionLejanaMinKN).toBeCloseTo(350 - v, 6); // −45,2: tracción
    expect(r.traccionPilarLejanoKN).toBeCloseTo(v - 350, 6);
  });

  it("tirante T = P·a/z con fyd pleno", () => {
    const t = (1485 * 0.33) / z; // 577,9 kN
    expect(r.traccionTiranteKN).toBeCloseTo(t, 6);
    expect(r.asNecTiranteCm2).toBeCloseTo((t / (500 / 1.15)) * 10, 6); // 13,29 cm²
    expect(r.verificaTirante).toBe(true); // 6Ø20 = 18,85 cm²
  });

  it("el nudo bajo la carga no verifica: 21,2 MPa contra k2·ν'·fcd = 15,0", () => {
    const k2 = 0.85 * 0.88 * 20;
    expect(r.nudoCargaApoyo.sigmaMPa).toBeCloseTo(1485 / (0.14 * 0.5) / 1000, 6);
    expect(r.nudoCargaApoyo.sigmaMaxMPa).toBeCloseTo(k2, 9);
    expect(r.nudoCargaApoyo.verifica).toBe(false);

    // Cara de la biela: placa proyectada más u = 2·d' del tirante.
    const th = Math.atan2(z, 0.33);
    const w = 0.14 * Math.sin(th) + 2 * 0.042 * Math.cos(th);
    expect(r.nudoCargaBiela.sigmaMPa).toBeCloseTo(1485 / Math.sin(th) / (w * 0.5) / 1000, 6);
    expect(r.nudoCargaBiela.verifica).toBe(false);
  });

  it("el nudo sobre el apoyo cercano verifica: 15,7 contra k1·ν'·fcd = 17,6 MPa", () => {
    expect(r.nudoApoyoCercano.sigmaMPa).toBeCloseTo((1485 + (1485 * 0.33) / 1.24) / (0.2 * 0.6) / 1000, 6);
    expect(r.nudoApoyoCercano.sigmaMaxMPa).toBeCloseTo(17.6, 9);
    expect(r.nudoApoyoCercano.verifica).toBe(true);
  });

  it("el nudo bajo el tabique lejano gobierna con la carga máxima", () => {
    expect(r.nudoElementoLejano.sigmaMPa).toBeCloseTo(500 / (0.14 * 0.77) / 1000, 6);
    expect(r.nudoElementoLejano.verifica).toBe(true);
  });

  it("recto, el tirante no se ancla en el voladizo: hay 108 mm", () => {
    // De la cara interior del pilar apeado al extremo: 0,07 + 0,07 = 0,14 m,
    // menos recubrimiento y estribo (32 mm).
    expect(r.anclajeTiranteCarga.disponibleMm).toBeCloseTo(108, 6);
    // lb,rqd = φ/4·σsd/fbd con σsd = T/As y fbd = 2,25·0,7·fctm/1,5.
    const sigmaSd = (((1485 * 0.33) / z) * 10) / ((6 * Math.PI * 2 ** 2) / 4);
    const fbd = (2.25 * 0.7 * 0.3 * 30 ** (2 / 3)) / 1.5;
    const lbRqd = (20 / 4) * (sigmaSd / fbd);
    expect(r.anclajeTiranteCarga.lbdMm).toBeCloseTo(0.91 * lbRqd, 4); // α2 = 1 − 0,15·(32 − 20)/20
    expect(r.anclajeTiranteCarga.verifica).toBe(false);
  });

  it("doblado hacia abajo por la cara del extremo, sí entra (lbd por el eje, art. 8.4.3 (3))", () => {
    const rDoblado = calcularApeoVoladizo(materiales, geometria, { ...datos, formaAnclajeTirante: "gancho" });
    // Horizontal 108 mm, arco de 90° con radio por el eje 70 + 10 mm, y rama
    // vertical hasta el recubrimiento inferior: 890 − 42 − 32 = 816 mm.
    const r0 = 80;
    expect(rDoblado.anclajeTiranteCarga.disponibleMm).toBeCloseTo(108 - r0 + (Math.PI / 2) * r0 + (816 - r0), 6);
    expect(rDoblado.anclajeTiranteCarga.verifica).toBe(true);
    expect(rDoblado.anclajeTiranteLejano.verifica).toBe(true);
  });

  it("el pilar lejano a tracción: As y anclaje dentro de la viga", () => {
    const t = (1485 * 0.33) / 1.24 - 350;
    expect(r.asNecPilarLejanoCm2).toBeCloseTo((t / (500 / 1.15)) * 10, 6);
    expect(r.verificaPilarLejano).toBe(true); // 4Ø12 = 4,52 cm² > 1,04
    expect(r.anclajePilarLejano).not.toBeNull();
    expect(r.anclajePilarLejano!.verifica).toBe(true);
  });

  it("malla mínima de viga de gran canto, art. 9.7 (1)", () => {
    expect(r.mallaMinimaCm2PorM).toBeCloseTo(7.7, 9); // 0,001·0,77 m·1 m
  });
});

describe("viga de apeo con carga en voladizo — sanidad", () => {
  it("si la carga lejana alcanza, el pilar lejano no tracciona", () => {
    const r = calcularApeoVoladizo(materiales, geometria, { ...datos, nLejanoMinKN: 450 });
    expect(r.traccionPilarLejanoKN).toBe(0);
    expect(r.anclajePilarLejano).toBeNull();
  });

  it("más voladizo, más tirante y más levantamiento", () => {
    const corto = calcularApeoVoladizo(materiales, geometria, datos);
    const largo = calcularApeoVoladizo(materiales, { ...geometria, voladizoM: 0.5 }, datos);
    expect(largo.traccionTiranteKN).toBeGreaterThan(corto.traccionTiranteKN);
    expect(largo.levantamientoKN).toBeGreaterThan(corto.levantamientoKN);
  });

  it("un apoyo más ancho que la viga no cuenta más que el espesor", () => {
    const r = calcularApeoVoladizo(
      materiales,
      { ...geometria, apoyoCercano: { anchoM: 0.2, profundidadM: 2 } },
      datos
    );
    expect(r.nudoApoyoCercano.sigmaMPa).toBeCloseTo(r.reaccionCercanaKN / (0.2 * 0.77) / 1000, 6);
  });
});
