"use client";

import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import type { DobladoU } from "@/lib/calc/hormigon/macizo-transicion";
import { fmt } from "@/lib/verificaciones/formato";

interface DobladoMacizoProps {
  etiqueta: string;
  /** Qué fuerza entra al doblado: "Ts" en A, "T" en B */
  fuerza: string;
  d: DobladoU;
  diametroMm: number;
  fcdTopeMPa: number;
  mandrilTablaMm: number;
  /** Mandril adoptado; null si está en blanco */
  mandrilMm: number | null;
}

const BARRA = { borde: "de borde", interior: "interior" } as const;

/**
 * Un doblado de la U con carga, ec. (8.1) del art. 8.3 (3). Sin mandril
 * adoptado no se marca si cumple: se informa el requerido, que es lo que el
 * usuario necesita para elegirlo. El desarrollo muestra de dónde sale Fbt,
 * incluido el tope de fyd·A cuando la U no alcanza para la fuerza total.
 */
export function DobladoMacizo({ etiqueta, fuerza, d, diametroMm, fcdTopeMPa, mandrilTablaMm, mandrilMm }: DobladoMacizoProps) {
  const filas = [
    {
      etiqueta: `${fuerza} repartida`,
      formula: `${fuerza}/n`,
      sustitucion: `${fmt(d.fuerzaTotalKN, 1)} / ${d.numeroBarras}`,
      valor: `${fmt(d.fuerzaRepartidaKN, 1)} kN`,
    },
    {
      etiqueta: "Tope de una barra",
      formula: "fyd·A_barra",
      valor: `${fmt(d.topeBarraKN, 1)} kN`,
    },
    {
      etiqueta: "Fbt",
      formula: "mín(repartida; tope)",
      valor: `${fmt(d.fuerzaBarraKN, 1)} kN${d.limitadaPorFyd ? " — la U no alcanza: cada barra queda en fluencia" : ""}`,
    },
    { etiqueta: "ab, barra de borde", formula: "recubrimiento + Ø/2", valor: `${fmt(d.abBordeMm, 1)} mm` },
    {
      etiqueta: "ab, barras interiores",
      formula: "medio intereje",
      valor: Number.isFinite(d.abInteriorMm) ? `${fmt(d.abInteriorMm, 1)} mm` : "no hay",
    },
    {
      etiqueta: "φm,min  (8.1)",
      formula: "Fbt·(1/ab + 1/(2Ø))/fcd",
      sustitucion: `${fmt(d.fuerzaBarraKN * 1000, 0)}·(1/${fmt(d.abMm, 1)} + 1/${2 * diametroMm})/${fmt(fcdTopeMPa, 2)}`,
      valor: `${fmt(d.mandrilNecMm, 0)} mm (barra ${BARRA[d.barraQueManda]}; tabla A19.8.1: ${mandrilTablaMm} mm)`,
    },
  ];

  return (
    <div className="space-y-2">
      {d.verifica === null || mandrilMm === null ? (
        <div className="rounded-md border p-3 text-sm">
          <p className="font-medium">{etiqueta}</p>
          <p className="mt-1">
            Mandril requerido = <span className="font-mono font-semibold">{fmt(d.mandrilNecMm, 0)} mm</span>{" "}
            <span className="text-muted-foreground">
              (manda la barra {BARRA[d.barraQueManda]}). Cargá el mandril adoptado para verificarlo.
            </span>
          </p>
        </div>
      ) : (
        <ResultadoCheck
          etiqueta={etiqueta}
          verifica={d.verifica}
          detalle={`ec. (8.1); manda la barra ${BARRA[d.barraQueManda]}, ab = ${fmt(d.abMm, 1)} mm; Fbt = ${fmt(d.fuerzaBarraKN, 1)} kN por barra`}
          comparacion={{
            real: { etiqueta: "φm,min", valor: d.mandrilNecMm },
            limite: { etiqueta: "mandril", valor: mandrilMm },
            unidad: "mm", exige: "≤", decimales: 0,
          }}
        />
      )}
      <PanelFormulas titulo={`Ver desarrollo de Fbt y del mandril (${fuerza})`} filas={filas} />
    </div>
  );
}
