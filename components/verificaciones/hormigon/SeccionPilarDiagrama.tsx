"use client";

/**
 * Sección del pilar a escala: hormigón, cerco y barras en sus posiciones
 * reales. Las ramas interiores del cerco se dibujan repartidas, como las
 * supone la comprobación de barras sujetas.
 */

interface Props {
  bM: number;
  hM: number;
  recubrimientoM: number;
  diametroMm: number;
  diametroCercoMm: number;
  barrasCaraB: number;
  barrasCaraH: number;
  ramasH: number;
  ramasB: number;
}

const LADO = 220;
const MARGEN = 34;

export function SeccionPilarDiagrama(p: Props) {
  const escala = LADO / Math.max(p.bM, p.hM);
  const w = p.bM * escala;
  const h = p.hM * escala;
  const x0 = MARGEN + (LADO - w) / 2;
  const y0 = MARGEN / 2 + (LADO - h) / 2;
  const rCerco = (p.recubrimientoM + p.diametroCercoMm / 2000) * escala;
  const r = (p.recubrimientoM + p.diametroCercoMm / 1000 + p.diametroMm / 2000) * escala;
  const radio = Math.max((p.diametroMm / 2000) * escala, 2.2);

  const barras: [number, number][] = [];
  for (let i = 0; i < p.barrasCaraB; i++) {
    const x = x0 + r + ((w - 2 * r) * i) / (p.barrasCaraB - 1);
    barras.push([x, y0 + r], [x, y0 + h - r]);
  }
  for (let j = 1; j < p.barrasCaraH - 1; j++) {
    const y = y0 + r + ((h - 2 * r) * j) / (p.barrasCaraH - 1);
    barras.push([x0 + r, y], [x0 + w - r, y]);
  }

  // Ramas interiores: las paralelas a h cruzan de cara b a cara b.
  const interiores = (n: number, ramas: number) =>
    ramas > 2 ? Array.from({ length: ramas - 2 }, (_, k) => Math.round(((k + 1) * (n - 1)) / (ramas - 1))) : [];
  const ramasParalelasH = interiores(p.barrasCaraB, p.ramasH).map((i) => x0 + r + ((w - 2 * r) * i) / (p.barrasCaraB - 1));
  const ramasParalelasB = interiores(p.barrasCaraH, p.ramasB).map((j) => y0 + r + ((h - 2 * r) * j) / (p.barrasCaraH - 1));

  const fmt = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });

  return (
    <figure className="mx-auto w-full max-w-[18rem]">
      <svg viewBox={`0 0 ${LADO + 2 * MARGEN} ${LADO + MARGEN + 8}`} className="h-auto w-full" role="img"
           aria-label={`Sección ${fmt(p.bM)} × ${fmt(p.hM)} m con ${2 * p.barrasCaraB + 2 * p.barrasCaraH - 4} barras Ø${p.diametroMm}`}>
        <rect x={x0} y={y0} width={w} height={h} fill="var(--mat-hormigon)" stroke="var(--mat-hormigon-borde)" strokeWidth={1.6} />
        <rect x={x0 + rCerco} y={y0 + rCerco} width={w - 2 * rCerco} height={h - 2 * rCerco} rx={4}
              fill="none" className="stroke-foreground/70" strokeWidth={1.2} />
        {ramasParalelasH.map((x, k) => (
          <line key={`h${k}`} x1={x} y1={y0 + rCerco} x2={x} y2={y0 + h - rCerco} className="stroke-foreground/50" strokeWidth={1} strokeDasharray="3 2" />
        ))}
        {ramasParalelasB.map((y, k) => (
          <line key={`b${k}`} x1={x0 + rCerco} y1={y} x2={x0 + w - rCerco} y2={y} className="stroke-foreground/50" strokeWidth={1} strokeDasharray="3 2" />
        ))}
        {barras.map(([x, y], k) => (
          <circle key={k} cx={x} cy={y} r={radio} className="fill-foreground" />
        ))}
        <text x={x0 + w / 2} y={y0 + h + 18} textAnchor="middle" className="fill-muted-foreground font-mono text-[11px]">
          b = {fmt(p.bM)} m
        </text>
        <text x={x0 - 10} y={y0 + h / 2} textAnchor="middle" className="fill-muted-foreground font-mono text-[11px]"
              transform={`rotate(-90 ${x0 - 10} ${y0 + h / 2})`}>
          h = {fmt(p.hM)} m
        </text>
      </svg>
      <figcaption className="text-center text-xs text-muted-foreground">
        Dirección h: flexión que comprime una cara de ancho b. Las ramas interiores, punteadas.
      </figcaption>
    </figure>
  );
}
