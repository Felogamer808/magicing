"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Printer, RotateCcw } from "lucide-react";
import { SelectorNorma } from "@/components/verificaciones/comun/SelectorNorma";
import { restablecerCampos } from "@/lib/hooks/useCampo";

interface BarraAccionesProps {
  normas: string[];
  norma: string;
  onNormaChange: (valor: string) => void;
}

/**
 * Acciones comunes a toda verificación: elegir norma, imprimir la hoja para
 * adjuntarla a la memoria de cálculo, y volver a los valores por defecto.
 */
export function BarraAcciones({ normas, norma, onNormaChange }: BarraAccionesProps) {
  const ruta = usePathname();
  const [confirmando, setConfirmando] = useState(false);

  const botonBase =
    "flex h-8 items-center gap-1.5 rounded-lg border border-input px-2.5 text-sm transition-colors hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <SelectorNorma normas={normas} valor={norma} onChange={onNormaChange} />

      <button type="button" onClick={() => window.print()} className={botonBase} title="Imprimir o guardar como PDF">
        <Printer className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Imprimir</span>
      </button>

      {confirmando ? (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              restablecerCampos(ruta);
              setConfirmando(false);
            }}
            className={`${botonBase} border-destructive/40 text-destructive`}
          >
            Confirmar borrado
          </button>
          <button type="button" onClick={() => setConfirmando(false)} className={botonBase}>
            Cancelar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmando(true)}
          className={botonBase}
          title="Volver a los valores por defecto de esta verificación"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Restablecer</span>
        </button>
      )}
    </div>
  );
}
