"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface SeccionPlegableProps {
  titulo: string;
  /** Para qué sirve lo que hay adentro, visible con la sección cerrada. */
  resumen?: string;
  children: React.ReactNode;
}

/**
 * Tarjeta que agrupa resultados que no siempre hacen falta, plegada por omisión.
 *
 * Se diferencia de `PanelAyuda` en qué esconde: aquélla guarda texto explicativo
 * dentro de un bloque; ésta guarda verificaciones enteras. Sirve para los casos
 * particulares —un muro apuntalado, una hipótesis alternativa— que sólo se miran
 * cuando corresponden y que abiertos compiten en peso visual con la comprobación
 * principal, aunque casi siempre no apliquen.
 *
 * Igual que en los otros paneles se usa `hiddenUntilFound`, para que el contenido
 * siga saliendo al imprimir y Ctrl+F lo encuentre y lo abra solo.
 */
export function SeccionPlegable({ titulo, resumen, children }: SeccionPlegableProps) {
  const [abierto, setAbierto] = useState(false);

  return (
    <Card>
      <Collapsible open={abierto} onOpenChange={setAbierto}>
        <CollapsibleTrigger className="flex w-full items-center gap-3 px-6 py-4 text-left hover:bg-muted/40">
          <div className="min-w-0">
            <p className="text-base font-semibold tracking-tight">{titulo}</p>
            {resumen && <p className="mt-0.5 text-xs text-muted-foreground">{resumen}</p>}
          </div>
          <ChevronDown
            className={`ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
              abierto ? "rotate-180" : ""
            }`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent hiddenUntilFound>
          <CardContent className="space-y-6 pt-0">{children}</CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
