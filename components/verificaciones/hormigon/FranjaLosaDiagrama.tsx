"use client";

interface FranjaLosaDiagramaProps {
  longitudM: number;
  HM: number;
  posicionesColumnasM: number[];
}

const fmtM = (n: number) => `${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`;

export function FranjaLosaDiagrama({ longitudM, HM, posicionesColumnasM }: FranjaLosaDiagramaProps) {
  if (!(longitudM > 0) || !(HM > 0) || posicionesColumnasM.length === 0) return null;

  const MAX_W = 280;
  const PAD_LEFT = 20;
  const PAD_TOP = 46;
  const PAD_RIGHT = 20;
  const PAD_BOTTOM = 20;

  const escala = MAX_W / longitudM;
  const w = longitudM * escala;
  const h = Math.max(HM * escala, 20);

  const x0 = PAD_LEFT;
  const y0 = PAD_TOP;
  const x1 = x0 + w;
  const y1 = y0 + h;
  const viewW = x1 + PAD_RIGHT;
  const viewH = y1 + PAD_BOTTOM;

  const xsCol = posicionesColumnasM.map((p) => x0 + p * escala);

  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox={`0 0 ${viewW} ${viewH}`} className="h-auto w-full text-primary" fill="none" aria-hidden="true">
        {xsCol.map((xc, i) => (
          <path key={i} d={`M${xc} ${y0 - 30} L${xc} ${y0}`} stroke="currentColor" strokeWidth="3" opacity="0.8" />
        ))}

        <rect x={x0} y={y0} width={w} height={h} stroke="currentColor" strokeWidth="2" fill="var(--color-muted)" fillOpacity="0.4" />

        {/* suelo: achurado debajo */}
        {Array.from({ length: Math.round(w / 10) }).map((_, i) => (
          <path
            key={i}
            d={`M${x0 + i * 10} ${y1 + 6} L${x0 + i * 10 - 5} ${y1 + 12}`}
            stroke="currentColor"
            strokeWidth="1"
            opacity="0.4"
          />
        ))}

        {posicionesColumnasM.map((p, i) => (
          <text key={i} x={xsCol[i]} y={y0 + h + 22} textAnchor="middle" className="fill-current font-mono" fontSize="9.5">
            {fmtM(p)}
          </text>
        ))}
      </svg>
      <p className="text-xs text-muted-foreground">
        Longitud = {fmtM(longitudM)} · H = {fmtM(HM)}
      </p>
    </div>
  );
}
