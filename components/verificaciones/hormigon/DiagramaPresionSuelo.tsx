"use client";

import type { DistribucionPresiones } from "@/lib/calc/hormigon/cimentaciones/zapata-aislada";

/**
 * Reparto de presiones bajo la base, con la tensión admisible del terreno de
 * referencia.
 *
 * Es el dibujo que distingue las dos situaciones que un solo número esconde: la
 * zapata apoyada entera, con diagrama trapecial, y la zapata que se despegó por
 * un borde, con la carga concentrada en una cuña. El paso de una a otra ocurre
 * al salirse del núcleo central, y esa marca está dibujada.
 */

interface Props {
  distribucion: DistribucionPresiones;
  /** Dimensión de la base en la dirección representada. */
  lM: number;
  sigmaAdmisibleKPa: number;
  etiqueta: string;
}

const ANCHO = 400;
const ALTO = 190;
const IZQ = 30;
const DER = ANCHO - 30;
const Y_BASE = 68;
const Y_MAX = ALTO - 34;

const fmt = (n: number, d = 0) =>
  n.toLocaleString("es-AR", { minimumFractionDigits: d, maximumFractionDigits: d });

export function DiagramaPresionSuelo({ distribucion, lM, sigmaAdmisibleKPa, etiqueta }: Props) {
  const { sigmaMaxKPa, sigmaMinKPa, hayDespegue, longitudContactoM, excentricidadM, limiteNucleoM } =
    distribucion;

  const escalaX = (DER - IZQ) / lM;
  const x = (m: number) => IZQ + m * escalaX;

  // La escala vertical toma como referencia la mayor entre la presión y su límite.
  const referencia = Math.max(sigmaMaxKPa, sigmaAdmisibleKPa) * 1.15;
  const y = (kPa: number) => Y_BASE + (kPa / referencia) * (Y_MAX - Y_BASE);

  /*
   * El contacto se mide desde el borde más cargado. La resultante está
   * desplazada hacia ese lado, así que la cuña arranca ahí.
   */
  const xInicioContacto = hayDespegue ? lM - longitudContactoM : 0;

  const diagrama = hayDespegue
    ? `${x(xInicioContacto)},${Y_BASE} ${x(lM)},${Y_BASE} ${x(lM)},${y(sigmaMaxKPa)}`
    : `${x(0)},${Y_BASE} ${x(lM)},${Y_BASE} ${x(lM)},${y(sigmaMaxKPa)} ${x(0)},${y(sigmaMinKPa)}`;

  const verifica = sigmaMaxKPa <= sigmaAdmisibleKPa;
  const xNucleoIzq = x(lM / 2 - limiteNucleoM);
  const xNucleoDer = x(lM / 2 + limiteNucleoM);
  const xResultante = x(lM / 2 + excentricidadM);

  return (
    <figure className="space-y-1">
      <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="h-auto w-full" role="img"
           aria-label={`Presión bajo la base en ${etiqueta}: máxima ${fmt(sigmaMaxKPa)} kPa${hayDespegue ? ", con despegue" : ""}`}>
        {/* Base de la zapata. */}
        <rect x={x(0)} y={Y_BASE - 22} width={DER - IZQ} height={22}
              className="fill-primary/10 stroke-foreground/60" strokeWidth={1.3} />

        {/* Núcleo central: mientras la resultante caiga acá dentro, apoya entera. */}
        <line x1={xNucleoIzq} y1={Y_BASE - 26} x2={xNucleoDer} y2={Y_BASE - 26}
              className="stroke-emerald-700" strokeWidth={2} />
        <text x={(xNucleoIzq + xNucleoDer) / 2} y={Y_BASE - 30} textAnchor="middle"
              className="fill-emerald-700 text-[10.5px]">núcleo central</text>

        {/* Resultante vertical, con su excentricidad. */}
        <line x1={xResultante} y1={Y_BASE - 52} x2={xResultante} y2={Y_BASE - 22}
              className="stroke-foreground" strokeWidth={1.6} />
        <polygon points={`${xResultante},${Y_BASE - 22} ${xResultante - 4},${Y_BASE - 30} ${xResultante + 4},${Y_BASE - 30}`}
                 className="fill-foreground" />
        <text x={xResultante} y={Y_BASE - 56} textAnchor="middle"
              className="fill-foreground text-[10.5px]">N · e = {fmt(excentricidadM * 100, 1)} cm</text>

        {/* Presión admisible del terreno. */}
        <line x1={IZQ} y1={y(sigmaAdmisibleKPa)} x2={DER} y2={y(sigmaAdmisibleKPa)}
              className="stroke-destructive/70" strokeWidth={1} strokeDasharray="4 3" />
        <text x={DER} y={y(sigmaAdmisibleKPa) + 11} textAnchor="end"
              className="fill-destructive text-[10.5px]">
          σadm {fmt(sigmaAdmisibleKPa)} kPa
        </text>

        {/* Diagrama de presiones, hacia abajo. */}
        <polygon points={diagrama}
                 className={verifica ? "fill-primary/25 stroke-primary" : "fill-destructive/25 stroke-destructive"}
                 strokeWidth={1.4} />

        {hayDespegue && (
          <>
            {/* Tramo levantado. */}
            <line x1={x(0)} y1={Y_BASE} x2={x(xInicioContacto)} y2={Y_BASE}
                  className="stroke-destructive" strokeWidth={2.4} strokeDasharray="4 3" />
            <text x={x(xInicioContacto / 2)} y={Y_BASE + 14} textAnchor="middle"
                  className="fill-destructive text-[10.5px]">
              despegue {fmt((lM - longitudContactoM) * 100, 0)} cm
            </text>
          </>
        )}

        <text x={x(lM) - 3} y={y(sigmaMaxKPa) + 12} textAnchor="end"
              className={`text-[11.5px] tabular-nums ${verifica ? "fill-foreground" : "fill-destructive font-medium"}`}>
          {fmt(sigmaMaxKPa)} kPa
        </text>
        {!hayDespegue && (
          <text x={x(0) + 3} y={y(sigmaMinKPa) + 12}
                className="fill-muted-foreground text-[11.5px] tabular-nums">
            {fmt(sigmaMinKPa)} kPa
          </text>
        )}

        <text x={IZQ} y={ALTO - 6} className="fill-muted-foreground text-[10.5px]">
          {etiqueta} · L = {fmt(lM, 2)} m
        </text>
      </svg>
    </figure>
  );
}
