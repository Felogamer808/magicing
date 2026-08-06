"use client";

import { tensionCritica } from "@/lib/calc/aisc/compresion";

/**
 * Curva de pandeo del artículo E3: Fcr/Fy contra la esbeltez, con los dos ejes
 * del perfil marcados encima.
 *
 * Es lo que un par de números no muestra: de qué lado del quiebre está cada eje,
 * cuánto margen hay hasta el otro régimen y por qué uno gobierna. La curva se
 * genera llamando a la misma función que calcula el resultado, así que no puede
 * discrepar con él.
 */

interface Props {
  fyPa: number;
  ePa: number;
  esbeltezFuerte: number;
  esbeltezDebil: number;
  gobierna: "fuerte" | "débil";
}

const ANCHO = 420;
const ALTO = 210;
const IZQ = 44;
const DER = ANCHO - 16;
/** Deja sitio arriba para la etiqueta de la esbeltez límite. */
const TOP = 22;
const BASE = ALTO - 34;

const fmt = (n: number, d = 0) =>
  n.toLocaleString("es-AR", { minimumFractionDigits: d, maximumFractionDigits: d });

export function CurvaPandeo({ fyPa, ePa, esbeltezFuerte, esbeltezDebil, gobierna }: Props) {
  const limite = 4.71 * Math.sqrt(ePa / fyPa);
  const esbeltezMax = Math.max(limite * 1.9, esbeltezFuerte, esbeltezDebil) * 1.08;

  const x = (esb: number) => IZQ + (esb / esbeltezMax) * (DER - IZQ);
  const y = (rel: number) => BASE - rel * (BASE - TOP);

  // Se recorre la curva con paso fino: el quiebre en el límite tiene que verse.
  const puntos: string[] = [];
  const pasos = 90;
  for (let i = 1; i <= pasos; i++) {
    const esb = (esbeltezMax * i) / pasos;
    const { fcrPa } = tensionCritica(esb, fyPa, ePa);
    puntos.push(`${x(esb).toFixed(1)},${y(Math.min(fcrPa / fyPa, 1)).toFixed(1)}`);
  }

  const marca = (esb: number, etiqueta: string, manda: boolean) => {
    const { fcrPa } = tensionCritica(esb, fyPa, ePa);
    const rel = Math.min(fcrPa / fyPa, 1);
    return (
      <g key={etiqueta}>
        <line x1={x(esb)} y1={y(rel)} x2={x(esb)} y2={BASE}
              className={manda ? "stroke-destructive" : "stroke-muted-foreground"}
              strokeWidth={1} strokeDasharray="3 2" />
        <circle cx={x(esb)} cy={y(rel)} r={manda ? 4 : 3}
                className={manda ? "fill-destructive" : "fill-muted-foreground"} />
        <text x={x(esb)} y={y(rel) - 8} textAnchor="middle"
              className={`text-[10.5px] ${manda ? "fill-destructive font-medium" : "fill-muted-foreground"}`}>
          {etiqueta} {fmt(esb)}
        </text>
      </g>
    );
  };

  return (
    <figure className="space-y-1">
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="h-auto w-full" role="img"
           aria-label={`Curva de pandeo: eje fuerte con esbeltez ${fmt(esbeltezFuerte)} y débil ${fmt(esbeltezDebil)}`}>
        {/* Ejes. */}
        <line x1={IZQ} y1={TOP - 6} x2={IZQ} y2={BASE} className="stroke-foreground/50" strokeWidth={1} />
        <line x1={IZQ} y1={BASE} x2={DER} y2={BASE} className="stroke-foreground/50" strokeWidth={1} />
        <text x={IZQ - 6} y={y(1) + 3} textAnchor="end" className="fill-muted-foreground text-[10.5px]">1,0</text>
        <text x={IZQ - 6} y={BASE + 3} textAnchor="end" className="fill-muted-foreground text-[10.5px]">0</text>
        <text x={IZQ - 38} y={(TOP + BASE) / 2} className="fill-muted-foreground text-[10.5px]">Fcr/Fy</text>
        <text x={DER} y={ALTO - 6} textAnchor="end" className="fill-muted-foreground text-[10.5px]">
          esbeltez Lc/r
        </text>

        {/* Frontera entre pandeo inelástico y elástico. */}
        <line x1={x(limite)} y1={TOP - 6} x2={x(limite)} y2={BASE + 6}
              className="stroke-primary/70" strokeWidth={1} strokeDasharray="5 3" />
        <text x={x(limite)} y={TOP - 9} textAnchor="middle" className="fill-primary text-[10.5px]">
          4,71·√(E/Fy) = {fmt(limite)}
        </text>
        <text x={x(limite) - 6} y={BASE - 6} textAnchor="end" className="fill-muted-foreground text-[9.5px]">
          inelástico
        </text>
        <text x={x(limite) + 6} y={BASE - 6} className="fill-muted-foreground text-[9.5px]">
          elástico
        </text>

        {/* Curva. */}
        <polyline points={puntos.join(" ")} fill="none" className="stroke-primary" strokeWidth={1.8} />

        {marca(esbeltezFuerte, "fuerte", gobierna === "fuerte")}
        {marca(esbeltezDebil, "débil", gobierna === "débil")}
      </svg>
    </figure>
  );
}
