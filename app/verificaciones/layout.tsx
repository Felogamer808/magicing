import Link from "next/link";
import { Logo } from "@/components/Logo";
import { TemaToggle } from "@/components/TemaToggle";
import { BarraMovil } from "@/components/verificaciones/comun/BarraMovil";
import { NavVerificaciones } from "@/components/verificaciones/comun/NavVerificaciones";

export default function VerificacionesLayout({ children }: LayoutProps<"/verificaciones">) {
  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <BarraMovil />

      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar md:block">
        <div className="sticky top-0 flex h-screen flex-col overflow-y-auto p-4">
          <div className="mb-6 flex items-center justify-between gap-2 px-2">
            <Link href="/" aria-label="MagicIng — inicio">
              <Logo className="h-7 w-auto" titulo="" />
            </Link>
            <TemaToggle />
          </div>
          <NavVerificaciones />
        </div>
      </aside>

      <div className="esquemas-acotados min-w-0 flex-1">{children}</div>
    </div>
  );
}
