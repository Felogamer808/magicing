import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ResultadoCheckProps {
  etiqueta: string;
  verifica: boolean;
  detalle?: string;
}

export function ResultadoCheck({ etiqueta, verifica, detalle }: ResultadoCheckProps) {
  return (
    <div
      /*
       * El estado cambia mientras se tipea en el formulario. La transición de
       * color evita el parpadeo seco al pasar de verifica a no verifica y deja
       * ver cuál de los chequeos fue el que cambió.
       */
      className={cn(
        "flex items-center justify-between gap-4 rounded-md border p-3 transition-colors duration-300",
        verifica ? "border-emerald-600/30" : "border-destructive/30"
      )}
    >
      <div>
        <p className="text-sm font-medium">{etiqueta}</p>
        {detalle && (
          <p className="font-mono text-xs text-muted-foreground tabular-nums">{detalle}</p>
        )}
      </div>
      <Badge
        variant={verifica ? "default" : "destructive"}
        aria-live="polite"
        className={cn(
          "shrink-0 rounded-sm border font-mono text-[11px] uppercase tracking-[0.08em] transition-colors duration-300",
          verifica
            ? "-rotate-2 border-emerald-700 bg-emerald-600 text-white [a]:hover:bg-emerald-600"
            : "border-destructive/40"
        )}
      >
        {verifica ? "Verifica" : "No verifica"}
      </Badge>
    </div>
  );
}
