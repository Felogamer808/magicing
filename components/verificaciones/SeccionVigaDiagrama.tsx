"use client";

import { useId } from "react";

interface ArmaduraDiagrama {
  diametroMm: number;
  /** Barras por fila, de la más cercana a la fibra traccionada hacia adentro. */
  capas: number[];
}

interface SeccionVigaDiagramaProps {
  bM: number;
  hM: number;
  recubrimientoM: number;
  dM: number;
  armaduraPositiva: ArmaduraDiagrama;
  armaduraNegativa: ArmaduraDiagrama;
  diametroEstriboMm: number;
}

function distribuir(n: number, desde: number, hasta: number): number[] {
  if (n <= 1) return [(desde + hasta) / 2];
  const paso = (hasta - desde) / (n - 1);
  return Array.from({ length: n }, (_, i) => desde + i * paso);
}

const fmtM = (n: number) => `${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`;

function etiquetaArmadura({ diametroMm, capas }: ArmaduraDiagrama): string {
  const total = capas.reduce((a, b) => a + b, 0);
  if (capas.length <= 1) return `${total}⌀${diametroMm}`;
  return `${capas.join("+")}⌀${diametroMm} (${capas.length} filas)`;
}

export function SeccionVigaDiagrama({
  bM,
  hM,
  recubrimientoM,
  dM,
  armaduraPositiva,
  armaduraNegativa,
  diametroEstriboMm,
}: SeccionVigaDiagramaProps) {
  const arrowId = useId();

  if (!(bM > 0) || !(hM > 0)) return null;

  const MAX_W = 230;
  const MAX_H = 210;
  const PAD_LEFT = 52;
  const PAD_TOP = 34;
  const PAD_RIGHT = 46;
  const PAD_BOTTOM = 14;

  const escala = Math.min(MAX_W / bM, MAX_H / hM);
  const w = bM * escala;
  const h = hM * escala;

  const x0 = PAD_LEFT;
  const y0 = PAD_TOP;
  const x1 = x0 + w;
  const y1 = y0 + h;

  const viewW = x1 + PAD_RIGHT;
  const viewH = y1 + PAD_BOTTOM;

  const cover = Math.min(recubrimientoM * escala, w / 2 - 6, h / 2 - 6);
  const coverX0 = x0 + Math.max(cover, 4);
  const coverX1 = x1 - Math.max(cover, 4);
  const coverY0 = y0 + Math.max(cover, 4);
  const coverY1 = y1 - Math.max(cover, 4);

  const radioPos = Math.max(2.5, Math.min(6, armaduraPositiva.diametroMm * 0.3));
  const radioNeg = Math.max(2.5, Math.min(6, armaduraNegativa.diametroMm * 0.3));
  const pitchPos = radioPos * 2 + 3;
  const pitchNeg = radioNeg * 2 + 3;

  // Filas de la armadura positiva: la 0 pegada al borde inferior, las siguientes hacia arriba.
  const filasPos = armaduraPositiva.capas.map((n, i) => ({
    n,
    y: coverY1 - radioPos - i * pitchPos,
  }));
  // Filas de la armadura negativa: la 0 pegada al borde superior, las siguientes hacia abajo.
  const filasNeg = armaduraNegativa.capas.map((n, i) => ({
    n,
    y: coverY0 + radioNeg + i * pitchNeg,
  }));

  const yCentroidePos = filasPos[0]?.y ?? coverY1 - radioPos;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg
        viewBox={`0 0 ${viewW} ${viewH}`}
        className="h-auto w-full max-w-xs text-primary"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <marker id={arrowId} markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0 0 L6 3 L0 6 Z" fill="currentColor" />
          </marker>
        </defs>

        {/* cota b */}
        <g stroke="currentColor" strokeWidth="1" opacity="0.75">
          <path d={`M${x0} ${y0 - 16} L${x0} ${y0 - 4}`} />
          <path d={`M${x1} ${y0 - 16} L${x1} ${y0 - 4}`} />
          <path
            d={`M${x0} ${y0 - 10} L${x1} ${y0 - 10}`}
            markerStart={`url(#${arrowId})`}
            markerEnd={`url(#${arrowId})`}
          />
        </g>
        <text
          x={(x0 + x1) / 2}
          y={y0 - 18}
          textAnchor="middle"
          className="fill-current font-mono"
          fontSize="9"
        >
          b = {fmtM(bM)}
        </text>

        {/* cota h */}
        <g stroke="currentColor" strokeWidth="1" opacity="0.75">
          <path d={`M${x0 - 16} ${y0} L${x0 - 4} ${y0}`} />
          <path d={`M${x0 - 16} ${y1} L${x0 - 4} ${y1}`} />
          <path
            d={`M${x0 - 10} ${y0} L${x0 - 10} ${y1}`}
            markerStart={`url(#${arrowId})`}
            markerEnd={`url(#${arrowId})`}
          />
        </g>
        <text
          x={PAD_LEFT - 22}
          y={(y0 + y1) / 2}
          textAnchor="middle"
          className="fill-current font-mono"
          fontSize="9"
          transform={`rotate(-90 ${PAD_LEFT - 22} ${(y0 + y1) / 2})`}
        >
          h = {fmtM(hM)}
        </text>

        {/* sección de hormigón */}
        <rect
          x={x0}
          y={y0}
          width={w}
          height={h}
          stroke="currentColor"
          strokeWidth="2"
          fill="var(--color-muted)"
          fillOpacity="0.4"
        />

        {/* estribo */}
        <rect
          x={coverX0}
          y={coverY0}
          width={Math.max(coverX1 - coverX0, 0)}
          height={Math.max(coverY1 - coverY0, 0)}
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="3 2"
          opacity="0.8"
          rx="2"
        />

        {/* cota d: de la fibra comprimida al centroide de la armadura positiva */}
        <g stroke="currentColor" strokeWidth="0.75" opacity="0.6" strokeDasharray="2 2">
          <path d={`M${x1 + 8} ${y0} L${x1 + 8} ${yCentroidePos}`} />
        </g>
        <g stroke="currentColor" strokeWidth="0.75" opacity="0.6">
          <path d={`M${x1} ${y0} L${x1 + 12} ${y0}`} />
          <path d={`M${x1} ${yCentroidePos} L${x1 + 12} ${yCentroidePos}`} />
        </g>
        <text x={x1 + 14} y={(y0 + yCentroidePos) / 2 + 3} className="fill-current font-mono" fontSize="8">
          d
        </text>

        {/* armadura negativa (superior), una fila por capa */}
        {filasNeg.map((fila, i) =>
          distribuir(fila.n, coverX0 + radioNeg, coverX1 - radioNeg).map((x, j) => (
            <circle key={`neg-${i}-${j}`} cx={x} cy={fila.y} r={radioNeg} fill="currentColor" />
          ))
        )}

        {/* armadura positiva (inferior), una fila por capa */}
        {filasPos.map((fila, i) =>
          distribuir(fila.n, coverX0 + radioPos, coverX1 - radioPos).map((x, j) => (
            <circle key={`pos-${i}-${j}`} cx={x} cy={fila.y} r={radioPos} fill="currentColor" />
          ))
        )}
      </svg>

      <dl className="grid w-full max-w-xs grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs text-muted-foreground">
        <dt>Positiva</dt>
        <dd className="text-right text-foreground">{etiquetaArmadura(armaduraPositiva)}</dd>
        <dt>Negativa</dt>
        <dd className="text-right text-foreground">{etiquetaArmadura(armaduraNegativa)}</dd>
        <dt>Estribo</dt>
        <dd className="text-right text-foreground">⌀{diametroEstriboMm}</dd>
        <dt>d</dt>
        <dd className="text-right text-foreground">{fmtM(dM)}</dd>
      </dl>
    </div>
  );
}
