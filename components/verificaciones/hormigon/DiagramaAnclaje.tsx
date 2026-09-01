"use client";

import { useId } from "react";
import type { FormaAnclaje } from "@/lib/calc/hormigon/comun/anclaje";
import { fmt } from "@/lib/verificaciones/formato";

interface DiagramaAnclajeProps {
  diametroMm: number;
  forma: FormaAnclaje;
  lbdMm: number;
  mandrilMinMm: number;
}

/**
 * La barra entrando en el hormigón, a escala: la longitud dibujada es
 * proporcional a lbd, no un esquema fijo. Con gancho, el codo se dibuja a
 * partir del final de ese tramo recto —el mandril marca el radio, con un
 * mínimo visual para que no desaparezca en diámetros chicos— pero el codo en
 * sí no está a escala ni cuenta como parte de lbd acotada.
 */
export function DiagramaAnclaje({ diametroMm, forma, lbdMm, mandrilMinMm }: DiagramaAnclajeProps) {
  const arrowId = useId();
  const esGancho = forma === "gancho";

  const PLANO_W = 190;
  const escala = PLANO_W / Math.max(lbdMm, 1);
  const lbdPx = lbdMm * escala;

  const X0 = 14;
  const xFace = X0 + 18;
  const xEnd = xFace + lbdPx;

  const rHook = esGancho ? Math.min(Math.max((mandrilMinMm / 2) * escala, 6), 16) : 0;
  const colaHook = esGancho ? Math.min(Math.max(diametroMm * escala * 1.3, 8), 14) : 0;

  const yDim = 16;
  const yConcTop = 26;
  const altoConc = esGancho ? 76 : 54;
  const yConcBot = yConcTop + altoConc;
  const yBar = yConcTop + 27;

  const anchoConc = lbdPx + (esGancho ? rHook + 16 : 16);
  const ancho = xFace + anchoConc + 14;
  const alto = yConcBot + 14;

  const nHatch = Math.max(3, Math.round(anchoConc / 14));

  return (
    <div className="flex flex-col items-center gap-2">
      <svg viewBox={`0 0 ${ancho} ${alto}`} className="h-auto w-full max-w-[17rem] text-primary" fill="none" aria-hidden="true">
        <defs>
          <marker id={arrowId} markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0 0 L6 3 L0 6 Z" fill="currentColor" />
          </marker>
          <clipPath id={`${arrowId}-clip`}>
            <rect x={xFace} y={yConcTop} width={anchoConc} height={altoConc} />
          </clipPath>
        </defs>

        {/* hormigón donde ancla la barra */}
        <rect
          x={xFace}
          y={yConcTop}
          width={anchoConc}
          height={altoConc}
          stroke="currentColor"
          strokeWidth="1.6"
          fill="var(--color-muted)"
          fillOpacity="0.4"
        />
        <g clipPath={`url(#${arrowId}-clip)`} stroke="currentColor" strokeWidth="0.5" opacity="0.28">
          {Array.from({ length: nHatch }, (_, i) => {
            const x = xFace + 6 + i * 14;
            return <path key={i} d={`M${x} ${yConcBot} L${x + altoConc * 0.55} ${yConcTop}`} />;
          })}
        </g>

        {/* tramo libre de la barra, antes de entrar */}
        <path d={`M${X0} ${yBar} L${xFace} ${yBar}`} stroke="currentColor" strokeWidth="2.4" strokeDasharray="4 3" opacity="0.6" />

        {/* tramo anclado, longitud lbd */}
        <path d={`M${xFace} ${yBar} L${xEnd} ${yBar}`} stroke="currentColor" strokeWidth="3.2" />

        {/* gancho a 90°, más allá de lbd */}
        {esGancho && (
          <path
            d={`M${xEnd} ${yBar} A ${rHook} ${rHook} 0 0 1 ${xEnd + rHook} ${yBar + rHook} L${xEnd + rHook} ${yBar + rHook + colaHook}`}
            stroke="currentColor"
            strokeWidth="3.2"
          />
        )}

        {/* cota lbd */}
        <g stroke="currentColor" strokeWidth="1" opacity="0.8">
          <path d={`M${xFace} ${yDim - 5} L${xFace} ${yDim + 4}`} />
          <path d={`M${xEnd} ${yDim - 5} L${xEnd} ${yDim + 4}`} />
          <path d={`M${xFace} ${yDim} L${xEnd} ${yDim}`} markerStart={`url(#${arrowId})`} markerEnd={`url(#${arrowId})`} />
        </g>
        <text x={(xFace + xEnd) / 2} y={yDim - 7} textAnchor="middle" className="fill-current font-mono" fontSize="10">
          lbd = {fmt(lbdMm, 0)} mm
        </text>

        <text x={X0} y={yBar - 8} className="fill-current font-mono" fontSize="9.5" opacity="0.85">
          Ø{fmt(diametroMm, 0)}
        </text>
      </svg>
      <p className="text-center text-[11.5px] leading-snug text-muted-foreground">
        {esGancho
          ? "El codo se dibuja después de lbd, a modo de detalle: no está a escala ni se descuenta de la longitud acotada."
          : "Anclaje recto: la barra sigue derecha hasta el final de lbd."}
      </p>
    </div>
  );
}

