import type { Metadata } from "next";
import { IndiceVerificaciones } from "@/components/IndiceVerificaciones";

/**
 * Catálogo completo, al que lleva "Verificaciones" en la barra lateral.
 *
 * Cada sección ya tiene su índice; éste existe para buscar sin saber de antemano
 * en qué material está lo que se busca.
 */
export const metadata: Metadata = {
  title: "Verificaciones",
  description: "Todas las verificaciones de MagicIng, agrupadas por sección y con buscador.",
};

export default function PaginaVerificaciones() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-6 py-12">
      <div>
        <p className="spec-label">Catálogo completo</p>
        <h1 className="text-3xl font-semibold tracking-tight">Verificaciones</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Todas las verificaciones, agrupadas por sección. El buscador encuentra por nombre,
          categoría o norma.
        </p>
      </div>

      <IndiceVerificaciones />
    </main>
  );
}
