"use client";

import { useCallback, useSyncExternalStore } from "react";
import { armarArchivo, nombreDeArchivo } from "@/lib/proyectos/modelo";
import type { Proyecto } from "@/lib/proyectos/tipos";

/**
 * Dónde viven los proyectos hoy: el localStorage de este navegador.
 *
 * No hay servidor ni cuentas, y por eso el archivo exportable no es un extra:
 * es la única forma de llevarse un proyecto a otra computadora o de archivarlo
 * junto al expediente. La capa está aislada a propósito —el resto de la app
 * habla con `useProyectos` y nunca con localStorage— para que el día que haya
 * backend se reemplace esto y nada más.
 *
 * Mismo mecanismo que `useCampo`: `useSyncExternalStore` para que el servidor
 * renderice vacío y el navegador lo guardado sin romper la hidratación, y dos
 * pestañas abiertas se mantengan sincronizadas.
 */

const CLAVE = "magicing:proyectos:v1";
const EVENTO_CAMBIO = "magicing:proyectos";

/**
 * Instancia estable para el estado vacío.
 *
 * `useSyncExternalStore` compara por identidad y vuelve a leer en cada render:
 * devolver `[]` recién creado en cada llamada haría que siempre se vea un valor
 * distinto y el componente entraría en un bucle de renders.
 */
const VACIO: Proyecto[] = [];

let cache: { texto: string; proyectos: Proyecto[] } | null = null;

function leerTodos(): Proyecto[] {
  let texto: string | null;
  try {
    texto = window.localStorage.getItem(CLAVE);
  } catch {
    // Navegación privada o almacenamiento bloqueado.
    return VACIO;
  }
  if (!texto) return VACIO;

  // Se cachea contra el texto crudo por el mismo motivo que VACIO: sin esto,
  // cada lectura devolvería un array nuevo y el componente no pararía de
  // renderizarse.
  if (cache && cache.texto === texto) return cache.proyectos;

  try {
    const crudo: unknown = JSON.parse(texto);
    const proyectos = Array.isArray(crudo) ? (crudo as Proyecto[]) : VACIO;
    cache = { texto, proyectos };
    return proyectos;
  } catch {
    return VACIO;
  }
}

function escribirTodos(proyectos: Proyecto[]) {
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify(proyectos));
  } catch {
    // Si no se puede guardar, al menos la pantalla refleja el cambio.
  }
  window.dispatchEvent(new Event(EVENTO_CAMBIO));
}

function suscribir(alCambiar: () => void) {
  window.addEventListener(EVENTO_CAMBIO, alCambiar);
  window.addEventListener("storage", alCambiar);
  return () => {
    window.removeEventListener(EVENTO_CAMBIO, alCambiar);
    window.removeEventListener("storage", alCambiar);
  };
}

export function useProyectos() {
  const proyectos = useSyncExternalStore(suscribir, leerTodos, () => VACIO);

  const guardar = useCallback((proyecto: Proyecto) => {
    const todos = leerTodos();
    const existe = todos.some((p) => p.id === proyecto.id);
    escribirTodos(existe ? todos.map((p) => (p.id === proyecto.id ? proyecto : p)) : [...todos, proyecto]);
  }, []);

  const eliminar = useCallback((id: string) => {
    escribirTodos(leerTodos().filter((p) => p.id !== id));
  }, []);

  /** Agrega los importados sin pisar los que ya están: un id repetido entra como copia. */
  const importar = useCallback((nuevos: Proyecto[]) => {
    const todos = leerTodos();
    const existentes = new Set(todos.map((p) => p.id));
    const aAgregar = nuevos.map((p) =>
      existentes.has(p.id)
        ? { ...p, id: `${p.id}-copia-${Date.now().toString(36)}`, nombre: `${p.nombre} (copia)` }
        : p
    );
    escribirTodos([...todos, ...aAgregar]);
  }, []);

  return { proyectos, guardar, eliminar, importar };
}

/**
 * Baja un archivo con los proyectos indicados.
 *
 * Se arma un Blob y se dispara un enlace: sin servidor no hay otra forma, y así
 * el archivo nunca sale del navegador — que es justamente lo que hace que hoy
 * no haya datos de nadie bajo custodia.
 */
export function descargarProyectos(proyectos: Proyecto[], uno: Proyecto | null = null) {
  const blob = new Blob([JSON.stringify(armarArchivo(proyectos), null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreDeArchivo(uno);
  enlace.click();
  URL.revokeObjectURL(url);
}
