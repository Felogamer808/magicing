import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { TemaToggle } from "@/components/TemaToggle";
import {
  agruparPorGrupo,
  buscarArea,
  registroAreas,
  seccionesDeArea,
  verificacionesDeSeccion,
} from "@/lib/verificaciones/registry";

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

  const grupos = agruparPorGrupo(seccionesDeArea(area.id));

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

      {grupos.map(([grupo, secciones]) => (
        <div key={grupo} className="space-y-3">
          <h2 className="spec-label">{grupo}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {secciones.map((seccion) => {
              const cantidad = verificacionesDeSeccion(seccion.id).length;

              const contenido = (
                <Card
                  className={
                    seccion.disponible
                      ? "h-full transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/40 hover:ring-primary/20 active:translate-y-0 active:scale-[0.99]"
                      : "h-full opacity-60"
                  }
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg">{seccion.nombre}</CardTitle>
                      {seccion.disponible ? (
                        <ArrowRight className="h-4 w-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" />
                      ) : (
                        <Badge variant="outline" className="shrink-0">
                          Próximamente
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">{seccion.descripcion}</p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {seccion.normasDisponibles.map((norma) => (
                        <Badge key={norma} variant="secondary" className="font-mono tracking-wide">
                          {norma}
                        </Badge>
                      ))}
                      {seccion.disponible && (
                        <span className="text-xs text-muted-foreground">
                          {cantidad} {cantidad === 1 ? "verificación" : "verificaciones"}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );

              return seccion.disponible ? (
                <Link key={seccion.id} href={seccion.ruta} className="group block">
                  {contenido}
                </Link>
              ) : (
                <div key={seccion.id}>{contenido}</div>
              );
            })}
          </div>
        </div>
      ))}
    </main>
  );
}
