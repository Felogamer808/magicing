"use client";

import { useId } from "react";
import { CapaMaterial, CargaDistribuida } from "@/components/verificaciones/croquis/Primitivas";

interface DiagramaVuelosVigaProps {
  AM: number;
  BM: number;
  hZapataM: number;
  bVigaM: number;
  /** Canto útil de la parrilla paralela a B (m). */
  dM: number;
}

const fmtM = (n: number) => `${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`;

/**
 * Qué son los "vuelos a los lados de la viga", en la gramática de los demás
 * dibujos: en planta, las dos alas de la zapata de medianería a cada lado de
 * la viga (rayadas); en el corte transversal, esas alas como ménsulas que
 * cuelgan de la viga, empujadas por el terreno, con la sección de flexión
 * (0,15·b dentro de la cara, art. 9.8.2.2) y la de cortante (a d de la cara,
 * art. 6.2.2).
 *
 * No calcula: sólo dibuja la geometría que ya está en los datos.
 */
export function DiagramaVuelosViga({ AM, BM, hZapataM, bVigaM, dM }: DiagramaVuelosVigaProps) {
  const arrowId = useId();
  if (!(AM > 0) || !(BM > 0) || !(bVigaM > 0)) return null;
  const vueloM = Math.max((BM - bVigaM) / 2, 0);

  // ---------------------------------------------------------------- planta
  const P = 120;
  const sP = P / Math.max(AM, BM);
  const px0 = 40;
  const py0 = 30;
  const wA = AM * sP;
  const hB = BM * sP;
  const yV1 = py0 + (hB - bVigaM * sP) / 2;
  const yV2 = yV1 + bVigaM * sP;

  // ----------------------------------------------------------------- corte
  const C = 200;
  const sC = C / BM;
  const cx0 = px0 + wA + 66;
  const cyBase = 150;
  const hZ = Math.max(hZapataM * sC, 18);
  const cyZ = cyBase - hZ;
  const xc1 = cx0 + vueloM * sC;
  const xc2 = xc1 + bVigaM * sC;
  const xFlex = [xc1 + 0.15 * bVigaM * sC, xc2 - 0.15 * bVigaM * sC];
  const dC = dM * sC;
  const conCortante = dM < vueloM;
  const viewW = cx0 + C + 24;

  const cota = { stroke: "currentColor", strokeWidth: 1, opacity: 0.75 };

  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox={`0 0 ${viewW} 196`} className="h-auto w-full text-primary" fill="none" role="img"
           aria-label="Vuelos de la zapata de medianería a los dos lados de la viga centradora, en planta y en corte.">
        <defs>
          <marker id={arrowId} markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0 0 L6 3 L0 6 Z" fill="currentColor" />
          </marker>
        </defs>

        {/* ============ planta ============ */}
        <text x={px0} y={14} className="fill-current font-mono" fontSize="10.5">Planta</text>
        <CapaMaterial x={px0} y={py0} ancho={wA} alto={yV1 - py0} material="hormigon" rayado />
        <CapaMaterial x={px0} y={yV2} ancho={wA} alto={py0 + hB - yV2} material="hormigon" rayado />
        {/* viga: entra por el centro y sigue hacia la zapata interior */}
        <CapaMaterial x={px0} y={yV1} ancho={wA + 26} alto={yV2 - yV1} material="hormigon" />
        <text x={px0 + wA + 4} y={yV1 - 4} className="fill-current font-mono" fontSize="9.5">viga →</text>
        {/* límite */}
        <path d={`M${px0} ${py0 - 8} L${px0} ${py0 + hB + 8}`} stroke="currentColor" strokeWidth="1" strokeDasharray="5 4" opacity="0.6" />
        {/* traza del corte */}
        <path d={`M${px0 + wA / 2} ${py0 - 10} L${px0 + wA / 2} ${py0 + hB + 10}`} stroke="var(--mat-cota)" strokeWidth="1" strokeDasharray="6 3" />
        <text x={px0 + wA / 2 + 3} y={py0 - 4} className="fill-[var(--mat-cota)] font-mono" fontSize="9.5">corte</text>
        {/* cotas */}
        <g {...cota}>
          <path d={`M${px0} ${py0 + hB + 14} L${px0 + wA} ${py0 + hB + 14}`} markerStart={`url(#${arrowId})`} markerEnd={`url(#${arrowId})`} />
          <path d={`M${px0 - 12} ${py0} L${px0 - 12} ${py0 + hB}`} markerStart={`url(#${arrowId})`} markerEnd={`url(#${arrowId})`} />
        </g>
        <text x={px0 + wA / 2} y={py0 + hB + 27} textAnchor="middle" className="fill-current font-mono" fontSize="10.5">A = {fmtM(AM)}</text>
        <text x={px0 - 18} y={py0 + hB / 2} textAnchor="middle" className="fill-current font-mono" fontSize="10.5"
              transform={`rotate(-90 ${px0 - 18} ${py0 + hB / 2})`}>B = {fmtM(BM)}</text>

        {/* ============ corte en la dirección B ============ */}
        <text x={cx0} y={14} className="fill-current font-mono" fontSize="10.5">Corte (dirección B)</text>
        <CapaMaterial x={cx0} y={cyZ} ancho={xc1 - cx0} alto={hZ} material="hormigon" rayado />
        <CapaMaterial x={xc2} y={cyZ} ancho={cx0 + C - xc2} alto={hZ} material="hormigon" rayado />
        <CapaMaterial x={xc1} y={cyZ} ancho={xc2 - xc1} alto={hZ} material="hormigon" />
        {/* viga, que hace de pilar */}
        <CapaMaterial x={xc1} y={cyZ - 46} ancho={xc2 - xc1} alto={46} material="hormigon" />
        <text x={(xc1 + xc2) / 2} y={cyZ - 52} textAnchor="middle" className="fill-current font-mono" fontSize="9.5">viga</text>
        {/* presión del terreno */}
        <CargaDistribuida x0={cx0 + 6} x1={cx0 + C - 6} y={cyBase + 1} alto={16} flechas={9} sentido="arriba" />
        {/* sección de flexión */}
        {xFlex.map((x) => (
          <path key={x} d={`M${x} ${cyZ - 6} L${x} ${cyBase + 2}`} stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" />
        ))}
        {/* sección de cortante, a d de la cara */}
        {conCortante &&
          [xc1 - dC, xc2 + dC].map((x) => (
            <path key={x} d={`M${x} ${cyZ - 6} L${x} ${cyBase + 2}`} stroke="var(--mat-cota)" strokeWidth="1.2" strokeDasharray="3 2" />
          ))}
        {/* cotas de los vuelos */}
        <g {...cota}>
          <path d={`M${cx0} ${cyBase + 30} L${xc1} ${cyBase + 30}`} markerStart={`url(#${arrowId})`} markerEnd={`url(#${arrowId})`} />
          <path d={`M${xc2} ${cyBase + 30} L${cx0 + C} ${cyBase + 30}`} markerStart={`url(#${arrowId})`} markerEnd={`url(#${arrowId})`} />
        </g>
        <text x={(cx0 + xc1) / 2} y={cyBase + 43} textAnchor="middle" className="fill-current font-mono" fontSize="10.5">vuelo</text>
        <text x={(xc2 + cx0 + C) / 2} y={cyBase + 43} textAnchor="middle" className="fill-current font-mono" fontSize="10.5">vuelo</text>
      </svg>

      <dl className="grid w-full max-w-sm grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-xs text-muted-foreground">
        <dt>Vuelo (rayado)</dt>
        <dd className="text-right text-foreground">{fmtM(vueloM)} a cada lado</dd>
        <dt>Viga</dt>
        <dd className="text-right text-foreground">b = {fmtM(bVigaM)}, hace de pilar</dd>
        <dt>Flexión</dt>
        <dd className="text-right text-foreground">a 0,15·b dentro de la cara</dd>
        <dt>Cortante</dt>
        <dd className="text-right text-foreground">
          {conCortante ? `a d = ${fmtM(dM)} de la cara` : "la sección a d cae fuera del vuelo"}
        </dd>
        <dt>Estribos</dt>
        <dd className="text-right text-foreground">no tiene: lo toma el hormigón</dd>
      </dl>
    </div>
  );
}
