"use client";

import type { LadoEntalladura } from "@/lib/calc/madera/cortante";
import { fmt } from "@/lib/verificaciones/formato";

/**
 * Extremo de viga entallado sobre el apoyo, figura 6.11.
 *
 * El dibujo hace falta porque la ec. (6.62) usa cuatro cotas —h, hef, x y la
 * inclinación i— que se confunden con facilidad, sobre todo x, que se mide
 * desde el **eje de la reacción** hasta el arranque de la entalladura y no
 * desde el borde de la viga. Y porque el lado en que se entalla cambia el
 * resultado por completo: del lado opuesto al apoyo kv = 1 y no hay penalización
 * ninguna.
 */

interface Props {
  cantoM: number;
  cantoEficazM: number;
  proyeccionM: number;
  distanciaApoyoM: number;
  lado: LadoEntalladura;
}

const ANCHO = 420;
const ALTO = 250;

export function CroquisEntalladura({
  cantoM: h, cantoEficazM: hef, proyeccionM, distanciaApoyoM: x, lado,
}: Props) {
  if (!(h > 0) || !(hef > 0) || hef > h) return null;

  const largoDibujoM = Math.max(x + proyeccionM + 0.6 * h, 1.6 * h);
  const escala = Math.min(132 / h, 300 / largoDibujoM);

  const hPx = h * escala;
  const hefPx = hef * escala;
  const xPx = x * escala;
  const proyPx = proyeccionM * escala;

  // Margen izquierdo suficiente para la cota del canto, que cuelga por fuera de
  // la viga y con tres decimales ocupa unos 50 px.
  const izq = 88;
  // Deja sitio arriba para la cota de la proyección y abajo para el apoyo más
  // la cota de x, que es la que más baja.
  const arriba = 36;
  const abajo = arriba + hPx;
  const der = izq + largoDibujoM * escala;

  // El apoyo va en `izq + xPx`: x se mide desde el eje de la reacción.
  const ejeApoyo = izq + xPx;
  const arranque = ejeApoyo;
  const finRampa = arranque + proyPx;

  /*
   * Entalladura abajo (mismo lado que el apoyo) o arriba (lado opuesto). El
   * contorno se recorre entero en los dos casos para que la pieza se lea como
   * un sólido y no como dos rectángulos superpuestos.
   */
  const contorno =
    lado === "mismo-lado"
      ? `M ${izq} ${abajo - hefPx} L ${izq} ${arriba} L ${der} ${arriba} L ${der} ${abajo} L ${finRampa} ${abajo} L ${arranque} ${abajo - hefPx} Z`
      : `M ${izq} ${arriba + (hPx - hefPx)} L ${izq} ${abajo} L ${der} ${abajo} L ${der} ${arriba} L ${finRampa} ${arriba} L ${arranque} ${arriba + (hPx - hefPx)} Z`;

  const yEficazSup = lado === "mismo-lado" ? arriba : arriba + (hPx - hefPx);
  const yEficazInf = yEficazSup + hefPx;

  return (
    <figure className="space-y-1">
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="h-auto w-full" role="img"
           aria-label={`Entalladura de canto eficaz ${fmt(hef, 3)} sobre canto ${fmt(h, 3)} metros`}>
        {/* Silueta de la viga sin entallar, para ver qué se quitó. */}
        <rect x={izq} y={arriba} width={der - izq} height={hPx}
              className="fill-none stroke-muted-foreground/40" strokeWidth={0.8}
              strokeDasharray="4 3" />

        <path d={contorno} className="fill-amber-600/20 stroke-amber-800" strokeWidth={1.6} />

        {/* Apoyo, dibujado como triángulo bajo el eje de la reacción. */}
        <polygon
          points={`${ejeApoyo},${lado === "mismo-lado" ? abajo : abajo} ${ejeApoyo - 11},${abajo + 16} ${ejeApoyo + 11},${abajo + 16}`}
          className="fill-muted-foreground/70"
        />
        <line x1={ejeApoyo - 18} y1={abajo + 16} x2={ejeApoyo + 18} y2={abajo + 16}
              className="stroke-muted-foreground" strokeWidth={1.4} />

        {/* Canto total, a la izquierda. */}
        <line x1={izq - 26} y1={arriba} x2={izq - 26} y2={abajo}
              className="stroke-muted-foreground" strokeWidth={0.9} />
        <line x1={izq - 29} y1={arriba} x2={izq - 23} y2={arriba} className="stroke-muted-foreground" strokeWidth={0.9} />
        <line x1={izq - 29} y1={abajo} x2={izq - 23} y2={abajo} className="stroke-muted-foreground" strokeWidth={0.9} />
        <text x={izq - 32} y={(arriba + abajo) / 2 + 4} textAnchor="end"
              className="fill-foreground text-[11.5px]">h = {fmt(h, 3)}</text>

        {/* Canto eficaz, sobre el propio arranque de la entalladura. */}
        <line x1={izq - 10} y1={yEficazSup} x2={izq - 10} y2={yEficazInf}
              className="stroke-primary" strokeWidth={1.2} />
        <line x1={izq - 13} y1={yEficazSup} x2={izq - 7} y2={yEficazSup} className="stroke-primary" strokeWidth={1.2} />
        <line x1={izq - 13} y1={yEficazInf} x2={izq - 7} y2={yEficazInf} className="stroke-primary" strokeWidth={1.2} />
        <text x={izq + 6} y={(yEficazSup + yEficazInf) / 2 + 4}
              className="fill-primary text-[11.5px] font-medium">hef = {fmt(hef, 3)}</text>

        {/* Cota x: del eje del apoyo al arranque, medida abajo del todo. */}
        <line x1={izq} y1={abajo + 40} x2={ejeApoyo} y2={abajo + 40}
              className="stroke-muted-foreground" strokeWidth={0.9} />
        <line x1={izq} y1={abajo + 37} x2={izq} y2={abajo + 43} className="stroke-muted-foreground" strokeWidth={0.9} />
        <line x1={ejeApoyo} y1={abajo + 37} x2={ejeApoyo} y2={abajo + 43} className="stroke-muted-foreground" strokeWidth={0.9} />
        <text x={(izq + ejeApoyo) / 2} y={abajo + 54} textAnchor="middle"
              className="fill-muted-foreground text-[11px]">x = {fmt(x, 3)}</text>

        {/* Proyección horizontal de la rampa, arriba. */}
        {proyPx > 2 && (
          <>
            <line x1={arranque} y1={arriba - 14} x2={finRampa} y2={arriba - 14}
                  className="stroke-muted-foreground" strokeWidth={0.9} />
            <line x1={arranque} y1={arriba - 17} x2={arranque} y2={arriba - 11} className="stroke-muted-foreground" strokeWidth={0.9} />
            <line x1={finRampa} y1={arriba - 17} x2={finRampa} y2={arriba - 11} className="stroke-muted-foreground" strokeWidth={0.9} />
            <text x={(arranque + finRampa) / 2} y={arriba - 19} textAnchor="middle"
                  className="fill-muted-foreground text-[11px]">
              proyección {fmt(proyeccionM, 3)}
            </text>
          </>
        )}
      </svg>
      <figcaption className="text-xs text-muted-foreground">
        {lado === "mismo-lado"
          ? "Entalladura del mismo lado que el apoyo: la fibra traccionada se corta y aparece la concentración de la ec. (6.62)."
          : "Entalladura del lado opuesto al apoyo: kv = 1 por la ec. (6.61), no hay concentración que descontar."}{" "}
        La cota x se mide desde el <strong className="text-foreground">eje de la reacción</strong>,
        no desde el borde de la viga.
      </figcaption>
    </figure>
  );
}
