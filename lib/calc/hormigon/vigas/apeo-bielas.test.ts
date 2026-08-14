import { describe, expect, it } from "vitest";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";
import {
  calcularVigaApeoBielas,
  type DatosVigaApeo,
  type GeometriaVigaApeo,
} from "@/lib/calc/hormigon/vigas/apeo-bielas";

/**
 * Caso de referencia, resuelto a mano paso a paso (no viene de la planilla: es
 * método general de norma, así que los valores se contrastan contra el
 * desarrollo escrito abajo y contra tests de coherencia y monotonía).
 *
 * HM-30 / B500S, γc = 1,5 y γs = 1,15 (art. 2.4.2.4 tabla A19.2.1N).
 * Viga de apeo de 5,00 × 2,00 × 0,50 m, pilar de 0,40 m centrado, Nd = 2000 kN
 * ya mayorado, más 30 kN/m repartidos. Apoyos de 0,40 m con 0,30 m de voladizo.
 *
 *   d  = 2,00 − 0,05 − 0,012 − 0,025/2      = 1,9255 m
 *   R  = 2000·2,5/5 + 30·5/2                = 1075 kN
 *   M  = 1075·2,5 − 30·2,5²/2               = 2593,75 kN·m
 *   ν' = 1 − 30/250                         = 0,88
 *   σ_sup = 1,00·0,88·20                    = 17,60 MPa      (ec. 6.60, k1 = 1,0)
 *   z  = (d/2)·[1 + √(1 − 2M/(σ_sup·b·d²))] = 1,8457 m
 *   θ  = atan(1,8457/2,5)                   = 36,46°
 *   T  = R/tg θ                             = 1456,1 kN
 *   As = T/fyd = 1456,1/434,78·10           = 33,49 cm²
 */
const materiales = derivarMateriales({ fck: 30, fyk: 500 });

const geometria: GeometriaVigaApeo = {
  luzM: 5,
  hM: 2,
  bM: 0.5,
  recubrimientoM: 0.05,
  posicionCargaM: 2.5,
  anchoPilarApeadoM: 0.4,
  anchoApoyoIzqM: 0.4,
  anchoApoyoDerM: 0.4,
  voladizoIzqM: 0.3,
  voladizoDerM: 0.3,
};

const datos: DatosVigaApeo = {
  ndPilarKN: 2000,
  qdKNPorM: 30,
  transmision: "directa",
  tirante: { numero: 8, diametroMm: 25 },
  diametroEstriboMm: 12,
  mallaHorizontal: { diametroMm: 12, separacionM: 0.2 },
  mallaVertical: { diametroMm: 12, separacionM: 0.2 },
};

const r = calcularVigaApeoBielas(materiales, geometria, datos);

describe("clasificación de la región", () => {
  it("con luz 5,00 y canto 2,00 es viga de gran canto para el Anejo 19", () => {
    // Art. 5.3.1(3): es viga si la luz supera 3 veces el canto. 5,00 ≤ 6,00.
    expect(r.region.esGranCantoAnejo19).toBe(true);
    expect(r.region.relacionLuzCanto).toBeCloseTo(2.5, 9);
  });

  it("pero no lo es para Montoya, que corta en luz/canto < 2", () => {
    // §24.7.1. Los dos criterios discrepan a propósito y el resultado los
    // muestra por separado en vez de elegir uno.
    expect(r.region.esGranCantoMontoya).toBe(false);
    expect(r.region.luzMontoyaM).toBeCloseTo(5, 9);
  });

  it("la carga está a menos de 2·d del apoyo, así que igual es región D", () => {
    expect(r.region.aIzqSobreD).toBeCloseTo(2.5 / 1.9255, 6);
    expect(r.region.cargaProximaAlApoyo).toBe(true);
    expect(r.region.esRegionD).toBe(true);
  });

  it("una viga esbelta con la carga lejos del apoyo queda fuera del modelo", () => {
    const esbelta = calcularVigaApeoBielas(
      materiales,
      { ...geometria, luzM: 12, hM: 0.8, posicionCargaM: 6 },
      datos
    );
    expect(esbelta.region.esGranCantoAnejo19).toBe(false);
    expect(esbelta.region.cargaProximaAlApoyo).toBe(false);
    expect(esbelta.region.esRegionD).toBe(false);
  });
});

