import { describe, expect, it } from "vitest";
import { areaPorMetroCm2, armarPieza, calcularMomentosElementos, separacionParaAs } from "@/lib/calc/hormigon/muros/contencion";

describe("armadura por metro de las piezas del muro", () => {
  // C30/37 y B500S: fcd = 20 MPa, fyd = 434,8 MPa.
  const fcd = 20;
  const fyd = 500 / 1.15;

  it("resuelve la flexión con el mismo planteo adimensional que las vigas", () => {
    const p = armarPieza("hastial", "interior", 60, 0.3, 0.05, fcd, fyd);

    expect(p.dM).toBeCloseTo(0.25, 9);
    expect(p.mu).toBeCloseTo(60 / (0.25 ** 2 * fcd * 1000), 9);
    const omega = 1 - Math.sqrt(1 - 2 * p.mu);
    expect(p.asCalculadoCm2).toBeCloseTo((100 ** 2 * omega * 0.25 * fcd) / fyd, 6);
  });

  it("aplica los dos mínimos y avisa cuál gobierna", () => {
    // Momento muy chico: tiene que mandar un mínimo, no el cálculo.
    const flojo = armarPieza("talón", "superior", 1, 0.3, 0.05, fcd, fyd);
    expect(flojo.mandaMinimo).toBe(true);
    expect(flojo.asNecesarioCm2).toBeCloseTo(
      Math.max(flojo.asMinMecanicoCm2, flojo.asMinGeometricoCm2), 9
    );
    // El geométrico va con el canto total, no con el útil.
    expect(flojo.asMinGeometricoCm2).toBeCloseTo(100 ** 2 * (1.8 / 1000) * 0.3, 9);

    const cargado = armarPieza("talón", "superior", 120, 0.3, 0.05, fcd, fyd);
    expect(cargado.mandaMinimo).toBe(false);
    expect(cargado.asNecesarioCm2).toBeCloseTo(cargado.asCalculadoCm2, 9);
  });

  it("no devuelve un área finita si la sección no da como simplemente armada", () => {
    // μ por encima de 0,5: engrosar la pieza, no seguir sumando acero.
    const imposible = armarPieza("puntera", "inferior", 900, 0.3, 0.05, fcd, fyd);
    expect(imposible.mu).toBeGreaterThan(0.5);
    expect(imposible.asCalculadoCm2).toBe(Infinity);
  });

  it("más canto necesita menos armadura para el mismo momento", () => {
    const fino = armarPieza("hastial", "interior", 80, 0.25, 0.05, fcd, fyd);
    const grueso = armarPieza("hastial", "interior", 80, 0.45, 0.05, fcd, fyd);
    expect(grueso.asCalculadoCm2).toBeLessThan(fino.asCalculadoCm2);
  });

  it("cada pieza recuerda de qué cara va su armadura", () => {
    expect(armarPieza("hastial", "interior", 50, 0.3, 0.05, fcd, fyd).cara).toBe("interior");
    expect(armarPieza("talón", "superior", 50, 0.3, 0.05, fcd, fyd).cara).toBe("superior");
    expect(armarPieza("puntera", "inferior", 50, 0.3, 0.05, fcd, fyd).cara).toBe("inferior");
  });

  it("el área por metro y la separación son inversas entre sí", () => {
    const as = areaPorMetroCm2(12, 150);
    // Un ⌀12 cada 15 cm da 7,54 cm²/m.
    expect(as).toBeCloseTo(((Math.PI * 1.2 ** 2) / 4 * 1000) / 150, 9);
    expect(separacionParaAs(12, as)).toBeCloseTo(150, 6);
  });

  it("juntar las barras o engrosarlas sube el área", () => {
    expect(areaPorMetroCm2(12, 100)).toBeGreaterThan(areaPorMetroCm2(12, 200));
    expect(areaPorMetroCm2(16, 150)).toBeGreaterThan(areaPorMetroCm2(12, 150));
  });
});

/**
 * Momentos en las tres piezas. Son voladizos independientes, así que cada uno se
 * comprueba contra su propia integral: no hay una fórmula global que los ate.
 */
