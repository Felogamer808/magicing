"use client";

interface ZapataCombinadaDiagramaProps {
  AM: number;
  HM: number;
  posicionCol1M: number;
  posicionCol2M: number;
}

const fmtM = (n: number) => `${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`;

export function ZapataCombinadaDiagrama({ AM, HM, posicionCol1M, posicionCol2M }: ZapataCombinadaDiagramaProps) {
  if (!(AM > 0) || !(HM > 0)) return null;

  const MAX_W = 260;
  const PAD_LEFT = 20;
  const PAD_TOP = 46;
  const PAD_RIGHT = 20;
  const PAD_BOTTOM = 20;

  const escala = MAX_W / AM;
  const w = AM * escala;
  const h = Math.max(HM * escala, 24);

  const x0 = PAD_LEFT;
  const y0 = PAD_TOP;
  const x1 = x0 + w;
  const y1 = y0 + h;
  const viewW = x1 + PAD_RIGHT;
  const viewH = y1 + PAD_BOTTOM;

  const xCol1 = x0 + posicionCol1M * escala;
  const xCol2 = x0 + posicionCol2M * escala;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox={`0 0 ${viewW} ${viewH}`} className="h-auto w-full text-primary" fill="none" aria-hidden="true">
        {/* momento cualitativo: sagging (+) bajo columnas, hogging (-) al medio */}
        <path
          d={`M${x0} ${y0 - 8} L${xCol1} ${y0 + 6} Q${(xCol1 + xCol2) / 2} ${y0 - 26} ${xCol2} ${y0 + 6} L${x1} ${y0 - 8}`}
          stroke="currentColor"
          strokeWidth="1.25"
          strokeDasharray="3 2"
          opacity="0.6"
        />

        {/* pilares */}
        <path d={`M${xCol1} ${y0 - 34} L${xCol1} ${y0}`} stroke="currentColor" strokeWidth="3" opacity="0.8" />
        <path d={`M${xCol2} ${y0 - 34} L${xCol2} ${y0}`} stroke="currentColor" strokeWidth="3" opacity="0.8" />

        {/* zapata */}
        <rect x={x0} y={y0} width={w} height={h} stroke="currentColor" strokeWidth="2" fill="var(--color-muted)" fillOpacity="0.4" />

        <text x={xCol1} y={y0 + h + 14} textAnchor="middle" className="fill-current font-mono" fontSize="9.5">
          {fmtM(posicionCol1M)}
        </text>
        <text x={xCol2} y={y0 + h + 14} textAnchor="middle" className="fill-current font-mono" fontSize="9.5">
          {fmtM(posicionCol2M)}
        </text>
      </svg>
      <p className="text-xs text-muted-foreground">A = {fmtM(AM)} · H = {fmtM(HM)}</p>
    </div>
  );
}
