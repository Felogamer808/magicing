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
      className={cn(
        "flex items-center justify-between gap-4 rounded-md border p-3",
        verifica ? "border-emerald-600/30" : "border-destructive/30"
      )}
    >
      <div>
        <p className="text-sm font-medium">{etiqueta}</p>
        {detalle && <p className="font-mono text-xs text-muted-foreground">{detalle}</p>}
      </div>
      <Badge
        variant={verifica ? "default" : "destructive"}
        className={cn(
          "shrink-0 rounded-sm border font-mono text-[11px] uppercase tracking-[0.08em]",
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
