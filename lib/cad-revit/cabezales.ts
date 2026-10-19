/**
 * Los cabezales de una planta de fundaciones, reconstruidos a partir de lo
 * dibujado.
 *
 * En la planta no hay un rectángulo por cabezal: hay un contorno corrido que
 * da la vuelta a vigas y cabezales juntos, y el cabezal es un "abultamiento"
 * de ese contorno. Lo que sí hay es su rótulo con las medidas
 * ("CT9 (1800x800x750)") y sus pilotes. Se busca en el contorno un par de
 * bordes paralelos separados por cada medida de planta del rótulo, que
 * encierren pilotes; entre todos los rectángulos posibles gana el que tiene
 * más borde efectivamente dibujado. Esa fracción queda como control.
 *
 * Todo en unidades del dibujo; `escala` (m por unidad) sólo fija tolerancias.
 */

import type { Punto } from "@/lib/dxf/leer";
import {
  aEjes,
  anguloModulo90,
  bordesDe,
  coberturaDelBorde,
  contiene,
  desdeEjes,
  difAngulo90,
  largo,
  type Rectangulo,
  type Segmento,
} from "./geometria";
import type { Pilote, Rotulo, RotuloCabezal } from "./rotulos";

export interface Cabezal {
  nombre: string;
  rect: Rectangulo;
  canto: number;
  /** Las medidas en el orden del rótulo: "CT5 (1100x800x750)" → [1100, 800, 750]. */
  medidas: [number, number, number];
  /** Índices en la lista de pilotes. */
  pilotes: number[];
  /** Fracción del perímetro que coincide con el contorno dibujado (0 a 1). */
  cobertura: number;
  /** "contorno": salió de los bordes dibujados. "pilotes": no encajó y se centró en sus pilotes. */
  origen: "contorno" | "pilotes";
  rotulo: Punto;
  /**
   * Medidas de planta como están dibujadas (largo, ancho), sólo si no
   * coinciden con el rótulo. El cabezal se coloca con las del rótulo: lo
   * dibujado puede ser impreciso, y la diferencia se informa.
   */
  dibujado?: [number, number];
}

/**
 * Un rótulo de cabezal sin medidas (CT6, CT7, CT8 en la planta real): un
 * pilar que descarga en una viga sobre pilotes. No tiene sólido propio: es
 * parte de la viga, y se marca para que exista como elemento.
 */
export interface NodoSinMedidas {
  nombre: string;
  rotulo: Punto;
  pilotes: number[];
}

export interface Aviso {
  /** Qué pasa, para mostrar tal cual. */
  texto: string;
  posicion: Punto;
}

export interface ResultadoCabezales {
  cabezales: Cabezal[];
  nodos: NodoSinMedidas[];
  /** Pilotes que no quedaron en ningún cabezal ni nodo, por índice. */
  pilotesSueltos: number[];
  avisos: Aviso[];
}

/** Coberturas por debajo de esto no cuentan como "está en el contorno". */
const COBERTURA_MINIMA = 0.35;

interface Candidato {
  indiceRotulo: number;
  rect: Rectangulo;
  pilotes: number[];
  cobertura: number;
  distancia: number;
}

const dist = (a: Punto, b: Punto) => Math.hypot(a[0] - b[0], a[1] - b[1]);

function distanciaASegmento(p: Punto, s: Segmento): number {
  const dx = s.b[0] - s.a[0];
  const dy = s.b[1] - s.a[1];
  const t = Math.max(0, Math.min(1, ((p[0] - s.a[0]) * dx + (p[1] - s.a[1]) * dy) / (dx * dx + dy * dy)));
  return dist(p, [s.a[0] + t * dx, s.a[1] + t * dy]);
}

/** Valores distintos, juntando los que difieren en menos de `tol`. */
function distintos(valores: number[], tol: number): number[] {
  const orden = [...valores].sort((a, b) => a - b);
  const salida: number[] = [];
  for (const v of orden) if (!salida.length || v - salida[salida.length - 1] > tol) salida.push(v);
  return salida;
}

