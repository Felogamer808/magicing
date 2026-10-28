"use client";

import { createContext, useContext, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { fmt } from "@/lib/verificaciones/formato";
import type { Recomendacion } from "@/lib/verificaciones/recomendaciones/motor";

/**
 * Una página que sabe escribir sus campos lo ofrece acá, y cada propuesta
 * suma un botón "Aplicar". Sin proveedor, las propuestas son texto, como
 * siempre: las páginas que no lo dan no cambian.
 */
const ContextoAplicar = createContext<((cambios: Record<string, unknown>) => void) | null>(null);

export function ProveedorAplicarPropuestas({
  aplicar,
  children,
}: {
  aplicar: (cambios: Record<string, unknown>) => void;
  children: ReactNode;
}) {
  return <ContextoAplicar.Provider value={aplicar}>{children}</ContextoAplicar.Provider>;
}

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
  const aplicar = useContext(ContextoAplicar);
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
              <span className="flex items-baseline gap-2 font-mono text-xs tabular-nums text-muted-foreground">
                {r.utilizacion === undefined ? (
                  <span className="font-semibold text-foreground">cumple</span>
                ) : (
                  <>
                    queda en{" "}
                    <span className="font-semibold text-foreground">{fmt(r.utilizacion * 100, 0)} %</span>
                  </>
                )}
                {aplicar && Object.keys(r.cambios).length > 0 && (
                  <Button variant="outline" size="xs" className="font-sans" onClick={() => aplicar(r.cambios)}>
                    Aplicar
                  </Button>
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
