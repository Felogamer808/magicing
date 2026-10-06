import { GAMMA_F } from "@/lib/calc/hormigon/comun/coeficientes";
import { factorEscalaK, tensionCortanteResistente } from "@/lib/calc/hormigon/comun/cortante";
import type { MaterialesDerivados } from "@/lib/calc/hormigon/comun/types";

/**
 * Punzonamiento de una zapata con el pilar descentrado.
 *
 * Criterios decididos por el usuario (2026-10-06):
 * - La reacción del terreno que se descuenta dentro del perímetro es la presión
 *   real, lineal en las dos direcciones, no la media: con el pilar contra el
 *   borde, ahí la presión es la máxima.
 * - Cerca de un borde el perímetro se recorta como en la fig. A19.6.15 (art.
 *   6.4.2 (4), pág. 87) y el β es el de pilar de borde o de esquina (art.
 *   6.4.3 (4)-(5), ecs. (6.44)-(6.46), págs. 92-93). Es la regla de losas
 *   extendida a zapatas.
 * - El β usa sólo el momento propio del pilar: el Nk·e0 del descentramiento ya
 *   está en el diagrama de presiones que se descuenta.
 *
 * El resto es el del pilar centrado (art. 6.4.4 (2), ec. (6.50)-(6.51)): se
 * barren los perímetros hasta 2d y se informa el que peor verifica.
 */

type Lado = "izq" | "der" | "sup" | "inf";
const LADOS: Lado[] = ["izq", "der", "sup", "inf"];

export interface EntradaPunzonamientoDescentrado {
  A: number;
  B: number;
  anchoPilarA: number;
  anchoPilarB: number;
  /** Cara del pilar al borde de inicio en A y en B (m). */
  bordeA: number;
  bordeB: number;
  dA: number;
  dB: number;
  nk: number;
  /** Momentos propios del pilar, positivos hacia el borde final (kN·m). */
  mkA: number;
  mkB: number;
  /** Excentricidad de cálculo de las presiones, (Nk·e0 + Mk)/Nk, en A y en B (m). */
  excCalculoA: number;
  excCalculoB: number;
  asRealACm2: number;
  asRealBCm2: number;
}

export interface ResultadoPunzonamientoDescentrado {
  dPromedioM: number;
  aCriticaM: number;
  u1M: number;
  vEdRedKN: number;
  vEdKN: number;
  beta: number;
  vRdCKN: number;
  aprovechamiento: number;
  verificaPunzonamiento: boolean;
  hayPerimetroDentro: boolean;
  /** Cómo trata la norma al pilar en el perímetro crítico. */
  situacion: "interior" | "borde" | "esquina" | "entre bordes";
  caraPilar: { u0M: number; beta: number; vEdMPa: number; vRdMaxMPa: number; verifica: boolean };
  /** Presente cuando ningún perímetro rodea al pilar. */
  motivoNoEvaluado?: string;
}

