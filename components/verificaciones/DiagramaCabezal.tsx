"use client";

import { fmt } from "@/lib/verificaciones/formato";

interface DiagramaCabezalProps {
  ladoXM: number;
  hM: number;
  anchoPilarM: number;
  diametroPiloteM: number;
  separacionPilotesM: number;
}

/**
 * Cabezal de dos pilotes visto de frente, con el modelo de bielas y tirante
 * dibujado encima: las dos diagonales comprimidas que bajan del pilar a cada
 * pilote, y el tirante Td que las cierra por abajo.
 */
export function DiagramaCabezal({
  ladoXM, hM, anchoPilarM, diametroPiloteM, separacionPilotesM,
}: DiagramaCabezalProps) {
  const W = 280;
  const escala = W / ladoXM;
  const x0 = 24;
  const y0 = 44;
  const hPx = Math.max(hM * escala, 30);
  const cx = x0 + W / 2;
  const pilarW = Math.min(anchoPilarM * escala, W * 0.6);
  const piloteW = Math.min(diametroPiloteM * escala, W * 0.3);
  const dxPilote = (separacionPilotesM / 2) * escala;
  const yBase = y0 + hPx;

  return (
    <svg viewBox={`0 0 ${W + 48} ${yBase + 72}`} className="h-auto w-full text-primary" fill="none" aria-hidden="true">
      {/* pilar */}
      <rect x={cx - pilarW / 2} y={y0 - 32} width={pilarW} height={32} stroke="currentColor" strokeWidth="1.8" fill="var(--color-muted)" fillOpacity="0.5" />
      {/* cabezal */}
      <rect x={x0} y={y0} width={W} height={hPx} stroke="currentColor" strokeWidth="2.2" fill="var(--color-muted)" fillOpacity="0.35" />
      {/* bielas comprimidas */}
      <path d={`M${cx} ${y0} L${cx - dxPilote} ${yBase}`} stroke="currentColor" strokeWidth="1.4" strokeDasharray="5 3" opacity="0.75" />
      <path d={`M${cx} ${y0} L${cx + dxPilote} ${yBase}`} stroke="currentColor" strokeWidth="1.4" strokeDasharray="5 3" opacity="0.75" />
      {/* tirante */}
      <path d={`M${cx - dxPilote} ${yBase - 8} L${cx + dxPilote} ${yBase - 8}`} stroke="currentColor" strokeWidth="3" />
      <text x={cx} y={yBase - 12} textAnchor="middle" className="fill-current font-mono" fontSize="9.5">Td</text>
      {/* pilotes */}
      {[-1, 1].map((s) => (
        <rect key={s} x={cx + s * dxPilote - piloteW / 2} y={yBase} width={piloteW} height={44} stroke="currentColor" strokeWidth="1.8" fill="var(--color-muted)" fillOpacity="0.5" />
      ))}
      {/* cota s */}
      <g stroke="currentColor" strokeWidth="1" opacity="0.7">
        <path d={`M${cx - dxPilote} ${yBase + 54} L${cx + dxPilote} ${yBase + 54}`} />
        <path d={`M${cx - dxPilote} ${yBase + 48} L${cx - dxPilote} ${yBase + 60}`} />
        <path d={`M${cx + dxPilote} ${yBase + 48} L${cx + dxPilote} ${yBase + 60}`} />
      </g>
      <text x={cx} y={yBase + 68} textAnchor="middle" className="fill-current font-mono" fontSize="9.5">
        s = {fmt(separacionPilotesM)} m
      </text>
    </svg>
  );
}
