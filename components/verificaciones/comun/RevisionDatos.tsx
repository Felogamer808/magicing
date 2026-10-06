import { nombreNorma } from "@/lib/verificaciones/validacion";
import { CircleX, TriangleAlert } from "lucide-react";

export interface DatoRevision {
  etiqueta: string;
  valor: string;
  /** Sale de otros datos: no se carga, se calcula. */
  derivado?: boolean;
}

export interface AvisoRevision {
  /**
   * "error" impide calcular; "aviso" deja seguir pero conviene mirarlo. Se
   * separan porque mezclados no se sabe si el resultado de abajo vale o no.
   */
  tipo: "error" | "aviso";
  texto: string;
}

interface RevisionDatosProps {
  norma: string;
  datos: readonly DatoRevision[];
  /** Hipótesis que el cálculo adopta sin preguntar. Sólo las que el motor usa de verdad. */
  hipotesis: readonly string[];
  avisos: readonly AvisoRevision[];
}

/**
 * Resumen previo a los resultados: con qué datos, con qué norma y bajo qué
 * hipótesis se calculó. El cálculo es en vivo, así que no hay botón: la
 * revisión está para que lo que se lee abajo tenga contexto.
 */
export function RevisionDatos({ norma, datos, hipotesis, avisos }: RevisionDatosProps) {
  const errores = avisos.filter((a) => a.tipo === "error");
  const advertencias = avisos.filter((a) => a.tipo === "aviso");

  return (
    <div className="space-y-4 rounded-md bg-muted/50 p-4">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-[11px] text-muted-foreground">Norma</dt>
          <dd className="font-mono">{nombreNorma(norma)}</dd>
        </div>
        {datos.map((d) => (
          <div key={d.etiqueta}>
            <dt className="text-[11px] text-muted-foreground">
              {d.etiqueta}
              {d.derivado && <span className="ml-1 italic">· derivado</span>}
            </dt>
            <dd className="font-mono tabular-nums">{d.valor}</dd>
          </div>
        ))}
      </dl>

      {hipotesis.length > 0 && (
        <div>
          <p className="mb-1 text-[11px] text-muted-foreground">Hipótesis y valores adoptados</p>
          <ul className="list-disc space-y-0.5 pl-5 text-[13px]">
            {hipotesis.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </div>
      )}

      {errores.length > 0 && (
        <ul className="space-y-1 text-[13px] text-destructive">
          {errores.map((a) => (
            <li key={a.texto} className="flex gap-2">
              <CircleX className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                <span className="sr-only">Error: </span>
                {a.texto}
              </span>
            </li>
          ))}
        </ul>
      )}
      {advertencias.length > 0 && (
        <ul className="space-y-1 text-[13px] text-[var(--mat-fuego)]">
          {advertencias.map((a) => (
            <li key={a.texto} className="flex gap-2">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                <span className="sr-only">Advertencia: </span>
                {a.texto}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
