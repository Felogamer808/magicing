"use client";

import { useEffect, useRef, useState } from "react";
import type { VisorIfc } from "@/lib/ifc/visor";
import type { EstadoElemento } from "@/lib/proyectos/estado";

/**
 * Lienzo 3D del modelo. Monta la escena de `lib/ifc/visor.ts`, que se baja
 * recién acá: three y web-ifc no pesan en el resto del sitio.
 */
export function VisorModelo({
  bytes,
  estados,
  seleccionado,
  onSeleccionar,
}: {
  bytes: Uint8Array;
  estados: Map<string, EstadoElemento>;
  seleccionado: string | null;
  onSeleccionar: (globalId: string | null) => void;
}) {
  const contenedor = useRef<HTMLDivElement>(null);
  const visor = useRef<VisorIfc | null>(null);
  const alSeleccionar = useRef(onSeleccionar);
  const ultimo = useRef({ estados, seleccionado });
  const [estadoCarga, setEstadoCarga] = useState<"cargando" | "listo" | "error">("cargando");

  useEffect(() => {
    alSeleccionar.current = onSeleccionar;
    ultimo.current = { estados, seleccionado };
    visor.current?.actualizar(estados, seleccionado);
  }, [onSeleccionar, estados, seleccionado]);

  useEffect(() => {
    const div = contenedor.current;
    if (!div) return;
    let cancelado = false;
    let instancia: VisorIfc | null = null;

    import("@/lib/ifc/visor")
      .then(async ({ VisorIfc }) => {
        if (cancelado) return;
        instancia = new VisorIfc(div, (g) => alSeleccionar.current(g));
        await instancia.cargar(bytes);
        if (cancelado) return;
        visor.current = instancia;
        instancia.actualizar(ultimo.current.estados, ultimo.current.seleccionado);
        setEstadoCarga("listo");
      })
      .catch((e: unknown) => {
        console.error("No se pudo dibujar el modelo IFC", e);
        if (!cancelado) setEstadoCarga("error");
      });

    return () => {
      cancelado = true;
      visor.current = null;
      instancia?.destruir();
    };
  }, [bytes]);

  return (
    <div className="relative h-[60vh] min-h-[22rem] w-full overflow-hidden rounded-md border lg:h-[70vh]">
      <div ref={contenedor} className="absolute inset-0" />
      {estadoCarga !== "listo" && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/70 text-sm text-muted-foreground">
          {estadoCarga === "cargando" ? "Armando el modelo…" : "No se pudo dibujar el modelo."}
        </div>
      )}
    </div>
  );
}
