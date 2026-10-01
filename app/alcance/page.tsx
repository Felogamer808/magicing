import Link from "next/link";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { TemaToggle } from "@/components/TemaToggle";
import {
  registroSecciones,
  registroVerificaciones,
  verificacionesDeSeccion,
} from "@/lib/verificaciones/registry";
import {
  EDICIONES_NORMAS,
  NIVELES_VALIDACION,
  validacionDe,
  type NivelValidacion,
} from "@/lib/verificaciones/validacion";

export const metadata: Metadata = {
  title: "Alcance y responsabilidad",
  description:
    "Qué respalda cada resultado de MagicIng, con qué edición de cada norma está resuelto, y quién responde por el cálculo.",
};

/**
 * La página que faltaba.
 *
 * Una herramienta de cálculo estructural que no dice qué respalda sus números
 * ni quién responde por ellos le está pidiendo al usuario una confianza que no
 * se ganó. Y al revés: la trazabilidad artículo por artículo, que es lo que
 * distingue a esta herramienta, tiene un reverso — como el resultado llega con
 * la autoridad de una cita exacta, nadie lo vuelve a comprobar a mano, así que
 * un coeficiente mal transcripto o una norma que cambió de edición pasan sin
 * que nadie se entere.
 *
 * Esta página es la contramedida: pone a la vista el nivel de comprobación de
 * cada módulo, la edición concreta de cada norma y lo que está pendiente. No
 * promete más de lo que hay; dice exactamente cuánto hay.
 */

const ORDEN_NIVEL: NivelValidacion[] = ["auditada", "probada", "preliminar"];

const ESTILO_NIVEL: Record<NivelValidacion, string> = {
  auditada: "border-emerald-600/40 bg-emerald-600/[0.06]",
  probada: "border-border",
  preliminar: "border-destructive/40 bg-destructive/[0.06]",
};