describe("momentos en hastial, talón y puntera", () => {
  const base = {
    A: 2, hZap: 0.3, esp: 0.25, hMuro: 3.2,
    hAct: 3.5, qg: 0, qq: 5, gammaKNm3: 18, ka: 0.5, puntera: 0.6,
  };

  it("el hastial toma el empuje sobre su propia altura, no sobre la total", () => {
    const m = calcularMomentosElementos(base, 200, 100);
    // Sobre el hastial actúan 3,5 − 0,3 = 3,2 m de terreno.
    expect(m.alturaHastialM).toBeCloseTo(3.2, 9);

    const h = 3.2;
    const ea = (18 * 0.5 * h ** 2) / 2;
    const eq = 0.5 * 5 * h;
    // El empuje del terreno es permanente y va con γG; la sobrecarga de uso, con γQ.
    expect(m.hastialKNm).toBeCloseTo(1.35 * (ea * (h / 3)) + 1.5 * (eq * (h / 2)), 6);
  });

  it("el momento del hastial crece con el cubo de la altura", () => {
    const bajo = calcularMomentosElementos({ ...base, hAct: 2.3, hMuro: 2 }, 200, 100);
    const alto = calcularMomentosElementos({ ...base, hAct: 4.3, hMuro: 4 }, 200, 100);
    // Sin sobrecarga el término dominante va con h³: al doble de altura, ocho veces.
    const sinQBajo = calcularMomentosElementos({ ...base, qq: 0, hAct: 2.3, hMuro: 2 }, 200, 100);
    const sinQAlto = calcularMomentosElementos({ ...base, qq: 0, hAct: 4.3, hMuro: 4 }, 200, 100);
    expect(sinQAlto.hastialKNm / sinQBajo.hastialKNm).toBeCloseTo((4 / 2) ** 3, 6);
    expect(alto.hastialKNm).toBeGreaterThan(bajo.hastialKNm);
  });

  it("el talón cuenta tierra, sobrecarga y peso propio sobre su vuelo", () => {
    const m = calcularMomentosElementos(base, 200, 100);
    // Talón = A − puntera − espesor = 2 − 0,6 − 0,25.
    expect(m.talonM).toBeCloseTo(1.15, 9);

    // Tierra y peso propio de la losa son permanentes; la sobrecarga de uso no.
    const cargaPermanente = 18 * (3.5 - 0.3) + 25 * 0.3;
    expect(m.cargaSobreTalonKPa).toBeCloseTo(cargaPermanente + 5, 9);
    expect(m.talonKNm).toBeCloseTo(((1.35 * cargaPermanente + 1.5 * 5) * 1.15 ** 2) / 2, 6);
  });

  it("sin puntera toda la zapata es talón y el momento de puntera es cero", () => {
    const m = calcularMomentosElementos({ ...base, puntera: 0 }, 200, 100);
    expect(m.punteraM).toBe(0);
    expect(m.punteraKNm).toBe(0);
    expect(m.talonM).toBeCloseTo(2 - 0.25, 9);
  });

  it("la puntera se levanta por la reacción, descontando su peso propio", () => {
    const m = calcularMomentosElementos(base, 200, 100);
    const sigmaMedia = 200 / 2;
    const gradiente = 100 / (2 ** 2 / 6);

    expect(m.sigmaPunteraBordeKPa).toBeCloseTo(sigmaMedia + gradiente, 6);
    // En el arranque la presión ya bajó, porque el diagrama es lineal.
    expect(m.sigmaPunteraArranqueKPa).toBeLessThan(m.sigmaPunteraBordeKPa);
    expect(m.punteraKNm).toBeGreaterThan(0);
  });

  it("una puntera más larga da más momento", () => {
    const corta = calcularMomentosElementos({ ...base, puntera: 0.3 }, 200, 100);
    const larga = calcularMomentosElementos({ ...base, puntera: 0.9 }, 200, 100);
    expect(larga.punteraKNm).toBeGreaterThan(corta.punteraKNm);
    // Y deja menos talón.
    expect(larga.talonM).toBeLessThan(corta.talonM);
  });

  /*
   * Antes se mayoraba todo con 1,5, incluido el peso propio. Eso sobredimensiona:
   * el peso de un muro se conoce con mucha más certeza que el camión que pueda
   * llegar a estacionar arriba, y por eso la norma les da coeficientes distintos.
   */
  it("cada acción va con su coeficiente: γG las permanentes, γQ la de uso", () => {
    const talon = 1.15;
    const cargaPermanente = 18 * (3.5 - 0.3) + 25 * 0.3;

    // Sin sobrecarga de uso, el único coeficiente que interviene es γG.
    const soloPermanente = calcularMomentosElementos({ ...base, qq: 0 }, 200, 100);
    expect(soloPermanente.talonKNm).toBeCloseTo(
      (1.35 * cargaPermanente * talon ** 2) / 2, 6
    );

    // La misma carga puesta como permanente pesa menos que puesta como de uso.
    const comoPermanente = calcularMomentosElementos({ ...base, qg: 5, qq: 0 }, 200, 100);
    const comoUso = calcularMomentosElementos({ ...base, qg: 0, qq: 5 }, 200, 100);
    expect(comoPermanente.talonKNm).toBeLessThan(comoUso.talonKNm);
    expect(comoUso.talonKNm - comoPermanente.talonKNm).toBeCloseTo(
      ((1.5 - 1.35) * 5 * talon ** 2) / 2, 6
    );
  });
});
import { calcularMuroContencion } from "@/lib/calc/hormigon/muros/contencion";

