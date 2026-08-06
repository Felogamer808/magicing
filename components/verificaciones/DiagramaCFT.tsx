"use client";

import { fmt } from "@/lib/verificaciones/formato";

interface DiagramaCFTProps {
  dMm: number;
  tMm: number;
  numeroBarras: number;
  diametroBarraMm: number;
}

/**
 * Sección del tubo relleno de hormigón: el tubo, el espesor de pared y las
 * barras repartidas en círculo.
 *
 * El dibujo satura en 24 barras para que no se vuelvan una línea continua, pero
 * el cálculo usa siempre la cantidad real cargada.
 */
export function DiagramaCFT({ dMm, tMm, numeroBarras, diametroBarraMm }: DiagramaCFTProps) {
  const R = 70;
  const cx = 86;
  const cy = 86;
  const rInt = R * (1 - (2 * tMm) / dMm);
  const rBarras = rInt * 0.72;
  const rBarra = Math.max(2.5, Math.min(6, (diametroBarraMm / dMm) * R * 1.6));
  const n = Math.max(1, Math.min(numeroBarras, 24));

  return (
    <svg viewBox="0 0 172 172" className="h-auto w-full max-w-[190px] text-primary" fill="none" aria-hidden="true">
      <circle cx={cx} cy={cy} r={R} stroke="currentColor" strokeWidth="2.5" fill="var(--color-muted)" fillOpacity="0.3" />
      <circle cx={cx} cy={cy} r={rInt} stroke="currentColor" strokeWidth="1.5" opacity="0.7" />
      {Array.from({ length: n }).map((_, i) => {
        const a = (2 * Math.PI * i) / n - Math.PI / 2;
        return <circle key={i} cx={cx + rBarras * Math.cos(a)} cy={cy + rBarras * Math.sin(a)} r={rBarra} fill="currentColor" />;
      })}
      <text x={cx} y={cy + 3} textAnchor="middle" className="fill-current font-mono" fontSize="8" opacity="0.75">
        D {fmt(dMm, 0)}
      </text>
    </svg>
  );
}
