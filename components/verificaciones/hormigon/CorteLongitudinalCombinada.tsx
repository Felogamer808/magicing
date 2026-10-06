"use client";

import { useId } from "react";
import { CapaMaterial, FlechaCarga } from "@/components/verificaciones/croquis/Primitivas";

interface PilarCorte {
  posicionM: number;
  anchoLargoM: number;
}

interface PuntoM {
  xM: number;
  mKNm: number;
}

interface CorteLongitudinalCombinadaProps {
  LM: number;
  HM: number;
  recubrimientoM: number;
  pilares: readonly PilarCorte[];
  diametroInferiorMm: number;
  diametroSuperiorMm: number;
  /** Barras transversales vistas de punta, por metro. */
  separacionTransversalM: number;
  diametroTransversalMm: number;
  /** Diagrama de momentos de cálculo, si ya hay resultado. */
  momentos?: readonly PuntoM[];
  resumen: readonly { etiqueta: string; valor: string }[];
}

const fmtM = (n: number) => `${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`;
const fmtKNm = (n: number) => `${n.toLocaleString("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kN·m`;

function radioDe(diametroMm: number): number {
  return Math.max(2.2, Math.min(5, diametroMm * 0.25));
}

/**
 * Corte longitudinal de la zapata combinada, en la gramática de la sección de
 * viga: los pilares y la zapata en hormigón, la armadura inferior y la
 * superior a lo largo, las transversales de punta sobre la inferior, y debajo,
 * a la misma escala horizontal, el diagrama de momentos: abajo de la línea
 * tracciona la cara inferior, arriba la superior, que es como se lee qué
 * armadura trabaja en cada tramo.
 */
