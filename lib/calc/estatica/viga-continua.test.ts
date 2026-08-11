/**
 * El formulario de vigas clásico, usado como banco de pruebas.
 *
 * Cada caso de la tabla —simplemente apoyada, empotrada, apoyada-empotrada, dos
 * y tres tramos, voladizos, carga triangular— se resuelve con el motor y se
 * contrasta contra el valor cerrado de la tabla. Si el motor y la tabla no
 * coinciden, uno de los dos está mal, y el que se revisa primero es el motor.
 *
 * La ventaja de tener el cuadro acá y no adentro del código es que estos valores
 * son contrastables uno por uno contra cualquier manual, y no se usan para
 * calcular: sólo para juzgar.
 */

import { describe, expect, it } from "vitest";
import { calcularVigaContinua, _interno, type EntradaViga } from "./viga-continua";

const EI = 20000; // kN·m², un valor cualquiera: todos los casos son lineales en 1/EI

/** mm de flecha a partir de una expresión analítica en m. */
const mm = (m: number) => m * 1000;

function viga(parcial: Partial<EntradaViga> & Pick<EntradaViga, "largoM" | "nodos" | "cargas">) {
  return calcularVigaContinua({ eiKNm2: EI, muestrasPorTramo: 40, ...parcial });
}

describe("cuadratura", () => {
  // Los nodos y pesos de Gauss-Legendre están escritos a mano en el motor. Esto
  // verifica que sean los correctos sin tener que confiar en la transcripción:
  // la regla de 4 puntos tiene que integrar exacto hasta grado 7.
  it("integra exacto los polinomios hasta grado 7", () => {
    for (let n = 0; n <= 7; n++) {
      expect(_interno.integrar01((t) => t ** n)).toBeCloseTo(1 / (n + 1), 12);
    }
  });

  it("no integra exacto grado 8, que es donde tiene que dejar de hacerlo", () => {
    expect(_interno.integrar01((t) => t ** 8)).not.toBeCloseTo(1 / 9, 10);
  });
});

describe("funciones de forma", () => {
  const L = 3;

  it("valen 1 en su propio grado de libertad y 0 en los demás", () => {
    expect(_interno.formas(0, L)).toEqual([1, 0, 0, 0]);
    expect(_interno.formas(1, L)).toEqual([0, 0, 1, 0]);
    // Las de giro se anulan en los dos nodos; lo que vale 1 ahí es su derivada.
    expect(_interno.formasPrimera(0, L)[1]).toBeCloseTo(1, 12);
    expect(_interno.formasPrimera(1, L)[3]).toBeCloseTo(1, 12);
  });

  it("las derivadas son las de su función de forma, comprobadas numéricamente", () => {
    const h = 1e-6;
    for (const t of [0.15, 0.4, 0.73, 0.95]) {
      const d1 = _interno.formasPrimera(t, L);
      const d2 = _interno.formasSegunda(t, L);
      for (let a = 0; a < 4; a++) {
        const f = (u: number) => _interno.formas(u, L)[a];
        // dx = L·dt, de ahí los factores de L al pasar a diferencias en t.
        expect(d1[a]).toBeCloseTo((f(t + h) - f(t - h)) / (2 * h * L), 5);
        expect(d2[a]).toBeCloseTo((f(t + h) - 2 * f(t) + f(t - h)) / (h * h * L * L), 3);
      }
    }
  });

  it("reproducen por integración la matriz de rigidez clásica del elemento", () => {
    // ∫EI·N''ᵀN'' dx tiene que dar EI/L³·[12, 6L, 4L², …]. Es el contraste que
    // detecta de inmediato una derivada mal escrita: sin esto, el error aparece
    // recién varios casos después y disfrazado de "viga sin apoyos".
    const k = Array.from({ length: 4 }, (_, a) =>
      Array.from({ length: 4 }, (_, b) =>
        L * EI * _interno.integrar01((t) => {
          const n2 = _interno.formasSegunda(t, L);
          return n2[a] * n2[b];
        })
      )
    );
    const c = EI / L ** 3;
    const esperada = [
      [12 * c, 6 * L * c, -12 * c, 6 * L * c],
      [6 * L * c, 4 * L * L * c, -6 * L * c, 2 * L * L * c],
      [-12 * c, -6 * L * c, 12 * c, -6 * L * c],
      [6 * L * c, 2 * L * L * c, -6 * L * c, 4 * L * L * c],
    ];
    for (let a = 0; a < 4; a++) {
      for (let b = 0; b < 4; b++) expect(k[a][b]).toBeCloseTo(esperada[a][b], 6);
    }
  });

  it("dan los momentos de empotramiento perfecto de la carga uniforme", () => {
    // El vector de cargas nodales equivalentes de una q uniforme tiene que dar
    // qL/2 y qL²/12, que es la fila que todo el mundo se sabe de memoria.
    const q = 10;
    const f = Array.from({ length: 4 }, (_, a) =>
      -L * _interno.integrar01((t) => q * _interno.formas(t, L)[a])
    );
    expect(f[0]).toBeCloseTo(-(q * L) / 2, 9);
    expect(f[1]).toBeCloseTo(-(q * L * L) / 12, 9);
    expect(f[2]).toBeCloseTo(-(q * L) / 2, 9);
    expect(f[3]).toBeCloseTo((q * L * L) / 12, 9);
  });
});

