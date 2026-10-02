"use client";

import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import type { calcularZapataMedianeria } from "@/lib/calc/hormigon/cimentaciones/zapata-medianeria";
import { fmt } from "@/lib/verificaciones/formato";

interface TarjetaLadoZapataProps {
  titulo: string;
  resultado: ReturnType<typeof calcularZapataMedianeria>["ladoLimite"];
}

/**
 * Armadura y cortante de un vuelo de la zapata de medianería. Los dos vuelos
 * tienen la misma forma de resultado pero valores muy distintos: el del lado
 * del límite es corto y el opuesto largo, y de esa asimetría sale el momento
 * que hay que equilibrar.
 *
 * Filas de comprobación, no tarjeta: se lee en la hoja técnica junto con las
 * demás comprobaciones estructurales.
 */
export function TarjetaLadoZapata({ titulo, resultado }: TarjetaLadoZapataProps) {
  return (
    <div>
      <ResultadoCheck
        etiqueta={`${titulo} · armadura suficiente`}
        verifica={resultado.verificaAs}
        comparacion={{
          real: { etiqueta: "As real", valor: resultado.asRealCm2 },
          limite: { etiqueta: "As nec", valor: resultado.asNecCm2 },
          unidad: "cm²", exige: "≥",
        }}
      />
      <ResultadoCheck
        etiqueta={`${titulo} · cortante sin armadura transversal`}
        verifica={resultado.verificaCorte}
        comparacion={{
          real: { etiqueta: "Vd", valor: resultado.vEdKN },
          limite: { etiqueta: "VRd,c", valor: resultado.vRdCKN },
          unidad: "kN", exige: "≤",
        }}
      />
      <PanelFormulas
        titulo={`Ver desarrollo · ${titulo.toLowerCase()}`}
        filas={[
          { etiqueta: "Vuelo", valor: `${fmt(resultado.lM, 3)} m` },
          { etiqueta: "σ en el borde", valor: `${fmt(resultado.sigmaMaxKPa)} kN/m²` },
          { etiqueta: "σ en sección crítica", valor: `${fmt(resultado.sigmaCriticaKPa)} kN/m²` },
          { etiqueta: "Td", valor: `${fmt(resultado.tdKN)} kN` },
          { etiqueta: "As mín. mecánico (planilla)", valor: `${fmt(resultado.asMinMecanicoCm2)} cm²` },
          { etiqueta: "As mín. geométrico (planilla)", valor: `${fmt(resultado.asMinGeometricoCm2)} cm²` },
        ]}
      />
    </div>
  );
}
