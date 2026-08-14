"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
 */
export function TarjetaLadoZapata({ titulo, resultado }: TarjetaLadoZapataProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ResultadoCheck
          etiqueta="Armadura suficiente"
          verifica={resultado.verificaAs}
          detalle={`As real ${fmt(resultado.asRealCm2)} cm² / As nec ${fmt(resultado.asNecCm2)} cm²`}
        />
        <ResultadoCheck
          etiqueta="Cortante (EC2 6.2.2)"
          verifica={resultado.verificaCorte}
          detalle={`Vd ${fmt(resultado.vEdKN)} kN / VRd,c ${fmt(resultado.vRdCKN)} kN`}
        />
        <PanelFormulas
          titulo="Ver cálculo"
          filas={[
            { etiqueta: "Vuelo", valor: `${fmt(resultado.lM, 3)} m` },
            { etiqueta: "σ en el borde", valor: `${fmt(resultado.sigmaMaxKPa)} kN/m²` },
            { etiqueta: "σ en sección crítica", valor: `${fmt(resultado.sigmaCriticaKPa)} kN/m²` },
            { etiqueta: "Td", valor: `${fmt(resultado.tdKN)} kN` },
            { etiqueta: "As mín. mecánico", valor: `${fmt(resultado.asMinMecanicoCm2)} cm²` },
            { etiqueta: "As mín. geométrico", valor: `${fmt(resultado.asMinGeometricoCm2)} cm²` },
          ]}
        />
      </CardContent>
    </Card>
  );
}