describe("simplemente apoyada", () => {
  const L = 6;
  const w = 12; // kN/m

  it("con carga uniforme da wL/2, wL²/8 y 5wL⁴/384EI", () => {
    const r = viga({
      largoM: L,
      nodos: [
        { xM: 0, apoyo: "simple" },
        { xM: L, apoyo: "simple" },
      ],
      cargas: [{ tipo: "distribuida", desdeM: 0, hastaM: L, qInicialKNm: w, qFinalKNm: w }],
    });

    expect(r.reacciones[0].rKN).toBeCloseTo((w * L) / 2, 8);
    expect(r.reacciones[1].rKN).toBeCloseTo((w * L) / 2, 8);
    expect(r.momentoMax.valor).toBeCloseTo((w * L * L) / 8, 8);
    expect(r.momentoMax.xM).toBeCloseTo(L / 2, 6);
    expect(r.momentoMin.valor).toBeCloseTo(0, 8);
    expect(r.cortanteMax.valor).toBeCloseTo((w * L) / 2, 8);
    expect(r.flechaMax.valor).toBeCloseTo(mm(-(5 * w * L ** 4) / (384 * EI)), 8);
    expect(r.flechaMax.xM).toBeCloseTo(L / 2, 5);
    expect(r.desequilibrioKN).toBeCloseTo(0, 8);
  });

  it("con puntual centrada da P/2, PL/4 y PL³/48EI", () => {
    const P = 40;
    const r = viga({
      largoM: L,
      nodos: [
        { xM: 0, apoyo: "simple" },
        { xM: L, apoyo: "simple" },
      ],
      cargas: [{ tipo: "puntual", xM: L / 2, pKN: P }],
    });

    expect(r.reacciones[0].rKN).toBeCloseTo(P / 2, 8);
    expect(r.momentoMax.valor).toBeCloseTo((P * L) / 4, 8);
    expect(r.flechaMax.valor).toBeCloseTo(mm(-(P * L ** 3) / (48 * EI)), 8);
  });

  it("con puntual descentrada da Pb/L, Pa/L y Pab/L", () => {
    const P = 40;
    const a = 2;
    const b = L - a;
    const r = viga({
      largoM: L,
      nodos: [
        { xM: 0, apoyo: "simple" },
        { xM: L, apoyo: "simple" },
      ],
      cargas: [{ tipo: "puntual", xM: a, pKN: P }],
    });

    expect(r.reacciones[0].rKN).toBeCloseTo((P * b) / L, 8);
    expect(r.reacciones[1].rKN).toBeCloseTo((P * a) / L, 8);
    expect(r.momentoMax.valor).toBeCloseTo((P * a * b) / L, 8);
    expect(r.momentoMax.xM).toBeCloseTo(a, 8);
    // La flecha máxima no cae bajo la carga: se corre hacia el centro de la luz.
    expect(r.flechaMax.xM).toBeGreaterThan(a);
    expect(r.flechaMax.xM).toBeLessThan(L / 2);
  });

  it("con carga triangular da wL/6, wL/3 y wL²/(9√3)", () => {
    const w1 = 15;
    const r = viga({
      largoM: L,
      nodos: [
        { xM: 0, apoyo: "simple" },
        { xM: L, apoyo: "simple" },
      ],
      cargas: [{ tipo: "distribuida", desdeM: 0, hastaM: L, qInicialKNm: 0, qFinalKNm: w1 }],
    });

    expect(r.reacciones[0].rKN).toBeCloseTo((w1 * L) / 6, 8);
    expect(r.reacciones[1].rKN).toBeCloseTo((w1 * L) / 3, 8);
    expect(r.momentoMax.valor).toBeCloseTo((w1 * L * L) / (9 * Math.sqrt(3)), 8);
    expect(r.momentoMax.xM).toBeCloseTo(L / Math.sqrt(3), 6);
    // Valor de tabla: 0,00652·wL⁴/EI, en x ≈ 0,5193·L.
    expect(Math.abs(r.flechaMax.valor)).toBeCloseTo(mm((0.00652 * w1 * L ** 4) / EI), 1);
    expect(r.flechaMax.xM / L).toBeCloseTo(0.5193, 3);
  });

  it("con un momento aplicado en el centro da reacciones M/L opuestas", () => {
    const M = 30;
    const r = viga({
      largoM: L,
      nodos: [
        { xM: 0, apoyo: "simple" },
        { xM: L, apoyo: "simple" },
      ],
      cargas: [{ tipo: "momento", xM: L / 2, mKNm: M }],
    });

    // Momentos respecto del apoyo izquierdo, antihorario positivo:
    // M + L·R_der = 0, así que la derecha baja y la izquierda sube.
    expect(r.reacciones[0].rKN).toBeCloseTo(M / L, 8);
    expect(r.reacciones[1].rKN).toBeCloseTo(-M / L, 8);
    // El diagrama salta M en el punto de aplicación: ±M/2 a cada lado.
    expect(r.momentoMax.valor).toBeCloseTo(M / 2, 8);
    expect(r.momentoMin.valor).toBeCloseTo(-M / 2, 8);
  });
});

