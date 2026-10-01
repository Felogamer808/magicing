"use client";

import Link from "next/link";
import { ChevronDown, Plus, Search } from "lucide-react";
import { TemaToggle } from "@/components/TemaToggle";
import { useProyectoActivo } from "@/lib/proyectos/activo";
import { useProyectos } from "@/lib/proyectos/almacen";
import { contarCalculos } from "@/lib/proyectos/modelo";

/**
 * Barra superior fija: qué proyecto está abierto y por dónde se empieza algo
 * nuevo.
 *
 * El fondo translúcido con desenfoque es de la referencia visual y acá además
 * resuelve algo: la página de fondo lleva una retícula, y una barra opaca la
 * cortaría en seco al hacer scroll.
 *
 * Sin proyecto activo la barra no miente diciendo que hay uno: ofrece elegirlo.
 */
export function BarraSuperior() {
  const [idActivo] = useProyectoActivo();
  const { proyectos } = useProyectos();
  const proyecto = proyectos.find((p) => p.id === idActivo) ?? null;

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-md print:hidden">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Proyecto activo
          </p>
          {proyecto ? (
            <Link
              href={`/proyectos/${proyecto.id}`}
              className="flex items-center gap-1.5 text-sm font-semibold hover:text-primary"
            >
              <span className="truncate">{proyecto.nombre}</span>
              <span className="font-mono text-xs font-normal text-muted-foreground">
                {contarCalculos(proyecto)}
              </span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </Link>
          ) : (
            <Link
              href="/proyectos"
              className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary"
            >
              Ninguno — elegir
              <ChevronDown className="h-3.5 w-3.5 shrink-0" />
            </Link>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/secciones/hormigon-armado"
            className="hidden h-9 items-center gap-2 rounded-lg border border-input px-3 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:flex"
          >
            <Search className="h-4 w-4" />
            Buscar verificación
          </Link>
          <TemaToggle />
          <Link
            href="/proyectos"
            className="flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nuevo proyecto</span>
            <span className="sm:hidden">Nuevo</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