export default function AlcancePage() {
  const porNivel = ORDEN_NIVEL.map((nivel) => ({
    nivel,
    meta: NIVELES_VALIDACION[nivel],
    verificaciones: registroVerificaciones.filter(
      (v) => v.disponible && validacionDe(v.id).nivel === nivel
    ),
  }));

  const seccionesAbiertas = registroSecciones.filter((s) => s.disponible);
  const normasUsadas = [...new Set(seccionesAbiertas.flatMap((s) => s.normasDisponibles))];

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-6 py-12">
      <div className="flex items-center justify-between gap-4 print:hidden">
        <Link href="/" aria-label="MagicIng — inicio">
          <Logo className="h-7 w-auto" titulo="" />
        </Link>
        <TemaToggle />
      </div>

      <div>
        <p className="spec-label">Antes de usar un resultado</p>
        <h1 className="text-3xl font-semibold tracking-tight">Alcance y responsabilidad</h1>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Qué es esto, y qué no es</h2>
        <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            MagicIng es una <strong className="text-foreground">herramienta de verificación</strong>:
            toma los datos de una pieza ya dimensionada y comprueba si cumple lo que exige la norma
            que cada módulo declara. Deja a la vista el artículo, la fórmula y la sustitución con
            números, para que el resultado se pueda rehacer a mano y discutir.
          </p>
          <p>
            <strong className="text-foreground">No es un programa de diseño</strong> y no decide por
            vos: no elige el esquema estructural, no arma el modelo de cargas, no juzga si la
            hipótesis de apoyo es la que corresponde, ni avisa cuando el problema real no es el que
            se está calculando. Esas decisiones siguen siendo del proyectista.
          </p>
          <p>
            <strong className="text-foreground">
              No reemplaza la firma de un técnico habilitado
            </strong>{" "}
            ni vale como memoria de cálculo por sí solo. La hoja que se imprime desde cada página
            sirve para adjuntar al expediente, pero quien la firma es quien responde por ella: por
            los datos que cargó, por la norma que eligió y por el resultado que aceptó.
          </p>
          <p className="rounded-md border p-3">
            Este texto describe el alcance de la herramienta con la mayor honestidad posible, pero{" "}
            <strong className="text-foreground">no fue revisado por un abogado</strong> y no
            pretende ser una cláusula de exención de responsabilidad. Si MagicIng pasa a usarse
            fuera de quien la escribió, ese repaso legal hay que hacerlo.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Por qué esta página existe</h2>
        <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            La trazabilidad tiene un reverso incómodo. Cuando un resultado llega acompañado del
            artículo y la página exactos, inspira confianza — y esa confianza es justamente lo que
            hace que nadie lo vuelva a comprobar. Un coeficiente mal transcripto, o una norma que
            cambió de edición sin que el módulo se actualice, no se delatan: salen con la misma
            autoridad que los que están bien.
          </p>
          <p>
            Por eso cada módulo declara en qué nivel de comprobación está y cada norma dice qué
            edición concreta se implementó. Un fallo ruidoso se arregla; uno silencioso se
            construye.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Estado de cada módulo</h2>
        <p className="text-sm text-muted-foreground">
          {registroVerificaciones.filter((v) => v.disponible).length} verificaciones, repartidas por
          lo que respalda hoy a cada una. El nivel no es una nota de calidad del cálculo: es cuánto
          se comprobó desde afuera.
        </p>

        {porNivel.map(({ nivel, meta, verificaciones }) => (
          <Card key={nivel} className={ESTILO_NIVEL[nivel]}>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                {meta.etiqueta}
                <Badge variant="secondary" className="font-mono">
                  {verificaciones.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{meta.significado}</p>
              <ul className="space-y-2">
                {verificaciones.map((v) => {
                  const validacion = validacionDe(v.id);
                  return (
                    <li key={v.id} className="border-t border-border/60 pt-2 text-sm">
                      <Link href={v.ruta} className="font-medium hover:underline">
                        {v.nombre}
                      </Link>
                      <span className="ml-2 font-mono text-xs text-muted-foreground">
                        {v.normasDisponibles.join(" · ")}
                      </span>
                      {validacion.nota && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{validacion.nota}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Con qué edición está resuelta cada norma</h2>
        <p className="text-sm text-muted-foreground">
          Decir &ldquo;EC2&rdquo; no alcanza: entre dos ediciones cambian coeficientes sin cambiar
          el número de artículo, y ésa es la vía por la que la trazabilidad se rompe sin que nadie
          se entere. Donde el motor no declara edición, acá dice que no la declara, en vez de
          suponer la más nueva.
        </p>
        <div className="space-y-3">
          {normasUsadas.map((norma) => {
            const edicion = EDICIONES_NORMAS[norma];
            if (!edicion) return null;
            return (
              <div key={norma} className="rounded-md border p-3">
                <p className="flex flex-wrap items-baseline gap-2">
                  <Badge variant="secondary" className="font-mono tracking-wide">
                    {norma}
                  </Badge>
                  <span className="text-sm font-medium">{edicion.titulo}</span>
                </p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">{edicion.edicion}</p>
                {edicion.observacion && (
                  <p className="mt-1.5 text-xs text-muted-foreground">{edicion.observacion}</p>
                )}
              </div>
            );
          })}
        </div>
        <p className="rounded-md border border-destructive/40 bg-destructive/[0.06] p-3 text-sm text-muted-foreground">
          <strong className="text-foreground">Nunca se mezclan normas.</strong> Cada módulo se
          resuelve entero con la que declara: el pretensado va por ACI 318 y el hormigón armado por
          el Anejo 19, y un coeficiente de uno no entra nunca en el otro, aunque la fórmula se
          parezca. Mezclarlas da resultados que no responden a ningún reglamento.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Dónde está cada sección</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {registroSecciones.map((seccion) => {
            const verificaciones = verificacionesDeSeccion(seccion.id).filter((v) => v.disponible);
            const auditadas = verificaciones.filter(
              (v) => validacionDe(v.id).nivel === "auditada"
            ).length;
            return (
              <div key={seccion.id} className="rounded-md border p-3 text-sm">
                <p className="font-medium">{seccion.nombre}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {seccion.disponible
                    ? `${verificaciones.length} verificaciones · ${auditadas} auditadas contra el articulado`
                    : "Declarada, todavía sin contenido"}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Lo que falta</h2>
        <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          <li>
            · Auditar contra el articulado los módulos que todavía están sólo probados, empezando
            por las cimentaciones.
          </li>
          <li>
            · Unificar la edición de AISC 360 en los módulos de acero: hoy conviven 360-16 y 360-22.
          </li>
          <li>
            · Declarar la edición del EC7 que usa la parte geotécnica del muro de contención.
          </li>
          <li>
            · Un repaso legal del alcance, antes de que la herramienta se use fuera de quien la
            escribió.
          </li>
        </ul>
      </section>

      <p className="print:hidden">
        <Link href="/" className="text-sm underline underline-offset-2 hover:text-foreground">
          ← Volver al inicio
        </Link>
      </p>
    </main>
  );
}
