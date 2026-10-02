"use client";

import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { CampoDiametro } from "@/components/verificaciones/comun/CampoDiametro";
import { aNumero, fmt } from "@/lib/verificaciones/formato";

interface CampoCapa {
  id: string;
  valor: string;
  onChange: (valor: string) => void;
}

export interface FilaCapa {
  /** Cómo se nombra la capa: "Inferior · capa 1". */
  posicion: string;
  numero: CampoCapa;
  diametro: CampoCapa;
  /** Si se puede quitar. La primera capa de cada cara no se quita. */
  onQuitar?: () => void;
}

interface EditorCapasProps {
  filas: readonly FilaCapa[];
  onAgregar?: () => void;
  textoAgregar?: string;
}

/** Área de n barras de diámetro Ø (mm), en cm². Es geometría, no cálculo normativo. */
function areaCm2(numero: number, diametroMm: number): number {
  return (numero * Math.PI * (diametroMm / 10) ** 2) / 4;
}

/**
 * Editor de capas de armadura: una fila por capa, alineada con las demás, con
 * el área derivada al final para que se vea cuánto acero suma cada una sin ir a
 * los resultados. Reemplaza los pares sueltos de "Nº barras" y "Ø" repetidos en
 * cada tarjeta.
 */
export function EditorCapas({ filas, onAgregar, textoAgregar = "Agregar capa" }: EditorCapasProps) {
  const total = filas.reduce((s, f) => {
    const a = areaCm2(aNumero(f.numero.valor), aNumero(f.diametro.valor));
    return Number.isFinite(a) ? s + a : s;
  }, 0);

  return (
    <div>
      <div
        role="table"
        aria-label="Capas de armadura"
        className="grid grid-cols-[5.5rem_4.5rem_minmax(5.5rem,7rem)_minmax(0,1fr)_2rem] items-center gap-x-2 gap-y-2 sm:gap-x-3 text-sm"
      >
        <div role="row" className="contents text-[11px] text-muted-foreground">
          <span role="columnheader">Capa</span>
          <span role="columnheader">Nº barras</span>
          <span role="columnheader">Ø</span>
          <span role="columnheader" className="text-right">As (cm²)</span>
          {/* sr-only va adentro: en la celda misma la sacaría de la grilla y correría las demás. */}
          <span role="columnheader">
            <span className="sr-only">Quitar</span>
          </span>
        </div>
        {filas.map((f) => {
          const a = areaCm2(aNumero(f.numero.valor), aNumero(f.diametro.valor));
          return (
            <div role="row" key={f.numero.id} className="contents">
              <span role="cell" className="text-[13px] leading-tight">{f.posicion}</span>
              <div role="cell">
                <CampoNumerico
                  id={f.numero.id}
                  etiqueta={`Nº barras, ${f.posicion}`}
                  valor={f.numero.valor}
                  onChange={f.numero.onChange}
                  ocultarEtiqueta
                />
              </div>
              <div role="cell">
                <CampoDiametro
                  id={f.diametro.id}
                  etiqueta={`Ø, ${f.posicion}`}
                  valor={f.diametro.valor}
                  onChange={f.diametro.onChange}
                  ocultarEtiqueta
                />
              </div>
              <span role="cell" className="text-right font-mono tabular-nums text-muted-foreground">
                {Number.isFinite(a) ? fmt(a, 2) : "—"}
              </span>
              <div role="cell">
                {f.onQuitar && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Quitar ${f.posicion}`}
                    onClick={f.onQuitar}
                  >
                    <X />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between gap-3">
        {onAgregar ? (
          <Button type="button" variant="ghost" size="sm" onClick={onAgregar} className="-ml-2 text-muted-foreground">
            <Plus /> {textoAgregar}
          </Button>
        ) : (
          <span />
        )}
        <span className="pr-[2.75rem] font-mono text-[12px] tabular-nums text-muted-foreground">
          Σ {fmt(total, 2)} cm²
        </span>
      </div>
    </div>
  );
}
