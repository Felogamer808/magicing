import Link from "next/link";
import { ArrowRight, FolderOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GrillaSecciones } from "@/components/GrillaSecciones";
import { Logo } from "@/components/Logo";
import { TemaToggle } from "@/components/TemaToggle";
import {
  registroAreas,
  seccionesDeArea,
  verificacionesDeSeccion,
} from "@/lib/verificaciones/registry";

/**
 * Portada.
 *
 * El nivel de áreas se agregó cuando entró hidráulica: dos disciplinas que no
 * comparten normas ni vocabulario, y hacer elegir primero evitaba que quien
 * venía a dimensionar un colector pasara por delante de seis secciones de
 * hormigón. Al quedar una sola disciplina ese nivel pasó a ser un clic que no
 * decide nada, así que la portada vuelve a listar las secciones directamente.
 *
 * La condición es por cantidad y no por haber borrado la arquitectura: el
 * registro de áreas sigue existiendo y `/areas/[area]` sigue andando. El día
 * que entre una segunda disciplina, la portada vuelve sola a elegir área.
 * Dejarlo así cuesta unas pocas líneas y evita rehacer la navegación.
 */
export default function Home() {
  const hayVariasAreas = registroAreas.length > 1;
  const areaUnica = registroAreas[0];

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
          Verificaciones con el detalle de fórmulas a la vista, para poder auditar cada resultado.
          {hayVariasAreas ? " Elegí un área para empezar." : " Elegí un material para empezar."}
        </p>
        {/*
          El alcance se ofrece desde la portada y no sólo desde el pie de cada
          verificación. Que el resultado venga con artículo y página es lo que lo
          hace creíble, y por eso mismo hay que decir de entrada hasta dónde
          llega esa comprobación: la confianza que no se acota es la que termina
          sustituyendo al repaso.
        */}
        {/*
          Dos caminos desde la portada, y son distintos a propósito: entrar por
          el material es calcular algo suelto; entrar por el proyecto es seguir
          una obra. El segundo va como botón porque es el que acumula trabajo.
        */}
        <Link
          href="/proyectos"
          className="flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm text-primary-foreground transition-opacity hover:opacity-90"
        >
          <FolderOpen className="h-4 w-4" />
          Mis proyectos
        </Link>
        <Link
          href="/alcance"
          className="text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
        >
          Qué respalda cada número, y qué no
        </Link>
      </div>

      {hayVariasAreas ? (
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
      ) : (
        <GrillaSecciones secciones={seccionesDeArea(areaUnica.id)} />
      )}

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
