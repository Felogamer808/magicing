"use client";

import { Subgrupo } from "@/components/verificaciones/comun/HojaTecnica";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import type { FilaExtraordinaria } from "@/lib/verificaciones/hormigon-extraordinario";

/**
 * El hormigón de la zapata con la combinación accidental, en un bloque aparte
 * del de la persistente (criterio del usuario, 2026-10-12).
 */
export function HormigonExtraordinario({ filas }: { filas: readonly FilaExtraordinaria[] }) {
  return (
    <Subgrupo titulo="Situación extraordinaria: hormigón">
      <div>
        <p className="text-xs text-muted-foreground">
          Las cargas extraordinarias sin mayorar (combinación accidental, γ = 1,0) y los materiales con γc = 1,3 y
          γs = 1,0 (Anejo 19, tabla A19.2.1, pág. 20). Las mismas barras de la persistente. Los mínimos no se repiten: no dependen de la situación y ya se comprueban en la persistente.
        </p>
        {filas.map((f) => (
          <ResultadoCheck
            key={f.etiqueta}
            etiqueta={f.etiqueta}
            verifica={f.estado === "cumple"}
            estado={f.estado === "cumple" || f.estado === "no-cumple" ? undefined : f.estado}
            detalle={f.detalle}
            comparacion={f.comparacion}
          />
        ))}
      </div>
    </Subgrupo>
  );
}
