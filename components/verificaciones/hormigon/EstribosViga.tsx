"use client";

import { CapaMaterial } from "@/components/verificaciones/croquis/Primitivas";
import { CotaH } from "@/components/verificaciones/croquis/Croquis";
import { fmt } from "@/lib/verificaciones/formato";

/**
 * Dos vistas, a propósito separadas, porque mezcladas en un solo dibujo se
 * confunden los dos datos que más se malinterpretan:
 *
 *  - Las **ramas** son las patas verticales que cortan la sección en un mismo
 *    plano. Se ven en la vista transversal.
 *  - La **separación** es la distancia entre un estribo y el siguiente a lo
 *    largo de la viga. Se ve en la vista longitudinal.
 */

interface EstriboTransversalProps {
  ramas: number;
  diametroMm: number;
  resaltado?: boolean;
}

/** Vista transversal: la sección cortada con las ramas que la cruzan. Esquemática, no a escala. */
export function EstriboTransversal({ ramas, diametroMm, resaltado = false }: EstriboTransversalProps) {
  const nReal = Math.max(0, Math.round(ramas) || 0);
  // El dibujo satura en 10 ramas; el rótulo dice siempre la cantidad real.
  const n = Math.max(1, Math.min(nReal || 1, 10));
  const x0 = 50;
  const x1 = 150;
  const y0 = 20;
  const y1 = 130;
  const r = 7;
  const xs = Array.from({ length: n }, (_, i) => (n === 1 ? (x0 + x1) / 2 : x0 + r + (i * (x1 - x0 - 2 * r)) / (n - 1)));
  const trazo = resaltado ? 2.6 : 1.8;

  return (
    <svg
      viewBox="0 0 200 165"
      className="h-auto w-full max-w-[13rem] text-primary"
      fill="none"
      role="img"
      aria-label={`Vista transversal: ${nReal} ramas de estribo Ø${fmt(diametroMm, 0)} cortan la sección.`}
    >
      <CapaMaterial x={x0} y={y0} ancho={x1 - x0} alto={y1 - y0} material="hormigon" />
      {/* Barras longitudinales, sólo como contexto */}
      {[x0 + r + 3, x1 - r - 3].flatMap((x) => [y0 + r + 3, y1 - r - 3].map((y) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={3} fill="var(--mat-armadura)" opacity="0.45" />
      )))}
      {xs.map((x, i) => (
        <path key={i} d={`M${x} ${y0 + r} L${x} ${y1 - r}`} stroke="var(--mat-armadura)" strokeWidth={trazo} />
      ))}
      {/* Cortante en el plano de la sección */}
      <g stroke="currentColor" strokeWidth="1.3">
        <path d={`M${x1 + 22} ${y0 + 30} L${x1 + 22} ${y1 - 30}`} />
        <path d={`M${x1 + 18} ${y1 - 36} L${x1 + 22} ${y1 - 30} L${x1 + 26} ${y1 - 36}`} />
      </g>
      <text x={x1 + 22} y={y0 + 24} textAnchor="middle" className="fill-current font-mono" fontSize="10">
        Vd
      </text>
      <text x={(x0 + x1) / 2} y={152} textAnchor="middle" className="fill-current font-mono" fontSize="11" fontWeight={resaltado ? 700 : 400}>
        {nReal} {nReal === 1 ? "rama" : "ramas"} Ø{fmt(diametroMm, 0)}
      </text>
    </svg>
  );
}

interface EstriboLongitudinalProps {
  /** Separación adoptada por el cálculo (m). Es un resultado, no un dato. */
  separacionM: number;
  diametroMm: number;
}

/** Vista longitudinal: estribos repartidos a lo largo de la viga con su separación. */
export function EstriboLongitudinal({ separacionM, diametroMm }: EstriboLongitudinalProps) {
  const x0 = 16;
  const x1 = 344;
  const y0 = 22;
  const y1 = 70;
  const paso = 46;
  const xs = Array.from({ length: Math.floor((x1 - x0 - 20) / paso) + 1 }, (_, i) => x0 + 14 + i * paso);

  return (
    <svg
      viewBox="0 0 360 110"
      className="h-auto w-full max-w-[24rem] text-primary"
      fill="none"
      role="img"
      aria-label={`Vista longitudinal: estribos Ø${fmt(diametroMm, 0)} cada ${fmt(separacionM * 100, 0)} cm.`}
    >
      <CapaMaterial x={x0} y={y0} ancho={x1 - x0} alto={y1 - y0} material="hormigon" />
      <path d={`M${x0} ${y0 + 6} L${x1} ${y0 + 6} M${x0} ${y1 - 6} L${x1} ${y1 - 6}`} stroke="var(--mat-armadura)" strokeWidth="1.2" opacity="0.45" />
      {xs.map((x) => (
        <path key={x} d={`M${x} ${y0 + 3} L${x} ${y1 - 3}`} stroke="var(--mat-armadura)" strokeWidth="1.8" />
      ))}
      <CotaH x0={xs[1]} x1={xs[2]} y={y1 + 18} texto={`s = ${fmt(separacionM * 100, 0)} cm`} />
    </svg>
  );
}
