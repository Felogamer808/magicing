import { describe, expect, it } from "vitest";
import {
  TOPE_SOGA,
  chapaCentralDoble,
  chapasExterioresDoble,
  clasificarChapa,
  cortaduraDobleMaderaMadera,
  cortaduraSimpleMaderaMadera,
  fh0k,
  fhAlphaK,
  k90,
  myRkNmm,
  numeroEficaz,
} from "./uniones";

describe("resistencia al aplastamiento, ec. (8.32)", () => {
  it("reproduce el fh,0,k de la planilla cuando el diámetro va en milímetros", () => {
    // Columna de doble cortadura con laterales de acero: d = 11 mm, ρk = 386.
    expect(fh0k(11, 386)).toBeCloseTo(28.17028, 5);
    // Columna de chapa central: d = 6,47 mm, ρk = 425.
    expect(fh0k(6.4699939520153201, 425)).toBeCloseTo(32.5952071, 6);
  });

  it("con el diámetro en metros la resistencia sale un 11 % alta", () => {
    /*
     * Es el error de la columna de cortadura simple de la planilla: escribe
     * (1 − 0,01·d) con d en metros, donde la ec. (8.32) lo pide en milímetros.
     * El paréntesis pasa de 0,90 a 0,9999 y fh,0,k sube de 25,8 a 28,7 MPa.
     * Va del lado inseguro y no lo delata ningún resultado intermedio.
     */
    const correcto = fh0k(10, 350);
    const conMetros = 0.082 * (1 - 0.01 * 0.01) * 350;
    expect(correcto).toBeCloseTo(25.83, 2);
    expect(conMetros).toBeCloseTo(28.69713, 5);
    expect(conMetros / correcto - 1).toBeCloseTo(0.1111, 3);
  });

  it("k90 distingue las tres especies, ec. (8.33)", () => {
    expect(k90("conifera", 10)).toBeCloseTo(1.5, 9);
    expect(k90("lvl", 10)).toBeCloseTo(1.45, 9);
    expect(k90("frondosa", 10)).toBeCloseTo(1.05, 9);
    expect(k90("frondosa", 11)).toBeCloseTo(1.065, 9);
  });

  it("cargar en ángulo con la fibra baja el aplastamiento, ec. (8.31)", () => {
    const f0 = fh0k(11, 386);
    const factor = k90("frondosa", 11);
    expect(fhAlphaK(f0, factor, 0)).toBeCloseTo(f0, 9);
    expect(fhAlphaK(f0, factor, 90)).toBeCloseTo(f0 / factor, 9);
    // A 45° cae a la mitad del camino ponderada por sen² y cos².
    expect(fhAlphaK(f0, factor, 45)).toBeCloseTo(f0 / (factor * 0.5 + 0.5), 9);
  });
});

describe("momento plástico, ec. (8.30)", () => {
  it("reproduce los valores de la planilla", () => {
    expect(myRkNmm(650, 11)).toBeCloseTo(99461.6346953, 4);
    expect(myRkNmm(360, 10)).toBeCloseTo(42995.5744198, 4);
  });

  it("usa fu,k y no fy,k: con el límite elástico subestima el modo dúctil", () => {
    expect(myRkNmm(550, 11)).toBeLessThan(myRkNmm(650, 11));
  });
});

