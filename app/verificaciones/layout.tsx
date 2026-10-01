import Link from "next/link";
import { Logo } from "@/components/Logo";
import { TemaToggle } from "@/components/TemaToggle";
import { BarraMovil } from "@/components/verificaciones/comun/BarraMovil";
import { NavVerificaciones } from "@/components/verificaciones/comun/NavVerificaciones";
import { PieVerificacion } from "@/components/verificaciones/comun/PieVerificacion";

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

      {/*
        El pie va acá y no en cada página: son 42 y un aviso que hay que
        acordarse de poner es un aviso que alguna no tiene. Además se imprime,
        que es donde más falta hace.
      */}
      <div className="esquemas-acotados flex min-w-0 flex-1 flex-col">
        <div className="flex-1">{children}</div>
        <PieVerificacion />
      </div>
    </div>
  );
}
