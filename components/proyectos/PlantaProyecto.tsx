"use client";

import { useEffect, useMemo, useState } from "react";
import { Box, Map as MapaIcono, Maximize2, Minimize2 } from "lucide-react";
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
  /** Pantalla completa: la planta ocupa la ventana y el panel queda al costado. */
  const [completa, setCompleta] = useState(false);
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
  // En pantalla completa: Esc sale y la página de atrás no se desplaza.
  useEffect(() => {
    if (!completa) return;
    const alTeclear = (e: KeyboardEvent) => e.key === "Escape" && setCompleta(false);
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", alTeclear);
    return () => {
      document.body.style.overflow = antes;
      window.removeEventListener("keydown", alTeclear);
    };
  }, [completa]);
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

  const selectorVista = (
    <div className="flex rounded-lg bg-secondary p-0.5">
      {boton("3d", Box, "3D")}
      {boton("planta", MapaIcono, "Planta")}
    </div>
  );
  const botonCompleta = (
    <button
      type="button"
      onClick={() => setCompleta((c) => !c)}
      className="flex h-8 items-center gap-1.5 rounded-lg border border-input px-3 text-xs transition-colors hover:bg-secondary"
      title={completa ? "Salir (Esc)" : "Pantalla completa"}
    >
      {completa ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
      {completa ? "Salir" : "Pantalla completa"}
    </button>
  );
  const leyenda = <LeyendaEstados estados={estados} proyecto={proyecto.nombre} pilotesVerificados={modoPilotes(proyecto) === "verificar"} />;
  const vistaPlanta =
    vista === "3d" ? (
      <VisorPlanta3D
        piezas={piezas}
        estados={estadosPorMarca}
        seleccionado={pieza?.marca ?? null}
        onSeleccionar={elegirMarca}
        className={completa ? "h-full" : undefined}
      />
    ) : (
      <PlantaInterpretada
        key={planta.guardada}
        interpretacion={r}
        seleccion={seleccion}
        onSeleccionar={setSeleccion}
        foco={null}
        estados={estados}
        llenar={completa}
      />
    );
  const panel = <PanelPiezaProyecto proyecto={proyecto} guardar={guardar} planta={planta} pieza={pieza} />;

  if (completa) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col gap-3 bg-background p-3" role="dialog" aria-label="Planta de fundaciones, pantalla completa">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="font-semibold">Planta de fundaciones</p>
          {leyenda}
          <div className="ml-auto flex items-center gap-2">
            {selectorVista}
            {botonCompleta}
          </div>
        </div>
        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[1fr_22rem]">
          <div className="min-h-[50vh] lg:min-h-0">{vistaPlanta}</div>
          <div className="min-h-0 overflow-y-auto">{panel}</div>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="text-base">Planta de fundaciones</CardTitle>
        <div className="flex items-center gap-2">
          {selectorVista}
          {botonCompleta}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          {planta.archivo}. Tocá una pieza —o su pilar— para cargarle las cargas y la armadura: se pinta a medida que se verifica.
          Para traer otra revisión del plano, subila en CAD → Revit y llevala a este proyecto.
        </p>
        {leyenda}
        <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
          {vistaPlanta}
          {panel}
        </div>
      </CardContent>
    </Card>
  );
}