describe("modelo de bielas y tirantes", () => {
  it("canto útil y equilibrio externo", () => {
    expect(r.modelo.dM).toBeCloseTo(1.9255, 9);
    expect(r.modelo.reaccionIzqKN).toBeCloseTo(1075, 9);
    expect(r.modelo.reaccionDerKN).toBeCloseTo(1075, 9);
    expect(r.modelo.momentoKNm).toBeCloseTo(2593.75, 9);
  });

  it("el brazo sale del tope del nudo superior", () => {
    expect(r.bielas.nuPrima).toBeCloseTo(0.88, 9);
    expect(r.modelo.zNudoM).toBeCloseTo(1.8457, 3);
    expect(r.modelo.verificaCabezaComprimida).toBe(true);
    // No clasifica como viga pared de Montoya, así que no hay z alternativo.
    expect(r.modelo.zMontoyaM).toBeNull();
    expect(r.modelo.zAdoptadoM).toBeCloseTo(r.modelo.zNudoM, 9);
  });

  it("inclinación y compresión de las bielas", () => {
    expect(r.modelo.anguloBielaIzqGrados).toBeCloseTo(36.46, 1);
    expect(r.modelo.compresionBielaIzqKN).toBeCloseTo(1810, 0);
  });

  it("la tracción del tirante sale del equilibrio del nudo de apoyo", () => {
    expect(r.modelo.traccionTiranteKN).toBeCloseTo(1456.1, 0);
  });

  it("sin carga repartida el tirante se reduce exactamente a M/z", () => {
    // Comprobación de coherencia del modelo: con una única carga puntual el
    // equilibrio de nudos y la fórmula de flexión tienen que dar lo mismo.
    const puntual = calcularVigaApeoBielas(materiales, geometria, { ...datos, qdKNPorM: 0 });
    expect(puntual.modelo.traccionTiranteKN).toBeCloseTo(
      puntual.modelo.momentoKNm / puntual.modelo.zAdoptadoM,
      6
    );
  });

  it("con carga repartida el tirante es mayor que M/z", () => {
    // El nudo de apoyo ve la reacción completa; usar M/z subestimaría el tirante.
    expect(r.modelo.traccionTiranteKN).toBeGreaterThan(
      r.modelo.momentoKNm / r.modelo.zAdoptadoM
    );
  });

  it("si el momento no entra en la cabeza comprimida, avisa en vez de dar NaN", () => {
    const sobrecargada = calcularVigaApeoBielas(materiales, geometria, {
      ...datos,
      ndPilarKN: 40000,
    });
    expect(sobrecargada.modelo.verificaCabezaComprimida).toBe(false);
    expect(Number.isFinite(sobrecargada.modelo.zAdoptadoM)).toBe(true);
    expect(sobrecargada.bielas.nudoSuperior.verifica).toBe(false);
  });
});

