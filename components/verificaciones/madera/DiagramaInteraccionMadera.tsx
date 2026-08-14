"use client";

import type { ModoFlexionCompuesta } from "@/lib/calc/madera/flexion-compuesta";
import { fmt } from "@/lib/verificaciones/formato";

/**
 * Curva de interacción axil-flexión, con el punto de trabajo.
 *
 * Dibuja las dos formas que toma la interacción y por qué importan: la
 * **parábola** de las ecs. (6.19) y (6.20), que corresponde a la pieza corta, y
 * la **recta** de las (6.23) y (6.24), que corresponde a la esbelta. La
 * diferencia entre las dos es toda la seguridad de la comprobación: con axil
 * moderado la parábola perdona mucho más, y aplicarla a una pieza esbelta —o
 * aplicar la recta a una corta, que es lo caro— cambia el resultado sin que
 * ningún número intermedio delate el problema.
 *
 * En flexotracción la interacción también es recta, ecs. (6.17) y (6.18).
 */

interface Props {
  modo: ModoFlexionCompuesta;
  /** Término de axil normalizado: σ/f, sin elevar al cuadrado ni dividir por kc. */
  ratioAxil: number;
  /** Término de flexión normalizado: σm,y/fm,y. */
  ratioFlexion: number;
  aprovechamiento: number;
  verifica: boolean;
}

const ANCHO = 400;
const ALTO = 280;
const IZQ = 52;
const DER = ANCHO - 22;
const TOP = 22;
const BASE = ALTO - 44;
const MAX = 1.35;

export function DiagramaInteraccionMadera({
  modo, ratioAxil, ratioFlexion, aprovechamiento, verifica,
}: Props) {
  const x = (v: number) => IZQ + (Math.min(v, MAX) / MAX) * (DER - IZQ);
  const y = (v: number) => BASE - (Math.min(v, MAX) / MAX) * (BASE - TOP);

  const esParabola = modo === "flexocompresion-corta";

  // Frontera de agotamiento: término de axil + término de flexión = 1.
  const frontera = (cuadratico: boolean) => {
    const puntos: string[] = [];
    for (let i = 0; i <= 60; i++) {
      const a = (i / 60) * 1;
      const flexion = cuadratico ? 1 - a ** 2 : 1 - a;
      if (flexion < 0) break;
      puntos.push(`${x(a).toFixed(1)},${y(flexion).toFixed(1)}`);
    }
    return puntos.join(" ");
  };

  const rotuloDerecha = x(ratioAxil) < DER - 90;

  return (
    <figure className="space-y-1">
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="h-auto w-full" role="img"
           aria-label={`Interacción axil-flexión, aprovechamiento ${fmt(aprovechamiento, 3)}`}>
        {/* Zona segura bajo la frontera que corresponde al modo. */}
        <polygon points={`${x(0)},${y(0)} ${frontera(esParabola)} ${x(0)},${y(0)}`}
                 className="fill-emerald-600/10" />

        {/* La frontera que NO se aplica, de referencia. */}
        <polyline points={frontera(!esParabola)} fill="none"
                  className="stroke-muted-foreground/45" strokeWidth={1.2} strokeDasharray="4 3" />
        <polyline points={frontera(esParabola)} fill="none"
                  className="stroke-primary" strokeWidth={1.8} />

        {/* Ejes. */}
        <line x1={IZQ} y1={TOP} x2={IZQ} y2={BASE} className="stroke-foreground/50" strokeWidth={1} />
        <line x1={IZQ} y1={BASE} x2={DER} y2={BASE} className="stroke-foreground/50" strokeWidth={1} />
        <text x={IZQ - 6} y={y(1) + 4} textAnchor="end" className="fill-muted-foreground text-[10.5px]">1,0</text>
        <text x={IZQ - 6} y={BASE + 4} textAnchor="end" className="fill-muted-foreground text-[10.5px]">0</text>
        <text x={x(1)} y={BASE + 14} textAnchor="middle" className="fill-muted-foreground text-[10px]">1,0</text>
        <text x={IZQ - 46} y={TOP - 6} className="fill-muted-foreground text-[10.5px]">σm/fm</text>
        <text x={DER} y={ALTO - 10} textAnchor="end" className="fill-muted-foreground text-[10.5px]">
          {modo === "flexotraccion" ? "σt,0/ft,0" : "σc,0/fc,0"}
        </text>

        {/* Punto de trabajo. */}
        <line x1={x(ratioAxil)} y1={y(ratioFlexion)} x2={x(ratioAxil)} y2={BASE}
              className="stroke-muted-foreground/50" strokeWidth={1} strokeDasharray="3 2" />
        <line x1={x(ratioAxil)} y1={y(ratioFlexion)} x2={IZQ} y2={y(ratioFlexion)}
              className="stroke-muted-foreground/50" strokeWidth={1} strokeDasharray="3 2" />
        <circle cx={x(ratioAxil)} cy={y(ratioFlexion)} r={5.5}
                className={verifica ? "fill-emerald-600" : "fill-destructive"} />
        <text x={rotuloDerecha ? x(ratioAxil) + 9 : x(ratioAxil) - 9}
              y={y(ratioFlexion) - 9}
              textAnchor={rotuloDerecha ? "start" : "end"}
              className={`text-[11px] font-medium ${verifica ? "fill-emerald-700" : "fill-destructive"}`}>
          {fmt(aprovechamiento, 3)}
        </text>
      </svg>
      <figcaption className="text-xs text-muted-foreground">
        Trazo lleno: la frontera que manda acá,{" "}
        {esParabola
          ? "la parábola de las ecs. (6.19) y (6.20), porque la pieza es corta."
          : modo === "flexotraccion"
            ? "la recta de las ecs. (6.17) y (6.18)."
            : "la recta de las ecs. (6.23) y (6.24), porque la pieza es esbelta."}{" "}
        De puntos, la otra. El punto tiene que caer dentro de la zona sombreada.
      </figcaption>
    </figure>
  );
}
