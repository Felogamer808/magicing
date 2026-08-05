"use client";

import { useId } from "react";

interface ZapataCorridaDiagramaProps {
  AM: number;
  HM: number;
  anchoPilarM: number;
  dM: number;
  diametroPrincipalMm: number;
  separacionPrincipalM: number;
}

const fmtM = (n: number) => `${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`;

export function ZapataCorridaDiagrama({
  AM,
  HM,
  anchoPilarM,
  dM,
  diametroPrincipalMm,
  separacionPrincipalM,
}: ZapataCorridaDiagramaProps) {
  const arrowId = useId();

  if (!(AM > 0) || !(HM > 0)) return null;

  const MAX_W = 230;
  const MAX_H = 150;
  const PAD_LEFT = 46;
  const PAD_TOP = 34;
  const PAD_RIGHT = 20;
  const PAD_BOTTOM = 14;

  const escala = Math.min(MAX_W / AM, MAX_H / HM);
  const w = AM * escala;
  const h = HM * escala;

  const x0 = PAD_LEFT;
  const y0 = PAD_TOP;
  const x1 = x0 + w;
  const y1 = y0 + h;

  const viewW = x1 + PAD_RIGHT;
  const viewH = y1 + PAD_BOTTOM;

  const margen = Math.min(8, w * 0.05);
  const radio = Math.max(2.5, Math.min(6, diametroPrincipalMm * 0.3));
  const yBarras = y1 - margen - radio;

  const nBarras = separacionPrincipalM > 0 ? Math.max(2, Math.round(AM / separacionPrincipalM) + 1) : 2;
  const xsBarras = Array.from({ length: nBarras }, (_, i) => x0 + margen + radio + (i * (w - 2 * margen - 2 * radio)) / (nBarras - 1));

  const pilarW = Math.min(anchoPilarM * escala, w * 0.9);
  const pilarX0 = x0 + (w - pilarW) / 2;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox={`0 0 ${viewW} ${viewH}`} className="h-auto w-full max-w-xs text-primary" fill="none" aria-hidden="true">
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
        <text x={(x0 + x1) / 2} y={y0 - 18} textAnchor="middle" className="fill-current font-mono" fontSize="9">
          A = {fmtM(AM)}
        </text>

        {/* cota H */}
        <g stroke="currentColor" strokeWidth="1" opacity="0.75">
          <path d={`M${x0 - 16} ${y0} L${x0 - 4} ${y0}`} />
          <path d={`M${x0 - 16} ${y1} L${x0 - 4} ${y1}`} />
          <path d={`M${x0 - 10} ${y0} L${x0 - 10} ${y1}`} markerStart={`url(#${arrowId})`} markerEnd={`url(#${arrowId})`} />
        </g>
        <text
          x={PAD_LEFT - 22}
          y={(y0 + y1) / 2}
          textAnchor="middle"
          className="fill-current font-mono"
          fontSize="9"
          transform={`rotate(-90 ${PAD_LEFT - 22} ${(y0 + y1) / 2})`}
        >
          H = {fmtM(HM)}
        </text>

        {/* muro / pilar de referencia (se extiende hacia arriba, fuera de la zapata) */}
        <path d={`M${pilarX0} ${y0} L${pilarX0} ${y0 - 20} M${pilarX0 + pilarW} ${y0} L${pilarX0 + pilarW} ${y0 - 20}`} strokeDasharray="3 2" stroke="currentColor" strokeWidth="1.5" />

        {/* zapata en corte */}
        <rect x={x0} y={y0} width={w} height={h} stroke="currentColor" strokeWidth="2" fill="var(--color-muted)" fillOpacity="0.4" />

        {/* armadura principal */}
        {xsBarras.map((x, i) => (
          <circle key={i} cx={x} cy={yBarras} r={radio} fill="currentColor" />
        ))}
      </svg>

      <dl className="grid w-full max-w-xs grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs text-muted-foreground">
        <dt>Principal</dt>
        <dd className="text-right text-foreground">
          ⌀{diametroPrincipalMm} c/{fmtM(separacionPrincipalM)}
        </dd>
        <dt>Pilar / muro</dt>
        <dd className="text-right text-foreground">{fmtM(anchoPilarM)}</dd>
        <dt>d</dt>
        <dd className="text-right text-foreground">{fmtM(dM)}</dd>
      </dl>
    </div>
  );
}
