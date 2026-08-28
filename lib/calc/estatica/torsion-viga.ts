/**
 * Diagrama de momento torsor Mt(x) para una viga isostática en torsión, en
 * dos condiciones de apoyo posibles:
 *
 * - "empotrada-libre": empotrada torsionalmente en x=0 y libre de girar en
 *   x=L (misma convención que los voladizos de `casos-viga.ts`). El torsor en
 *   cualquier corte es la suma de todo el par aplicado entre ese corte y el
 *   extremo libre.
 * - "apoyada-simetrica": restringida al giro en los dos extremos, pero sólo
 *   para cargas simétricas respecto del centro (par puntual en el medio, o
 *   carga excéntrica repartida en todo el tramo). Con dos apoyos hay dos
 *   reacciones y una sola ecuación de equilibrio —el caso general es
 *   indeterminado, hace falta la rigidez GJ de la pieza—, pero la simetría lo
 *   resuelve sola: cada apoyo toma la mitad del total, sin más dato que la
 *   carga.
 *
 * En ningún caso hace falta resolver por rigidez, a diferencia de la flexión:
 * por eso no se reutiliza el solver de `viga-continua.ts`, sino que se
 * integra la estática a mano.
 */

export interface CargaTorsionPuntual {
  tipo: "puntual";
  xM: number;
  torsorKNm: number;
}

export interface CargaTorsionRepartida {
  tipo: "repartida";
  desdeM: number;
  hastaM: number;
  torsorPorMetroKNmM: number;
}

export type CargaTorsion = CargaTorsionPuntual | CargaTorsionRepartida;

export type CondicionApoyoTorsion = "empotrada-libre" | "apoyada-simetrica";

export interface EntradaTorsion {
  largoM: number;
  cargas: CargaTorsion[];
}

export interface PuntoTorsion {
  xM: number;
  torsorKNm: number;
}

export interface ExtremoTorsion {
  xM: number;
  valor: number;
}

export interface ResultadoTorsion {
  puntos: PuntoTorsion[];
  torsorMax: ExtremoTorsion;
  /**
   * Reacción de torsor a anclar: en "empotrada-libre" es la del único
   * empotramiento (x=0); en "apoyada-simetrica" es la que toma cada uno de
   * los dos apoyos, con signo opuesto entre ellos.
   */
  reaccionApoyoKNm: number;
}

/** Torsor tomando sólo lo aplicado estrictamente después de x. */
function torsorDerecha(x: number, cargas: readonly CargaTorsion[]): number {
  let t = 0;
  for (const c of cargas) {
    if (c.tipo === "puntual") {
      if (c.xM > x + 1e-9) t += c.torsorKNm;
    } else {
      const a = Math.max(x, c.desdeM);
      const b = c.hastaM;
      if (b > a) t += c.torsorPorMetroKNmM * (b - a);
    }
  }
  return t;
}

/** Torsor incluyendo lo aplicado justo en x: el valor "antes" del corte. */
function torsorIzquierda(x: number, cargas: readonly CargaTorsion[]): number {
  const puntualEnX = cargas
    .filter((c): c is CargaTorsionPuntual => c.tipo === "puntual" && Math.abs(c.xM - x) < 1e-9)
    .reduce((s, c) => s + c.torsorKNm, 0);
  return torsorDerecha(x, cargas) + puntualEnX;
}

function totalAplicado(cargas: readonly CargaTorsion[]): number {
  return cargas.reduce(
    (s, c) => s + (c.tipo === "puntual" ? c.torsorKNm : c.torsorPorMetroKNmM * (c.hastaM - c.desdeM)),
    0
  );
}

export function calcularTorsionViga(
  entrada: EntradaTorsion,
  condicion: CondicionApoyoTorsion = "empotrada-libre"
): ResultadoTorsion {
  const { largoM, cargas } = entrada;

  /*
   * Con "empotrada-libre" la reacción del único apoyo iguala todo lo
   * aplicado, así que T(L)=0 y esto no cambia nada respecto de antes. Con
   * "apoyada-simetrica" cada apoyo toma la mitad: restar esa reacción a la
   * misma cuenta de siempre da el torsor medido desde el apoyo izquierdo.
   */
  const reaccionApoyoKNm = condicion === "apoyada-simetrica" ? totalAplicado(cargas) / 2 : torsorDerecha(0, cargas);

  const breakpoints = [
    ...new Set<number>([0, largoM, ...cargas.flatMap((c) => (c.tipo === "puntual" ? [c.xM] : [c.desdeM, c.hastaM]))]),
  ]
    .filter((x) => x >= 0 && x <= largoM)
    .sort((a, b) => a - b);

  const desplazamiento = condicion === "apoyada-simetrica" ? reaccionApoyoKNm : 0;

  const puntos: PuntoTorsion[] = [];
  breakpoints.forEach((x, i) => {
    const esInicio = i === 0;
    const esFinal = i === breakpoints.length - 1;
    if (!esInicio) puntos.push({ xM: x, torsorKNm: torsorIzquierda(x, cargas) - desplazamiento });
    if (!esFinal) puntos.push({ xM: x, torsorKNm: torsorDerecha(x, cargas) - desplazamiento });
  });

  let torsorMax: ExtremoTorsion = { xM: 0, valor: 0 };
  for (const p of puntos) {
    if (Math.abs(p.torsorKNm) > Math.abs(torsorMax.valor)) torsorMax = { xM: p.xM, valor: p.torsorKNm };
  }

  return { puntos, torsorMax, reaccionApoyoKNm };
}
