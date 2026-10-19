/**
 * Lo que dicen los textos y los círculos de una planta de fundaciones.
 *
 * Los rótulos se reconocen por lo que dicen, no por la capa: en una planta
 * real los de cabezales estaban en "TEXT" y los de vigas en "FUNDACIONES".
 * Las medidas se dejan en las unidades del dibujo; la escala se aplica al
 * final, una sola vez.
 */

import type { EntidadDxf, LecturaDxf, Punto } from "@/lib/dxf/leer";

export interface RotuloCabezal {
  tipo: "cabezal";
  /** "CT9". */
  nombre: string;
  /**
   * Las tres medidas tal como están escritas: "CT9 (1800x800x750)". Las dos
   * primeras son la planta, pero no se sabe de antemano cuál va en qué
   * dirección: lo decide la geometría. La tercera es el canto.
   */
  medidas?: [number, number, number];
  posicion: Punto;
  texto: string;
}

export interface RotuloViga {
  tipo: "viga";
  /** "VR4", "VC1". */
  nombre: string;
  /** Ancho × alto, como en la planilla de vigas: "350x600". */
  anchoAlto?: [number, number];
  posicion: Punto;
  texto: string;
}

export type Rotulo = RotuloCabezal | RotuloViga;

export interface Pilote {
  centro: Punto;
  diametro: number;
}

// "CT9 (1800x800x750)" o "CT6" a secas (pilar que descarga en una viga sobre pilotes).
const CABEZAL = /^(CT\s*\d+[A-Z]?)\b(?:\s*\(\s*(\d+(?:[.,]\d+)?)\s*[xX×]\s*(\d+(?:[.,]\d+)?)\s*[xX×]\s*(\d+(?:[.,]\d+)?)\s*\))?/;
// "VR4\n350x600", "VC1 1000x600".
const VIGA = /^(V[CR]\s*\d+[A-Z]?)\b(?:\s*(\d+(?:[.,]\d+)?)\s*[xX×]\s*(\d+(?:[.,]\d+)?))?/;

const n = (s: string) => Number(s.replace(",", "."));

export function reconocerRotulo(texto: string, posicion: Punto): Rotulo | null {
  const t = texto.replace(/\s*\n\s*/g, " ").trim();
  const c = CABEZAL.exec(t);
  if (c) {
    return {
      tipo: "cabezal",
      nombre: c[1].replace(/\s+/g, ""),
      ...(c[2] ? { medidas: [n(c[2]), n(c[3]), n(c[4])] as [number, number, number] } : {}),
      posicion,
      texto: t,
    };
  }
  const v = VIGA.exec(t);
  if (v) {
    return {
      tipo: "viga",
      nombre: v[1].replace(/\s+/g, ""),
      ...(v[2] ? { anchoAlto: [n(v[2]), n(v[3])] as [number, number] } : {}),
      posicion,
      texto: t,
    };
  }
  return null;
}

export function rotulos(entidades: EntidadDxf[]): Rotulo[] {
  return entidades.flatMap((e) => {
    if (e.tipo !== "texto") return [];
    const r = reconocerRotulo(e.texto, e.posicion);
    return r ? [r] : [];
  });
}

/** Los círculos de una capa, como pilotes. */
export function pilotes(entidades: EntidadDxf[], capa: string): Pilote[] {
  return entidades.flatMap((e) =>
    e.tipo === "circulo" && e.capa === capa ? [{ centro: e.centro, diametro: 2 * e.radio }] : []
  );
}

/**
 * Metros por unidad del dibujo, deducidos de los pilotes, no de `$INSUNITS`:
 * una planta real declaraba metros y estaba en milímetros. Un pilote mide
 * entre 0,25 y 2 m de diámetro; si los círculos caen en ese rango leídos en
 * mm, cm o m, esa es la unidad. Sin pilotes no se puede saber: `null`.
 */
export function sugerirEscala(pil: Pilote[]): number | null {
  if (pil.length === 0) return null;
  const d = [...pil.map((p) => p.diametro)].sort((a, b) => a - b)[Math.floor(pil.length / 2)];
  for (const escala of [0.001, 0.01, 1]) {
    const m = d * escala;
    if (m >= 0.25 && m <= 2) return escala;
  }
  return null;
}

/** Capas que tienen círculos, de la que más a la que menos: la primera suele ser la de pilotes. */
export function capasConCirculos(lectura: LecturaDxf): { capa: string; circulos: number }[] {
  const cuenta = new Map<string, number>();
  for (const e of lectura.entidades) if (e.tipo === "circulo") cuenta.set(e.capa, (cuenta.get(e.capa) ?? 0) + 1);
  return [...cuenta].map(([capa, circulos]) => ({ capa, circulos })).sort((a, b) => b.circulos - a.circulos);
}