describe("cortadura simple madera-madera, ec. (8.6)", () => {
  /*
   * Escuadrías generosas a propósito: con t1 = 80 mm la clavija es esbelta
   * frente a la madera y gobierna el modo dúctil (f), que es el caso que la
   * nota del art. 8.2.2(1) señala como habitual y el que la planilla no
   * escribe. Con piezas finas gobernaría el aplastamiento, y el problema no se
   * vería.
   */
  const base = {
    dMm: 10,
    t1Mm: 80,
    t2Mm: 120,
    fh1kMPa: fh0k(10, 350),
    fh2kMPa: fh0k(10, 250),
    myRkNmm: myRkNmm(360, 10),
    faxRkKN: 0,
    tipo: "perno" as const,
  };

  it("escribe los seis modos de la norma", () => {
    const r = cortaduraSimpleMaderaMadera(base);
    expect(r.modos.map((m) => m.letra)).toEqual(["a", "b", "c", "d", "e", "f"]);
  });

  it("omitir modos siempre sube la capacidad: por eso hay que escribirlos todos", () => {
    /*
     * La planilla original escribe sólo (a), (b) y una versión de (c). Como el
     * resultado es el MÍNIMO de los modos, quitar candidatos nunca baja el
     * valor: devuelve una capacidad mayor que la real cada vez que gobierna uno
     * de los que faltan. Y el que falta incluye el (f), que según la nota del
     * art. 8.2.2(1) es el determinante con medios de fijación esbeltos.
     */
    const r = cortaduraSimpleMaderaMadera(base);
    const soloTres = Math.min(
      ...r.modos.filter((m) => "abc".includes(m.letra)).map((m) => m.valorKN)
    );
    expect(soloTres).toBeGreaterThanOrEqual(r.johansenKN);
    expect(r.gobierna.letra).toBe("f");
    // Con esta escuadría la diferencia es del 80 %: la unión quedaría casi al
    // doble de su capacidad real.
    expect(soloTres / r.johansenKN).toBeGreaterThan(1.5);
  });

  it("el modo (c) lleva el divisor (1+β) que la planilla omite", () => {
    /*
     * La expresión (c) de la ec. (8.6) va dividida por (1+β). Sin ese divisor
     * el modo queda sobrevalorado en ese mismo factor —del orden de 1,7 con
     * β = 0,7— y deja de competir en el mínimo aunque debiera.
     */
    const r = cortaduraSimpleMaderaMadera(base);
    const beta = base.fh2kMPa / base.fh1kMPa;
    const c = r.modos.find((m) => m.letra === "c")!;
    const rel = base.t2Mm / base.t1Mm;
    const sinDivisor =
      base.fh1kMPa *
      base.t1Mm *
      base.dMm *
      (Math.sqrt(beta + 2 * beta ** 2 * (1 + rel + rel ** 2) + beta ** 3 * rel ** 2) -
        beta * (1 + rel)) /
      1000;
    expect(sinDivisor / c.valorKN).toBeCloseTo(1 + beta, 6);
    expect(sinDivisor).toBeGreaterThan(c.valorKN);
  });

  it("con piezas muy finas gobierna el aplastamiento y no la rótula", () => {
    const fina = cortaduraSimpleMaderaMadera({ ...base, t1Mm: 4, t2Mm: 60 });
    expect(fina.gobierna.letra).toBe("a");
  });

  it("engrosar la madera deja de servir cuando manda el modo dúctil", () => {
    /*
     * El modo (f) no depende de t1 ni de t2: sólo de My,Rk, fh y d. Es la
     * consecuencia práctica más útil del artículo —una vez que gobierna, la
     * unión no mejora poniendo más madera, hay que ir a un perno mayor— y sale
     * sola de escribir los seis modos.
     */
    const gruesa = cortaduraSimpleMaderaMadera({ ...base, t1Mm: 150, t2Mm: 200 });
    expect(gruesa.gobierna.letra).toBe("f");
    expect(gruesa.johansenKN).toBeCloseTo(
      cortaduraSimpleMaderaMadera(base).johansenKN, 9
    );

    const pernoMayor = cortaduraSimpleMaderaMadera({
      ...base, dMm: 16, myRkNmm: myRkNmm(360, 16), fh1kMPa: fh0k(16, 350), fh2kMPa: fh0k(16, 250),
    });
    expect(pernoMayor.fvRkKN).toBeGreaterThan(gruesa.fvRkKN);
  });
});

