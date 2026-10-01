import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { GrillaSecciones } from "@/components/GrillaSecciones";
import { Logo } from "@/components/Logo";
import { TemaToggle } from "@/components/TemaToggle";
import { buscarArea, registroAreas, seccionesDeArea } from "@/lib/verificaciones/registry";

export function generateStaticParams() {
  return registroAreas.map((a) => ({ area: a.id }));
}

export async function generateMetadata({ params }: PageProps<"/areas/[area]">) {
  const area = buscarArea((await params).area);
  if (!area) return {};
  return { title: area.nombre, description: area.descripcion };
}

/**
 * Secciones de un área. Es la grilla que antes vivía en la portada: al entrar
 * hidráulica, la portada pasó a elegir disciplina y este listado bajó un nivel.
 */
export default async function PaginaArea({ params }: PageProps<"/areas/[area]">) {
  const area = buscarArea((await params).area);
  if (!area) notFound();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-10 px-6 py-16">
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/"
          className="flex items-center gap-2 transition-colors hover:text-primary"
          aria-label="Volver al inicio de MagicIng"
        >
          <ArrowLeft className="h-4 w-4" />
          <Logo className="h-7 w-auto" titulo="" />
        </Link>
        <TemaToggle />
      </div>

      <div className="drafting-marks flex flex-col gap-3 border border-border bg-card/60 px-6 py-8 sm:px-10 sm:py-10">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{area.nombre}</h1>
        <p className="max-w-2xl text-muted-foreground">{area.descripcion}</p>
      </div>

      <GrillaSecciones secciones={seccionesDeArea(area.id)} />

    </main>
  );
}
