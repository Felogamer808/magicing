"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Calculator, FolderKanban, LayoutGrid, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/Logo";
import { NavVerificaciones } from "@/components/verificaciones/comun/NavVerificaciones";

/**
 * Barra lateral azul marino, persistente en escritorio.
 *
 * Los destinos son los que existen de verdad. La referencia visual traía además
 * "Configuración" y una ficha de usuario con nombre y rol; no entran porque la
 * herramienta no tiene cuentas ni preferencias de usuario, y un ítem que no
 * lleva a ningún lado es peor que uno que falta. En su lugar, el pie lleva al
 * alcance, que es lo que conviene tener siempre a mano en una herramienta de
 * cálculo.
 */

interface Destino {
  nombre: string;
  ruta: string;
  Icono: typeof LayoutGrid;
  /** Marca activo también las rutas que cuelgan de ésta. */
  prefijo?: boolean;
}

const GRUPOS: { titulo: string; destinos: Destino[] }[] = [
  {
    titulo: "Espacio de trabajo",
    destinos: [
      { nombre: "Resumen", ruta: "/", Icono: LayoutGrid },
      { nombre: "Proyectos", ruta: "/proyectos", Icono: FolderKanban, prefijo: true },
      { nombre: "Verificaciones", ruta: "/verificaciones", Icono: Calculator, prefijo: true },
      { nombre: "Secciones", ruta: "/secciones", Icono: BookOpen, prefijo: true },
    ],
  },
];

export function BarraLateral() {
  const ruta = usePathname();
  const enVerificacion = ruta.startsWith("/verificaciones/");

  const estaActivo = (destino: Destino) =>
    destino.prefijo ? ruta.startsWith(destino.ruta) : ruta === destino.ruta;

  return (
    <aside className="hidden w-60 shrink-0 bg-sidebar text-sidebar-foreground md:block print:hidden">
      <div className="sticky top-0 flex h-screen flex-col gap-6 overflow-y-auto p-4">
        {/*
          El logotipo ya es la palabra "MagicIng", así que no se repite al lado
          como en la referencia: alcanza con la bajada debajo.
        */}
        <Link href="/" className="block px-1 pt-1" aria-label="MagicIng — inicio">
          <Logo className="h-7 w-auto text-white" titulo="" />
          <span className="mt-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/55">
            Cálculo estructural
          </span>
        </Link>

        <nav className="flex flex-col gap-5">
          {GRUPOS.map((grupo) => (
            <div key={grupo.titulo}>
              <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/45">
                {grupo.titulo}
              </p>
              <ul className="space-y-0.5">
                {grupo.destinos.map((destino) => {
                  const activo = estaActivo(destino);
                  return (
                    <li key={destino.ruta}>
                      <Link
                        href={destino.ruta}
                        aria-current={activo ? "page" : undefined}
                        className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                          activo
                            ? "bg-sidebar-primary font-semibold text-sidebar-primary-foreground"
                            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        }`}
                      >
                        <destino.Icono className="h-4 w-4 shrink-0" />
                        {destino.nombre}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/*
          Dentro de una verificación, la barra suma la lista de su sección. Es
          navegación contextual en la misma barra y no una segunda barra al
          lado: dos columnas de navegación pegadas se comen el ancho donde van
          los formularios.
        */}
        {enVerificacion && (
          <div className="border-t border-sidebar-border pt-4">
            <NavVerificaciones />
          </div>
        )}

        <div className="mt-auto border-t border-sidebar-border pt-3">
          <Link
            href="/alcance"
            className="flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-xs transition-colors hover:bg-sidebar-accent"
          >
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--celeste)]" />
            <span>
              <span className="block font-medium text-white">Alcance y responsabilidad</span>
              <span className="block text-sidebar-foreground/60">Qué respalda cada número</span>
            </span>
          </Link>
        </div>
      </div>
    </aside>
  );
}
