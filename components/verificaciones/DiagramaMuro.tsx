"use client";

import { fmt } from "@/lib/verificaciones/formato";

interface DiagramaMuroProps {
  anchoZapataM: number;
  cantoZapataM: number;
  alturaMuroM: number;
  espesorMuroM: number;
  alturaSueloActivoM: number;
}

/**
 * Sección del muro con el terreno del lado activo y el diagrama triangular de
 * empuje, que crece con la profundidad: es lo que explica que la resultante
 * quede en el tercio inferior y no a media altura.
 */
export function DiagramaMuro({
  anchoZapataM, cantoZapataM, alturaMuroM, espesorMuroM, alturaSueloActivoM,
}: DiagramaMuroProps) {
  const totalH = alturaMuroM + cantoZapataM;
  const escala = Math.min(200 / totalH, 150 / Math.max(anchoZapataM, 0.1));
  const zapW = anchoZapataM * escala;
  const zapH = cantoZapataM * escala;
  const muroW = espesorMuroM * escala;
  const muroH = alturaMuroM * escala;
  const x0 = 66;
  const yBase = 24 + muroH + zapH;

  const nFlechas = 4;
  const hSueloPx = Math.min(alturaSueloActivoM * escala, muroH + zapH);

  return (
    <svg viewBox={`0 0 ${x0 + zapW + 70} ${yBase + 34}`} className="h-auto w-full max-w-sm text-primary" fill="none" aria-hidden="true">
      {/* terreno del lado activo (derecha) */}
      <path d={`M${x0 + muroW} ${yBase - hSueloPx} L${x0 + zapW + 56} ${yBase - hSueloPx}`} stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
      {Array.from({ length: 10 }).map((_, i) => (
        <path key={i} d={`M${x0 + muroW + i * 12} ${yBase - hSueloPx} L${x0 + muroW + i * 12 - 5} ${yBase - hSueloPx - 6}`} stroke="currentColor" strokeWidth="0.9" opacity="0.4" />
      ))}

      {/* diagrama triangular de empuje */}
      {Array.from({ length: nFlechas }).map((_, i) => {
        const t = (i + 1) / (nFlechas + 1);
        const y = yBase - hSueloPx + t * hSueloPx;
        const len = 10 + 26 * t;
        return (
          <path key={i} d={`M${x0 + muroW + len} ${y} L${x0 + muroW + 3} ${y}`} stroke="currentColor" strokeWidth="1.1" markerEnd="url(#arrMuro)" opacity="0.8" />
        );
      })}
      <defs>
        <marker id="arrMuro" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
          <path d="M0 0 L5 3 L0 6 Z" fill="currentColor" />
        </marker>
      </defs>

      {/* alzado y zapata */}
      <rect x={x0} y={24} width={muroW} height={muroH} stroke="currentColor" strokeWidth="2" fill="var(--color-muted)" fillOpacity="0.45" />
      <rect x={x0} y={24 + muroH} width={zapW} height={zapH} stroke="currentColor" strokeWidth="2" fill="var(--color-muted)" fillOpacity="0.45" />

      {/* cota altura */}
      <g stroke="currentColor" strokeWidth="0.9" opacity="0.7">
        <path d={`M${x0 - 16} 24 L${x0 - 4} 24`} />
        <path d={`M${x0 - 16} ${yBase} L${x0 - 4} ${yBase}`} />
        <path d={`M${x0 - 10} 24 L${x0 - 10} ${yBase}`} />
      </g>
      <text x={x0 - 22} y={(24 + yBase) / 2} textAnchor="middle" className="fill-current font-mono" fontSize="8" transform={`rotate(-90 ${x0 - 22} ${(24 + yBase) / 2})`}>
        H = {fmt(totalH)} m
      </text>
      <text x={x0 + zapW / 2} y={yBase + 20} textAnchor="middle" className="fill-current font-mono" fontSize="8">
        A = {fmt(anchoZapataM)} m
      </text>
    </svg>
  );
}