// Caso real de la hoja "VERIF MUROS CONTENCION": γ=18, φ=34°, c=5 kPa,
// σadm=100 kPa, zapata 0.5x0.3, muro 3.2x0.15, suelo activo 3.2 m, pasivo 0,
// sobrecarga 5 kN/m².
//
// OJO con qué es y qué no es paridad con Excel.
//
// Coinciden con la planilla: los coeficientes (ka topado en 0,5), los empujes,
// el momento volcador y las reacciones de los apoyos.
//
// NO coinciden, y es a propósito. Tres eran errores de la planilla:
//   · el peso del suelo, que tomaba ½·γ·h·(A−esp) —media altura total sobre las
//     dos alas— cuando lo que gravita es γ·talón·(h−canto);
//   · el reparto de las sobrecargas, que ahora distingue permanente de uso y no
//     cuenta la variable del lado favorable;
//   · la tensión del terreno, que se resuelve ubicando la resultante en vez de
//     aplicar σ = N/A + M/W a ciegas.
//
// Y tres son criterios de Montoya §25.11.2, págs. 432-433, adoptados por ser más
// conservadores que lo que hacía la planilla:
//   · el vuelco exige 2,0 y no 1,5, que es despejar 0,9·M_estab ≥ 1,8·M_volc;
//   · la cohesión del rozamiento va reducida, c* = mín(0,5·c ; 50 kPa);
//   · el empuje pasivo no se cuenta, ni para vuelco ni para deslizamiento.

const suelo = { gammaKNm3: 18, phiGrados: 34, cKPa: 5, sigmaAdmisibleKPa: 100 };
const geometria = {
  anchoZapataM: 0.5,
  cantoZapataM: 0.3,
  alturaMuroM: 3.2,
  espesorMuroM: 0.15,
  alturaSueloActivoM: 3.2,
  alturaSueloPasivoM: 0,
  sobrecargaPermanenteKPa: 0,
  sobrecargaUsoKPa: 5,
};
const apoyos = { l1Caso2M: 2, l1Caso3M: 0.95, l2Caso3M: 2.45 };

const r = calcularMuroContencion(suelo, geometria, apoyos);

describe("muro de contención: empujes", () => {
  // Los coeficientes se comprueban contra la fórmula, no contra un número
  // copiado: si alguien vuelve a meter un tope, esto lo delata.
  it("usa los coeficientes de Rankine, sin topes", () => {
    const sen = Math.sin((34 * Math.PI) / 180);
    expect(r.empujes.kaTeorico).toBeCloseTo((1 - sen) / (1 + sen), 12);
    // Con φ = 34° el teórico da 0,283 y manda el piso.
    expect(r.empujes.mandaPisoKa).toBe(true);
    expect(r.empujes.ka).toBeCloseTo(0.5, 12);
    expect(r.empujes.kp).toBeCloseTo(2, 12);
    expect(r.empujes.alturaTotalM).toBeCloseTo(3.5, 9);
  });

  it("reproduce los empujes activos y el momento volcador", () => {
    // ka = 0,282714919717773 con φ = 34°.
    expect(r.empujes.empujeSueloKN).toBeCloseTo(46.08, 6);
    expect(r.empujes.empujeSobrecargaKN).toBeCloseTo(8, 6);
    expect(r.empujes.momentoVolcadorKNm).toBeCloseTo(61.952, 6);
  });

  it("reproduce los pesos estabilizadores", () => {
    expect(r.empujes.pesoMuroKN).toBeCloseTo(12, 6);
    expect(r.empujes.pesoZapataKN).toBeCloseTo(3.75, 6);
    expect(r.empujes.pesoSueloActivoKN).toBeCloseTo(18.27, 6);
    expect(r.empujes.pesoSueloPasivoKN).toBeCloseTo(0, 9);
    expect(r.empujes.empujePasivoKN).toBeCloseTo(0, 9);
  });
});

