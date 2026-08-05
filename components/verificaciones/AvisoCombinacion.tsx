import { AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { combinacionDe } from "@/lib/verificaciones/combinaciones";

interface AvisoCombinacionProps {
  /** Id de la verificación en el registro. */
  idVerificacion: string;
}

/**
 * Declara con qué combinación de acciones trabaja la verificación. Va arriba de
 * todo porque condiciona cada número que se carga abajo: el mismo formulario
 * con valores del régimen equivocado devuelve un resultado plausible y mal.
 */
export function AvisoCombinacion({ idVerificacion }: AvisoCombinacionProps) {
  const combinacion = combinacionDe(idVerificacion);
  if (!combinacion) return null;

  // El régimen mixto es el que más se presta a error: se cargan características
  // pero una parte del cálculo mayora sola.
  const destacado = combinacion.regimen === "mixta";
  const Icono = destacado ? AlertTriangle : Info;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-md border px-4 py-3",
        destacado ? "border-primary/40 bg-primary/5" : "border-border bg-card/60"
      )}
    >
      <Icono className={cn("mt-0.5 h-4 w-4 shrink-0", destacado ? "text-primary" : "text-muted-foreground")} />
      <div className="space-y-0.5">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.08em]">
          {combinacion.etiqueta}
        </p>
        <p className="text-sm text-muted-foreground">{combinacion.detalle}</p>
      </div>
    </div>
  );
}