interface Tramo {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/**
 * Perímetro a distancia a de la cara del pilar con los lados `recortados`
 * llevados hasta el borde (fig. A19.6.15): el tramo libre no cuenta, y las
 * rectas vecinas se prolongan hasta el borde. Devuelve tramos rectos y arcos
 * discretizados.
 */
export function contorno(e: EntradaPunzonamientoDescentrado, a: number, rec: Record<Lado, boolean>): Tramo[] {
  const x0 = e.bordeA;
  const x1 = e.bordeA + e.anchoPilarA;
  const y0 = e.bordeB;
  const y1 = e.bordeB + e.anchoPilarB;
  const yIni = rec.sup ? 0 : y0;
  const yFin = rec.inf ? e.B : y1;
  const xIni = rec.izq ? 0 : x0;
  const xFin = rec.der ? e.A : x1;
  const t: Tramo[] = [];
  if (!rec.izq) t.push({ x0: x0 - a, y0: yIni, x1: x0 - a, y1: yFin });
  if (!rec.der) t.push({ x0: x1 + a, y0: yIni, x1: x1 + a, y1: yFin });
  if (!rec.sup) t.push({ x0: xIni, y0: y0 - a, x1: xFin, y1: y0 - a });
  if (!rec.inf) t.push({ x0: xIni, y0: y1 + a, x1: xFin, y1: y1 + a });
  const esquinas: [Lado, Lado, number, number, number][] = [
    ["izq", "sup", x0, y0, Math.PI],
    ["der", "sup", x1, y0, 1.5 * Math.PI],
    ["der", "inf", x1, y1, 0],
    ["izq", "inf", x0, y1, 0.5 * Math.PI],
  ];
  const PASOS = 36;
  for (const [l1, l2, cx, cy, ang0] of esquinas) {
    if (rec[l1] || rec[l2]) continue;
    for (let i = 0; i < PASOS; i++) {
      const t0 = ang0 + (i * Math.PI) / 2 / PASOS;
      const t1 = ang0 + ((i + 1) * Math.PI) / 2 / PASOS;
      t.push({ x0: cx + a * Math.cos(t0), y0: cy + a * Math.sin(t0), x1: cx + a * Math.cos(t1), y1: cy + a * Math.sin(t1) });
    }
  }
  return t;
}

/** Largo, y W en cada dirección respecto del baricentro del perímetro (ec. (6.39): W = ∫|e|·dl). */
export function propiedadesContorno(tramos: Tramo[]) {
  let u = 0;
  let sx = 0;
  let sy = 0;
  for (const t of tramos) {
    const l = Math.hypot(t.x1 - t.x0, t.y1 - t.y0);
    u += l;
    sx += l * (t.x0 + t.x1) / 2;
    sy += l * (t.y0 + t.y1) / 2;
  }
  if (u === 0) return { u: 0, wA: 0, wB: 0 };
  const xg = sx / u;
  const yg = sy / u;
  let wA = 0;
  let wB = 0;
  const N = 20;
  for (const t of tramos) {
    const l = Math.hypot(t.x1 - t.x0, t.y1 - t.y0) / N;
    for (let i = 0; i < N; i++) {
      const f = (i + 0.5) / N;
      wA += l * Math.abs(t.x0 + f * (t.x1 - t.x0) - xg);
      wB += l * Math.abs(t.y0 + f * (t.y1 - t.y0) - yg);
    }
  }
  return { u, wA, wB };
}

/** k de la tabla A19.6.1, con interpolación lineal. */
function coeficienteK(c1: number, c2: number): number {
  const tabla: [number, number][] = [[0.5, 0.45], [1, 0.6], [2, 0.7], [3, 0.8]];
  const r = c1 / c2;
  if (r <= tabla[0][0]) return tabla[0][1];
  for (let i = 1; i < tabla.length; i++) {
    if (r <= tabla[i][0]) {
      const [r0, k0] = tabla[i - 1];
      const [r1, k1] = tabla[i];
      return k0 + ((k1 - k0) * (r - r0)) / (r1 - r0);
    }
  }
  return tabla[tabla.length - 1][1];
}

export function calcularPunzonamientoDescentrado(
  materiales: MaterialesDerivados,
  e: EntradaPunzonamientoDescentrado
): ResultadoPunzonamientoDescentrado {
  const { A, B, anchoPilarA: cA, anchoPilarB: cB, nk } = e;
  const { fck, fcd } = materiales;
  const d = (e.dA + e.dB) / 2;
  const s: Record<Lado, number> = {
    izq: e.bordeA,
    der: A - e.bordeA - cA,
    sup: e.bordeB,
    inf: B - e.bordeB - cB,
  };

  const vEdPilarKN = GAMMA_F * nk;
  const mA = GAMMA_F * e.mkA;
  const mB = GAMMA_F * e.mkB;

  // Presión de cálculo real, lineal en las dos direcciones; el terreno no tracciona.
  const sigmaMedia = vEdPilarKN / (A * B);
  const sigma = (x: number, y: number) =>
    sigmaMedia * Math.max(0, 1 + (12 * e.excCalculoA * (x - A / 2)) / A ** 2 + (12 * e.excCalculoB * (y - B / 2)) / B ** 2);

  /** Reacción del terreno dentro del perímetro, integrada en una grilla. */
  const reaccionDentro = (a: number, rec: Record<Lado, boolean>) => {
    const xa = rec.izq ? 0 : Math.max(e.bordeA - a, 0);
    const xb = rec.der ? A : Math.min(e.bordeA + cA + a, A);
    const ya = rec.sup ? 0 : Math.max(e.bordeB - a, 0);
    const yb = rec.inf ? B : Math.min(e.bordeB + cB + a, B);
    const N = 40;
    const dx = (xb - xa) / N;
    const dy = (yb - ya) / N;
    let r = 0;
    for (let i = 0; i < N; i++) {
      const x = xa + (i + 0.5) * dx;
      for (let j = 0; j < N; j++) {
        const y = ya + (j + 0.5) * dy;
        // Esquinas redondeadas donde ninguno de los dos lados se recortó.
        const fueraX = x < e.bordeA ? e.bordeA - x : x > e.bordeA + cA ? x - e.bordeA - cA : 0;
        const fueraY = y < e.bordeB ? e.bordeB - y : y > e.bordeB + cB ? y - e.bordeB - cB : 0;
        const ladoX: Lado = x < e.bordeA ? "izq" : "der";
        const ladoY: Lado = y < e.bordeB ? "sup" : "inf";
        if (fueraX > 0 && fueraY > 0 && !rec[ladoX] && !rec[ladoY] && Math.hypot(fueraX, fueraY) > a) continue;
        r += sigma(x, y) * dx * dy;
      }
    }
    return r;
  };

  const rhoLA = e.asRealACm2 / (100 ** 2 * B * e.dA);
  const rhoLB = e.asRealBCm2 / (100 ** 2 * A * e.dB);
  const rhoL = Math.sqrt(Math.min(rhoLA, 0.02) * Math.min(rhoLB, 0.02));
  const k = factorEscalaK(d);

  /**
   * Perímetro de menor largo entre los recortes posibles (art. 6.4.2 (4)). Los
   * lados cuyo perímetro se sale de la zapata se recortan sí o sí; los demás,
   * sólo si el pilar está cerca de ese borde (a menos de 2d), que es el caso
   * que la regla contempla: lejos del borde, recortar acortaría el perímetro
   * sin que haya borde que lo justifique.
   */
  const elegirRecorte = (a: number) => {
    let mejor: { rec: Record<Lado, boolean>; tramos: Tramo[]; p: ReturnType<typeof propiedadesContorno> } | null = null;
    for (let m = 0; m < 16; m++) {
      const rec = { izq: !!(m & 1), der: !!(m & 2), sup: !!(m & 4), inf: !!(m & 8) };
      if (LADOS.some((l) => s[l] < a - 1e-9 && !rec[l])) continue;
      if (LADOS.some((l) => rec[l] && s[l] >= 2 * d)) continue;
      // Recortar dos lados opuestos deja una recta de borde a borde, con W = 0
      // en la otra dirección: sólo vale si los dos recortes son obligatorios.
      const obligatorio = (l: Lado) => s[l] < a - 1e-9;
      if (rec.izq && rec.der && !(obligatorio("izq") && obligatorio("der"))) continue;
      if (rec.sup && rec.inf && !(obligatorio("sup") && obligatorio("inf"))) continue;
      const tramos = contorno(e, a, rec);
      const p = propiedadesContorno(tramos);
      if (p.u <= 0) continue;
      if (!mejor || p.u < mejor.p.u - 1e-9) mejor = { rec, tramos, p };
    }
    return mejor;
  };

  /** Hacia el interior de cada lado recortado: el momento del pilar empuja lejos de ese borde. */
  const haciaInterior = (l: Lado) =>
    l === "izq" ? mA > 0 : l === "der" ? mA < 0 : l === "sup" ? mB > 0 : mB < 0;

  const situacionDe = (rec: Record<Lado, boolean>) => {
    const r = LADOS.filter((l) => rec[l]);
    if (r.length === 0) return "interior" as const;
    if (r.length === 1) return "borde" as const;
    if (r.length === 2 && !(rec.izq && rec.der) && !(rec.sup && rec.inf)) return "esquina" as const;
    return "entre bordes" as const;
  };

  /** β según el art. 6.4.3: (6.39) general, (6.44) de borde o (6.46) de esquina. */
  const betaEn = (rec: Record<Lado, boolean>, p: ReturnType<typeof propiedadesContorno>, vRed: number) => {
    const general = () =>
      vRed > 0
        ? 1 +
          (coeficienteK(cA, cB) * Math.abs(mA) * p.u) / (vRed * p.wA) +
          (coeficienteK(cB, cA) * Math.abs(mB) * p.u) / (vRed * p.wB)
        : 1;
    const sit = situacionDe(rec);
    const recortados = LADOS.filter((l) => rec[l]);
    // Perímetro reducido u1* (fig. A19.6.20): las rectas que llegan al borde
    // se acortan a mín(1,5d; 0,5·c) medidos desde la cara interior.
    const reducido = () => {
      let u = p.u;
      for (const l of recortados) {
        const cPerp = l === "izq" || l === "der" ? cA : cB;
        const largoRecta = cPerp + s[l];
        const corta = Math.min(1.5 * d, 0.5 * cPerp);
        const rectas = sit === "borde" ? 2 : 1;
        u -= rectas * (largoRecta - corta);
      }
      return u;
    };
    if (sit === "borde" && haciaInterior(recortados[0])) {
      const l = recortados[0];
      const paralelo = l === "izq" || l === "der" ? "B" : "A";
      const mPar = paralelo === "A" ? mA : mB;
      const cPerp = paralelo === "A" ? cB : cA;
      const cPar = paralelo === "A" ? cA : cB;
      const w = paralelo === "A" ? p.wA : p.wB;
      // ec. (6.44), con k de la tabla A19.6.1 sobre c1/2c2.
      return p.u / reducido() + (vRed > 0 ? (coeficienteK(cPerp, 2 * cPar) * p.u * Math.abs(mPar)) / (w * vRed) : 0);
    }
    if (sit === "esquina" && recortados.every(haciaInterior)) return p.u / reducido(); // ec. (6.46)
    return general(); // ec. (6.39)
  };

  let cruzaDeBordeABorde = false;
  const enPerimetro = (a: number) => {
    const elegido = elegirRecorte(a);
    if (!elegido) return null;
    // El perímetro cruza la zapata de borde a borde: ya no rodea al pilar y lo
    // que queda es cortante de viga, que se comprueba en los vuelos.
    if (situacionDe(elegido.rec) === "entre bordes") {
      cruzaDeBordeABorde = true;
      return null;
    }
    const vEdRedKN = Math.max(vEdPilarKN - reaccionDentro(a, elegido.rec), 0);
    const beta = betaEn(elegido.rec, elegido.p, vEdRedKN);
    const vEdKN = vEdRedKN * beta;
    const vRdCKN = tensionCortanteResistente(k, rhoL, fck) * ((2 * d) / a) * elegido.p.u * d * 1000;
    return {
      aM: a,
      u1M: elegido.p.u,
      vEdRedKN,
      vEdKN,
      beta,
      vRdCKN,
      aprovechamiento: vRdCKN > 0 ? vEdKN / vRdCKN : Infinity,
      situacion: situacionDe(elegido.rec),
      rec: elegido.rec,
    };
  };

  // Bielas en la cara del pilar, art. 6.4.5 (3), ec. (6.53): u0 de pilar de
  // borde c2 + 3d ≤ c2 + 2c1 y de esquina 3d ≤ c1 + c2.
  const nu = 0.6 * (1 - fck / 250);
  const vRdMaxMPa = 0.4 * nu * fcd;
  const en2d = enPerimetro(2 * d);
  const sit2d = en2d?.situacion ?? "interior";
  let u0M = 2 * (cA + cB);
  if (sit2d === "borde" && en2d) {
    const l = LADOS.find((x) => en2d.rec[x])!;
    const [cPerp, cPar] = l === "izq" || l === "der" ? [cA, cB] : [cB, cA];
    u0M = Math.min(cPar + 3 * d, cPar + 2 * cPerp);
  } else if (sit2d === "esquina") {
    u0M = Math.min(3 * d, cA + cB);
  }
  const betaCara = en2d && en2d.vEdRedKN > 0 ? en2d.beta : 1;
  const vEdCaraMPa = (betaCara * vEdPilarKN) / (u0M * d) / 1000;
  const caraPilar = { u0M, beta: betaCara, vEdMPa: vEdCaraMPa, vRdMaxMPa, verifica: vEdCaraMPa <= vRdMaxMPa };

  const PASOS = 50;
  let critico: NonNullable<ReturnType<typeof enPerimetro>> | null = null;
  for (let i = 1; i <= PASOS; i++) {
    const c = enPerimetro((2 * d * i) / PASOS);
    if (c && (!critico || c.aprovechamiento > critico.aprovechamiento)) critico = c;
  }
  if (!critico) {
    return {
      dPromedioM: d, aCriticaM: 0, u1M: 0, vEdRedKN: 0, vEdKN: 0, beta: 1, vRdCKN: 0, aprovechamiento: 0,
      verificaPunzonamiento: true, hayPerimetroDentro: false, situacion: sit2d, caraPilar,
      ...(cruzaDeBordeABorde
        ? {
            motivoNoEvaluado:
              "El perímetro crítico cruza la zapata de borde a borde: no rodea al pilar, así que no hay punzonamiento. Lo que queda es cortante de viga, que se comprueba en los vuelos.",
          }
        : {}),
    };
  }
  return {
    dPromedioM: d,
    aCriticaM: critico.aM,
    u1M: critico.u1M,
    vEdRedKN: critico.vEdRedKN,
    vEdKN: critico.vEdKN,
    beta: critico.beta,
    vRdCKN: critico.vRdCKN,
    aprovechamiento: critico.aprovechamiento,
    verificaPunzonamiento: critico.vEdKN <= critico.vRdCKN,
    hayPerimetroDentro: true,
    situacion: critico.situacion,
    caraPilar,
  };
}
