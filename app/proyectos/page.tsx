"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Download, FolderPlus, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { TemaToggle } from "@/components/TemaToggle";
import { descargarProyectos, useProyectos } from "@/lib/proyectos/almacen";
import { contarCalculos, crearProyecto, leerArchivo } from "@/lib/proyectos/modelo";

/**
 * Lista de proyectos.
 *
 * Los proyectos viven en este navegador. Mientras no haya cuentas, el archivo
 * exportable no es una comodidad: es la única forma de llevarse un proyecto a
 * otra computadora o de archivarlo junto al expediente, así que exportar e
 * importar están acá arriba y no escondidos en un menú.
 */
export default function ProyectosPage() {
  const { proyectos, guardar, importar } = useProyectos();
  const [nombre, setNombre] = useState("");
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const archivo = useRef<HTMLInputElement>(null);

  function nuevo(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;
    guardar(crearProyecto(nombre));
    setNombre("");
    setAviso(null);
  }

  async function alElegirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const resultado = leerArchivo(await f.text());
    if (resultado.ok) importar(resultado.proyectos);
    setAviso({ ok: resultado.ok, texto: resultado.mensaje });
    // Se limpia para poder volver a elegir el mismo archivo si hizo falta corregirlo.
    e.target.value = "";
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-12">
      <div className="flex items-center justify-between gap-4">
        <Link href="/" aria-label="MagicIng — inicio">
          <Logo className="h-7 w-auto" titulo="" />
        </Link>
        <TemaToggle />
      </div>

      <div>
        <p className="spec-label">Obra por obra</p>
        <h1 className="text-3xl font-semibold tracking-tight">Proyectos</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Un proyecto junta los elementos de una obra —la V-203 del nivel 4, la Z-8 del eje C— con
          los cálculos de cada uno, para poder volver mañana a revisarlos y, al final, sacar la
          memoria de cálculo completa.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Proyecto nuevo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={nuevo} className="flex flex-wrap items-end gap-3">
            <div className="min-w-[16rem] flex-1 space-y-1.5">
              <Label htmlFor="nombre-proyecto">Nombre de la obra</Label>
              <Input
                id="nombre-proyecto"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Edificio Los Cedros"
              />
            </div>
            <button
              type="submit"
              disabled={!nombre.trim()}
              className="flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-sm text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              <FolderPlus className="h-4 w-4" />
              Crear
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
            <button
              type="button"
              onClick={() => archivo.current?.click()}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-input px-2.5 text-sm transition-colors hover:bg-secondary"
            >
              <Upload className="h-4 w-4" />
              Importar de un archivo
            </button>
            <button
              type="button"
              onClick={() => descargarProyectos(proyectos)}
              disabled={proyectos.length === 0}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-input px-2.5 text-sm transition-colors hover:bg-secondary disabled:opacity-40"
            >
              <Download className="h-4 w-4" />
              Exportar todos
            </button>
            <input
              ref={archivo}
              type="file"
              accept="application/json,.json"
              onChange={alElegirArchivo}
              className="hidden"
              aria-label="Archivo de proyectos a importar"
            />
          </div>

          {aviso && (
            <p
              className={`rounded-md border p-3 text-xs ${
                aviso.ok ? "text-muted-foreground" : "border-destructive/40 text-destructive"
              }`}
              role="status"
            >
              {aviso.texto}
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            Los proyectos se guardan en este navegador. Todavía no hay cuentas, así que para
            abrirlos en otra computadora —o para archivarlos con el expediente— hay que exportarlos
            a un archivo.
          </p>
        </CardContent>
      </Card>

      {proyectos.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Todavía no hay ningún proyecto. Creá el primero arriba, o importá un archivo.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <h2 className="spec-label">
            {proyectos.length} {proyectos.length === 1 ? "proyecto" : "proyectos"}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {proyectos.map((p) => (
              <Link key={p.id} href={`/proyectos/${p.id}`} className="group block">
                <Card className="h-full transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/40 hover:ring-primary/20">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{p.nombre}</CardTitle>
                      <ArrowRight className="h-4 w-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {p.ubicacion && (
                      <p className="text-sm text-muted-foreground">{p.ubicacion}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary" className="font-mono tracking-wide">
                        H-{p.materiales.fckMPa}
                      </Badge>
                      <Badge variant="secondary" className="font-mono tracking-wide">
                        B{p.materiales.fykMPa}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {p.elementos.length}{" "}
                        {p.elementos.length === 1 ? "elemento" : "elementos"} ·{" "}
                        {contarCalculos(p)}{" "}
                        {contarCalculos(p) === 1 ? "cálculo" : "cálculos"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