describe("voladizo", () => {
  const L = 3;

  it("con carga uniforme da wL²/2 en el empotramiento y wL⁴/8EI en la punta", () => {
    const w = 10;
    const r = viga({
      largoM: L,
      nodos: [
        { xM: 0, apoyo: "empotrado" },
        { xM: L, apoyo: "libre" },
      ],
      cargas: [{ tipo: "distribuida", desdeM: 0, hastaM: L, qInicialKNm: w, qFinalKNm: w }],
    });

    expect(r.reacciones).toHaveLength(1);
    expect(r.reacciones[0].rKN).toBeCloseTo(w * L, 8);
    // El momento de empotramiento equilibra wL²/2; el flector es negativo.
    expect(r.momentoMin.valor).toBeCloseTo(-(w * L * L) / 2, 8);
    expect(r.momentoMin.xM).toBeCloseTo(0, 8);
    expect(r.flechaMax.valor).toBeCloseTo(mm(-(w * L ** 4) / (8 * EI)), 8);
    expect(r.flechaMax.xM).toBeCloseTo(L, 8);
  });

  it("con puntual en la punta da PL y PL³/3EI", () => {
    const P = 25;
    const r = viga({
      largoM: L,
      nodos: [
        { xM: 0, apoyo: "empotrado" },
        { xM: L, apoyo: "libre" },
      ],
      cargas: [{ tipo: "puntual", xM: L, pKN: P }],
    });

    expect(r.reacciones[0].rKN).toBeCloseTo(P, 8);
    expect(r.momentoMin.valor).toBeCloseTo(-P * L, 8);
    expect(r.flechaMax.valor).toBeCloseTo(mm(-(P * L ** 3) / (3 * EI)), 8);
  });
});

describe("biempotrada", () => {
  const L = 5;
  const w = 18;

  it("con carga uniforme da wL²/12 en apoyos, wL²/24 en el centro y wL⁴/384EI", () => {
    const r = viga({
      largoM: L,
      nodos: [
        { xM: 0, apoyo: "empotrado" },
        { xM: L, apoyo: "empotrado" },
      ],
      cargas: [{ tipo: "distribuida", desdeM: 0, hastaM: L, qInicialKNm: w, qFinalKNm: w }],
    });

    expect(r.reacciones[0].rKN).toBeCloseTo((w * L) / 2, 8);
    expect(r.reacciones[1].rKN).toBeCloseTo((w * L) / 2, 8);
    expect(r.momentoMin.valor).toBeCloseTo(-(w * L * L) / 12, 8);
    expect(r.momentoMax.valor).toBeCloseTo((w * L * L) / 24, 8);
    expect(r.flechaMax.valor).toBeCloseTo(mm(-(w * L ** 4) / (384 * EI)), 8);
  });

  it("con puntual centrada da PL/8 en apoyos y en el centro, y PL³/192EI", () => {
    const P = 60;
    const r = viga({
      largoM: L,
      nodos: [
        { xM: 0, apoyo: "empotrado" },
        { xM: L, apoyo: "empotrado" },
      ],
      cargas: [{ tipo: "puntual", xM: L / 2, pKN: P }],
    });

    expect(r.momentoMin.valor).toBeCloseTo(-(P * L) / 8, 8);
    expect(r.momentoMax.valor).toBeCloseTo((P * L) / 8, 8);
    expect(r.flechaMax.valor).toBeCloseTo(mm(-(P * L ** 3) / (192 * EI)), 8);
  });
});

