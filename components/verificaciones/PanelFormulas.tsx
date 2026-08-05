"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Fila {
  etiqueta: string;
  valor: string;
}

interface PanelFormulasProps {
  titulo: string;
  filas: Fila[];
}

export function PanelFormulas({ titulo, filas }: PanelFormulasProps) {
  const [abierto, setAbierto] = useState(false);

  return (
    <Collapsible open={abierto} onOpenChange={setAbierto}>
      <CollapsibleTrigger className="flex w-full items-center justify-between py-1.5 text-sm text-muted-foreground hover:text-foreground">
        <span>{titulo}</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${abierto ? "rotate-180" : ""}`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 pb-3 pt-1 text-sm">
          {filas.map((fila) => (
            <div key={fila.etiqueta} className="contents">
              <dt className="text-muted-foreground">{fila.etiqueta}</dt>
              <dd className="text-right font-mono tabular-nums">{fila.valor}</dd>
            </div>
          ))}
        </dl>
      </CollapsibleContent>
    </Collapsible>
  );
}
