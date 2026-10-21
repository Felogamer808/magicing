"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeyendaEstados } from "@/components/cad-revit/LeyendaEstados";
import { PlantaInterpretada, type Seleccion } from "@/components/cad-revit/PlantaInterpretada";
import { PanelPiezaProyecto, type PiezaElegida } from "@/components/proyectos/PanelPiezaProyecto";
import { modoPilotes } from "@/lib/cad-revit/descargas";
import { estadosDePlanta, marcasDePlanta } from "@/lib/cad-revit/proyecto";
import type { Proyecto } from "@/lib/proyectos/tipos";

/**
 * La planta de fundaciones del proyecto, guardada al llevarla desde CAD → Revit:
 * se dibuja sin volver a subir el DXF, pintada por estado, y al tocar una pieza
 * se le carga el pilar y se abre su cálculo.
 */
export function PlantaProyecto({ proyecto, guardar }: { proyecto: Proyecto; guardar: (p: Proyecto) => void }) {
  const planta = proyecto.planta;
  const [seleccion, setSeleccion] = useState<Seleccion>(null);
  const r = planta?.interpretacion;
  const marcas = useMemo(() => (r ? marcasDePlanta(r) : null), [r]);
  if (!planta || !r || !marcas) return null;

  const estados = estadosDePlanta(r, proyecto);
  const pieza: PiezaElegida | null = seleccion
    ? {
        ...seleccion,
        marca: (seleccion.tipo === "cabezal" ? marcas.cabezales : seleccion.tipo === "viga" ? marcas.vigas : marcas.nodos)[seleccion.indice],
      }
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Planta de fundaciones</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          {planta.archivo}. Tocá una pieza para cargarle el pilar y la armadura. Para traer otra revisión del plano, subila en
          CAD → Revit y llevala a este proyecto.
        </p>
        <LeyendaEstados estados={estados} proyecto={proyecto.nombre} pilotesVerificados={modoPilotes(proyecto) === "verificar"} />
        <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
          <PlantaInterpretada
            key={planta.guardada}
            interpretacion={r}
            seleccion={seleccion}
            onSeleccionar={setSeleccion}
            foco={null}
            estados={estados}
          />
          <PanelPiezaProyecto proyecto={proyecto} guardar={guardar} planta={planta} pieza={pieza} />
        </div>
      </CardContent>
    </Card>
  );
}