describe("empotrada-apoyada", () => {
  const L = 6;
  const w = 14;

  it("con carga uniforme da 3wL/8, wL²/8 y 9wL²/128", () => {
    const r = viga({
      largoM: L,
      nodos: [
        { xM: 0, apoyo: "empotrado" },
        { xM: L, apoyo: "simple" },
      ],
      cargas: [{ tipo: "distribuida", desdeM: 0, hastaM: L, qInicialKNm: w, qFinalKNm: w }],
    });

    expect(r.reacciones[0].rKN).toBeCloseTo((5 * w * L) / 8, 8);
    expect(r.reacciones[1].rKN).toBeCloseTo((3 * w * L) / 8, 8);
    expect(r.momentoMin.valor).toBeCloseTo(-(w * L * L) / 8, 8);
    expect(r.momentoMax.valor).toBeCloseTo((9 * w * L * L) / 128, 8);
    expect(r.momentoMax.xM).toBeCloseTo((5 * L) / 8, 6);
    // Valor de tabla: wL⁴/(185·EI) en x ≈ 0,5785·L.
    expect(Math.abs(r.flechaMax.valor)).toBeCloseTo(mm((w * L ** 4) / (185 * EI)), 1);
    expect(r.flechaMax.xM / L).toBeCloseTo(0.5785, 3);
  });
});

describe("vigas continuas", () => {
  const L = 5;
  const w = 20;

  it("dos tramos iguales con carga uniforme dan 3wL/8, 10wL/8 y −wL²/8 en el apoyo central", () => {
    const r = viga({
      largoM: 2 * L,
      nodos: [
        { xM: 0, apoyo: "simple" },
        { xM: L, apoyo: "simple" },
        { xM: 2 * L, apoyo: "simple" },
      ],
      cargas: [{ tipo: "distribuida", desdeM: 0, hastaM: 2 * L, qInicialKNm: w, qFinalKNm: w }],
    });

    expect(r.reacciones[0].rKN).toBeCloseTo((3 * w * L) / 8, 8);
    expect(r.reacciones[1].rKN).toBeCloseTo((10 * w * L) / 8, 8);
    expect(r.reacciones[2].rKN).toBeCloseTo((3 * w * L) / 8, 8);
    expect(r.momentoMin.valor).toBeCloseTo(-(w * L * L) / 8, 8);
    expect(r.momentoMin.xM).toBeCloseTo(L, 6);
    expect(r.momentoMax.valor).toBeCloseTo((9 * w * L * L) / 128, 8);
    expect(r.desequilibrioKN).toBeCloseTo(0, 8);
  });

  it("tres tramos iguales con carga uniforme dan 0,4wL / 1,1wL y −0,1wL² en los apoyos internos", () => {
    const r = viga({
      largoM: 3 * L,
      nodos: [
        { xM: 0, apoyo: "simple" },
        { xM: L, apoyo: "simple" },
        { xM: 2 * L, apoyo: "simple" },
        { xM: 3 * L, apoyo: "simple" },
      ],
      cargas: [{ tipo: "distribuida", desdeM: 0, hastaM: 3 * L, qInicialKNm: w, qFinalKNm: w }],
    });

    expect(r.reacciones[0].rKN).toBeCloseTo(0.4 * w * L, 6);
    expect(r.reacciones[1].rKN).toBeCloseTo(1.1 * w * L, 6);
    expect(r.reacciones[2].rKN).toBeCloseTo(1.1 * w * L, 6);
    expect(r.reacciones[3].rKN).toBeCloseTo(0.4 * w * L, 6);
    expect(r.momentoMin.valor).toBeCloseTo(-0.1 * w * L * L, 6);
    expect(r.momentoMax.valor).toBeCloseTo(0.08 * w * L * L, 6);
  });
});

