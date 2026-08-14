"use client";

import { pandeoEje } from "@/lib/calc/madera/axil";
import type { TipoMadera } from "@/lib/calc/madera/materiales";
import { fmt } from "@/lib/verificaciones/formato";

/**
 * Curva kc(λrel) de las ecs. (6.25) a (6.29), con los dos ejes de la pieza
 * marcados encima.
 *
 * Se dibujan las dos curvas —maciza y encolada— porque βc las separa: 0,2
 * contra 0,1. Es la única diferencia entre ellas y se ve mejor superpuestas que
 * explicada, sobre todo en la zona de λrel entre 0,7 y 1,5, que es donde caen
 * casi todos los pilares reales y donde la brecha es mayor.
 *
 * El escalón de λrel = 0,3 también se marca: por debajo la norma no reduce nada
 * y manda verificar por el art. 6.2.4, que es otra expresión.
 */

interface Props {
  tipo: TipoMadera;
  fc0kMPa: number;
  e005GPa: number;
  lambdaRelY: number;
  lambdaRelZ: number;
  kcY: number;
  kcZ: number;
}

const ANCHO = 420;
const ALTO = 250;
const IZQ = 46;
const DER = ANCHO - 16;
const TOP = 30;
const BASE = ALTO - 42;
const LAMBDA_MAX = 2.5;

export function CurvaPandeoMadera({
  tipo, fc0kMPa, e005GPa, lambdaRelY, lambdaRelZ, kcY, kcZ,
}: Props) {
  const x = (l: number) => IZQ + (Math.min(l, LAMBDA_MAX) / LAMBDA_MAX) * (DER - IZQ);
  const y = (k: number) => BASE - k * (BASE - TOP);

  /*
   * pandeoEje toma la esbeltez mecánica, no la relativa, así que se recorre λ y
   * se lee el par (λrel, kc) que devuelve. Evita duplicar acá la conversión de
   * la ec. (6.21) y que las dos versiones se separen.
   */
  const curva = (t: TipoMadera) => {
    const puntos: string[] = [];
    for (let lambda = 0; lambda <= 400; lambda += 2) {
      const p = pandeoEje(lambda, fc0kMPa, e005GPa, t);
      if (p.lambdaRel > LAMBDA_MAX) break;
      puntos.push(`${x(p.lambdaRel).toFixed(1)},${y(p.kc).toFixed(1)}`);
    }
    return puntos.join(" ");
  };

  const esMaciza = tipo === "maciza";
  const puntoCritico = kcY <= kcZ ? { l: lambdaRelY, k: kcY, eje: "y" } : { l: lambdaRelZ, k: kcZ, eje: "z" };
  const puntoOtro = kcY <= kcZ ? { l: lambdaRelZ, k: kcZ, eje: "z" } : { l: lambdaRelY, k: kcY, eje: "y" };

  const rotulo = (px: number) => (px > DER - 90 ? { dx: -9, anchor: "end" as const } : { dx: 9, anchor: "start" as const });

  return (
    <figure className="space-y-1">
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="h-auto w-full" role="img"
           aria-label={`Curva de pandeo: kc ${fmt(puntoCritico.k, 3)} en el eje ${puntoCritico.eje}`}>
        {/* Zona sin reducción, art. 6.3.2(2). */}
        <rect x={IZQ} y={TOP} width={x(0.3) - IZQ} height={BASE - TOP} className="fill-emerald-600/10" />
        <text x={x(0.3) + 4} y={TOP + 11} className="fill-emerald-700 text-[10px]">
          λrel ≤ 0,3 · sin reducción (art. 6.2.4)
        </text>

        {/* La curva del material que no es el elegido, de referencia. */}
        <polyline points={curva(esMaciza ? "MLE" : "maciza")} fill="none"
                  className="stroke-muted-foreground/45" strokeWidth={1.2} strokeDasharray="4 3" />
        <polyline points={curva(tipo)} fill="none" className="stroke-primary" strokeWidth={1.8} />

        {/* Ejes. */}
        <line x1={IZQ} y1={TOP} x2={IZQ} y2={BASE} className="stroke-foreground/50" strokeWidth={1} />
        <line x1={IZQ} y1={BASE} x2={DER} y2={BASE} className="stroke-foreground/50" strokeWidth={1} />
        <text x={IZQ - 6} y={y(1) + 4} textAnchor="end" className="fill-muted-foreground text-[10.5px]">1,0</text>
        <text x={IZQ - 6} y={y(0.5) + 4} textAnchor="end" className="fill-muted-foreground text-[10.5px]">0,5</text>
        <text x={IZQ - 6} y={BASE + 4} textAnchor="end" className="fill-muted-foreground text-[10.5px]">0</text>
        <text x={IZQ - 40} y={TOP - 12} className="fill-muted-foreground text-[10.5px]">kc</text>
        {[0.5, 1, 1.5, 2].map((l) => (
          <text key={l} x={x(l)} y={BASE + 14} textAnchor="middle"
                className="fill-muted-foreground text-[10px]">{fmt(l, 1)}</text>
        ))}
        <text x={DER} y={ALTO - 8} textAnchor="end" className="fill-muted-foreground text-[10.5px]">λrel</text>

        {/* Eje que no manda, en segundo plano. */}
        {puntoOtro.l <= LAMBDA_MAX && (
          <>
            <circle cx={x(puntoOtro.l)} cy={y(puntoOtro.k)} r={3.5}
                    className="fill-muted-foreground/70" />
            <text {...(({ dx, anchor }) => ({ x: x(puntoOtro.l) + dx, textAnchor: anchor }))(rotulo(x(puntoOtro.l)))}
                  y={y(puntoOtro.k) + 15} className="fill-muted-foreground text-[10.5px]">
              eje {puntoOtro.eje}
            </text>
          </>
        )}

        {/* Eje que gobierna. */}
        {puntoCritico.l <= LAMBDA_MAX ? (
          <>
            <line x1={x(puntoCritico.l)} y1={y(puntoCritico.k)} x2={x(puntoCritico.l)} y2={BASE}
                  className="stroke-primary/50" strokeWidth={1} strokeDasharray="3 2" />
            <circle cx={x(puntoCritico.l)} cy={y(puntoCritico.k)} r={5} className="fill-primary" />
            <text {...(({ dx, anchor }) => ({ x: x(puntoCritico.l) + dx, textAnchor: anchor }))(rotulo(x(puntoCritico.l)))}
                  y={y(puntoCritico.k) - 8} className="fill-primary text-[11px] font-medium">
              eje {puntoCritico.eje} · kc = {fmt(puntoCritico.k, 3)}
            </text>
          </>
        ) : (
          <text x={DER - 4} y={TOP + 26} textAnchor="end" className="fill-destructive text-[11px] font-medium">
            λrel = {fmt(puntoCritico.l, 2)} · fuera de escala
          </text>
        )}
      </svg>
      <figcaption className="text-xs text-muted-foreground">
        Trazo lleno: {esMaciza ? "madera maciza (βc = 0,2)" : "encolada o microlaminada (βc = 0,1)"}.
        De puntos, el otro material, para ver cuánto separa βc a los dos. Manda siempre el eje de
        menor kc, que no es necesariamente el de mayor longitud de pandeo: depende del radio de
        giro.
      </figcaption>
    </figure>
  );
}
