"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, Download, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { TemaToggle } from "@/components/TemaToggle";
import { guardarCamposDeRuta } from "@/lib/hooks/useCampo";
import { useProyectoActivo } from "@/lib/proyectos/activo";
import { descargarProyectos, useProyectos } from "@/lib/proyectos/almacen";
import {
  actualizarProyecto,
  agregarElemento,
  contarCalculos,
  crearElemento,
  eliminarElemento,
} from "@/lib/proyectos/modelo";
import { registroVerificaciones } from "@/lib/verificaciones/registry";
import { aNumero, fmt } from "@/lib/verificaciones/formato";

/**
 * Detalle de un proyecto: sus datos, sus materiales y sus elementos.
 *
 * Los materiales viven acá y no en cada cálculo. Es lo que evita el error más
 * caro y más difícil de ver de una obra: media estructura calculada con un fck
 * y la otra media con otro, sin que nada lo delate.
 */
export default function ProyectoPage() {
  const params = useParams<{ proyecto: string }>();
  const router = useRouter();
  const { proyectos, guardar, eliminar } = useProyectos();
  const [idActivo, activar] = useProyectoActivo();
  const proyecto = proyectos.find((p) => p.id === params.proyecto);

  const [nombreElemento, setNombreElemento] = useState("");
  const [ubicacionElemento, setUbicacionElemento] = useState("");
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);

  if (!proyecto) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-12">
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No se encontró ese proyecto en este navegador. Puede estar en otra computadora: ahí hay
            que exportarlo y traerlo como archivo.
            <br />
            <Link href="/proyectos" className="mt-3 inline-block underline underline-offset-2">
              Volver a proyectos
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  const campo = (clave: "nombre" | "comitente" | "ubicacion" | "autor") => ({
    value: proyecto[clave] ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      guardar(actualizarProyecto(proyecto, { [clave]: e.target.value })),
  });

  const material = (clave: "fckMPa" | "fykMPa" | "recubrimientoM") => ({
    value: String(proyecto.materiales[clave]).replace(".", ","),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const n = aNumero(e.target.value);
      if (!Number.isFinite(n)) return;
      guardar(
        actualizarProyecto(proyecto, { materiales: { ...proyecto.materiales, [clave]: n } })
      );
    },
  });

  function agregar(e: React.FormEvent) {
    e.preventDefault();
    if (!proyecto || !nombreElemento.trim()) return;
    guardar(agregarElemento(proyecto, crearElemento(nombreElemento, ubicacionElemento)));
    setNombreElemento("");
    setUbicacionElemento("");
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-12">
      <div className="flex items-center justify-between gap-4 print:hidden">
        <Link
          href="/proyectos"
          className="flex items-center gap-2 transition-colors hover:text-primary"
          aria-label="Volver a proyectos"
        >
          <ArrowLeft className="h-4 w-4" />
          <Logo className="h-7 w-auto" titulo="" />
        </Link>
        <TemaToggle />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="spec-label">Proyecto</p>
          <h1 className="text-3xl font-semibold tracking-tight">{proyecto.nombre}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {proyecto.elementos.length}{" "}
            {proyecto.elementos.length === 1 ? "elemento" : "elementos"} · {contarCalculos(proyecto)}{" "}
            {contarCalculos(proyecto) === 1 ? "cálculo guardado" : "cálculos guardados"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {/*
            Activar el proyecto es lo que hace aparecer la barra de guardado en
            las verificaciones. Se elige una vez y queda: calculando diez vigas
            de la misma obra, preguntarlo en cada guardado es repreguntar algo
            ya contestado.
          */}
          {idActivo === proyecto.id ? (
            <span className="flex h-9 items-center gap-2 rounded-lg border border-emerald-600/40 px-3 text-sm text-emerald-700 dark:text-emerald-400">
              <Check className="h-4 w-4" />
              Proyecto activo
            </span>
          ) : (
            <button
              type="button"
              onClick={() => activar(proyecto.id)}
              className="flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-sm text-primary-foreground transition-opacity hover:opacity-90"
            >
              Trabajar en este proyecto
            </button>
          )}
          <button
            type="button"
            onClick={() => descargarProyectos([proyecto], proyecto)}
            className="flex h-9 items-center gap-2 rounded-lg border border-input px-3 text-sm transition-colors hover:bg-secondary"
          >
            <Download className="h-4 w-4" />
            Exportar
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datos de obra</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="col-span-full space-y-1.5">
              <Label htmlFor="p-nombre">Nombre</Label>
              <Input id="p-nombre" {...campo("nombre")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-comitente">Comitente</Label>
              <Input id="p-comitente" {...campo("comitente")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-ubicacion">Ubicación</Label>
              <Input id="p-ubicacion" {...campo("ubicacion")} />
            </div>
            <div className="col-span-full space-y-1.5">
              <Label htmlFor="p-autor">Autor del cálculo</Label>
              <Input id="p-autor" {...campo("autor")} />
            </div>
            <p className="col-span-full text-xs text-muted-foreground">
              Van a la portada de la memoria de cálculo.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Materiales de la obra</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="p-fck">
                fck <span className="text-muted-foreground">(MPa)</span>
              </Label>
              <Input id="p-fck" inputMode="decimal" {...material("fckMPa")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-fyk">
                fyk <span className="text-muted-foreground">(MPa)</span>
              </Label>
              <Input id="p-fyk" inputMode="decimal" {...material("fykMPa")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-rec">
                Recubrimiento <span className="text-muted-foreground">(m)</span>
              </Label>
              <Input id="p-rec" inputMode="decimal" {...material("recubrimientoM")} />
            </div>
            <p className="col-span-full text-xs text-muted-foreground">
              Se cargan una vez y los heredan los elementos del proyecto. Evita el error de calcular
              media obra con un hormigón y la otra media con otro sin que nada lo delate.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Elementos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={agregar} className="flex flex-wrap items-end gap-3">
            <div className="min-w-[10rem] flex-1 space-y-1.5">
              <Label htmlFor="e-nombre">Nombre</Label>
              <Input
                id="e-nombre"
                value={nombreElemento}
                onChange={(e) => setNombreElemento(e.target.value)}
                placeholder="V-203"
              />
            </div>
            <div className="min-w-[10rem] flex-1 space-y-1.5">
              <Label htmlFor="e-ubicacion">Ubicación</Label>
              <Input
                id="e-ubicacion"
                value={ubicacionElemento}
                onChange={(e) => setUbicacionElemento(e.target.value)}
                placeholder="Nivel 4"
              />
            </div>
            <button
              type="submit"
              disabled={!nombreElemento.trim()}
              className="flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-sm text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
              Agregar
            </button>
          </form>

          {proyecto.elementos.length === 0 ? (
            <p className="rounded-md border p-3 text-xs text-muted-foreground">
              Todavía no hay elementos. Agregá el primero —una viga, un pilar, una zapata— y después
              vas a poder guardarle cálculos desde cada verificación.
            </p>
          ) : (
            <ul className="space-y-2">
              {proyecto.elementos.map((elemento) => (
                <li
                  key={elemento.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {elemento.nombre}
                      {elemento.ubicacion && (
                        <span className="text-muted-foreground"> · {elemento.ubicacion}</span>
                      )}
                    </p>
                    {elemento.calculos.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Sin cálculos todavía</p>
                    ) : (
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {elemento.calculos.map((calculo) => {
                          const meta = registroVerificaciones.find(
                            (v) => v.id === calculo.verificacion
                          );
                          if (!meta) {
                            return (
                              <Badge key={calculo.id} variant="outline">
                                {calculo.verificacion} (ya no existe)
                              </Badge>
                            );
                          }
                          return (
                            <button
                              key={calculo.id}
                              type="button"
                              onClick={() => {
                                // Reabrir es volver a escribir los campos en su
                                // ruta y navegar: el resultado se recalcula con
                                // el motor de hoy, no se guarda congelado.
                                guardarCamposDeRuta(meta.ruta, calculo.campos);
                                activar(proyecto.id);
                                router.push(meta.ruta);
                              }}
                              className="flex items-center gap-1 rounded-md border border-input px-2 py-0.5 text-xs transition-colors hover:border-primary/40 hover:bg-secondary"
                            >
                              <Pencil className="h-3 w-3" />
                              {meta.nombre}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => guardar(eliminarElemento(proyecto, elemento.id))}
                    className="flex h-8 items-center gap-1.5 rounded-lg border border-input px-2.5 text-xs text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
                    aria-label={`Eliminar ${elemento.nombre}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Eliminar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
        <p className="text-xs text-muted-foreground">
          Última edición: {new Date(proyecto.editado).toLocaleString("es-AR")}
        </p>
        {confirmandoBorrado ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-destructive">
              Se borra el proyecto con sus {contarCalculos(proyecto)} cálculos. ¿Seguro?
            </span>
            <Link
              href="/proyectos"
              onClick={() => eliminar(proyecto.id)}
              className="flex h-8 items-center rounded-lg border border-destructive/40 px-2.5 text-xs text-destructive transition-colors hover:bg-destructive/10"
            >
              Sí, borrar
            </Link>
            <button
              type="button"
              onClick={() => setConfirmandoBorrado(false)}
              className="flex h-8 items-center rounded-lg border border-input px-2.5 text-xs transition-colors hover:bg-secondary"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmandoBorrado(true)}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-input px-2.5 text-xs text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Borrar proyecto
          </button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Valores de referencia del proyecto: H-{fmt(proyecto.materiales.fckMPa, 0)} · B
        {fmt(proyecto.materiales.fykMPa, 0)} · recubrimiento{" "}
        {fmt(proyecto.materiales.recubrimientoM * 100, 1)} cm.
      </p>
    </main>
  );
}
