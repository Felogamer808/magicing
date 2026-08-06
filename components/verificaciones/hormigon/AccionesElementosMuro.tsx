"use client";

/**
 * Las tres piezas del muro y la acción que arma cada una.
 *
 * Un muro en ménsula no se arma de una sola manera: son tres voladizos
 * independientes, con cargas de sentidos distintos, y por eso la armadura
 * principal cambia de cara en cada uno.
 *
 *   hastial   lo empuja el terreno por detrás → tracción en la cara interior
 *   talón     lo baja el peso de tierra que gravita encima → tracción arriba
 *   puntera   la levanta la reacción del terreno → tracción abajo
 *
 * Esa alternancia es la que más se equivoca al armar, y es lo que el dibujo
 * busca dejar fijado.
 */

interface Props {
  alturaMuroM: number;
  espesorMuroM: number;
  anchoZapataM: number;
  cantoZapataM: number;
  punteraM: number;
}

const ANCHO_PANEL = 150;
const ALTO = 200;
const Y_BASE = ALTO - 42;

const fmt = (n: number, d = 2) =>
  n.toLocaleString("es-AR", { minimumFractionDigits: d, maximumFractionDigits: d });

export function AccionesElementosMuro({
  alturaMuroM, espesorMuroM, anchoZapataM, cantoZapataM, punteraM,
}: Props) {
  const alturaTotalM = alturaMuroM + cantoZapataM;
  const escala = Math.min(120 / alturaTotalM, 96 / anchoZapataM);
  const px = (m: number) => m * escala;

  const talonM = Math.max(anchoZapataM - punteraM - espesorMuroM, 0);

  /** Dibuja el muro completo dentro de un panel, con su origen desplazado. */
  const muro = (ox: number) => {
    const xZapata = ox + (ANCHO_PANEL - px(anchoZapataM)) / 2;
    const yTopZapata = Y_BASE - px(cantoZapataM);
    const yCoronacion = Y_BASE - px(alturaTotalM);
    const xHastial = xZapata + px(punteraM);
    return { xZapata, yTopZapata, yCoronacion, xHastial };
  };

  const paneles = [0, ANCHO_PANEL, 2 * ANCHO_PANEL];

  return (
    <figure className="space-y-1">
      <svg viewBox={`0 0 ${3 * ANCHO_PANEL} ${ALTO}`} className="h-auto w-full" role="img"
           aria-label="Acciones sobre hastial, talón y puntera">
        {paneles.map((ox, i) => {
          const { xZapata, yTopZapata, yCoronacion, xHastial } = muro(ox);
          const destacado = ["hastial", "talón", "puntera"][i];

          return (
            <g key={ox}>
              {/* Terreno retenido, de referencia. */}
              <line x1={xHastial + px(espesorMuroM)} y1={yCoronacion}
                    x2={ox + ANCHO_PANEL - 6} y2={yCoronacion}
                    className="stroke-foreground/25" strokeWidth={1} />

              {/* Zapata y hastial, con la pieza en juego resaltada. */}
              <rect x={xZapata} y={yTopZapata} width={px(anchoZapataM)} height={px(cantoZapataM)}
                    className="fill-transparent stroke-foreground/50" strokeWidth={1.1} />
              <rect x={xHastial} y={yCoronacion} width={px(espesorMuroM)} height={px(alturaMuroM)}
                    className={destacado === "hastial" ? "fill-primary/30 stroke-primary" : "fill-transparent stroke-foreground/50"}
                    strokeWidth={1.2} />
              {destacado === "puntera" && (
                <rect x={xZapata} y={yTopZapata} width={px(punteraM)} height={px(cantoZapataM)}
                      className="fill-primary/30 stroke-primary" strokeWidth={1.2} />
              )}
              {destacado === "talón" && (
                <rect x={xHastial + px(espesorMuroM)} y={yTopZapata}
                      width={px(talonM)} height={px(cantoZapataM)}
                      className="fill-primary/30 stroke-primary" strokeWidth={1.2} />
              )}

              {/* --- Hastial: empuje triangular y momento en el arranque --- */}
              {destacado === "hastial" && (
                <>
                  <polygon
                    points={`${xHastial + px(espesorMuroM)},${yCoronacion} ${xHastial + px(espesorMuroM) + 30},${yTopZapata} ${xHastial + px(espesorMuroM)},${yTopZapata}`}
                    className="fill-destructive/25 stroke-destructive" strokeWidth={1} />
                  <text x={xHastial + px(espesorMuroM) + 33} y={(yCoronacion + yTopZapata) / 2}
                        className="fill-destructive text-[9px]">Ea</text>
                  <MomentoCurvo x={xHastial} y={yTopZapata} etiqueta="Mh" sentido={-1} />
                </>
              )}

              {/* --- Talón: peso de tierra que gravita, momento hacia abajo --- */}
              {destacado === "talón" && (
                <>
                  {[0.3, 0.6, 0.9].map((f) => {
                    const x = xHastial + px(espesorMuroM) + px(talonM) * f;
                    return (
                      <g key={f}>
                        <line x1={x} y1={yTopZapata - 26} x2={x} y2={yTopZapata - 4}
                              className="stroke-destructive" strokeWidth={1.2} />
                        <polygon points={`${x},${yTopZapata - 2} ${x - 3},${yTopZapata - 9} ${x + 3},${yTopZapata - 9}`}
                                 className="fill-destructive" />
                      </g>
                    );
                  })}
                  <text x={xHastial + px(espesorMuroM) + px(talonM) / 2} y={yTopZapata - 32}
                        textAnchor="middle" className="fill-destructive text-[9px]">Wt</text>
                  {/*
                    El momento del talón se rotula por debajo de la zapata y
                    desplazado: puesto sobre el arranque pisaba el nombre de la
                    pieza y la leyenda del pie.
                  */}
                  <MomentoCurvo x={xHastial + px(espesorMuroM) + 12} y={Y_BASE + 18}
                                etiqueta="Mt" sentido={1} etiquetaDebajo />
                </>
              )}

              {/* --- Puntera: reacción del terreno que la levanta --- */}
              {destacado === "puntera" && (
                <>
                  <polygon
                    points={`${xZapata},${Y_BASE + 26} ${xZapata + px(punteraM)},${Y_BASE + 12} ${xZapata + px(punteraM)},${Y_BASE} ${xZapata},${Y_BASE}`}
                    className="fill-emerald-600/25 stroke-emerald-700" strokeWidth={1} />
                  {/* Al costado del triángulo: debajo pisaba la leyenda del pie. */}
                  <text x={xZapata - 4} y={Y_BASE + 20} textAnchor="end"
                        className="fill-emerald-700 text-[9px]">σ</text>
                  <MomentoCurvo x={xHastial} y={yTopZapata + px(cantoZapataM) / 2} etiqueta="Mp" sentido={1} />
                </>
              )}

              <text x={ox + ANCHO_PANEL / 2} y={16} textAnchor="middle"
                    className="fill-foreground text-[10px] font-medium">
                {destacado}
              </text>
              <text x={ox + ANCHO_PANEL / 2} y={ALTO - 6} textAnchor="middle"
                    className="fill-muted-foreground text-[8px]">
                {["tracción cara interior", "tracción arriba", "tracción abajo"][i]}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="text-xs text-muted-foreground">
        Tres voladizos con cargas de sentidos distintos: por eso la armadura principal cambia de
        cara en cada uno. Puntera {fmt(punteraM)} m · talón {fmt(talonM)} m.
      </figcaption>
    </figure>
  );
}

/** Flecha curva que representa el momento en el arranque de un voladizo. */
function MomentoCurvo({
  x, y, etiqueta, sentido, etiquetaDebajo = false,
}: {
  x: number; y: number; etiqueta: string; sentido: 1 | -1; etiquetaDebajo?: boolean;
}) {
  const r = 11;
  return (
    <g>
      <path
        d={`M ${x - r} ${y} A ${r} ${r} 0 0 ${sentido > 0 ? 1 : 0} ${x + r} ${y}`}
        fill="none" className="stroke-foreground" strokeWidth={1.4} />
      <polygon
        points={`${x + r},${y} ${x + r - 4},${y - 4 * sentido} ${x + r + 4},${y - 4 * sentido}`}
        className="fill-foreground" />
      <text x={x + (etiquetaDebajo ? r + 6 : 0)} y={etiquetaDebajo ? y + 3 : y - r - 3 * sentido}
            textAnchor={etiquetaDebajo ? "start" : "middle"}
            className="fill-foreground text-[9px] font-medium">
        {etiqueta}
      </text>
    </g>
  );
}
