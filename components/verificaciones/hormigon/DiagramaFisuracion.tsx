"use client";

import { useId } from "react";
import type { ResultadoFisuracion } from "@/lib/calc/ec2/fisuracion";

/**
 * Sección en estado fisurado, con el área eficaz de tracción rayada.
 *
 * Es la parte de la verificación que cuesta imaginar. El ancho de fisura no
 * depende del área total de hormigón traccionado sino de una franja acotada
 * alrededor de la armadura —el área eficaz—, y la cuantía sobre esa franja,
 * ρp,ef, es la que gobierna la separación entre fisuras. Con los números sueltos
 * no se ve de dónde sale esa franja ni por qué es tan chica; dibujada, sí.
 *
 * El canto del área eficaz es el menor de tres criterios (2,5·(h−d), (h−x)/3 y
 * h/2), y cuál mandó se indica al pie.
 */

interface Props {
  resultado: ResultadoFisuracion;
  bM: number;
  hM: number;
  /** Barras de la capa principal, para dibujarlas. */
  n1: number;
  diametro1Mm: number;
  wAdmMm: number;
}

const ANCHO = 440;
const ALTO = 220;
const TOP = 24;
const BASE = ALTO - 44;

const fmt = (n: number, d = 1) =>
  n.toLocaleString("es-AR", { minimumFractionDigits: d, maximumFractionDigits: d });

