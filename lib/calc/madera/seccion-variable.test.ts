import { describe, expect, it } from "vitest";
import {
  anguloInclinacionGrados,
  espesorMaximoLaminaMm,
  factoresVertice,
  kdis,
  kmAlpha,
  kr,
  kvol,
  seccionCriticaTaper,
  tensionCurvadoMPa,
  verificarVertice,
  volumenVertice,
} from "@/lib/calc/madera/seccion-variable";

describe("km,α, ecs. (6.39) y (6.40)", () => {
  const fmd = 20;
  const fvd = 2.5;
  const ft90d = 0.36;
  const fc90d = 1.8;

  it("vale 1 con el borde sin inclinar", () => {
    expect(kmAlpha("traccionado", 0, fmd, fvd, ft90d)).toBeCloseTo(1, 12);
    expect(kmAlpha("comprimido", 0, fmd, fvd, fc90d)).toBeCloseTo(1, 12);
  });

  it("el borde traccionado penaliza bastante más que el comprimido", () => {
    /*
     * Dos motivos que se acumulan: la rama de tracción divide el rasante por
     * 0,75 en vez de por 1,5, y compara contra ft,90,d en vez de fc,90,d, que
     * en madera son cinco veces distintos.
     *
     * A 4,3° —una viga a dos aguas corriente— la diferencia es del 22 %, y
     * crece con el ángulo. No es «la mitad», pero es de sobra para que elegir
     * mal la rama cambie el resultado de la verificación, y por eso el dato de
     * entrada tiene que ser el estado del borde y no el signo del momento.
     */
    const traccion = kmAlpha("traccionado", 4.29, fmd, fvd, ft90d);
    const compresion = kmAlpha("comprimido", 4.29, fmd, fvd, fc90d);
    expect(traccion).toBeLessThan(compresion);
    expect(compresion / traccion).toBeCloseTo(1.222, 2);

    // A 12° la brecha ya es de más del doble.
    const t12 = kmAlpha("traccionado", 12, fmd, fvd, ft90d);
    const c12 = kmAlpha("comprimido", 12, fmd, fvd, fc90d);
    expect(c12 / t12).toBeGreaterThan(2);
  });

  it("decrece con el ángulo", () => {
    let previo = kmAlpha("comprimido", 0, fmd, fvd, fc90d);
    for (let a = 1; a <= 20; a++) {
      const actual = kmAlpha("comprimido", a, fmd, fvd, fc90d);
      expect(actual).toBeLessThan(previo);
      previo = actual;
    }
  });

  it("reproduce la estructura de la expresión de la planilla", () => {
    const a = 4.29;
    const tan = Math.tan((a * Math.PI) / 180);
    expect(kmAlpha("comprimido", a, fmd, fvd, fc90d)).toBeCloseTo(
      1 / Math.sqrt(1 + ((fmd * tan) / (1.5 * fvd)) ** 2 + ((fmd * tan ** 2) / fc90d) ** 2), 12
    );
  });
});

describe("sección crítica de la viga a un agua", () => {
  it("reproduce la posición y el canto de la planilla", () => {
    // l = 20 m, he = 0,64, hc = 1,39, b = 0,19, q = 9,6408 kN/m.
    const r = seccionCriticaTaper(20, 0.64, 1.39, 0.19, 9.6408065741822409);
    expect(r.posicionM).toBeCloseTo(4.6043165, 6);
    expect(r.cantoM).toBeCloseTo(0.9853237, 6);
    expect(r.momentoKNm).toBeCloseTo(341.702, 3);
    expect(r.sigmaMdMPa).toBeCloseTo(11.1144321, 6);
  });

  it("no cae en el centro de la luz, y por eso hay que buscarla", () => {
    /*
     * σm(x) = M(x)/W(x) y las dos crecen a distinto ritmo. Con he/hc = 0,46 el
     * máximo cae al 23 % de la luz. Verificar en el centro —que es el reflejo
     * natural— deja pasar la sección que realmente manda.
     */
    const r = seccionCriticaTaper(20, 0.64, 1.39, 0.19, 9.64);
    expect(r.posicionM / 20).toBeCloseTo(0.23, 2);

    const enElCentro = (9.64 * 20 ** 2) / 8 / ((0.19 * 1.39 ** 2) / 6) / 1000;
    expect(r.sigmaMdMPa).toBeGreaterThan(enElCentro);
  });

  it("con canto constante la sección crítica vuelve al centro", () => {
    const r = seccionCriticaTaper(10, 0.5, 0.5, 0.2, 5);
    expect(r.posicionM).toBeCloseTo(5, 9);
    expect(r.cantoM).toBeCloseTo(0.5, 9);
  });

  it("el ángulo sale de la pendiente sobre la media luz", () => {
    expect(anguloInclinacionGrados(20, 0.64, 1.39)).toBeCloseTo(
      (Math.atan(0.75 / 10) * 180) / Math.PI, 9
    );
  });
});

