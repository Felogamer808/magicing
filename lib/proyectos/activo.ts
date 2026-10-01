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

const CLAVE = "magicing:proyecto-activo:v1";
const EVENTO_CAMBIO = "magicing:proyecto-activo";

function leer(): string | null {
  try {
    return window.localStorage.getItem(CLAVE);
  } catch {
    return null;
  }
}

function suscribir(alCambiar: () => void) {
  window.addEventListener(EVENTO_CAMBIO, alCambiar);
  window.addEventListener("storage", alCambiar);
  return () => {
    window.removeEventListener(EVENTO_CAMBIO, alCambiar);
    window.removeEventListener("storage", alCambiar);
  };
}

export function useProyectoActivo(): [string | null, (id: string | null) => void] {
  const id = useSyncExternalStore(suscribir, leer, () => null);

  const elegir = useCallback((nuevo: string | null) => {
    try {
      if (nuevo) window.localStorage.setItem(CLAVE, nuevo);
      else window.localStorage.removeItem(CLAVE);
    } catch {
      // Sin almacenamiento la elección no sobrevive a la recarga, pero la
      // pantalla igual responde.
    }
    window.dispatchEvent(new Event(EVENTO_CAMBIO));
  }, []);

  return [id, elegir];
}
