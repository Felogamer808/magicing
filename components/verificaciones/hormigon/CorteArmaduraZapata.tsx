"use client";

import { useId } from "react";
import { CapaMaterial } from "@/components/verificaciones/croquis/Primitivas";

interface FilaResumen {
  etiqueta: string;
  valor: string;
}

interface CorteArmaduraZapataProps {
  /** Largo del corte: A en la corrida y en la dirección A de la aislada (m). */
  largoM: number;
  HM: number;
  /** Ancho del muro o pilar en el corte (m). */
  anchoApoyoM: number;
  /** Cara del muro o pilar al borde izquierdo (m). Sin dato, centrado. */
  distanciaBordeM?: number;
  recubrimientoM: number;
  /** A1: barras en el plano del corte, abajo. */
  diametroA1Mm: number;
  /** A2: barras perpendiculares al corte, vistas de punta, sobre las A1. */
  numeroA2: number;
  diametroA2Mm: number;
  patilla: boolean;
  /** "muro" o "pilar": sólo cambia el rótulo de las esperas. */
  apoyo: "muro" | "pilar";
  /** Filas del resumen al pie, en el orden en que se leen. */
  resumen: readonly FilaResumen[];
}

const fmtM = (n: number) => `${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`;

/** Radio de la barra vista de punta: no a escala, como en la sección de viga. */
function radioDe(diametroMm: number): number {
  return Math.max(2.5, Math.min(6, diametroMm * 0.3));
}

function distribuir(n: number, desde: number, hasta: number): number[] {
  if (n <= 1) return [(desde + hasta) / 2];
  const paso = (hasta - desde) / (n - 1);
  return Array.from({ length: n }, (_, i) => desde + i * paso);
}

/**
 * Corte de una zapata con su armadura, en la gramática de la sección de viga:
 * hormigón con su material, barras en el color de armadura, cotas con flecha y
 * el detalle de cada armadura (Ø, separación, extremo) en el resumen al pie.
 *
 * A1 es la parrilla que corre en el plano del corte, abajo, con su extremo
 * recto o en patilla; A2 son las barras perpendiculares, vistas de punta encima
 * de las A1. Las esperas del muro o pilar van tenues: no se calculan acá.
 */
