"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

const CLAVE = "magicing:tema";
const EVENTO_TEMA = "magicing:tema-cambiado";

/** El tema vive en la clase del <html>, que es estado externo a React. */
function suscribirTema(alCambiar: () => void) {
  window.addEventListener(EVENTO_TEMA, alCambiar);
  return () => window.removeEventListener(EVENTO_TEMA, alCambiar);
}

/**
 * Alterna entre el papel de plano (claro) y el cianotipo (oscuro). El valor
 * elegido se guarda y lo vuelve a aplicar el script del layout antes del primer
 * pintado, así no hay un destello blanco al cargar.
 */
export function TemaToggle() {
  const oscuro = useSyncExternalStore(
    suscribirTema,
    () => document.documentElement.classList.contains("dark"),
    () => false
  );

  const alternar = () => {
    const nuevo = !oscuro;
    document.documentElement.classList.toggle("dark", nuevo);
    try {
      window.localStorage.setItem(CLAVE, nuevo ? "oscuro" : "claro");
    } catch {
      // Sin almacenamiento el tema dura sólo esta sesión.
    }
    window.dispatchEvent(new Event(EVENTO_TEMA));
  };

  return (
    <button
      type="button"
      onClick={alternar}
      aria-pressed={oscuro}
      aria-label={oscuro ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      title={oscuro ? "Tema claro" : "Tema oscuro"}
      className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none print:hidden"
    >
      {oscuro ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

/**
 * Se inyecta en el <head> y corre antes de pintar: sin esto la página aparecería
 * clara un instante antes de aplicarse el tema guardado.
 */
export const scriptTemaInicial = `
try {
  var t = localStorage.getItem(${JSON.stringify(CLAVE)});
  var oscuro = t === "oscuro" || (t === null && matchMedia("(prefers-color-scheme: dark)").matches);
  if (oscuro) document.documentElement.classList.add("dark");
} catch (e) {}
`;
