"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Box, Upload, X } from "lucide-react";
import { ROTULO_CLASE } from "@/lib/ifc/formato";
import { guardarIfcEnMemoria } from "@/lib/ifc/memoria";
import { incorporarIfc } from "@/lib/proyectos/modelo";
import { CLASES_IFC, type ClaseIfc, type Proyecto } from "@/lib/proyectos/tipos";

interface Resumen {
  nombreArchivo: string;
  creados: Partial<Record<ClaseIfc, number>>;
  yaEstaban: number;
  repetidos: number;
  salteados: Record<string, number>;
  sinUnidades: boolean;
}

/**
 * Botón "Importar IFC" de la vista del proyecto: lee el archivo en el
 * navegador, crea un elemento por cada pieza estructural y dice qué entró y
 * qué se salteó.
 *
 * El archivo queda en memoria para el visor; en el proyecto sólo quedan los
 * elementos con su GlobalId.
 */
export function ImportarIfc({
  proyecto,
  guardar,
}: {
  proyecto: Proyecto;
  guardar: (p: Proyecto) => void;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumen, setResumen] = useState<Resumen | null>(null);

  async function importar(archivo: File) {
    setLeyendo(true);
    setError(null);
    setResumen(null);
    try {
      const bytes = new Uint8Array(await archivo.arrayBuffer());
      // web-ifc pesa: se baja recién cuando alguien importa.
      const { leerIfc } = await import("@/lib/ifc/leer");
      const lectura = await leerIfc(bytes);
      if (lectura.elementos.length === 0 && Object.keys(lectura.salteados).length === 0) {
        setError("El archivo no trae ningún elemento. ¿Es un IFC?");
        return;
      }
      const r = incorporarIfc(proyecto, lectura.elementos);
      if (r.proyecto !== proyecto) guardar(r.proyecto);
      guardarIfcEnMemoria(proyecto.id, { nombreArchivo: archivo.name, bytes });
      setResumen({
        nombreArchivo: archivo.name,
        creados: r.creados,
        yaEstaban: r.yaEstaban,
        repetidos: r.repetidos,
        salteados: lectura.salteados,
        sinUnidades: lectura.sinUnidades,
      });
    } catch {
      setError("No se pudo leer el archivo como IFC.");
    } finally {
      setLeyendo(false);
      if (entrada.current) entrada.current.value = "";
    }
  }

  const totalCreados = Object.values(resumen?.creados ?? {}).reduce((a, n) => a + (n ?? 0), 0);
  const salteados = Object.entries(resumen?.salteados ?? {}).sort((a, b) => b[1] - a[1]);

  return (
    <>
      <input
        ref={entrada}
        type="file"
        accept=".ifc"
        className="hidden"
        onChange={(e) => {
          const archivo = e.target.files?.[0];
          if (archivo) void importar(archivo);
        }}
      />
      <button
        type="button"
        disabled={leyendo}
        onClick={() => entrada.current?.click()}
        className="flex h-9 items-center gap-2 rounded-lg border border-input px-3 text-sm transition-colors hover:bg-secondary disabled:opacity-50"
      >
        <Upload className="h-4 w-4" />
        {leyendo ? "Leyendo IFC…" : "Importar IFC"}
      </button>

      {(resumen || error) && (
        <div className="basis-full rounded-md border p-3 text-sm" role="status">
          <div className="flex items-start justify-between gap-3">
            {error ? (
              <p className="text-destructive">{error}</p>
            ) : (
              resumen && (
                <div className="space-y-1.5">
                  <p className="font-medium">
                    {resumen.nombreArchivo}: {totalCreados}{" "}
                    {totalCreados === 1 ? "elemento nuevo" : "elementos nuevos"}
                  </p>
                  {totalCreados > 0 && (
                    <p className="text-muted-foreground">
                      {CLASES_IFC.filter((c) => resumen.creados[c])
                        .map((c) => `${ROTULO_CLASE[c]}: ${resumen.creados[c]}`)
                        .join(" · ")}
                    </p>
                  )}
                  {resumen.yaEstaban > 0 && (
                    <p className="text-muted-foreground">
                      {resumen.yaEstaban === 1
                        ? "1 ya estaba en el proyecto con el mismo GlobalId: no se tocó."
                        : `${resumen.yaEstaban} ya estaban en el proyecto con el mismo GlobalId: no se tocaron.`}
                    </p>
                  )}
                  {resumen.repetidos > 0 && (
                    <p className="text-muted-foreground">
                      {resumen.repetidos === 1
                        ? "1 elemento aparece repetido en el archivo con el mismo GlobalId: entró una sola vez."
                        : `${resumen.repetidos} elementos aparecen repetidos en el archivo con el mismo GlobalId: entraron una sola vez.`}
                    </p>
                  )}
                  {salteados.length > 0 && (
                    <p className="text-muted-foreground">
                      Salteados por no ser estructura:{" "}
                      {salteados.map(([clase, n]) => `${clase} ${n}`).join(" · ")}
                    </p>
                  )}
                  {resumen.sinUnidades && (
                    <p className="text-muted-foreground">
                      No se pudieron leer las unidades de longitud del archivo: los elementos entran
                      sin sección.
                    </p>
                  )}
                  <Link
                    href={`/proyectos/${proyecto.id}/modelo`}
                    className="inline-flex items-center gap-1.5 underline underline-offset-2"
                  >
                    <Box className="h-3.5 w-3.5" />
                    Ver en 3D
                  </Link>
                </div>
              )
            )}
            <button
              type="button"
              onClick={() => {
                setResumen(null);
                setError(null);
              }}
              aria-label="Cerrar resumen"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
