import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { agruparPorCategoria, registroVerificaciones } from "@/lib/verificaciones/registry";

export default function VerificacionesLayout({ children }: LayoutProps<"/verificaciones">) {
  const categorias = agruparPorCategoria(registroVerificaciones);

  return (
    <div className="flex flex-1">
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar md:block">
        <div className="sticky top-0 flex h-screen flex-col overflow-y-auto p-4">
          <Link href="/" className="mb-6 flex items-center gap-2 px-2 text-sm font-semibold tracking-tight">
            <span className="flex h-5 w-5 items-center justify-center border border-primary font-mono text-[11px] text-primary">
              §
            </span>
            MagicIng
          </Link>
          <nav className="space-y-6">
            {categorias.map(([categoria, items]) => (
              <div key={categoria} className="space-y-1">
                <p className="spec-label px-2">{categoria}</p>
                {items.map((item) =>
                  item.disponible ? (
                    <Link
                      key={item.id}
                      href={item.ruta}
                      className="flex items-center justify-between rounded-md border-l-2 border-transparent px-2 py-1.5 text-sm text-foreground/80 hover:border-primary hover:bg-sidebar-accent hover:text-foreground"
                    >
                      {item.nombre}
                    </Link>
                  ) : (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm text-muted-foreground/50"
                    >
                      <span>{item.nombre}</span>
                      <Badge variant="outline" className="text-[10px]">
                        Pronto
                      </Badge>
                    </div>
                  )
                )}
              </div>
            ))}
          </nav>
        </div>
      </aside>
      <div className="flex-1">{children}</div>
    </div>
  );
}
