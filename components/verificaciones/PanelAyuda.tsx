"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface PanelAyudaProps {
  titulo: string;
  children: React.ReactNode;
}

/**
 * Explicación de los datos de un bloque, plegada por omisión.
 *
 * El texto de ayuda es útil la primera vez y estorba todas las demás: quien ya
 * sabe qué es cada parámetro no quiere leerlo cada vez que abre la página. Con
 * el panel cerrado el formulario queda limpio y la explicación sigue a un clic.
 *
 * Igual que en PanelFormulas se usa `hiddenUntilFound`, para que el contenido
 * siga saliendo al imprimir y Ctrl+F lo encuentre y abra el panel solo.
 */
export function PanelAyuda({ titulo, children }: PanelAyudaProps) {
  const [abierto, setAbierto] = useState(false);

  return (
    <Collapsible open={abierto} onOpenChange={setAbierto}>
      <CollapsibleTrigger className="flex w-full items-center gap-1.5 py-1.5 text-xs text-muted-foreground hover:text-foreground">
        <HelpCircle className="h-3.5 w-3.5 shrink-0" />
        <span>{titulo}</span>
        <ChevronDown
          className={`ml-auto h-3.5 w-3.5 transition-transform ${abierto ? "rotate-180" : ""}`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent hiddenUntilFound>
        <div className="space-y-1.5 pb-2 pt-1 text-xs text-muted-foreground">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
