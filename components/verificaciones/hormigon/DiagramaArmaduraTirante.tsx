"use client";

import { useId } from "react";
import { CapaMaterial, FlechaCarga } from "@/components/verificaciones/croquis/Primitivas";

interface DiagramaArmaduraTiranteProps {
  /** "pilar" en la zapata aislada, "muro" en la corrida. */
  elemento: "pilar" | "muro";
  /** Ancho del pilar o espesor del muro en la dirección del tirante (m). */
  anchoApoyoM: number;
  recubrimientoM: number;
  patilla: boolean;
  pataMm: number;
  lbdMm: number;
  disponibleMm: number;
  verificaAnclaje: boolean;
  /** Filas del resumen al pie. */
  resumen: readonly { etiqueta: string; valor: string }[];
}

const fmtMm = (n: number) => `${Math.round(n).toLocaleString("es-AR")} mm`;

/**
 * Nudo del tirante con el pilar de medianera, en alzado y en la gramática de
 * la sección de viga: la losa y el pilar en hormigón, la barra del tirante en
 * color de armadura y, encima, el largo de anclaje necesario lbd medido sobre
 * el eje de la barra desde la cara interior del pilar (art. 8.4.3 (3)). Si lbd
 * no entra en lo disponible, lo que sobra se dibuja en rojo más allá de la
 * punta de la barra.
 *
 * A escala en horizontal; la losa y el pilar, de alto fijo.
 */
export function DiagramaArmaduraTirante({
  elemento,
  anchoApoyoM,
  recubrimientoM,
  patilla,
  pataMm,
  lbdMm,
  disponibleMm,
  verificaAnclaje,
  resumen,
}: DiagramaArmaduraTiranteProps) {
  const arrowId = useId();
  if (!(anchoApoyoM > 0)) return null;

  const LOSA_INTERIOR_M = 0.6;
  const W = 230;
  const k = W / (anchoApoyoM + LOSA_INTERIOR_M); // px por metro
  const kMm = k / 1000;
  const xLim = 44;
  const xCara = xLim + anchoApoyoM * k;
  const xFin = xLim + W;
  const yLosa1 = 46;
  const yLosa2 = 82;
  const yPilarFin = 200;
  const rec = Math.max(recubrimientoM * k, 5);
  const yBarra = yLosa1 + rec;
  const xPunta = xLim + rec;
  const pataPx = patilla ? Math.min(pataMm * kMm, yPilarFin - yBarra - 8) : 0;

  const contorno = `M${xLim} ${yLosa1} L${xFin} ${yLosa1} L${xFin} ${yLosa2} L${xCara} ${yLosa2} L${xCara} ${yPilarFin} L${xLim} ${yPilarFin} Z`;
  const barra = patilla
    ? `M${xFin - 4} ${yBarra} L${xPunta} ${yBarra} L${xPunta} ${yBarra + pataPx}`
    : `M${xFin - 4} ${yBarra} L${xPunta} ${yBarra}`;

  // lbd sobre el eje de la barra, desde la cara interior hacia la punta.
  const horizontalPx = xCara - xPunta;
  const lbdPx = lbdMm * kMm;
  const tramoH = Math.min(lbdPx, horizontalPx);
  const tramoV = patilla ? Math.min(Math.max(lbdPx - horizontalPx, 0), pataPx) : 0;
  const sobra = Math.max(lbdMm - disponibleMm, 0) * kMm;
  const yAnclaje = yBarra - 7;
  let lbdTrazo = `M${xCara} ${yAnclaje} L${xCara - tramoH} ${yAnclaje}`;
  if (tramoV > 0) lbdTrazo += ` L${xPunta - 7} ${yAnclaje} L${xPunta - 7} ${yBarra + tramoV}`;
  const sobraTrazo =
    sobra > 0
      ? patilla
        ? `M${xPunta - 7} ${yBarra + pataPx} L${xPunta - 7} ${yBarra + pataPx + sobra}`
        : `M${xPunta} ${yAnclaje} L${xPunta - sobra} ${yAnclaje}`
      : null;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox={`0 0 ${xFin + 24} ${yPilarFin + 40}`} className="h-auto w-full text-primary" fill="none" role="img"
           aria-label={`Anclaje del tirante en el ${elemento}: necesita ${fmtMm(lbdMm)} y dispone de ${fmtMm(disponibleMm)}.`}>
        <defs>
          <marker id={arrowId} markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0 0 L6 3 L0 6 Z" fill="currentColor" />
          </marker>
        </defs>

        {/* límite */}
        <path d={`M${xLim} 18 L${xLim} ${yPilarFin + 14}`} stroke="currentColor" strokeWidth="1" strokeDasharray="5 4" opacity="0.6" />
        <text x={xLim - 4} y={yPilarFin + 12} textAnchor="end" className="fill-current font-mono" fontSize="9.5" opacity="0.7">límite</text>

        <CapaMaterial d={contorno} material="hormigon" />
        <text x={xFin - 4} y={yLosa2 + 13} textAnchor="end" className="fill-current font-mono" fontSize="9.5">losa</text>
        <text x={(xLim + xCara) / 2} y={yPilarFin - 8} textAnchor="middle" className="fill-current font-mono" fontSize="9.5">{elemento}</text>

        {/* cara interior: desde ahí se mide el anclaje */}
        <path d={`M${xCara} ${yLosa1 - 4} L${xCara} ${yPilarFin}`} stroke="currentColor" strokeWidth="0.75" strokeDasharray="2 2" opacity="0.6" />
        <text x={xCara + 4} y={yLosa2 + 13} className="fill-current font-mono" fontSize="9.5" opacity="0.8">cara interior</text>

        {/* tirante */}
        <path d={barra} stroke="var(--mat-armadura)" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
        <FlechaCarga x={xFin + 18} y={yBarra} largo={20} sentido="derecha" />
        <text x={xFin + 8} y={yBarra - 8} textAnchor="middle" className="fill-[var(--mat-cota)] font-mono" fontSize="10.5">Td</text>

        {/* lbd necesario, sobre el eje de la barra */}
        <path d={lbdTrazo} stroke="var(--mat-cota)" strokeWidth="1.6" />
        {sobraTrazo && <path d={sobraTrazo} stroke="var(--destructive)" strokeWidth="1.8" strokeDasharray="3 2" />}
        <text x={(xCara + xPunta) / 2} y={yAnclaje - 5} textAnchor="middle" className="fill-[var(--mat-cota)] font-mono" fontSize="10.5">
          lbd = {fmtMm(lbdMm)}
        </text>

        {/* disponible, abajo del pilar */}
        <g stroke="currentColor" strokeWidth="1" opacity="0.75">
          <path d={`M${xPunta} ${yPilarFin + 10} L${xCara} ${yPilarFin + 10}`} markerStart={`url(#${arrowId})`} markerEnd={`url(#${arrowId})`} />
        </g>
        <text x={xCara + 6} y={yPilarFin + 14} className="fill-current font-mono" fontSize="10.5">
          {patilla ? `${fmtMm(disponibleMm - pataMm)} + pata` : fmtMm(disponibleMm)}
        </text>
        {!verificaAnclaje && (
          <text x={xCara + 6} y={yPilarFin + 28} fill="var(--destructive)" className="font-mono" fontSize="9.5">
            faltan {fmtMm(lbdMm - disponibleMm)} de anclaje
          </text>
        )}
      </svg>

      <dl className="grid w-full max-w-xs grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-xs text-muted-foreground">
        {resumen.map((f) => (
          <div key={f.etiqueta} className="contents">
            <dt>{f.etiqueta}</dt>
            <dd className="text-right text-foreground">{f.valor}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