describe("cortadura doble madera-madera, ec. (8.7)", () => {
  const base = {
    dMm: 10,
    t1Mm: 38,
    t2Mm: 65,
    fh1kMPa: fh0k(10, 320),
    fh2kMPa: fh0k(10, 320),
    myRkNmm: myRkNmm(240, 10),
    faxRkKN: 0,
    tipo: "perno" as const,
  };

  it("escribe los cuatro modos", () => {
    const r = cortaduraDobleMaderaMadera(base);
    expect(r.modos.map((m) => m.letra)).toEqual(["g", "h", "j", "k"]);
  });

  it("reproduce el fh,0,k de la planilla para esa columna", () => {
    expect(fh0k(10, 320)).toBeCloseTo(23.616, 6);
  });

  it("con β = 1 el modo (k) se reduce a 1,15·√(2·My·fh·d)", () => {
    const r = cortaduraDobleMaderaMadera(base);
    const k = r.modos.find((m) => m.letra === "k")!;
    expect(k.valorKN).toBeCloseTo(
      (1.15 * Math.sqrt(2 * base.myRkNmm * base.fh1kMPa * base.dMm)) / 1000, 9
    );
  });

  it("cuando manda el modo dúctil, la doble cortadura no mejora el plano", () => {
    /*
     * Los modos (f) de la ec. (8.6) y (k) de la (8.7) son la misma expresión.
     * Así que en cuanto la clavija es esbelta y gobierna la doble rótula, la
     * capacidad POR PLANO es idéntica en cortadura simple y doble: lo que gana
     * la doble es tener dos planos, no un plano mejor. Conviene tenerlo claro
     * antes de pasar una unión a doble cortadura esperando otra cosa.
     */
    const grueso = { ...base, t1Mm: 120, t2Mm: 200 };
    const doble = cortaduraDobleMaderaMadera(grueso);
    const simple = cortaduraSimpleMaderaMadera(grueso);
    expect(doble.gobierna.letra).toBe("k");
    expect(simple.gobierna.letra).toBe("f");
    expect(doble.fvRkKN).toBeCloseTo(simple.fvRkKN, 9);
  });

  it("con piezas normales sí gana por plano", () => {
    const doble = cortaduraDobleMaderaMadera(base);
    const simple = cortaduraSimpleMaderaMadera(base);
    expect(doble.fvRkKN).toBeGreaterThanOrEqual(simple.fvRkKN);
  });
});

describe("acero-madera, arts. 8.2.3", () => {
  it("clasifica la chapa por su espesor relativo", () => {
    expect(clasificarChapa(4, 11)).toBe("delgada");
    expect(clasificarChapa(12, 11)).toBe("gruesa");
    expect(clasificarChapa(8, 11)).toBe("intermedia");
  });

  it("reproduce la columna de chapas exteriores delgadas de la planilla", () => {
    // d = 11, chapa de 5 mm (delgada), t2 = 75 mm, frondosa a 45°.
    const fh = fhAlphaK(fh0k(11, 386), k90("frondosa", 11), 45);
    const r = chapasExterioresDoble({
      dMm: 11, tMm: 75, fhkMPa: fh, myRkNmm: myRkNmm(650, 11),
      faxRkKN: 0, tipo: "perno", espesorChapaMm: 5,
    });
    expect(r.modos[0].valorKN).toBeCloseTo((0.5 * fh * 75 * 11) / 1000, 6);
    expect(r.modos[1].valorKN).toBeCloseTo(
      (1.15 * Math.sqrt(2 * myRkNmm(650, 11) * fh * 11)) / 1000, 6
    );
    expect(r.gobierna.letra).toBe("k");
  });

  it("la chapa intermedia interpola en vez de saltar de régimen", () => {
    /*
     * El art. 8.2.3(1) manda interpolar linealmente entre chapa delgada y
     * gruesa. La planilla clasifica con un IF y salta: entre 0,5·d y d eso
     * puede dar hasta un 30 % de diferencia según de qué lado caiga.
     */
    // Madera de sobra para que gobierne el modo dúctil en los tres casos: si
    // el aplastamiento entrara en el mínimo, taparía la interpolación.
    const comun = {
      dMm: 10, tMm: 200, fhkMPa: 25, myRkNmm: myRkNmm(360, 10),
      faxRkKN: 0, tipo: "perno" as const,
    };
    const delgada = chapasExterioresDoble({ ...comun, espesorChapaMm: 5 });
    const media = chapasExterioresDoble({ ...comun, espesorChapaMm: 7.5 });
    const gruesa = chapasExterioresDoble({ ...comun, espesorChapaMm: 10 });

    expect(media.johansenKN).toBeGreaterThan(delgada.johansenKN);
    expect(media.johansenKN).toBeLessThan(gruesa.johansenKN);
    expect(gruesa.johansenKN / delgada.johansenKN).toBeCloseTo(2.3 / (1.15 * Math.SQRT2), 6);
  });

  it("reproduce la columna de chapa central de la planilla", () => {
    const d = 6.4699939520153201;
    const fh = fhAlphaK(fh0k(d, 425), k90("conifera", d), 90);
    const my = myRkNmm(360, d);
    const r = chapaCentralDoble({
      dMm: d, tMm: 42, fhkMPa: fh, myRkNmm: my,
      faxRkKN: 0, tipo: "perno", espesorChapaMm: 6,
    });
    expect(my).toBeCloseTo(13860.3382727, 4);
    expect(r.modos.map((m) => m.letra)).toEqual(["f", "g", "h"]);
    expect(r.gobierna.valorKN).toBeCloseTo(
      Math.min(...r.modos.map((m) => m.valorKN)), 12
    );
  });
});

