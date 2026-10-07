"use client";

import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import type { ResultadoVuelco } from "@/lib/calc/hormigon/cimentaciones/estabilidad-zapata";
import type { Recomendacion } from "@/lib/verificaciones/recomendaciones/motor";
import { fmt } from "@/lib/verificaciones/formato";

interface ComprobacionVuelcoProps {
  etiqueta: string;
  /** Null cuando el par tirante–terreno impide el giro en esta dirección. */
  resultado: ResultadoVuelco | null;
  /** Cómo se llama cada borde en el dibujo: "izquierdo" / "derecho", "superior" / "inferior". */
  bordes: { inicio: string; fin: string };
  /** Qué no hay en esta dirección cuando nada empuja: "en A", "a lo ancho". */
  direccion: string;
  recomendaciones?: readonly Recomendacion[];
}

/**
 * Vuelco por el DB SE-C, ec. (2.1) y tabla 2.1. Los coeficientes salen del
 * resultado, así sirve igual para la situación persistente y la extraordinaria.
 */
export function ComprobacionVuelco({ etiqueta, resultado, bordes, direccion, recomendaciones }: ComprobacionVuelcoProps) {
  if (!resultado) {
    return <ResultadoCheck etiqueta={etiqueta} verifica detalle={`Con tirante, el par tirante–terreno impide el giro ${direccion}.`} />;
  }
  if (resultado.borde === "ninguno") {
    return <ResultadoCheck etiqueta={etiqueta} verifica detalle={`Sin momento ni horizontal ${direccion}: no hay vuelco que comprobar.`} />;
  }
  const gDst = fmt(resultado.gammaDesestabilizadoras, 1);
  const gStb = fmt(resultado.gammaEstabilizadoras, 1);
  return (
    <ResultadoCheck
      etiqueta={etiqueta}
      verifica={resultado.verifica}
      detalle={`CTE DB SE-C, ec. (2.1) y tabla 2.1: ${gDst}·Mdst ≤ ${gStb}·Mstb respecto del borde ${resultado.borde === "fin" ? bordes.fin : bordes.inicio}. Mdst = ${fmt(resultado.momentoDesestabilizadorKNm)} kN·m, Mstb = ${fmt(resultado.momentoEstabilizadorKNm)} kN·m.`}
      comparacion={{
        real: { etiqueta: `${gDst}·Mdst`, valor: resultado.efectoDesestabilizadorKNm },
        limite: { etiqueta: `${gStb}·Mstb`, valor: resultado.efectoEstabilizadorKNm },
        unidad: "kN·m",
        exige: "≤",
      }}
      recomendaciones={recomendaciones}
    />
  );
}
