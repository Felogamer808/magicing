import { describe, expect, it } from "vitest";
import {
  apDerivadaMm2PorM,
  BMIN_NERVIO_M,
  CATALOGO_DECKPANEL_ARMCO,
  ESPESOR_DECKPANEL_ESTANDAR_MM,
  FY_ACERO_DECKPANEL_MPA,
  PERFIL_DECKPANEL,
  yInfChapaM,
} from "./deckpanel-armco";

// Folleto ARMCO "deckpanel — Sistema para losas de entrepiso". Los números de
// estos tests salen directo de la TABLA 1 (propiedades), la TABLA 2
// (cubicación y peso propio) y el bloque de propiedades mecánicas.

const ESPESORES = [0.71, 0.89, 1.24];

describe("geometría del perfil, igual para los tres espesores", () => {
  it("el paso de nervio entra exacto 3 veces en el ancho efectivo", () => {
    expect(PERFIL_DECKPANEL.anchoEfectivoM / PERFIL_DECKPANEL.pasoNervioM).toBeCloseTo(3, 9);
  });

  it("reproduce la altura de nervio del folleto, 63 mm", () => {
    expect(PERFIL_DECKPANEL.alturaNervioM).toBeCloseTo(0.063, 9);
  });

  /**
   * La cota inferior del folleto es 61 | 183 | 122 | 183 | 122 | 183 | 61.
   * Se lee como: el panel arranca a medio valle, cada 183 es una cresta plana
   * más sus dos almas, y entre crestas queda el valle plano.
   */
  it("las cotas del valle, la cresta y las almas cierran el paso", () => {
    const { anchoValleM, anchoCrestaM, proyeccionAlmaM, pasoNervioM } = PERFIL_DECKPANEL;
    expect(anchoValleM + anchoCrestaM + 2 * proyeccionAlmaM).toBeCloseTo(pasoNervioM, 9);
    // El tramo de 183 del folleto: cresta más las dos almas.
    expect((anchoCrestaM + 2 * proyeccionAlmaM) * 1000).toBeCloseTo(183, 6);
    // Y el panel empieza a medio valle: los 61 de los extremos.
    expect((anchoValleM / 2) * 1000).toBeCloseTo(61, 6);
  });

  it("las tres cotas de la línea inferior suman el ancho efectivo", () => {
    const { anchoValleM, anchoCrestaM, proyeccionAlmaM, anchoEfectivoM } = PERFIL_DECKPANEL;
    const tramoCresta = anchoCrestaM + 2 * proyeccionAlmaM;
    // 61 + (183 + 122)·2 + 183 + 61
    const total = anchoValleM / 2 + 3 * tramoCresta + 2 * anchoValleM + anchoValleM / 2;
    expect(total).toBeCloseTo(anchoEfectivoM, 9);
  });
});

describe("acero base, ASTM A653 SS grado 37", () => {
  it("toma el fy impreso en el folleto", () => {
    expect(FY_ACERO_DECKPANEL_MPA).toBe(255.1);
  });
});

describe("bmin: ahora sale del catálogo, ya no es una estimación visual", () => {
  it("es el fondo plano del valle", () => {
    expect(BMIN_NERVIO_M).toBe(PERFIL_DECKPANEL.anchoValleM);
    expect(BMIN_NERVIO_M * 1000).toBeCloseTo(122, 9);
  });

  it("es menor que el paso: el fondo del valle no puede ocupar todo el paso", () => {
    expect(BMIN_NERVIO_M).toBeLessThan(PERFIL_DECKPANEL.pasoNervioM);
  });

  /**
   * Contraste independiente con la TABLA 2: descontando el hormigón sobre
   * cresta, lo que aportan los valles es constante en los cinco espesores
   * tabulados. Ese volumen fija el área del trapecio y con ella su base.
   */
  it("el volumen de hormigón de la Tabla 2 devuelve el mismo ancho de valle", () => {
    const volumenPorHcCm: Record<number, number> = {
      5: 0.0816, 6: 0.0916, 8: 0.1116, 10: 0.1316, 12: 0.1516,
    };
    const aportes = Object.entries(volumenPorHcCm).map(
      ([hcCm, vol]) => vol - Number(hcCm) / 100
    );
    // Constante: el hormigón de los valles no depende del espesor sobre cresta.
    for (const aporte of aportes) expect(aporte).toBeCloseTo(0.0316, 6);

    // Área de un valle y ancho medio del trapecio.
    const areaValleMm2 = 0.0316 * PERFIL_DECKPANEL.pasoNervioM * 1e6;
    const anchoMedioMm = areaValleMm2 / (PERFIL_DECKPANEL.alturaNervioM * 1000);
    // base + techo = 2·ancho medio, y el techo es la cresta más las dos almas.
    const techoMm = (PERFIL_DECKPANEL.anchoCrestaM + 2 * PERFIL_DECKPANEL.proyeccionAlmaM) * 1000;
    const baseImplicitaMm = 2 * anchoMedioMm - techoMm;
    // Cae en el 122 de la cota, dentro del redondeo de la tabla.
    expect(Math.abs(baseImplicitaMm - BMIN_NERVIO_M * 1000)).toBeLessThan(1.5);
  });
});

