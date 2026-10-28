"use client";

import { useRouter } from "next/navigation";
import { Pencil, X } from "lucide-react";
import { CalcularElemento } from "@/components/proyectos/CalcularElemento";
import { guardarCamposDeRuta } from "@/lib/hooks/useCampo";
import { describirSeccion, ROTULO_CLASE } from "@/lib/ifc/formato";
import { fijarElementoAbierto, useElementoDestino, useProyectoActivo } from "@/lib/proyectos/activo";
import { estadoDeCalculo, estadoDeElemento, ROTULO_ESTADO } from "@/lib/proyectos/estado";
import type { ElementoProyecto } from "@/lib/proyectos/tipos";
import { registroVerificaciones } from "@/lib/verificaciones/registry";
import { MarcaEstado } from "@/components/proyectos/MarcaEstado";

/** Lo que se ve al tocar un elemento en el modelo: qué es, dónde está y sus verificaciones. */
export function PanelElementoModelo({
  idProyecto,
  elemento,
  onCerrar,
}: {
  idProyecto: string;
  elemento: ElementoProyecto;
  onCerrar: () => void;
}) {
  const router = useRouter();
  const [, activar] = useProyectoActivo();
  const [, elegirDestino] = useElementoDestino();
  const estado = estadoDeElemento(elemento);

  return (
    <div className="space-y-4 rounded-md border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-semibold leading-tight">{elemento.nombre}</p>
          <p className="text-sm text-muted-foreground">{elemento.ubicacion ?? "Sin nivel"}</p>
          {elemento.ifc && (
            <p className="text-xs text-muted-foreground">
              {ROTULO_CLASE[elemento.ifc.clase]} del IFC
              {elemento.ifc.seccion && ` · ${describirSeccion(elemento.ifc.seccion)}`}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar"
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <p className="flex items-center gap-2 text-sm">
        <MarcaEstado estado={estado} />
        {ROTULO_ESTADO[estado]}
      </p>

      {elemento.calculos.length === 0 ? (
        <p className="text-xs text-muted-foreground">{elemento.cad?.sinVerificacion ?? "Sin cálculos todavía."}</p>
      ) : (
        <ul className="space-y-1.5">
          {elemento.calculos.map((calculo) => {
            const meta = registroVerificaciones.find((v) => v.id === calculo.verificacion);
            const e = estadoDeCalculo(calculo);
            return (
              <li key={calculo.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <MarcaEstado estado={e} />
                  <span className="truncate">{meta?.nombre ?? `${calculo.verificacion} (ya no existe)`}</span>
                </span>
                {meta && (
                  <button
                    type="button"
                    onClick={() => {
                      // Igual que desde la vista del proyecto: se vuelven a
                      // escribir los campos y el motor de hoy recalcula.
                      guardarCamposDeRuta(meta.ruta, calculo.campos);
                      fijarElementoAbierto(meta.ruta, elemento.id);
                      activar(idProyecto);
                      elegirDestino(elemento.id);
                      router.push(meta.ruta);
                    }}
                    className="flex shrink-0 items-center gap-1 rounded-md border border-input px-2 py-0.5 text-xs transition-colors hover:border-primary/40 hover:bg-secondary"
                  >
                    <Pencil className="h-3 w-3" />
                    Abrir
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <CalcularElemento idProyecto={idProyecto} elemento={elemento} />
    </div>
  );
}