describe("tirante", () => {
  it("As necesario con fyd pleno", () => {
    expect(r.tirante.fydMPa).toBeCloseTo(500 / 1.15, 9);
    expect(r.tirante.asNecEc2Cm2).toBeCloseTo(33.49, 1);
  });

  it("no aplica el tope de 400 MPa porque no clasifica como viga pared", () => {
    expect(r.tirante.topeAplicado).toBe(false);
    expect(r.tirante.asNecCm2).toBeCloseTo(r.tirante.asNecEc2Cm2, 9);
  });

  it("8Ø25 verifican y entran en los 0,50 m de ancho", () => {
    expect(r.tirante.asRealCm2).toBeCloseTo(39.27, 2);
    expect(r.tirante.verificaAs).toBe(true);
    expect(r.tirante.aprovechamiento).toBeCloseTo(0.853, 2);
    expect(r.tirante.bNecM).toBeCloseTo(0.499, 9);
    expect(r.tirante.verificaBNec).toBe(true);
    // Separación LIBRE, de cara a cara de barra, que es la que acota el
    // art. 8.2(2). Entre ejes daría 50,14 mm y no es lo que pide la norma.
    expect(r.tirante.separacionMm).toBeCloseTo(25.14, 1);
  });

  it("el tirante se reparte en 0,12·luz", () => {
    // Montoya §24.7.3.e: no va concentrado en una fila pegada al borde.
    expect(r.tirante.alturaRepartoM).toBeCloseTo(0.6, 9);
  });

  it("en viga pared el tope de Montoya encarece la armadura", () => {
    // Con luz/canto = 1,5 sí clasifica, así que manda fyd ≯ 400 MPa
    // (§24.7.3.c, pág. 391 / impresa 357, contrastado contra el PDF).
    const pared = calcularVigaApeoBielas(
      materiales,
      { ...geometria, luzM: 3, posicionCargaM: 1.5 },
      datos
    );
    expect(pared.region.esGranCantoMontoya).toBe(true);
    expect(pared.tirante.topeAplicado).toBe(true);
    expect(pared.tirante.fydTopadoMPa).toBe(400);
    expect(pared.tirante.asNecCm2).toBeCloseTo(pared.tirante.asNecMontoyaCm2, 9);
    // 434,78/400 − 1 ≈ 8,7 % más de acero por el mismo esfuerzo.
    expect(pared.tirante.asNecCm2 / pared.tirante.asNecEc2Cm2).toBeCloseTo(500 / 1.15 / 400, 6);
  });

  it("en viga pared el brazo lo gobierna el menor de los dos criterios", () => {
    const pared = calcularVigaApeoBielas(
      materiales,
      { ...geometria, luzM: 3, posicionCargaM: 1.5 },
      datos
    );
    expect(pared.modelo.zMontoyaM).not.toBeNull();
    expect(pared.modelo.zAdoptadoM).toBeCloseTo(
      Math.min(pared.modelo.zNudoM, pared.modelo.zMontoyaM ?? Infinity),
      9
    );
  });
});