describe("muro de contención: vuelco", () => {
  // La planilla tomaba el peso del alzado con brazo A/2 (0.25 m) en lugar del
  // centro de gravedad del propio alzado (esp/2 = 0.075 m), lo que sobrestimaba
  // el momento estabilizador. Acá se usa esp/2, coherente con el brazo del suelo
  // sobre la zapata y con la otra hoja de muros de la planilla.
  it("reproduce el momento estabilizador con el brazo del alzado corregido", () => {
    // 12·0.075 + 3.75·0.25 + 10.08·0.325 = 0.9 + 0.9375 + 3.276
    expect(r.empujes.momentoEstabilizadorKNm).toBeCloseTo(7.77525, 6);
  });

  it("no verifica el vuelco: este muro necesita apuntalamiento", () => {
    expect(r.vuelco.factorSeguridad).toBeCloseTo(7.77525 / 61.952, 6);
    expect(r.vuelco.verifica).toBe(false);
  });
});

describe("muro de contención: deslizamiento", () => {
  it("reproduce el caso 1, sólo zapata", () => {
    expect(r.deslizamientoSoloZapata.nKN).toBeCloseTo(34.02, 6);
    // Fh adm con φ pleno —el piso de ka ya castiga a φ, ver FRACCION_PHI_ROZAMIENTO—
    // y c* = mín(0,5·c ; 50), que sí se mantiene reducida.
    expect(r.deslizamientoSoloZapata.fhAdmKN).toBeCloseTo(24.19678, 5);
    expect(r.deslizamientoSoloZapata.fhMaxKN).toBeCloseTo(54.08, 6);
    expect(r.deslizamientoSoloZapata.factorSeguridad).toBeCloseTo(0.447426, 5);
    expect(r.deslizamientoSoloZapata.verifica).toBe(false);
  });

  it("con apoyo en contrapiso sólo hay que pasar R1 por rozamiento, y no alcanza", () => {
    expect(r.deslizamientoApoyoContrapiso.fhMaxKN).toBeCloseTo(23.104, 6);
    expect(r.deslizamientoApoyoContrapiso.factorSeguridad).toBeCloseTo(1.047298, 5);
    expect(r.deslizamientoApoyoContrapiso.verifica).toBe(false);
  });
});

describe("muro de contención: tensión del suelo", () => {
  /*
   * Este muro vuelca (FS 0,146): la resultante se va fuera de la zapata, así que
   * no hay superficie en contacto y no existe una tensión que calcular. Se
   * devuelve infinito en vez de un número inventado, y la comprobación falla.
   *
   * La planilla daba acá 2.420,96 kN/m² aplicando la ley trapecial a una
   * resultante que estaba fuera de la base, donde esa ley no vale.
   */
  it("sin contacto cuando la resultante se sale de la zapata", () => {
    expect(r.tensionSueloCaso1.nKN).toBeCloseTo(35.77, 6);
    expect(r.tensionSueloCaso1.resultanteEnNucleo).toBe(false);
    expect(r.tensionSueloCaso1.excentricidadM).toBeCloseTo(1.748686, 6);
    expect(r.tensionSueloCaso1.sigmaKPa).toBe(Infinity);
    expect(r.tensionSueloCaso1.verifica).toBe(false);
  });

  it("reproduce los casos 2 y 3, mucho menos exigidos al estar apuntalados", () => {
    expect(r.tensionSueloCasos23.momentoKNm).toBeCloseTo(1.0731, 6);
    expect(r.tensionSueloCasos23.sigmaKPa).toBeCloseTo(97.2944, 4);
    expect(r.tensionSueloCasos23.verifica).toBe(true);
  });
});

describe("muro de contención: reacciones de los apoyos", () => {
  it("reproduce el caso 2, apoyo en contrapiso", () => {
    expect(r.apoyoContrapiso.r2KN).toBeCloseTo(30.976, 6);
    expect(r.apoyoContrapiso.r1KN).toBeCloseTo(-23.104, 6);
  });

  it("reproduce el caso 3, contrapiso más losa superior", () => {
    expect(r.apoyoContrapisoYLosa.r2KN).toBeCloseTo(4.31673469387755, 6);
    expect(r.apoyoContrapisoYLosa.r1KN).toBeCloseTo(49.7632653061225, 6);
  });
});

