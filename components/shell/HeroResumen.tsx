"use client";

import Link from "next/link";
import { useProyectoActivo } from "@/lib/proyectos/activo";
import { useProyectos } from "@/lib/proyectos/almacen";
import { contarCalculos } from "@/lib/proyectos/modelo";
import { fmt } from "@/lib/verificaciones/formato";

/**
 * Bloque destacado de la portada, sobre superficie técnica oscura.
 *
 * Las tres cifras del pie son del proyecto activo y se calculan de verdad. La
 * referencia visual traía ahí "04 cálculos activos · 98% completado"; inventar
 * un porcentaje de avance en una herramienta cuyo valor entero es que los
 * números sean confiables sería el peor lugar posible para poner un número
 * falso. Sin proyecto activo, el bloque invita a abrir uno en vez de mostrar
 * ceros que no significan nada.
 */
export function HeroResumen() {
  const [idActivo] = useProyectoActivo();
  const { proyectos } = useProyectos();
  const proyecto = proyectos.find((p) => p.id === idActivo) ?? null;

  return (
    <section className="relative overflow-hidden rounded-2xl bg-[var(--superficie-tecnica)] px-6 py-10 text-white sm:px-10 sm:py-14">
      {/* Retícula de plano, muy tenue: textura, no fondo. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #7cc6f5 1px, transparent 1px), linear-gradient(to bottom, #7cc6f5 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative grid gap-10 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="max-w-xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--celeste)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--exito)]" />
            Centro de cálculo
          </p>

          <h1 className="mt-5 text-3xl leading-[1.1] sm:text-4xl">
            Calculá con la norma a la vista.
            <br />
            <span className="text-[var(--celeste)]">Firmá con respaldo.</span>
          </h1>

          <p className="mt-4 text-sm leading-relaxed text-white/70">
            Verificaciones con el artículo, la fórmula y la sustitución numérica a la vista, para
            poder rehacerlas a mano. Agrupadas por obra, y con la memoria de cálculo al final.
          </p>

          <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4 border-t border-white/10 pt-6">
            {proyecto ? (
              <>
                <div>
                  <dd className="font-mono text-2xl font-medium">
                    {String(proyecto.elementos.length).padStart(2, "0")}
                  </dd>
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">
                    Elementos
                  </dt>
                </div>
                <div>
                  <dd className="font-mono text-2xl font-medium">
                    {String(contarCalculos(proyecto)).padStart(2, "0")}
                  </dd>
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">
                    Cálculos guardados
                  </dt>
                </div>
                <div>
                  <dd className="font-mono text-2xl font-medium">
                    H-{fmt(proyecto.materiales.fckMPa, 0)}
                  </dd>
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">
                    Hormigón de obra
                  </dt>
                </div>
              </>
            ) : (
              <div className="flex flex-wrap items-center gap-4">
                <p className="text-sm text-white/70">
                  No hay ningún proyecto abierto.
                </p>
                <Link
                  href="/proyectos"
                  className="flex h-9 items-center rounded-lg bg-[var(--brillante)] px-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
                >
                  Abrir un proyecto
                </Link>
              </div>
            )}
          </dl>
        </div>

        <IlustracionPortico />
      </div>
    </section>
  );
}

/**
 * Pórtico de celosía dibujado en SVG, no una imagen: tiene que verse nítido a
 * cualquier tamaño y seguir el color del tema. Es ilustrativo y está rotulado
 * como tal — no representa ningún cálculo de la herramienta, y por eso no lleva
 * ninguna cifra de resultado que pueda confundirse con uno.
 */
function IlustracionPortico() {
  const nodos = [
    [20, 90], [90, 90], [160, 90], [230, 90], [300, 90],
    [55, 30], [125, 30], [195, 30], [265, 30],
  ];

  return (
    <svg
      viewBox="0 0 320 130"
      className="hidden h-auto w-full max-w-sm text-[var(--celeste)] lg:block"
      fill="none"
      aria-hidden="true"
    >
      {/* Cota superior */}
      <g stroke="currentColor" strokeWidth="0.8" opacity="0.5">
        <path d="M20 12 L300 12" />
        <path d="M20 8 L20 16" />
        <path d="M300 8 L300 16" />
      </g>
      <text x="160" y="8" textAnchor="middle" className="fill-current font-mono" fontSize="7" opacity="0.6">
        luz libre
      </text>

      {/* Cordones y diagonales */}
      <g stroke="currentColor" strokeWidth="1.4" opacity="0.85">
        <path d="M20 90 L300 90" />
        <path d="M55 30 L265 30" />
        <path d="M20 90 L55 30 L90 90 L125 30 L160 90 L195 30 L230 90 L265 30 L300 90" />
      </g>

      {/* Apoyos */}
      <g stroke="currentColor" strokeWidth="1.2" opacity="0.7">
        <path d="M12 104 L28 104" />
        <path d="M20 90 L14 104 M20 90 L26 104" />
        <path d="M292 104 L308 104" />
        <path d="M300 90 L294 104 M300 90 L306 104" />
      </g>

      {nodos.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="2.6" fill="currentColor" />
      ))}

      <text x="160" y="122" textAnchor="middle" className="fill-current font-mono" fontSize="6.5" opacity="0.45">
        esquema ilustrativo
      </text>
    </svg>
  );
}
