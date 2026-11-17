"use client";

import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { fmt } from "@/lib/verificaciones/formato";
import { CANTO_PIEL_CONSTRUCTIVA_M, type ResultadoPiel } from "@/lib/calc/hormigon/vigas/armadura-piel";

const MOTIVO: Record<ResultadoPiel["motivo"], string> = {
  exigida: "La exige el art. 7.3.3 (3): canto de 1 m o más.",
  constructiva: `Constructiva, criterio del usuario: el Anejo 19 la exige desde 1 m, y desde ${fmt(CANTO_PIEL_CONSTRUCTIVA_M * 100, 0)} cm se da con el mismo cálculo.`,
  "no-requiere": `Con menos de ${fmt(CANTO_PIEL_CONSTRUCTIVA_M * 100, 0)} cm de canto no se da: el Anejo 19 la pide desde 1 m.`,
};

/**
 * La armadura de piel ya resuelta: cuántas barras, de qué diámetro y cada
 * cuánto, por cara. El área y la separación máxima quedan en el desarrollo.
 */
export function ResultadoArmaduraPiel({ piel }: { piel: ResultadoPiel }) {
  const p = piel.propuesta;
  return (
    <div className="space-y-3">
      {p ? (
        <p className="font-mono text-base font-semibold tabular-nums">
          {p.barrasPorCara}Ø{p.diametroMm} por cara, cada {fmt(p.separacionMm / 10, 1)} cm
        </p>
      ) : (
        <p className="text-sm font-medium">No se requiere armadura de piel por fisuración.</p>
      )}
      <p className="text-sm text-muted-foreground">
        {MOTIVO[piel.motivo]}
        {p &&
          ` Va en las dos caras, entre la armadura de tracción y la fibra neutra (${fmt(piel.alturaZonaM * 100, 0)} cm de altura), dentro de los cercos.`}
      </p>
      {piel.desconchamiento && (
        <p className="text-sm">
          Además, con barras de más de Ø32, piel contra el desconchamiento (Apéndice J.1): por fuera
          de los cercos, malla o barras finas a 150 mm como máximo, con al menos{" "}
          <strong className="tabular-nums">{fmt(piel.desconchamiento.areaMinimaCm2, 2)} cm²</strong> en cada
          dirección (0,01·Act,ext).
        </p>
      )}
      {p && (
        <PanelFormulas
          titulo="Ver desarrollo de la armadura de piel"
          filas={[
            { etiqueta: "Fibra neutra sin fisurar x", valor: `${fmt(piel.xSinFisurarM * 100, 1)} cm` },
            { etiqueta: "Act = bw·(h − x)", valor: `${fmt(piel.actM2 * 1e4, 0)} cm²` },
            {
              etiqueta: "As,piel total, ec. (7.1)",
              formula: "kc·k·fctm·Act / fyk, con kc = 0,4 y k = 0,5",
              valor: `${fmt(piel.areaTotalCm2, 2)} cm²`,
            },
            { etiqueta: "Por cara (mitad)", valor: `${fmt(piel.areaPorCaraCm2, 2)} cm²` },
            {
              etiqueta: "Separación máxima, tabla A19.7.3",
              formula: `σs = fyk/2 = ${fmt(piel.sigmaTablaMPa, 0)} MPa, wk = 0,3 mm`,
              valor: `${fmt(piel.separacionMaximaMm, 0)} mm`,
            },
            { etiqueta: "Dispuesta por cara", valor: `${fmt(p.areaPorCaraCm2, 2)} cm²` },
          ]}
        />
      )}
    </div>
  );
}