describe("0,89 mm es el espesor estándar", () => {
  it("es el que se toma por defecto", () => {
    expect(ESPESOR_DECKPANEL_ESTANDAR_MM).toBe(0.89);
    expect(CATALOGO_DECKPANEL_ARMCO[ESPESOR_DECKPANEL_ESTANDAR_MM]).toBeDefined();
  });
});

describe("catálogo por espesor: TABLA 1 y TABLA 2", () => {
  it("reproduce los tres espesores con sus propiedades nominales", () => {
    expect(CATALOGO_DECKPANEL_ARMCO[0.71]).toMatchObject({
      espesorAceroBaseMm: 0.69, pesoChapaKgM2: 7.17, ixCm4PorM: 62.95, wxCm3PorM: 19.79,
    });
    expect(CATALOGO_DECKPANEL_ARMCO[0.89]).toMatchObject({
      espesorAceroBaseMm: 0.87, pesoChapaKgM2: 9.05, ixCm4PorM: 79.14, wxCm3PorM: 24.85,
    });
    expect(CATALOGO_DECKPANEL_ARMCO[1.24]).toMatchObject({
      espesorAceroBaseMm: 1.22, pesoChapaKgM2: 12.72, ixCm4PorM: 110.21, wxCm3PorM: 34.52,
    });
  });

  it("el acero base es siempre 0,02 mm menos que el panel: es el galvanizado", () => {
    for (const espesor of ESPESORES) {
      const fila = CATALOGO_DECKPANEL_ARMCO[espesor];
      expect(fila.espesorMm - fila.espesorAceroBaseMm).toBeCloseTo(0.02, 9);
    }
  });

  it("reproduce el peso propio total del 0,89 mm por espesor de hormigón", () => {
    expect(CATALOGO_DECKPANEL_ARMCO[0.89].pesoPropioTotalPorHcCm)
      .toEqual({ 5: 205, 6: 229, 8: 277, 10: 325, 12: 373 });
  });

  it("el peso propio total es el del hormigón más el de la chapa", () => {
    // TABLA 2, columna de hormigón para hc=5: 195,84 kg/m².
    const fila = CATALOGO_DECKPANEL_ARMCO[0.89];
    expect(195.84 + fila.pesoChapaKgM2).toBeCloseTo(fila.pesoPropioTotalPorHcCm[5], 0);
  });
});

