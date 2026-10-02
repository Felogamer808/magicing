"use client";

import { BarraDemandaCapacidad } from "@/components/verificaciones/comun/BarraDemandaCapacidad";
import {
  EstadoVerificacionChip,
  type EstadoVerificacion,
} from "@/components/verificaciones/comun/EstadoVerificacion";
import { fmt } from "@/lib/verificaciones/formato";
import { useId } from "react";
import { useAnotarComprobacion } from "@/components/verificaciones/comun/RegistroComprobaciones";

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
  /**
   * Estado explícito, para lo que no es ni cumple ni no cumple: no aplica, no
   * evaluado, datos insuficientes. Sin él, sale de `verifica`.
   */
  estado?: EstadoVerificacion;
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

export function ResultadoCheck({ etiqueta, verifica, estado, detalle, comparacion }: ResultadoCheckProps) {
  const estadoFinal: EstadoVerificacion = estado ?? (verifica ? "cumple" : "no-cumple");
  const evaluada = estadoFinal === "cumple" || estadoFinal === "no-cumple";
  // Sin números finitos no hay desigualdad que mostrar: "NaN < 8,74" no
  // explica nada. Queda el estado y el detalle, que dice por qué.
  const comparable =
    comparacion !== undefined &&
    Number.isFinite(comparacion.real.valor) &&
    Number.isFinite(comparacion.limite.valor);

  // Se anota en el registro de la página (si hay uno) para la conclusión
  // general. La utilización es la misma que dibuja la barra: demanda sobre
  // capacidad, dada vuelta cuando se exige "≥".
  const utilizacion =
    comparable && comparacion
      ? comparacion.exige === "≤"
        ? comparacion.real.valor / comparacion.limite.valor
        : comparacion.limite.valor / comparacion.real.valor
      : undefined;
  useAnotarComprobacion(useId(), {
    etiqueta: etiqueta.charAt(0).toLowerCase() + etiqueta.slice(1),
    estado: estadoFinal,
    utilizacion: utilizacion !== undefined && Number.isFinite(utilizacion) ? utilizacion : undefined,
  });

  /*
   * Fila, no tarjeta: las comprobaciones se leen una debajo de otra con la
   * misma estructura —qué se verifica, la desigualdad, cuánto se usa, estado—
   * y el separador alcanza para distinguirlas. El color queda para el estado y
   * la barra, que es donde significa algo; un fondo verde en cada bloque sólo
   * hacía ruido.
   */
  return (
    <div className="border-b border-border/60 py-3 first:pt-0 last:border-0 last:pb-0">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm font-medium">{etiqueta}</p>
        <EstadoVerificacionChip estado={estadoFinal} />
      </div>

      {comparacion && comparable && evaluada && (
        <>
          {/*
            La desigualdad completa en una línea: los símbolos en gris para que
            resalten los números, que es lo que se compara. En el color del
            texto, no: el estado ya lo dice al lado.
          */}
          <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2 font-mono text-base font-semibold tabular-nums">
            <span className="text-[11px] font-normal tracking-[0.08em] text-muted-foreground">
              {comparacion.real.etiqueta}
            </span>
            <span>{fmt(comparacion.real.valor, comparacion.decimales)}</span>
            <span className="px-0.5 text-sm font-normal text-muted-foreground">
              {signoReal(comparacion.real.valor, comparacion.limite.valor)}
            </span>
            <span className="text-[11px] font-normal tracking-[0.08em] text-muted-foreground">
              {comparacion.limite.etiqueta}
            </span>
            <span>{fmt(comparacion.limite.valor, comparacion.decimales)}</span>
            {comparacion.unidad && (
              <span className="text-[11px] font-normal text-muted-foreground">{comparacion.unidad}</span>
            )}
            <span className="ml-auto text-[11px] font-normal text-muted-foreground">
              se exige {comparacion.real.etiqueta} {comparacion.exige} {comparacion.limite.etiqueta}
            </span>
          </p>

          {/*
            Con "≥" la razón se da vuelta: lo exigido es el límite y lo que
            sobra es lo real, así que la utilización es límite/real. En los dos
            sentidos, por debajo de 1 significa que cumple.
          */}
          {laBarraExplicaElVeredicto(verifica, comparacion) && (
            <div className="mt-2">
              <BarraDemandaCapacidad
                demanda={comparacion.exige === "≤" ? comparacion.real.valor : comparacion.limite.valor}
                capacidad={comparacion.exige === "≤" ? comparacion.limite.valor : comparacion.real.valor}
                decimales={comparacion.decimales}
                mostrarValores={false}
              />
            </div>
          )}
        </>
      )}

      {detalle && (
        <p className="mt-1 font-mono text-xs text-muted-foreground tabular-nums">{detalle}</p>
      )}
    </div>
  );
}
