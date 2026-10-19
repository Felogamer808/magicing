/**
 * Las vigas de fundación de una planta, reconstruidas a partir de lo dibujado.
 *
 * Como con los cabezales, no hay una figura por viga: el contorno corrido
 * dibuja los bordes de la superficie de fundación, y los dos bordes de una
 * misma viga suelen ser de polilíneas distintas. Para cada rótulo ("VR4
 * 350x600") se busca cerca un par de bordes paralelos separados por el ancho
 * del rótulo. La viga sigue mientras al menos uno de sus bordes esté
 * dibujado —así cruza la boca por donde le llega otra viga de costado— y se
 * corta en la cara de los cabezales: va de cara a cara, como se modela en
 * Revit (el `Span` de una viga exportada era su largo libre).
 *
 * Todo en unidades del dibujo; `escala` (m por unidad) sólo fija tolerancias.
 */

import type { Punto } from "@/lib/dxf/leer";
import type { Aviso, Cabezal, NodoSinMedidas } from "./cabezales";
import { aEjes, desdeEjes, largo, type Segmento } from "./geometria";
import type { Pilote, Rotulo, RotuloViga } from "./rotulos";

export interface Viga {
  nombre: string;
  /** Extremos del eje, de cara a cara de los cabezales donde termina. */
  inicio: Punto;
  fin: Punto;
  ancho: number;
  alto: number;
  /** Ancho como está dibujado, sólo si no coincide con el rótulo. Se usa el rótulo. */
  anchoDibujado?: number;
  rotulo: Punto;
}

export interface ResultadoVigas {
  vigas: Viga[];
  avisos: Aviso[];
}

interface Candidata {
  indiceRotulo: number;
  /** Dirección del eje, en grados. */
  angulo: number;
  /** Coordenada v de cada borde. */
  v1: number;
  v2: number;
  /** Intervalo en u donde los dos bordes del par se superponen. */
  desde: number;
  hasta: number;
  distancia: number;
  anchoDibujado: number;
}

const angulo180 = (s: Segmento) => {
  const g = (Math.atan2(s.b[1] - s.a[1], s.b[0] - s.a[0]) * 180) / Math.PI;
  return ((g % 180) + 180) % 180;
};
const difAngulo180 = (a: number, b: number) => {
  const d = Math.abs(a - b) % 180;
  return Math.min(d, 180 - d);
};

/** Intervalos en u de los tramos dibujados sobre la recta v = `v`, unidos donde se tocan. */
function tramosSobre(segs: Segmento[], angulo: number, v: number, tol: number): [number, number][] {
  const tramos: [number, number][] = [];
  for (const s of segs) {
    if (difAngulo180(angulo180(s), angulo) > 1) continue;
    const a = aEjes(s.a, angulo);
    const b = aEjes(s.b, angulo);
    if (Math.abs(a[1] - v) > tol || Math.abs(b[1] - v) > tol) continue;
    tramos.push([Math.min(a[0], b[0]), Math.max(a[0], b[0])]);
  }
  return unir(tramos, tol);
}

function unir(tramos: [number, number][], tol: number): [number, number][] {
  const orden = [...tramos].sort((x, y) => x[0] - y[0]);
  const salida: [number, number][] = [];
  for (const [lo, hi] of orden) {
    const ultimo = salida[salida.length - 1];
    if (ultimo && lo <= ultimo[1] + tol) ultimo[1] = Math.max(ultimo[1], hi);
    else salida.push([lo, hi]);
  }
  return salida;
}

function candidatasDe(
  indiceRotulo: number,
  rotulo: RotuloViga & { anchoAlto: [number, number] },
  segs: Segmento[],
  tolAncho: number,
  alcance: number,
  largoMinimo: number
): Candidata[] {
  const [ancho] = rotulo.anchoAlto;
  const p = rotulo.posicion;
  const cerca = segs.filter((s) => largo(s) >= largoMinimo && distancia(p, s) <= ancho + alcance);
  const salida: Candidata[] = [];
  for (let i = 0; i < cerca.length; i++) {
    for (let j = i + 1; j < cerca.length; j++) {
      const ang = angulo180(cerca[i]);
      if (difAngulo180(ang, angulo180(cerca[j])) > 1) continue;
      const a1 = aEjes(cerca[i].a, ang);
      const b1 = aEjes(cerca[i].b, ang);
      const a2 = aEjes(cerca[j].a, ang);
      const b2 = aEjes(cerca[j].b, ang);
      const v1 = (a1[1] + b1[1]) / 2;
      const v2 = (a2[1] + b2[1]) / 2;
      const anchoDibujado = Math.abs(v2 - v1);
      if (Math.abs(anchoDibujado - ancho) > tolAncho) continue;
      const desde = Math.max(Math.min(a1[0], b1[0]), Math.min(a2[0], b2[0]));
      const hasta = Math.min(Math.max(a1[0], b1[0]), Math.max(a2[0], b2[0]));
      if (hasta - desde < largoMinimo) continue;
      // Distancia del rótulo al tramo de eje donde los dos bordes se superponen.
      const q = aEjes(p, ang);
      const u = Math.max(desde, Math.min(hasta, q[0]));
      const d = Math.hypot(q[0] - u, q[1] - (v1 + v2) / 2);
      salida.push({ indiceRotulo, angulo: ang, v1: Math.min(v1, v2), v2: Math.max(v1, v2), desde, hasta, distancia: d, anchoDibujado });
    }
  }
  return salida;
}

