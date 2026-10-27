import { calcularVigaContinua } from "./viga-continua";
import { describe, expect, it } from "vitest";
import {
  COMBINACIONES_LIBRE,
  abscisasNudos,
  armarVigaLibre,
  calcularEnvolventeVigaLibre,
  calcularVigaLibre,
  validarVigaLibre,
  type CargaLibre,
  type DatosVigaLibre,
  type IdCombinacionLibre,
} from "./viga-libre";

const comb = (id: IdCombinacionLibre) => COMBINACIONES_LIBRE.find((c) => c.id === id)!;
const EI = 20000;

describe("viga libre", () => {
  it("ubica los nudos sumando las luces", () => {
    expect(abscisasNudos([5, 4, 1.5])).toEqual([0, 5, 9, 10.5]);
  });

  it("simplemente apoyada con G y Q: cada combinación escala su parte", () => {
    const datos: DatosVigaLibre = {
      lucesM: [6],
      apoyos: ["simple", "simple"],
      cargas: [
        { tipo: "distribuida", caso: "G", desdeM: 0, hastaM: 6, qInicialKNm: 10, qFinalKNm: 10 },
        { tipo: "distribuida", caso: "Q", desdeM: 0, hastaM: 6, qInicialKNm: 4, qFinalKNm: 4 },
      ],
      eiKNm2: EI,
    };
    const ql2 = (q: number) => (q * 36) / 8;
    expect(calcularVigaLibre(datos, comb("G")).resultado.momentoMax.valor).toBeCloseTo(ql2(10), 6);
    expect(calcularVigaLibre(datos, comb("Q")).resultado.momentoMax.valor).toBeCloseTo(ql2(4), 6);
    expect(calcularVigaLibre(datos, comb("servicio")).resultado.momentoMax.valor).toBeCloseTo(ql2(14), 6);
    expect(calcularVigaLibre(datos, comb("elu")).resultado.momentoMax.valor).toBeCloseTo(
      ql2(1.35 * 10 + 1.5 * 4),
      6
    );
  });

  it("dos tramos iguales con voladizo: el apoyo central da 5qL/4 sin el voladizo cargado", () => {
    // Dos tramos de 4 m con q en ambos y un voladizo de 1 m descargado.
    const datos: DatosVigaLibre = {
      lucesM: [4, 4, 1],
      apoyos: ["simple", "simple", "simple", "libre"],
      cargas: [{ tipo: "distribuida", caso: "G", desdeM: 0, hastaM: 8, qInicialKNm: 10, qFinalKNm: 10 }],
      eiKNm2: EI,
    };
    const { resultado } = calcularVigaLibre(datos, comb("G"));
    const central = resultado.reacciones.find((r) => Math.abs(r.xM - 4) < 1e-9)!;
    expect(central.rKN).toBeCloseTo((5 * 10 * 4) / 4, 6);
    expect(resultado.momentoMin.valor).toBeCloseTo(-(10 * 16) / 8, 6);
  });

  it("voladizo empotrado con puntual en la punta", () => {
    const datos: DatosVigaLibre = {
      lucesM: [2],
      apoyos: ["empotrado", "libre"],
      cargas: [{ tipo: "puntual", caso: "Q", xM: 2, pKN: 10 }],
      eiKNm2: EI,
    };
    const { resultado } = calcularVigaLibre(datos, comb("Q"));
    expect(resultado.momentoMin.valor).toBeCloseTo(-20, 6);
    // PL³/3EI
    expect(resultado.flechaMax.valor).toBeCloseTo(-((10 * 8) / (3 * EI)) * 1000, 6);
  });

  it("descarta las cargas de un caso con factor cero", () => {
    const datos: DatosVigaLibre = {
      lucesM: [5],
      apoyos: ["simple", "simple"],
      cargas: [
        { tipo: "puntual", caso: "G", xM: 2.5, pKN: 10 },
        { tipo: "momento", caso: "Q", xM: 1, mKNm: 5 },
      ],
      eiKNm2: EI,
    };
    expect(armarVigaLibre(datos, comb("G")).cargas).toEqual([{ tipo: "puntual", xM: 2.5, pKN: 10 }]);
    expect(armarVigaLibre(datos, comb("elu")).cargas).toEqual([
      { tipo: "puntual", xM: 2.5, pKN: 13.5 },
      { tipo: "momento", xM: 1, mKNm: 7.5 },
    ]);
  });

  it("dice por qué no se puede armar", () => {
    const base: DatosVigaLibre = { lucesM: [5], apoyos: ["simple", "simple"], cargas: [], eiKNm2: EI };
    expect(validarVigaLibre(base)).toBeNull();
    expect(validarVigaLibre({ ...base, lucesM: [] })).toMatch(/al menos un tramo/);
    expect(validarVigaLibre({ ...base, lucesM: [0] })).toMatch(/luz mayor que cero/);
    expect(validarVigaLibre({ ...base, apoyos: ["simple"] })).toMatch(/su apoyo/);
    expect(() => calcularVigaLibre({ ...base, apoyos: ["simple", "libre"] }, comb("G"))).toThrow(/mecanismo/);
  });
});

