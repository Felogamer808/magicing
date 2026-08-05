"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { agruparPorCategoria, registroVerificaciones } from "@/lib/verificaciones/registry";

interface NavVerificacionesProps {
  /** Se dispara al elegir una verificación; el drawer móvil lo usa para cerrarse. */
  onNavegar?: () => void;
}

export function NavVerificaciones({ onNavegar }: NavVerificacionesProps) {
  const pathname = usePathname();
  const categorias = agruparPorCategoria(registroVerificaciones);

  return (
    <nav className="space-y-6">
      {categorias.map(([categoria, items]) => (
        <div key={categoria} className="space-y-1">
          <p className="spec-label px-2">{categoria}</p>
          {items.map((item) => {
            if (!item.disponible) {
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground/60"
                >
                  <span>{item.nombre}</span>
                  <Badge variant="outline" className="shrink-0 text-[10px]">
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
                  "flex items-center justify-between rounded-md border-l-2 px-2 py-1.5 text-sm transition-colors",
                  activo
                    ? "border-primary bg-sidebar-accent font-medium text-foreground"
                    : "border-transparent text-foreground/80 hover:border-primary/40 hover:bg-sidebar-accent/60 hover:text-foreground"
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
