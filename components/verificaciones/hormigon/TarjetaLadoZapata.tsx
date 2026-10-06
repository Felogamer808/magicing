"use client";

import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import type { ResultadoDireccionZapata } from "@/lib/calc/hormigon/cimentaciones/zapata-aislada";
import { fmt } from "@/lib/verificaciones/formato";

interface TarjetaLadoZapataProps {
  titulo: string;
  resultado: ResultadoDireccionZapata;
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
      {resultado.anclaje.comprobado ? (
        <ResultadoCheck
          etiqueta={`${titulo} · anclaje de la parrilla`}
          verifica={resultado.anclaje.verifica}
          detalle={`Anejo 19, art. 9.8.2.2 y 8.4. Gobierna x = ${fmt(resultado.anclaje.xM, 3)} m desde el borde, con Fs = ${fmt(resultado.anclaje.fsKN)} kN.`}
          comparacion={{
            real: { etiqueta: "lbd", valor: resultado.anclaje.lbdMm },
            limite: { etiqueta: "disponible", valor: resultado.anclaje.disponibleMm },
            unidad: "mm", exige: "≤",
          }}
        />
      ) : (
        <ResultadoCheck
          etiqueta={`${titulo} · anclaje de la parrilla`}
          verifica
          detalle="El vuelo no llega a h/2 (art. 9.8.2.2 (5)): la fisura inclinada no cae dentro y no hay tirante que anclar de este lado."
        />
      )}
      {/* Sin VRd,c calculada es que la sección a d de la cara cae fuera del
          vuelo: no hay cortante que comprobar, y "0 = 0" no lo explica. */}
      {resultado.vRdCKN > 0 ? (
        <ResultadoCheck
          etiqueta={`${titulo} · cortante sin armadura transversal`}
          verifica={resultado.verificaCorte}
          comparacion={{
            real: { etiqueta: "Vd", valor: resultado.vEdKN },
            limite: { etiqueta: "VRd,c", valor: resultado.vRdCKN },
            unidad: "kN", exige: "≤",
          }}
        />
      ) : (
        <ResultadoCheck
          etiqueta={`${titulo} · cortante sin armadura transversal`}
          verifica={resultado.verificaCorte}
          detalle="La sección a d de la cara cae fuera del vuelo: no hay cortante que comprobar."
        />
      )}
      <PanelFormulas
        titulo={`Ver desarrollo · ${titulo.toLowerCase()}`}
        filas={[
          { etiqueta: "Borde a sección de cálculo (0,15·c dentro del pilar)", valor: `${fmt(resultado.lM, 3)} m` },
          { etiqueta: "σ en el borde", valor: `${fmt(resultado.sigmaMaxKPa)} kN/m²` },
          { etiqueta: "σ en la sección de cálculo", valor: `${fmt(resultado.sigmaCriticaKPa)} kN/m²` },
          { etiqueta: "M en la sección de cálculo", valor: `${fmt(resultado.momentoKNm)} kN·m` },
          { etiqueta: "Fs,max = M/(0,9·d)", valor: `${fmt(resultado.fsKN)} kN` },
          { etiqueta: "As = Fs/fyd", valor: `${fmt(resultado.asCalculadoCm2)} cm²` },
          { etiqueta: "As mín., ec. (9.1)", valor: `${fmt(resultado.asMinCm2)} cm²` },
        ]}
      />
    </div>
  );
}
