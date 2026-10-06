"use client";

import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import { DiagramaArmaduraTirante } from "@/components/verificaciones/hormigon/DiagramaArmaduraTirante";
import type { ResultadoArmaduraTirante } from "@/lib/calc/hormigon/cimentaciones/tirante-rozamiento";
import { fmt } from "@/lib/verificaciones/formato";
import type { RecomendacionesTirante } from "@/lib/verificaciones/recomendaciones/armadura-tirante";

interface VerificacionArmaduraTiranteProps {
  elemento: "pilar" | "muro";
  resultado: ResultadoArmaduraTirante;
  /** "4 Ø12" o "Ø12 c/0,20 m". */
  descripcionBarras: string;
  /** "cm²" en la aislada, "cm²/m" en la corrida. */
  unidadAs: string;
  anchoApoyoM: number;
  recubrimientoM: number;
  patilla: boolean;
  pataMm: number;
  adherencia: string;
  recomendaciones?: RecomendacionesTirante;
}

/** Área y anclaje del tirante, con el dibujo del nudo. */
export function VerificacionArmaduraTirante({
  elemento, resultado, descripcionBarras, unidadAs, anchoApoyoM, recubrimientoM, patilla, pataMm, adherencia, recomendaciones,
}: VerificacionArmaduraTiranteProps) {
  return (
    <div className="grid gap-6 pt-4 md:grid-cols-[1fr_minmax(0,18rem)]">
      <div>
        <ResultadoCheck
          etiqueta="Armadura del tirante"
          verifica={resultado.verificaAs}
          detalle="Anejo 19: As ≥ Td/fyd."
          comparacion={{
            real: { etiqueta: "As real", valor: resultado.asRealCm2 },
            limite: { etiqueta: "As nec", valor: resultado.asNecCm2 },
            unidad: unidadAs, exige: "≥",
          }}
          recomendaciones={recomendaciones?.as}
        />
        <ResultadoCheck
          etiqueta={`Anclaje del tirante en el ${elemento}`}
          verifica={resultado.verificaAnclaje}
          detalle={`Anejo 19, art. 8.4, con σsd = Td/As real = ${fmt(resultado.sigmaSdMPa, 0)} MPa, medido desde la cara interior sobre el eje de la barra (art. 8.4.3 (3)).`}
          comparacion={{
            real: { etiqueta: "lbd", valor: resultado.lbdMm },
            limite: { etiqueta: "disponible", valor: resultado.disponibleMm },
            unidad: "mm", exige: "≤",
          }}
          recomendaciones={recomendaciones?.anclaje}
        />
      </div>
      <DiagramaArmaduraTirante
        elemento={elemento}
        anchoApoyoM={anchoApoyoM}
        recubrimientoM={recubrimientoM}
        patilla={patilla}
        pataMm={pataMm}
        lbdMm={resultado.lbdMm}
        disponibleMm={resultado.disponibleMm}
        verificaAnclaje={resultado.verificaAnclaje}
        resumen={[
          { etiqueta: "Tirante", valor: descripcionBarras },
          { etiqueta: "As real / nec", valor: `${fmt(resultado.asRealCm2)} / ${fmt(resultado.asNecCm2)} ${unidadAs}` },
          { etiqueta: "Extremo", valor: patilla ? `patilla, pata ${fmt(pataMm, 0)} mm` : "barra recta" },
          { etiqueta: "Adherencia", valor: adherencia.toLowerCase() },
          { etiqueta: "lbd / disponible", valor: `${fmt(resultado.lbdMm, 0)} / ${fmt(resultado.disponibleMm, 0)} mm` },
        ]}
      />
    </div>
  );
}
