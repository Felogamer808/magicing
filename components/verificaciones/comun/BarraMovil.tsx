"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/Logo";
import { TemaToggle } from "@/components/TemaToggle";
import { NavVerificaciones } from "@/components/verificaciones/comun/NavVerificaciones";

/**
 * Barra superior sólo para pantallas chicas: en el escritorio la navegación vive
 * en la barra lateral fija, que en el teléfono no entra. Sin esto no habría
 * forma de pasar de una verificación a otra desde el celular.
 */
export function BarraMovil() {
  const [abierto, setAbierto] = useState(false);

  return (
    <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-sidebar-border bg-sidebar/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-sidebar/80 md:hidden">
      <Sheet open={abierto} onOpenChange={setAbierto}>
        <SheetTrigger
          aria-label="Abrir el índice de verificaciones"
          className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:bg-sidebar-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <Menu className="h-4 w-4" />
        </SheetTrigger>
        <SheetContent side="left" className="w-[85vw] max-w-xs overflow-y-auto p-4">
          <SheetTitle className="sr-only">Índice de verificaciones</SheetTitle>
          <Link
            href="/"
            onClick={() => setAbierto(false)}
            className="mb-6 block px-2"
            aria-label="MagicIng — inicio"
          >
            <Logo className="h-7 w-auto" titulo="" />
          </Link>
          <NavVerificaciones onNavegar={() => setAbierto(false)} />
        </SheetContent>
      </Sheet>

      <Link href="/" aria-label="MagicIng — inicio">
        <Logo className="h-7 w-auto" titulo="" />
      </Link>

      <div className="ml-auto">
        <TemaToggle />
      </div>
    </header>
  );
}
