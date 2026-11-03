"use client";

import { fmt } from "@/lib/verificaciones/formato";

/** Qué parte del dibujo corresponde al campo que se está editando. */
export type ElementoCabezal = "cercos" | "estribosX" | "estribosY" | "recubrimiento";

export interface ArmadoCabezal {
  ladoXM: number;
  ladoYM: number;
  hM: number;
  pilarXM: number;
  pilarYM: number;
  diametroPiloteM: number;
  recubrimientoM: number;
  nCercos: number;
  phiCercosMm: number;
  phiEstribosXMm: number;
  sEstribosXM: number;
  phiEstribosYMm: number;
  sEstribosYM: number;
}

const RESALTE = "var(--mat-cota)";
/** Tope de barras a dibujar, por si se tipea una separación minúscula. */
const MAX_BARRAS = 60;

/**
 * Posiciones de una fila de barras a separación s dentro del ancho libre
 * entre recubrimientos, centradas: la misma cuenta que el cálculo
 * (floor(libre/s) + 1).
 */
function posiciones(ladoM: number, dPrimaM: number, sM: number): number[] {
  const libre = Math.max(ladoM - 2 * dPrimaM, 0);
  if (!(sM > 0)) return [];
  const n = Math.min(Math.floor(libre / sM + 1e-9) + 1, MAX_BARRAS);
  const inicio = dPrimaM + (libre - (n - 1) * sM) / 2;
  return Array.from({ length: n }, (_, i) => inicio + i * sM);
}

/**
 * Armado del cabezal de un pilote, en alzado (plano x) y en planta. Los
 * estribos en x viven en planos xz: en el alzado se ven como un estribo
 * cerrado y en planta como líneas en x. Los estribos en y, al revés. Los
 * cercos horizontales son líneas en el alzado y un anillo en planta. La pieza
 * del campo en edición se resalta y el resto se atenúa.
 */
