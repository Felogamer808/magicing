"use client";

import type { ReactNode } from "react";

interface CroquisProps {
  /** Relación de aspecto del dibujo. */
  viewBox: string;
  children: ReactNode;
  /** Aclaración breve para lo que el dibujo no alcanza a explicar. */
  nota?: string;
  ancho?: string;
}

/**
 * Marco común de los croquis que acompañan a cada tarjeta de datos. Van dentro
 * de la tarjeta, arriba de los campos, y rotulan los mismos símbolos que las
 * etiquetas para que no haya que traducir nada mentalmente.
 */
export function Croquis({ viewBox, children, nota, ancho = "max-w-[15rem]" }: CroquisProps) {
  return (
    <div className="mb-4 flex flex-col items-center gap-2 border-b border-border/60 pb-4">
      <svg viewBox={viewBox} className={`h-auto w-full ${ancho} text-primary`} fill="none" aria-hidden="true">
        <defs>
          <marker id="croquis-flecha" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0 0 L6 3 L0 6 Z" fill="currentColor" />
          </marker>
        </defs>
        {children}
      </svg>
      {nota && <p className="text-center text-[11px] leading-snug text-muted-foreground">{nota}</p>}
    </div>
  );
}

/** Cota horizontal con su rótulo. */
export function CotaH({ x0, x1, y, texto }: { x0: number; x1: number; y: number; texto: string }) {
  return (
    <g stroke="currentColor" strokeWidth="0.8" opacity="0.85">
      <path d={`M${x0} ${y - 4} L${x0} ${y + 4}`} />
      <path d={`M${x1} ${y - 4} L${x1} ${y + 4}`} />
      <path d={`M${x0} ${y} L${x1} ${y}`} markerStart="url(#croquis-flecha)" markerEnd="url(#croquis-flecha)" />
      <text
        x={(x0 + x1) / 2}
        y={y - 6}
        textAnchor="middle"
        className="fill-current font-mono"
        fontSize="10"
        stroke="none"
      >
        {texto}
      </text>
    </g>
  );
}

/** Cota vertical con su rótulo girado. */
export function CotaV({ x, y0, y1, texto }: { x: number; y0: number; y1: number; texto: string }) {
  const ym = (y0 + y1) / 2;
  return (
    <g stroke="currentColor" strokeWidth="0.8" opacity="0.85">
      <path d={`M${x - 4} ${y0} L${x + 4} ${y0}`} />
      <path d={`M${x - 4} ${y1} L${x + 4} ${y1}`} />
      <path d={`M${x} ${y0} L${x} ${y1}`} markerStart="url(#croquis-flecha)" markerEnd="url(#croquis-flecha)" />
      <text
        x={x - 6}
        y={ym}
        textAnchor="middle"
        className="fill-current font-mono"
        fontSize="10"
        stroke="none"
        transform={`rotate(-90 ${x - 6} ${ym})`}
      >
        {texto}
      </text>
    </g>
  );
}

/** Rótulo con línea de referencia hasta el elemento que nombra. */
export function Referencia({
  x,
  y,
  hacia,
  texto,
  anclaje = "start",
}: {
  x: number;
  y: number;
  hacia: [number, number];
  texto: string;
  anclaje?: "start" | "middle" | "end";
}) {
  return (
    <g>
      <path d={`M${x} ${y} L${hacia[0]} ${hacia[1]}`} stroke="currentColor" strokeWidth="0.7" opacity="0.6" />
      <text x={x} y={y - 3} textAnchor={anclaje} className="fill-current font-mono" fontSize="8">
        {texto}
      </text>
    </g>
  );
}
