import { fmt } from "@/lib/verificaciones/formato";
import { cn } from "@/lib/utils";
import {
  EstadoVerificacionChip,
  type EstadoVerificacion,
} from "@/components/verificaciones/comun/EstadoVerificacion";

export interface ComprobacionResumen {
  etiqueta: string;
  estado: EstadoVerificacion;
  /** Demanda sobre capacidad. Sólo en las comprobaciones resistentes. */
  utilizacion?: number;
}

/**
 * Conclusión general arriba de todo: si una sola comprobación obligatoria no
 * cumple, el elemento no cumple, aunque el resto esté bien. Debajo, la que
 * gobierna: la que más cerca está de fallar, o la que falla por más.
 */
export function ConclusionResultados({ comprobaciones }: { comprobaciones: readonly ComprobacionResumen[] }) {
  const fallan = comprobaciones.filter((c) => c.estado === "no-cumple");
  const evaluadas = comprobaciones.filter((c) => c.estado === "cumple" || c.estado === "no-cumple");
  const estado: EstadoVerificacion =
    fallan.length > 0 ? "no-cumple" : evaluadas.length === 0 ? "no-evaluado" : "cumple";

  const conUtilizacion = comprobaciones.filter(
    (c) => c.utilizacion !== undefined && Number.isFinite(c.utilizacion)
  );
  const gobernante = conUtilizacion.reduce<ComprobacionResumen | undefined>(
    (max, c) => (max === undefined || c.utilizacion! > max.utilizacion! ? c : max),
    undefined
  );

  return (
    <div
      className={cn(
        "rounded-md p-4",
        estado === "no-cumple" ? "bg-destructive/[0.07]" : "bg-muted/50"
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-base font-semibold">
          {estado === "no-cumple"
            ? `No cumple: ${fallan.length} de ${evaluadas.length} comprobaciones fallan`
            : estado === "cumple"
              ? `Cumple las ${evaluadas.length} comprobaciones`
              : "Sin comprobaciones evaluadas"}
        </p>
        <EstadoVerificacionChip estado={estado} />
      </div>
      {gobernante && (
        <p className="mt-1 text-sm text-muted-foreground">
          Gobierna <span className="font-medium text-foreground">{gobernante.etiqueta}</span>, con una
          utilización del{" "}
          <span className="font-mono font-semibold tabular-nums text-foreground">
            {fmt(gobernante.utilizacion! * 100, 0)} %
          </span>
          .
        </p>
      )}
      {fallan.length > 0 && (
        <p className="mt-1 text-sm text-muted-foreground">
          Fallan: {fallan.map((c) => c.etiqueta).join(" · ")}.
        </p>
      )}
    </div>
  );
}