export function CroquisArmadoCabezal({ a: m, resaltar }: { a: ArmadoCabezal; resaltar: ElementoCabezal | null }) {
  // Alzado y planta lado a lado: apilados quedaban altos y el tope de altura
  // de los esquemas (globals.css) los achicaba.
  const escala = 150 / Math.max(m.ladoXM, m.ladoYM, m.hM);
  const x0 = 10;
  const es = (e: ElementoCabezal) => resaltar === e;
  const color = (e: ElementoCabezal) => (es(e) ? RESALTE : "currentColor");
  const opacidad = (e: ElementoCabezal) => (resaltar === null || es(e) ? 1 : 0.3);
  const grosor = (phiMm: number, e: ElementoCabezal) => Math.max(phiMm / 7, 1.2) + (es(e) ? 1 : 0);
  const peso = (e: ElementoCabezal) => (es(e) ? 700 : 400);

  const wX = m.ladoXM * escala;
  const wY = m.ladoYM * escala;
  const rec = m.recubrimientoM * escala;
  const dX = (m.recubrimientoM + m.phiEstribosXMm / 2000) * escala;
  const xsEstribosY = posiciones(m.ladoXM, m.recubrimientoM + m.phiEstribosYMm / 2000, m.sEstribosYM);
  const ysEstribosX = posiciones(m.ladoYM, m.recubrimientoM + m.phiEstribosXMm / 2000, m.sEstribosXM);

  // Alzado, plano x
  const yTop = 52;
  const hPx = m.hM * escala;
  const yBase = yTop + hPx;
  const cx = x0 + wX / 2;
  const nCercos = Math.min(Math.max(Math.floor(m.nCercos), 0), MAX_BARRAS);
  const margen = Math.min(rec + 6, hPx / 4);
  const alturasCercos = Array.from({ length: nCercos }, (_, i) =>
    nCercos === 1 ? yTop + hPx / 2 : yTop + margen + ((hPx - 2 * margen) * i) / (nCercos - 1)
  );

  // Planta, a la derecha, con la misma escala
  const dxPlanta = wX + 96;
  const yP = yTop;
  const cyP = yP + wY / 2;
  const alto = Math.max(yBase + 56, yP + wY + 44);

  return (
    <svg viewBox={`0 0 ${dxPlanta + x0 + wX + 84} ${alto}`} className="h-auto w-full text-primary" fill="none" aria-hidden="true">
      <text x={4} y={14} className="fill-current font-mono" fontSize="10.5" opacity="0.7">ALZADO, plano x</text>
      {/* hormigón */}
      <rect x={cx - (m.pilarXM * escala) / 2} y={yTop - 26} width={m.pilarXM * escala} height={26}
            stroke="var(--mat-hormigon-borde)" strokeWidth="1.2" fill="var(--mat-hormigon)" />
      <rect x={x0} y={yTop} width={wX} height={hPx} stroke="currentColor" strokeWidth="1.6" fill="var(--mat-hormigon)" />
      <rect x={cx - (m.diametroPiloteM * escala) / 2} y={yBase} width={m.diametroPiloteM * escala} height={30}
            stroke="var(--mat-hormigon-borde)" strokeWidth="1.2" fill="var(--mat-hormigon)" />
      {/* recubrimiento */}
      <rect x={x0 + rec} y={yTop + rec} width={Math.max(wX - 2 * rec, 0)} height={Math.max(hPx - 2 * rec, 0)}
            stroke={color("recubrimiento")} strokeWidth={es("recubrimiento") ? 1.6 : 0.7} strokeDasharray="3 3"
            opacity={es("recubrimiento") ? 1 : 0.35} />

      {/* estribos en y: planos yz, de canto en este alzado */}
      <g stroke={color("estribosY")} strokeWidth={grosor(m.phiEstribosYMm, "estribosY")} opacity={opacidad("estribosY")}>
        {xsEstribosY.map((xm) => (
          <path key={xm} d={`M${x0 + xm * escala} ${yTop + dX} L${x0 + xm * escala} ${yBase - dX}`} />
        ))}
      </g>
      {/* estribos en x: en este plano se ve el estribo cerrado */}
      <rect x={x0 + dX} y={yTop + dX} width={Math.max(wX - 2 * dX, 0)} height={Math.max(hPx - 2 * dX, 0)} rx="3"
            stroke={color("estribosX")} strokeWidth={grosor(m.phiEstribosXMm, "estribosX")} opacity={opacidad("estribosX")} />
      {/* cercos horizontales */}
      <g stroke={color("cercos")} strokeWidth={grosor(m.phiCercosMm, "cercos")} opacity={opacidad("cercos")} strokeLinecap="round">
        {alturasCercos.map((y) => (
          <path key={y} d={`M${x0 + rec} ${y} L${x0 + wX - rec} ${y}`} />
        ))}
      </g>

      <text x={x0 + wX + 8} y={yTop + 12} className="font-mono" fontSize="9.5"
            fill={color("estribosX")} opacity={opacidad("estribosX")} fontWeight={peso("estribosX")}>
        est. x
      </text>
      <text x={x0 + wX + 8} y={yTop + hPx / 2 + 3} className="font-mono" fontSize="9.5"
            fill={color("cercos")} opacity={opacidad("cercos")} fontWeight={peso("cercos")}>
        {nCercos} cercos
      </text>
      <text x={x0 + wX + 8} y={yTop + hPx / 2 + 15} className="font-mono" fontSize="9.5"
            fill={color("cercos")} opacity={opacidad("cercos")} fontWeight={peso("cercos")}>
        Ø{m.phiCercosMm}
      </text>
      <text x={cx} y={yBase + 46} textAnchor="middle" className="font-mono" fontSize="9.5"
            fill={color("estribosY")} opacity={opacidad("estribosY")} fontWeight={peso("estribosY")}>
        estribos en y, de canto: {xsEstribosY.length}
      </text>
      {es("recubrimiento") && (
        <text x={x0 + rec + 3} y={yTop + rec - 3} className="font-mono" fontSize="9.5" fill={RESALTE} fontWeight={700}>
          rec. {fmt(m.recubrimientoM * 100, 1)} cm
        </text>
      )}

      {/* planta */}
      <g transform={`translate(${dxPlanta} 0)`}>
      <text x={x0} y={yP - 22} className="fill-current font-mono" fontSize="10.5" opacity="0.7">PLANTA</text>
      <rect x={x0} y={yP} width={wX} height={wY} stroke="currentColor" strokeWidth="1.6" fill="var(--mat-hormigon)" />
      <circle cx={cx} cy={cyP} r={(m.diametroPiloteM * escala) / 2} stroke="var(--mat-hormigon-borde)" strokeWidth="1" strokeDasharray="5 3" />
      <rect x={cx - (m.pilarXM * escala) / 2} y={cyP - (m.pilarYM * escala) / 2} width={m.pilarXM * escala} height={m.pilarYM * escala}
            stroke="var(--mat-hormigon-borde)" strokeWidth="1.2" fill="var(--mat-hormigon-borde)" fillOpacity="0.3" />
      <rect x={x0 + rec} y={yP + rec} width={Math.max(wX - 2 * rec, 0)} height={Math.max(wY - 2 * rec, 0)}
            stroke={color("recubrimiento")} strokeWidth={es("recubrimiento") ? 1.6 : 0.7} strokeDasharray="3 3"
            opacity={es("recubrimiento") ? 1 : 0.35} />
      {/* cercos: anillo */}
      <rect x={x0 + rec} y={yP + rec} width={Math.max(wX - 2 * rec, 0)} height={Math.max(wY - 2 * rec, 0)} rx="3"
            stroke={color("cercos")} strokeWidth={grosor(m.phiCercosMm, "cercos")} opacity={opacidad("cercos")} />
      {/* estribos en x: líneas en x, repartidas en y */}
      <g stroke={color("estribosX")} strokeWidth={grosor(m.phiEstribosXMm, "estribosX")} opacity={opacidad("estribosX")}>
        {ysEstribosX.map((ym) => (
          <path key={ym} d={`M${x0 + dX} ${yP + wY - ym * escala} L${x0 + wX - dX} ${yP + wY - ym * escala}`} />
        ))}
      </g>
      {/* estribos en y: líneas en y, repartidas en x */}
      <g stroke={color("estribosY")} strokeWidth={grosor(m.phiEstribosYMm, "estribosY")} opacity={opacidad("estribosY")}>
        {xsEstribosY.map((xm) => (
          <path key={xm} d={`M${x0 + xm * escala} ${yP + dX} L${x0 + xm * escala} ${yP + wY - dX}`} />
        ))}
      </g>

      <text x={x0 + wX + 8} y={cyP - 4} className="font-mono" fontSize="9.5"
            fill={color("estribosX")} opacity={opacidad("estribosX")} fontWeight={peso("estribosX")}>
        x: {ysEstribosX.length}Ø{m.phiEstribosXMm}
      </text>
      <text x={x0 + wX + 8} y={cyP + 8} className="font-mono" fontSize="9.5"
            fill={color("estribosX")} opacity={opacidad("estribosX")} fontWeight={peso("estribosX")}>
        c/{fmt(m.sEstribosXM * 100, 0)}
      </text>
      <text x={cx} y={yP + wY + 18} textAnchor="middle" className="font-mono" fontSize="9.5"
            fill={color("estribosY")} opacity={opacidad("estribosY")} fontWeight={peso("estribosY")}>
        y: {xsEstribosY.length}Ø{m.phiEstribosYMm} c/{fmt(m.sEstribosYM * 100, 0)}
      </text>
      <text x={cx} y={yP + wY + 34} textAnchor="middle" className="fill-current font-mono" fontSize="9" opacity="0.7">
        pilar lleno · pilote a trazos
      </text>
      </g>
    </svg>
  );
}
