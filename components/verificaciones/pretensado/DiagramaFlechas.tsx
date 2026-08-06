"use client";

/**
 * Flechas contra sus límites, en barras horizontales.
 *
 * Se dibujan las tres juntas y a la misma escala porque cada una tiene su propio
 * límite —L/360, L/240 y L/250— y lo que interesa no es el milímetro sino cuánto
 * margen queda en cada una. Una contraflecha del pretensado que supere a la
 * carga da valor negativo: la pieza queda levantada, y eso también se ve.
 */

interface Fila {
  etiqueta: string;
  valorMm: number;
  limiteMm: number;
  referencia: string;
}

interface Props {
  instantaneaMm: number;
  activaMm: number;
  totalMm: number;
  limiteInstantaneaMm: number;
  limiteActivaMm: number;
  limiteTotalMm: number;
}

const ANCHO = 420;
const ALTO_FILA = 40;
const X_ETIQUETA = 92;
const X_CERO = 108;

const fmt = (n: number) =>
  n.toLocaleString("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function DiagramaFlechas({
  instantaneaMm,
  activaMm,
  totalMm,
  limiteInstantaneaMm,
  limiteActivaMm,
  limiteTotalMm,
}: Props) {
  const filas: Fila[] = [
    { etiqueta: "Instantánea", valorMm: instantaneaMm, limiteMm: limiteInstantaneaMm, referencia: "L/360" },
    { etiqueta: "Activa", valorMm: activaMm, limiteMm: limiteActivaMm, referencia: "L/240" },
    { etiqueta: "Total", valorMm: totalMm, limiteMm: limiteTotalMm, referencia: "L/250" },
  ];

  // El +26 deja sitio a la leyenda del pie, que tiene letras con cola.
  const alto = filas.length * ALTO_FILA + 26;
  const maximo = Math.max(...filas.flatMap((f) => [Math.abs(f.valorMm), f.limiteMm])) * 1.15;
  const escala = (ANCHO - X_CERO - 70) / Math.max(maximo, 0.001);

  return (
    <figure className="space-y-1">
      <svg viewBox={`0 0 ${ANCHO} ${alto}`} className="h-auto w-full" role="img"
           aria-label={`Flecha total ${fmt(totalMm)} mm contra un límite de ${fmt(limiteTotalMm)} mm`}>
        {filas.map((f, i) => {
          const y = 16 + i * ALTO_FILA;
          const verifica = f.valorMm <= f.limiteMm;
          const anchoBarra = Math.abs(f.valorMm) * escala;
          const xBarra = f.valorMm >= 0 ? X_CERO : X_CERO - anchoBarra;
          const xLimite = X_CERO + f.limiteMm * escala;

          return (
            <g key={f.etiqueta}>
              <text x={X_ETIQUETA} y={y + 11} textAnchor="end" className="fill-foreground text-[10px]">
                {f.etiqueta}
              </text>

              {/* Carril hasta el límite. */}
              <rect x={X_CERO} y={y} width={f.limiteMm * escala} height={16}
                    className="fill-emerald-600/10" />
              <line x1={xLimite} y1={y - 3} x2={xLimite} y2={y + 19}
                    className="stroke-emerald-700/60" strokeWidth={1} strokeDasharray="3 2" />
              <text x={xLimite + 4} y={y + 11} className="fill-muted-foreground text-[9px]">
                {fmt(f.limiteMm)} · {f.referencia}
              </text>

              <rect x={xBarra} y={y + 2} width={Math.max(anchoBarra, 1)} height={12}
                    className={verifica ? "fill-primary/50 stroke-primary" : "fill-destructive/40 stroke-destructive"}
                    strokeWidth={1} />
              <text x={f.valorMm >= 0 ? xBarra + anchoBarra + 4 : xBarra - 4} y={y + 12}
                    textAnchor={f.valorMm >= 0 ? "start" : "end"}
                    className={`text-[10px] tabular-nums ${verifica ? "fill-foreground" : "fill-destructive font-medium"}`}>
                {fmt(f.valorMm)}
              </text>
            </g>
          );
        })}

        {/* Eje de flecha nula: a su izquierda la pieza queda levantada. */}
        <line x1={X_CERO} y1={8} x2={X_CERO} y2={filas.length * ALTO_FILA + 10}
              className="stroke-foreground/50" strokeWidth={1.2} />
        <text x={X_CERO - 2} y={alto - 6} textAnchor="end" className="fill-muted-foreground text-[9px]">
          ← contraflecha
        </text>
        <text x={X_CERO + 2} y={alto - 6} className="fill-muted-foreground text-[9px]">
          flecha (mm) →
        </text>
      </svg>
    </figure>
  );
}