export function CorteLongitudinalCombinada({
  LM,
  HM,
  recubrimientoM,
  pilares,
  diametroInferiorMm,
  diametroSuperiorMm,
  separacionTransversalM,
  diametroTransversalMm,
  momentos,
  resumen,
}: CorteLongitudinalCombinadaProps) {
  const arrowId = useId();
  if (!(LM > 0) || !(HM > 0)) return null;

  const W = 250;
  const k = W / LM;
  const x0 = 44;
  const x1 = x0 + W;
  const ALTO_PILAR = 30;
  const yZ = 40 + ALTO_PILAR;
  const h = Math.max(HM * k, 34);
  const y1 = yZ + h;
  const rec = Math.max(recubrimientoM * (h / HM), 5);
  const rT = radioDe(diametroTransversalMm);
  const yInf = y1 - rec;
  const ySup = yZ + rec;
  const yT = yInf - 2 - rT;
  const nT = Math.min(Math.max(Math.round(LM / separacionTransversalM), 2), 60);
  const xsT = Array.from({ length: nT }, (_, i) => x0 + rec + rT + (i * (W - 2 * rec - 2 * rT)) / (nT - 1));

  // Diagrama de momentos, debajo y a la misma escala horizontal.
  const yEje = y1 + 90;
  const mMaxAbs = momentos && momentos.length ? Math.max(...momentos.map((p) => Math.abs(p.mKNm)), 1e-9) : 1;
  const kM = 40 / mMaxAbs;
  // M+ (tracciona abajo) se dibuja hacia abajo, del lado de la cara traccionada.
  const yM = (m: number) => yEje + m * kM;
  const curva = momentos?.map((p, i) => `${i === 0 ? "M" : "L"}${x0 + p.xM * k} ${yM(p.mKNm)}`).join(" ");
  const extremo = (signo: 1 | -1) => {
    if (!momentos?.length) return null;
    const p = momentos.reduce((a, b) => (signo * b.mKNm > signo * a.mKNm ? b : a));
    return signo * p.mKNm > 1e-6 ? p : null;
  };
  const mPos = extremo(1);
  const mNeg = extremo(-1);
  const alto = momentos?.length ? yEje + 62 : y1 + 30;
  const cota = { stroke: "currentColor", strokeWidth: 1, opacity: 0.75 };

  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox={`0 0 ${x1 + 34} ${alto}`} className="h-auto w-full text-primary" fill="none" role="img"
           aria-label={`Corte longitudinal de la zapata combinada de ${fmtM(LM)} con su armadura y el diagrama de momentos.`}>
        <defs>
          <marker id={arrowId} markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0 0 L6 3 L0 6 Z" fill="currentColor" />
          </marker>
        </defs>

        <CapaMaterial x={x0} y={yZ} ancho={W} alto={h} material="hormigon" />
        {pilares.map((p, i) => {
          const c = Math.max(p.anchoLargoM * k, 6);
          const px = x0 + p.posicionM * k - c / 2;
          return (
            <g key={i}>
              <CapaMaterial x={px} y={yZ - ALTO_PILAR} ancho={c} alto={ALTO_PILAR} material="hormigon" />
              <FlechaCarga x={px + c / 2} y={yZ - ALTO_PILAR - 2} largo={16} rotulo={`P${i + 1}`} />
            </g>
          );
        })}

        {/* armadura: superior, inferior y transversal de punta */}
        <path d={`M${x0 + rec} ${ySup} L${x1 - rec} ${ySup}`} stroke="var(--mat-armadura)" strokeWidth={Math.max(1.6, radioDe(diametroSuperiorMm) * 0.7)} strokeLinecap="round" />
        <path d={`M${x0 + rec} ${yInf} L${x1 - rec} ${yInf}`} stroke="var(--mat-armadura)" strokeWidth={Math.max(1.6, radioDe(diametroInferiorMm) * 0.7)} strokeLinecap="round" />
        {xsT.map((x) => (
          <circle key={x} cx={x} cy={yT} r={rT} fill="var(--mat-armadura)" />
        ))}
        <text x={x1 + 4} y={ySup + 3} className="fill-current font-mono" fontSize="9.5">sup.</text>
        <text x={x1 + 4} y={yInf + 3} className="fill-current font-mono" fontSize="9.5">inf.</text>

        {/* cotas */}
        <g {...cota}>
          <path d={`M${x0 - 10} ${yZ} L${x0 - 10} ${y1}`} markerStart={`url(#${arrowId})`} markerEnd={`url(#${arrowId})`} />
        </g>
        <text x={x0 - 16} y={(yZ + y1) / 2} textAnchor="middle" className="fill-current font-mono" fontSize="10.5"
              transform={`rotate(-90 ${x0 - 16} ${(yZ + y1) / 2})`}>H = {fmtM(HM)}</text>
        <g {...cota}>
          <path d={`M${x0} ${y1 + 12} L${x1} ${y1 + 12}`} markerStart={`url(#${arrowId})`} markerEnd={`url(#${arrowId})`} />
        </g>
        <text x={(x0 + x1) / 2} y={y1 + 24} textAnchor="middle" className="fill-current font-mono" fontSize="10.5">L = {fmtM(LM)}</text>

        {/* diagrama de momentos */}
        {curva && (
          <g>
            <path d={`M${x0} ${yEje} L${x1} ${yEje}`} stroke="currentColor" strokeWidth="0.75" opacity="0.6" />
            <path d={`${curva} L${x1} ${yEje} L${x0} ${yEje} Z`} fill="var(--mat-cota)" fillOpacity="0.12" stroke="none" />
            <path d={curva} stroke="var(--mat-cota)" strokeWidth="1.4" />
            {mNeg && (
              <text x={x0 + mNeg.xM * k} y={yM(mNeg.mKNm) - 5} textAnchor="middle" className="fill-[var(--mat-cota)] font-mono" fontSize="10">
                M− {fmtKNm(-mNeg.mKNm)} · arriba
              </text>
            )}
            {mPos && (
              <text x={x0 + mPos.xM * k} y={yM(mPos.mKNm) + 13} textAnchor="middle" className="fill-[var(--mat-cota)] font-mono" fontSize="10">
                M+ {fmtKNm(mPos.mKNm)} · abajo
              </text>
            )}
            <text x={x0 - 6} y={yEje + 3} textAnchor="end" className="fill-current font-mono" fontSize="9.5" opacity="0.7">Md</text>
          </g>
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
