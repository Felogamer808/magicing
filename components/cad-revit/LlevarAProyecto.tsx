"use client";

import { useState } from "react";
import Link from "next/link";
import { FolderInput } from "lucide-react";
import type { Interpretacion } from "@/lib/cad-revit/interpretar";
import { derivarCargas } from "@/lib/cad-revit/cargas";
import { piezasDePlanta } from "@/lib/cad-revit/proyecto";
import { useProyectos } from "@/lib/proyectos/almacen";
import { crearProyecto, incorporarPlanta, type ResultadoPlanta } from "@/lib/proyectos/modelo";
import type { PiezaCad } from "@/lib/proyectos/tipos";

const NUEVO = "";

const ROTULO_PIEZA: Record<PiezaCad, [string, string]> = {
  cabezal: ["cabezal", "cabezales"],
  nodo: ["pilar sobre viga", "pilares sobre viga"],
  viga: ["viga", "vigas"],
  pilote: ["pilote", "pilotes"],
};

/**
 * Lleva la planta interpretada a un proyecto: un elemento por pieza, con su
 * verificación y la geometría cargada. Volver a llevarla (otra revisión del
 * plano) actualiza la geometría sin tocar lo cargado a mano.
 */
export function LlevarAProyecto({
  resultado,
  escala,
  largoPiloteM,
  archivo,
}: {
  resultado: Interpretacion;
  escala: number;
  largoPiloteM: number;
  archivo: string;
}) {
  const { proyectos, guardar } = useProyectos();
  const [destino, setDestino] = useState<string>(NUEVO);
  const [nombreNuevo, setNombreNuevo] = useState(archivo.replace(/\.dxf$/i, ""));
  const [hecho, setHecho] = useState<(Omit<ResultadoPlanta, "proyecto"> & { id: string; nombre: string }) | null>(null);

  // Si el elegido se borró en otra pestaña, se vuelve a "nuevo".
  const elegido = proyectos.find((p) => p.id === destino) ?? null;

  function llevar() {
    const proyecto = elegido ?? crearProyecto(nombreNuevo);
    const piezas = piezasDePlanta(resultado, { escala, largoPiloteM, materiales: proyecto.materiales });
    const r = incorporarPlanta(proyecto, piezas, archivo);
    // Las piezas nuevas toman las cargas ya cargadas (una viga nueva entre
    // dos cabezales que ya tenían su pilar).
    const conCargas = derivarCargas(r.proyecto);
    if (conCargas !== proyecto || !elegido) guardar(conCargas);
    setDestino(r.proyecto.id);
    setHecho({ ...r, id: r.proyecto.id, nombre: r.proyecto.nombre });
  }

  const creadosTexto = (Object.entries(hecho?.creados ?? {}) as [PiezaCad, number][])
    .map(([pieza, n]) => `${n} ${ROTULO_PIEZA[pieza][n === 1 ? 0 : 1]}`)
    .join(" · ");
  const selector = "h-9 rounded-lg border border-input bg-background px-2 text-sm";

  return (
    <div className="space-y-2 rounded-md border px-4 py-3 text-sm">
      <p className="font-medium">Calcular en un proyecto</p>
      <p className="text-muted-foreground">
        Cada pieza pasa a ser un elemento con su verificación y la geometría del plano. Las cargas, la armadura y el suelo se
        cargan en el proyecto.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Proyecto"
          className={selector}
          value={elegido ? elegido.id : NUEVO}
          onChange={(e) => {
            setDestino(e.target.value);
            setHecho(null);
          }}
        >
          <option value={NUEVO}>Proyecto nuevo…</option>
          {proyectos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
        {!elegido && (
          <input
            aria-label="Nombre del proyecto nuevo"
            className={`${selector} w-56`}
            value={nombreNuevo}
            onChange={(e) => setNombreNuevo(e.target.value)}
            placeholder="Nombre del proyecto"
          />
        )}
        <button
          type="button"
          onClick={llevar}
          className="flex h-9 items-center gap-2 rounded-lg border border-input px-3 transition-colors hover:bg-secondary"
        >
          <FolderInput className="h-4 w-4" />
          {elegido ? "Llevar al proyecto" : "Crear proyecto con la planta"}
        </button>
      </div>

      {hecho && (
        <div className="space-y-1 rounded-md bg-secondary/50 p-3" role="status">
          <p>
            <Link href={`/proyectos/${hecho.id}`} className="font-medium underline underline-offset-2">
              {hecho.nombre}
            </Link>
            {creadosTexto ? `: ${creadosTexto} nuevos.` : ": no hay piezas nuevas."}
          </p>
          {hecho.actualizados > 0 && (
            <p className="text-muted-foreground">
              {hecho.actualizados} ya estaban: se actualizó su geometría; lo cargado a mano quedó igual.
            </p>
          )}
          {hecho.yaNoEstan.length > 0 && (
            <p className="text-muted-foreground">
              Ya no están en esta planta (no se borraron): {hecho.yaNoEstan.join(", ")}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
