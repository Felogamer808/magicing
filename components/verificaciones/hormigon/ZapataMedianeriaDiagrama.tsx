"use client";

import { useId } from "react";

interface ZapataMedianeriaDiagramaProps {
  AM: number;
  BM: number;
  anchoPilarAM: number;
  anchoPilarBM: number;
  distanciaColumnaLimiteM: number;
}

const fmtM = (n: number) => `${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`;

export function ZapataMedianeriaDiagrama({
  AM,
  BM,
  anchoPilarAM,
  anchoPilarBM,
  distanciaColumnaLimiteM,
}: ZapataMedianeriaDiagramaProps) {
  const arrowId = useId();

  if (!(AM > 0) || !(BM > 0)) return null;

  const MAX_W = 220;
  const MAX_H = 190;
  const PAD_LEFT = 30;
  const PAD_TOP = 34;
  const PAD_RIGHT = 40;
  const PAD_BOTTOM = 14;

  const escala = Math.min(MAX_W / AM, MAX_H / BM);
  const w = AM * escala;
  const h = BM * escala;

  const x0 = PAD_LEFT;
  const y0 = PAD_TOP;
  const x1 = x0 + w;
  const y1 = y0 + h;

  const viewW = x1 + PAD_RIGHT;
  const viewH = y1 + PAD_BOTTOM;

  const pilarWPx = Math.min(anchoPilarAM * escala, w * 0.9);
  const pilarHPx = Math.min(anchoPilarBM * escala, h * 0.9);
  const pilarX0 = x0 + distanciaColumnaLimiteM * escala;
  const pilarY0 = y0 + (h - pilarHPx) / 2;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox={`0 0 ${viewW} ${viewH}`} className="h-auto w-full text-primary" fill="none" aria-hidden="true">
        <defs>
          <marker id={arrowId} markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0 0 L6 3 L0 6 Z" fill="currentColor" />
          </marker>
        </defs>

        {/* cota A */}
        <g stroke="currentColor" strokeWidth="1" opacity="0.75">
          <path d={`M${x0} ${y0 - 16} L${x0} ${y0 - 4}`} />
          <path d={`M${x1} ${y0 - 16} L${x1} ${y0 - 4}`} />
          <path d={`M${x0} ${y0 - 10} L${x1} ${y0 - 10}`} markerStart={`url(#${arrowId})`} markerEnd={`url(#${arrowId})`} />
        </g>
        <text x={(x0 + x1) / 2} y={y0 - 18} textAnchor="middle" className="fill-current font-mono" fontSize="10.5">
          A = {fmtM(AM)}
        </text>

        {/* límite de propiedad: línea rayada a la izquierda */}
        <g stroke="currentColor" strokeWidth="2">
          <path d={`M${x0} ${y0 - 6} L${x0} ${y1 + 6}`} />
        </g>
        {Array.from({ length: 6 }).map((_, i) => (
          <path
            key={i}
            d={`M${x0 - 6} ${y0 - 4 + i * ((h + 8) / 5)} L${x0} ${y0 + 4 + i * ((h + 8) / 5)}`}
            stroke="currentColor"
            strokeWidth="1"
            opacity="0.6"
          />
        ))}
        <text x={x0} y={y0 - 20} textAnchor="middle" className="fill-current font-mono" fontSize="8.5" opacity="0.8">
          límite
        </text>

        {/* zapata en planta */}
        <rect x={x0} y={y0} width={w} height={h} stroke="currentColor" strokeWidth="2" fill="var(--color-muted)" fillOpacity="0.4" />

        {/* pilar, desplazado hacia el límite */}
        <rect x={pilarX0} y={pilarY0} width={pilarWPx} height={pilarHPx} stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" fill="none" />
      </svg>

      <dl className="grid w-full max-w-xs grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs text-muted-foreground">
        <dt>Separación al límite</dt>
        <dd className="text-right text-foreground">{fmtM(distanciaColumnaLimiteM)}</dd>
        <dt>Pilar</dt>
        <dd className="text-right text-foreground">
          {fmtM(anchoPilarAM)} × {fmtM(anchoPilarBM)}
        </dd>
      </dl>
    </div>
  );
}
