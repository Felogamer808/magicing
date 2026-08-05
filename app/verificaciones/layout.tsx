import Link from "next/link";
import { TemaToggle } from "@/components/TemaToggle";
import { BarraMovil } from "@/components/verificaciones/BarraMovil";
import { NavVerificaciones } from "@/components/verificaciones/NavVerificaciones";

export default function VerificacionesLayout({ children }: LayoutProps<"/verificaciones">) {
  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <BarraMovil />

      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar md:block">
        <div className="sticky top-0 flex h-screen flex-col overflow-y-auto p-4">
          <div className="mb-6 flex items-center justify-between gap-2 px-2">
            <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
              <span className="flex h-5 w-5 items-center justify-center border border-primary font-mono text-[11px] text-primary">
                §
              </span>
              MagicIng
            </Link>
            <TemaToggle />
          </div>
          <NavVerificaciones />
        </div>
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
