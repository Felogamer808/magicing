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
      {/*
        hiddenUntilFound deja el detalle en el DOM aunque el panel esté cerrado,
        y lo oculta con content-visibility en lugar del atributo hidden a secas.
        Importa por dos motivos: al imprimir la hoja para la memoria de cálculo
        el desarrollo de fórmulas sale igual, y el buscador del navegador
        (Ctrl+F) encuentra texto adentro y abre el panel solo.

        Con hidden a secas no alcanzaría: el navegador lo aplica como
        display:none !important desde su propia hoja de estilos, que gana sobre
        cualquier regla nuestra.
      */}
      <CollapsibleContent hiddenUntilFound>
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
