"use client";

import { TriangleAlert } from "lucide-react";
import type { Punto } from "@/lib/dxf/leer";
import type { Aviso } from "@/lib/cad-revit/cabezales";

/**
 * Lo que no cierra entre el dibujo y los rótulos. Es lo que hay que revisar
 * antes de llevar la planta a Revit; tocar un aviso lo muestra en el plano.
 */
export function ListaAvisos({ avisos, onVer }: { avisos: Aviso[]; onVer: (p: Punto) => void }) {
  if (avisos.length === 0) {
    return (
      <p className="rounded-md border p-4 text-sm text-muted-foreground">
        Sin diferencias: cada cabezal y cada viga coinciden con lo dibujado.
      </p>
    );
  }
  return (
    <div className="rounded-md border">
      <p className="flex items-center gap-2 border-b px-4 py-2 text-sm font-medium">
        <TriangleAlert className="h-4 w-4 text-destructive" />
        {avisos.length === 1 ? "1 diferencia para revisar" : `${avisos.length} diferencias para revisar`}
      </p>
      <ul className="divide-y">
        {avisos.map((a, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => onVer(a.posicion)}
              className="w-full px-4 py-2 text-left text-sm transition-colors hover:bg-secondary"
            >
              {a.texto}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
