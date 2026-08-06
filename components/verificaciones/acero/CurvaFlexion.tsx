"use client";

import { calcularFlexionSegunSeccion } from "@/lib/calc/aisc/seleccion-articulo";
import type { Familia, ParametrosPerfil } from "@/lib/calc/aisc/perfiles";

/**
 * Curva Mn contra la longitud sin arriostrar, con las tres zonas del capítulo F
 * y el punto de trabajo encima.
 *
 * Responde de un vistazo la pregunta que el número solo no contesta: cuánto se
 * gana arriostrando un poco más, o cuánto margen hay antes de caer en la zona
 * elástica. La curva se traza llamando al mismo cálculo que da el resultado, con
 * Lb variable, así que las dos cosas no pueden discrepar.
 */

interface Props {
  familia: Familia;
  params: ParametrosPerfil;
  cb: number;
  fyPa: number;
  ePa: number;
  lbM: number;
  lpM: number;
  lrM: number;
  mpKNm: number;
  mnKNm: number;
}

const ANCHO = 420;
const ALTO = 210;
const IZQ = 52;
const DER = ANCHO - 14;
const TOP = 18;
const BASE = ALTO - 34;

const fmt = (n: number, d = 1) =>
  n.toLocaleString("es-AR", { minimumFractionDigits: d, maximumFractionDigits: d });

export function CurvaFlexion({
  familia, params, cb, fyPa, ePa, lbM, lpM, lrM, mpKNm, mnKNm,
}: Props) {
  // Se llega hasta pasada Lr para que se vea entrar la rama elástica.
  const lbMax = Math.max(lrM * 1.35, lbM * 1.15, lpM * 3);
  const x = (lb: number) => IZQ + (lb / lbMax) * (DER - IZQ);
  const y = (m: number) => BASE - (m / mpKNm) * (BASE - TOP);

  const puntos: string[] = [];
  const pasos = 80;
  for (let i = 0; i <= pasos; i++) {
    const lb = Math.max((lbMax * i) / pasos, 0.01);
    try {
      const r = calcularFlexionSegunSeccion({ familia, params, lbM: lb, cb, fyPa, ePa });
      puntos.push(`${x(lb).toFixed(1)},${y(r.mnKNm).toFixed(1)}`);
    } catch {
      // Fuera del alcance del artículo: se corta la curva en lugar de inventarla.
      break;
    }
  }

  const zona = (desde: number, hasta: number, clase: string) => (
    <rect x={x(desde)} y={TOP - 6} width={Math.max(x(hasta) - x(desde), 0)}
          height={BASE - TOP + 6} className={clase} />
  );

  return (
    <figure className="space-y-1">
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="h-auto w-full" role="img"
           aria-label={`Momento resistente contra longitud sin arriostrar; Lb = ${fmt(lbM, 2)} m`}>
        {/* Las tres zonas del artículo, de fondo. */}
        {zona(0, Math.min(lpM, lbMax), "fill-emerald-600/10")}
        {zona(Math.min(lpM, lbMax), Math.min(lrM, lbMax), "fill-amber-500/10")}
        {zona(Math.min(lrM, lbMax), lbMax, "fill-destructive/10")}

        <line x1={IZQ} y1={TOP - 6} x2={IZQ} y2={BASE} className="stroke-foreground/50" strokeWidth={1} />
        <line x1={IZQ} y1={BASE} x2={DER} y2={BASE} className="stroke-foreground/50" strokeWidth={1} />

        {/* Mp como techo. */}
        <line x1={IZQ} y1={y(mpKNm)} x2={DER} y2={y(mpKNm)}
              className="stroke-muted-foreground/60" strokeWidth={1} strokeDasharray="4 3" />
        <text x={IZQ - 6} y={y(mpKNm) + 3} textAnchor="end" className="fill-muted-foreground text-[10.5px]">
          Mp
        </text>
        <text x={IZQ - 6} y={BASE + 3} textAnchor="end" className="fill-muted-foreground text-[10.5px]">0</text>
        <text x={IZQ - 46} y={(TOP + BASE) / 2} className="fill-muted-foreground text-[10.5px]">
          Mn (kN·m)
        </text>
        <text x={DER} y={ALTO - 6} textAnchor="end" className="fill-muted-foreground text-[10.5px]">
          Lb sin arriostrar (m)
        </text>

        {/* Lp y Lr. */}
        {[{ v: lpM, t: "Lp" }, { v: lrM, t: "Lr" }].filter((c) => c.v <= lbMax).map((c) => (
          <g key={c.t}>
            <line x1={x(c.v)} y1={TOP - 6} x2={x(c.v)} y2={BASE + 5}
                  className="stroke-foreground/40" strokeWidth={1} strokeDasharray="3 2" />
            <text x={x(c.v)} y={BASE + 14} textAnchor="middle" className="fill-muted-foreground text-[10.5px]">
              {c.t} {fmt(c.v, 1)}
            </text>
          </g>
        ))}

        <polyline points={puntos.join(" ")} fill="none" className="stroke-primary" strokeWidth={1.8} />

        {/* Punto de trabajo. */}
        {lbM <= lbMax && (
          <>
            <line x1={x(lbM)} y1={y(mnKNm)} x2={x(lbM)} y2={BASE}
                  className="stroke-destructive" strokeWidth={1} strokeDasharray="3 2" />
            <circle cx={x(lbM)} cy={y(mnKNm)} r={4} className="fill-destructive" />
            <text x={x(lbM)} y={y(mnKNm) - 8} textAnchor="middle"
                  className="fill-destructive text-[10.5px] font-medium">
              {fmt(mnKNm, 0)} kN·m
            </text>
          </>
        )}
      </svg>
    </figure>
  );
}