describe("anclaje del tirante", () => {
  /**
   *   fctm  = 0,3·30^(2/3)                    = 2,8965 MPa   (tabla A19.3.1)
   *   fctd  = 1,00·0,7·2,8965/1,5             = 1,3517 MPa   (ec. 3.16)
   *   fbd   = 2,25·1,0·1,0·1,3517             = 3,0413 MPa   (ec. 8.2)
   *   σsd   = 10·1456,1/39,27                 = 370,7 MPa
   *   lb,rqd= (25/4)·(370,7/3,0413)           = 761,8 mm     (ec. 8.3)
   */
  it("la adherencia sale del hormigón, no de una regla de m·φ²", () => {
    expect(r.anclaje.fctdMPa).toBeCloseTo(1.3517, 3);
    expect(r.anclaje.eta1).toBe(1);
    expect(r.anclaje.eta2).toBe(1);
    expect(r.anclaje.fbdMPa).toBeCloseTo(3.0413, 3);
    expect(r.anclaje.sigmaSdMPa).toBeCloseTo(370.7, 0);
    expect(r.anclaje.lbRqdMm).toBeCloseTo(761.8, 0);
  });

  it("armar de más acorta el anclaje, porque σsd baja", () => {
    const masAcero = calcularVigaApeoBielas(materiales, geometria, {
      ...datos,
      tirante: { numero: 10, diametroMm: 25 },
    });
    expect(masAcero.anclaje.sigmaSdMPa).toBeLessThan(r.anclaje.sigmaSdMPa);
    expect(masAcero.anclaje.lbRqdMm).toBeLessThan(r.anclaje.lbRqdMm);
  });

  it("con cd chico doblar no bonifica: α1 y α2 se quedan en 1,00", () => {
    // cd = mín(a/2; c1; c) = mín(25,14/2; 62) = 12,57 mm (fig. A19.8.3), muy por
    // debajo de 3φ = 75 mm, así que la tabla A19.8.2 no da el 0,7 de la barra
    // doblada. La horquilla acá sirve por geometría, no por coeficiente.
    expect(r.anclaje.cdMm).toBeCloseTo(12.57, 1);
    expect(r.anclaje.horquilla.alfa1).toBe(1);
    expect(r.anclaje.horquilla.alfa2).toBe(1);
    expect(r.anclaje.horquilla.lbdMm).toBeCloseTo(r.anclaje.recto.lbdMm, 9);
  });

  it("lb,min no manda acá, pero está calculada", () => {
    // máx(0,3·761,8; 10·25; 100) = 250 mm, muy por debajo de lbd.
    expect(r.anclaje.recto.lbMinMm).toBeCloseTo(250, 9);
    expect(r.anclaje.recto.lbdMm).toBeCloseTo(r.anclaje.recto.lbdBrutaMm, 9);
  });

  it("los dos criterios de arranque dan longitudes distintas", () => {
    // Anejo 19 art. 6.5.4(7): desde la cara interior del apoyo → b/2 + voladizo.
    expect(r.anclaje.disponibleIzqM).toBeCloseTo(0.45, 9);
    // Montoya §24.7.3.e: desde el EJE de apoyo → medio ancho de placa menos.
    expect(r.anclaje.disponibleMontoyaIzqM).toBeCloseTo(0.25, 9);
    expect(r.anclaje.recto.verificaIzq).toBe(false);
    expect(r.anclaje.recto.verificaIzqMontoya).toBe(false);
  });

  it("la horquilla casi triplica el desarrollo, pero no alcanza en este caso", () => {
    // Mandril de tabla 7φ = 175 mm (φ25 > 16), radio del eje (175+25)/2 = 100 mm,
    // codo de 180° = π·100 = 314,2 mm. Con 250 mm desde el eje de apoyo:
    // 2·(250 − 100) + 314,2 = 614,2 mm < 761,8 mm.
    expect(r.anclaje.geometriaHorquilla.mandrilMinimoTablaMm).toBe(175);
    expect(r.anclaje.geometriaHorquilla.desarrolloCodoMm).toBeCloseTo(314.16, 2);
    expect(r.anclaje.geometriaHorquilla.ramaIdaIzqMm).toBeCloseTo(150, 9);
    expect(r.anclaje.geometriaHorquilla.desarrolloDisponibleIzqMm).toBeCloseTo(614.16, 2);
    expect(r.anclaje.horquilla.verificaIzq).toBe(true); // por el Anejo sí entra
    expect(r.anclaje.horquilla.verificaIzqMontoya).toBe(false); // por Montoya no
    expect(r.anclaje.bastaConHorquilla).toBe(false);
    // Art. 9.7(3): si no entra ni recto ni doblado, queda el dispositivo.
    expect(r.anclaje.requiereAnclajeMecanico).toBe(true);
    expect(r.anclaje.formaRecomendada).toBe("dispositivo mecánico");
  });

  it("la horquilla cabe en el ancho de la viga", () => {
    // mandril + 2φ = 175 + 50 = 225 mm contra 500 − 100 − 24 = 376 mm libres.
    expect(r.anclaje.geometriaHorquilla.anchoOcupadoEnPlantaM).toBeCloseTo(0.225, 9);
    expect(r.anclaje.geometriaHorquilla.anchoLibreM).toBeCloseTo(0.376, 9);
    expect(r.anclaje.geometriaHorquilla.cabeEnElAncho).toBe(true);
    expect(r.anclaje.geometriaHorquilla.numeroHorquillas).toBe(4);
  });

  it("con la rama de vuelta larga hay que comprobar el hormigón del codo", () => {
    // Art. 8.3(3): la exención vale sólo si tras el codo quedan ≤ 5φ.
    expect(r.anclaje.geometriaHorquilla.exentaDeComprobarMandril).toBe(false);
    expect(r.anclaje.geometriaHorquilla.mandrilAdoptadoMm).toBeGreaterThan(175);
  });

  it("con voladizos generosos el anclaje recto entra y no hacen falta horquillas", () => {
    const holgado = calcularVigaApeoBielas(
      materiales,
      { ...geometria, voladizoIzqM: 1, voladizoDerM: 1 },
      datos
    );
    expect(holgado.anclaje.verificaRecto).toBe(true);
    expect(holgado.anclaje.formaRecomendada).toBe("recta");
    expect(holgado.anclaje.requiereAnclajeMecanico).toBe(false);
  });

  it("la adherencia mala alarga el anclaje un 43 %", () => {
    const mala = calcularVigaApeoBielas(materiales, geometria, {
      ...datos,
      condicionAdherencia: "mala",
    });
    expect(mala.anclaje.eta1).toBe(0.7);
    expect(mala.anclaje.lbRqdMm).toBeCloseTo(r.anclaje.lbRqdMm / 0.7, 6);
  });
});

