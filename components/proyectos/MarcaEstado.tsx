import type { EstadoElemento } from "@/lib/proyectos/estado";
import { cn } from "@/lib/utils";

/**
 * Cuadradito del color de un estado, el mismo que pinta el modelo 3D: gris
 * sin verificar, verde verifica, rojo no verifica, gris translúcido si no se
 * puede evaluar.
 */
export function MarcaEstado({ estado, className }: { estado: EstadoElemento; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block h-3 w-3 shrink-0 rounded-sm",
        estado === "verifica" && "bg-exito",
        estado === "no-verifica" && "bg-destructive",
        estado === "sin-verificar" && "bg-muted-foreground",
        estado === "no-evaluable" && "border border-muted-foreground bg-muted-foreground/40",
        className
      )}
    />
  );
}
