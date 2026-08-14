import { describe, expect, it } from "vitest";
import { beta1, calcularPretensado, moduloElasticidad, type DatosPretensado } from "@/lib/calc/hormigon/pretensado";

/*
 * Los dos casos son las planillas originales, que resuelven el mismo cálculo con
 * datos muy distintos: una viga rectangular con armadura pasiva y una losa ancha
 * sin ella. Tener las dos como contraste es lo que permite distinguir un acierto
 * de una coincidencia.
 */

const VIGA: DatosPretensado = {
  fcPremoldeadoMPa: 50,
  fciMPa: 40,
  fcInSituMPa: 30,
  densidadKgM3: 2500,
  fpuMPa: 1860,
  epMPa: 195000,
  areaToronMm2: 99,
  fuerzaPorToronKN: 156,
  fyPasivaMPa: 500,
  diametroPasivaMm: 16,
  cantidadPasiva: 6,
  luzM: 7.2,
  simple: { hM: 0.45, bM: 0.6, areaM2: 0.24, iM4: 0.0037, ygM: 0.206, perimetroM: 2.1 },
  compuesta: { hM: 0.5, bM: 0.6, areaM2: 0.3, iM4: 0.0072, ygM: 0.26, perimetroM: 2.4 },
  recMecPasivaM: 0.035,
  recMecPretensadoM: 0.05,
  cargaMuertaKNm: 46.605,
  sobrecargaKNm: 28.68,
  cargaEvKNm: 0,
  toronesInf: 8,
  toronesSup: 0,
  perdidasInstantaneas: 0.15,
  perdidasDiferidas: 0.1,
  humedadRelativa: 90,
};

const LOSA: DatosPretensado = {
  fcPremoldeadoMPa: 45,
  fciMPa: 36,
  fcInSituMPa: 30,
  densidadKgM3: 2500,
  fpuMPa: 1860,
  epMPa: 195000,
  areaToronMm2: 98.7,
  fuerzaPorToronKN: 125,
  fyPasivaMPa: 420,
  diametroPasivaMm: 16,
  cantidadPasiva: 0,
  luzM: 6.8,
  simple: { hM: 0.15, bM: 1.988, areaM2: 0.2982, iM4: 5.59125e-4, ygM: 0.075, perimetroM: 4.276 },
  compuesta: { hM: 0.2, bM: 1.988, areaM2: 0.3976, iM4: 1.3253333333333337e-3, ygM: 0.1, perimetroM: 4.376 },
  recMecPasivaM: 0.035,
  recMecPretensadoM: 0.035,
  cargaMuertaKNm: 2.982,
  sobrecargaKNm: 7.952,
  cargaEvKNm: 0,
  toronesInf: 10,
  toronesSup: 0,
  perdidasInstantaneas: 0.15,
  perdidasDiferidas: 0.1,
  humedadRelativa: 90,
};

describe("propiedades de los materiales", () => {
  it("Ec y Eci salen de 4700·√f'c, art. 19.2.2", () => {
    expect(moduloElasticidad(50)).toBeCloseTo(33234.018715767736, 6);
    expect(moduloElasticidad(40)).toBeCloseTo(29725.410005582766, 6);
    expect(moduloElasticidad(45)).toBeCloseTo(31528.558482747037, 6);
    expect(moduloElasticidad(36)).toBeCloseTo(28200, 6);
  });

  it("β1 baja 0,05 cada 7 MPa por encima de 28, con piso en 0,65", () => {
    expect(beta1(28)).toBeCloseTo(0.85, 9);
    expect(beta1(25)).toBeCloseTo(0.85, 9);
    expect(beta1(35)).toBeCloseTo(0.8, 9);
    expect(beta1(100)).toBeCloseTo(0.65, 9);
  });
});

