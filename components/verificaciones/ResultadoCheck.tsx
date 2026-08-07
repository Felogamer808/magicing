import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { fmt } from "@/lib/verificaciones/formato";

/** Una de las dos magnitudes que se enfrentan en la comprobación. */
interface MagnitudComparada {
  /** Símbolo o nombre corto: "σ", "FS", "As real". */
  etiqueta: string;
  valor: number;
}

interface ComparacionCheck {
  /** Lo que da el cálculo. */
  real: MagnitudComparada;
  /** Contra qué se lo compara: el admisible, el mínimo, el necesario. */
  limite: MagnitudComparada;
  /** Unidad común a las dos, que por eso se escribe una sola vez. */
  unidad?: string;
  /** Relación que hay que cumplir entre `real` y `limite` para que verifique. */
  exige: "≤" | "≥";
  decimales?: number;
}

interface ResultadoCheckProps {
  etiqueta: string;
  verifica: boolean;
  detalle?: string;
  /**
   * Comparación principal de la verificación, escrita como desigualdad.
   *
   * Es opcional: sin ella el bloque se dibuja como siempre, con el detalle en
   * una línea chica. Se pasa cuando la comprobación se reduce a enfrentar dos
   * números —la tensión contra la admisible, el FS contra el mínimo— porque es
   * lo primero que se busca al mirar el resultado.
   */
  comparacion?: ComparacionCheck;
}

/**
 * Signo que corresponde a lo que efectivamente pasó, no al que se exige.
 *
 * Se muestra el real y no el exigido para que la línea sea una afirmación
 * verdadera en los dos casos: cuando no verifica, leer "σ 111,13 > σ adm 80,00"
 * dice por qué falla. Con el signo exigido, la línea diría algo falso.
 */
function signoReal(real: number, limite: number): string {
  if (real > limite) return ">";
  if (real < limite) return "<";
  return "=";
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
        verifica ? "border-emerald-600/40" : "border-destructive/40",
        comparacion && (verifica ? "bg-emerald-600/[0.06]" : "bg-destructive/[0.06]")
      )}
    >
      {comparacion ? (
        <>
          <div className="flex items-start justify-between gap-4">
            <p className="text-sm font-medium">{etiqueta}</p>
            {insignia}
          </div>

          {/*
            La desigualdad completa en una línea: los símbolos en gris para que
            los que resalten sean los números, que es lo que se compara.
          */}
          <p
            className={cn(
              "mt-2 flex flex-wrap items-baseline gap-x-2 font-mono text-lg font-semibold tabular-nums transition-colors duration-300",
              verifica ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"
            )}
          >
            <span className="text-[11px] font-normal tracking-[0.08em] opacity-70">
              {comparacion.real.etiqueta}
            </span>
            <span>{fmt(comparacion.real.valor, comparacion.decimales)}</span>
            <span className="px-0.5 text-base font-normal opacity-70">
              {signoReal(comparacion.real.valor, comparacion.limite.valor)}
            </span>
            <span className="text-[11px] font-normal tracking-[0.08em] opacity-70">
              {comparacion.limite.etiqueta}
            </span>
            <span>{fmt(comparacion.limite.valor, comparacion.decimales)}</span>
            {comparacion.unidad && (
              <span className="text-[11px] font-normal opacity-70">{comparacion.unidad}</span>
            )}
          </p>

          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            se exige {comparacion.real.etiqueta} {comparacion.exige} {comparacion.limite.etiqueta}
          </p>

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