describe("muro de contención: reparto de las sobrecargas", () => {
  /*
   * La misma carga puesta como permanente o como de uso tiene que dar el mismo
   * empuje —las dos empujan igual— pero distinto momento estabilizador, porque
   * la variable es favorable ahí y va con cero.
   */
  const comoPermanente = calcularMuroContencion(
    suelo,
    { ...geometria, sobrecargaPermanenteKPa: 5, sobrecargaUsoKPa: 0 },
    apoyos
  );

  it("las dos sobrecargas empujan lo mismo", () => {
    expect(comoPermanente.empujes.empujeSobrecargaKN).toBeCloseTo(
      r.empujes.empujeSobrecargaKN, 9
    );
  });

  it("sólo la permanente estabiliza el vuelco", () => {
    expect(r.empujes.cargaPermanenteKN).toBe(0);
    expect(comoPermanente.empujes.cargaPermanenteKN).toBeCloseTo(5 * 0.35, 9);
    expect(comoPermanente.vuelco.factorSeguridad).toBeGreaterThan(r.vuelco.factorSeguridad);
  });

  it("sólo la permanente suma peso contra el deslizamiento", () => {
    expect(comoPermanente.deslizamientoSoloZapata.nKN).toBeGreaterThan(
      r.deslizamientoSoloZapata.nKN
    );
  });

  it("las dos pesan para la tensión del terreno, que es donde son desfavorables", () => {
    expect(r.tensionSueloCaso1.nKN).toBeCloseTo(comoPermanente.tensionSueloCaso1.nKN, 9);
  });
});

describe("muro de contención: peso del suelo sobre el talón", () => {
  it("cuenta el ancho del talón y descuenta el canto de la zapata", () => {
    // talón = 0,5 − 0,15 − 0 = 0,35 m; altura = 3,2 − 0,3 = 2,9 m.
    expect(r.empujes.talonM).toBeCloseTo(0.35, 9);
    expect(r.empujes.alturaSobreTalonM).toBeCloseTo(2.9, 9);
    expect(r.empujes.pesoSueloActivoKN).toBeCloseTo(18 * 0.35 * 2.9, 9);
  });

  it("con puntera, el suelo del trasdós pesa menos porque el talón se acorta", () => {
    const conPuntera = calcularMuroContencion(suelo, { ...geometria, punteraM: 0.15 }, apoyos);
    expect(conPuntera.empujes.talonM).toBeCloseTo(0.2, 9);
    expect(conPuntera.empujes.pesoSueloActivoKN).toBeLessThan(r.empujes.pesoSueloActivoKN);
  });
});

describe("muro de contención: el empuje pasivo no se cuenta", () => {
  /*
   * Montoya §25.11.2, pág. 433, lo dice para vuelco y para deslizamiento: el
   * movimiento que hace falta para movilizarlo es mayor que el admisible en
   * servicio, así que contar con él sería apoyarse en una resistencia que sólo
   * aparece cuando el muro ya falló.
   *
   * Con puntera nula el suelo de delante tampoco pesa, así que este caso aísla
   * el empuje: Ep existe y no tiene que mover ningún resultado.
   */
  const conPasivo = calcularMuroContencion(
    suelo,
    { ...geometria, alturaSueloPasivoM: 1 },
    apoyos
  );

  it("se calcula y se informa", () => {
    expect(conPasivo.empujes.empujePasivoKN).toBeCloseTo(18, 9);
  });

  it("pero no estabiliza el vuelco ni resiste el deslizamiento", () => {
    expect(conPasivo.empujes.momentoEstabilizadorKNm).toBeCloseTo(
      r.empujes.momentoEstabilizadorKNm, 9
    );
    expect(conPasivo.vuelco.factorSeguridad).toBeCloseTo(r.vuelco.factorSeguridad, 9);
    expect(conPasivo.deslizamientoSoloZapata.fhMaxKN).toBeCloseTo(
      r.deslizamientoSoloZapata.fhMaxKN, 9
    );
    expect(conPasivo.deslizamientoSoloZapata.factorSeguridad).toBeCloseTo(
      r.deslizamientoSoloZapata.factorSeguridad, 9
    );
  });
});

describe("muro de contención: un muro que sí verifica", () => {
  const robusto = calcularMuroContencion(
    suelo,
    { ...geometria, anchoZapataM: 2.5, cantoZapataM: 0.4, espesorMuroM: 0.3, sobrecargaUsoKPa: 0 },
    apoyos
  );

  it("con zapata ancha el vuelco verifica", () => {
    expect(robusto.vuelco.factorSeguridad).toBeGreaterThan(1.5);
    expect(robusto.vuelco.verifica).toBe(true);
  });
});
