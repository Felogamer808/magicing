"use client";

import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { MuestraTema } from "@/components/laboratorio/MuestraTema";
import "./temas.css";

/**
 * Laboratorio de estilo: las direcciones candidatas, lado a lado, sobre los
 * componentes reales.
 *
 * Ruta deliberadamente fuera del registro de verificaciones, así que no aparece
 * en la barra lateral ni en el buscador. Se entra a mano por /laboratorio-estilo
 * y se borra entera —con `temas.css` y `MuestraTema`— cuando la dirección esté
 * elegida.
 *
 * El claro/oscuro se conmuta acá y no con el tema global del sitio para poder
 * ver las tres variantes en el mismo modo sin recargar y sin pisar la
 * preferencia guardada de quien esté mirando.
 */

interface Variante {
  clase: string;
  nombre: string;
  resumen: string;
  cambios: string[];
}

const VARIANTES: Variante[] = [
  {
    clase: "tema-actual",
    nombre: "A · Actual",
    resumen: "Lo que hay hoy, para tener la referencia al lado y no decidir de memoria.",
    cambios: [
      "Grilla de plano a 28 px detrás de todo",
      "Marcas de registro de 14 px en las esquinas",
      "Serif editorial en los títulos",
      "Azul de tinta como color dominante",
    ],
  },
  {
    clase: "tema-afinada",
    nombre: "B · Afinada",
    resumen:
      "La misma identidad de plano técnico, bajada de volumen. Cambian los tokens, no el idioma.",
    cambios: [
      "Grilla al doble de paso y mucho más tenue: textura, no fondo",
      "Marcas de registro finas y apagadas — firma, no marco",
      "Bordes a la mitad de croma, radio de 6 a 8 px",
      "Se mantiene la serif y el azul",
    ],
  },
  {
    clase: "tema-nueva",
    nombre: "C · Identidad nueva",
    resumen:
      "Herramienta de software en vez de plano de obra. Es el cambio que más se nota de lejos.",
    cambios: [
      "Sin grilla y sin marcas de registro",
      "Los títulos dejan la serif y pasan a la sans",
      "Grises neutros con un único acento violeta",
      "Radio de 10 px; la monoespaciada queda en las cifras",
    ],
  },
];

export default function LaboratorioEstiloPage() {
  const [oscuro, setOscuro] = useState(false);

  return (
    <main className="mx-auto flex w-full max-w-[110rem] flex-col gap-6 px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="spec-label">Interno · no aparece en la navegación</p>
          <h1 className="text-2xl font-semibold tracking-tight">Laboratorio de estilo</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Las tres direcciones sobre los mismos componentes reales: el croquis, los campos, los
            dos estados de verificación y el panel de fórmulas. Lo que se ve acá es lo que queda,
            porque no hay maqueta de por medio — son los componentes que usan las 45 páginas,
            repintados sólo con tokens.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setOscuro((v) => !v)}
          className="flex h-9 items-center gap-2 rounded-lg border border-input px-3 text-sm transition-colors hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          {oscuro ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          Ver en {oscuro ? "claro" : "oscuro"}
        </button>
      </div>

      {/*
        Las tres en fila recién a partir de 1280 px. Por debajo van apiladas a
        ancho completo: tres columnas de 340 px rompen los renglones de las
        tarjetas y lo que se termina comparando es el maquetado apretado, no el
        estilo.
      */}
      <div className="grid gap-6 xl:grid-cols-3">
        {VARIANTES.map((variante) => (
          <section key={variante.clase} className="flex flex-col gap-3">
            <div>
              <h2 className="text-base font-semibold">{variante.nombre}</h2>
              <p className="mt-1 min-h-[3.5rem] text-sm text-muted-foreground">{variante.resumen}</p>
              {/* Alto fijo para que las tres muestras arranquen a la misma
                  altura y la comparación sea de estilo y no de maquetado. */}
              <ul className="mt-2 min-h-[7.5rem] space-y-1 text-[13px] text-muted-foreground">
                {variante.cambios.map((cambio) => (
                  <li key={cambio} className="flex gap-2">
                    <span aria-hidden="true">·</span>
                    <span>{cambio}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/*
              El wrapper lleva la clase de la variante —que redefine los tokens
              para todo el subárbol— y, cuando corresponde, `dark`, que es el
              selector que usa el resto del sitio. El contenido va adentro
              porque el variante `dark:` de Tailwind matchea descendientes.
            */}
            {/*
              La clase de la variante, `dark` y `bg-background` van sobre el
              mismo elemento a propósito. La grilla de cada variante es un
              background-image y el color del papel un background-color: en dos
              elementos anidados el color del de adentro tapa la grilla del de
              afuera, que es justo la diferencia que hay que poder ver.
            */}
            <div
              className={`${variante.clase} ${oscuro ? "dark" : ""} overflow-hidden rounded-xl border border-border/80 bg-background text-foreground shadow-sm`}
            >
              <MuestraTema />
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