export function DiagramaFisuracion({ resultado, bM, hM, n1, diametro1Mm, wAdmMm }: Props) {
  const rayado = useId();
  const { xM, dM, hcEfM, rhoPEf, srMaxMm, wkMm, verifica, sigmaSMPa } = resultado;

  const alturaPx = BASE - TOP;
  const y = (m: number) => TOP + (m / hM) * alturaPx;

  const anchoSeccion = Math.min(120, (bM / hM) * alturaPx);
  const xIzq = 58;
  const xDer = xIzq + anchoSeccion;

  const yX = y(Math.min(xM, hM));
  const yD = y(dM);
  const yEficaz = y(Math.max(hM - hcEfM, 0));

  // Cuál de los tres criterios impuso el canto del área eficaz.
  const criterios = [
    { valor: 2.5 * (hM - dM), nombre: "2,5·(h−d)" },
    { valor: (hM - xM) / 3, nombre: "(h−x)/3" },
    { valor: hM / 2, nombre: "h/2" },
  ];
  const manda = criterios.reduce((a, b) => (b.valor < a.valor ? b : a));

  // Barra comparativa de wk contra su admisible.
  const xBarra = xDer + 96;
  const anchoBarra = ANCHO - xBarra - 16;
  const escalaW = anchoBarra / Math.max(wkMm, wAdmMm) / 1.2;

  return (
    <figure className="space-y-1">
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="h-auto w-full" role="img"
           aria-label={`Sección fisurada: área eficaz de ${fmt(hcEfM * 100)} cm y abertura ${fmt(wkMm, 3)} mm`}>
        <defs>
          <pattern id={rayado} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" className="stroke-destructive/60" strokeWidth="1.4" />
          </pattern>
        </defs>

        {/* Sección completa. */}
        <rect x={xIzq} y={TOP} width={anchoSeccion} height={alturaPx}
              className="fill-transparent stroke-foreground/60" strokeWidth={1.3} />

        {/* Zona comprimida del estado fisurado. */}
        <rect x={xIzq} y={TOP} width={anchoSeccion} height={yX - TOP}
              className="fill-primary/30" />
        <text x={xIzq + anchoSeccion / 2} y={(TOP + yX) / 2 + 3} textAnchor="middle"
              className="fill-foreground text-[10.5px]">comprimido</text>

        {/* Área eficaz de tracción: la franja que gobierna la fisuración. */}
        <rect x={xIzq} y={yEficaz} width={anchoSeccion} height={BASE - yEficaz}
              fill={`url(#${rayado})`} />
        <rect x={xIzq} y={yEficaz} width={anchoSeccion} height={BASE - yEficaz}
              className="fill-transparent stroke-destructive" strokeWidth={1.2} />

        {/* Fibra neutra. */}
        <line x1={xIzq - 10} y1={yX} x2={xDer + 10} y2={yX}
              className="stroke-primary" strokeWidth={1.2} strokeDasharray="5 3" />
        <text x={xIzq - 12} y={yX + 3} textAnchor="end" className="fill-primary text-[10.5px]">
          x = {fmt(xM * 100)} cm
        </text>

        {/* Armadura. */}
        {Array.from({ length: Math.max(n1, 1) }, (_, i) => {
          const paso = anchoSeccion * 0.76;
          const cx = n1 <= 1
            ? xIzq + anchoSeccion / 2
            : xIzq + anchoSeccion * 0.12 + (i * paso) / (n1 - 1);
          return <circle key={i} cx={cx} cy={yD} r={2.8} className="fill-foreground" />;
        })}
        <text x={xIzq - 12} y={yD + 3} textAnchor="end" className="fill-muted-foreground text-[10.5px]">
          {n1}⌀{diametro1Mm}
        </text>

        {/* Cota del área eficaz. */}
        <line x1={xDer + 16} y1={yEficaz} x2={xDer + 16} y2={BASE}
              className="stroke-destructive" strokeWidth={1.2} />
        <line x1={xDer + 12} y1={yEficaz} x2={xDer + 20} y2={yEficaz} className="stroke-destructive" strokeWidth={1.2} />
        <line x1={xDer + 12} y1={BASE} x2={xDer + 20} y2={BASE} className="stroke-destructive" strokeWidth={1.2} />
        <text x={xDer + 24} y={(yEficaz + BASE) / 2 - 3} className="fill-destructive text-[10.5px]">
          hc,ef = {fmt(hcEfM * 100)} cm
        </text>
        <text x={xDer + 24} y={(yEficaz + BASE) / 2 + 9} className="fill-muted-foreground text-[10.5px]">
          manda {manda.nombre}
        </text>

        {/* Cuantía eficaz y tensión del acero: lo que alimenta la separación de fisuras. */}
        <text x={xIzq} y={BASE + 16} className="fill-muted-foreground text-[10.5px]">
          ρp,ef = {fmt(rhoPEf * 100, 2)} % · σs = {fmt(sigmaSMPa, 0)} MPa · sr,máx = {fmt(srMaxMm, 0)} mm
        </text>

        {/* Abertura de fisura contra su límite. */}
        <text x={xBarra} y={TOP + 2} className="fill-muted-foreground text-[10.5px]">abertura wk</text>
        <rect x={xBarra} y={TOP + 8} width={wAdmMm * escalaW} height={13}
              className="fill-emerald-600/15" />
        <rect x={xBarra} y={TOP + 8} width={Math.max(wkMm * escalaW, 1)} height={13}
              className={verifica ? "fill-primary/50 stroke-primary" : "fill-destructive/40 stroke-destructive"}
              strokeWidth={1} />
        <line x1={xBarra + wAdmMm * escalaW} y1={TOP + 4} x2={xBarra + wAdmMm * escalaW} y2={TOP + 25}
              className="stroke-emerald-700" strokeWidth={1} strokeDasharray="3 2" />
        <text x={xBarra} y={TOP + 36}
              className={`text-[11.5px] tabular-nums ${verifica ? "fill-foreground" : "fill-destructive font-medium"}`}>
          {fmt(wkMm, 3)} mm
        </text>
        <text x={xBarra} y={TOP + 48} className="fill-muted-foreground text-[10.5px]">
          límite {fmt(wAdmMm, 1)} mm
        </text>

        <text x={xIzq} y={ALTO - 6} className="fill-muted-foreground text-[10.5px]">
          La fisuración la gobierna la franja rayada, no el hormigón traccionado entero.
        </text>
      </svg>
    </figure>
  );
}
