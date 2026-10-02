import { CircleCheck, CircleDashed, CircleMinus, CircleX, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Los cinco estados posibles de una comprobación.
 *
 * "Cumple" y "no cumple" no alcanzan: una verificación que no corresponde a
 * este caso, una que todavía no se pudo correr o una a la que le faltan datos
 * no son ni una cosa ni la otra, y mostrarlas como "no cumple" asusta en falso
 * mientras que mostrarlas como "cumple" tranquiliza en falso.
 */
export type EstadoVerificacion =
  | "cumple"
  | "no-cumple"
  | "no-aplica"
  | "no-evaluado"
  | "datos-insuficientes";

const ESTILO: Record<
  EstadoVerificacion,
  { texto: string; clase: string; Icono: typeof CircleCheck }
> = {
  cumple: { texto: "Cumple", clase: "text-exito", Icono: CircleCheck },
  "no-cumple": { texto: "No cumple", clase: "text-destructive", Icono: CircleX },
  "no-aplica": { texto: "No aplica", clase: "text-muted-foreground", Icono: CircleMinus },
  "no-evaluado": { texto: "No evaluado", clase: "text-muted-foreground", Icono: CircleDashed },
  "datos-insuficientes": {
    texto: "Datos insuficientes",
    clase: "text-[var(--mat-fuego)]",
    Icono: TriangleAlert,
  },
};

/**
 * Estado de una comprobación: icono más palabra, sin sello ni fondo lleno.
 *
 * El color refuerza pero no carga el significado solo: el icono y el texto lo
 * dicen igual en blanco y negro.
 */
export function EstadoVerificacionChip({ estado }: { estado: EstadoVerificacion }) {
  const { texto, clase, Icono } = ESTILO[estado];
  return (
    <span
      aria-live="polite"
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 text-[13px] font-medium transition-colors duration-300",
        clase
      )}
    >
      <Icono className="h-4 w-4" aria-hidden="true" />
      {texto}
    </span>
  );
}
