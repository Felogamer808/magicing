import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { IndiceVerificaciones } from "@/components/IndiceVerificaciones";
import { TemaToggle } from "@/components/TemaToggle";
import { buscarSeccion, registroSecciones } from "@/lib/verificaciones/registry";

export function generateStaticParams() {
  return registroSecciones
    .filter((s) => s.disponible)
    .map((s) => ({ seccion: s.id }));
}

export async function generateMetadata({ params }: PageProps<"/secciones/[seccion]">) {
  const seccion = buscarSeccion((await params).seccion);
  if (!seccion) return {};
  return { title: seccion.nombre, description: seccion.descripcion };
}

export default async function PaginaSeccion({ params }: PageProps<"/secciones/[seccion]">) {
  const seccion = buscarSeccion((await params).seccion);

  // Una sección todavía sin abrir no tiene página propia: no hay nada que listar.
  if (!seccion || !seccion.disponible) notFound();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-16">
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold tracking-tight transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          MagicIng
        </Link>
        <TemaToggle />
      </div>

      <div className="drafting-marks flex flex-col gap-3 border border-border bg-card/60 px-6 py-8 sm:px-10 sm:py-10">
        <p className="spec-label">{seccion.normasDisponibles.join(" · ")}</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{seccion.nombre}</h1>
        <p className="max-w-2xl text-muted-foreground">{seccion.descripcion}</p>
      </div>

      <IndiceVerificaciones seccion={seccion.id} />
    </main>
  );
}
