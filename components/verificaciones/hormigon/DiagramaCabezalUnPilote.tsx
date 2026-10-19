"use client";

import { fmt } from "@/lib/verificaciones/formato";

interface DiagramaCabezalUnPiloteProps {
  ladoXM: number;
  hM: number;
  pilarXM: number;
  diametroPiloteM: number;
}

/**
 * Cabezal de un pilote visto de frente: el campo de compresiones que se abre
 * desde el pilar y se cierra sobre el pilote, partido en dos mitades del canto,
 * cada una con sus cercos horizontales (art. 6.5.3, fig. A19.6.25).
 */
export function DiagramaCabezalUnPilote({ ladoXM, hM, pilarXM, diametroPiloteM }: DiagramaCabezalUnPiloteProps) {
  const W = 240;
  const escala = W / ladoXM;
  const x0 = 44;
  const y0 = 44;
  const hPx = Math.max(hM * escala, 40);
  const cx = x0 + W / 2;
  const pilarW = Math.min(pilarXM * escala, W);
  const piloteW = Math.min(diametroPiloteM * escala, W);
  const yMedio = y0 + hPx / 2;
  const yBase = y0 + hPx;
  // Ancho del campo de compresiones en la mitad del canto, sólo para dibujarlo.
  const campoW = Math.min(W * 0.9, Math.max(pilarW, piloteW) * 1.6);

  const cercos = (desde: number, hasta: number) =>
    [0.3, 0.6, 0.9].map((f) => desde + (hasta - desde) * f);

  return (
    <svg viewBox={`0 0 ${W + 88} ${yBase + 76}`} className="h-auto w-full text-primary" fill="none" aria-hidden="true">
      {/* pilar */}
      <rect x={cx - pilarW / 2} y={y0 - 32} width={pilarW} height={32} stroke="var(--mat-hormigon-borde)" strokeWidth="1.8" fill="var(--mat-hormigon)" />
      {/* cabezal */}
      <rect x={x0} y={y0} width={W} height={hPx} stroke="var(--mat-hormigon-borde)" strokeWidth="2.2" fill="var(--mat-hormigon)" />
      {/* campo de compresiones */}
      <path
        d={`M${cx - pilarW / 2} ${y0} C${cx - campoW / 2} ${y0 + hPx * 0.3} ${cx - campoW / 2} ${y0 + hPx * 0.7} ${cx - piloteW / 2} ${yBase}
            M${cx + pilarW / 2} ${y0} C${cx + campoW / 2} ${y0 + hPx * 0.3} ${cx + campoW / 2} ${y0 + hPx * 0.7} ${cx + piloteW / 2} ${yBase}`}
        stroke="currentColor"
        strokeWidth="1.4"
        strokeDasharray="5 3"
        opacity="0.75"
      />
      {/* mitad del canto */}
      <path d={`M${x0} ${yMedio} L${x0 + W} ${yMedio}`} stroke="currentColor" strokeWidth="0.8" strokeDasharray="2 3" opacity="0.5" />
      {/* cercos de cada mitad */}
      {[...cercos(y0, yMedio), ...cercos(yMedio, yBase)].map((y) => (
        <path key={y} d={`M${x0 + 8} ${y} L${x0 + W - 8} ${y}`} stroke="currentColor" strokeWidth="2" />
      ))}
      <text x={x0 + W + 6} y={(y0 + yMedio) / 2 + 3} className="fill-current font-mono" fontSize="9.5">T sup</text>
      <text x={x0 + W + 6} y={(yMedio + yBase) / 2 + 3} className="fill-current font-mono" fontSize="9.5">T inf</text>
      {/* pilote */}
      <rect x={cx - piloteW / 2} y={yBase} width={piloteW} height={44} stroke="var(--mat-hormigon-borde)" strokeWidth="1.8" fill="var(--mat-hormigon)" />
      {/* cota H */}
      <g stroke="currentColor" strokeWidth="1" opacity="0.7">
        <path d={`M${x0 - 14} ${y0} L${x0 - 14} ${yBase}`} />
        <path d={`M${x0 - 20} ${y0} L${x0 - 8} ${y0}`} />
        <path d={`M${x0 - 20} ${yBase} L${x0 - 8} ${yBase}`} />
      </g>
      <text x={x0 - 18} y={yMedio + 3} textAnchor="end" className="fill-current font-mono" fontSize="9.5">
        H
      </text>
      <text x={cx} y={yBase + 60} textAnchor="middle" className="fill-current font-mono" fontSize="9.5">
        H = {fmt(hM)} m · D = {fmt(diametroPiloteM)} m
      </text>
    </svg>
  );
}
