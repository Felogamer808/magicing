import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { TemaToggle } from "@/components/TemaToggle";
import {
  registroAreas,
  seccionesDeArea,
  verificacionesDeSeccion,
} from "@/lib/verificaciones/registry";

/**
 * Portada: se elige la disciplina antes que nada.
 *
 * Hasta que entró hidráulica, acá se listaban directamente las secciones. Con dos
 * áreas que no comparten normas ni vocabulario, hacer elegir primero evita que
 * quien viene a dimensionar un colector pase por delante de seis secciones de
 * hormigón que no le sirven.
 */
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-10 px-6 py-16">
      <div className="flex items-center justify-end">
        <TemaToggle />
      </div>

      <div className="drafting-marks flex flex-col items-center gap-6 border border-border bg-card/60 px-6 py-14 text-center sm:px-10 sm:py-20">
        <h1 className="sr-only">MagicIng</h1>
        <Logo className="h-28 w-auto max-w-full sm:h-40" titulo="" />
        <p className="spec-label">Cálculo de ingeniería</p>
        <p className="max-w-xl text-muted-foreground">
          Verificaciones con el detalle de fórmulas a la vista, para poder auditar cada
          resultado. Elegí un área para empezar.
        </p>
      </div>

      <div className="space-y-3">
        <h2 className="spec-label">Áreas</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {registroAreas.map((area) => {
            const secciones = seccionesDeArea(area.id);
            const abiertas = secciones.filter((s) => s.disponible);
            const verificaciones = abiertas.reduce(
              (total, s) => total + verificacionesDeSeccion(s.id).length,
              0
            );
            /* Las normas de todas las secciones abiertas del área, sin repetir. */
            const normas = [...new Set(abiertas.flatMap((s) => s.normasDisponibles))];

            return (
              <Link key={area.id} href={area.ruta} className="group block">
                <Card className="h-full transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/40 hover:ring-primary/20 active:translate-y-0 active:scale-[0.99]">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg">{area.nombre}</CardTitle>
                      <ArrowRight className="h-4 w-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">{area.descripcion}</p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {normas.map((norma) => (
                        <Badge key={norma} variant="secondary" className="font-mono tracking-wide">
                          {norma}
                        </Badge>
                      ))}
                      <span className="text-xs text-muted-foreground">
                        {abiertas.length} {abiertas.length === 1 ? "sección" : "secciones"} ·{" "}
                        {verificaciones}{" "}
                        {verificaciones === 1 ? "verificación" : "verificaciones"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