describe("segunda capa del tirante", () => {
  const dosCapas = calcularVigaApeoBielas(materiales, geometria, {
    ...datos,
    tiranteSegundaCapa: { numero: 8, diametroMm: 25 },
  });

  it("suma área y sube el baricentro, así que d baja", () => {
    // sep. libre mínima = máx(φ; dg+5; 20) = máx(25; 25; 20) = 25 mm (art. 8.2(2))
    // capa 1 a 0,062 + 0,0125 = 0,0745 m del borde
    // capa 2 a 0,062 + 0,025 + 0,025 + 0,0125 = 0,1245 m
    // baricentro = 0,0995 m (áreas iguales) → d = 2 − 0,0995 = 1,9005 m
    expect(dosCapas.tirante.capas.separacionLibreMinimaMm).toBeCloseTo(25, 9);
    expect(dosCapas.tirante.capas.capas).toHaveLength(2);
    expect(dosCapas.tirante.capas.capas[1].brazoDesdeElBordeM).toBeCloseTo(0.1245, 9);
    expect(dosCapas.tirante.capas.baricentroDesdeElBordeM).toBeCloseTo(0.0995, 9);
    expect(dosCapas.modelo.dM).toBeCloseTo(1.9005, 9);
    expect(dosCapas.modelo.dM).toBeLessThan(r.modelo.dM);
    expect(dosCapas.tirante.asRealCm2).toBeCloseTo(2 * r.tirante.asRealCm2, 6);
  });

  it("tolera una descarga que con una sola capa no entra", () => {
    const descargaGrande = { ...datos, ndPilarKN: 4000 };
    const unaCapa = calcularVigaApeoBielas(materiales, geometria, descargaGrande);
    const conSegunda = calcularVigaApeoBielas(materiales, geometria, {
      ...descargaGrande,
      tiranteSegundaCapa: { numero: 8, diametroMm: 25 },
    });
    expect(unaCapa.tirante.verificaAs).toBe(false);
    expect(conSegunda.tirante.verificaAs).toBe(true);
  });

  it("las dos capas tienen que entrar en la franja de reparto de Montoya", () => {
    // 0,12·5,00 = 0,60 m: con 0,087 m ocupados sobra de sobra.
    expect(dosCapas.tirante.capas.alturaOcupadaM).toBeCloseTo(0.087, 9);
    expect(dosCapas.tirante.capas.verificaDentroDelReparto).toBe(true);
  });

  it("la separación que se comprueba es la libre, no la de ejes", () => {
    // 8Ø25 en 376 mm de ancho libre: (376 − 8·25)/7 = 25,14 mm de cara a cara.
    // Medida entre ejes daría 50,14 mm y aprobaría cualquier cosa.
    expect(r.tirante.capas.capas[0].separacionLibreMm).toBeCloseTo(25.14, 1);
    expect(r.tirante.capas.capas[0].verificaSeparacion).toBe(true);
  });

  it("una capa demasiado poblada no entra en el ancho", () => {
    const apretada = calcularVigaApeoBielas(materiales, geometria, {
      ...datos,
      tirante: { numero: 12, diametroMm: 25 },
    });
    expect(apretada.tirante.capas.capas[0].verificaSeparacion).toBe(false);
    expect(apretada.tirante.verificaBNec).toBe(false);
  });
});

