"use client";

import { fmt } from "@/lib/verificaciones/formato";

/**
 * Sección rectangular con sus dos ejes, en la notación del Eurocódigo 5.
 *
 * El croquis existe sobre todo por los ejes. La planilla los llama x e y; la
 * norma, y (fuerte) y z (débil). Esa traducción es donde se cuelan los errores
 * —λrel,z gobierna el pandeo, My,crit el vuelco— y verlo dibujado con el canto
 * a escala evita tener que reconstruirlo mentalmente en cada fórmula.
 */

interface Props {
  anchoM: number;
  cantoM: number;
  /** Sombrea la anchura eficaz bef = kcr·b de las comprobaciones de cortante. */
  anchoEficazM?: number;
}

const ANCHO = 300;
const ALTO = 250;

export function CroquisSeccionMadera({ anchoM, cantoM, anchoEficazM }: Props) {
  if (!(anchoM > 0) || !(cantoM > 0)) return null;

  // Escala común a las dos direcciones, para que la proporción sea la real.
  const disponibleX = 130;
  const disponibleY = 160;
  const escala = Math.min(disponibleX / anchoM, disponibleY / cantoM);

  const b = anchoM * escala;
  const h = cantoM * escala;
  // Corrido a la derecha porque la cota del canto cuelga por la izquierda: sin
  // este offset el dibujo queda pegado al borde derecho del viewBox.
  const cx = ANCHO / 2 + 25;
  // Centro bajado para que la cota de la anchura y el rótulo del eje z entren
  // arriba sin salirse del viewBox en las secciones de mucho canto.
  const cy = ALTO / 2 + 3;
  const x0 = cx - b / 2;
  const y0 = cy - h / 2;

  const bef = anchoEficazM !== undefined ? anchoEficazM * escala : null;

  return (
    <figure className="space-y-1">
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="h-auto w-full" role="img"
           aria-label={`Sección de ${fmt(anchoM, 3)} por ${fmt(cantoM, 3)} metros`}>
        <rect x={x0} y={y0} width={b} height={h} rx={1}
              className="fill-amber-600/15 stroke-amber-800" strokeWidth={1.6} />

        {bef !== null && (
          <>
            <rect x={cx - bef / 2} y={y0} width={bef} height={h}
                  className="fill-amber-700/30" />
            <text x={cx} y={y0 + h + 26} textAnchor="middle"
                  className="fill-amber-800 text-[11px]">
              bef = {fmt(anchoEficazM!, 3)} m
            </text>
          </>
        )}

        {/*
          Cada rótulo tiene su lado y no lo comparte con nadie: cota de anchura
          arriba, cota de canto a la izquierda, eje y a la derecha y eje z
          arriba a la derecha de la cota. Repartirlos así no es estética: con la
          cota del canto y el rótulo del eje y del mismo lado, en secciones de
          poco canto las dos cajas de texto se pisan.
        */}

        {/* Eje fuerte y: horizontal, la flexión que moviliza el canto. */}
        <line x1={x0 - 10} y1={cy} x2={x0 + b + 22} y2={cy}
              className="stroke-primary" strokeWidth={1} strokeDasharray="5 3" />
        <text x={x0 + b + 26} y={cy + 4} className="fill-primary text-[12px] font-medium">y</text>

        {/* Eje débil z: vertical. */}
        <line x1={cx} y1={y0 - 12} x2={x0 + b / 2} y2={y0 + h + 10}
              className="stroke-primary" strokeWidth={1} strokeDasharray="5 3" />
        <text x={cx + 6} y={y0 - 14} className="fill-primary text-[12px] font-medium">z</text>

        {/* Cota de la anchura, arriba del todo. */}
        <line x1={x0} y1={y0 - 26} x2={x0 + b} y2={y0 - 26}
              className="stroke-muted-foreground" strokeWidth={0.9} />
        <line x1={x0} y1={y0 - 29} x2={x0} y2={y0 - 23} className="stroke-muted-foreground" strokeWidth={0.9} />
        <line x1={x0 + b} y1={y0 - 29} x2={x0 + b} y2={y0 - 23} className="stroke-muted-foreground" strokeWidth={0.9} />
        <text x={cx} y={y0 - 32} textAnchor="middle" className="fill-foreground text-[11.5px]">
          b = {fmt(anchoM, 3)} m
        </text>

        {/* Cota del canto, a la izquierda. */}
        <line x1={x0 - 16} y1={y0} x2={x0 - 16} y2={y0 + h}
              className="stroke-muted-foreground" strokeWidth={0.9} />
        <line x1={x0 - 19} y1={y0} x2={x0 - 13} y2={y0} className="stroke-muted-foreground" strokeWidth={0.9} />
        <line x1={x0 - 19} y1={y0 + h} x2={x0 - 13} y2={y0 + h} className="stroke-muted-foreground" strokeWidth={0.9} />
        <text x={x0 - 22} y={cy - 4} textAnchor="end" className="fill-foreground text-[11.5px]">
          h = {fmt(cantoM, 3)} m
        </text>

        {/* Fibra, para no perder de vista que el material es anisótropo. */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={x0 + 4} y1={y0 + h * f} x2={x0 + b - 4} y2={y0 + h * f}
                className="stroke-amber-800/30" strokeWidth={0.7} />
        ))}
      </svg>
      <figcaption className="text-xs text-muted-foreground">
        Ejes del Eurocódigo: <strong className="text-foreground">y</strong> es el fuerte —flexión
        que moviliza el canto h— y <strong className="text-foreground">z</strong> el débil. La
        planilla los llama x e y.
      </figcaption>
    </figure>
  );
}
