"use client";

import type { PuntoInteraccion } from "@/lib/calc/ec2/muro";

/**
 * Diagrama de interacción N–M de la sección del muro, con el par actuante encima.
 *
 * Es la forma honesta de verificar flexión compuesta: la resistencia a momento
 * no es un número sino una curva, porque depende del axil. Hasta el punto
 * balanceado el axil ayuda —comprime la sección y retrasa la fisuración— y a
 * partir de ahí estorba. Con un solo valor de MRd esa panza no se ve, y se
 * pierde de vista que bajar la carga puede empeorar la verificación.
 */

interface Props {
  diagrama: PuntoInteraccion[];
  nEdKN: number;
  mEdKNm: number;
  mRdKNm: number;
  verifica: boolean;
}

const ANCHO = 420;
const ALTO = 300;
const IZQ = 56;
const DER = ANCHO - 20;
const TOP = 20;
const BASE = ALTO - 40;

const fmt = (n: number, d = 0) =>
  n.toLocaleString("es-AR", { minimumFractionDigits: d, maximumFractionDigits: d });

/**
 * Rótulo a la derecha del punto, o a la izquierda si contra el borde no entra.
 *
 * Hace falta porque los dos rótulos cuelgan del par actuante, que se mueve con
 * los datos: cuando el muro está al límite el punto se va al extremo derecho
 * del diagrama y el texto se saldría del viewBox, o sea que justo en el caso
 * que hay que mirar es cuando no se leería.
 */
const MARGEN_ROTULO = 90;

function rotulo(xPunto: number, sep: number) {
  return xPunto + MARGEN_ROTULO > DER
    ? { x: xPunto - sep, textAnchor: "end" as const }
    : { x: xPunto + sep, textAnchor: "start" as const };
}

export function DiagramaInteraccionMuro({ diagrama, nEdKN, mEdKNm, mRdKNm, verifica }: Props) {
  if (diagrama.length === 0) return null;

  const nMax = Math.max(...diagrama.map((p) => p.nRdKN), nEdKN) * 1.08;
  const mMax = Math.max(...diagrama.map((p) => p.mRdKNm), mEdKNm) * 1.15;

  const x = (m: number) => IZQ + (m / mMax) * (DER - IZQ);
  const y = (n: number) => BASE - (n / nMax) * (BASE - TOP);

  const curva = diagrama.map((p) => `${x(p.mRdKNm).toFixed(1)},${y(p.nRdKN).toFixed(1)}`).join(" ");
  // La zona segura es la que queda entre el eje y la curva.
  const relleno = `${x(0)},${y(0)} ${curva} ${x(0)},${y(nMax / 1.08)}`;

  return (
    <figure className="space-y-1">
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="h-auto w-full" role="img"
           aria-label={`Interacción: NEd ${fmt(nEdKN)} kN, MEd ${fmt(mEdKNm, 1)} kN·m contra MRd ${fmt(mRdKNm, 1)}`}>
        <polygon points={relleno} className="fill-emerald-600/10" />
        <polyline points={curva} fill="none" className="stroke-primary" strokeWidth={1.8} />

        {/* Ejes. */}
        <line x1={IZQ} y1={TOP - 6} x2={IZQ} y2={BASE} className="stroke-foreground/50" strokeWidth={1} />
        <line x1={IZQ} y1={BASE} x2={DER} y2={BASE} className="stroke-foreground/50" strokeWidth={1} />
        <text x={IZQ - 6} y={BASE + 4} textAnchor="end" className="fill-muted-foreground text-[10.5px]">0</text>
        <text x={IZQ - 48} y={(TOP + BASE) / 2} className="fill-muted-foreground text-[10.5px]">
          N (kN/m)
        </text>
        <text x={DER} y={ALTO - 8} textAnchor="end" className="fill-muted-foreground text-[10.5px]">
          M (kN·m/m)
        </text>

        {/* Par actuante y su margen hasta la curva. */}
        <line x1={x(mEdKNm)} y1={y(nEdKN)} x2={x(mRdKNm)} y2={y(nEdKN)}
              className="stroke-muted-foreground/60" strokeWidth={1} strokeDasharray="3 2" />
        <circle cx={x(mRdKNm)} cy={y(nEdKN)} r={3} className="fill-primary" />
        <text {...rotulo(x(mRdKNm), 5)} y={y(nEdKN) - 6} className="fill-primary text-[10.5px]">
          MRd {fmt(mRdKNm, 1)}
        </text>

        <circle cx={x(mEdKNm)} cy={y(nEdKN)} r={5}
                className={verifica ? "fill-emerald-600" : "fill-destructive"} />
        <text {...rotulo(x(mEdKNm), 8)} y={y(nEdKN) + 14}
              className={`text-[10.5px] ${verifica ? "fill-emerald-700" : "fill-destructive font-medium"}`}>
          ({fmt(mEdKNm, 1)} · {fmt(nEdKN)})
        </text>
      </svg>
      <figcaption className="text-xs text-muted-foreground">
        El punto tiene que caer dentro de la curva. La panza del diagrama es el punto balanceado:
        por debajo, más axil ayuda; por encima, resta.
      </figcaption>
    </figure>
  );
}