describe("bielas y nudos", () => {
  it("la biela lleva tracción transversal, así que su tope es 0,6·ν'·fcd", () => {
    expect(r.bielas.bielaIzq.sigmaMaxMPa).toBeCloseTo(10.56, 9);
    expect(r.bielas.anchoBielaIzqM).toBeCloseTo(0.3574, 3);
    expect(r.bielas.bielaIzq.sigmaMPa).toBeCloseTo(10.13, 1);
    expect(r.bielas.bielaIzq.verifica).toBe(true);
  });

  it("el nudo superior es CCC, k1 = 1,0", () => {
    expect(r.bielas.nudoSuperior.sigmaMaxMPa).toBeCloseTo(17.6, 9);
    expect(r.bielas.nudoSuperior.sigmaMPa).toBeCloseTo(10, 9);
    expect(r.bielas.nudoSuperior.verifica).toBe(true);
  });

  it("el nudo de apoyo es CCT, k2 = 0,85, y Montoya lo topa más bajo", () => {
    expect(r.bielas.nudoApoyoIzq.sigmaMaxMPa).toBeCloseTo(14.96, 9);
    expect(r.bielas.nudoApoyoIzqMontoya.sigmaMaxMPa).toBeCloseTo(14, 9);
    expect(r.bielas.nudoApoyoIzq.sigmaMPa).toBeCloseTo(5.375, 9);
    // Con fck = 30 manda Montoya; los dos criterios se cruzan en fck ≈ 44 MPa.
    expect(r.bielas.gobiernaMontoyaEnNudos).toBe(true);
  });

  it("por encima de fck ≈ 44 MPa el que manda pasa a ser el Anejo 19", () => {
    const alta = calcularVigaApeoBielas(derivarMateriales({ fck: 50, fyk: 500 }), geometria, datos);
    // 0,85·(1 − 50/250) = 0,68 < 0,70.
    expect(alta.bielas.gobiernaMontoyaEnNudos).toBe(false);
  });

  it("la biela se agota antes que el nudo de apoyo al crecer la carga", () => {
    // Es el modo típico de estas piezas: la biela es corta, muy inclinada y con
    // tracción transversal, y su tope es el más bajo de los tres.
    const cargada = calcularVigaApeoBielas(materiales, geometria, { ...datos, ndPilarKN: 3200 });
    expect(cargada.bielas.bielaIzq.verifica).toBe(false);
    expect(cargada.bielas.nudoApoyoIzq.verifica).toBe(true);
  });

  it("la tensión de la biela crece con la carga", () => {
    const cargada = calcularVigaApeoBielas(materiales, geometria, { ...datos, ndPilarKN: 2600 });
    expect(cargada.bielas.bielaIzq.sigmaMPa).toBeGreaterThan(r.bielas.bielaIzq.sigmaMPa);
  });
});

describe("tracción transversal del campo de compresiones", () => {
  it("con b > H/2 usa la ec. (6.59), discontinuidad total", () => {
    expect(r.traccionTransversal.bRepartoM).toBeCloseTo(2, 9);
    expect(r.traccionTransversal.discontinuidadParcial).toBe(false);
    // T = ¼·(1 − 0,7·a/h)·F = 0,25·(1 − 0,7·0,40/2,00)·2000
    expect(r.traccionTransversal.traccionKN).toBeCloseTo(430, 9);
    expect(r.traccionTransversal.asNecCm2).toBeCloseTo(10.75, 9);
    expect(r.traccionTransversal.asRealCm2).toBeCloseTo(22.62, 2);
    expect(r.traccionTransversal.verificaAs).toBe(true);
  });

  it("con b ≤ H/2 cambia a la ec. (6.58), discontinuidad parcial", () => {
    const parcial = calcularVigaApeoBielas(materiales, geometria, { ...datos, anchoRepartoM: 0.9 });
    expect(parcial.traccionTransversal.discontinuidadParcial).toBe(true);
    // T = ¼·(b − a)/b·F = 0,25·(0,90 − 0,40)/0,90·2000
    expect(parcial.traccionTransversal.traccionKN).toBeCloseTo((0.25 * 0.5 * 2000) / 0.9, 6);
  });
});

