"use client";

import { useEffect, useRef, useState } from "react";
import type { Pieza3D } from "@/lib/cad-revit/modelo3d";
import type { VisorPlanta } from "@/lib/cad-revit/visor3d";
import type { EstadoElemento } from "@/lib/proyectos/estado";

/**
 * Lienzo 3D de la planta de fundaciones. Monta `lib/cad-revit/visor3d.ts`, que
 * se baja recién acá: three no pesa en el resto del sitio.
 */
export function VisorPlanta3D({
  piezas,
  estados,
  seleccionado,
  onSeleccionar,
}: {
  piezas: Pieza3D[];
  /** Estado por marca. */
  estados: Map<string, EstadoElemento>;
  seleccionado: string | null;
  onSeleccionar: (marca: string | null) => void;
}) {
  const contenedor = useRef<HTMLDivElement>(null);
  const visor = useRef<VisorPlanta | null>(null);
  const alSeleccionar = useRef(onSeleccionar);
  const ultimo = useRef({ piezas, estados, seleccionado });
  const [listo, setListo] = useState<"cargando" | "listo" | "error">("cargando");

  useEffect(() => {
    alSeleccionar.current = onSeleccionar;
    const cambiaronPiezas = ultimo.current.piezas !== piezas;
    ultimo.current = { piezas, estados, seleccionado };
    if (cambiaronPiezas) visor.current?.cargar(piezas);
    visor.current?.actualizar(estados, seleccionado);
  }, [onSeleccionar, piezas, estados, seleccionado]);

  useEffect(() => {
    const div = contenedor.current;
    if (!div) return;
    let cancelado = false;
    let instancia: VisorPlanta | null = null;
    import("@/lib/cad-revit/visor3d")
      .then(({ VisorPlanta }) => {
        if (cancelado) return;
        instancia = new VisorPlanta(div, (m) => alSeleccionar.current(m));
        instancia.cargar(ultimo.current.piezas);
        instancia.actualizar(ultimo.current.estados, ultimo.current.seleccionado);
        visor.current = instancia;
        setListo("listo");
      })
      .catch((e: unknown) => {
        console.error("No se pudo dibujar la planta en 3D", e);
        if (!cancelado) setListo("error");
      });
    return () => {
      cancelado = true;
      visor.current = null;
      instancia?.destruir();
    };
  }, []);

  return (
    <div className="relative h-[60vh] min-h-[22rem] w-full overflow-hidden rounded-md border">
      <div ref={contenedor} className="absolute inset-0" />
      {listo !== "listo" && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/70 text-sm text-muted-foreground">
          {listo === "cargando" ? "Armando el modelo…" : "No se pudo dibujar el modelo."}
        </div>
      )}
      <p className="pointer-events-none absolute bottom-2 left-2 rounded bg-background/80 px-2 py-1 text-xs text-muted-foreground">
        Arrastrá para girar · rueda para acercar · clic derecho para mover · tocá una pieza o su pilar
      </p>
    </div>
  );
}