describe("voladizo en el extremo", () => {
  it("un tramo apoyado con volado descarga el vano: el momento del volado se resta", () => {
    const L = 6;
    const a = 2;
    const w = 10;
    const r = viga({
      largoM: L + a,
      nodos: [
        { xM: 0, apoyo: "simple" },
        { xM: L, apoyo: "simple" },
      ],
      cargas: [{ tipo: "distribuida", desdeM: 0, hastaM: L + a, qInicialKNm: w, qFinalKNm: w }],
    });

    // En el apoyo interior el flector vale el del volado aislado: −w·a²/2.
    const enApoyo = r.puntos.find((p) => Math.abs(p.xM - L) < 1e-6)!;
    expect(enApoyo.momentoKNm).toBeCloseTo(-(w * a * a) / 2, 6);
    // Y el vano ya no llega a wL²/8 porque el volado le levanta el diagrama.
    expect(r.momentoMax.valor).toBeLessThan((w * L * L) / 8);
    expect(r.desequilibrioKN).toBeCloseTo(0, 8);
  });
});

describe("propiedades del método", () => {
  const base: EntradaViga = {
    largoM: 8,
    eiKNm2: EI,
    nodos: [
      { xM: 0, apoyo: "simple" },
      { xM: 8, apoyo: "simple" },
    ],
    cargas: [
      { tipo: "distribuida", desdeM: 0, hastaM: 5, qInicialKNm: 6, qFinalKNm: 14 },
      { tipo: "puntual", xM: 6.5, pKN: 30 },
    ],
  };

  it("no depende de la malla: agregar un nodo libre no cambia el resultado", () => {
    const sinNodo = calcularVigaContinua(base);
    const conNodo = calcularVigaContinua({
      ...base,
      nodos: [...base.nodos, { xM: 3.3, apoyo: "libre" }],
    });

    expect(conNodo.reacciones[0].rKN).toBeCloseTo(sinNodo.reacciones[0].rKN, 9);
    expect(conNodo.momentoMax.valor).toBeCloseTo(sinNodo.momentoMax.valor, 9);
    expect(conNodo.flechaMax.valor).toBeCloseTo(sinNodo.flechaMax.valor, 8);
  });

  it("es lineal: duplicar las cargas duplica esfuerzos y flechas", () => {
    const simple = calcularVigaContinua(base);
    const doble = calcularVigaContinua({
      ...base,
      cargas: [
        { tipo: "distribuida", desdeM: 0, hastaM: 5, qInicialKNm: 12, qFinalKNm: 28 },
        { tipo: "puntual", xM: 6.5, pKN: 60 },
      ],
    });

    expect(doble.momentoMax.valor).toBeCloseTo(2 * simple.momentoMax.valor, 8);
    expect(doble.flechaMax.valor).toBeCloseTo(2 * simple.flechaMax.valor, 8);
  });

  it("la flecha es inversamente proporcional a EI y los esfuerzos isostáticos no cambian", () => {
    const blanda = calcularVigaContinua(base);
    const rigida = calcularVigaContinua({ ...base, eiKNm2: 2 * EI });

    expect(rigida.flechaMax.valor).toBeCloseTo(blanda.flechaMax.valor / 2, 8);
    expect(rigida.momentoMax.valor).toBeCloseTo(blanda.momentoMax.valor, 8);
  });

  it("cierra el equilibrio global de fuerzas", () => {
    expect(calcularVigaContinua(base).desequilibrioKN).toBeCloseTo(0, 8);
  });
});

describe("entradas inválidas", () => {
  it("avisa si la viga es un mecanismo", () => {
    expect(() =>
      viga({
        largoM: 4,
        nodos: [
          { xM: 0, apoyo: "simple" },
          { xM: 4, apoyo: "libre" },
        ],
        cargas: [{ tipo: "puntual", xM: 2, pKN: 10 }],
      })
    ).toThrow(/mecanismo/);
  });

  it("avisa si no hay ningún apoyo", () => {
    expect(() =>
      viga({
        largoM: 4,
        nodos: [
          { xM: 0, apoyo: "libre" },
          { xM: 4, apoyo: "libre" },
        ],
        cargas: [],
      })
    ).toThrow(/apoyo/);
  });

  it("avisa si una carga cae fuera de la viga", () => {
    expect(() =>
      viga({
        largoM: 4,
        nodos: [
          { xM: 0, apoyo: "simple" },
          { xM: 4, apoyo: "simple" },
        ],
        cargas: [{ tipo: "puntual", xM: 5, pKN: 10 }],
      })
    ).toThrow(/fuera/);
  });

  it("rechaza EI nulo", () => {
    expect(() =>
      calcularVigaContinua({
        largoM: 4,
        eiKNm2: 0,
        nodos: [
          { xM: 0, apoyo: "simple" },
          { xM: 4, apoyo: "simple" },
        ],
        cargas: [],
      })
    ).toThrow(/EI/);
  });
});