describe("factores del vértice, ecs. (6.43) a (6.47) y (6.56) a (6.59)", () => {
  it("con radio infinito kl se reduce a k1 y kp a k5", () => {
    const f = factoresVertice(4.29, 1.39, Infinity);
    expect(f.kl).toBeCloseTo(f.k1, 12);
    expect(f.kp).toBeCloseTo(f.k5, 12);
    expect(f.k5).toBeCloseTo(0.2 * Math.tan((4.29 * Math.PI) / 180), 12);
  });

  it("reproduce el kl de la planilla para la viga a dos aguas", () => {
    const tan = Math.tan(0.074859847710766841);
    const f = factoresVertice((0.074859847710766841 * 180) / Math.PI, 1.39, Infinity);
    expect(f.kl).toBeCloseTo(1 + 1.4 * tan + 5.4 * tan ** 2, 9);
    expect(f.kl).toBeCloseTo(1.135375, 5);
  });

  it("curvar la viga sube kp, que es el factor que gobierna", () => {
    /*
     * kp crece siempre al cerrar el radio: la tracción perpendicular del
     * vértice es justamente el efecto de enderezar láminas curvadas. A 10° con
     * rin = 8 m sube casi un 50 %.
     *
     * kl, en cambio, puede bajar. El término k2 = 0,35 − 8·tan αap se vuelve
     * negativo en cuanto el ángulo pasa de 2,5°, así que en vigas de pendiente
     * apreciable curvar reduce la amplificación de la flexión mientras agrava
     * la tracción perpendicular. Es contraintuitivo y conviene tenerlo escrito:
     * mirar sólo kl para decidir el radio lleva a la conclusión contraria.
     */
    const recta = factoresVertice(10, 1.4, Infinity);
    const curva = factoresVertice(10, 1.4, 8);

    expect(curva.kp / recta.kp).toBeGreaterThan(1.4);
    expect(curva.k2).toBeLessThan(0);
    expect(curva.kl).toBeLessThan(recta.kl);
  });

  it("con pendiente suave curvar sí sube kl", () => {
    // Por debajo de 2,5° el k2 sigue siendo positivo y kl crece con la curvatura.
    const recta = factoresVertice(2, 1.4, Infinity);
    const curva = factoresVertice(2, 1.4, 8);
    expect(curva.k2).toBeGreaterThan(0);
    expect(curva.kl).toBeGreaterThan(recta.kl);
  });

  it("r incluye el medio canto del vértice, ec. (6.48)", () => {
    expect(factoresVertice(10, 1.4, 8).rM).toBeCloseTo(8.7, 9);
  });
});

describe("kr, ec. (6.49)", () => {
  it("vale 1 en la viga recta a dos aguas", () => {
    expect(kr("dos-aguas", 5, 0.02)).toBe(1);
  });

  it("no penaliza mientras rin/t llegue a 240", () => {
    expect(kr("curva", 4.8, 0.02)).toBe(1);
    expect(kr("curva", 10, 0.02)).toBe(1);
  });

  it("por debajo de rin/t = 240 cada punto de radio se paga", () => {
    // El caso de la planilla: r = 4000 mm con láminas de 20 mm da rin/t = 200.
    expect(kr("curva", 4, 0.02)).toBeCloseTo(0.96, 9);
    expect(kr("curva", 2, 0.02)).toBeCloseTo(0.86, 9);
    expect(kr("curva", 2, 0.02)).toBeLessThan(kr("curva", 4, 0.02));
  });

  it("láminas más finas recuperan kr con el mismo radio", () => {
    expect(kr("curva", 3, 0.01)).toBeGreaterThan(kr("curva", 3, 0.02));
  });
});

describe("kvol y kdis, ecs. (6.51) y (6.52)", () => {
  it("kvol castiga el volumen: la madera grande es más floja a tracción perpendicular", () => {
    expect(kvol(0.01, true)).toBeCloseTo(1, 9);
    expect(kvol(0.36, true)).toBeCloseTo(Math.pow(0.01 / 0.36, 0.2), 9);
    expect(kvol(0.36, true)).toBeLessThan(0.55);
  });

  it("reproduce el kvol de la planilla", () => {
    expect(kvol(0.06, true)).toBeCloseTo(0.6988271, 6);
  });

  it("en maciza vale 1, aunque el apartado no le aplique", () => {
    expect(kvol(0.5, false)).toBe(1);
  });

  it("kdis distingue la curva a dos aguas", () => {
    expect(kdis("dos-aguas")).toBeCloseTo(1.4, 9);
    expect(kdis("curva")).toBeCloseTo(1.4, 9);
    expect(kdis("curva-dos-aguas")).toBeCloseTo(1.7, 9);
  });
});

