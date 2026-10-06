"use client";

import { useId } from "react";
import { CapaMaterial } from "@/components/verificaciones/croquis/Primitivas";

interface PilarPlanta {
  posicionM: number;
  anchoLargoM: number;
  anchoAnchoM: number;
  nk: number;
}

interface PlantaZapataCombinadaProps {
  LM: number;
  BM: number;
  pilares: readonly PilarPlanta[];
  /** Cara de los pilares al borde de la medianera (m). Sin dato, centrados. */
  distanciaBordeBM?: number;
}

const fmtM = (n: number) => `${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`;

/**
 * Planta de la zapata combinada en la gramática de la sección de viga: la
 * zapata y los pilares en hormigón, la medianera punteada cuando los pilares
 * están contra ella, cotas con flecha y la posición de cada pilar medida desde
 * el borde izquierdo.
 */
export function PlantaZapataCombinada({ LM, BM, pilares, distanciaBordeBM }: PlantaZapataCombinadaProps) {
  const arrowId = useId();
  if (!(LM > 0) || !(BM > 0)) return null;

  const MAX_W = 250;
  const MAX_H = 120;
  const escala = Math.min(MAX_W / LM, MAX_H / BM);
  const w = LM * escala;
  const h = BM * escala;
  const x0 = 44;
  const y0 = 54;
  const x1 = x0 + w;
  const y1 = y0 + h;
  const cota = { stroke: "currentColor", strokeWidth: 1, opacity: 0.75 };
  const contraMedianera = distanciaBordeBM !== undefined && distanciaBordeBM <= 1e-9;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox={`0 0 ${x1 + 30} ${y1 + 40}`} className="h-auto w-full text-primary" fill="none" role="img"
           aria-label={`Zapata combinada de ${fmtM(LM)} por ${fmtM(BM)} con dos pilares.`}>
        <defs>
          <marker id={arrowId} markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0 0 L6 3 L0 6 Z" fill="currentColor" />
          </marker>
        </defs>

        <CapaMaterial x={x0} y={y0} ancho={w} alto={h} material="hormigon" />
        {contraMedianera && (
          <>
            <path d={`M${x0 - 10} ${y0} L${x1 + 10} ${y0}`} stroke="currentColor" strokeWidth="1" strokeDasharray="5 4" opacity="0.6" />
            <text x={(x0 + x1) / 2} y={y0 - 4} textAnchor="middle" className="fill-current font-mono" fontSize="9.5" opacity="0.7">medianera</text>
          </>
        )}

        {pilares.map((p, i) => {
          const cL = Math.max(p.anchoLargoM * escala, 4);
          const cB = Math.max(p.anchoAnchoM * escala, 4);
          const borde = distanciaBordeBM ?? (BM - p.anchoAnchoM) / 2;
          const px = x0 + p.posicionM * escala - cL / 2;
          const py = y0 + Math.min(borde * escala, h - cB);
          return (
            <g key={i}>
              <CapaMaterial x={px} y={py} ancho={cL} alto={cB} material="hormigon" rayado />
              <text x={px + cL / 2} y={y1 + 14} textAnchor="middle" className="fill-current font-mono" fontSize="10.5">
                P{i + 1} · {Math.round(p.nk)} kN
              </text>
              {/* posición del eje, desde el borde izquierdo */}
              <g stroke="currentColor" strokeWidth="0.75" opacity="0.6">
                <path d={`M${x0} ${y0 - 22 - i * 14} L${x0 + p.posicionM * escala} ${y0 - 22 - i * 14}`} strokeDasharray="2 2" />
                <path d={`M${x0 + p.posicionM * escala} ${y0 - 26 - i * 14} L${x0 + p.posicionM * escala} ${py}`} strokeDasharray="1 2" />
              </g>
              <text x={x0 + (p.posicionM * escala) / 2} y={y0 - 25 - i * 14} textAnchor="middle" className="fill-current font-mono" fontSize="9.5">
                x{i + 1} = {fmtM(p.posicionM)}
              </text>
            </g>
          );
        })}

        {/* cotas L y B */}
        <g {...cota}>
          <path d={`M${x0} ${y1 + 22} L${x1} ${y1 + 22}`} markerStart={`url(#${arrowId})`} markerEnd={`url(#${arrowId})`} />
          <path d={`M${x0 - 12} ${y0} L${x0 - 12} ${y1}`} markerStart={`url(#${arrowId})`} markerEnd={`url(#${arrowId})`} />
        </g>
        <text x={(x0 + x1) / 2} y={y1 + 34} textAnchor="middle" className="fill-current font-mono" fontSize="10.5">L = {fmtM(LM)}</text>
        <text x={x0 - 18} y={(y0 + y1) / 2} textAnchor="middle" className="fill-current font-mono" fontSize="10.5"
              transform={`rotate(-90 ${x0 - 18} ${(y0 + y1) / 2})`}>B = {fmtM(BM)}</text>
      </svg>
    </div>
  );
}