function distancia(p: Punto, s: Segmento): number {
  const dx = s.b[0] - s.a[0];
  const dy = s.b[1] - s.a[1];
  const t = Math.max(0, Math.min(1, ((p[0] - s.a[0]) * dx + (p[1] - s.a[1]) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(p[0] - (s.a[0] + t * dx), p[1] - (s.a[1] + t * dy));
}

/** Dónde entra y sale el eje (recta v = `v` en ejes girados `angulo`) de un cabezal, en u. */
function cruceConCabezal(c: Cabezal, angulo: number, v: number): [number, number] | null {
  // Se recorta la recta contra el rectángulo con el método de las placas.
  const r = c.rect;
  const centro = aEjes(r.centro, r.angulo);
  const delta = ((angulo - r.angulo) * Math.PI) / 180;
  const dir: Punto = [Math.cos(delta), Math.sin(delta)];
  // Un punto de la recta (u = 0) escrito en los ejes del cabezal.
  const p0 = aEjes(desdeEjes([0, v], angulo), r.angulo);
  let lo = -Infinity;
  let hi = Infinity;
  for (const k of [0, 1] as const) {
    const medio = k === 0 ? r.largo / 2 : r.ancho / 2;
    const min = centro[k] - medio;
    const max = centro[k] + medio;
    if (Math.abs(dir[k]) < 1e-12) {
      if (p0[k] < min || p0[k] > max) return null;
      continue;
    }
    const t1 = (min - p0[k]) / dir[k];
    const t2 = (max - p0[k]) / dir[k];
    lo = Math.max(lo, Math.min(t1, t2));
    hi = Math.min(hi, Math.max(t1, t2));
  }
  return lo < hi ? [lo, hi] : null;
}

/**
 * Prolonga hasta el pilote de un nodo (CT6, CT7, CT8: pilar que descarga en
 * una viga sobre pilotes) las vigas que se quedan cortas.
 *
 * En esos nodos el contorno dibuja un ensanche que no es un cabezal con
 * medidas, y las vigas terminan antes: quedaba un hueco en el nodo y el
 * pilote sin nada encima. El nodo es parte de la viga (criterio del usuario:
 * "se termina armando como un cabezal"), así que la viga llega hasta el
 * pilote. Sólo si está alineada con él y le falta menos de 1 m.
 */
export function prolongarANodos(vigas: Viga[], nodos: NodoSinMedidas[], pil: Pilote[], escala: number): Viga[] {
  const maximo = 1 / escala;
  return vigas.map((v) => {
    const ang = (Math.atan2(v.fin[1] - v.inicio[1], v.fin[0] - v.inicio[0]) * 180) / Math.PI;
    const a = aEjes(v.inicio, ang);
    const b = aEjes(v.fin, ang);
    let u0 = a[0];
    let u1 = b[0];
    for (const n of nodos) {
      for (const k of n.pilotes) {
        const q = aEjes(pil[k].centro, ang);
        if (Math.abs(q[1] - a[1]) > v.ancho / 2) continue;
        if (q[0] < u0 && u0 - q[0] <= maximo) u0 = q[0];
        if (q[0] > u1 && q[0] - u1 <= maximo) u1 = q[0];
      }
    }
    if (u0 === a[0] && u1 === b[0]) return v;
    return { ...v, inicio: desdeEjes([u0, a[1]], ang), fin: desdeEjes([u1, b[1]], ang) };
  });
}

export function ubicarVigas(rot: Rotulo[], segs: Segmento[], cabezales: Cabezal[], escala: number): ResultadoVigas {
  const tol = 0.025 / escala;
  // Un rótulo de viga suele estar pegado a ella, pero en una conexión corta
  // entre cabezales se corre para no pisar otros textos: el VR18 de la planta
  // real quedó a 1,9 m de uno de sus bordes. Cada viga se la queda el rótulo
  // más cercano, así que buscar lejos no hace que un rótulo robe una ajena.
  const alcance = 2.5 / escala;
  const largoMinimo = 0.3 / escala;
  const conMedidas = rot.flatMap((r, i) =>
    r.tipo === "viga" && r.anchoAlto ? [{ i, r: r as RotuloViga & { anchoAlto: [number, number] } }] : []
  );
  const avisos: Aviso[] = [];
  for (const r of rot) {
    if (r.tipo === "viga" && !r.anchoAlto) avisos.push({ texto: `${r.nombre}: rótulo sin sección.`, posicion: r.posicion });
  }

  // Primero se buscan pares con el ancho del rótulo; a los que no encuentran,
  // se les permite un ancho distinto y se informa la diferencia.
  const asignada = new Map<number, Candidata>();
  const tomadas: Candidata[] = [];
  const solapa = (a: Candidata, b: Candidata) =>
    difAngulo180(a.angulo, b.angulo) < 1 &&
    Math.abs((a.v1 + a.v2) / 2 - (b.v1 + b.v2) / 2) < tol * 4 &&
    Math.min(a.hasta, b.hasta) > Math.max(a.desde, b.desde);
  for (const tolAncho of [tol * 1.2, 0.15 / escala]) {
    const candidatas = conMedidas
      .filter(({ i }) => !asignada.has(i))
      .flatMap(({ i, r }) => candidatasDe(i, r, segs, Math.max(tolAncho, r.anchoAlto[0] * (tolAncho > tol * 2 ? 0.35 : 0)), alcance, largoMinimo))
      .sort((x, y) => x.distancia - y.distancia);
    for (const c of candidatas) {
      if (asignada.has(c.indiceRotulo) || tomadas.some((t) => solapa(t, c))) continue;
      asignada.set(c.indiceRotulo, c);
      tomadas.push(c);
    }
  }

  const vigas: Viga[] = [];
  for (const { i, r } of conMedidas) {
    const c = asignada.get(i);
    if (!c) {
      avisos.push({ texto: `${r.nombre} (${r.anchoAlto[0]}x${r.anchoAlto[1]}): no se encontraron dos bordes paralelos cerca del rótulo.`, posicion: r.posicion });
      continue;
    }
    const vEje = (c.v1 + c.v2) / 2;

    // Largo: la viga sigue mientras al menos uno de sus bordes esté dibujado.
    const dibujado = unir([...tramosSobre(segs, c.angulo, c.v1, tol), ...tramosSobre(segs, c.angulo, c.v2, tol)], tol);
    const tramo = dibujado.find(([lo, hi]) => lo <= c.hasta && hi >= c.desde) ?? [c.desde, c.hasta];
    let [u0, u1] = tramo;

    // Extremos: la cara del cabezal donde entra el eje. Si el borde dibujado
    // se queda corto (cara girada, como un cabezal a 20°), se estira hasta ella.
    // En cada lado manda el cabezal más cercano al rótulo, recorte o estire.
    const uRotulo = Math.max(c.desde, Math.min(c.hasta, aEjes(r.posicion, c.angulo)[0]));
    const holgura = Math.max(r.anchoAlto[0], 1 / escala);
    let caraAntes = -Infinity;
    let caraDespues = Infinity;
    for (const cab of cabezales) {
      const x = cruceConCabezal(cab, c.angulo, vEje);
      if (!x) continue;
      if (x[1] <= uRotulo && x[1] >= u0 - holgura) caraAntes = Math.max(caraAntes, x[1]);
      if (x[0] >= uRotulo && x[0] <= u1 + holgura) caraDespues = Math.min(caraDespues, x[0]);
    }
    if (Number.isFinite(caraAntes)) u0 = caraAntes;
    if (Number.isFinite(caraDespues)) u1 = caraDespues;

    const anchoDistinto = Math.abs(c.anchoDibujado - r.anchoAlto[0]) > tol;
    vigas.push({
      nombre: r.nombre,
      inicio: desdeEjes([u0, vEje], c.angulo),
      fin: desdeEjes([u1, vEje], c.angulo),
      ancho: r.anchoAlto[0],
      alto: r.anchoAlto[1],
      rotulo: r.posicion,
      ...(anchoDistinto ? { anchoDibujado: c.anchoDibujado } : {}),
    });
    if (anchoDistinto) {
      avisos.push({
        texto: `${r.nombre}: dibujada de ${Math.round(c.anchoDibujado)} de ancho, el rótulo dice ${r.anchoAlto[0]}. Se usa el rótulo.`,
        posicion: desdeEjes([(u0 + u1) / 2, vEje], c.angulo),
      });
    }
  }
  return { vigas, avisos };
}