describe("malla ortogonal mínima", () => {
  it("mínimo por cara y dirección de 0,001·Ac, art. 9.7(1)", () => {
    // Ac por metro = 500 mm · 1000 mm → 0,001·Ac = 500 mm²/m = 5 cm²/m,
    // por encima del piso de 150 mm²/m.
    expect(r.malla.asMinCm2PorM).toBeCloseTo(5, 9);
    expect(r.malla.horizontalCm2PorM).toBeCloseTo(5.65, 2);
    expect(r.malla.verificaHorizontal).toBe(true);
    expect(r.malla.verificaVertical).toBe(true);
  });

  it("el piso de 150 mm²/m manda en vigas finas", () => {
    const fina = calcularVigaApeoBielas(materiales, { ...geometria, bM: 0.12 }, datos);
    expect(fina.malla.asMinCm2PorM).toBeCloseTo(1.5, 9);
  });

  it("separación máxima: menor entre 300 mm y dos espesores, art. 9.7(2)", () => {
    expect(r.malla.separacionMaxM).toBeCloseTo(0.3, 9);
    expect(r.malla.verificaSeparacionHorizontal).toBe(true);
    const separada = calcularVigaApeoBielas(materiales, geometria, {
      ...datos,
      mallaVertical: { diametroMm: 12, separacionM: 0.35 },
    });
    expect(separada.malla.verificaSeparacionVertical).toBe(false);
  });
});

describe("cuelgue", () => {
  it("con carga directa no hay armadura de cuelgue", () => {
    expect(r.cuelgue).toBeNull();
  });

  it("con carga colgada hay que colgar el 100 % de Nd", () => {
    // Montoya §24.9.1: es la hipótesis más desfavorable y la que más se olvida.
    const colgada = calcularVigaApeoBielas(materiales, geometria, {
      ...datos,
      transmision: "colgada",
      cuelgue: { diametroMm: 12, separacionM: 0.1, numeroRamas: 4, cantoElementoColgadoM: 0.6 },
    });
    expect(colgada.cuelgue?.fraccionColgada).toBe(1);
    expect(colgada.cuelgue?.cargaColgadaKN).toBeCloseTo(2000, 9);
    // As = 2000/400·10 = 50 cm², con fyd de estribos topado en 400 MPa.
    expect(colgada.cuelgue?.asNecCm2).toBeCloseTo(50, 9);
    expect(colgada.cuelgue?.verificaCantoMinimo).toBe(true);
  });

  it("con apoyo indirecto se cuelga el 65 %", () => {
    const indirecta = calcularVigaApeoBielas(materiales, geometria, {
      ...datos,
      transmision: "indirecta",
      cuelgue: { diametroMm: 12, separacionM: 0.1, numeroRamas: 4, cantoElementoColgadoM: 0 },
    });
    expect(indirecta.cuelgue?.fraccionColgada).toBeCloseTo(0.65, 9);
    expect(indirecta.cuelgue?.cargaColgadaKN).toBeCloseTo(1300, 9);
  });

  it("h ≥ 1,2·a: si el elemento colgado es muy alto, no se forman las bielas", () => {
    const alta = calcularVigaApeoBielas(materiales, geometria, {
      ...datos,
      transmision: "colgada",
      cuelgue: { diametroMm: 12, separacionM: 0.1, numeroRamas: 4, cantoElementoColgadoM: 1.8 },
    });
    expect(alta.cuelgue?.cantoMinimoM).toBeCloseTo(2.16, 9);
    expect(alta.cuelgue?.verificaCantoMinimo).toBe(false);
  });
});
