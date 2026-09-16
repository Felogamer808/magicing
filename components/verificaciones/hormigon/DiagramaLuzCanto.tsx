"use client";

import type { ResultadoLuzCanto } from "@/lib/calc/hormigon/deformaciones";

/**
 * El chequeo del art. 7.4.2 es una sola comparación —l/d real contra el
 * admisible— pero el admisible sale de encadenar cuatro cosas: el valor de la
 * ec. (7.16) y tres correcciones multiplicativas. Con los números en una tabla
 * no se ve cuál de las tres movió la aguja; dibujada la cadena, sí.
 *
 * La barra de arriba es la comparación que decide. La cadena de abajo muestra
 * de dónde salió el límite, con cada factor a escala de cuánto corrigió.
 */

interface Props {
  resultado: ResultadoLuzCanto;
}

const ANCHO = 440;
const ALTO = 186;

const fmt = (n: number, d = 2) =>
  n.toLocaleString("es-AR", { minimumFractionDigits: d, maximumFractionDigits: d });

export function DiagramaLuzCanto({ resultado }: Props) {
  const { ldBase, ldAdm, ldReal, factorTension, factorAla, factorLuzLarga, verifica, k } = resultado;

  const xIzq = 16;
  const anchoUtil = ANCHO - xIzq - 16;
  const tope = Math.max(ldReal, ldAdm, ldBase) * 1.15;
  const escala = tope > 0 ? anchoUtil / tope : 0;

  const yBarra = 40;
  const altoBarra = 22;
  const xAdm = xIzq + ldAdm * escala;
  const anchoReal = Math.max(ldReal * escala, 2);
  const etiquetaAdmDerecha = xAdm < ANCHO - 96;

  // Cadena de factores: sólo se listan los que realmente corrigieron algo, para
  // que no queden tres "×1,00" tapando al que sí movió el límite.
  const factores = [
    { etiqueta: "ec. (7.16)", valor: ldBase, esFactor: false },
    { etiqueta: "310/σs", valor: factorTension, esFactor: true },
    { etiqueta: "ala en T", valor: factorAla, esFactor: true },
    { etiqueta: "luz grande", valor: factorLuzLarga, esFactor: true },
  ].filter((f) => !f.esFactor || Math.abs(f.valor - 1) > 1e-9);

  const yCadena = 122;

  return (
    <figure className="space-y-1">
      <svg
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Relación luz/canto ${fmt(ldReal)} contra el admisible ${fmt(ldAdm)}`}
      >
        <text x={xIzq} y={18} className="fill-muted-foreground text-[10.5px]">
          l/d del elemento contra el admisible (art. 7.4.2)
        </text>

        {/* Zona admisible: hasta el límite, todo lo que entre ahí cumple. */}
        <rect
          x={xIzq}
          y={yBarra}
          width={Math.max(xAdm - xIzq, 0)}
          height={altoBarra}
          className="fill-emerald-600/12"
        />

        {/* l/d real. */}
        <rect
          x={xIzq}
          y={yBarra}
          width={anchoReal}
          height={altoBarra}
          className={
            verifica
              ? "fill-primary/50 stroke-primary"
              : "fill-destructive/40 stroke-destructive"
          }
          strokeWidth={1.2}
        />

        {/* Límite admisible. */}
        <line
          x1={xAdm}
          y1={yBarra - 8}
          x2={xAdm}
          y2={yBarra + altoBarra + 8}
          className="stroke-emerald-700"
          strokeWidth={1.4}
          strokeDasharray="4 3"
        />
        {/* La etiqueta se va al otro lado de la línea si el límite cae cerca del
            borde derecho: si no, se sale del viewBox y se corta. */}
        <text
          x={etiquetaAdmDerecha ? xAdm + 5 : xAdm - 5}
          y={yBarra - 10}
          textAnchor={etiquetaAdmDerecha ? "start" : "end"}
          className="fill-emerald-700 text-[10.5px]"
        >
          admisible {fmt(ldAdm)}
        </text>

        <text
          x={xIzq + 6}
          y={yBarra + altoBarra / 2 + 4}
          className={`text-[12px] font-medium tabular-nums ${
            verifica ? "fill-foreground" : "fill-destructive"
          }`}
        >
          l/d = {fmt(ldReal)}
        </text>

        <text
          x={xIzq}
          y={yBarra + altoBarra + 24}
          className={`text-[11px] ${verifica ? "fill-emerald-700" : "fill-destructive"}`}
        >
          {verifica
            ? "Cumple: se puede omitir el cálculo de la flecha."
            : "No cumple: hay que calcular la flecha (art. 7.4.3) o aumentar el canto."}
        </text>

        {/* Cadena que forma el admisible. */}
        <text x={xIzq} y={yCadena - 10} className="fill-muted-foreground text-[10.5px]">
          de dónde sale el admisible (K = {fmt(k, 1)})
        </text>
        {factores.map((f, i) => {
          const anchoCaja = 74;
          const paso = anchoCaja + 26;
          const x = xIzq + i * paso;
          return (
            <g key={f.etiqueta}>
              {i > 0 && (
                <text
                  x={x - 17}
                  y={yCadena + 20}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[13px]"
                >
                  ×
                </text>
              )}
              <rect
                x={x}
                y={yCadena}
                width={anchoCaja}
                height={30}
                rx={3}
                className="fill-muted/40 stroke-border"
                strokeWidth={1}
              />
              <text
                x={x + anchoCaja / 2}
                y={yCadena + 13}
                textAnchor="middle"
                className="fill-muted-foreground text-[9.5px]"
              >
                {f.etiqueta}
              </text>
              <text
                x={x + anchoCaja / 2}
                y={yCadena + 25}
                textAnchor="middle"
                className="fill-foreground text-[11px] tabular-nums"
              >
                {f.esFactor ? `×${fmt(f.valor)}` : fmt(f.valor)}
              </text>
            </g>
          );
        })}
        <text
          x={xIzq + factores.length * 100 - 26}
          y={yCadena + 20}
          textAnchor="middle"
          className="fill-muted-foreground text-[13px]"
        >
          =
        </text>
        <text
          x={xIzq + factores.length * 100 - 12}
          y={yCadena + 20}
          className="fill-emerald-700 text-[12px] font-medium tabular-nums"
        >
          {fmt(ldAdm)}
        </text>
      </svg>
    </figure>
  );
}
