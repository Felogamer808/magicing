"use client";

import { fmt } from "@/lib/verificaciones/formato";

interface PlantaCabezalUnPiloteProps {
  ladoXM: number;
  ladoYM: number;
  pilarXM: number;
  pilarYM: number;
  diametroPiloteM: number;
}

/**
 * Cabezal de un pilote visto en planta: el cabezal con sus ejes x e y, el
 * pilar centrado encima y el pilote debajo, a trazos. Está para que se lea
 * qué medida es cada campo —el ancho del cabezal y el lado del pilar en la
 * misma dirección—, así que dibuja a escala real y acota las tres piezas.
 */
export function PlantaCabezalUnPilote({ ladoXM, ladoYM, pilarXM, pilarYM, diametroPiloteM }: PlantaCabezalUnPiloteProps) {
  const LADO = 200;
  const escala = LADO / Math.max(ladoXM, ladoYM);
  const w = ladoXM * escala;
  const h = ladoYM * escala;
  const x0 = 54;
  const y0 = 40;
  const cx = x0 + w / 2;
  const cy = y0 + h / 2;
  const px = pilarXM * escala;
  const py = pilarYM * escala;
  const r = (diametroPiloteM * escala) / 2;

  return (
    <svg viewBox={`0 0 ${x0 + w + 70} ${y0 + h + 82}`} className="h-auto w-full text-primary" fill="none" aria-hidden="true">
      <defs>
        <marker id="planta-cabezal-flecha" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0 0 L10 5 L0 10 z" fill="currentColor" />
        </marker>
      </defs>

      {/* cabezal */}
      <rect x={x0} y={y0} width={w} height={h} stroke="var(--mat-hormigon-borde)" strokeWidth="2" fill="var(--mat-hormigon)" />
      {/* pilote, debajo del cabezal */}
      <circle cx={cx} cy={cy} r={r} stroke="currentColor" strokeWidth="1.3" strokeDasharray="5 3" />
      {/* pilar, encima */}
      <rect x={cx - px / 2} y={cy - py / 2} width={px} height={py} stroke="var(--mat-hormigon-borde)" strokeWidth="1.6" fill="var(--mat-hormigon-borde)" fillOpacity="0.35" />

      {/* ejes x e y desde la esquina, para que se vea qué dirección es cada uno */}
      <g stroke="currentColor" strokeWidth="1.2">
        <path d={`M${x0 - 34} ${y0 + h + 24} L${x0 - 6} ${y0 + h + 24}`} markerEnd="url(#planta-cabezal-flecha)" />
        <path d={`M${x0 - 34} ${y0 + h + 24} L${x0 - 34} ${y0 + h - 4}`} markerEnd="url(#planta-cabezal-flecha)" />
      </g>
      <text x={x0 - 2} y={y0 + h + 28} className="fill-current font-mono" fontSize="10" fontWeight={700}>x</text>
      <text x={x0 - 38} y={y0 + h - 8} className="fill-current font-mono" fontSize="10" fontWeight={700}>y</text>

      {/* cotas del cabezal */}
      <g stroke="currentColor" strokeWidth="0.9" opacity="0.7">
        <path d={`M${x0} ${y0 - 12} L${x0 + w} ${y0 - 12}`} />
        <path d={`M${x0} ${y0 - 17} L${x0} ${y0 - 7}`} />
        <path d={`M${x0 + w} ${y0 - 17} L${x0 + w} ${y0 - 7}`} />
        <path d={`M${x0 + w + 12} ${y0} L${x0 + w + 12} ${y0 + h}`} />
        <path d={`M${x0 + w + 7} ${y0} L${x0 + w + 17} ${y0}`} />
        <path d={`M${x0 + w + 7} ${y0 + h} L${x0 + w + 17} ${y0 + h}`} />
      </g>
      <text x={cx} y={y0 - 17} textAnchor="middle" className="fill-current font-mono" fontSize="9.5">
        cabezal x = {fmt(ladoXM)} m
      </text>
      <text x={x0 + w + 20} y={cy + 3} className="fill-current font-mono" fontSize="9.5">
        y = {fmt(ladoYM)}
      </text>

      {/* cotas del pilar y del pilote, abajo */}
      <text x={cx} y={y0 + h + 46} textAnchor="middle" className="fill-current font-mono" fontSize="9.5">
        pilar {fmt(pilarXM)} × {fmt(pilarYM)} m
      </text>
      <text x={cx} y={y0 + h + 60} textAnchor="middle" className="fill-current font-mono" fontSize="9.5" opacity="0.8">
        pilote Ø {fmt(diametroPiloteM)} m (a trazos, debajo)
      </text>
    </svg>
  );
}
