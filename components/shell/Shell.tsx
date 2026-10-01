import type { ReactNode } from "react";
import { BarraLateral } from "@/components/shell/BarraLateral";
import { BarraSuperior } from "@/components/shell/BarraSuperior";

/**
 * Marco de la aplicación: barra lateral oscura a la izquierda y barra superior
 * fija arriba del contenido.
 *
 * Se usa en todas las pantallas para que la navegación no cambie de lugar al
 * moverse. En impresión desaparece entero —lo resuelven las propias barras con
 * `print:hidden`—, porque la hoja impresa va adjunta a una memoria y ahí el
 * cromo de navegación sólo gasta tinta.
 */
export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1">
      <BarraLateral />
      <div className="flex min-w-0 flex-1 flex-col">
        <BarraSuperior />
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
