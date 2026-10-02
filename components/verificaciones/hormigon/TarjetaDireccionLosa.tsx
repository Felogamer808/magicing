"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PanelFormulas } from "@/components/verificaciones/comun/PanelFormulas";
import { ResultadoCheck } from "@/components/verificaciones/comun/ResultadoCheck";
import type { ResultadoDireccionLosa } from "@/lib/calc/hormigon/losas/losa";
import { fmt } from "@/lib/verificaciones/formato";

interface TarjetaDireccionLosaProps {
  titulo: string;
  r: ResultadoDireccionLosa;
  diametroMm: number;
  separacionM: number;
  /** Aclaración propia de la dirección, p. ej. que su canto útil es menor. */
  nota?: string;
}

/**
 * Resultado del armado de una dirección de la losa (X o Y, positivo o negativo).
 * La losa se resuelve como cuatro casos con la misma forma, así que las cuatro
 * tarjetas son el mismo componente.
 */
export function TarjetaDireccionLosa({
  titulo,
  r,
  diametroMm,
  separacionM,
  nota,
}: TarjetaDireccionLosaProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ResultadoCheck
          etiqueta={`Armado φ${fmt(diametroMm, 0)}/${fmt(separacionM * 100, 0)} cm`}
          verifica={r.verificaAs}
          detalle={`As real ${fmt(r.asRealCm2PorM)} cm²/m / As nec ${fmt(r.asNecCm2PorM)} cm²/m`}
        />
        {nota && <p className="text-xs text-muted-foreground">{nota}</p>}
        <PanelFormulas
          titulo="Ver cálculo"
          filas={[
            { etiqueta: "d", valor: `${fmt(r.dM, 3)} m` },
            { etiqueta: "μ", valor: fmt(r.mu, 5) },
            { etiqueta: "ω", valor: fmt(r.omega, 5) },
            { etiqueta: "As por momento", valor: `${fmt(r.asCalculadoCm2PorM)} cm²/m` },
            { etiqueta: "As,min (Anejo 19, 9.3.1.1 → ec. 9.1)", valor: `${fmt(r.asMinCm2PorM)} cm²/m` },
            { etiqueta: "Separación necesaria", valor: `${fmt(r.separacionNecM * 100, 1)} cm` },
            { etiqueta: "Separación máxima", valor: `${fmt(r.separacionMaxM * 100, 0)} cm` },
            {
              etiqueta: "Adherencia (fig. A19.8.2)",
              valor: `${r.situacionAdherencia === "buena" ? "buena" : "mala"} · η1 = ${fmt(r.anclaje.eta1, 1)}`,
            },
            { etiqueta: "fbd = 2,25·η1·η2·fctd", valor: `${fmt(r.anclaje.fbdMPa, 2)} MPa` },
            {
              etiqueta: "σsd = fyd·As,nec/As,real",
              valor: `${fmt(r.anclaje.sigmaSdMPa, 1)} MPa`,
            },
            {
              etiqueta: "lb,rqd",
              formula: "(Ø/4)·σsd/fbd",
              valor: `${fmt(r.anclaje.lbRqdMm, 0)} mm`,
            },
            { etiqueta: "cd = mín(a/2, c)", valor: `${fmt(r.cdMm, 0)} mm` },
            { etiqueta: "α1 · α2", valor: `${fmt(r.anclaje.alfa1, 2)} · ${fmt(r.anclaje.alfa2, 2)}` },
            {
              etiqueta: "lbd (Anejo 19, 8.4.4)",
              valor: `${fmt(r.anclaje.lbdMm, 0)} mm (mín. ${fmt(r.anclaje.lbMinMm, 0)})`,
            },
          ]}
        />
      </CardContent>
    </Card>
  );
}
