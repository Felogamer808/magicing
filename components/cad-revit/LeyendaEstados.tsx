"use client";

import { MarcaEstado } from "@/components/proyectos/MarcaEstado";
import type { EstadosPlanta } from "@/lib/cad-revit/proyecto";
import { ROTULO_ESTADO, type EstadoElemento } from "@/lib/proyectos/estado";

const ORDEN: EstadoElemento[] = ["verifica", "no-verifica", "sin-verificar", "no-evaluable"];

/** Cuántas piezas de la planta hay en cada estado, con el color de la planta. */
export function LeyendaEstados({ estados, proyecto }: { estados: EstadosPlanta; proyecto: string }) {
  const todos = [...estados.cabezales, ...estados.vigas, ...estados.pilotes];
  const cuenta = (e: EstadoElemento | null) => todos.filter((x) => x === e).length;
  const fuera = cuenta(null);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground" role="status">
      <span className="font-medium text-foreground">{proyecto}:</span>
      {ORDEN.filter((e) => cuenta(e) > 0).map((e) => (
        <span key={e} className="flex items-center gap-1.5">
          <MarcaEstado estado={e} />
          {ROTULO_ESTADO[e]} {cuenta(e)}
        </span>
      ))}
      {fuera > 0 && <span>· {fuera} fuera del proyecto (llevá la planta de nuevo)</span>}
    </div>
  );
}