describe("viga: contraste contra la planilla", () => {
  const r = calcularPretensado(VIGA);

  it("reproduce las propiedades de sección", () => {
    expect(r.propiedades.ecMPa).toBeCloseTo(33234.018715767736, 4);
    expect(r.propiedades.eciMPa).toBeCloseTo(29725.410005582766, 4);
    expect(r.propiedades.sxInfSimpleM3).toBeCloseTo(1.7961165048543691e-2, 9);
    expect(r.propiedades.sxSupSimpleM3).toBeCloseTo(1.5163934426229507e-2, 9);
    expect(r.propiedades.excentricidadM).toBeCloseTo(0.156, 9);
    expect(r.propiedades.dpM).toBeCloseTo(0.45, 9);
    expect(r.propiedades.dsM).toBeCloseTo(0.465, 9);
    expect(r.propiedades.apRealMm2).toBeCloseTo(792, 9);
  });

  it("reproduce cargas y momentos", () => {
    expect(r.cargas.pesoPropioKNm).toBeCloseTo(6, 9);
    expect(r.cargas.pesoPropioMasCarpetaKNm).toBeCloseTo(7.5, 9);
    expect(r.cargas.momentoPesoPropioKNm).toBeCloseTo(38.88, 6);
    expect(r.cargas.momentoLargaDuracionKNm).toBeCloseTo(536.4468, 4);
    expect(r.cargas.momentoUltimoKNm).toBeCloseTo(718.07472, 4);
  });

  it("reproduce las fuerzas de pretensado", () => {
    expect(r.fuerzas.poKN).toBeCloseTo(1248, 9);
    expect(r.fuerzas.piKN).toBeCloseTo(1060.8, 6);
    expect(r.fuerzas.pfKN).toBeCloseTo(936, 6);
  });

  it("reproduce las tensiones en las fibras", () => {
    // Celdas C90 a C92 de la planilla, agrupadas por situación.
    expect(r.tensiones[0].sigmaSupMPa).toBeCloseTo(6.4930516756756749, 6);
    expect(r.tensiones[0].sigmaInfMPa).toBeCloseTo(-13.63347805405405, 6);
    expect(r.tensiones[1].sigmaSupMPa).toBeCloseTo(3.9290732972972964, 6);
    // Y sus admisibles, celdas D90 a D94.
    expect(r.tensiones[0].admisibleTraccionMPa).toBeCloseTo(3.1622776601683795, 9);
    expect(r.tensiones[0].admisibleCompresionMPa).toBeCloseTo(-28, 9);
    expect(r.tensiones[1].admisibleCompresionMPa).toBeCloseTo(-24, 9);
    expect(r.tensiones[2].admisibleTraccionMPa).toBeCloseTo(4.3840620433565949, 9);
  });

  it("reproduce el área de pretensado necesaria", () => {
    expect(r.armaduraActiva.apRequeridoPermanenteMm2).toBeCloseTo(814.74654377880177, 6);
    expect(r.armaduraActiva.apRequeridoTemporalMm2).toBeCloseTo(838.70967741935488, 6);
    expect(r.armaduraActiva.apMinimoMm2).toBeCloseTo(838.70967741935488, 6);
    // 8 torones de 99 mm² no alcanzan: la planilla también decía "AUMENTAR".
    expect(r.armaduraActiva.verifica).toBe(false);
  });

  it("reproduce las cuatro pérdidas", () => {
    expect(r.perdidas.esMPa).toBeCloseTo(73.951960010266134, 5);
    expect(r.perdidas.shMPa).toBeCloseTo(15.946141714285712, 6);
    expect(r.perdidas.crMPa).toBeCloseTo(-17.131884578357699, 5);
    expect(r.perdidas.reMPa).toBeCloseTo(29.811998705194281, 5);
    expect(r.perdidas.totalMPa).toBeCloseTo(102.57821585138844, 5);
    expect(r.perdidas.tensionEfectivaMPa).toBeCloseTo(1575.7575757575758, 6);
    expect(r.perdidas.tensionTrasTesadoMPa).toBeCloseTo(1678.3357916089642, 5);
    expect(r.perdidas.tensionAdmisibleMPa).toBeCloseTo(1488, 9);
  });

  it("reproduce los límites de flecha", () => {
    expect(r.deformaciones.limiteInstantaneaMm).toBeCloseTo(20, 9);
    expect(r.deformaciones.limiteActivaMm).toBeCloseTo(30, 6);
    expect(r.deformaciones.limiteTotalMm).toBeCloseTo(28.8, 6);
  });
});

