"use client";

import { fmt } from "@/lib/verificaciones/formato";

interface ArmaduraZapataCorridaDiagramaProps {
  AM: number;
  HM: number;
  anchoMuroM: number;
  /** Cara del muro al borde izquierdo (m). Sin dato, centrado. */
  distanciaBordeM?: number;
  recubrimientoM: number;
  diametroPrincipalMm: number;
  separacionPrincipalM: number;
  /** Extremo de las barras principales. */
  patilla: boolean;
  numeroReparto: number;
  diametroRepartoMm: number;
}

/**
 * Corte transversal de la zapata corrida con cada armadura rotulada: la
 * principal (Ø, separación y extremo), el reparto (cantidad y Ø), el
 * recubrimiento, d y H. Las esperas del muro se dibujan tenues porque no se
 * calculan en esta página.
 *
 * El canto se exagera si hace falta para que las barras se lean.
 */
export function ArmaduraZapataCorridaDiagrama({
  AM,
  HM,
  anchoMuroM,
  distanciaBordeM,
  recubrimientoM,
  diametroPrincipalMm,
  separacionPrincipalM,
  patilla,
  numeroReparto,
  diametroRepartoMm,
}: ArmaduraZapataCorridaDiagramaProps) {
  if (!(AM > 0) || !(HM > 0)) return null;

  const W = 210;
  const s = W / AM;
  const x0 = 40;
  const x1 = x0 + W;
  const yTop = 110;
  const h = Math.max(HM * s, 60);
  const sv = h / HM; // escala vertical (puede exagerar el canto)
  const yBot = yTop + h;

  const rec = Math.max(recubrimientoM * sv, 6);
  const recX = Math.max(recubrimientoM * s, 6);
  const rP = Math.max(2, Math.min(4, diametroPrincipalMm / 5));
  const rR = Math.max(2, Math.min(3.5, diametroRepartoMm / 5));
  const yBarra = yBot - rec - rP / 2;
  const xb0 = x0 + recX;
  const xb1 = x1 - recX;
  const yPatilla = yTop + rec;

  const borde = distanciaBordeM ?? (AM - anchoMuroM) / 2;
  const xm0 = x0 + Math.min(borde * s, W - anchoMuroM * s);
  const xm1 = xm0 + Math.min(anchoMuroM * s, W);
  const yMuroTop = 30;

  const n = Math.max(1, Math.min(Math.round(numeroReparto), 30));
  const xsReparto = Array.from({ length: n }, (_, i) =>
    n === 1 ? (xb0 + xb1) / 2 : xb0 + rP + 2 + (i * (xb1 - xb0 - 2 * rP - 4)) / (n - 1)
  );
  const yReparto = yBarra - rP / 2 - rR - 0.5;

  const dM = HM - recubrimientoM - diametroPrincipalMm / 2000;
  const xCotas = x1 + 14;
  const iRotulo = Math.min(Math.floor(n / 2), n - 1);

  return (
    <svg viewBox={`0 0 ${x1 + 78} ${yBot + 90}`} className="h-auto w-full text-primary" fill="none" aria-hidden="true">
      {/* muro, cortado arriba */}
      <path
        d={`M${xm0} ${yTop} L${xm0} ${yMuroTop} L${(xm0 + xm1) / 2 - 4} ${yMuroTop - 4} L${(xm0 + xm1) / 2 + 4} ${yMuroTop + 4} L${xm1} ${yMuroTop} L${xm1} ${yTop}`}
        stroke="currentColor"
        strokeWidth="1.6"
        fill="var(--color-muted)"
        fillOpacity="0.5"
      />
      {/* esperas del muro: tenues, no se calculan acá */}
      {[xm0 + 6, xm1 - 6].map((x) => (
        <path key={x} d={`M${x} ${yMuroTop + 8} L${x} ${yBarra - rP - 2} L${x + (x < (xm0 + xm1) / 2 ? 18 : -18)} ${yBarra - rP - 2}`} stroke="currentColor" strokeWidth="1" strokeDasharray="4 3" opacity="0.35" />
      ))}
      <text x={xm1 + 6} y={yMuroTop + 22} className="fill-current font-mono" fontSize="10" opacity="0.55">esperas del muro</text>
      <text x={xm1 + 6} y={yMuroTop + 32} className="fill-current font-mono" fontSize="10" opacity="0.55">(no se calculan acá)</text>

      {/* zapata */}
      <rect x={x0} y={yTop} width={W} height={h} stroke="currentColor" strokeWidth="1.8" fill="var(--color-muted)" fillOpacity="0.25" />

      {/* armadura principal, con su extremo */}
      <path
        d={
          patilla
            ? `M${xb0} ${yPatilla} L${xb0} ${yBarra} L${xb1} ${yBarra} L${xb1} ${yPatilla}`
            : `M${xb0} ${yBarra} L${xb1} ${yBarra}`
        }
        stroke="var(--color-destructive)"
        strokeWidth={Math.max(1.6, rP * 0.8)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* reparto: barras a lo largo del muro, vistas de punta */}
      {xsReparto.map((x) => (
        <circle key={x} cx={x} cy={yReparto} r={rR} fill="currentColor" />
      ))}

      {/* rótulo principal */}
      <path d={`M${x0 + W * 0.3} ${yBarra} L${x0 + W * 0.22} ${yBot + 30} L${x0 - 30} ${yBot + 30}`} stroke="var(--color-destructive)" strokeWidth="0.8" />
      <text x={x0 - 30} y={yBot + 25} className="font-mono" fontSize="12.5" fill="var(--color-destructive)">
        Principal Ø{fmt(diametroPrincipalMm, 0)} c/{fmt(separacionPrincipalM, 2)} m · {patilla ? "patilla a 90°" : "barra recta"}
      </text>
      <text x={x0 - 30} y={yBot + 40} className="font-mono" fontSize="10" fill="var(--color-destructive)" opacity="0.8">
        transversal al muro, abajo
      </text>

      {/* rótulo reparto */}
      <path d={`M${xsReparto[iRotulo]} ${yReparto} L${xsReparto[iRotulo] + 20} ${yBot + 62} L${x0 - 30} ${yBot + 62}`} stroke="currentColor" strokeWidth="0.8" />
      <text x={x0 - 30} y={yBot + 58} className="fill-current font-mono" fontSize="12.5">
        Reparto {fmt(numeroReparto, 0)} Ø{fmt(diametroRepartoMm, 0)} en todo A
      </text>
      <text x={x0 - 30} y={yBot + 73} className="fill-current font-mono" fontSize="10" opacity="0.8">
        a lo largo del muro, sobre la principal
      </text>

      {/* cotas: H, d y recubrimiento */}
      <path d={`M${x1 + 4} ${yTop} L${xCotas + 4} ${yTop} M${x1 + 4} ${yBot} L${xCotas + 4} ${yBot} M${xCotas} ${yTop} L${xCotas} ${yBot}`} stroke="currentColor" strokeWidth="0.8" />
      <text x={xCotas + 4} y={(yTop + yBot) / 2 - 4} className="fill-current font-mono" fontSize="11">H</text>
      <text x={xCotas + 4} y={(yTop + yBot) / 2 + 7} className="fill-current font-mono" fontSize="11">{fmt(HM, 2)}</text>
      <path d={`M${xCotas + 30} ${yTop} L${xCotas + 30} ${yBarra} M${x1 + 4} ${yBarra} L${xCotas + 34} ${yBarra}`} stroke="currentColor" strokeWidth="0.8" opacity="0.7" />
      <text x={xCotas + 33} y={yTop + 14} className="fill-current font-mono" fontSize="11" opacity="0.8">d</text>
      <text x={xCotas + 33} y={yTop + 25} className="fill-current font-mono" fontSize="11" opacity="0.8">{fmt(dM, 2)}</text>
      <text x={xCotas + 4} y={yBot + 12} className="fill-current font-mono" fontSize="10" opacity="0.7">rec {fmt(recubrimientoM, 2)}</text>

      {/* ancho */}
      <path d={`M${x0} ${yTop - 8} L${x1} ${yTop - 8}`} stroke="currentColor" strokeWidth="0.7" opacity="0.6" />
      <text x={x1 - 2} y={yTop - 12} textAnchor="end" className="fill-current font-mono" fontSize="11" opacity="0.8">A = {fmt(AM, 2)} m</text>
    </svg>
  );
}
