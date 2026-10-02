"use client";

import { CapaMaterial } from "@/components/verificaciones/croquis/Primitivas";
import { CotaH, Referencia } from "@/components/verificaciones/croquis/Croquis";
import { fmt } from "@/lib/verificaciones/formato";

interface DiagramaCFTProps {
  dMm: number;
  tMm: number;
  numeroBarras: number;
  diametroBarraMm: number;
}

/** Círculo como trazado cerrado, para pasarlo a `CapaMaterial`. */
function circulo(cx: number, cy: number, r: number) {
  return `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0 Z`;
}

/**
 * Sección del tubo relleno de hormigón, con la gramática de material: el tubo
 * de acero rayado, el núcleo de hormigón y las barras en el color de armadura.
 *
 * El espesor de pared se dibuja a escala salvo cuando quedaría por debajo de un
 * trazo legible; la cota lleva siempre el valor real. El dibujo satura en 24
 * barras para que no se vuelvan una línea continua, pero el cálculo usa siempre
 * la cantidad real cargada.
 */
export function DiagramaCFT({ dMm, tMm, numeroBarras, diametroBarraMm }: DiagramaCFTProps) {
  const R = 72;
  const cx = 120;
  const cy = 100;
  const tVis = Math.max(3, (tMm / dMm) * 2 * R);
  const rInt = R - tVis;
  const rBarras = rInt * 0.78;
  const rBarra = Math.max(2.5, Math.min(7, (diametroBarraMm / dMm) * R * 1.6));
  const n = Math.max(1, Math.min(numeroBarras, 24));

  // Punto de la pared a 45° arriba a la derecha, para referir el espesor.
  const a = -Math.PI / 4;
  const pared: [number, number] = [cx + (R - tVis / 2) * Math.cos(a), cy + (R - tVis / 2) * Math.sin(a)];

  return (
    <svg
      viewBox="0 0 240 205"
      className="h-auto w-full max-w-[22rem] text-primary"
      fill="none"
      role="img"
      aria-label={`Sección circular rellena: tubo de acero de ${fmt(dMm, 0)} mm por ${fmt(tMm, 1)} mm, núcleo de hormigón y ${numeroBarras} barras de ${fmt(diametroBarraMm, 0)} mm`}
    >
      <CapaMaterial d={circulo(cx, cy, R)} material="acero" rayado />
      <CapaMaterial d={circulo(cx, cy, rInt)} material="hormigon" />
      {Array.from({ length: n }).map((_, i) => {
        const ang = (2 * Math.PI * i) / n - Math.PI / 2;
        return (
          <circle
            key={i}
            cx={cx + rBarras * Math.cos(ang)}
            cy={cy + rBarras * Math.sin(ang)}
            r={rBarra}
            fill="var(--mat-armadura)"
          />
        );
      })}

      {/* Ejes de simetría: en una sección circular cualquier diámetro es principal. */}
      <g stroke="currentColor" strokeWidth="0.6" strokeDasharray="6 2 1.5 2" opacity="0.45">
        <line x1={cx - R - 10} y1={cy} x2={cx + R + 10} y2={cy} />
        <line x1={cx} y1={cy - R - 10} x2={cx} y2={cy + R + 10} />
      </g>

      <Referencia x={232} y={22} anclaje="end" hacia={pared} texto={`t ${fmt(tMm, 1)}`} />
      <Referencia
        x={8}
        y={14}
        hacia={[cx - 2, cy - rBarras]}
        texto={`${numeroBarras} Ø${fmt(diametroBarraMm, 0)}`}
      />
      <CotaH x0={cx - R} x1={cx + R} y={cy + R + 16} texto={`D ${fmt(dMm, 0)} mm`} />
    </svg>
  );
}
