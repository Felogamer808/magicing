"use client";

import type { ResultadoFlecha } from "@/lib/calc/hormigon/deformaciones";

/**
 * Tres cosas que con números sueltos no se ven:
 *
 *  1. La deformada, con la flecha acotada contra los dos límites del art.
 *     7.4.1. La escala vertical está exagerada a propósito —si no, una flecha
 *     de 15 mm en 6 m de luz no se vería—, y los límites se dibujan con la
 *     misma exageración, así que la comparación entre ellos sí es a escala.
 *  2. Dónde cayó la sección entre no fisurada y fisurada: ζ de la ec. (7.19)
 *     es lo que más mueve el resultado y depende de Mcr/M, que es una relación
 *     que conviene ver.
 *  3. De qué está hecha la flecha total: cuánto es instantánea y cuánto se
 *     agrega después por fluencia y retracción. Es lo que decide la
 *     comprobación contra L/500, que va sólo con la parte diferida.
 */

interface Props {
  resultado: ResultadoFlecha;
  luzM: number;
  /** Cambia el esquema dibujado: apoyos en los extremos o empotramiento. */
  voladizo: boolean;
  mqpKNm: number;
}

const ANCHO = 440;
const ALTO = 300;

const fmt = (n: number, d = 2) =>
  n.toLocaleString("es-AR", { minimumFractionDigits: d, maximumFractionDigits: d });

/** Deformada normalizada (vale 1 en el punto de flecha máxima). */
function formaDeformada(xi: number, voladizo: boolean): number {
  return voladizo
    ? (xi ** 4 - 4 * xi ** 3 + 6 * xi ** 2) / 3 // carga uniforme en voladizo
    : (xi - 2 * xi ** 3 + xi ** 4) / 0.3125; // carga uniforme biapoyada
}

