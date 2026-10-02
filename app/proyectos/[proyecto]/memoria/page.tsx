"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { PRESENTADORES } from "@/components/memoria/presentadores";
import { useProyectos } from "@/lib/proyectos/almacen";
import { contarCalculos } from "@/lib/proyectos/modelo";
import { registroVerificaciones } from "@/lib/verificaciones/registry";
import { NIVELES_VALIDACION, validacionDe } from "@/lib/verificaciones/validacion";
import { fmt } from "@/lib/verificaciones/formato";

/**
 * Memoria de cálculo del proyecto: un documento, no una pantalla.
 *
 * Portada, índice, un capítulo por elemento con sus comprobaciones y el
 * desarrollo de fórmulas, y el alcance al cierre. Se imprime a PDF con la hoja
 * de impresión que el sitio ya tenía, así que no hay un segundo formato que
 * mantener sincronizado con lo que se ve.
 *
 * Los cálculos se vuelven a correr con el motor de hoy a partir de los datos
 * guardados, usando el mismo resolver que la pantalla. Lo que no tiene
 * presentador todavía **se declara**: un capítulo que falta sin aviso es un
 * elemento que parece no haberse calculado.
 */
export default function MemoriaPage() {
  const params = useParams<{ proyecto: string }>();
  const { proyectos } = useProyectos();
  const proyecto = proyectos.find((p) => p.id === params.proyecto);

  if (!proyecto) {
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-12">
        <p className="rounded-md border p-4 text-sm text-muted-foreground">
          No se encontró ese proyecto en este navegador.{" "}
          <Link href="/proyectos" className="underline underline-offset-2">
            Volver a proyectos
          </Link>
        </p>
      </main>
    );
  }

  const conCalculos = proyecto.elementos.filter((e) => e.calculos.length > 0);
  const sinCubrir = [
    ...new Set(
      proyecto.elementos.flatMap((e) =>
        e.calculos.filter((c) => !PRESENTADORES[c.verificacion]).map((c) => c.verificacion)
      )
    ),
  ];

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12 print:max-w-none print:px-0 print:py-0">
      <div className="mb-8 flex items-center justify-between gap-4 print:hidden">
        <Link
          href={`/proyectos/${proyecto.id}`}
          className="flex items-center gap-2 text-sm transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al proyecto
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-sm text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Printer className="h-4 w-4" />
          Imprimir o guardar como PDF
        </button>
      </div>

      {/* Portada */}
      <header className="border-b border-border pb-8">
        <p className="spec-label">Memoria de cálculo</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{proyecto.nombre}</h1>
        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {proyecto.comitente && (
            <>
              <dt className="text-muted-foreground">Comitente</dt>
              <dd>{proyecto.comitente}</dd>
            </>
          )}
          {proyecto.ubicacion && (
            <>
              <dt className="text-muted-foreground">Ubicación</dt>
              <dd>{proyecto.ubicacion}</dd>
            </>
          )}
          {proyecto.autor && (
            <>
              <dt className="text-muted-foreground">Autor del cálculo</dt>
              <dd>{proyecto.autor}</dd>
            </>
          )}
          <dt className="text-muted-foreground">Fecha de emisión</dt>
          <dd>{new Date().toLocaleDateString("es-AR")}</dd>
          <dt className="text-muted-foreground">Materiales</dt>
          <dd className="font-mono">
            H-{fmt(proyecto.materiales.fckMPa, 0)} · B{fmt(proyecto.materiales.fykMPa, 0)} ·
            recubrimiento {fmt(proyecto.materiales.recubrimientoM * 100, 1)} cm
          </dd>
          <dt className="text-muted-foreground">Alcance</dt>
          <dd>
            {proyecto.elementos.length}{" "}
            {proyecto.elementos.length === 1 ? "elemento" : "elementos"} ·{" "}
            {contarCalculos(proyecto)}{" "}
            {contarCalculos(proyecto) === 1 ? "cálculo" : "cálculos"}
          </dd>
        </dl>
      </header>

      {conCalculos.length === 0 ? (
        <p className="mt-8 rounded-md border p-4 text-sm text-muted-foreground">
          El proyecto todavía no tiene ningún cálculo guardado. Entrá a una verificación con este
          proyecto activo y guardala en un elemento.
        </p>
      ) : (
        <>
          {/* Índice */}
          <section className="mt-8 break-inside-avoid">
            <h2 className="spec-label">Índice</h2>
            <ol className="mt-2 space-y-1 text-sm">
              {conCalculos.map((elemento, i) => (
                <li key={elemento.id} className="flex gap-2">
                  <span className="font-mono text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>
                    {elemento.nombre}
                    {elemento.ubicacion && ` · ${elemento.ubicacion}`}
                    <span className="text-muted-foreground">
                      {" "}
                      —{" "}
                      {elemento.calculos
                        .map(
                          (c) =>
                            registroVerificaciones.find((v) => v.id === c.verificacion)?.nombre ??
                            c.verificacion
                        )
                        .join(", ")}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </section>

          {/* Capítulos */}
          {conCalculos.map((elemento, i) => (
            <section key={elemento.id} className="mt-10 break-before-page first:break-before-auto">
              <h2 className="text-xl font-semibold tracking-tight">
                <span className="font-mono text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>{" "}
                {elemento.nombre}
                {elemento.ubicacion && (
                  <span className="text-muted-foreground"> · {elemento.ubicacion}</span>
                )}
              </h2>
              {elemento.nota && <p className="mt-1 text-sm text-muted-foreground">{elemento.nota}</p>}

              {elemento.calculos.map((calculo) => {
                const meta = registroVerificaciones.find((v) => v.id === calculo.verificacion);
                const presentador = PRESENTADORES[calculo.verificacion];
                const capitulo = presentador ? presentador(calculo.campos) : null;
                const validacion = meta ? validacionDe(meta.id) : null;

                return (
                  <article key={calculo.id} className="mt-6 break-inside-avoid-page">
                    <h3 className="border-b border-border pb-1 text-base font-medium">
                      {meta?.nombre ?? calculo.verificacion}
                      {meta && (
                        <span className="ml-2 font-mono text-xs text-muted-foreground">
                          {meta.normasDisponibles.join(" · ")}
                        </span>
                      )}
                    </h3>

                    {!presentador ? (
                      <p className="mt-2 rounded-md border border-destructive/40 p-3 text-xs text-destructive">
                        Esta verificación todavía no se puede volcar a la memoria. Los datos están
                        guardados y el cálculo se puede abrir desde el proyecto, pero el capítulo
                        hay que armarlo a mano hasta que se cubra.
                      </p>
                    ) : !capitulo ? (
                      <p className="mt-2 rounded-md border border-destructive/40 p-3 text-xs text-destructive">
                        Los datos guardados no alcanzan para resolver el cálculo. Abrilo desde el
                        proyecto, completalo y volvé a guardarlo.
                      </p>
                    ) : (
                      <>
                        {capitulo.croquis && (
                          <div className="my-4 flex justify-center">{capitulo.croquis}</div>
                        )}

                        {capitulo.datos.map((grupo) => (
                          <div key={grupo.titulo} className="mt-3">
                            <p className="spec-label">{grupo.titulo}</p>
                            <dl className="mt-1 grid grid-cols-2 gap-x-6 text-sm sm:grid-cols-4">
                              {grupo.filas.map((fila) => (
                                <div key={fila.etiqueta} className="contents">
                                  <dt className="text-muted-foreground">{fila.etiqueta}</dt>
                                  <dd className="font-mono tabular-nums">{fila.valor}</dd>
                                </div>
                              ))}
                            </dl>
                          </div>
                        ))}

                        <div className="mt-4">
                          <p className="spec-label">Comprobaciones</p>
                          <ul className="mt-1 space-y-1">
                            {capitulo.comprobaciones.map((c) => (
                              <li
                                key={c.etiqueta}
                                className="flex flex-wrap items-baseline justify-between gap-x-3 border-b border-border/40 py-1 text-sm last:border-0"
                              >
                                <span>{c.etiqueta}</span>
                                <span className="flex items-baseline gap-3">
                                  {c.detalle && (
                                    <span className="font-mono text-xs text-muted-foreground tabular-nums">
                                      {c.detalle}
                                    </span>
                                  )}
                                  <strong
                                    className={
                                      c.verifica
                                        ? "text-emerald-700 dark:text-emerald-400"
                                        : "text-destructive"
                                    }
                                  >
                                    {c.verifica ? "Verifica" : "No verifica"}
                                  </strong>
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {capitulo.formulas.length > 0 && (
                          <div className="mt-4">
                            <p className="spec-label">Desarrollo</p>
                            <dl className="mt-1 space-y-1 font-mono text-[13px]">
                              {capitulo.formulas.map((f) => (
                                <div key={f.etiqueta} className="grid grid-cols-[auto_1fr] gap-x-2">
                                  <dt className="text-muted-foreground">{f.etiqueta}</dt>
                                  <dd className="tabular-nums">
                                    {f.formula && <span>= {f.formula} </span>}
                                    {f.sustitucion && (
                                      <span className="text-muted-foreground">
                                        = {f.sustitucion}{" "}
                                      </span>
                                    )}
                                    <span className="font-semibold">= {f.valor}</span>
                                  </dd>
                                </div>
                              ))}
                            </dl>
                          </div>
                        )}

                        {validacion && (
                          <p className="mt-3 text-[11px] text-muted-foreground">
                            {NIVELES_VALIDACION[validacion.nivel].etiqueta}.{" "}
                            {validacion.nota ?? NIVELES_VALIDACION[validacion.nivel].significado}
                          </p>
                        )}
                      </>
                    )}
                  </article>
                );
              })}
            </section>
          ))}
        </>
      )}

      {sinCubrir.length > 0 && (
        <section className="mt-10 rounded-md border border-destructive/40 p-4 print:break-inside-avoid">
          <h2 className="text-sm font-semibold text-destructive">Capítulos incompletos</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Estas verificaciones todavía no se vuelcan automáticamente a la memoria:{" "}
            {sinCubrir
              .map((id) => registroVerificaciones.find((v) => v.id === id)?.nombre ?? id)
              .join(", ")}
            . Los datos están guardados y el cálculo se puede abrir desde el proyecto; el capítulo
            hay que armarlo a mano hasta que se cubra. Se avisa acá y no se omite en silencio,
            porque un capítulo que falta sin aviso es un elemento que parece no haberse calculado.
          </p>
        </section>
      )}

      <footer className="mt-10 border-t border-border pt-6 text-xs leading-relaxed text-muted-foreground">
        <p>
          <strong className="text-foreground">
            MagicIng es una herramienta de verificación.
          </strong>{" "}
          No reemplaza el criterio del proyectista ni la firma de un técnico habilitado, y esta
          memoria no vale por sí sola: los resultados deben ser revisados y validados por el
          profesional responsable, que es quien responde por los datos cargados, por la norma
          elegida y por el resultado aceptado.
        </p>
        <p className="mt-2">
          Los cálculos se resolvieron con el motor de MagicIng a la fecha de emisión de este
          documento, a partir de los datos guardados en el proyecto.
        </p>
      </footer>
    </main>
  );
}
