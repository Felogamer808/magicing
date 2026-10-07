"use client";

import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import type { ResultadoDeslizamiento } from "@/lib/calc/hormigon/cimentaciones/estabilidad-zapata";
import type { Recomendacion } from "@/lib/verificaciones/recomendaciones/motor";
import { fmt } from "@/lib/verificaciones/formato";

interface ComprobacionDeslizamientoProps {
  etiqueta: string;
  /** Null si falta φ′: queda sin evaluar, no se inventa. */
  resultado: ResultadoDeslizamiento | null;
  /** Lo que se agrega al detalle, como la aclaración del tirante. */
  nota?: string;
  recomendaciones?: readonly Recomendacion[];
}

/**
 * Deslizamiento por el DB SE-C, art. 4.2.3.1 (4) y tabla 2.1. El γR sale del
 * resultado, así sirve igual para la situación persistente y la extraordinaria.
 */
export function ComprobacionDeslizamiento({ etiqueta, resultado, nota, recomendaciones }: ComprobacionDeslizamientoProps) {
  if (!resultado) {
    return (
      <ResultadoCheck
        etiqueta={etiqueta}
        verifica={false}
        estado="no-evaluado"
        detalle="Falta φ' del terreno: sin él no se puede comprobar."
      />
    );
  }
  return (
    <ResultadoCheck
      etiqueta={etiqueta}
      verifica={resultado.verifica}
      detalle={`CTE DB SE-C: δ = 3/4·φ' = ${fmt(resultado.deltaGrados, 1)}° (art. 4.2.3.1 (4)), sin adherencia, cargas sin mayorar y γR = ${fmt(resultado.gammaR, 1)} (tabla 2.1). Frena sólo la carga permanente más el peso propio.${nota ? ` ${nota}` : ""}`}
      comparacion={{
        real: { etiqueta: "H", valor: resultado.horizontalKN },
        limite: { etiqueta: "(Nperm+P)·tan δ/γR", valor: resultado.rozamientoCalculoKN },
        unidad: "kN",
        exige: "≤",
      }}
      recomendaciones={recomendaciones}
    />
  );
}