describe("envolvente con Q alternada", () => {
  // Dos tramos iguales con G y Q uniformes en toda la viga.
  const dosTramos: DatosVigaLibre = {
    lucesM: [6, 6],
    apoyos: ["simple", "simple", "simple"],
    cargas: [
      { tipo: "distribuida", caso: "G", desdeM: 0, hastaM: 12, qInicialKNm: 20, qFinalKNm: 20 },
      { tipo: "distribuida", caso: "Q", desdeM: 0, hastaM: 12, qInicialKNm: 10, qFinalKNm: 10 },
    ],
    eiKNm2: EI,
  };

  it("el negativo del apoyo central sale con los dos tramos cargados: qL²/8", () => {
    const env = calcularEnvolventeVigaLibre(dosTramos, comb("elu"));
    const q = 1.35 * 20 + 1.5 * 10;
    expect(env.momentoMin.valor).toBeCloseTo(-(q * 36) / 8, 6);
    expect(env.momentoMin.tramosConQ).toEqual([1, 2]);
    const central = env.reacciones.find((r) => Math.abs(r.xM - 6) < 1e-9)!;
    expect(central.rMaxKN).toBeCloseTo(1.25 * q * 6, 6);
  });

  it("el positivo del vano sale con Q sólo en ese tramo, y es mayor que con todo cargado", () => {
    const env = calcularEnvolventeVigaLibre(dosTramos, comb("elu"));
    expect(env.momentoMax.tramosConQ.length).toBe(1);
    expect(env.momentoMax.valor).toBeGreaterThan(env.todoCargado.resultado.momentoMax.valor + 1);
    // La reacción extrema mínima: Q sólo en el tramo opuesto la descarga.
    const extremo = env.reacciones[0];
    expect(extremo.rMinKN).toBeLessThan(extremo.rMaxKN);
  });

  it("coincide con probar las 2ⁿ disposiciones a mano, con voladizos", () => {
    const datos: DatosVigaLibre = {
      lucesM: [1.5, 5, 4, 2],
      apoyos: ["libre", "simple", "empotrado", "simple", "libre"],
      cargas: [
        { tipo: "distribuida", caso: "G", desdeM: 0, hastaM: 12.5, qInicialKNm: 15, qFinalKNm: 15 },
        { tipo: "distribuida", caso: "Q", desdeM: 0, hastaM: 12.5, qInicialKNm: 6, qFinalKNm: 9 },
        { tipo: "puntual", caso: "Q", xM: 8.5, pKN: 30 },
        { tipo: "puntual", caso: "Q", xM: 12.5, pKN: 10 },
      ],
      eiKNm2: EI,
    };
    const c = comb("elu");
    const env = calcularEnvolventeVigaLibre(datos, c);
    const xs = abscisasNudos(datos.lucesM);
    let mMax = -Infinity, mMin = Infinity, vMod = 0;
    for (let mascara = 0; mascara < 16; mascara++) {
      const cargas = datos.cargas.flatMap((q): CargaLibre[] => {
        if (q.caso === "G") return [{ ...q, caso: "G" as const }];
        // La Q de cada tramo encendido, recortada con el mismo criterio que el motor.
        return [0, 1, 2, 3].flatMap((i): CargaLibre[] => {
          if (!(mascara & (1 << i))) return [];
          const a = xs[i], b = xs[i + 1];
          if (q.tipo === "distribuida") {
            const lo = Math.max(a, q.desdeM), hi = Math.min(b, q.hastaM);
            const f = (x: number) => q.qInicialKNm + ((q.qFinalKNm - q.qInicialKNm) * (x - q.desdeM)) / (q.hastaM - q.desdeM);
            return hi > lo ? [{ ...q, desdeM: lo, hastaM: hi, qInicialKNm: f(lo), qFinalKNm: f(hi) }] : [];
          }
          return q.xM >= a && (q.xM < b || (i === 3 && q.xM <= b)) ? [q] : [];
        });
      });
      const r = calcularVigaContinua(armarVigaLibre({ ...datos, cargas }, c));
      mMax = Math.max(mMax, r.momentoMax.valor);
      mMin = Math.min(mMin, r.momentoMin.valor);
      vMod = Math.max(vMod, Math.abs(r.cortanteMax.valor));
    }
    // La envolvente se lee en los puntos muestreados: puede quedar apenas por debajo del extremo exacto.
    expect(env.momentoMax.valor).toBeCloseTo(mMax, 1);
    expect(env.momentoMin.valor).toBeCloseTo(mMin, 1);
    expect(Math.abs(env.cortanteMax.valor)).toBeCloseTo(vMod, 6);
  });
});
