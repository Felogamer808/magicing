"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calculator } from "lucide-react";
import { guardarCamposDeRuta } from "@/lib/hooks/useCampo";
import { useElementoDestino, useProyectoActivo } from "@/lib/proyectos/activo";
import type { ElementoProyecto } from "@/lib/proyectos/tipos";
import { agruparPorSeccion, registroVerificaciones } from "@/lib/verificaciones/registry";

const DISPONIBLES = agruparPorSeccion(registroVerificaciones.filter((v) => v.disponible));

/**
 * Botón "Calcular" de un elemento del proyecto: se elige la verificación y se
 * llega a ella con el proyecto activo y el elemento ya propuesto en la barra
 * de guardado.
 *
 * Si el elemento ya tiene un cálculo de esa verificación, se abre con sus
 * datos, igual que al reabrirlo desde su botón; si no, la página queda con lo
 * que tenía cargado.
 */
export function CalcularElemento({ idProyecto, elemento }: { idProyecto: string; elemento: ElementoProyecto }) {
  const router = useRouter();
  const [, activar] = useProyectoActivo();
  const [, elegirDestino] = useElementoDestino();
  const [abierto, setAbierto] = useState(false);

  function ir(idVerificacion: string) {
    const meta = registroVerificaciones.find((v) => v.id === idVerificacion);
    if (!meta) return;
    const previo = elemento.calculos.find((c) => c.verificacion === meta.id);
    if (previo) guardarCamposDeRuta(meta.ruta, previo.campos);
    activar(idProyecto);
    elegirDestino(elemento.id);
    router.push(meta.ruta);
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="flex h-8 items-center gap-1.5 rounded-lg border border-input px-2.5 text-xs transition-colors hover:border-primary/40 hover:bg-secondary"
      >
        <Calculator className="h-3.5 w-3.5" />
        Calcular
      </button>
    );
  }

  return (
    <select
      autoFocus
      defaultValue=""
      onChange={(e) => e.target.value && ir(e.target.value)}
      onBlur={() => setAbierto(false)}
      aria-label={`Verificación para ${elemento.nombre}`}
      className="h-8 max-w-[16rem] rounded-lg border border-input bg-transparent px-2 text-xs"
    >
      <option value="" disabled>
        Elegí la verificación…
      </option>
      {DISPONIBLES.map(([seccion, verificaciones]) => (
        <optgroup key={seccion} label={seccion}>
          {verificaciones.map((v) => (
            <option key={v.id} value={v.id}>
              {v.nombre}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