describe("efecto soga, art. 8.2.2(2)", () => {
  const base = {
    dMm: 10, t1Mm: 40, t2Mm: 60,
    fh1kMPa: fh0k(10, 350), fh2kMPa: fh0k(10, 350),
    myRkNmm: myRkNmm(360, 10), faxRkKN: 8, tipo: "perno" as const,
  };

  it("aporta Fax,Rk/4 pero topado por el porcentaje del tipo", () => {
    const r = cortaduraDobleMaderaMadera(base);
    expect(r.efectoSogaKN).toBeLessThanOrEqual(0.25 * r.johansenKN + 1e-12);
    expect(r.fvRkKN).toBeCloseTo(r.johansenKN + r.efectoSogaKN, 12);
  });

  it("los pasadores no tienen efecto soga", () => {
    expect(TOPE_SOGA.pasador).toBe(0);
    const r = cortaduraDobleMaderaMadera({ ...base, tipo: "pasador" });
    expect(r.efectoSogaKN).toBe(0);
    expect(r.fvRkKN).toBeCloseTo(r.johansenKN, 12);
  });

  it("sin Fax,Rk conocido el aporte es cero", () => {
    const r = cortaduraDobleMaderaMadera({ ...base, faxRkKN: 0 });
    expect(r.efectoSogaKN).toBe(0);
  });

  it("el tirafondo puede duplicar la capacidad, el clavo sólo un 15 %", () => {
    const tirafondo = cortaduraDobleMaderaMadera({ ...base, faxRkKN: 40, tipo: "tirafondo" });
    const clavo = cortaduraDobleMaderaMadera({ ...base, faxRkKN: 40, tipo: "clavo-circular" });
    expect(clavo.efectoSogaKN).toBeCloseTo(0.15 * clavo.johansenKN, 9);
    expect(tirafondo.efectoSogaKN).toBeGreaterThan(clavo.efectoSogaKN);
  });
});

describe("número eficaz de una fila, ec. (8.34)", () => {
  it("un perno solo vale uno", () => {
    expect(numeroEficaz(1, 100, 10)).toBe(1);
  });

  it("una fila de pernos vale menos que la suma de sus pernos", () => {
    /*
     * El reparto entre pernos alineados no es uniforme: los extremos toman más
     * y la madera se hiende antes de que los del medio lleguen a su capacidad.
     * Ignorarlo sobrestima la unión, y con separaciones apretadas la pérdida
     * pasa del 25 %.
     */
    const n = 5;
    const nef = numeroEficaz(n, 70, 10);
    expect(nef).toBeLessThan(n);
    expect(nef / n).toBeLessThan(0.8);
  });

  it("separar más los pernos recupera eficacia, hasta el tope de n", () => {
    expect(numeroEficaz(4, 200, 10)).toBeGreaterThan(numeroEficaz(4, 60, 10));
    expect(numeroEficaz(4, 5000, 10)).toBe(4);
  });
});
