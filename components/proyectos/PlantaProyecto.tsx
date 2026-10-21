"use client";

import { useMemo, useState } from "react";
import { Box, Map as MapaIcono } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeyendaEstados } from "@/components/cad-revit/LeyendaEstados";
import { PlantaInterpretada, type Seleccion } from "@/components/cad-revit/PlantaInterpretada";
import { PanelPiezaProyecto, type PiezaElegida } from "@/components/proyectos/PanelPiezaProyecto";
import { VisorPlanta3D } from "@/components/proyectos/VisorPlanta3D";
import { modoPilotes } from "@/lib/cad-revit/descargas";
import { piezas3D } from "@/lib/cad-revit/modelo3d";
import { estadosDePlanta, marcasDePlanta } from "@/lib/cad-revit/proyecto";
import type { EstadoElemento } from "@/lib/proyectos/estado";
import type { Proyecto } from "@/lib/proyectos/tipos";

type Vista = "3d" | "planta";

/**
 * La planta de fundaciones del proyecto, guardada al llevarla desde CAD → Revit:
 * se ve en 3D o en planta sin volver a subir el DXF, pintada por estado, y al
 * tocar una pieza se le carga el pilar y se abre su cálculo.
 */
export function PlantaProyecto({ proyecto, guardar }: { proyecto: Proyecto; guardar: (p: Proyecto) => void }) {
  const planta = proyecto.planta;
  const [vista, setVista] = useState<Vista>("3d");
  const [seleccion, setSeleccion] = useState<Seleccion>(null);
  const r = planta?.interpretacion;
  const marcas = useMemo(() => (r ? marcasDePlanta(r) : null), [r]);
  const elementos = proyecto.elementos;
  const piezas = useMemo(() => {
    if (!planta) return [];
    const pilares = new Map(elementos.filter((e) => e.cad).map((e) => [e.cad!.marca, e.pilar]));
    return piezas3D(planta, pilares);
  }, [planta, elementos]);
  const estados = useMemo(() => (r ? estadosDePlanta(r, proyecto) : null), [r, proyecto]);
  const estadosPorMarca = useMemo(() => {
    const m = new Map<string, EstadoElemento>();
    if (!marcas || !estados) return m;
    const poner = (ms: string[], es: (EstadoElemento | null)[]) => ms.forEach((mk, i) => es[i] && m.set(mk, es[i]!));
    poner(marcas.cabezales, estados.cabezales);
    poner(marcas.vigas, estados.vigas);
    poner(marcas.pilotes, estados.pilotes);
    // Los nodos no tienen verificación propia, pero se eligen para cargarles el pilar.
    for (const mk of marcas.nodos) if (elementos.some((e) => e.cad?.marca === mk)) m.set(mk, "no-evaluable");
    return m;
  }, [marcas, estados, elementos]);
  if (!planta || !r || !marcas || !estados) return null;

  const pieza: PiezaElegida | null = seleccion
    ? {
        ...seleccion,
        marca: (seleccion.tipo === "cabezal" ? marcas.cabezales : seleccion.tipo === "viga" ? marcas.vigas : marcas.nodos)[seleccion.indice],
      }
    : null;

  /** Del 3D llega una marca: se busca qué pieza es. */
  function elegirMarca(marca: string | null) {
    if (!marca || !marcas) return setSeleccion(null);
    for (const tipo of ["cabezal", "viga", "nodo"] as const) {
      const lista = tipo === "cabezal" ? marcas.cabezales : tipo === "viga" ? marcas.vigas : marcas.nodos;
      const indice = lista.indexOf(marca);
      if (indice >= 0) return setSeleccion({ tipo, indice });
    }
    setSeleccion(null);
  }

  const boton = (v: Vista, Icono: typeof Box, texto: string) => (
    <button
      type="button"
      onClick={() => setVista(v)}
      aria-pressed={vista === v}
      className={`flex h-8 items-center gap-1.5 rounded-md px-3 text-xs transition-colors ${vista === v ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
    >
      <Icono className="h-3.5 w-3.5" />
      {texto}
    </button>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="text-base">Planta de fundaciones</CardTitle>
        <div className="flex rounded-lg bg-secondary p-0.5">
          {boton("3d", Box, "3D")}
          {boton("planta", MapaIcono, "Planta")}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          {planta.archivo}. Tocá una pieza —o su pilar— para cargarle las cargas y la armadura: se pinta a medida que se verifica.
          Para traer otra revisión del plano, subila en CAD → Revit y llevala a este proyecto.
        </p>
        <LeyendaEstados estados={estados} proyecto={proyecto.nombre} pilotesVerificados={modoPilotes(proyecto) === "verificar"} />
        <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
          {vista === "3d" ? (
            <VisorPlanta3D piezas={piezas} estados={estadosPorMarca} seleccionado={pieza?.marca ?? null} onSeleccionar={elegirMarca} />
          ) : (
            <PlantaInterpretada
              key={planta.guardada}
              interpretacion={r}
              seleccion={seleccion}
              onSeleccionar={setSeleccion}
              foco={null}
              estados={estados}
            />
          )}
          <PanelPiezaProyecto proyecto={proyecto} guardar={guardar} planta={planta} pieza={pieza} />
        </div>
      </CardContent>
    </Card>
  );
}
