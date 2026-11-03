"use client";

import { fmt } from "@/lib/verificaciones/formato";

/** Qué parte del dibujo corresponde al campo que se está editando. */
export type ElementoCabezalDos = "principal" | "secundaria" | "estribosV" | "estribosH";

export interface MedidasCabezalDos {
  ladoXM: number;
  ladoYM: number;
  hM: number;
  anchoPilarM: number;
  diametroPiloteM: number;
  recubrimientoM: number;
}

export interface ArmadoCabezalDos {
  nPrinc: number;
  phiPrincMm: number;
  conPatilla: boolean;
  /** Mandril D de la patilla (mm) */
  mandrilMm: number;
  /** Pata necesaria para completar lbd, si se pudo calcular (mm) */
  patillaNecMm: number | null;
  nSec: number;
  phiSecMm: number;
  phiEstVMm: number;
  /** Separación de los estribos verticales, a lo largo de x (m) */
  sEstVM: number;
  phiEstHMm: number;
  /** Separación de los estribos horizontales, en el canto (m) */
  sEstHM: number;
}

const RESALTE = "var(--mat-cota)";
/** Tope de barras a dibujar, por si se tipea una cantidad enorme. */
const MAX_BARRAS = 60;

/** Desde a, cada s, hasta b: la misma cuenta que el cálculo, floor((b − a)/s) + 1. */
function cadaS(a: number, b: number, sM: number): number[] {
  if (!(sM > 0) || b < a) return [];
  const n = Math.min(Math.floor((b - a) / sM + 1e-9) + 1, MAX_BARRAS);
  return Array.from({ length: n }, (_, i) => a + i * sM);
}

/** n posiciones repartidas parejo entre a y b. */
function repartir(n: number, a: number, b: number): number[] {
  const m = Math.min(Math.max(Math.floor(n), 0), MAX_BARRAS);
  return Array.from({ length: m }, (_, i) => (m === 1 ? (a + b) / 2 : a + ((b - a) * i) / (m - 1)));
}

/**
 * Planta del cabezal de dos pilotes: los pilotes a 2,5·D entre ejes, a trazos
 * porque están debajo, y el pilar centrado. El pilar se dibuja cuadrado: el
 * cálculo sólo usa su ancho en la dirección de los pilotes.
 */
export function PlantaCabezalDosPilotes({ m }: { m: MedidasCabezalDos }) {
  const escala = 240 / m.ladoXM;
  const x0 = 40;
  const y0 = 34;
  const w = m.ladoXM * escala;
  const h = m.ladoYM * escala;
  const cx = x0 + w / 2;
  const cy = y0 + h / 2;
  const s = 2.5 * m.diametroPiloteM;
  const a = m.anchoPilarM * escala;
  return (
    <svg viewBox={`0 0 ${x0 + w + 64} ${y0 + h + 62}`} className="h-auto w-full text-primary" fill="none" aria-hidden="true">
      <rect x={x0} y={y0} width={w} height={h} stroke="var(--mat-hormigon-borde)" strokeWidth="2" fill="var(--mat-hormigon)" />
      {[-1, 1].map((k) => (
        <g key={k}>
          <circle cx={cx + (k * s * escala) / 2} cy={cy} r={(m.diametroPiloteM * escala) / 2}
                  stroke="currentColor" strokeWidth="1.3" strokeDasharray="5 3" />
          <path d={`M${cx + (k * s * escala) / 2} ${y0 - 8} L${cx + (k * s * escala) / 2} ${y0 + h + 8}`}
                stroke="currentColor" strokeWidth="0.6" strokeDasharray="6 3" opacity="0.5" />
        </g>
      ))}
      <rect x={cx - a / 2} y={cy - a / 2} width={a} height={a} stroke="var(--mat-hormigon-borde)" strokeWidth="1.6"
            fill="var(--mat-hormigon-borde)" fillOpacity="0.35" />
      {/* cotas */}
      <g stroke="currentColor" strokeWidth="0.9" opacity="0.7">
        <path d={`M${x0} ${y0 - 14} L${x0 + w} ${y0 - 14}`} />
        <path d={`M${cx - (s * escala) / 2} ${y0 + h + 18} L${cx + (s * escala) / 2} ${y0 + h + 18}`} />
        <path d={`M${x0 + w + 12} ${y0} L${x0 + w + 12} ${y0 + h}`} />
      </g>
      <text x={cx} y={y0 - 19} textAnchor="middle" className="fill-current font-mono" fontSize="9.5">x = {fmt(m.ladoXM)} m</text>
      <text x={x0 + w + 16} y={cy + 3} className="fill-current font-mono" fontSize="9.5">y = {fmt(m.ladoYM)}</text>
      <text x={cx} y={y0 + h + 30} textAnchor="middle" className="fill-current font-mono" fontSize="9.5">
        s = 2,5·D = {fmt(s)} m
      </text>
      <text x={cx} y={y0 + h + 44} textAnchor="middle" className="fill-current font-mono" fontSize="9" opacity="0.8">
        pilar {fmt(m.anchoPilarM)} · pilotes Ø {fmt(m.diametroPiloteM)} (a trazos, debajo)
      </text>
    </svg>
  );
}

