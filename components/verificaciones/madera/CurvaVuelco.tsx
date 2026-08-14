"use client";

import { kcrit } from "@/lib/calc/madera/flexion";
import { fmt } from "@/lib/verificaciones/formato";

/**
 * Curva kcrit(λrel,m) de la ec. (6.34), con el punto de trabajo de la viga.
 *
 * Vale la pena dibujarla porque la expresión tiene tres tramos y el proyectista
 * necesita saber en cuál cayó: en el primero el vuelco no descuenta nada y
 * engrosar la viga no sirve de nada; en el tercero kcrit va con 1/λ², así que
 * cada centímetro de anchura se paga al cuadrado. Con el número solo no se ve
 * dónde está el salto de régimen ni cuánto falta para cruzarlo.
 */

interface Props {
  lambdaRelM: number;
  kcritActual: number;
  /** true si se declaró el borde comprimido arriostrado, art. 6.3.3(5). */
  arriostrado?: boolean;
}

const ANCHO = 420;
const ALTO = 250;
const IZQ = 46;
const DER = ANCHO - 16;
// El área de dibujo arranca en 30 y no en 18 para que el rótulo del eje quede
// por encima del tick de 1,0 sin pisarlo: los dos caen en la misma altura si el
// tope del gráfico coincide con kcrit = 1.
const TOP = 30;
const BASE = ALTO - 42;

const LAMBDA_MAX = 2.5;

export function CurvaVuelco({ lambdaRelM, kcritActual, arriostrado }: Props) {
  const x = (l: number) => IZQ + (Math.min(l, LAMBDA_MAX) / LAMBDA_MAX) * (DER - IZQ);
  const y = (k: number) => BASE - k * (BASE - TOP);

  const puntos: string[] = [];
  for (let l = 0; l <= LAMBDA_MAX + 1e-9; l += LAMBDA_MAX / 200) {
    puntos.push(`${x(l).toFixed(1)},${y(kcrit(l)).toFixed(1)}`);
  }

  const fueraDeEscala = lambdaRelM > LAMBDA_MAX;
  const px = x(lambdaRelM);
  const py = y(kcritActual);

  // El rótulo se pasa a la izquierda cuando el punto se acerca al borde.
  const rotuloIzquierda = px > DER - 80;

  return (
    <figure className="space-y-1">
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="h-auto w-full" role="img"
           aria-label={`kcrit ${fmt(kcritActual, 3)} para una esbeltez relativa de ${fmt(lambdaRelM, 3)}`}>
        {/* Franjas de los tres tramos. */}
        <rect x={IZQ} y={TOP} width={x(0.75) - IZQ} height={BASE - TOP} className="fill-emerald-600/10" />
        <rect x={x(0.75)} y={TOP} width={x(1.4) - x(0.75)} height={BASE - TOP} className="fill-amber-500/10" />
        <rect x={x(1.4)} y={TOP} width={DER - x(1.4)} height={BASE - TOP} className="fill-destructive/10" />

        <text x={(IZQ + x(0.75)) / 2} y={TOP + 12} textAnchor="middle"
              className="fill-emerald-700 text-[10px]">sin reducción</text>
        <text x={(x(0.75) + x(1.4)) / 2} y={TOP + 12} textAnchor="middle"
              className="fill-amber-700 text-[10px]">tramo lineal</text>
        <text x={(x(1.4) + DER) / 2} y={TOP + 12} textAnchor="middle"
              className="fill-destructive text-[10px]">1/λ²</text>

        <polyline points={puntos.join(" ")} fill="none" className="stroke-primary" strokeWidth={1.8} />

        {/* Ejes. */}
        <line x1={IZQ} y1={TOP} x2={IZQ} y2={BASE} className="stroke-foreground/50" strokeWidth={1} />
        <line x1={IZQ} y1={BASE} x2={DER} y2={BASE} className="stroke-foreground/50" strokeWidth={1} />
        <text x={IZQ - 6} y={y(1) + 4} textAnchor="end" className="fill-muted-foreground text-[10.5px]">1,0</text>
        <text x={IZQ - 6} y={y(0.5) + 4} textAnchor="end" className="fill-muted-foreground text-[10.5px]">0,5</text>
        <text x={IZQ - 6} y={BASE + 4} textAnchor="end" className="fill-muted-foreground text-[10.5px]">0</text>
        <text x={IZQ - 40} y={TOP - 12} className="fill-muted-foreground text-[10.5px]">kcrit</text>

        {[0.75, 1.4, 2].map((l) => (
          <text key={l} x={x(l)} y={BASE + 14} textAnchor="middle"
                className="fill-muted-foreground text-[10px]">{fmt(l, 2)}</text>
        ))}
        <text x={DER} y={ALTO - 8} textAnchor="end" className="fill-muted-foreground text-[10.5px]">
          λrel,m
        </text>

        {/* Punto de trabajo. */}
        {!fueraDeEscala && (
          <>
            <line x1={px} y1={py} x2={px} y2={BASE} className="stroke-muted-foreground/60"
                  strokeWidth={1} strokeDasharray="3 2" />
            <circle cx={px} cy={py} r={5} className="fill-primary" />
            <text x={rotuloIzquierda ? px - 9 : px + 9} y={py - 8}
                  textAnchor={rotuloIzquierda ? "end" : "start"}
                  className="fill-primary text-[11px] font-medium">
              kcrit = {fmt(kcritActual, 3)}
            </text>
          </>
        )}
        {fueraDeEscala && (
          <text x={DER - 4} y={y(kcritActual) - 8} textAnchor="end"
                className="fill-destructive text-[11px] font-medium">
            λrel,m = {fmt(lambdaRelM, 2)} · fuera de escala
          </text>
        )}
      </svg>
      <figcaption className="text-xs text-muted-foreground">
        {arriostrado
          ? "Borde comprimido arriostrado en toda su longitud: el art. 6.3.3(5) permite kcrit = 1 sin entrar en la curva."
          : lambdaRelM <= 0.75
            ? "La viga cae en el tramo plano: el vuelco no descuenta resistencia y ensanchar no mejora esta comprobación."
            : lambdaRelM <= 1.4
              ? "Tramo lineal: cada punto de esbeltez que se baje se recupera casi entero en resistencia."
              : "Tramo de Euler: kcrit va con 1/λ², así que la anchura de la viga se paga al cuadrado. Suele salir más barato arriostrar el borde comprimido."}
      </figcaption>
    </figure>
  );
}
