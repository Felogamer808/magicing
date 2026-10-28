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

/**
 * Elemento abierto en cada verificación: de qué elemento son los datos que hay
 * en pantalla en esa ruta. Es lo que permite pasar de la V1 a la V2 desde la
 * misma página guardando sola la V1: sin saber de quién son los datos, el
 * guardado automático podría escribir los de una viga en otra.
 *
 * Es por ruta y no global como el elemento de destino, porque cada página
 * tiene sus propios campos: flexión puede tener abierta la V1 y pilares la P3.
 * Lo fijan todos los lugares que cargan un cálculo guardado en una ruta.
 */
const CLAVE_ABIERTOS = "magicing:elemento-abierto:v1";
const EVENTO_ABIERTOS = "magicing:elemento-abierto";

function leerAbiertos(): Record<string, string> {
  try {
    const crudo = JSON.parse(window.localStorage.getItem(CLAVE_ABIERTOS) ?? "{}");
    return crudo && typeof crudo === "object" ? crudo : {};
  } catch {
    return {};
  }
}

export function elementoAbiertoEn(ruta: string): string | null {
  return leerAbiertos()[ruta] ?? null;
}

export function fijarElementoAbierto(ruta: string, id: string | null) {
  const abiertos = leerAbiertos();
  if (id) abiertos[ruta] = id;
  else delete abiertos[ruta];
  try {
    window.localStorage.setItem(CLAVE_ABIERTOS, JSON.stringify(abiertos));
  } catch {
    // Sin almacenamiento no hay guardado automático que proteger.
  }
  window.dispatchEvent(new Event(EVENTO_ABIERTOS));
}

/**
 * Al encadenar de una página a otra (seguir con fisuración, pasar un tramo a
 * vigas), los datos que llegan son del mismo elemento que el origen, o de
 * ninguno si el origen no tenía uno abierto. Nunca del que la página de
 * destino hubiera tenido abierto antes.
 */
export function heredarElementoAbierto(rutaOrigen: string, rutaDestino: string) {
  fijarElementoAbierto(rutaDestino, elementoAbiertoEn(rutaOrigen));
}

const suscribirAbiertos = (alCambiar: () => void) => {
  window.addEventListener(EVENTO_ABIERTOS, alCambiar);
  window.addEventListener("storage", alCambiar);
  return () => {
    window.removeEventListener(EVENTO_ABIERTOS, alCambiar);
    window.removeEventListener("storage", alCambiar);
  };
};

export function useElementoAbierto(ruta: string): [string | null, (id: string | null) => void] {
  const id = useSyncExternalStore(suscribirAbiertos, () => elementoAbiertoEn(ruta), () => null);
  const fijar = useCallback((nuevo: string | null) => fijarElementoAbierto(ruta, nuevo), [ruta]);
  return [id, fijar];
}
