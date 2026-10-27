"use client";

import type { ResultadoCortanteZonas } from "@/lib/calc/hormigon/vigas/flexion-cortante";
import { fmt } from "@/lib/verificaciones/formato";

interface DiagramaZonasCortanteProps {
  zonas: ResultadoCortanteZonas;
  vdApoyoKN: number;
  vdCentroKN: number;
  luzM: number;
  /** Dónde se tomó el Vd del apoyo (m): hasta ahí se dibuja constante. */
  inicioLeyM?: number;
  textoApoyo: string;
  textoVano: string;
}

/**
 * Medio vano, del apoyo al centro: el cortante lineal, lo que resisten los
 * estribos del vano y dónde cambia de una zona a la otra. No calcula nada.
 */
export function DiagramaZonasCortante({ zonas, vdApoyoKN, vdCentroKN, luzM, inicioLeyM = 0, textoApoyo, textoVano }: DiagramaZonasCortanteProps) {
  const W = 440, H = 226, x0 = 40, x1 = 420, yBase = 170, yTop = 52;
  const mitad = luzM / 2;
  const X = (m: number) => x0 + (m / mitad) * (x1 - x0);
  const vMax = Math.max(vdApoyoKN, zonas.vRdVanoKN) || 1;
  const Y = (v: number) => yBase - (v / vMax) * (yBase - yTop);
  const xc = X(Math.min(zonas.largoApoyoM, mitad));
  const yVrd = Y(Math.min(zonas.vRdVanoKN, vMax));
  return (
    <div className="space-y-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full max-w-[30rem] text-primary" fill="none" aria-hidden="true">
        <rect x={x0} y={yTop - 10} width={xc - x0} height={yBase - yTop + 10} className="fill-destructive" fillOpacity="0.08" />
        <rect x={xc} y={yTop - 10} width={x1 - xc} height={yBase - yTop + 10} className="fill-exito" fillOpacity="0.08" />
        <line x1={x0} x2={x1} y1={yBase} y2={yBase} stroke="currentColor" strokeWidth="1" opacity="0.6" />
        <path d={`M${x0} ${yBase} V${Y(vdApoyoKN)} H${X(Math.min(inicioLeyM, mitad))} L${x1} ${Y(vdCentroKN)} V${yBase}`} fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="1.8" />
        <line x1={x0} x2={x1} y1={yVrd} y2={yVrd} className="stroke-exito" strokeWidth="1.4" strokeDasharray="6 4" />
        <line x1={xc} x2={xc} y1={yTop - 10} y2={yBase} stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
        <text x={x0 + 4} y={Y(vdApoyoKN) - 6} className="fill-current font-mono" fontSize="11">Vd {fmt(vdApoyoKN, 0)} kN</text>
        <text x={x1} y={Y(vdCentroKN) - 6} textAnchor="end" className="fill-current font-mono" fontSize="11">{fmt(vdCentroKN, 0)} kN</text>
        <text x={x1} y={yVrd + 14} textAnchor="end" className="fill-current font-mono" fontSize="11">VRd vano {fmt(zonas.vRdVanoKN, 0)} kN</text>
        <text x={(x0 + xc) / 2} y={yBase + 16} textAnchor="middle" className="fill-current font-mono" fontSize="11">apoyo {fmt(zonas.largoApoyoM, 2)} m</text>
        {/* Una línea más abajo: con una zona de vano corta no entra al lado de la de apoyo. */}
        <text x={x1} y={yBase + 32} textAnchor="end" className="fill-current font-mono" fontSize="11">vano hasta L/2 = {fmt(mitad, 2)} m</text>
        <text x={x0} y={16} className="fill-current" fontSize="11">apoyo</text>
        <text x={x1} y={16} textAnchor="end" className="fill-current" fontSize="11">centro del vano</text>
      </svg>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
        <li className="flex items-center gap-1.5"><span className="inline-block h-3 w-4 bg-destructive/20" /> {textoApoyo}</li>
        <li className="flex items-center gap-1.5"><span className="inline-block h-3 w-4 bg-exito/20" /> {textoVano}</li>
      </ul>
    </div>
  );
}
