"use client";

import { CotaH, CotaV, Croquis, Referencia } from "@/components/verificaciones/croquis/Croquis";

export interface GrupoDibujo {
  numero: number;
  diametroMm: number;
  posicion: "superior" | "inferior";
}

interface Props {
  bMm: number;
  hMm: number;
  grupos: readonly GrupoDibujo[];
  conMomento: boolean;
}

/** Rótulo de una fila: "2Ø12 + 1Ø16". */
function rotulo(grupos: readonly GrupoDibujo[]): string {
  return grupos.map((g) => `${g.numero}Ø${g.diametroMm}`).join(" + ");
}

/** Cuántas barras se dibujan por fila como máximo: más ya no se leen. */
const MAXIMO_POR_FILA = 10;

/** Recubrimiento al eje de la barra para el dibujo, en mm: no es un dato del cálculo. */
const RECUBRIMIENTO_DIBUJO_MM = 40;

/**
 * Las esperas de la unión, en dos vistas:
 *
 * - Elevación: la viga soporte cortada, la viga apoyada que llega a su cara y
 *   la junta vertical entre las dos. Las esperas superiores e inferiores la
 *   cruzan y se anclan a cada lado; los cercos de cuelgue abrazan el cruce
 *   dentro de la soporte. Es esquemática.
 * - Sección de la viga apoyada en la junta: b y h en proporción, con cada
 *   barra en su fila y del tamaño de su Ø.
 *
 * No calcula nada: dibuja los datos tal como se cargaron. El dibujo satura la
 * cantidad de barras para seguir siendo legible; el rótulo dice el número real.
 */
export function EsperasUnionVigaViga({ bMm, hMm, grupos, conMomento }: Props) {
  const superiores = grupos.filter((g) => g.posicion === "superior" && g.numero > 0);
  const inferiores = grupos.filter((g) => g.posicion === "inferior" && g.numero > 0);

  // Elevación (esquemática)
  const xSop0 = 72;
  const xJunta = 122;
  const xFin = 260;
  const yTop = 30;
  const yBotViga = 120;
  const yBotSop = 160;
  const ySup = yTop + 9;
  const yInf = yBotViga - 9;
  const xAnclaje = xSop0 + 9;
  const xPunta = 214;

  // Sección (en proporción)
  const xs0 = 330;
  const ys0 = 30;
  const escala = Math.min(110 / hMm, 74 / bMm);
  const bS = bMm * escala;
  const hS = hMm * escala;
  const rec = Math.min(RECUBRIMIENTO_DIBUJO_MM * escala, bS / 4, hS / 4);

  const fila = (gs: readonly GrupoDibujo[], y: number) => {
    const diametros = gs.flatMap((g) => Array.from({ length: g.numero }, () => g.diametroMm)).slice(0, MAXIMO_POR_FILA);
    const n = diametros.length;
    return diametros.map((d, i) => {
      const x = n === 1 ? xs0 + bS / 2 : xs0 + rec + ((bS - 2 * rec) * i) / (n - 1);
      return <circle key={i} cx={x} cy={y} r={Math.max(1.8, (d / 2) * escala)} fill="var(--mat-armadura)" />;
    });
  };

  const barra = (y: number, haciaAdentro: number) => (
    <path
      d={`M${xAnclaje} ${y + haciaAdentro} L${xAnclaje} ${y} L${xPunta} ${y}`}
      stroke="var(--mat-armadura)"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );

  return (
    <Croquis
      viewBox="0 0 420 190"
      ancho="max-w-[36rem]"
      nota="Izquierda: elevación de la unión (esquemática). Las esperas cruzan la junta y se anclan a los dos lados; los cercos de cuelgue abrazan el cruce dentro de la viga soporte. Derecha: sección de la viga apoyada en la junta, en proporción."
    >
      {/* Elevación: viga soporte cortada y viga apoyada */}
      <rect x={xSop0} y={yTop} width={xJunta - xSop0} height={yBotSop - yTop} stroke="var(--mat-hormigon-borde)" strokeWidth="1.6" fill="var(--mat-hormigon)" />
      <rect x={xJunta} y={yTop} width={xFin - xJunta} height={yBotViga - yTop} stroke="var(--mat-hormigon-borde)" strokeWidth="1.6" fill="var(--mat-hormigon)" />
      <path d={`M${xJunta} ${yTop - 8} L${xJunta} ${yBotViga + 8}`} stroke="currentColor" strokeWidth="1.2" strokeDasharray="5 3" />
      <text x={xJunta} y={yTop - 12} textAnchor="middle" className="fill-current font-mono" fontSize="9.5">junta</text>

      {/* cerco de cuelgue de la soporte */}
      <rect x={xSop0 + 5} y={yTop + 4} width={xJunta - xSop0 - 10} height={yBotSop - yTop - 8} rx="3" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" opacity="0.85" />

      {superiores.length > 0 && barra(ySup, 14)}
      {inferiores.length > 0 && barra(yInf, -14)}
      {superiores.length > 0 && (
        <text x={xPunta + 4} y={ySup + 3.5} className="fill-current font-mono" fontSize="10">{rotulo(superiores)}</text>
      )}
      {inferiores.length > 0 && (
        <text x={xPunta + 4} y={yInf + 3.5} className="fill-current font-mono" fontSize="10">{rotulo(inferiores)}</text>
      )}

      {/* Vd que la viga apoyada lleva a la junta */}
      <path d={`M${xJunta + 22} ${yTop - 22} L${xJunta + 22} ${yTop - 3}`} stroke="currentColor" strokeWidth="1.4" markerEnd="url(#croquis-flecha)" />
      <text x={xJunta + 28} y={yTop - 12} className="fill-current font-mono" fontSize="10.5">Vd</text>
      {conMomento && (
        <>
          <path d={`M${xJunta + 58} ${yTop + 30} A 16 16 0 1 1 ${xJunta + 58} ${yTop + 62}`} stroke="currentColor" strokeWidth="1.3" markerEnd="url(#croquis-flecha)" />
          <text x={xJunta + 80} y={yTop + 50} className="fill-current font-mono" fontSize="10.5">Md</text>
        </>
      )}

      <Referencia x={4} y={yTop + 70} hacia={[xSop0 + 5, yTop + 70]} texto="cuelgue (Ash)" />
      <text x={(xJunta + xFin) / 2} y={yBotViga + 22} textAnchor="middle" className="fill-current" fontSize="9.5" opacity="0.8">viga apoyada</text>
      <text x={(xSop0 + xJunta) / 2} y={yBotSop + 14} textAnchor="middle" className="fill-current" fontSize="9.5" opacity="0.8">viga soporte</text>

      {/* Sección en la junta */}
      <rect x={xs0} y={ys0} width={bS} height={hS} stroke="var(--mat-hormigon-borde)" strokeWidth="1.6" fill="var(--mat-hormigon)" />
      {fila(superiores, ys0 + rec)}
      {fila(inferiores, ys0 + hS - rec)}
      <CotaH x0={xs0} x1={xs0 + bS} y={ys0 + hS + 24} texto={`b = ${bMm}`} />
      <CotaV x={xs0 - 12} y0={ys0} y1={ys0 + hS} texto={`h = ${hMm}`} />
    </Croquis>
  );
}
