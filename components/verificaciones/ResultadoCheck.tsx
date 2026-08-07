import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Una de las dos magnitudes que se enfrentan en la comprobación. */
interface MagnitudComparada {
  /** Símbolo o nombre corto: "σ", "FS", "As real". */
  etiqueta: string;
  /** Valor ya formateado, sin unidad. */
  valor: string;
}

interface ComparacionCheck {
  /** Lo que da el cálculo. */
  real: MagnitudComparada;
  /** Contra qué se lo compara: el admisible, el mínimo, el necesario. */
  limite: MagnitudComparada;
  /** Unidad común a las dos, que por eso se escribe una sola vez. */
  unidad?: string;
}

interface ResultadoCheckProps {
  etiqueta: string;
  verifica: boolean;
  detalle?: string;
  /**
   * Comparación principal de la verificación, en grande.
   *
   * Es opcional: sin ella el bloque se dibuja como siempre, con el detalle en
   * una línea chica. Se pasa cuando la comprobación se reduce a enfrentar dos
   * números —la tensión contra la admisible, el FS contra el mínimo— porque es
   * lo primero que se busca al mirar el resultado y en una línea de texto
   * corrido cuesta encontrarlo.
   */
  comparacion?: ComparacionCheck;
}

export function ResultadoCheck({ etiqueta, verifica, detalle, comparacion }: ResultadoCheckProps) {
  const insignia = (
    <Badge
      variant={verifica ? "default" : "destructive"}
      aria-live="polite"
      className={cn(
        "shrink-0 rounded-sm border font-mono text-[12.5px] uppercase tracking-[0.08em] transition-colors duration-300",
        verifica
          ? "-rotate-2 border-emerald-700 bg-emerald-600 text-white [a]:hover:bg-emerald-600"
          : "border-destructive/40"
      )}
    >
      {verifica ? "Verifica" : "No verifica"}
    </Badge>
  );

  return (
    <div
      /*
       * El estado cambia mientras se tipea en el formulario. La transición de
       * color evita el parpadeo seco al pasar de verifica a no verifica y deja
       * ver cuál de los chequeos fue el que cambió.
       */
      className={cn(
        "rounded-md border p-3 transition-colors duration-300",
        verifica ? "border-emerald-600/30" : "border-destructive/30",
        comparacion && (verifica ? "bg-emerald-600/[0.04]" : "bg-destructive/[0.04]")
      )}
    >
      {comparacion ? (
        <>
          <div className="flex items-start justify-between gap-4">
            <p className="text-sm font-medium">{etiqueta}</p>
            {insignia}
          </div>

          {/*
            Las dos magnitudes van una sobre otra y no separadas por una barra:
            alineadas en columna, la diferencia entre ellas se ve sin leer.
          */}
          <dl className="mt-2.5 grid w-fit grid-cols-[auto_auto_auto] items-baseline gap-x-2.5 gap-y-1">
            {/*
              Sin `uppercase`: la mayúscula de σ es Σ, que en cálculo es otra
              cosa. Los símbolos se escriben como corresponde y se dejan tal cual.
            */}
            <dt className="font-mono text-[11px] tracking-[0.08em] text-muted-foreground">
              {comparacion.real.etiqueta}
            </dt>
            <dd
              className={cn(
                "justify-self-end font-mono text-xl font-semibold tabular-nums transition-colors duration-300",
                verifica ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"
              )}
            >
              {comparacion.real.valor}
            </dd>
            <dd className="font-mono text-[11px] text-muted-foreground">{comparacion.unidad}</dd>

            {/*
              Sin `uppercase`: la mayúscula de σ es Σ, que en cálculo es otra
              cosa. Los símbolos se escriben como corresponde y se dejan tal cual.
            */}
            <dt className="font-mono text-[11px] tracking-[0.08em] text-muted-foreground">
              {comparacion.limite.etiqueta}
            </dt>
            <dd className="justify-self-end font-mono text-base tabular-nums text-muted-foreground">
              {comparacion.limite.valor}
            </dd>
            <dd className="font-mono text-[11px] text-muted-foreground">{comparacion.unidad}</dd>
          </dl>

          {detalle && (
            <p className="mt-2 font-mono text-xs text-muted-foreground tabular-nums">{detalle}</p>
          )}
        </>
      ) : (
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">{etiqueta}</p>
            {detalle && (
              <p className="font-mono text-xs text-muted-foreground tabular-nums">{detalle}</p>
            )}
          </div>
          {insignia}
        </div>
      )}
    </div>
  );
}
