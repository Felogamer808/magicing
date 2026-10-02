"use client";

import { useCallback, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";

/**
 * Campo de formulario que recuerda su valor entre recargas y navegaciones.
 *
 * Reemplaza a useState en las páginas de verificación: sin esto, salir a mirar
 * otra verificación borraba todo lo cargado, que es justo lo que una planilla
 * de Excel no hace.
 *
 * Los valores se guardan por ruta, así que cada verificación tiene su propio
 * juego de datos y no se pisan entre sí. Al leerse con useSyncExternalStore, el
 * servidor renderiza el valor por defecto y el navegador el guardado sin romper
 * la hidratación, y dos pestañas abiertas con la misma verificación se mantienen
 * sincronizadas.
 */

const PREFIJO = "magicing:v1";
const EVENTO_CAMBIO = "magicing:campo";

function claveDe(ruta: string, nombre: string) {
  return `${PREFIJO}:${ruta}:${nombre}`;
}

function leer(clave: string): string | null {
  try {
    return window.localStorage.getItem(clave);
  } catch {
    // Navegación privada o almacenamiento bloqueado.
    return null;
  }
}

function suscribir(alCambiar: () => void) {
  window.addEventListener(EVENTO_CAMBIO, alCambiar);
  // "storage" lo dispara el navegador cuando cambia otra pestaña.
  window.addEventListener("storage", alCambiar);
  return () => {
    window.removeEventListener(EVENTO_CAMBIO, alCambiar);
    window.removeEventListener("storage", alCambiar);
  };
}

/**
 * Campos que cada ruta tiene montados, con su valor por defecto.
 *
 * Hace falta porque localStorage sólo guarda lo que alguien efectivamente
 * escribió: si se abre una verificación, se cambia un único dato y se guarda
 * el cálculo en un proyecto, lo escrito es ese único dato y todo el resto —que
 * está en pantalla con su valor por defecto— no existiría en el guardado. Al
 * reabrirlo tomaría los valores por defecto de ese momento, que pueden no ser
 * los mismos, y la memoria de cálculo saldría sin la mitad de los datos.
 *
 * Se registra en memoria y no en localStorage a propósito: escribir ahí los
 * valores por defecto rompería el "sólo si nunca se escribió" del que depende
 * guardarCamposDeRuta para blanquear los campos que un vínculo no puede llenar.
 *
 * Sólo conoce los campos montados. Uno que vive detrás de un desplegable
 * cerrado no está declarado hasta que se abre; si tenía valor guardado, igual
 * entra por el otro camino.
 */
const declarados = new Map<string, Map<string, string>>();

function declarar(ruta: string, nombre: string, inicial: string) {
  let deLaRuta = declarados.get(ruta);
  if (!deLaRuta) {
    deLaRuta = new Map();
    declarados.set(ruta, deLaRuta);
  }
  deLaRuta.set(nombre, inicial);
}
function useCampoBase(nombre: string, inicial: string): [string, (valor: string) => void] {
  const ruta = usePathname();
  const clave = claveDe(ruta, nombre);
  declarar(ruta, nombre, inicial);

  const valor = useSyncExternalStore(
    suscribir,
    () => leer(clave) ?? inicial,
    () => inicial
  );

  const guardar = useCallback(
    (nuevo: string) => {
      try {
        window.localStorage.setItem(clave, nuevo);
      } catch {
        // Si no se puede guardar, al menos se refleja en pantalla.
      }
      window.dispatchEvent(new Event(EVENTO_CAMBIO));
    },
    [clave]
  );

  return [valor, guardar];
}

// El valor inicial es un literal en las páginas ("30", "EC2"), así que sin las
// sobrecargas TypeScript infiere el tipo literal y rechaza cualquier otro valor.
export function useCampo(nombre: string, inicial: string): [string, (valor: string) => void];
export function useCampo<T extends string>(nombre: string, inicial: T): [T, (valor: T) => void];
export function useCampo(nombre: string, inicial: string): [string, (valor: string) => void] {
  return useCampoBase(nombre, inicial);
}

/**
 * Escribe campos de OTRA ruta, para encadenar verificaciones sin recargar a
 * mano lo que ya se cargó una vez (ver lib/verificaciones/vinculos.ts).
 *
 * Pisa lo que hubiera en el destino, y eso es deliberado: se dispara sólo
 * cuando alguien aprieta el botón de llevar los datos, no en cada tecla. Un
 * arrastre automático haría que abrir una verificación para mirar un caso
 * aparte te destruyera lo que tenías cargado en ella.
 */
export function guardarCamposDeRuta(
  ruta: string,
  valores: Record<string, string>,
  /**
   * Campos que el vínculo no puede llenar y que conviene dejar en blanco en vez
   * de que queden con el valor por defecto de la página: si no, al llegar se ve
   * una flecha o una fisura con cara de calculada que en realidad sale de una
   * luz y un momento de ejemplo.
   *
   * Sólo se blanquean si nunca se escribieron en esa ruta. Quien ya los cargó
   * está iterando —vuelve a la viga, cambia la armadura y encadena de nuevo— y
   * perder lo tipeado en cada vuelta sería peor que el problema que se evita.
   */
  blanquearSiFaltan: string[] = []
) {
  try {
    for (const [nombre, valor] of Object.entries(valores)) {
      window.localStorage.setItem(claveDe(ruta, nombre), valor);
    }
    for (const nombre of blanquearSiFaltan) {
      const clave = claveDe(ruta, nombre);
      if (leer(clave) === null) window.localStorage.setItem(clave, "");
    }
  } catch {
    // Si el almacenamiento no está disponible, la navegación igual sirve:
    // el destino se abre con sus valores por defecto.
  }
  window.dispatchEvent(new Event(EVENTO_CAMBIO));
}

/**
 * Lee todos los campos guardados de una ruta: el inverso de
 * `guardarCamposDeRuta`. Es lo que permite tomar una verificación tal como
 * quedó en pantalla y guardarla dentro de un elemento de un proyecto.
 *
 * Devuelve sólo lo que efectivamente se escribió. Un campo que nunca se tocó
 * no aparece, y al reabrir el cálculo toma su valor por defecto, que es
 * justamente el que tenía.
 */
export function leerCamposDeRuta(ruta: string): Record<string, string> {
  const campos: Record<string, string> = {};
  // Primero los valores por defecto de todo lo que la página tiene montado, y
  // encima lo que se haya escrito.
  for (const [nombre, inicial] of declarados.get(ruta) ?? []) campos[nombre] = inicial;
  try {
    const prefijo = `${PREFIJO}:${ruta}:`;
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (!k?.startsWith(prefijo)) continue;
      const valor = window.localStorage.getItem(k);
      if (valor !== null) campos[k.slice(prefijo.length)] = valor;
    }
  } catch {
    // Sin almacenamiento no hay nada que guardar; devuelve vacío.
  }
  return campos;
}

/** Borra los valores guardados de una ruta y devuelve los campos a su valor por defecto. */
export function restablecerCampos(ruta: string) {
  try {
    const prefijo = `${PREFIJO}:${ruta}:`;
    const aBorrar: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k?.startsWith(prefijo)) aBorrar.push(k);
    }
    aBorrar.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    // Si el almacenamiento no está disponible igual conviene refrescar la pantalla.
  }
  window.dispatchEvent(new Event(EVENTO_CAMBIO));
}
