"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Proyecto activo: el que está abierto mientras se trabaja.
 *
 * Se elige una vez y queda fijo en la barra de las verificaciones. El motivo es
 * el uso real: cuando se calculan diez vigas seguidas de la misma obra, elegir
 * el proyecto en cada guardado es una pregunta que ya está contestada.
 *
 * Se guarda sólo el id, no el proyecto. Si el proyecto se borra o el archivo se
 * abre en otra computadora, el id queda apuntando a nada y la barra lo trata
 * como "sin proyecto activo" — que es lo correcto, y mucho mejor que arrastrar
 * una copia desactualizada del proyecto entero.
 */

/**
 * Un id guardado en localStorage, con su hook. Lo comparten el proyecto activo
 * y el elemento de destino, que funcionan igual.
 */
function hookDeId(clave: string, evento: string) {
  const leer = (): string | null => {
    try {
      return window.localStorage.getItem(clave);
    } catch {
      return null;
    }
  };

  const suscribir = (alCambiar: () => void) => {
    window.addEventListener(evento, alCambiar);
    window.addEventListener("storage", alCambiar);
    return () => {
      window.removeEventListener(evento, alCambiar);
      window.removeEventListener("storage", alCambiar);
    };
  };

  const elegir = (nuevo: string | null) => {
    try {
      if (nuevo) window.localStorage.setItem(clave, nuevo);
      else window.localStorage.removeItem(clave);
    } catch {
      // Sin almacenamiento la elección no sobrevive a la recarga, pero la
      // pantalla igual responde.
    }
    window.dispatchEvent(new Event(evento));
  };

  return function useId(): [string | null, (id: string | null) => void] {
    const id = useSyncExternalStore(suscribir, leer, () => null);
    return [id, useCallback(elegir, [])];
  };
}

export const useProyectoActivo = hookDeId("magicing:proyecto-activo:v1", "magicing:proyecto-activo");

/**
 * Elemento de destino: el que la barra de las verificaciones propone para
 * guardar. Lo fija el botón "Calcular" de cada elemento, para que al llegar a
 * la verificación no haya que volver a elegirlo, y cada guardado lo actualiza.
 * Si el elemento ya no está en el proyecto activo, la barra no lo usa.
 */
export const useElementoDestino = hookDeId("magicing:elemento-destino:v1", "magicing:elemento-destino");