function candidatosDe(
  indiceRotulo: number,
  rotulo: RotuloCabezal & { medidas: [number, number, number] },
  pil: Pilote[],
  segs: Segmento[],
  tol: number,
  alcance: number
): Candidato[] {
  const [a, b] = rotulo.medidas;
  const radio = Math.max(a, b) + alcance;
  const cerca = segs.filter((s) => distanciaASegmento(rotulo.posicion, s) <= radio);
  // Los ángulos, de los tramos con largo como para definir una dirección; los
  // bordes, de todos: donde entra una viga al cabezal quedan trocitos de
  // pocos centímetros que igual marcan dónde está su cara.
  const angulos = distintos(cerca.filter((s) => largo(s) > 4 * tol).map(anguloModulo90), 0.5);
  const salida: Candidato[] = [];

  for (const ang of angulos) {
    const paraleloU = cerca.filter((s) => difAngulo90(anguloModulo90(s), ang) < 0.5);
    // Los paralelos a u fijan una v y los paralelos a v fijan una u.
    const vs: number[] = [];
    const us: number[] = [];
    for (const s of paraleloU) {
      const p = aEjes(s.a, ang);
      const q = aEjes(s.b, ang);
      if (Math.abs(p[1] - q[1]) < tol) vs.push((p[1] + q[1]) / 2);
      else if (Math.abs(p[0] - q[0]) < tol) us.push((p[0] + q[0]) / 2);
    }
    const valoresV = distintos(vs, tol);
    const valoresU = distintos(us, tol);
    // Un borde puede no estar dibujado (ahí entra una viga): además de los
    // pares dibujados, cada borde propone su opuesto a la distancia del
    // rótulo. Decide la cobertura del perímetro.
    const pares = (valores: number[], medida: number) => {
      const r: [number, number][] = [];
      for (const x of valores) r.push([x, x + medida], [x - medida, x]);
      return r.filter(([p, q], k) => r.findIndex(([p2, q2]) => Math.abs(p - p2) < tol && Math.abs(q - q2) < tol) === k);
    };
    const orientaciones: [number, number][] = a === b ? [[a, b]] : [[a, b], [b, a]];
    for (const [medU, medV] of orientaciones) {
      for (const [u1, u2] of pares(valoresU, medU)) {
        for (const [v1, v2] of pares(valoresV, medV)) {
          const rect: Rectangulo = { centro: desdeEjes([(u1 + u2) / 2, (v1 + v2) / 2], ang), angulo: ang, largo: medU, ancho: medV };
          const adentro = pil.flatMap((p, i) => (contiene(rect, p.centro, p.diametro / 4) ? [i] : []));
          if (adentro.length === 0) continue;
          const distancia = dist(rect.centro, rotulo.posicion);
          if (distancia > radio) continue;
          const cobertura = coberturaDelBorde(rect, cerca, tol);
          if (cobertura >= COBERTURA_MINIMA) salida.push({ indiceRotulo, rect, pilotes: adentro, cobertura, distancia });
        }
      }
    }
  }
  return salida;
}

/**
 * Las medidas como están dibujadas, si no son las del rectángulo.
 *
 * Un borde sin dibujar puede ser una entrada de viga (normal) o un borde
 * dibujado unos centímetros más allá (diferencia). Se distingue buscando un
 * tramo paralelo hasta `tolAmplia` de distancia que cubra al menos un tercio
 * del borde: si está, ese es el borde dibujado.
 */
function medirDibujado(rect: Rectangulo, segs: Segmento[], tol: number, tolAmplia: number): [number, number] | undefined {
  const corrimientos = bordesDe(rect).map((borde) => {
    if (borde.cubiertoCon(segs, tol, 0) >= 0.1) return 0;
    let mejor = { d: 0, cubierto: 0 };
    for (const s of segs) {
      for (const p of [s.a, s.b]) {
        const d = (aEjes(p, rect.angulo)[1 - borde.corre] - borde.fija) * borde.afuera;
        if (Math.abs(d) <= tol || Math.abs(d) > tolAmplia) continue;
        const cubierto = borde.cubiertoCon(segs, tol, d);
        if (cubierto > mejor.cubierto) mejor = { d, cubierto };
      }
    }
    return mejor.cubierto >= 1 / 3 ? mejor.d : 0;
  });
  if (corrimientos.every((d) => d === 0)) return undefined;
  const [abajo, arriba, izquierda, derecha] = corrimientos;
  return [rect.largo + izquierda + derecha, rect.ancho + abajo + arriba];
}

