import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { agruparPorGrupo, verificacionesDeSeccion, type SeccionMeta } from "@/lib/verificaciones/registry";

/**
 * Grilla de secciones agrupadas por su subtítulo.
 *
 * Estaba escrita dentro de la página de área. Se extrajo cuando la portada pasó
 * a mostrar las secciones directamente —al quedar una sola disciplina, elegirla
 * era un clic que no decide nada—, para que las dos vistas no tengan cada una su
 * copia de las mismas tarjetas.
 */
export function GrillaSecciones({ secciones }: { secciones: SeccionMeta[] }) {
  return (
    <>
      {agruparPorGrupo(secciones).map(([grupo, delGrupo]) => (
        <div key={grupo} className="space-y-3">
          <h2 className="spec-label">{grupo}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {delGrupo.map((seccion) => {
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
    </>
  );
}
