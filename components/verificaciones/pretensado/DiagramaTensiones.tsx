"use client";

import type { SituacionTension } from "@/lib/calc/aci/pretensado";

/**
 * Diagrama de tensiones de una situación: la sección a la izquierda y, a su
 * derecha, la recta de tensiones entre las dos fibras.
 *
 * Es el dibujo que hace legible el pretensado. Un número suelto no dice si la
 * sección está entera comprimida, si se traccionó una fibra o cuánto margen
 * queda; el diagrama lo muestra de un vistazo, con la banda admisible sombreada
 * detrás. La escala horizontal la fija el mayor entre las tensiones y sus
 * límites, así que las tres situaciones se pueden comparar entre sí.
 */

interface Props {
  situacion: SituacionTension;
  hM: number;
  /** Escala común a las tres situaciones, en MPa. */
  escalaMPa: number;
}

const ANCHO = 340;
const ALTO = 150;
const X_SECCION = 8;
const ANCHO_SECCION = 42;
const X_CERO = 200;
/** Deja sitio arriba para la etiqueta del eje cero y abajo para la cota del canto. */
const MARGEN_Y = 26;

const fmt = (n: number) =>
  n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function DiagramaTensiones({ situacion, hM, escalaMPa }: Props) {
  const yTop = MARGEN_Y;
  const yBot = ALTO - MARGEN_Y;

  // La tracción se dibuja hacia la derecha del eje cero.
  const escalaPx = (ANCHO - X_CERO - 26) / Math.max(escalaMPa, 0.001);
  const x = (sigma: number) => X_CERO + sigma * escalaPx;

  const xSup = x(situacion.sigmaSupMPa);
  const xInf = x(situacion.sigmaInfMPa);
  const xTraccion = x(situacion.admisibleTraccionMPa);
  const xCompresion = x(situacion.admisibleCompresionMPa);

  // El diagrama de tensiones es el trapecio entre el eje cero y la recta σsup–σinf.
  const trapecio = `${X_CERO},${yTop} ${xSup},${yTop} ${xInf},${yBot} ${X_CERO},${yBot}`;

  return (
    <figure className="space-y-1">
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="h-auto w-full" role="img"
           aria-label={`Tensiones en ${situacion.nombre}: ${fmt(situacion.sigmaSupMPa)} MPa arriba y ${fmt(situacion.sigmaInfMPa)} MPa abajo`}>
        {/* Banda admisible: todo lo que quede fuera de este sombreado no verifica. */}
        <rect
          x={Math.min(xCompresion, xTraccion)}
          y={yTop - 6}
          width={Math.abs(xTraccion - xCompresion)}
          height={yBot - yTop + 12}
          className="fill-emerald-600/10"
        />
        <line x1={xTraccion} y1={yTop - 6} x2={xTraccion} y2={yBot + 6}
              className="stroke-emerald-700/50" strokeWidth={1} strokeDasharray="3 2" />
        <line x1={xCompresion} y1={yTop - 6} x2={xCompresion} y2={yBot + 6}
              className="stroke-emerald-700/50" strokeWidth={1} strokeDasharray="3 2" />

        {/* Canto de la sección, a escala del alto disponible. */}
        <rect x={X_SECCION} y={yTop} width={ANCHO_SECCION} height={yBot - yTop}
              className="fill-primary/10 stroke-foreground/50" strokeWidth={1.2} />
        <text x={X_SECCION + ANCHO_SECCION / 2} y={yBot + 13}
              className="fill-muted-foreground text-[10.5px]" textAnchor="middle">
          h = {fmt(hM)} m
        </text>

        {/* Eje de tensión nula. */}
        <line x1={X_CERO} y1={yTop - 12} x2={X_CERO} y2={yBot + 12}
              className="stroke-foreground/60" strokeWidth={1.2} />
        <text x={X_CERO} y={yTop - 15} className="fill-muted-foreground text-[10.5px]" textAnchor="middle">0</text>

        {/* Trapecio de tensiones. */}
        <polygon points={trapecio} className="fill-primary/25 stroke-primary" strokeWidth={1.5} />

        {/* Valores en cada fibra, con el color del resultado. */}
        <circle cx={xSup} cy={yTop} r={2.6}
                className={situacion.verificaSup ? "fill-emerald-600" : "fill-destructive"} />
        <circle cx={xInf} cy={yBot} r={2.6}
                className={situacion.verificaInf ? "fill-emerald-600" : "fill-destructive"} />

        <text x={xSup + (situacion.sigmaSupMPa >= 0 ? 5 : -5)} y={yTop + 3}
              textAnchor={situacion.sigmaSupMPa >= 0 ? "start" : "end"}
              className={`text-[11.5px] tabular-nums ${situacion.verificaSup ? "fill-foreground" : "fill-destructive font-medium"}`}>
          {fmt(situacion.sigmaSupMPa)}
        </text>
        <text x={xInf + (situacion.sigmaInfMPa >= 0 ? 5 : -5)} y={yBot + 3}
              textAnchor={situacion.sigmaInfMPa >= 0 ? "start" : "end"}
              className={`text-[11.5px] tabular-nums ${situacion.verificaInf ? "fill-foreground" : "fill-destructive font-medium"}`}>
          {fmt(situacion.sigmaInfMPa)}
        </text>

        {/* Referencias de las fibras. */}
        <text x={X_SECCION + ANCHO_SECCION + 6} y={yTop + 3} className="fill-muted-foreground text-[10.5px]">sup</text>
        <text x={X_SECCION + ANCHO_SECCION + 6} y={yBot + 3} className="fill-muted-foreground text-[10.5px]">inf</text>

        <text x={ANCHO - 2} y={ALTO - 4} textAnchor="end" className="fill-muted-foreground text-[10.5px]">
          compresión ← MPa → tracción
        </text>
      </svg>
    </figure>
  );
}
