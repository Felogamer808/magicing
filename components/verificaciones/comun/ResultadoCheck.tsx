import { Badge } from "@/components/ui/badge";
import { BarraDemandaCapacidad } from "@/components/verificaciones/comun/BarraDemandaCapacidad";
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

/**
 * La barra sólo se dibuja si los dos números que se muestran explican por sí
 * solos el veredicto.
 *
 * Hay comprobaciones cuyo "verifica" sale de más de una condición y cuya
 * comparación visible es apenas una de ellas: ahí la barra diría que cumple
 * con margen al lado de una insignia que dice que no cumple. Entre mostrar una
 * barra que contradice al veredicto y no mostrarla, no mostrarla.
 */
function laBarraExplicaElVeredicto(verifica: boolean, c: ComparacionCheck): boolean {
  const cumpleSegunNumeros =
    c.exige === "≤" ? c.real.valor <= c.limite.valor : c.real.valor >= c.limite.valor;
  return cumpleSegunNumeros === verifica;
}

export function ResultadoCheck({ etiqueta, verifica, detalle, comparacion }: ResultadoCheckProps) {
  const insignia = (
    <Badge
      variant={verifica ? "default" : "destructive"}
      aria-live="polite"
      className={cn(
        "shrink-0 rounded-sm border font-mono text-[12.5px] uppercase tracking-[0.08em] transition-colors duration-300",
        verifica
          ? "-rotate-2 border-exito bg-exito text-white [a]:hover:bg-exito"
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
        verifica ? "border-exito/40" : "border-destructive/40",
        comparacion && (verifica ? "bg-exito/[0.06]" : "bg-destructive/[0.06]")
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
              verifica ? "text-exito" : "text-destructive"
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

          {/*
            La desigualdad dice si pasa; la barra dice por cuánto. El margen es
            lo que decide si la pieza se puede afinar o está al límite, y era
            justamente lo que había que leer entre líneas.

            Con "≥" la razón se da vuelta: lo exigido es el límite y lo que
            sobra es lo real, así que la utilización es límite/real. En los dos
            sentidos, por debajo de 1 significa que cumple.
          */}
          {laBarraExplicaElVeredicto(verifica, comparacion) && (
          <div className="mt-3">
            <BarraDemandaCapacidad
              demanda={comparacion.exige === "≤" ? comparacion.real.valor : comparacion.limite.valor}
              capacidad={comparacion.exige === "≤" ? comparacion.limite.valor : comparacion.real.valor}
              decimales={comparacion.decimales}
              mostrarValores={false}
            />
          </div>
          )}

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
