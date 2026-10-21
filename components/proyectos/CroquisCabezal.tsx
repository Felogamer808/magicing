"use client";

import type { Punto } from "@/lib/dxf/leer";
import { esquinas } from "@/lib/cad-revit/geometria";
import type { Cabezal } from "@/lib/cad-revit/cabezales";
import type { Pilote } from "@/lib/cad-revit/rotulos";

/** Lado del pilar que se dibuja si todavía no se cargó, m. */
const PILAR_POR_DEFECTO_M = 0.3;

/**
 * Dirección del lado A del pilar, en grados del dibujo: la línea que une los
 * pilotes (cabezal de 2) o el largo del cabezal (de 1). Es la misma dirección
 * que la verificación llama "lado en la dirección de los pilotes" o "x".
 */
export function direccionLadoA(c: Cabezal, pilotes: Pilote[]): number {
  if (c.pilotes.length === 2) {
    const [p, q] = c.pilotes.map((k) => pilotes[k].centro);
    return (Math.atan2(q[1] - p[1], q[0] - p[0]) * 180) / Math.PI;
  }
  return c.rect.angulo;
}

/**
 * El cabezal como está en la planta, con sus pilotes y el pilar en el centro.
 * Los lados del pilar llevan las letras A y B que se cargan al lado: así no
 * hay que adivinar qué medida va en qué dirección.
 */
export function CroquisCabezal({
  cabezal,
  pilotes,
  escala,
  ladoAM,
  ladoBM,
}: {
  cabezal: Cabezal;
  pilotes: Pilote[];
  /** Metros por unidad del dibujo. */
  escala: number;
  ladoAM?: number;
  ladoBM?: number;
}) {
  const r = cabezal.rect;
  const P = (p: Punto) => `${p[0]},${-p[1]}`;
  const esq = esquinas(r);
  const xs = esq.map((p) => p[0]);
  const ys = esq.map((p) => -p[1]);
  const lado = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  const margen = lado * 0.22;
  const vista = [Math.min(...xs) - margen, Math.min(...ys) - margen, Math.max(...xs) - Math.min(...xs) + 2 * margen, Math.max(...ys) - Math.min(...ys) + 2 * margen];

  // El pilar, centrado, con A en la dirección de los pilotes.
  const ang = (direccionLadoA(cabezal, pilotes) * Math.PI) / 180;
  const u: Punto = [Math.cos(ang), Math.sin(ang)];
  const v: Punto = [-u[1], u[0]];
  const a = (ladoAM ?? PILAR_POR_DEFECTO_M) / escala / 2;
  const b = (ladoBM ?? PILAR_POR_DEFECTO_M) / escala / 2;
  const c = r.centro;
  const punto = (s: number, t: number): Punto => [c[0] + u[0] * s + v[0] * t, c[1] + u[1] * s + v[1] * t];
  const pilar = [punto(-a, -b), punto(a, -b), punto(a, b), punto(-a, b)];
  // Las letras, afuera del pilar, frente al lado que nombran.
  const sep = lado * 0.07;
  const letraA = punto(0, -b - sep);
  const letraB = punto(a + sep, 0);
  const fuente = lado * 0.09;
  const trazo = lado / 250;

  return (
    <svg viewBox={vista.join(" ")} className="h-auto w-full max-w-[16rem]" role="img" aria-label={`Croquis de ${cabezal.nombre}`}>
      <polygon points={esq.map(P).join(" ")} className="fill-primary/10 stroke-primary" strokeWidth={trazo} />
      {cabezal.pilotes.map((k) => (
        <circle
          key={k}
          cx={pilotes[k].centro[0]}
          cy={-pilotes[k].centro[1]}
          r={pilotes[k].diametro / 2}
          className="fill-none stroke-muted-foreground"
          strokeWidth={trazo}
          strokeDasharray={`${trazo * 4} ${trazo * 3}`}
        />
      ))}
      <polygon points={pilar.map(P).join(" ")} className="fill-foreground/80 stroke-foreground" strokeWidth={trazo} />
      {/* Lado A resaltado y su letra; lado B ídem. */}
      <line x1={pilar[0][0]} y1={-pilar[0][1]} x2={pilar[1][0]} y2={-pilar[1][1]} className="stroke-primary" strokeWidth={trazo * 4} />
      <line x1={pilar[1][0]} y1={-pilar[1][1]} x2={pilar[2][0]} y2={-pilar[2][1]} className="stroke-exito" strokeWidth={trazo * 4} />
      <text x={letraA[0]} y={-letraA[1]} fontSize={fuente} textAnchor="middle" dominantBaseline="middle" className="fill-primary font-semibold">
        A
      </text>
      <text x={letraB[0]} y={-letraB[1]} fontSize={fuente} textAnchor="middle" dominantBaseline="middle" className="fill-exito font-semibold">
        B
      </text>
    </svg>
  );
}
