"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Fila {
  /** Nombre de la magnitud: "Fh adm". En las filas simples es todo el rótulo. */
  etiqueta: string;
  /** Resultado, con su unidad. */
  valor: string;
  /** Expresión simbólica: "N·tg φ + c·A". */
  formula?: string;
  /** La misma expresión con los números puestos. */
  sustitucion?: string;
}

interface PanelFormulasProps {
  titulo: string;
  filas: Fila[];
}

export function PanelFormulas({ titulo, filas }: PanelFormulasProps) {
  const [abierto, setAbierto] = useState(false);

  return (
    <Collapsible open={abierto} onOpenChange={setAbierto}>
      <CollapsibleTrigger className="flex w-full items-center justify-between py-1.5 text-sm text-muted-foreground hover:text-foreground">
        <span>{titulo}</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${abierto ? "rotate-180" : ""}`}
        />
      </CollapsibleTrigger>
      {/*
        hiddenUntilFound deja el detalle en el DOM aunque el panel esté cerrado,
        y lo oculta con content-visibility en lugar del atributo hidden a secas.
        Importa por dos motivos: al imprimir la hoja para la memoria de cálculo
        el desarrollo de fórmulas sale igual, y el buscador del navegador
        (Ctrl+F) encuentra texto adentro y abre el panel solo.

        Con hidden a secas no alcanzaría: el navegador lo aplica como
        display:none !important desde su propia hoja de estilos, que gana sobre
        cualquier regla nuestra.
      */}
      <CollapsibleContent hiddenUntilFound>
        {/*
          Dos formas de fila. La simple, de dos columnas, para lo que es un dato
          y no una cuenta. Y el desarrollo en tres renglones alineados por el
          igual —fórmula, sustitución, resultado— que es como se escribe a mano
          una memoria de cálculo y permite rehacerla renglón por renglón.
        */}
        <dl className="space-y-2 pb-3 pt-1 text-sm">
          {filas.map((fila) =>
            fila.formula ? (
              <div
                key={fila.etiqueta}
                className="grid grid-cols-[auto_1fr] gap-x-2 border-l-2 border-border/60 pl-3 font-mono text-[13px] leading-relaxed"
              >
                <dt className="text-muted-foreground">{fila.etiqueta}</dt>
                <dd className="tabular-nums">= {fila.formula}</dd>

                {fila.sustitucion && (
                  <>
                    <dt aria-hidden="true" />
                    <dd className="tabular-nums text-muted-foreground">= {fila.sustitucion}</dd>
                  </>
                )}

                <dt aria-hidden="true" />
                <dd className="font-semibold tabular-nums">= {fila.valor}</dd>
              </div>
            ) : (
              <div key={fila.etiqueta} className="grid grid-cols-2 gap-x-4">
                <dt className="text-muted-foreground">{fila.etiqueta}</dt>
                <dd className="text-right font-mono tabular-nums">{fila.valor}</dd>
              </div>
            )
          )}
        </dl>
      </CollapsibleContent>
    </Collapsible>
  );
}
