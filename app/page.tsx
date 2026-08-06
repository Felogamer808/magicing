import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { TemaToggle } from "@/components/TemaToggle";
import { registroSecciones, verificacionesDeSeccion } from "@/lib/verificaciones/registry";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-16">
      <div className="flex items-center justify-end">
        <TemaToggle />
      </div>

      <div className="drafting-marks flex flex-col items-center gap-6 border border-border bg-card/60 px-6 py-14 text-center sm:px-10 sm:py-20">
        <h1 className="sr-only">MagicIng</h1>
        <Logo className="h-28 w-auto max-w-full sm:h-40" titulo="" />
        <p className="spec-label">Cálculo estructural</p>
        <p className="max-w-xl text-muted-foreground">
          Verificaciones con el detalle de fórmulas a la vista, para poder auditar cada
          resultado. Elegí una sección para empezar.
        </p>
      </div>

      <div className="space-y-3">
        <h2 className="spec-label">Secciones</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {registroSecciones.map((seccion) => {
            const cantidad = verificacionesDeSeccion(seccion.id).length;

            const contenido = (
              <Card
                className={
                  seccion.disponible
                    ? "h-full transition-colors hover:border-primary/40 hover:ring-primary/20"
                    : "h-full opacity-60"
                }
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg">{seccion.nombre}</CardTitle>
                    {seccion.disponible ? (
                      <ArrowRight className="h-4 w-4 shrink-0 text-primary" />
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
              <Link key={seccion.id} href={seccion.ruta} className="block">
                {contenido}
              </Link>
            ) : (
              <div key={seccion.id}>{contenido}</div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
