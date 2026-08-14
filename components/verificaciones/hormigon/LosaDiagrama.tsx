"use client";

import { useId } from "react";

interface LosaDiagramaProps {
  eM: number;
  recubrimientoPositivoM: number;
  recubrimientoNegativoM: number;
  diametroPosXMm: number;
  diametroPosYMm: number;
  diametroNegXMm: number;
  diametroNegYMm: number;
  dPosXM: number;
  dPosYM: number;
}

const fmtM = (n: number, dec = 3) =>
  `${n.toLocaleString("es-AR", { minimumFractionDigits: dec, maximumFractionDigits: dec })} m`;

export function LosaDiagrama({
  eM,
  recubrimientoPositivoM,
  recubrimientoNegativoM,
  diametroPosXMm,
  diametroPosYMm,
  diametroNegXMm,
  diametroNegYMm,
  dPosXM,
  dPosYM,
}: LosaDiagramaProps) {
  const arrowId = useId();
  if (!(eM > 0)) return null;

  const W = 300;
  const PAD_LEFT = 54;
  const PAD_TOP = 26;
  const PAD_BOTTOM = 34;

  // Escala vertical exagerada: una losa real es demasiado chata para ver las capas.
  const hPx = 92;
  const escalaV = hPx / eM;

  const x0 = PAD_LEFT;
  const x1 = PAD_LEFT + W;
  const y0 = PAD_TOP;
  const y1 = y0 + hPx;
  const viewW = x1 + 18;
  const viewH = y1 + PAD_BOTTOM;

  const rPx = (dMm: number) => Math.max(2.5, Math.min(5.5, dMm * 0.28));

  // Positiva: Y en la capa exterior (más cerca de la cara inferior), X apoyada encima.
  const rPosY = rPx(diametroPosYMm);
  const rPosX = rPx(diametroPosXMm);
  const yPosY = y1 - recubrimientoPositivoM * escalaV - rPosY;
  const yPosX = y1 - (recubrimientoPositivoM + diametroPosYMm / 1000) * escalaV - rPosX;

  // Negativa: espejada respecto de la cara superior.
  const rNegY = rPx(diametroNegYMm);
  const rNegX = rPx(diametroNegXMm);
  const yNegY = y0 + recubrimientoNegativoM * escalaV + rNegY;
  const yNegX = y0 + (recubrimientoNegativoM + diametroNegYMm / 1000) * escalaV + rNegX;

  const xsY = Array.from({ length: 9 }, (_, i) => x0 + 18 + i * ((W - 36) / 8));
  const xsX = Array.from({ length: 8 }, (_, i) => x0 + 26 + i * ((W - 52) / 7));

  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox={`0 0 ${viewW} ${viewH}`} className="h-auto w-full text-primary" fill="none" aria-hidden="true">
        <defs>
          <marker id={arrowId} markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0 0 L6 3 L0 6 Z" fill="currentColor" />
          </marker>
        </defs>

        {/* cota e */}
        <g stroke="currentColor" strokeWidth="1" opacity="0.75">
          <path d={`M${x0 - 18} ${y0} L${x0 - 4} ${y0}`} />
          <path d={`M${x0 - 18} ${y1} L${x0 - 4} ${y1}`} />
          <path d={`M${x0 - 11} ${y0} L${x0 - 11} ${y1}`} markerStart={`url(#${arrowId})`} markerEnd={`url(#${arrowId})`} />
        </g>
        <text
          x={x0 - 24}
          y={(y0 + y1) / 2}
          textAnchor="middle"
          className="fill-current font-mono"
          fontSize="10.5"
          transform={`rotate(-90 ${x0 - 24} ${(y0 + y1) / 2})`}
        >
          e = {fmtM(eM, 2)}
        </text>

        {/* sección de la losa */}
        <rect x={x0} y={y0} width={W} height={hPx} stroke="currentColor" strokeWidth="2" fill="var(--color-muted)" fillOpacity="0.4" />

        {/* armadura negativa (arriba): Y exterior, X por dentro */}
        {xsY.map((x, i) => (
          <circle key={`ny-${i}`} cx={x} cy={yNegY} r={rNegY} fill="currentColor" opacity="0.55" />
        ))}
        {xsX.map((x, i) => (
          <circle key={`nx-${i}`} cx={x} cy={yNegX} r={rNegX} fill="currentColor" />
        ))}

        {/* armadura positiva (abajo) */}
        {xsY.map((x, i) => (
          <circle key={`py-${i}`} cx={x} cy={yPosY} r={rPosY} fill="currentColor" opacity="0.55" />
        ))}
        {xsX.map((x, i) => (
          <circle key={`px-${i}`} cx={x} cy={yPosX} r={rPosX} fill="currentColor" />
        ))}

        <text x={x1 - 2} y={y0 - 8} textAnchor="end" className="fill-current font-mono" fontSize="9.5" opacity="0.8">
          negativa (superior)
        </text>
        <text x={x1 - 2} y={y1 + 14} textAnchor="end" className="fill-current font-mono" fontSize="9.5" opacity="0.8">
          positiva (inferior)
        </text>
        <text x={x0 + 2} y={y1 + 14} className="fill-current font-mono" fontSize="9.5" opacity="0.7">
          ● X (interior) · ○ Y (exterior)
        </text>
      </svg>

      <dl className="grid w-full max-w-md grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs text-muted-foreground">
        <dt>d positiva X</dt>
        <dd className="text-right text-foreground">{fmtM(dPosXM)}</dd>
        <dt>d positiva Y</dt>
        <dd className="text-right text-foreground">{fmtM(dPosYM)}</dd>
      </dl>
    </div>
  );
}
