"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NIVELES_VALIDACION, validacionDe } from "@/lib/verificaciones/validacion";
import { registroVerificaciones } from "@/lib/verificaciones/registry";

/**
 * Pie de toda página de verificación: qué respalda este número y quién responde
 * por él.
 *
 * Va en el layout y no en cada página por dos motivos. Uno práctico: son 42
 * páginas y un aviso que hay que acordarse de poner es un aviso que falta en
 * alguna. Y uno de fondo: esto no es una nota al pie opcional de cada módulo,
 * es la condición en la que se entrega cualquier resultado de la herramienta.
 *
 * **Se imprime a propósito.** La hoja impresa es la que termina adjunta a una
 * memoria de cálculo, así que es justo donde el alcance no puede faltar; por eso
 * no lleva `print:hidden` como el resto del cromo de navegación.
 *
 * La ruta se lee del pathname en vez de pasarse por props porque el layout de
 * Next no sabe qué página está mostrando. Si la ruta no está en el registro
 * —una herramienta suelta, una página nueva todavía sin registrar— el bloque de
 * validación no se dibuja, pero el aviso de responsabilidad sí: ese no depende
 * de qué módulo sea.
 */

const CLASE_POR_NIVEL = {
  auditada: "border-exito/40",
  probada: "border-border",
  preliminar: "border-destructive/40",
} as const;

export function PieVerificacion() {
  const ruta = usePathname();
  const meta = registroVerificaciones.find((v) => v.ruta === ruta);
  const validacion = meta ? validacionDe(meta.id) : null;
  const nivel = validacion ? NIVELES_VALIDACION[validacion.nivel] : null;

  return (
    <footer className="mx-auto w-full max-w-7xl px-6 pb-10 print:px-0">
      <div className="space-y-3 border-t border-border pt-6 text-xs text-muted-foreground">
        {validacion && nivel && meta && (
          <div className={`rounded-md border ${CLASE_POR_NIVEL[validacion.nivel]} p-3`}>
            <p className="font-medium text-foreground">
              {meta.nombre} · {nivel.etiqueta}
            </p>
            <p className="mt-1">{nivel.significado}</p>
            {validacion.nota && <p className="mt-1.5">{validacion.nota}</p>}
            <p className="mt-1.5 font-mono">
              Resuelta con {meta.normasDisponibles.join(" · ")}
            </p>
          </div>
        )}

        <p>
          <strong className="text-foreground">MagicIng es una herramienta de verificación.</strong>{" "}
          No reemplaza el criterio del proyectista ni la firma de un técnico habilitado, y el
          resultado no vale como memoria de cálculo por sí solo. Antes de apoyar una decisión de
          proyecto en un número de acá, contrastalo: cada página deja a la vista el artículo y el
          desarrollo para que se pueda rehacer a mano. La responsabilidad del cálculo y de lo que
          se construya con él es de quien firma.
        </p>

        <p className="print:hidden">
          <Link href="/alcance" className="underline underline-offset-2 hover:text-foreground">
            Alcance, estado de validación y responsabilidad
          </Link>
        </p>
      </div>
    </footer>
  );
}
