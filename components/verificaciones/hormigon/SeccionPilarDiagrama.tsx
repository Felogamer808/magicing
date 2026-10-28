"use client";

import { barrasPilar, describirArmadoPilar, type ArmaduraPilar, type GeometriaPilar } from "@/lib/calc/hormigon/pilares/pilar";

/**
 * Sección del pilar a escala: hormigón, cerco y barras en las posiciones que
 * usa el cálculo (`barrasPilar`), cada una con su diámetro. Las ramas
 * interiores del cerco se dibujan repartidas, como las supone la comprobación
 * de barras sujetas.
 */

interface Props {
  geometria: GeometriaPilar;
  armadura: ArmaduraPilar;
}

const LADO = 220;
const MARGEN = 34;

export function SeccionPilarDiagrama({ geometria: g, armadura: a }: Props) {
  const escala = LADO / Math.max(g.bM, g.hM);
  const w = g.bM * escala;
  const h = g.hM * escala;
  const x0 = MARGEN + (LADO - w) / 2;
  const y0 = MARGEN / 2 + (LADO - h) / 2;
  const rCerco = (g.recubrimientoM + a.diametroCercoMm / 2000) * escala;
  const barras = barrasPilar(g, a);
  const radio = (diametroMm: number) => Math.max((diametroMm / 2000) * escala, 2.2);

  // Ramas interiores: las paralelas a h cruzan de cara b a cara b, por las
  // mismas barras que supone la comprobación de sujeción.
  const e = (g.recubrimientoM + a.diametroCercoMm / 1000 + a.diametroEsquinaMm / 2000) * escala;
  const interiores = (n: number, ramas: number) =>
    ramas > 2 ? Array.from({ length: ramas - 2 }, (_, k) => Math.round(((k + 1) * (n - 1)) / (ramas - 1))) : [];
  const ramasParalelasH = interiores(a.barrasCaraB, a.ramasH).map((i) => x0 + e + ((w - 2 * e) * i) / (a.barrasCaraB - 1));
  const ramasParalelasB = interiores(a.barrasCaraH, a.ramasB).map((j) => y0 + e + ((h - 2 * e) * j) / (a.barrasCaraH - 1));

  const fmt = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });
  const armado = describirArmadoPilar(barras);

  return (
    <figure className="mx-auto w-full max-w-[18rem]">
      <svg viewBox={`0 0 ${LADO + 2 * MARGEN} ${LADO + MARGEN + 8}`} className="h-auto w-full" role="img"
           aria-label={`Sección ${fmt(g.bM)} × ${fmt(g.hM)} m con ${armado}`}>
        <rect x={x0} y={y0} width={w} height={h} fill="var(--mat-hormigon)" stroke="var(--mat-hormigon-borde)" strokeWidth={1.6} />
        <rect x={x0 + rCerco} y={y0 + rCerco} width={w - 2 * rCerco} height={h - 2 * rCerco} rx={4}
              fill="none" className="stroke-foreground/70" strokeWidth={1.2} />
        {ramasParalelasH.map((x, k) => (
          <line key={`h${k}`} x1={x} y1={y0 + rCerco} x2={x} y2={y0 + h - rCerco} className="stroke-foreground/50" strokeWidth={1} strokeDasharray="3 2" />
        ))}
        {ramasParalelasB.map((y, k) => (
          <line key={`b${k}`} x1={x0 + rCerco} y1={y} x2={x0 + w - rCerco} y2={y} className="stroke-foreground/50" strokeWidth={1} strokeDasharray="3 2" />
        ))}
        {barras.map((b, k) => (
          <circle key={k} cx={x0 + b.xM * escala} cy={y0 + b.yM * escala} r={radio(b.diametroMm)} className="fill-foreground" />
        ))}
        <text x={x0 + w / 2} y={y0 + h + 18} textAnchor="middle" className="fill-muted-foreground font-mono text-[11px]">
          b = {fmt(g.bM)} m
        </text>
        <text x={x0 - 10} y={y0 + h / 2} textAnchor="middle" className="fill-muted-foreground font-mono text-[11px]"
              transform={`rotate(-90 ${x0 - 10} ${y0 + h / 2})`}>
          h = {fmt(g.hM)} m
        </text>
      </svg>
      <figcaption className="text-center text-xs text-muted-foreground">
        {armado}. Dirección h: flexión que comprime una cara de ancho b. Las ramas interiores, punteadas.
      </figcaption>
    </figure>
  );
}
