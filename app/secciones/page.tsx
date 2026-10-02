import type { Metadata } from "next";
import { GrillaSecciones } from "@/components/GrillaSecciones";
import { registroSecciones } from "@/lib/verificaciones/registry";

/** Las secciones por material, a las que lleva "Secciones" en la barra lateral. */
export const metadata: Metadata = {
  title: "Secciones",
  description: "Las secciones de MagicIng por material, cada una con sus verificaciones.",
};

export default function PaginaSecciones() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-6 py-12">
      <div>
        <p className="spec-label">Por material</p>
        <h1 className="text-3xl font-semibold tracking-tight">Secciones</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Cada sección junta las verificaciones de un material o de una etapa del cálculo.
        </p>
      </div>

      <GrillaSecciones secciones={registroSecciones} />
    </main>
  );
}