/**
 * Armado del cabezal de dos pilotes, en alzado y en planta. El tirante corre en
 * x por abajo y, con patilla, sube por los extremos con el doblez de mandril D;
 * la secundaria lo cruza en y. Los estribos verticales se reparten a lo largo
 * de x y los horizontales en el canto. Cada familia tiene su color —tirante
 * rojo, secundaria azul, estribos gris—, porque en planta la secundaria y los
 * estribos verticales caen sobre las mismas líneas. La pieza del campo en
 * edición se resalta y el resto se atenúa.
 */
export function CroquisArmadoCabezalDosPilotes({
  m, armado, resaltar,
}: { m: MedidasCabezalDos; armado: ArmadoCabezalDos; resaltar: ElementoCabezalDos | null }) {
  const escala = 250 / m.ladoXM;
  const x0 = 34;
  const es = (e: ElementoCabezalDos) => resaltar === e;
  const color = (e: ElementoCabezalDos, base = "currentColor") => (es(e) ? RESALTE : base);
  const opacidad = (e: ElementoCabezalDos) => (resaltar === null || es(e) ? 1 : 0.3);
  const grosor = (phiMm: number, e: ElementoCabezalDos) => Math.max(phiMm / 7, 1.1) + (es(e) ? 1 : 0);
  const peso = (e: ElementoCabezalDos) => (es(e) ? 700 : 400);
  const rojo = "var(--color-destructive)";
  const azul = "var(--mat-armadura)";
  const gris = "var(--mat-acero-borde)";

  const w = m.ladoXM * escala;
  const px = (xm: number) => x0 + xm * escala;
  const rec = m.recubrimientoM;
  const s = 2.5 * m.diametroPiloteM;

  // Alzado
  const yTop = 40;
  const hPx = m.hM * escala;
  const yBase = yTop + hPx;
  const pz = (zm: number) => yBase - zm * escala; // z desde la cara inferior
  const zTirante = rec + armado.phiPrincMm / 2000;
  const xIzq = rec + armado.phiPrincMm / 2000;
  const xDer = m.ladoXM - xIzq;
  const r = ((armado.mandrilMm + armado.phiPrincMm) / 2000) * escala;
  const pathTirante = armado.conPatilla
    ? `M${px(xIzq)} ${pz(m.hM - rec)} L${px(xIzq)} ${pz(zTirante) - r} Q${px(xIzq)} ${pz(zTirante)} ${px(xIzq) + r} ${pz(zTirante)}` +
      ` L${px(xDer) - r} ${pz(zTirante)} Q${px(xDer)} ${pz(zTirante)} ${px(xDer)} ${pz(zTirante) - r} L${px(xDer)} ${pz(m.hM - rec)}`
    : `M${px(rec)} ${pz(zTirante)} L${px(m.ladoXM - rec)} ${pz(zTirante)}`;
  const xsEstV = cadaS(0.1, m.ladoXM - 0.1, armado.sEstVM);
  const zsEstH = cadaS(0.075, m.hM - 0.075, armado.sEstHM);
  const xsSec = repartir(armado.nSec, rec + 0.03, m.ladoXM - rec - 0.03);

  // Planta, debajo
  const yP = yBase + 74;
  const wY = m.ladoYM * escala;
  const py = (ym: number) => yP + ym * escala;
  const ysPrinc = repartir(armado.nPrinc, rec + 0.03, m.ladoYM - rec - 0.03);
  const alto = yP + wY + 40;

  return (
    <svg viewBox={`0 0 ${x0 + w + 70} ${alto}`} className="h-auto w-full text-primary" fill="none" aria-hidden="true">
      <text x={4} y={14} className="fill-current font-mono" fontSize="10.5" opacity="0.7">ALZADO, plano x</text>
      {/* hormigón */}
      <rect x={px(m.ladoXM / 2) - (m.anchoPilarM * escala) / 2} y={yTop - 22} width={m.anchoPilarM * escala} height={22}
            stroke="var(--mat-hormigon-borde)" strokeWidth="1.2" fill="var(--mat-hormigon)" />
      <rect x={x0} y={yTop} width={w} height={hPx} stroke="currentColor" strokeWidth="1.6" fill="var(--mat-hormigon)" />
      {[-1, 1].map((k) => (
        <rect key={k} x={px(m.ladoXM / 2 + (k * s) / 2) - (m.diametroPiloteM * escala) / 2} y={yBase}
              width={m.diametroPiloteM * escala} height={22}
              stroke="var(--mat-hormigon-borde)" strokeWidth="1.2" fill="var(--mat-hormigon)" />
      ))}

      {/* estribos horizontales: líneas en el canto */}
      <g stroke={color("estribosH", gris)} strokeWidth={grosor(armado.phiEstHMm, "estribosH")} opacity={opacidad("estribosH")}>
        {zsEstH.map((z) => (
          <path key={z} d={`M${px(rec)} ${pz(z)} L${px(m.ladoXM - rec)} ${pz(z)}`} />
        ))}
      </g>
      {/* estribos verticales: a lo largo de x */}
      <g stroke={color("estribosV", gris)} strokeWidth={grosor(armado.phiEstVMm, "estribosV")} opacity={opacidad("estribosV")}>
        {xsEstV.map((x) => (
          <path key={x} d={`M${px(x)} ${pz(rec)} L${px(x)} ${pz(m.hM - rec)}`} />
        ))}
      </g>
      {/* secundaria: de punta, sobre el tirante */}
      <g fill={color("secundaria", azul)} opacity={opacidad("secundaria")}>
        {xsSec.map((x) => (
          <circle key={x} cx={px(x)} cy={pz(zTirante) - Math.max(armado.phiPrincMm / 7, 1.1) - 3}
                  r={Math.max(armado.phiSecMm / 6, 2.2) + (es("secundaria") ? 0.8 : 0)} />
        ))}
      </g>
      {/* tirante */}
      <path d={pathTirante} stroke={color("principal", rojo)} strokeWidth={grosor(armado.phiPrincMm, "principal")}
            strokeLinecap="round" opacity={opacidad("principal")} />

      <text x={px(m.ladoXM / 2)} y={yBase + 36} textAnchor="middle" className="font-mono" fontSize="9.5"
            fill={color("principal", rojo)} opacity={opacidad("principal")} fontWeight={peso("principal")}>
        tirante {armado.nPrinc}Ø{armado.phiPrincMm}
        {armado.conPatilla ? ` · patilla, D = ${fmt(armado.mandrilMm, 0)} mm` : " · recto"}
      </text>
      {armado.conPatilla && armado.patillaNecMm !== null && (
        <text x={px(m.ladoXM / 2)} y={yBase + 50} textAnchor="middle" className="font-mono" fontSize="9.5"
              fill={color("principal", rojo)} opacity={opacidad("principal")} fontWeight={peso("principal")}>
          patilla necesaria {fmt(armado.patillaNecMm / 10, 1)} cm
        </text>
      )}
      <text x={x0 + w + 6} y={yTop + 10} className="font-mono" fontSize="9"
            fill={color("estribosV", gris)} opacity={opacidad("estribosV")} fontWeight={peso("estribosV")}>
        v Ø{armado.phiEstVMm}
      </text>
      <text x={x0 + w + 6} y={yTop + 21} className="font-mono" fontSize="9"
            fill={color("estribosV", gris)} opacity={opacidad("estribosV")} fontWeight={peso("estribosV")}>
        c/{fmt(armado.sEstVM * 100, 0)} ({xsEstV.length})
      </text>
      <text x={x0 + w + 6} y={yTop + hPx / 2 + 8} className="font-mono" fontSize="9"
            fill={color("estribosH", gris)} opacity={opacidad("estribosH")} fontWeight={peso("estribosH")}>
        h Ø{armado.phiEstHMm}
      </text>
      <text x={x0 + w + 6} y={yTop + hPx / 2 + 19} className="font-mono" fontSize="9"
            fill={color("estribosH", gris)} opacity={opacidad("estribosH")} fontWeight={peso("estribosH")}>
        c/{fmt(armado.sEstHM * 100, 0)} ({zsEstH.length})
      </text>

      {/* planta */}
      <text x={4} y={yP - 10} className="fill-current font-mono" fontSize="10.5" opacity="0.7">PLANTA</text>
      <rect x={x0} y={yP} width={w} height={wY} stroke="currentColor" strokeWidth="1.6" fill="var(--mat-hormigon)" />
      {[-1, 1].map((k) => (
        <circle key={k} cx={px(m.ladoXM / 2 + (k * s) / 2)} cy={yP + wY / 2} r={(m.diametroPiloteM * escala) / 2}
                stroke="var(--mat-hormigon-borde)" strokeWidth="1" strokeDasharray="5 3" />
      ))}
      {/* estribos horizontales: anillo */}
      <rect x={px(rec)} y={py(rec)} width={Math.max(w - 2 * rec * escala, 0)} height={Math.max(wY - 2 * rec * escala, 0)} rx="3"
            stroke={color("estribosH", gris)} strokeWidth={grosor(armado.phiEstHMm, "estribosH")} opacity={opacidad("estribosH")} />
      {/* estribos verticales: cortan la planta en y */}
      <g stroke={color("estribosV", gris)} strokeWidth={es("estribosV") ? 2 : 0.9} opacity={opacidad("estribosV")} strokeDasharray="3 2">
        {xsEstV.map((x) => (
          <path key={x} d={`M${px(x)} ${py(rec)} L${px(x)} ${py(m.ladoYM - rec)}`} />
        ))}
      </g>
      {/* secundaria: en y */}
      <g stroke={color("secundaria", azul)} strokeWidth={grosor(armado.phiSecMm, "secundaria")} opacity={opacidad("secundaria")}>
        {xsSec.map((x) => (
          <path key={x} d={`M${px(x)} ${py(rec)} L${px(x)} ${py(m.ladoYM - rec)}`} />
        ))}
      </g>
      {/* tirante: en x */}
      <g stroke={color("principal", rojo)} strokeWidth={grosor(armado.phiPrincMm, "principal")} opacity={opacidad("principal")}>
        {ysPrinc.map((y) => (
          <path key={y} d={`M${px(rec)} ${py(y)} L${px(m.ladoXM - rec)} ${py(y)}`} />
        ))}
      </g>
      <text x={x0 + w + 6} y={yP + wY / 2 + 3} className="font-mono" fontSize="9"
            fill={color("secundaria", azul)} opacity={opacidad("secundaria")} fontWeight={peso("secundaria")}>
        sec. {xsSec.length}Ø{armado.phiSecMm}
      </text>
      <text x={x0} y={yP + wY + 16} className="fill-current font-mono" fontSize="9" opacity="0.7">
        tirante rojo en x · secundaria azul en y · estribos gris
      </text>
    </svg>
  );
}
