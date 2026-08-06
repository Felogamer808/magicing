"use client";

/**
 * Sección de la pieza, con la premoldeada y la carpeta diferenciadas y las cotas
 * que intervienen en el cálculo: el baricentro de cada una, la posición de los
 * torones y la excentricidad.
 *
 * La distinción entre las dos partes no es decorativa: el pretensado actúa sobre
 * la premoldeada sola y las cargas posteriores sobre el conjunto. Verlas
 * separadas es lo que explica por qué el cálculo pide dos juegos de propiedades.
 */

interface Props {
  hSimpleM: number;
  bSimpleM: number;
  hCompuestaM: number;
  bCompuestaM: number;
  ygSimpleM: number;
  ygCompuestaM: number;
  recPretensadoM: number;
  torones: number;
  excentricidadM: number;
}

/** El ancho reserva sitio a la derecha para las etiquetas de los baricentros. */
const ANCHO = 350;
const ALTO = 220;

const fmt = (n: number, d = 3) =>
  n.toLocaleString("es-AR", { minimumFractionDigits: d, maximumFractionDigits: d });

export function SeccionPretensadaDiagrama({
  hSimpleM,
  bSimpleM,
  hCompuestaM,
  bCompuestaM,
  ygSimpleM,
  ygCompuestaM,
  recPretensadoM,
  torones,
  excentricidadM,
}: Props) {
  const anchoMax = Math.max(bSimpleM, bCompuestaM);
  // Escala única para las dos direcciones, para que no se deforme la sección.
  const escala = Math.min((ANCHO - 175) / anchoMax, (ALTO - 60) / hCompuestaM);

  const xCentro = 78 + (anchoMax * escala) / 2;
  const yBase = ALTO - 26;
  const px = (m: number) => m * escala;

  const carpetaM = Math.max(hCompuestaM - hSimpleM, 0);
  const yTopSimple = yBase - px(hSimpleM);
  const yTopCompuesta = yBase - px(hCompuestaM);

  // Los torones se reparten en una fila a la altura del recubrimiento mecánico.
  const yTorones = yBase - px(recPretensadoM);
  const anchoUtil = px(bSimpleM) * 0.72;
  const posiciones =
    torones <= 1
      ? [xCentro]
      : Array.from({ length: torones }, (_, i) =>
          xCentro - anchoUtil / 2 + (i * anchoUtil) / (torones - 1)
        );

  return (
    <figure className="space-y-1">
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="h-auto w-full" role="img"
           aria-label={`Sección de ${fmt(hCompuestaM, 2)} m de canto con ${torones} torones`}>
        {/* Carpeta vertida in situ. */}
        {carpetaM > 0 && (
          <rect
            x={xCentro - px(bCompuestaM) / 2}
            y={yTopCompuesta}
            width={px(bCompuestaM)}
            height={px(carpetaM)}
            className="fill-muted-foreground/20 stroke-foreground/50"
            strokeWidth={1.2}
          />
        )}

        {/* Pieza premoldeada. */}
        <rect
          x={xCentro - px(bSimpleM) / 2}
          y={yTopSimple}
          width={px(bSimpleM)}
          height={px(hSimpleM)}
          className="fill-primary/10 stroke-foreground/60"
          strokeWidth={1.4}
        />

        {/* Baricentros: el de la premoldeada manda para el pretensado. */}
        <line
          x1={xCentro - px(bSimpleM) / 2 - 8}
          y1={yBase - px(ygSimpleM)}
          x2={xCentro + px(bSimpleM) / 2 + 8}
          y2={yBase - px(ygSimpleM)}
          className="stroke-primary"
          strokeWidth={1}
          strokeDasharray="5 3"
        />
        <text x={xCentro + px(bSimpleM) / 2 + 11} y={yBase - px(ygSimpleM) + 3}
              className="fill-primary text-[9px]">
          G premold.
        </text>

        {carpetaM > 0 && (
          <>
            <line
              x1={xCentro - px(bCompuestaM) / 2 - 8}
              y1={yBase - px(ygCompuestaM)}
              x2={xCentro + px(bCompuestaM) / 2 + 8}
              y2={yBase - px(ygCompuestaM)}
              className="stroke-muted-foreground"
              strokeWidth={1}
              strokeDasharray="2 3"
            />
            <text x={xCentro + px(bCompuestaM) / 2 + 11} y={yBase - px(ygCompuestaM) + 3}
                  className="fill-muted-foreground text-[9px]">
              G compuesta
            </text>
          </>
        )}

        {/* Torones. */}
        {posiciones.map((cx, i) => (
          <circle key={i} cx={cx} cy={yTorones} r={2.6} className="fill-primary" />
        ))}

        {/* Excentricidad: del baricentro de la premoldeada al centro de torones. */}
        <line x1={xCentro - px(bSimpleM) / 2 + 10} y1={yBase - px(ygSimpleM)}
              x2={xCentro - px(bSimpleM) / 2 + 10} y2={yTorones}
              className="stroke-primary" strokeWidth={1.2} />
        <text x={xCentro - px(bSimpleM) / 2 + 14}
              y={(yBase - px(ygSimpleM) + yTorones) / 2 + 3}
              className="fill-primary text-[9px]">
          e = {fmt(excentricidadM)} m
        </text>

        {/* Cota de canto total. */}
        <line x1={40} y1={yTopCompuesta} x2={40} y2={yBase} className="stroke-muted-foreground" strokeWidth={1} />
        <line x1={36} y1={yTopCompuesta} x2={44} y2={yTopCompuesta} className="stroke-muted-foreground" strokeWidth={1} />
        <line x1={36} y1={yBase} x2={44} y2={yBase} className="stroke-muted-foreground" strokeWidth={1} />
        <text x={34} y={(yTopCompuesta + yBase) / 2} textAnchor="end"
              className="fill-muted-foreground text-[9px]">
          {fmt(hCompuestaM, 2)} m
        </text>

        <text x={xCentro} y={yBase + 16} textAnchor="middle" className="fill-muted-foreground text-[9px]">
          {torones} {torones === 1 ? "torón" : "torones"}
        </text>
      </svg>
    </figure>
  );
}
