"use client";

import { useId } from "react";
import { CapaMaterial, FlechaCarga } from "@/components/verificaciones/croquis/Primitivas";

interface DiagramaTiranteTerrenoProps {
  /** "pilar" en la zapata aislada, "muro" en la corrida. */
  elemento: "pilar" | "muro";
  /** Brazo h cargado (m). */
  hM?: number;
  /** Canto de la zapata (m). */
  HM?: number;
}

const fmtM = (n: number) => `${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`;

/**
 * Esquema del par tirante–terreno, en alzado y en la gramática de los demás
 * dibujos: el pilar contra la medianera, la losa cuya armadura hace de tirante
 * (T) y el rozamiento que lo frena en la base (F = T). La cota h va del eje del
 * tirante a la base de la zapata, que es el brazo del par; h − H es el tramo
 * de pilar que queda en flexión.
 *
 * No está a escala: sólo muestra qué es cada medida.
 */
export function DiagramaTiranteTerreno({ elemento, hM, HM }: DiagramaTiranteTerrenoProps) {
  const arrowId = useId();

  const xLim = 52;
  const anchoPilar = 22;
  const xPilar2 = xLim + anchoPilar;
  const yLosa1 = 40;
  const yLosa2 = 54;
  const yEje = yLosa1 + 9;
  const yZapata = 156;
  const yBase = 186;
  const xZapataFin = 196;
  const xLosaFin = 270;
  const xCota = 228;

  const contorno = `M${xLim} ${yLosa1} L${xLosaFin} ${yLosa1} L${xLosaFin} ${yLosa2} L${xPilar2} ${yLosa2} L${xPilar2} ${yZapata} L${xZapataFin} ${yZapata} L${xZapataFin} ${yBase} L${xLim} ${yBase} Z`;
  const cota = { stroke: "currentColor", strokeWidth: 1, opacity: 0.75 };
  const valido = (n?: number) => n !== undefined && Number.isFinite(n);

  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox="0 0 300 226" className="h-auto w-full text-primary" fill="none" role="img"
           aria-label="Par tirante–terreno: la losa tira del pilar arriba y el rozamiento lo frena en la base; h va del eje del tirante a la base.">
        <defs>
          <marker id={arrowId} markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0 0 L6 3 L0 6 Z" fill="currentColor" />
          </marker>
        </defs>

        {/* límite de propiedad */}
        <path d={`M${xLim} 12 L${xLim} ${yBase + 22}`} stroke="currentColor" strokeWidth="1" strokeDasharray="5 4" opacity="0.6" />
        <text x={xLim - 4} y={yBase + 20} textAnchor="end" className="fill-current font-mono" fontSize="9.5" opacity="0.7">límite</text>

        {/* losa, pilar y zapata en un solo contorno */}
        <CapaMaterial d={contorno} material="hormigon" />
        {/* armadura de la losa: el tirante */}
        <path d={`M${xLim + 5} ${yEje} L${xLosaFin - 4} ${yEje}`} stroke="var(--mat-armadura)" strokeWidth="2" />
        <text x={xLosaFin - 4} y={yLosa1 - 5} textAnchor="end" className="fill-current font-mono" fontSize="9.5">losa</text>
        <text x={xPilar2 + 6} y={(yLosa2 + yZapata) / 2} className="fill-current font-mono" fontSize="9.5">{elemento}</text>
        <text x={(xPilar2 + xZapataFin) / 2 + 8} y={(yZapata + yBase) / 2 + 4} textAnchor="middle" className="fill-current font-mono" fontSize="9.5">zapata</text>

        {/* fuerzas */}
        <FlechaCarga x={xLim + anchoPilar / 2} y={yLosa1 - 2} largo={24} rotulo="N" />
        <FlechaCarga x={xPilar2 + 78} y={yEje + 18} largo={56} sentido="derecha" />
        <text x={xPilar2 + 50} y={yEje + 32} textAnchor="middle" className="fill-[var(--mat-cota)] font-mono" fontSize="10.5">T</text>
        <FlechaCarga x={xZapataFin - 84} y={yBase + 9} largo={56} sentido="izquierda" />
        <text x={xZapataFin - 56} y={yBase + 24} textAnchor="middle" className="fill-[var(--mat-cota)] font-mono" fontSize="10.5">F = T</text>

        {/* cota h: del eje del tirante a la base */}
        <g {...cota}>
          <path d={`M${xLosaFin - 30} ${yEje} L${xCota + 6} ${yEje}`} strokeDasharray="2 2" />
          <path d={`M${xZapataFin + 4} ${yBase} L${xCota + 6} ${yBase}`} />
          <path d={`M${xCota} ${yEje} L${xCota} ${yBase}`} markerStart={`url(#${arrowId})`} markerEnd={`url(#${arrowId})`} />
        </g>
        <text x={xCota + 18} y={(yEje + yBase) / 2} textAnchor="middle" className="fill-current font-mono" fontSize="10.5"
              transform={`rotate(-90 ${xCota + 18} ${(yEje + yBase) / 2})`}>
          {valido(hM) ? `h = ${fmtM(hM!)}` : "h"}
        </text>
        {/* cota H */}
        <g stroke="currentColor" strokeWidth="0.75" opacity="0.6">
          <path d={`M${xZapataFin + 4} ${yZapata} L${xZapataFin + 16} ${yZapata}`} />
          <path d={`M${xZapataFin + 10} ${yZapata} L${xZapataFin + 10} ${yBase}`} strokeDasharray="2 2" />
        </g>
        <text x={xZapataFin + 14} y={(yZapata + yBase) / 2 + 3} className="fill-current font-mono" fontSize="9.5">H</text>
      </svg>

      <dl className="grid w-full max-w-xs grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-xs text-muted-foreground">
        <dt>h</dt>
        <dd className="text-right text-foreground">eje del tirante → base{valido(hM) ? ` · ${fmtM(hM!)}` : ""}</dd>
        <dt>H</dt>
        <dd className="text-right text-foreground">canto de la zapata{valido(HM) ? ` · ${fmtM(HM!)}` : ""}</dd>
        <dt>h − H</dt>
        <dd className="text-right text-foreground">
          {elemento} en flexión{valido(hM) && valido(HM) ? ` · ${fmtM(hM! - HM!)}` : ""}
        </dd>
      </dl>
    </div>
  );
}