describe("yInfChapaM: derivado de Ix/Wx, contrastado contra la edición anterior", () => {
  it("reproduce a mano el 0,89 mm: 63 − Ix/Wx", () => {
    const ySupMm = (79.14 / 24.85) * 10;
    expect(yInfChapaM(0.89) * 1000).toBeCloseTo(63 - ySupMm, 6);
    expect(yInfChapaM(0.89) * 1000).toBeCloseTo(31.15, 1);
  });

  it("da prácticamente lo mismo en los tres espesores: es geometría del perfil, no del espesor", () => {
    const enMm = ESPESORES.map((espesor) => yInfChapaM(espesor) * 1000);
    // 31,19 / 31,15 / 31,07: la dispersión es el redondeo de Ix y Wx en el
    // folleto, no una diferencia real de perfil.
    expect(Math.max(...enMm) - Math.min(...enMm)).toBeLessThan(0.15);
  });

  /**
   * La edición anterior del folleto publicaba Sx,inferior por separado y daba
   * yInf = Ix/Sx,inf ≈ 31,13 mm en los tres espesores. Que esta edición, por
   * un camino distinto (63 − Ix/Wx), devuelva lo mismo confirma las dos cosas
   * que hacen falta: que el perfil no cambió y que el Wx publicado es el de la
   * fibra superior.
   */
  it("coincide con lo que daba la edición anterior por Ix/Sx,inferior", () => {
    const edicionAnteriorMm = 31.13;
    for (const espesor of ESPESORES) {
      expect(Math.abs(yInfChapaM(espesor) * 1000 - edicionAnteriorMm)).toBeLessThan(0.1);
    }
  });

  it("el centroide queda dentro del perfil y cerca del medio canto", () => {
    const yInfMm = yInfChapaM(0.89) * 1000;
    expect(yInfMm).toBeGreaterThan(0);
    expect(yInfMm).toBeLessThan(63);
    expect(Math.abs(yInfMm - 63 / 2)).toBeLessThan(2);
  });

  it("lanza si se pide un espesor que no está en el catálogo", () => {
    expect(() => yInfChapaM(1)).toThrow();
  });
});

describe("apDerivadaMm2PorM: derivada del peso, contrastada con el acero base", () => {
  it("reproduce a mano el 0,89 mm: (peso − zinc)/densidad", () => {
    expect(apDerivadaMm2PorM(0.89)).toBeCloseTo(((9.05 - 0.18) / 7850) * 1e6, 3);
    expect(apDerivadaMm2PorM(0.89)).toBeCloseTo(1129.9, 0);
  });

  it("descuenta el galvanizado: da menos que el peso completo", () => {
    expect(apDerivadaMm2PorM(0.89)).toBeLessThan((9.05 / 7850) * 1e6);
  });

  it("crece con el espesor de chapa, como el peso", () => {
    expect(apDerivadaMm2PorM(0.71)).toBeLessThan(apDerivadaMm2PorM(0.89));
    expect(apDerivadaMm2PorM(0.89)).toBeLessThan(apDerivadaMm2PorM(1.24));
  });

  /**
   * El contraste que esta edición hace posible: dividiendo por el espesor de
   * acero base sale cuánto se desarrolla el perfil respecto de su proyección
   * plana. Como la forma no cambia con el espesor de la chapa, ese factor tiene
   * que ser el mismo en los tres — y lo es.
   */
  it("el factor de desarrollo es el mismo en los tres espesores", () => {
    const factores = ESPESORES.map((espesor) => {
      const fila = CATALOGO_DECKPANEL_ARMCO[espesor];
      return apDerivadaMm2PorM(espesor) / (fila.espesorAceroBaseMm * 1000);
    });
    for (const factor of factores) {
      expect(Math.abs(factor - 1.3)).toBeLessThan(0.02);
    }
    expect(Math.max(...factores) / Math.min(...factores)).toBeLessThan(1.015);
  });

  it("supera el desarrollo del trapecio puro: las muescas y los solapes suman chapa", () => {
    const { anchoValleM, anchoCrestaM, proyeccionAlmaM, alturaNervioM, pasoNervioM } =
      PERFIL_DECKPANEL;
    const almaM = Math.hypot(alturaNervioM, proyeccionAlmaM);
    const trapecio = (anchoValleM + anchoCrestaM + 2 * almaM) / pasoNervioM;
    expect(trapecio).toBeCloseTo(1.259, 2);

    const fila = CATALOGO_DECKPANEL_ARMCO[0.89];
    const real = apDerivadaMm2PorM(0.89) / (fila.espesorAceroBaseMm * 1000);
    expect(real).toBeGreaterThan(trapecio);
    // Pero no por mucho: son muescas, no otro perfil.
    expect(real / trapecio).toBeLessThan(1.06);
  });
});