interface DiagramaSolapeProps {
  diametroMm: number;
  l0Mm: number;
}

/**
 * Dos barras solapadas en línea: la que llega termina donde la que sigue ya
 * arrancó, y la zona donde coexisten las dos es l0. Se separan un poco en
 * vertical sólo para que se distingan en el dibujo — en la sección real van
 * lado a lado, no una arriba de la otra.
 */
export function DiagramaSolape({ diametroMm, l0Mm }: DiagramaSolapeProps) {
  const arrowId = useId();

  const PLANO_W = 150;
  const escala = PLANO_W / Math.max(l0Mm, 1);
  const l0Px = l0Mm * escala;

  const colaA = 16;
  const colaB = 22;
  const xSolInicio = colaA + 10;
  const xSolFin = xSolInicio + l0Px;

  const yDim = 14;
  const yBarA = 30;
  const yBarB = yBarA + 11;

  const ancho = xSolFin + colaB + 10;
  const alto = yBarB + 14;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg viewBox={`0 0 ${ancho} ${alto}`} className="h-auto w-full max-w-[15rem] text-primary" fill="none" aria-hidden="true">
        <defs>
          <marker id={arrowId} markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0 0 L6 3 L0 6 Z" fill="currentColor" />
          </marker>
        </defs>

        {/* barra que llega, termina al final de la zona de solape */}
        <path d={`M0 ${yBarA} L${xSolFin} ${yBarA}`} stroke="currentColor" strokeWidth="3.2" />
        {/* barra que sigue, arranca al principio de la zona de solape */}
        <path d={`M${xSolInicio} ${yBarB} L${xSolFin + colaB} ${yBarB}`} stroke="currentColor" strokeWidth="3.2" />

        {/* zona de solape, sombreada */}
        <rect x={xSolInicio} y={yBarA - 3} width={l0Px} height={yBarB - yBarA + 6} fill="currentColor" opacity="0.08" />

        <g stroke="currentColor" strokeWidth="1" opacity="0.8">
          <path d={`M${xSolInicio} ${yDim - 5} L${xSolInicio} ${yDim + 4}`} />
          <path d={`M${xSolFin} ${yDim - 5} L${xSolFin} ${yDim + 4}`} />
          <path d={`M${xSolInicio} ${yDim} L${xSolFin} ${yDim}`} markerStart={`url(#${arrowId})`} markerEnd={`url(#${arrowId})`} />
        </g>
        <text x={(xSolInicio + xSolFin) / 2} y={yDim - 7} textAnchor="middle" className="fill-current font-mono" fontSize="10">
          l0 = {fmt(l0Mm, 0)} mm
        </text>
        <text x={0} y={yBarA - 6} className="fill-current font-mono" fontSize="9.5" opacity="0.85">
          Ø{fmt(diametroMm, 0)}
        </text>
      </svg>
      <p className="text-center text-[11.5px] leading-snug text-muted-foreground">
        Las dos barras se separan en el dibujo sólo para que se vean: en la sección real van lado a
        lado, con la separación libre máxima de 4Ø del art. 8.7.2(3).
      </p>
    </div>
  );
}
