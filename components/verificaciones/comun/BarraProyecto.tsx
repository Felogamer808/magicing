"use client";

import { useEffect, useReducer, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, FolderOpen, Plus, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { guardarCamposDeRuta, leerCamposDeRuta, useFirmaCampos } from "@/lib/hooks/useCampo";
import { useElementoAbierto, useElementoDestino, useProyectoActivo } from "@/lib/proyectos/activo";
import { useProyectos } from "@/lib/proyectos/almacen";
import {
  agregarElemento,
  cambiarDeElemento,
  crearCalculo,
  crearElemento,
  guardarCalculoEnElemento,
  hayCambiosSinGuardar,
} from "@/lib/proyectos/modelo";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

const NUEVO = "__nuevo__";

/**
 * Barra de proyecto en las páginas de verificación: de qué elemento de la obra
 * son los datos en pantalla, y pasar de uno a otro sin salir de la página.
 *
 * Calcular la V1, la V2 y la V3 de una obra es elegirlas en el desplegable:
 * al cambiar, lo que había se guarda solo en el elemento que estaba abierto
 * (criterio del usuario, 2026-10-28) y se cargan los datos del otro. Si el
 * otro todavía no tiene esta verificación, la pantalla queda como estaba, para
 * arrancarlo desde el anterior y cambiarle sólo lo que difiere.
 *
 * Se guardan los datos de entrada, no los resultados: es lo que permite
 * reabrir el cálculo y seguir editándolo, y el resultado se recalcula al abrir.
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
  const [, elegirDestino] = useElementoDestino();
  const [idAbiertoGuardado, fijarAbierto] = useElementoAbierto(ruta);
  const idAbierto = proyecto?.elementos.some((e) => e.id === idAbiertoGuardado) ? idAbiertoGuardado : null;

  // La barra está en el layout y se dibuja antes que la página, cuando los
  // campos todavía no declararon su valor por defecto: se vuelve a leer una vez
  // montada, para no marcar como cambio un campo que sólo no se había leído.
  const [, releer] = useReducer((n: number) => n + 1, 0);
  useEffect(releer, [ruta, releer]);
  const firma = useFirmaCampos(ruta);

  const [creando, setCreando] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState("");
  // Elemento elegido sin tener uno abierto, que ya tiene esta verificación:
  // hay que decidir qué datos quedan.
  const [pendiente, setPendiente] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  if (!meta || !proyecto) return null;

  const enPantalla = (): Record<string, string> => leerCamposDeRuta(ruta);
  const nombreDe = (id: string) => proyecto.elementos.find((e) => e.id === id)?.nombre ?? "el elemento";
  const tieneEsta = (id: string) =>
    proyecto.elementos.find((e) => e.id === id)?.calculos.some((c) => c.verificacion === meta.id) ?? false;
  const conCambios = idAbierto !== null && firma !== "" && hayCambiosSinGuardar(proyecto, meta.id, idAbierto, JSON.parse(firma));

  const avisar = (texto: string) => {
    setAviso(texto);
    window.setTimeout(() => setAviso(null), 4000);
  };

  const abrir = (id: string) => {
    fijarAbierto(id);
    elegirDestino(id);
    setPendiente(null);
    setCreando(false);
  };

  function cambiarA(id: string) {
    if (!proyecto || !meta) return;
    if (!idAbierto && tieneEsta(id)) {
      setPendiente(id);
      return;
    }
    const r = cambiarDeElemento(proyecto, meta.id, idAbierto, enPantalla(), id);
    if (r.proyecto !== proyecto) guardar(r.proyecto);
    if (r.cargar) guardarCamposDeRuta(ruta, r.cargar);
    abrir(id);
    if (idAbierto && r.proyecto !== proyecto) avisar(`${nombreDe(idAbierto)} guardada. Abierta ${nombreDe(id)}.`);
  }

  function resolverPendiente(id: string, conservarPantalla: boolean) {
    if (!proyecto || !meta) return;
    if (conservarPantalla) {
      guardar(guardarCalculoEnElemento(proyecto, id, crearCalculo(meta.id, enPantalla())));
      avisar(`Guardado en ${nombreDe(id)}.`);
    } else {
      const guardado = proyecto.elementos.find((e) => e.id === id)?.calculos.find((c) => c.verificacion === meta.id);
      if (guardado) guardarCamposDeRuta(ruta, guardado.campos);
    }
    abrir(id);
  }

  function guardarAbierto() {
    if (!proyecto || !meta || !idAbierto) return;
    guardar(guardarCalculoEnElemento(proyecto, idAbierto, crearCalculo(meta.id, enPantalla())));
    avisar(`Guardado en ${nombreDe(idAbierto)}.`);
  }

  // Crear la V-204 desde acá: se guarda lo que había en la abierta, la nueva
  // arranca con los mismos datos y queda abierta.
  function crearNuevo() {
    if (!proyecto || !meta || !nombreNuevo.trim()) return;
    const campos = enPantalla();
    let p = idAbierto ? cambiarDeElemento(proyecto, meta.id, idAbierto, campos, idAbierto).proyecto : proyecto;
    const elemento = crearElemento(nombreNuevo);
    p = guardarCalculoEnElemento(agregarElemento(p, elemento), elemento.id, crearCalculo(meta.id, campos));
    guardar(p);
    abrir(elemento.id);
    setNombreNuevo("");
    avisar(`${elemento.nombre} creada con los datos en pantalla.`);
  }

  return (
    <div className="mb-6 rounded-lg border border-primary/30 bg-primary/[0.04] p-3 print:hidden">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <FolderOpen className="h-3.5 w-3.5 shrink-0" />
          Proyecto activo
        </span>
        <Link href={`/proyectos/${proyecto.id}`} className="text-sm font-medium underline-offset-2 hover:underline">
          {proyecto.nombre}
        </Link>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <select
            value={creando ? NUEVO : (pendiente ?? idAbierto ?? "")}
            onChange={(e) => {
              const v = e.target.value;
              if (v === NUEVO) {
                setCreando(true);
                setPendiente(null);
              } else if (v) {
                setCreando(false);
                cambiarA(v);
              }
            }}
            aria-label="Elemento abierto"
            className="h-8 max-w-[16rem] rounded-lg border border-input bg-transparent px-2 text-sm"
          >
            {!idAbierto && !pendiente && !creando && (
              <option value="" disabled>
                Sin elemento…
              </option>
            )}
            {proyecto.elementos.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
                {e.ubicacion ? ` · ${e.ubicacion}` : ""}
                {tieneEsta(e.id) ? "" : " (sin calcular)"}
              </option>
            ))}
            <option value={NUEVO}>+ Elemento nuevo…</option>
          </select>

          {creando ? (
            <>
              <Input
                autoFocus
                value={nombreNuevo}
                onChange={(e) => setNombreNuevo(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && crearNuevo()}
                placeholder="V-204"
                aria-label="Nombre del elemento nuevo"
                className="h-8 w-28"
              />
              <button
                type="button"
                onClick={crearNuevo}
                disabled={!nombreNuevo.trim()}
                className="flex h-8 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" />
                Crear
              </button>
              <button
                type="button"
                onClick={() => setCreando(false)}
                className="h-8 rounded-lg px-2 text-sm text-muted-foreground hover:bg-secondary"
              >
                Cancelar
              </button>
            </>
          ) : (
            idAbierto && (
              <button
                type="button"
                onClick={guardarAbierto}
                disabled={!conCambios}
                className="flex h-8 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                <Save className="h-3.5 w-3.5" />
                Guardar
              </button>
            )
          )}
        </div>
      </div>

      {pendiente ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">
            {nombreDe(pendiente)} ya tiene {meta.nombre.toLowerCase()} guardada, y lo que hay en pantalla no es de
            ningún elemento.
          </span>
          <button
            type="button"
            onClick={() => resolverPendiente(pendiente, false)}
            className="rounded-md border border-input px-2 py-0.5 hover:bg-secondary"
          >
            Abrir lo guardado
          </button>
          <button
            type="button"
            onClick={() => resolverPendiente(pendiente, true)}
            className="rounded-md border border-input px-2 py-0.5 hover:bg-secondary"
          >
            Guardar lo de pantalla en {nombreDe(pendiente)}
          </button>
          <button type="button" onClick={() => setPendiente(null)} className="px-1 text-muted-foreground hover:underline">
            Cancelar
          </button>
        </div>
      ) : aviso ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-exito" role="status">
          <Check className="h-3.5 w-3.5 shrink-0" />
          {aviso}
        </p>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">
          {!idAbierto
            ? "Lo que hay en pantalla no es de ningún elemento: elegí uno o creá uno nuevo para guardarlo."
            : conCambios
              ? `Cambios sin guardar en ${nombreDe(idAbierto)}: se guardan solos al pasar a otro elemento.`
              : `${nombreDe(idAbierto)} al día.`}
        </p>
      )}
    </div>
  );
}