describe("losa: contraste contra la planilla", () => {
  const r = calcularPretensado(LOSA);

  it("reproduce propiedades, cargas y fuerzas", () => {
    expect(r.propiedades.ecMPa).toBeCloseTo(31528.558482747037, 4);
    expect(r.propiedades.excentricidadM).toBeCloseTo(0.04, 9);
    expect(r.cargas.pesoPropioKNm).toBeCloseTo(7.455, 6);
    expect(r.cargas.pesoPropioMasCarpetaKNm).toBeCloseTo(9.94, 6);
    expect(r.cargas.momentoPesoPropioKNm).toBeCloseTo(43.0899, 4);
    expect(r.cargas.momentoLargaDuracionKNm).toBeCloseTo(120.65172, 4);
    expect(r.cargas.momentoUltimoKNm).toBeCloseTo(163.167088, 4);
    expect(r.fuerzas.poKN).toBeCloseTo(1250, 9);
    expect(r.fuerzas.piKN).toBeCloseTo(1062.5, 6);
    expect(r.fuerzas.pfKN).toBeCloseTo(937.5, 6);
  });

  it("reproduce las tensiones y las cuatro pérdidas", () => {
    expect(r.tensiones[0].sigmaSupMPa).toBeCloseTo(2.1378269617706223, 6);
    expect(r.tensiones[0].sigmaInfMPa).toBeCloseTo(-9.263916834339371, 6);
    expect(r.perdidas.esMPa).toBeCloseTo(30.416692352697751, 5);
    expect(r.perdidas.shMPa).toBeCloseTo(15.963237317118802, 6);
    expect(r.perdidas.crMPa).toBeCloseTo(39.158322108755797, 5);
    expect(r.perdidas.reMPa).toBeCloseTo(31.945304725434493, 5);
    expect(r.perdidas.totalMPa).toBeCloseTo(117.48355650400684, 5);
  });

  it("con 10 torones el área activa alcanza, a diferencia de la viga", () => {
    expect(r.armaduraActiva.apMinimoMm2).toBeCloseTo(840.05376344086028, 6);
    expect(r.armaduraActiva.apRealMm2).toBeCloseTo(987, 9);
    expect(r.armaduraActiva.verifica).toBe(true);
  });
});

/*
 * Cinco cosas que las planillas resolvían de un modo que no se corresponde con
 * el articulado. Se dejan como test para que la corrección no se pierda si
 * alguien vuelve a cargar los valores desde el Excel.
 */
describe("correcciones respecto de las planillas", () => {
  it("ρp se calcula con la sección real y no con un área fija", () => {
    const viga = calcularPretensado(VIGA);
    const losa = calcularPretensado(LOSA);

    // Las planillas traían Ap/((0,2072 − 9·0,0091)·10⁶), sin relación con la
    // sección: daba la misma área de referencia para la viga y para la losa.
    const areaFijaPlanilla = (0.2072 - 9 * 0.0091) * 1e6;
    expect(viga.flexion.cuantiaPretensado).toBeCloseTo(792 / (0.6 * 0.45 * 1e6), 9);
    expect(losa.flexion.cuantiaPretensado).toBeCloseTo(987 / (1.988 * 0.165 * 1e6), 9);

    // La planilla sobrestimaba ρp, lo que baja fps: iba del lado seguro.
    expect(792 / areaFijaPlanilla).toBeGreaterThan(viga.flexion.cuantiaPretensado);
    expect(viga.flexion.fpsMPa).toBeGreaterThan(1619.8857969109431);
  });

  it("Mcr incluye el módulo de rotura, que la planilla omitía", () => {
    const r = calcularPretensado(VIGA);
    expect(r.cuantiaMinima.frMPa).toBeCloseTo(0.62 * Math.sqrt(50), 9);
    // Omitirlo subestima Mcr y hace pasar la comprobación con holgura de más.
    expect(r.cuantiaMinima.mcrKNm).toBeGreaterThan(265.0283495145631);
  });

  it("hay una sola excentricidad, medida desde el baricentro", () => {
    const r = calcularPretensado(VIGA);
    // La planilla usaba 0,156 m para las tensiones y 0,175 m —medida desde la
    // media altura— para Mcr. En sección no simétrica no pueden ser las dos.
    expect(r.propiedades.excentricidadM).toBeCloseTo(0.206 - 0.05, 9);
    expect(r.propiedades.excentricidadM).not.toBeCloseTo(0.45 / 2 - 0.05, 3);
  });

  it("la fluencia usa la carga sostenida, no la total", () => {
    const r = calcularPretensado(VIGA);
    // fcds sale del momento de carga muerta sobreimpuesta (302,0 kN·m), no del
    // de larga duración, que incluye la sobrecarga de uso.
    const fcdsEsperado = (302.00040000000001 * 0.156) / 0.0037 / 1000;
    expect(fcdsEsperado).toBeCloseTo(12.732989837837835, 6);
    expect(r.perdidas.crMPa).toBeCloseTo(-17.131884578357699, 5);
  });

  it("φ baja cuando la sección no es dúctil", () => {
    const r = calcularPretensado(VIGA);
    expect(r.flexion.controladaPorTraccion).toBe(true);
    expect(r.flexion.momentoAdmisibleKNm).toBeCloseTo(0.9 * r.flexion.mnKNm, 6);

    // Con muchísimo pretensado la sección se sobrearma y φ tiene que caer.
    const sobrearmada = calcularPretensado({ ...VIGA, toronesInf: 40 });
    expect(sobrearmada.flexion.controladaPorTraccion).toBe(false);
    expect(sobrearmada.flexion.momentoAdmisibleKNm).toBeLessThan(0.9 * sobrearmada.flexion.mnKNm);
  });
});