export function DiagramaFlecha({ resultado, luzM, voladizo, mqpKNm }: Props) {
  const {
    flechaTotalMm, flechaInstantaneaMm, flechaDiferidaMm,
    limiteAparienciaMm, limiteDanioMm,
    verificaApariencia, verificaDanio,
    zeta, fisura, mcrKNm,
  } = resultado;

  const xIzq = 40;
  const xDer = ANCHO - 64;
  const luzPx = xDer - xIzq;
  const yViga = 44;

  // Exageración común a la flecha y a los dos límites: lo que se compara entre
  // sí queda a escala aunque nada esté a escala de la luz.
  const mayor = Math.max(flechaTotalMm, limiteAparienciaMm, 1e-6);
  const flechaMaxPx = 52;
  const escalaV = flechaMaxPx / mayor;

  const puntos = Array.from({ length: 41 }, (_, i) => {
    const xi = i / 40;
    const x = xIzq + xi * luzPx;
    const y = yViga + formaDeformada(xi, voladizo) * flechaTotalMm * escalaV;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");

  const xFlecha = voladizo ? xDer : xIzq + luzPx / 2;
  const yFlecha = yViga + flechaTotalMm * escalaV;
  const yLimApariencia = yViga + limiteAparienciaMm * escalaV;

  // Barras de comprobación.
  const yBarras = 168;
  const xBarra = 120;
  const anchoBarras = ANCHO - xBarra - 58;
  const escalaBarra =
    anchoBarras / Math.max(flechaTotalMm, limiteAparienciaMm, flechaDiferidaMm, limiteDanioMm, 1e-6);

  const comprobaciones = [
    {
      titulo: "total",
      limiteEtiqueta: "L/250",
      valor: flechaTotalMm,
      limite: limiteAparienciaMm,
      ok: verificaApariencia,
    },
    {
      titulo: "diferida",
      limiteEtiqueta: "L/500",
      valor: flechaDiferidaMm,
      limite: limiteDanioMm,
      ok: verificaDanio,
    },
  ];

  // Escala de fisuración: dónde cayó ζ entre estado I y estado II.
  const yZeta = 258;
  const xZeta = 120;
  const anchoZeta = ANCHO - xZeta - 58;

  return (
    <figure className="space-y-1">
      <svg
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Flecha total ${fmt(flechaTotalMm)} mm contra el límite ${fmt(limiteAparienciaMm)} mm`}
      >
        {/* ---- deformada ---- */}
        <text x={xIzq - 24} y={18} className="fill-muted-foreground text-[10.5px]">
          deformada (escala vertical exagerada)
        </text>

        {/* Posición sin deformar. */}
        <line
          x1={xIzq}
          y1={yViga}
          x2={xDer}
          y2={yViga}
          className="stroke-muted-foreground/50"
          strokeWidth={1}
          strokeDasharray="4 3"
        />

        {/* Límite de apariencia L/250, con la misma exageración. */}
        <line
          x1={xIzq}
          y1={yLimApariencia}
          x2={xDer}
          y2={yLimApariencia}
          className="stroke-emerald-700"
          strokeWidth={1.2}
          strokeDasharray="3 3"
        />
        {/* Separada del apoyo: con flechas grandes la escala comprime el límite
            contra la viga y la etiqueta se montaba sobre el triángulo. */}
        <text x={xDer + 14} y={yLimApariencia + 3} className="fill-emerald-700 text-[9.5px]">
          L/250
        </text>

        {/* Deformada. */}
        <polyline
          points={puntos}
          fill="none"
          className={verificaApariencia ? "stroke-primary" : "stroke-destructive"}
          strokeWidth={2.2}
        />

        {/* Apoyos. */}
        {voladizo ? (
          <>
            <line x1={xIzq} y1={yViga - 14} x2={xIzq} y2={yViga + 14} className="stroke-foreground" strokeWidth={2} />
            {Array.from({ length: 5 }, (_, i) => (
              <line
                key={i}
                x1={xIzq}
                y1={yViga - 14 + i * 7}
                x2={xIzq - 7}
                y2={yViga - 14 + i * 7 + 7}
                className="stroke-foreground/60"
                strokeWidth={1}
              />
            ))}
          </>
        ) : (
          [xIzq, xDer].map((x) => (
            <g key={x}>
              <polygon
                points={`${x},${yViga} ${x - 7},${yViga + 12} ${x + 7},${yViga + 12}`}
                className="fill-transparent stroke-foreground"
                strokeWidth={1.3}
              />
              <line
                x1={x - 10}
                y1={yViga + 12}
                x2={x + 10}
                y2={yViga + 12}
                className="stroke-foreground"
                strokeWidth={1.3}
              />
            </g>
          ))
        )}

        {/* Cota de la flecha. */}
        <line
          x1={xFlecha}
          y1={yViga}
          x2={xFlecha}
          y2={yFlecha}
          className={verificaApariencia ? "stroke-primary" : "stroke-destructive"}
          strokeWidth={1.2}
        />
        <text
          x={xFlecha + 6}
          y={(yViga + yFlecha) / 2 + 4}
          className={`text-[11.5px] font-medium tabular-nums ${
            verificaApariencia ? "fill-foreground" : "fill-destructive"
          }`}
        >
          {fmt(flechaTotalMm)} mm
        </text>

        <text x={xIzq} y={ALTO - 186} className="fill-muted-foreground text-[10px]">
          L = {fmt(luzM, 2)} m {voladizo ? "(vuelo)" : ""}
        </text>

        {/* ---- comprobaciones ---- */}
        {comprobaciones.map((c, i) => {
          const y = yBarras + i * 40;
          const xLim = xBarra + c.limite * escalaBarra;
          return (
            <g key={c.titulo}>
              <text x={16} y={y + 14} className="fill-foreground text-[10.5px]">
                flecha {c.titulo}
              </text>
              <text x={16} y={y + 25} className="fill-muted-foreground text-[9.5px]">
                {c.limiteEtiqueta} = {fmt(c.limite)} mm
              </text>

              <rect
                x={xBarra}
                y={y}
                width={Math.max(c.limite * escalaBarra, 0)}
                height={20}
                className="fill-emerald-600/12"
              />
              <rect
                x={xBarra}
                y={y}
                width={Math.max(c.valor * escalaBarra, 1.5)}
                height={20}
                className={
                  c.ok ? "fill-primary/50 stroke-primary" : "fill-destructive/40 stroke-destructive"
                }
                strokeWidth={1.1}
              />
              <line
                x1={xLim}
                y1={y - 4}
                x2={xLim}
                y2={y + 24}
                className="stroke-emerald-700"
                strokeWidth={1.2}
                strokeDasharray="3 2"
              />
              <text
                x={ANCHO - 52}
                y={y + 14}
                className={`text-[11px] tabular-nums ${
                  c.ok ? "fill-foreground" : "fill-destructive font-medium"
                }`}
              >
                {fmt(c.valor)}
              </text>
            </g>
          );
        })}

        {/* Composición de la flecha total: cuánto es instantánea. */}
        <text x={16} y={yBarras - 12} className="fill-muted-foreground text-[10px]">
          instantánea {fmt(flechaInstantaneaMm)} mm + diferida {fmt(flechaDiferidaMm)} mm
        </text>

        {/* ---- estado de fisuración ---- */}
        <text x={16} y={yZeta + 6} className="fill-foreground text-[10.5px]">
          fisuración
        </text>
        <text x={16} y={yZeta + 17} className="fill-muted-foreground text-[9.5px]">
          ζ = {fmt(zeta, 3)}
        </text>

        <line
          x1={xZeta}
          y1={yZeta + 6}
          x2={xZeta + anchoZeta}
          y2={yZeta + 6}
          className="stroke-border"
          strokeWidth={4}
          strokeLinecap="round"
        />
        <line
          x1={xZeta}
          y1={yZeta + 6}
          x2={xZeta + anchoZeta * zeta}
          y2={yZeta + 6}
          className="stroke-primary"
          strokeWidth={4}
          strokeLinecap="round"
        />
        <circle cx={xZeta + anchoZeta * zeta} cy={yZeta + 6} r={4} className="fill-primary" />
        <text x={xZeta} y={yZeta - 4} className="fill-muted-foreground text-[9px]">
          sin fisurar
        </text>
        <text x={xZeta + anchoZeta} y={yZeta - 4} textAnchor="end" className="fill-muted-foreground text-[9px]">
          fisurada
        </text>
        <text x={xZeta} y={yZeta + 22} className="fill-muted-foreground text-[9.5px]">
          {fisura
            ? `M = ${fmt(mqpKNm)} > Mcr = ${fmt(mcrKNm)} kN·m`
            : `M = ${fmt(mqpKNm)} ≤ Mcr = ${fmt(mcrKNm)} kN·m — no fisura`}
        </text>
      </svg>
    </figure>
  );
}
