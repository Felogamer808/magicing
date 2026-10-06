import { fmt } from "@/lib/verificaciones/formato";
import type { Recomendacion } from "@/lib/verificaciones/recomendaciones/motor";

interface RecomendacionesCheckProps {
  recomendaciones: readonly Recomendacion[];
  /** Si la comprobación no cumple; si cumple, es que está justa. */
  noCumple: boolean;
}

/**
 * "Cómo resolverlo" debajo de una comprobación que no cumple o queda justa.
 *
 * Cada línea es un cambio que ya se recalculó: el valor nuevo, la utilización
 * con que queda y, si con ese cambio otra comprobación deja de cumplir, cuál.
 * Plegado cuando está justa, porque cumple y no hay que hacer nada; abierto
 * cuando no cumple, porque es lo siguiente que se va a buscar.
 */
export function RecomendacionesCheck({ recomendaciones, noCumple }: RecomendacionesCheckProps) {
  if (recomendaciones.length === 0) return null;
  return (
    <details open={noCumple} className="group mt-2 rounded-md border border-border/60 px-3 py-2 text-sm">
      <summary className="cursor-pointer select-none text-xs font-medium text-muted-foreground marker:text-muted-foreground">
        {noCumple ? "Cómo resolverlo" : "Cómo ganar margen"}
        <span className="ml-1.5 font-normal">· recalculado con cada cambio</span>
      </summary>
      <ol className="mt-2 space-y-2">
        {recomendaciones.map((r) => (
          <li key={r.accion} className="flex flex-col gap-0.5">
            <p className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="font-medium">{r.accion}</span>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {r.utilizacion === undefined ? (
                  <span className="font-semibold text-foreground">cumple</span>
                ) : (
                  <>
                    queda en{" "}
                    <span className="font-semibold text-foreground">{fmt(r.utilizacion * 100, 0)} %</span>
                  </>
                )}
              </span>
            </p>
            {r.fallanOtras.length > 0 && (
              <p className="text-xs text-destructive">Deja de cumplir: {r.fallanOtras.join(" · ")}.</p>
            )}
            {(r.efectoColateral || r.cita) && (
              <p className="text-xs text-muted-foreground">
                {r.efectoColateral}
                {r.efectoColateral && r.cita ? " " : ""}
                {r.cita && <span className="font-mono">{r.cita}.</span>}
              </p>
            )}
          </li>
        ))}
      </ol>
    </details>
  );
}