describe("coherencia del modelo", () => {
  it("más torones dan más momento resistente y menos tracción en la fibra inferior", () => {
    const pocos = calcularPretensado({ ...VIGA, toronesInf: 6 });
    const muchos = calcularPretensado({ ...VIGA, toronesInf: 10 });

    expect(muchos.flexion.mnKNm).toBeGreaterThan(pocos.flexion.mnKNm);
    // El pretensado comprime la fibra inferior: más torones, menos tracción en
    // servicio, que es la situación donde esa fibra trabaja a tracción.
    expect(muchos.tensiones[2].sigmaInfMPa).toBeLessThan(pocos.tensiones[2].sigmaInfMPa);
  });

  it("cada fibra se compara contra los dos límites de su situación", () => {
    const r = calcularPretensado(VIGA);
    for (const t of r.tensiones) {
      const dentro = (s: number) =>
        s <= t.admisibleTraccionMPa && s >= t.admisibleCompresionMPa;
      expect(t.verificaSup).toBe(dentro(t.sigmaSupMPa));
      expect(t.verificaInf).toBe(dentro(t.sigmaInfMPa));
      expect(t.verifica).toBe(t.verificaSup && t.verificaInf);
      // La banda siempre tiene la compresión por debajo de cero y la tracción por encima.
      expect(t.admisibleCompresionMPa).toBeLessThan(0);
      expect(t.admisibleTraccionMPa).toBeGreaterThan(0);
    }
  });

  it("en transferencia se tracciona arriba y en servicio abajo", () => {
    const r = calcularPretensado(VIGA);
    // El pretensado excéntrico levanta la pieza: arriba tracción, abajo compresión.
    expect(r.tensiones[0].sigmaSupMPa).toBeGreaterThan(0);
    expect(r.tensiones[0].sigmaInfMPa).toBeLessThan(0);
    // Con las cargas de servicio se invierte.
    expect(r.tensiones[2].sigmaSupMPa).toBeLessThan(0);
    expect(r.tensiones[2].sigmaInfMPa).toBeGreaterThan(0);
  });

  it("una luz mayor aumenta momentos y flechas", () => {
    const corta = calcularPretensado({ ...VIGA, luzM: 6 });
    const larga = calcularPretensado({ ...VIGA, luzM: 9 });

    expect(larga.cargas.momentoUltimoKNm).toBeGreaterThan(corta.cargas.momentoUltimoKNm);
    expect(larga.deformaciones.totalMm).toBeGreaterThan(corta.deformaciones.totalMm);
    expect(larga.deformaciones.limiteTotalMm).toBeGreaterThan(corta.deformaciones.limiteTotalMm);
  });
});
