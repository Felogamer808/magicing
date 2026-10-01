"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  agruparPorCategoria,
  buscarSeccion,
  registroVerificaciones,
  verificacionesDeSeccion,
} from "@/lib/verificaciones/registry";

interface NavVerificacionesProps {
  /** Se dispara al elegir una verificación; el drawer móvil lo usa para cerrarse. */
  onNavegar?: () => void;
}

export function NavVerificaciones({ onNavegar }: NavVerificacionesProps) {
  const pathname = usePathname();

  // La barra lateral acompaña a la sección en la que se está trabajando: estando
  // en una verificación de metálicas no tiene sentido ofrecer las de hormigón.
  // La sección se deduce de la ruta actual y no de un prop, porque el layout que
  // monta esta barra es común a todas las verificaciones.
  const actual = registroVerificaciones.find((v) => v.ruta === pathname);
  const seccion = actual ? buscarSeccion(actual.seccion) : undefined;
  const visibles = seccion ? verificacionesDeSeccion(seccion.id) : registroVerificaciones;
  const categorias = agruparPorCategoria(visibles);

  return (
    <nav className="space-y-6">
      {seccion && (
        <Link
          href={seccion.ruta}
          onClick={onNavegar}
          className="block px-2 text-sm font-medium tracking-tight text-sidebar-foreground transition-colors hover:text-sidebar-accent-foreground"
        >
          ← {seccion.nombre}
        </Link>
      )}
      {categorias.map(([categoria, items]) => (
        <div key={categoria} className="space-y-1">
          <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/45">
            {categoria}
          </p>
          {items.map((item) => {
            if (!item.disponible) {
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground/45"
                >
                  <span>{item.nombre}</span>
                  <Badge variant="outline" className="shrink-0 text-[11.5px]">
                    Pronto
                  </Badge>
                </div>
              );
            }

            const activo = pathname === item.ruta;
            return (
              <Link
                key={item.id}
                href={item.ruta}
                onClick={onNavegar}
                aria-current={activo ? "page" : undefined}
                className={cn(
                  "flex items-center justify-between rounded-lg px-2.5 py-1.5 text-sm transition-colors",
                  activo
                    ? "bg-sidebar-primary font-semibold text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                {item.nombre}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
