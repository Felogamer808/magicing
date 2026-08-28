"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { agruparPorCategoria, verificacionesDeSeccion } from "@/lib/verificaciones/registry";

/** Quita tildes para que "fisuracion" encuentre "Fisuración". */
function normalizar(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function IndiceVerificaciones({ seccion }: { seccion: string }) {
  const [consulta, setConsulta] = useState("");

  const { categorias, total } = useMemo(() => {
    const q = normalizar(consulta.trim());
    const coincide = (t: string) => normalizar(t).includes(q);
    const deLaSeccion = verificacionesDeSeccion(seccion);

    const filtradas = q
      ? deLaSeccion.filter(
          (v) =>
            coincide(v.nombre) ||
            coincide(v.categoria) ||
            coincide(v.descripcion) ||
            v.normasDisponibles.some(coincide)
        )
      : deLaSeccion;

    return { categorias: agruparPorCategoria(filtradas), total: filtradas.length };
  }, [consulta, seccion]);

  return (
    <>
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
          placeholder="Buscar verificación, categoría o norma"
          aria-label="Buscar verificación"
          className="h-9 pl-8"
        />
      </div>

      {total === 0 ? (
        <p className="text-sm text-muted-foreground">
          Ninguna verificación coincide con <span className="font-medium text-foreground">{consulta}</span>.
        </p>
      ) : (
        <div className="space-y-8">
          {categorias.map(([categoria, items]) => (
            <section key={categoria} className="space-y-3">
              <h2 className="spec-label">{categoria}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {items.map((item) => {
                  const contenido = (
                    <Card
                      className={
                        item.disponible
                          ? "h-full transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/40 hover:ring-primary/20 active:translate-y-0 active:scale-[0.99]"
                          : "h-full opacity-60"
                      }
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base">{item.nombre}</CardTitle>
                          {item.disponible ? (
                            <ArrowRight className="h-4 w-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" />
                          ) : (
                            <Badge variant="outline" className="shrink-0">
                              Próximamente
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-sm text-muted-foreground">{item.descripcion}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {item.normasDisponibles.map((norma) => (
                            <Badge key={norma} variant="secondary" className="font-mono tracking-wide">
                              {norma}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );

                  return item.disponible ? (
                    <Link key={item.id} href={item.ruta} className="group block">
                      {contenido}
                    </Link>
                  ) : (
                    <div key={item.id}>{contenido}</div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