export function CorteArmaduraZapata({
  largoM,
  HM,
  anchoApoyoM,
  distanciaBordeM,
  recubrimientoM,
  diametroA1Mm,
  numeroA2,
  diametroA2Mm,
  patilla,
  apoyo,
  resumen,
}: CorteArmaduraZapataProps) {
  const arrowId = useId();
  if (!(largoM > 0) || !(HM > 0)) return null;

  const MAX_W = 230;
  const PAD_LEFT = 52;
  const PAD_TOP = 22;
  const PAD_RIGHT = 46;
  const PAD_BOTTOM = 34;
  const ALTO_APOYO = 46;

  const escala = MAX_W / largoM;
  const w = MAX_W;
  // El canto se exagera si a escala no deja ver las barras.
  const h = Math.max(HM * escala, 54);
  const escalaV = h / HM;

  const x0 = PAD_LEFT;
  const x1 = x0 + w;
  const yZapata = PAD_TOP + ALTO_APOYO;
  const y1 = yZapata + h;
  const viewW = x1 + PAD_RIGHT;
  const viewH = y1 + PAD_BOTTOM;

  const borde = distanciaBordeM ?? (largoM - anchoApoyoM) / 2;
  const anchoApoyo = Math.min(anchoApoyoM * escala, w);
  const xa0 = x0 + Math.min(Math.max(borde * escala, 0), w - anchoApoyo);
  const xa1 = xa0 + anchoApoyo;

  // Contorno único: el muro o pilar sale de la zapata, como en el plano.
  const contorno = `M${x0} ${yZapata} L${xa0} ${yZapata} L${xa0} ${PAD_TOP} L${xa1} ${PAD_TOP} L${xa1} ${yZapata} L${x1} ${yZapata} L${x1} ${y1} L${x0} ${y1} Z`;

  const recV = Math.max(recubrimientoM * escalaV, 5);
  const recH = Math.max(recubrimientoM * escala, 5);
  const rA1 = radioDe(diametroA1Mm);
  const rA2 = radioDe(diametroA2Mm);
  const yA1 = y1 - recV - rA1 / 2;
  const xb0 = x0 + recH;
  const xb1 = x1 - recH;
  const yA2 = yA1 - rA1 / 2 - rA2 - 0.5;
  const n2 = Math.max(1, Math.min(Math.round(numeroA2), 40));
  // Las A2 no se dibujan dentro de las patas de la patilla.
  const xsA2 = distribuir(n2, xb0 + rA2 + 3, xb1 - rA2 - 3);

  const trazoA1 = patilla
    ? `M${xb0} ${yZapata + recV} L${xb0} ${yA1} L${xb1} ${yA1} L${xb1} ${yZapata + recV}`
    : `M${xb0} ${yA1} L${xb1} ${yA1}`;

  const cota = { stroke: "currentColor", strokeWidth: 1, opacity: 0.75 };

  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox={`0 0 ${viewW} ${viewH}`} className="h-auto w-full text-primary" fill="none" role="img"
           aria-label={`Corte de la zapata de ${fmtM(largoM)} por ${fmtM(HM)} con su armadura.`}>
        <defs>
          <marker id={arrowId} markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0 0 L6 3 L0 6 Z" fill="currentColor" />
          </marker>
        </defs>

        <CapaMaterial d={contorno} material="hormigon" />
        {/* corte del muro o pilar arriba */}
        <path
          d={`M${xa0 - 3} ${PAD_TOP} L${(xa0 + xa1) / 2 - 3} ${PAD_TOP} L${(xa0 + xa1) / 2} ${PAD_TOP - 5} L${(xa0 + xa1) / 2 + 3} ${PAD_TOP + 5} L${(xa0 + xa1) / 2 + 6} ${PAD_TOP} L${xa1 + 3} ${PAD_TOP}`}
          stroke="currentColor" strokeWidth="1" opacity="0.7"
        />

        {/* esperas: tenues, no se calculan en esta página */}
        {[xa0 + 5, xa1 - 5].map((x, i) => (
          <path key={x} d={`M${x} ${PAD_TOP + 6} L${x} ${yA2 - rA2 - 2} L${x + (i === 0 ? -14 : 14)} ${yA2 - rA2 - 2}`}
                stroke="var(--mat-armadura)" strokeWidth="1.2" strokeDasharray="3 2" opacity="0.4" />
        ))}

        {/* A1, en el plano del corte, con su extremo */}
        <path d={trazoA1} stroke="var(--mat-armadura)" strokeWidth={Math.max(1.8, rA1 * 0.7)} strokeLinejoin="round" strokeLinecap="round" />
        {/* A2, de punta sobre las A1 */}
        {xsA2.map((x) => (
          <circle key={x} cx={x} cy={yA2} r={rA2} fill="var(--mat-armadura)" />
        ))}
        <text x={(xb0 + xb1) / 2 + 6} y={yA1 + rA1 + 10} className="fill-current font-mono" fontSize="9.5">A1</text>
        <text x={xsA2[Math.min(1, xsA2.length - 1)]} y={yA2 - rA2 - 4} textAnchor="middle" className="fill-current font-mono" fontSize="9.5">A2</text>

        {/* cota del largo, abajo */}
        <g {...cota}>
          <path d={`M${x0} ${y1 + 6} L${x0} ${y1 + 18}`} />
          <path d={`M${x1} ${y1 + 6} L${x1} ${y1 + 18}`} />
          <path d={`M${x0} ${y1 + 12} L${x1} ${y1 + 12}`} markerStart={`url(#${arrowId})`} markerEnd={`url(#${arrowId})`} />
        </g>
        <text x={(x0 + x1) / 2} y={y1 + 28} textAnchor="middle" className="fill-current font-mono" fontSize="10.5">
          A = {fmtM(largoM)}
        </text>

        {/* cota H, a la izquierda */}
        <g {...cota}>
          <path d={`M${x0 - 16} ${yZapata} L${x0 - 4} ${yZapata}`} />
          <path d={`M${x0 - 16} ${y1} L${x0 - 4} ${y1}`} />
          <path d={`M${x0 - 10} ${yZapata} L${x0 - 10} ${y1}`} markerStart={`url(#${arrowId})`} markerEnd={`url(#${arrowId})`} />
        </g>
        <text x={PAD_LEFT - 22} y={(yZapata + y1) / 2} textAnchor="middle" className="fill-current font-mono" fontSize="10.5"
              transform={`rotate(-90 ${PAD_LEFT - 22} ${(yZapata + y1) / 2})`}>
          H = {fmtM(HM)}
        </text>

        {/* cota d: de la cara superior al eje de A1 */}
        <g stroke="currentColor" strokeWidth="0.75" opacity="0.6" strokeDasharray="2 2">
          <path d={`M${x1 + 8} ${yZapata} L${x1 + 8} ${yA1}`} />
        </g>
        <g stroke="currentColor" strokeWidth="0.75" opacity="0.6">
          <path d={`M${x1} ${yZapata} L${x1 + 12} ${yZapata}`} />
          <path d={`M${x1} ${yA1} L${x1 + 12} ${yA1}`} />
        </g>
        <text x={x1 + 14} y={(yZapata + yA1) / 2 + 3} className="fill-current font-mono" fontSize="9.5">d</text>

        {/* esperas: rótulo */}
        <text x={xa1 + 6} y={PAD_TOP + 14} className="fill-current font-mono" fontSize="9.5" opacity="0.6">
          {apoyo}
        </text>
      </svg>

      <dl className="grid w-full max-w-xs grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-xs text-muted-foreground">
        {resumen.map((f) => (
          <div key={f.etiqueta} className="contents">
            <dt>{f.etiqueta}</dt>
            <dd className="text-right text-foreground">{f.valor}</dd>
          </div>
        ))}
        <dt>Esperas</dt>
        <dd className="text-right">no se calculan acá</dd>
      </dl>
    </div>
  );
}
