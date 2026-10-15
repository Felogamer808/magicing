"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ImportarIfc } from "@/components/proyectos/ImportarIfc";
import { MarcaEstado } from "@/components/proyectos/MarcaEstado";
import { PanelElementoModelo } from "@/components/proyectos/PanelElementoModelo";
import { VisorModelo } from "@/components/proyectos/VisorModelo";
import { useIfcEnMemoria } from "@/lib/ifc/memoria";
import { useProyectos } from "@/lib/proyectos/almacen";
import { estadoDeElemento, ROTULO_ESTADO, type EstadoElemento } from "@/lib/proyectos/estado";

const ORDEN_LEYENDA: EstadoElemento[] = ["sin-verificar", "verifica", "no-verifica", "no-evaluable"];

/**
 * El edificio en 3D, pintado según el estado de las verificaciones de cada
 * elemento. Tocar un elemento abre su panel, con sus cálculos y el botón para
 * calcularlo.
 *
 * El IFC no se guarda (pesa demasiado para localStorage): si no está en
 * memoria —se recargó la página, se abrió en otra pestaña— se pide de nuevo.
 * Volver a importarlo no duplica nada: los elementos se reconocen por GlobalId.
 */
export default function ModeloPage() {
  const params = useParams<{ proyecto: string }>();
  const { proyectos, guardar } = useProyectos();
  const proyecto = proyectos.find((p) => p.id === params.proyecto);
  const ifc = useIfcEnMemoria(params.proyecto);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const onSeleccionar = useCallback((g: string | null) => setSeleccionado(g), []);

  const estados = useMemo(() => {
    const m = new Map<string, EstadoElemento>();
    for (const e of proyecto?.elementos ?? []) {
      if (e.ifc) m.set(e.ifc.globalId, estadoDeElemento(e));
    }
    return m;
  }, [proyecto]);

  const cuenta = useMemo(() => {
    const c: Record<EstadoElemento, number> = {
      "sin-verificar": 0,
      verifica: 0,
      "no-verifica": 0,
      "no-evaluable": 0,
    };
    estados.forEach((e) => c[e]++);
    return c;
  }, [estados]);

  if (!proyecto) {
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-12">
        <p className="rounded-md border p-4 text-sm text-muted-foreground">
          No se encontró ese proyecto en este navegador.{" "}
          <Link href="/proyectos" className="underline underline-offset-2">
            Volver a proyectos
          </Link>
        </p>
      </main>
    );
  }

  const elegido = proyecto.elementos.find((e) => e.ifc?.globalId === seleccionado) ?? null;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href={`/proyectos/${proyecto.id}`}
            className="mb-2 flex items-center gap-2 text-sm transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            {proyecto.nombre}
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight">Modelo 3D</h1>
          {ifc && <p className="mt-1 text-sm text-muted-foreground">{ifc.nombreArchivo}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ImportarIfc proyecto={proyecto} guardar={guardar} />
        </div>
      </div>

      {!ifc ? (
        <p className="rounded-md border p-4 text-sm text-muted-foreground">
          El archivo IFC no se guarda en el navegador, porque pesa demasiado: hay que volver a cargarlo
          cada vez que se abre esta página. Usá <strong>Importar IFC</strong> con el mismo archivo. Los
          elementos que ya están en el proyecto se reconocen por su GlobalId y no se duplican.
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <div className="space-y-3">
            <VisorModelo
              bytes={ifc.bytes}
              estados={estados}
              seleccionado={seleccionado}
              onSeleccionar={onSeleccionar}
            />
            <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
              {ORDEN_LEYENDA.map((e) => (
                <li key={e} className="flex items-center gap-1.5">
                  <MarcaEstado estado={e} />
                  {ROTULO_ESTADO[e]} ({cuenta[e]})
                </li>
              ))}
              <li>Arrastrá para girar, rueda para acercar, clic para elegir.</li>
            </ul>
          </div>
          <aside>
            {elegido ? (
              <PanelElementoModelo
                idProyecto={proyecto.id}
                elemento={elegido}
                onCerrar={() => setSeleccionado(null)}
              />
            ) : (
              <p className="rounded-md border p-4 text-sm text-muted-foreground">
                Tocá un elemento del modelo para ver sus verificaciones y calcularlo. Lo que se ve muy
                tenue no está en el proyecto: se borró de la lista de elementos.
              </p>
            )}
          </aside>
        </div>
      )}
    </main>
  );
}
