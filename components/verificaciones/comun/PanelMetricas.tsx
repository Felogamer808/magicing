/**
 * Métricas al costado del dibujo, no encima.
 *
 * Los números que describen una sección —área remanente, canto eficaz, pérdida
 * de sección— tientan a escribirse sobre el croquis, y ahí compiten con las
 * cotas y con el propio dibujo hasta que no se lee ninguno de los dos. Puestos
 * al lado, el dibujo queda limpio y los números se comparan entre sí.
 */

export interface Metrica {
  etiqueta: string;
  valor: string;
  /** Aclaración corta: de dónde sale o contra qué se compara. */
  nota?: string;
  /** Resalta la que gobierna el resultado. */
  destacada?: boolean;
}

export function PanelMetricas({ metricas }: { metricas: Metrica[] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-1">
      {metricas.map((m) => (
        <div
          key={m.etiqueta}
          className={`rounded-lg border p-2.5 ${
            m.destacada ? "border-primary/40 bg-accent/60" : "border-border/70"
          }`}
        >
          <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {m.etiqueta}
          </dt>
          <dd className="mt-0.5 font-mono text-lg font-medium tabular-nums">{m.valor}</dd>
          {m.nota && <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{m.nota}</p>}
        </div>
      ))}
    </dl>
  );
}