describe("volumen del vértice, art. 6.4.3(6)", () => {
  it("sugiere la expresión geométrica de la viga a dos aguas", () => {
    const v = volumenVertice(0.19, 1.39, 4.29, 20);
    expect(v.sugeridoM3).toBeCloseTo(
      0.19 * 1.39 ** 2 * (1 - 0.25 * Math.tan((4.29 * Math.PI) / 180)), 9
    );
    expect(v.topado).toBe(false);
  });

  it("aplica el tope de 2Vb/3 que la planilla no aplica", () => {
    // Viga corta: la zona del vértice se comería casi toda la pieza.
    const v = volumenVertice(0.19, 1.39, 4.29, 0.4);
    expect(v.topeM3).toBeCloseTo(0.2666667, 6);
    expect(v.topado).toBe(true);
    expect(v.adoptadoM3).toBeCloseTo(v.topeM3, 9);
    // Y el tope importa: sin él kvol saldría más chico y la verificación peor.
    expect(kvol(v.adoptadoM3, true)).toBeGreaterThan(kvol(v.sugeridoM3, true));
  });
});

describe("verificación del vértice", () => {
  const base = {
    forma: "dos-aguas" as const,
    anchoM: 0.19,
    cantoVerticeM: 1.39,
    anguloVerticeGrados: 4.29,
    radioInteriorM: Infinity,
    espesorLaminaM: 0.02,
    momentoVerticeKNm: 492.94,
    volumenM3: 0.36,
    laminada: true,
    fmdMPa: 20.16,
    ft90dMPa: 0.36,
    fvdMPa: 2.52,
    tauDMPa: 0.5,
  };

  it("la flexión del vértice va amplificada por kl", () => {
    const r = verificarVertice(base);
    const sinAmplificar = (6 * 492.94) / (0.19 * 1.39 ** 2 * 1000);
    expect(r.sigmaMdMPa).toBeCloseTo(r.factores.kl * sinAmplificar, 9);
    expect(r.sigmaMdMPa).toBeGreaterThan(sinAmplificar);
  });

  it("en la viga recta a dos aguas kr no descuenta nada", () => {
    expect(verificarVertice(base).kr).toBe(1);
    expect(verificarVertice({ ...base, forma: "curva", radioInteriorM: 3 }).kr).toBeLessThan(1);
  });

  it("la tracción perpendicular es la que suele mandar", () => {
    /*
     * ft,90,k anda por 0,5 MPa contra 28 de fm,k: cuarenta veces menos. Por eso
     * estas vigas fallan por delaminación en el vértice y no por flexión, y por
     * eso la comprobación de la ec. (6.50) es la que hay que mirar primero.
     */
    const r = verificarVertice(base);
    expect(r.aprovechamientoT90).toBeGreaterThan(r.aprovechamientoFlexion);
  });

  it("la interacción de la ec. (6.53) suma rasante y tracción perpendicular", () => {
    const r = verificarVertice(base);
    expect(r.aprovechamientoCombinado).toBeCloseTo(0.5 / 2.52 + r.aprovechamientoT90, 9);
    expect(r.aprovechamientoCombinado).toBeGreaterThan(r.aprovechamientoT90);
  });

  it("sólo verifica si pasan las tres comprobaciones", () => {
    const holgado = verificarVertice({ ...base, momentoVerticeKNm: 50, tauDMPa: 0.2 });
    expect(holgado.verifica).toBe(true);
    const apretado = verificarVertice({ ...base, momentoVerticeKNm: 900 });
    expect(apretado.verifica).toBe(false);
  });
});

describe("fabricación de piezas curvas", () => {
  it("reproduce el espesor máximo de lámina de la planilla", () => {
    expect(espesorMaximoLaminaMm(10000, 18.5)).toBeCloseTo(44.9333333, 6);
  });

  it("reproduce la tensión de curvado de la planilla", () => {
    expect(tensionCurvadoMPa(10000, 20, 4000)).toBeCloseTo(25, 9);
  });

  it("radio chico y lámina gruesa es la combinación que no se puede fabricar", () => {
    const admisible = espesorMaximoLaminaMm(2000, 18.5);
    expect(admisible).toBeLessThan(20);
    expect(tensionCurvadoMPa(10000, 20, 2000)).toBeGreaterThan(
      tensionCurvadoMPa(10000, 20, 8000)
    );
  });
});
