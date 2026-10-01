"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, FolderOpen, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { leerCamposDeRuta } from "@/lib/hooks/useCampo";
import { useProyectoActivo } from "@/lib/proyectos/activo";
import { useProyectos } from "@/lib/proyectos/almacen";
import {
  agregarElemento,
  crearCalculo,
  crearElemento,
  guardarCalculoEnElemento,
} from "@/lib/proyectos/modelo";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

/**
 * Barra de proyecto en las páginas de verificación: guardar lo que está en
 * pantalla dentro de un elemento de la obra.
 *
 * Toma los campos de la ruta tal como quedaron, sin pedirlos de nuevo ni pasar
 * por el motor de cálculo. Guardar los datos de entrada y no los resultados es
 * lo que permite reabrir el cálculo y seguir editándolo, que es para lo que se
 * pidió esto; el resultado se recalcula al abrir.
 *
 * No aparece si no hay proyecto activo: quien entra a hacer una cuenta suelta
 * no tiene por qué ver nada de proyectos. Y no aparece en las rutas que no
 * están en el registro, porque no habría con qué nombrar lo guardado.
 */
export function BarraProyecto() {
  const ruta = usePathname();
  const meta = registroVerificaciones.find((v) => v.ruta === ruta);
  const [idActivo] = useProyectoActivo();
  const { proyectos, guardar } = useProyectos();
  const proyecto = proyectos.find((p) => p.id === idActivo) ?? null;

  const [idElemento, setIdElemento] = useState("");
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [guardado, setGuardado] = useState<string | null>(null);

  if (!meta || !proyecto) return null;

  function guardarAca() {
    if (!proyecto || !meta) return;
    const campos = leerCamposDeRuta(ruta);
    const calculo = crearCalculo(meta.id, campos);

    let destino = proyecto;
    let idDestino = idElemento;

    // Crear el elemento desde acá mismo: al calcular la V-204 no hay que ir al
    // proyecto, darla de alta y volver.
    if (!idDestino && nombreNuevo.trim()) {
      const elemento = crearElemento(nombreNuevo);
      destino = agregarElemento(proyecto, elemento);
      idDestino = elemento.id;
    }
    if (!idDestino) return;

    guardar(guardarCalculoEnElemento(destino, idDestino, calculo));
    const nombre =
      destino.elementos.find((e) => e.id === idDestino)?.nombre ?? "el elemento";
    setGuardado(nombre);
    setNombreNuevo("");
    setIdElemento(idDestino);
    window.setTimeout(() => setGuardado(null), 4000);
  }

  const puedeGuardar = Boolean(idElemento) || nombreNuevo.trim().length > 0;

  return (
    <div className="mb-6 rounded-lg border border-primary/30 bg-primary/[0.04] p-3 print:hidden">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <FolderOpen className="h-3.5 w-3.5 shrink-0" />
          Proyecto activo
        </span>
        <Link
          href={`/proyectos/${proyecto.id}`}
          className="text-sm font-medium underline-offset-2 hover:underline"
        >
          {proyecto.nombre}
        </Link>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {proyecto.elementos.length > 0 && (
            <select
              value={idElemento}
              onChange={(e) => {
                setIdElemento(e.target.value);
                if (e.target.value) setNombreNuevo("");
              }}
              aria-label="Elemento donde guardar"
              className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
            >
              <option value="">Elemento nuevo…</option>
              {proyecto.elementos.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                  {e.ubicacion ? ` · ${e.ubicacion}` : ""}
                </option>
              ))}
            </select>
          )}

          {!idElemento && (
            <Input
              value={nombreNuevo}
              onChange={(e) => setNombreNuevo(e.target.value)}
              placeholder="V-204"
              aria-label="Nombre del elemento nuevo"
              className="h-8 w-28"
            />
          )}

          <button
            type="button"
            onClick={guardarAca}
            disabled={!puedeGuardar}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <Save className="h-3.5 w-3.5" />
            Guardar en el proyecto
          </button>
        </div>
      </div>

      {guardado && (
        <p
          className="mt-2 flex items-center gap-1.5 text-xs text-exito"
          role="status"
        >
          <Check className="h-3.5 w-3.5 shrink-0" />
          {meta.nombre} guardada en {guardado}. Si volvés a guardar, se reemplaza.
        </p>
      )}
    </div>
  );
}
