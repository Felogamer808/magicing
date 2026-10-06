"use client";

import { fmt } from "@/lib/verificaciones/formato";

interface DiagramaTiranteTerrenoProps {
  /** "pilar" en la zapata aislada, "muro" en la corrida. */
  elemento: "pilar" | "muro";
  /** Brazo h cargado (m), para rotular la cota. */
  hM?: number;
  /** Canto de la zapata (m), para rotular. */
  HM?: number;
}

/**
 * Esquema del par tirante–terreno, en alzado: el pilar contra la medianera,
 * la losa que tira de él arriba (T) y el rozamiento que lo frena en la base
 * (F = T). La cota h va del eje del tirante a la base de la zapata, que es el
 * brazo del par; h − H es el tramo de pilar que queda en flexión.
 *
 * No está a escala: sólo muestra qué es cada medida.
 */
export function DiagramaTiranteTerreno({ elemento, hM, HM }: DiagramaTiranteTerrenoProps) {
  const xLim = 40;
  const anchoPilar = 22;
  const xPilar2 = xLim + anchoPilar;
  const yLosa1 = 40;
  const yLosa2 = 52;
  const yEje = (yLosa1 + yLosa2) / 2;
  const yZapata = 160;
  const yBase = 196;
  const xZapataFin = 200;
  const xLosaFin = 300;
  const xCota = 250;

  const flecha = (x1: number, y1: number, x2: number, y2: number) => {
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const a = 7;
    const p1 = [x2 - a * Math.cos(ang - 0.45), y2 - a * Math.sin(ang - 0.45)];
    const p2 = [x2 - a * Math.cos(ang + 0.45), y2 - a * Math.sin(ang + 0.45)];
    return `M${x1} ${y1} L${x2} ${y2} M${p1[0]} ${p1[1]} L${x2} ${y2} L${p2[0]} ${p2[1]}`;
  };

  return (
    <svg viewBox="0 0 340 256" className="h-auto w-full text-primary" fill="none" aria-hidden="true">
      {/* medianera */}
      <path d={`M${xLim} 10 L${xLim} ${yBase + 24}`} stroke="currentColor" strokeWidth="1.2" strokeDasharray="5 4" opacity="0.6" />
      <text x={xLim - 4} y={yBase + 22} textAnchor="end" className="fill-current font-mono" fontSize="9" opacity="0.7">límite</text>

      {/* losa, con la armadura que hace de tirante */}
      <rect x={xLim} y={yLosa1} width={xLosaFin - xLim} height={yLosa2 - yLosa1} stroke="currentColor" strokeWidth="1.4" fill="var(--color-muted)" fillOpacity="0.5" />
      <path d={`M${xLim + 4} ${yEje} L${xLosaFin} ${yEje}`} stroke="var(--color-destructive)" strokeWidth="1.2" strokeDasharray="6 3" />
      <text x={xLosaFin - 2} y={yLosa1 - 4} textAnchor="end" className="fill-current font-mono" fontSize="9">losa</text>

      {/* pilar o muro */}
      <rect x={xLim} y={yLosa2} width={anchoPilar} height={yZapata - yLosa2} stroke="currentColor" strokeWidth="1.6" fill="var(--color-muted)" fillOpacity="0.8" />
      <text x={xPilar2 + 4} y={(yLosa2 + yZapata) / 2 + 14} className="fill-current font-mono" fontSize="9">{elemento}</text>

      {/* zapata */}
      <rect x={xLim} y={yZapata} width={xZapataFin - xLim} height={yBase - yZapata} stroke="currentColor" strokeWidth="1.8" fill="var(--color-muted)" fillOpacity="0.5" />
      <text x={(xLim + xZapataFin) / 2 + 20} y={(yZapata + yBase) / 2 + 3} textAnchor="middle" className="fill-current font-mono" fontSize="9">zapata</text>

      {/* fuerzas */}
      <path d={flecha(xLim + anchoPilar / 2, 4, xLim + anchoPilar / 2, yLosa1 - 3)} stroke="currentColor" strokeWidth="1.5" />
      <text x={xLim + anchoPilar / 2 + 6} y={16} className="fill-current font-mono" fontSize="10">N</text>
      <path d={flecha(xPilar2 + 10, yEje, xPilar2 + 70, yEje)} stroke="var(--color-destructive)" strokeWidth="1.8" />
      <text x={xPilar2 + 40} y={yLosa1 - 6} textAnchor="middle" className="font-mono" fontSize="10" fill="var(--color-destructive)">T (tirante)</text>
      <path d={flecha(xZapataFin - 20, yBase + 8, xZapataFin - 80, yBase + 8)} stroke="var(--color-destructive)" strokeWidth="1.8" />
      <text x={xZapataFin - 50} y={yBase + 50} textAnchor="middle" className="font-mono" fontSize="10" fill="var(--color-destructive)">F = T (rozamiento)</text>
      {/* presión uniforme */}
      {Array.from({ length: 6 }, (_, i) => xLim + 12 + (i * (xZapataFin - xLim - 24)) / 5).map((x) => (
        <path key={x} d={flecha(x, yBase + 34, x, yBase + 3)} stroke="currentColor" strokeWidth="0.9" opacity="0.45" />
      ))}

      {/* cota h: del eje del tirante a la base */}
      <path d={`M${xLosaFin - 40} ${yEje} L${xCota + 8} ${yEje} M${xZapataFin} ${yBase} L${xCota + 8} ${yBase}`} stroke="currentColor" strokeWidth="0.7" opacity="0.6" />
      <path d={flecha(xCota, (yEje + yBase) / 2, xCota, yEje + 1)} stroke="currentColor" strokeWidth="1.2" />
      <path d={flecha(xCota, (yEje + yBase) / 2, xCota, yBase - 1)} stroke="currentColor" strokeWidth="1.2" />
      <text x={xCota + 6} y={(yEje + yBase) / 2 + 4} className="fill-current font-mono" fontSize="11">
        h{hM !== undefined && Number.isFinite(hM) ? ` = ${fmt(hM, 2)} m` : ""}
      </text>
      {/* cota H */}
      <path d={`M${xZapataFin + 10} ${yZapata} L${xZapataFin + 22} ${yZapata} M${xZapataFin + 16} ${yZapata} L${xZapataFin + 16} ${yBase}`} stroke="currentColor" strokeWidth="0.8" opacity="0.7" />
      <text x={xZapataFin + 20} y={yZapata + 14} className="fill-current font-mono" fontSize="9" opacity="0.8">
        H{HM !== undefined && Number.isFinite(HM) ? ` = ${fmt(HM, 2)}` : ""}
      </text>
    </svg>
  );
}
