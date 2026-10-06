import { nombreNorma } from "@/lib/verificaciones/validacion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { GrillaSecciones } from "@/components/GrillaSecciones";
import { HeroResumen } from "@/components/shell/HeroResumen";
import {
  registroAreas,
  registroVerificaciones,
  seccionesDeArea,
} from "@/lib/verificaciones/registry";
import { validacionDe } from "@/lib/verificaciones/validacion";

/**
 * Resumen: la portada de la herramienta.
 *
 * Arranca por el bloque destacado con el estado del proyecto activo y sigue por
 * la biblioteca: las verificaciones auditadas primero, que son con las que
 * conviene empezar, y después las secciones completas.
 */

/** Las que están repasadas artículo por artículo son las que se ofrecen primero. */
const DESTACADAS = registroVerificaciones.filter(
  (v) => v.disponible && validacionDe(v.id).nivel === "auditada"
);

export default function Home() {
  const areaUnica = registroAreas[0];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-8 sm:px-6 sm:py-10">
      <HeroResumen />

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Biblioteca de verificaciones
            </p>
            <h2 className="mt-1 text-2xl">¿Qué necesitás verificar?</h2>
          </div>
          <span className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--exito)]" />
            {DESTACADAS.length} auditadas contra el articulado
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DESTACADAS.map((v, i) => (
            <Link key={v.id} href={v.ruta} className="group block">
              <Card className="h-full transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                <CardContent className="flex h-full flex-col gap-3 pt-6">
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-sm font-bold text-accent-foreground">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base">{v.nombre}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {v.descripcion}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-3">
                    {v.normasDisponibles.map((norma) => (
                      <Badge key={norma} variant="secondary" className="font-mono tracking-wide">
                        {nombreNorma(norma)}
                      </Badge>
                    ))}
                    <span className="text-xs text-muted-foreground">{v.categoria}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Todo el catálogo
          </p>
          <h2 className="mt-1 text-2xl">Por material</h2>
        </div>
        <GrillaSecciones secciones={seccionesDeArea(areaUnica.id)} />
      </section>

      <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
        MagicIng es una herramienta de verificación: no reemplaza el criterio del proyectista ni la
        firma de un técnico habilitado, y el resultado no vale como memoria de cálculo por sí solo.{" "}
        <Link href="/alcance" className="underline underline-offset-2 hover:text-foreground">
          Alcance y responsabilidad
        </Link>
        .
      </p>
    </main>
  );
}
