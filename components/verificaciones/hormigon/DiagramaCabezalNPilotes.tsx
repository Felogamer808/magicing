"use client";

import type { PiloteCabezal } from "@/lib/calc/hormigon/cimentaciones/cabezal-n-pilotes";
import { fmt } from "@/lib/verificaciones/formato";

interface DiagramaCabezalNPilotesProps {
  ladoAM: number;
  ladoBM: number;
  pilarAM: number;
  pilarBM: number;
  diametroPiloteM: number;
  pilotes: readonly PiloteCabezal[];
  /** Tirantes que ancla cada pilote (0, 1 o 2), en el orden de `pilotes`; sin dato no se rotula */
  tirantes?: readonly number[];
}

/**
 * Cabezal visto en planta: los pilotes donde se cargaron y el pilar en el
 * centro del grupo, que es lo que supone el modelo. A va a lo largo (x), B a
 * lo ancho (y, hacia arriba).
 */
export function DiagramaCabezalNPilotes({ ladoAM, ladoBM, pilarAM, pilarBM, diametroPiloteM, pilotes, tirantes }: DiagramaCabezalNPilotesProps) {
  const max = 260;
  const escala = max / Math.max(ladoAM, ladoBM);
  const W = ladoAM * escala;
  const H = ladoBM * escala;
  const x0 = 40;
  const y0 = 24;
  const px = (a: number) => x0 + W / 2 + a * escala;
  const py = (b: number) => y0 + H / 2 - b * escala;
  const n = pilotes.length;
  const ca = n ? pilotes.reduce((s, p) => s + p.aM, 0) / n : 0;
  const cb = n ? pilotes.reduce((s, p) => s + p.bM, 0) / n : 0;

  return (
    <svg viewBox={`0 0 ${W + 80} ${H + 70}`} className="h-auto w-full text-primary" fill="none" aria-hidden="true">
      <rect x={x0} y={y0} width={W} height={H} stroke="var(--mat-hormigon-borde)" strokeWidth="2.2" fill="var(--mat-hormigon)" />
      {pilotes.map((p, i) => (
        <g key={i}>
          <circle cx={px(p.aM)} cy={py(p.bM)} r={(diametroPiloteM * escala) / 2} stroke="currentColor" strokeWidth="1.4" />
          {tirantes && (
            <text x={px(p.aM)} y={py(p.bM) + 3} textAnchor="middle" className="fill-current font-mono" fontSize="9">
              {tirantes[i]}T
            </text>
          )}
        </g>
      ))}
      <rect
        x={px(ca) - (pilarAM * escala) / 2}
        y={py(cb) - (pilarBM * escala) / 2}
        width={pilarAM * escala}
        height={pilarBM * escala}
        stroke="var(--mat-hormigon-borde)"
        strokeWidth="1.8"
        fill="currentColor"
        fillOpacity="0.25"
      />
      <text x={x0 + W / 2} y={y0 + H + 20} textAnchor="middle" className="fill-current font-mono" fontSize="9.5">
        A = {fmt(ladoAM)} m →
      </text>
      <text x={x0 + W + 8} y={y0 + H / 2} className="fill-current font-mono" fontSize="9.5">
        B = {fmt(ladoBM)} m
      </text>
      <text x={x0 + W / 2} y={y0 + H + 40} textAnchor="middle" className="fill-current font-mono" fontSize="9">
        {n} pilotes ⌀{fmt(diametroPiloteM)} m{tirantes ? " · nT = tirantes que ancla" : ""}
      </text>
    </svg>
  );
}
