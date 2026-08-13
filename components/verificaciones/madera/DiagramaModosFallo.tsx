"use client";

import type { ResultadoUnion } from "@/lib/calc/ec5/uniones";
import { fmt } from "@/lib/verificaciones/formato";

/**
 * Los modos de fallo de Johansen, uno al lado del otro.
 *
 * El método consiste en escribir todos los modos posibles y quedarse con el
 * menor, así que lo que hay que ver no es el número final sino **cuál gobierna
 * y por cuánto**. Dos cosas se leen de acá y de ningún otro lado:
 *
 * - Si el que gobierna es (f) o (k) —doble rótula plástica—, la unión es dúctil
 *   y engrosar la madera ya no la mejora: hay que ir a un perno mayor. Si
 *   gobierna un modo de aplastamiento, al revés.
 * - Si dos modos quedan casi empatados, un cambio chico de espesor puede
 *   cambiar cuál manda, y conviene saberlo antes de ajustar la unión al límite.
 */

interface Props {
  resultado: ResultadoUnion;
}

const ANCHO = 440;
const IZQ = 34;
/*
 * Tres columnas fijas y sin solaparse: la barra llega como mucho a DER, el
 * valor va justo después con su ancho máximo reservado, y la descripción
 * arranca siempre en X_DESCRIPCION. Dejar que la descripción cuelgue del final
 * de la barra —que es lo natural— hace que se pise con el valor en las barras
 * largas y se salga del viewBox en las descripciones largas.
 */
const DER = IZQ + 120;
const X_DESCRIPCION = 200;
const MAX_CARACTERES = 48;
const ALTO_FILA = 30;
const TOP = 26;

export function DiagramaModosFallo({ resultado }: Props) {
  const { modos, gobierna } = resultado;
  const max = Math.max(...modos.map((m) => m.valorKN), 1e-9);
  const alto = TOP + modos.length * ALTO_FILA + 30;

  return (
    <figure className="space-y-1">
      <svg viewBox={`0 0 ${ANCHO} ${alto}`} className="h-auto w-full" role="img"
           aria-label={`Modo ${gobierna.letra} gobierna con ${fmt(gobierna.valorKN, 2)} kN`}>
        <text x={IZQ} y={14} className="fill-muted-foreground text-[10.5px]">
          Capacidad de cada modo, kN por plano y por medio de fijación
        </text>

        {modos.map((m, i) => {
          const y = TOP + i * ALTO_FILA;
          const ancho = (m.valorKN / max) * (DER - IZQ);
          const manda = m.letra === gobierna.letra;
          return (
            <g key={m.letra}>
              <text x={IZQ - 8} y={y + 13} textAnchor="end"
                    className={`text-[11px] ${manda ? "fill-primary font-medium" : "fill-muted-foreground"}`}>
                ({m.letra})
              </text>
              <rect x={IZQ} y={y + 3} width={Math.max(ancho, 1)} height={14} rx={2}
                    className={manda ? "fill-primary" : "fill-muted-foreground/30"} />
              <text x={IZQ + Math.max(ancho, 1) + 6} y={y + 14}
                    className={`text-[10.5px] ${manda ? "fill-primary font-medium" : "fill-muted-foreground"}`}>
                {fmt(m.valorKN, 2)}
              </text>
              <text x={X_DESCRIPCION} y={y + 14} className="fill-muted-foreground text-[9.5px]">
                {m.descripcion.length > MAX_CARACTERES
                  ? `${m.descripcion.slice(0, MAX_CARACTERES - 1)}…`
                  : m.descripcion}
              </text>
            </g>
          );
        })}

        {/* Línea del valor que gobierna, para ver el margen contra el segundo. */}
        <line x1={IZQ + (gobierna.valorKN / max) * (DER - IZQ)} y1={TOP}
              x2={IZQ + (gobierna.valorKN / max) * (DER - IZQ)} y2={TOP + modos.length * ALTO_FILA}
              className="stroke-primary/60" strokeWidth={1} strokeDasharray="3 2" />

        <text x={IZQ} y={alto - 12} className="fill-foreground text-[10.5px]">
          Johansen {fmt(resultado.johansenKN, 2)} kN
          {resultado.efectoSogaKN > 0
            ? ` + efecto soga ${fmt(resultado.efectoSogaKN, 2)} = Fv,Rk ${fmt(resultado.fvRkKN, 2)} kN`
            : ` = Fv,Rk ${fmt(resultado.fvRkKN, 2)} kN, sin efecto soga`}
        </text>
      </svg>
      <figcaption className="text-xs text-muted-foreground">
        Gobierna el modo <strong className="text-foreground">({gobierna.letra})</strong>:{" "}
        {gobierna.descripcion.toLowerCase()}.{" "}
        {gobierna.ductil
          ? "Como la clavija plastifica, engrosar la madera ya no mejora la unión: hay que ir a un medio de fijación mayor o poner más."
          : "Como manda el aplastamiento de la madera, engrosar la pieza o subir su densidad sí mejora la unión."}
      </figcaption>
    </figure>
  );
}
