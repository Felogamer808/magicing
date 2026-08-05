"use client";

interface PiloteDiagramaProps {
  diametroM: number;
  longitudM: number;
  numeroBarras: number;
  diametroBarraMm: number;
}

const fmtM = (n: number) => `${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`;

export function PiloteDiagrama({ diametroM, longitudM, numeroBarras, diametroBarraMm }: PiloteDiagramaProps) {
  if (!(diametroM > 0) || !(longitudM > 0)) return null;

  const MAX_H = 220;
  const PAD_TOP = 16;
  const PAD_BOTTOM = 16;
  const PAD_SIDE = 60;

  const escala = MAX_H / longitudM;
  const h = longitudM * escala;
  const wPilote = Math.max(Math.min(diametroM * escala, 70), 24);

  const viewW = wPilote + PAD_SIDE * 2;
  const viewH = h + PAD_TOP + PAD_BOTTOM;

  const x0 = (viewW - wPilote) / 2;
  const x1 = x0 + wPilote;
  const y0 = PAD_TOP;
  const y1 = y0 + h;

  const radioBarra = Math.max(1.5, Math.min(3, diametroBarraMm * 0.15));
  const nMax = Math.max(2, Math.min(numeroBarras, 10));

  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox={`0 0 ${viewW} ${viewH}`} className="h-auto w-full max-w-[180px] text-primary" fill="none" aria-hidden="true">
        {/* nivel del terreno */}
        <path d={`M0 ${y0} L${viewW} ${y0}`} stroke="currentColor" strokeWidth="1.5" opacity="0.7" />
        {Array.from({ length: Math.round(viewW / 10) }).map((_, i) => (
          <path key={i} d={`M${i * 10} ${y0} L${i * 10 - 5} ${y0 - 6}`} stroke="currentColor" strokeWidth="1" opacity="0.4" />
        ))}

        {/* fuste */}
        <rect x={x0} y={y0} width={wPilote} height={h} stroke="currentColor" strokeWidth="2" fill="var(--color-muted)" fillOpacity="0.4" />

        {/* flechas de fricción por fuste */}
        {Array.from({ length: 4 }).map((_, i) => {
          const y = y0 + (h * (i + 1)) / 5;
          return (
            <g key={i} opacity="0.55">
              <path d={`M${x0 - 14} ${y} L${x0 - 3} ${y}`} stroke="currentColor" strokeWidth="1" markerEnd="url(#arrowPilote)" />
              <path d={`M${x1 + 14} ${y} L${x1 + 3} ${y}`} stroke="currentColor" strokeWidth="1" markerEnd="url(#arrowPiloteInv)" />
            </g>
          );
        })}

        {/* armadura longitudinal (vista lateral, dos filas de barras) */}
        {Array.from({ length: nMax }).map((_, i) => {
          const y = y0 + 10 + (i * (h - 20)) / (nMax - 1 || 1);
          return (
            <g key={i}>
              <circle cx={x0 + 6} cy={y} r={radioBarra} fill="currentColor" />
              <circle cx={x1 - 6} cy={y} r={radioBarra} fill="currentColor" />
            </g>
          );
        })}

        {/* resistencia de punta */}
        <path d={`M${(x0 + x1) / 2} ${y1 + 14} L${(x0 + x1) / 2} ${y1 + 2}`} stroke="currentColor" strokeWidth="1.5" markerEnd="url(#arrowPiloteInv)" opacity="0.7" />

        <defs>
          <marker id="arrowPilote" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0 0 L6 3 L0 6 Z" fill="currentColor" />
          </marker>
          <marker id="arrowPiloteInv" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0 0 L6 3 L0 6 Z" fill="currentColor" />
          </marker>
        </defs>

        <text x={x1 + 20} y={y0 + h / 2} className="fill-current font-mono" fontSize="8" transform={`rotate(-90 ${x1 + 20} ${y0 + h / 2})`} textAnchor="middle">
          L = {fmtM(longitudM)}
        </text>
      </svg>
      <dl className="grid w-full max-w-[220px] grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs text-muted-foreground">
        <dt>Diámetro</dt>
        <dd className="text-right text-foreground">{fmtM(diametroM)}</dd>
        <dt>Armadura</dt>
        <dd className="text-right text-foreground">{numeroBarras}⌀{diametroBarraMm}</dd>
      </dl>
    </div>
  );
}
