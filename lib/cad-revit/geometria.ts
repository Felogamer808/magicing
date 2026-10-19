/**
 * Geometría plana mínima para leer una planta: segmentos, rectángulos girados
 * y cuánto de un borde está efectivamente dibujado.
 */

import type { EntidadDxf, Punto } from "@/lib/dxf/leer";

export interface Segmento {
  a: Punto;
  b: Punto;
}

/** Los tramos rectos de las líneas y polilíneas de una capa. Los tramos en arco se toman por su cuerda. */
export function segmentos(entidades: EntidadDxf[], capa: string): Segmento[] {
  const salida: Segmento[] = [];
  for (const e of entidades) {
    if (e.capa !== capa) continue;
    if (e.tipo === "linea") salida.push({ a: e.a, b: e.b });
    if (e.tipo === "polilinea") {
      const p = e.puntos;
      for (let i = 1; i < p.length; i++) salida.push({ a: p[i - 1], b: p[i] });
      if (e.cerrada) salida.push({ a: p[p.length - 1], b: p[0] });
    }
  }
  return salida.filter((s) => largo(s) > 0);
}

export const largo = (s: Segmento) => Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]);

/** Ángulo de un segmento en grados, llevado a [0, 90): un rectángulo no cambia al girarlo 90°. */
export function anguloModulo90(s: Segmento): number {
  const g = (Math.atan2(s.b[1] - s.a[1], s.b[0] - s.a[0]) * 180) / Math.PI;
  return ((g % 90) + 90) % 90;
}

/** Diferencia entre dos ángulos módulo 90, en [0, 45]. */
export function difAngulo90(a: number, b: number): number {
  const d = Math.abs(a - b) % 90;
  return Math.min(d, 90 - d);
}

/** Coordenadas de un punto en los ejes girados (u a `grados`, v a 90° de u). */
export function aEjes(p: Punto, grados: number): Punto {
  const r = (grados * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [p[0] * c + p[1] * s, -p[0] * s + p[1] * c];
}

export function desdeEjes(q: Punto, grados: number): Punto {
  const r = (grados * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [q[0] * c - q[1] * s, q[0] * s + q[1] * c];
}

/** Rectángulo girado: centro, ángulo de su lado "largo" y medidas por eje. */
export interface Rectangulo {
  centro: Punto;
  /** Grados del eje u respecto de X. */
  angulo: number;
  /** Medida a lo largo de u. */
  largo: number;
  /** Medida a lo largo de v. */
  ancho: number;
}

export function esquinas(r: Rectangulo): Punto[] {
  const c = aEjes(r.centro, r.angulo);
  const hu = r.largo / 2;
  const hv = r.ancho / 2;
  return [
    [c[0] - hu, c[1] - hv],
    [c[0] + hu, c[1] - hv],
    [c[0] + hu, c[1] + hv],
    [c[0] - hu, c[1] + hv],
  ].map((q) => desdeEjes(q as Punto, r.angulo));
}

export function contiene(r: Rectangulo, p: Punto, margen = 0): boolean {
  const c = aEjes(r.centro, r.angulo);
  const q = aEjes(p, r.angulo);
  return Math.abs(q[0] - c[0]) <= r.largo / 2 - margen && Math.abs(q[1] - c[1]) <= r.ancho / 2 - margen;
}

/**
 * Qué fracción del perímetro del rectángulo cae sobre segmentos dibujados
 * (paralelos y a menos de `tol`). Es la medida de "esto está en el plano":
 * un cabezal bien encontrado tiene casi todo su borde dibujado, salvo donde
 * llegan las vigas.
 */
export function coberturaDelBorde(r: Rectangulo, segs: Segmento[], tol: number): number {
  const total = bordesDe(r).reduce((s, b) => s + b.cubiertoCon(segs, tol, 0) * (b.hasta - b.desde), 0);
  return total / (2 * (r.largo + r.ancho));
}

/**
 * Los cuatro bordes del rectángulo en sus ejes: abajo y arriba corren por u,
 * izquierda y derecha por v. `cubiertoCon` dice qué fracción de un borde
 * —corrido `desplazamiento` hacia afuera— está dibujada.
 */
export function bordesDe(r: Rectangulo) {
  const c = aEjes(r.centro, r.angulo);
  const hu = r.largo / 2;
  const hv = r.ancho / 2;
  const borde = (corre: 0 | 1, fija: number, afuera: 1 | -1, desde: number, hasta: number) => ({
    corre,
    fija,
    afuera,
    desde,
    hasta,
    cubiertoCon(segs: Segmento[], tol: number, desplazamiento: number): number {
      const linea = fija + afuera * desplazamiento;
      const otro = 1 - corre;
      const tramos: [number, number][] = [];
      for (const s of segs) {
        const a = aEjes(s.a, r.angulo);
        const b = aEjes(s.b, r.angulo);
        if (Math.abs(a[otro] - linea) > tol || Math.abs(b[otro] - linea) > tol) continue;
        const lo = Math.max(Math.min(a[corre], b[corre]), desde);
        const hi = Math.min(Math.max(a[corre], b[corre]), hasta);
        if (hi > lo) tramos.push([lo, hi]);
      }
      tramos.sort((x, y) => x[0] - y[0]);
      let cubierto = 0;
      let fin = -Infinity;
      for (const [lo, hi] of tramos) {
        const d = Math.max(lo, fin);
        if (hi > d) cubierto += hi - d;
        fin = Math.max(fin, hi);
      }
      return cubierto / (hasta - desde);
    },
  });
  return [
    borde(0, c[1] - hv, -1, c[0] - hu, c[0] + hu),
    borde(0, c[1] + hv, 1, c[0] - hu, c[0] + hu),
    borde(1, c[0] - hu, -1, c[1] - hv, c[1] + hv),
    borde(1, c[0] + hu, 1, c[1] - hv, c[1] + hv),
  ];
}