export function ubicarCabezales(rot: Rotulo[], pil: Pilote[], segs: Segmento[], escala: number): ResultadoCabezales {
  const tol = 0.025 / escala;
  const alcance = 3 / escala; // un rótulo puede estar hasta unos 3 m de su cabezal
  const conMedidas = rot.flatMap((r, i) =>
    r.tipo === "cabezal" && r.medidas ? [{ i, r: r as RotuloCabezal & { medidas: [number, number, number] } }] : []
  );

  // Todos los candidatos de todos los rótulos, del que mejor encaja al peor.
  // Así, si dos CT9 iguales compiten por el mismo cabezal, se lo queda el que
  // mejor coincide y el otro toma el siguiente.
  const candidatos = conMedidas
    .flatMap(({ i, r }) => candidatosDe(i, r, pil, segs, tol, alcance))
    .sort((x, y) => y.cobertura - x.cobertura || x.distancia - y.distancia);

  const asignado = new Map<number, Candidato>();
  const pilotesUsados = new Set<number>();
  for (const c of candidatos) {
    if (asignado.has(c.indiceRotulo)) continue;
    if (c.pilotes.some((p) => pilotesUsados.has(p))) continue;
    asignado.set(c.indiceRotulo, c);
    c.pilotes.forEach((p) => pilotesUsados.add(p));
  }

  const cabezales: Cabezal[] = [];
  const avisos: Aviso[] = [];
  for (const { i, r } of conMedidas) {
    const c = asignado.get(i);
    if (c) {
      const dibujado = medirDibujado(c.rect, segs, tol, 0.15 / escala);
      cabezales.push({
        nombre: r.nombre,
        rect: c.rect,
        canto: r.medidas[2],
        medidas: r.medidas,
        pilotes: c.pilotes,
        cobertura: c.cobertura,
        origen: "contorno",
        rotulo: r.posicion,
        ...(dibujado ? { dibujado } : {}),
      });
      if (dibujado) {
        const f = (x: number) => Math.round(x);
        avisos.push({
          texto: `${r.nombre}: dibujado ${f(dibujado[0])}x${f(dibujado[1])}, el rótulo dice ${f(c.rect.largo)}x${f(c.rect.ancho)}. Se usa el rótulo.`,
          // Sobre la pieza, no sobre su rótulo: lo que hay que mirar es el cabezal.
          posicion: c.rect.centro,
        });
      }
      continue;
    }
    // No encajó en el contorno: se centra en el pilote libre más cercano, sin girar, y se avisa.
    const libre = pil.map((p, k) => ({ k, d: dist(p.centro, r.posicion) })).filter(({ k }) => !pilotesUsados.has(k)).sort((x, y) => x.d - y.d)[0];
    if (!libre || libre.d > Math.max(r.medidas[0], r.medidas[1]) + alcance) {
      avisos.push({ texto: `${r.nombre}: no se encontraron pilotes cerca del rótulo.`, posicion: r.posicion });
      continue;
    }
    pilotesUsados.add(libre.k);
    const rect: Rectangulo = { centro: pil[libre.k].centro, angulo: 0, largo: r.medidas[0], ancho: r.medidas[1] };
    cabezales.push({ nombre: r.nombre, rect, canto: r.medidas[2], medidas: r.medidas, pilotes: [libre.k], cobertura: coberturaDelBorde(rect, segs, tol), origen: "pilotes", rotulo: r.posicion });
    avisos.push({
      texto: `${r.nombre} (${r.medidas[0]}x${r.medidas[1]}): no coincide con ningún borde dibujado; se ubicó sobre el pilote más cercano. Revisar medidas o posición.`,
      posicion: r.posicion,
    });
  }

  // Rótulos sin medidas: pilar sobre viga. Se les asigna el pilote libre más cercano.
  const nodos: NodoSinMedidas[] = [];
  for (const r of rot) {
    if (r.tipo !== "cabezal" || r.medidas) continue;
    const libre = pil.map((p, k) => ({ k, d: dist(p.centro, r.posicion) })).filter(({ k }) => !pilotesUsados.has(k)).sort((x, y) => x.d - y.d)[0];
    if (libre && libre.d <= alcance) {
      pilotesUsados.add(libre.k);
      nodos.push({ nombre: r.nombre, rotulo: r.posicion, pilotes: [libre.k] });
    } else {
      nodos.push({ nombre: r.nombre, rotulo: r.posicion, pilotes: [] });
      avisos.push({ texto: `${r.nombre}: rótulo sin medidas y sin pilote cerca.`, posicion: r.posicion });
    }
  }

  const pilotesSueltos = pil.flatMap((_, k) => (pilotesUsados.has(k) ? [] : [k]));
  for (const k of pilotesSueltos) avisos.push({ texto: `Pilote Ø${Math.round(pil[k].diametro)} sin cabezal ni rótulo.`, posicion: pil[k].centro });

  return { cabezales, nodos, pilotesSueltos, avisos };
}
