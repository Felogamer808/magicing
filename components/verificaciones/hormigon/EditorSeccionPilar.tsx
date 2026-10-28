"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CampoDiametro } from "@/components/verificaciones/comun/CampoDiametro";
import { SeccionPilarDiagrama, type FilaPilar } from "@/components/verificaciones/hormigon/SeccionPilarDiagrama";
import {
  maximoBarrasCara,
  type ArmaduraPilar,
  type GeometriaPilar,
  type SeparacionBarrasCara,
} from "@/lib/calc/hormigon/pilares/pilar";
import { fmt } from "@/lib/verificaciones/formato";

/** Los campos de la página que toca el editor: los mismos de la carga numérica. */
export type CampoArmadoPilar = "phi" | "nCaraB" | "phiCaraB" | "nCaraH" | "phiCaraH";

interface EditorSeccionPilarProps {
  geometria: GeometriaPilar;
  armadura: ArmaduraPilar;
  /** Por dirección de flexión, como en el motor: la h mira las caras de ancho b. */
  separacionBarras: Record<"h" | "b", SeparacionBarrasCara>;
  onCambiar: (campo: CampoArmadoPilar, valor: string) => void;
  grande: boolean;
  onAmpliar: () => void;
}

const NOMBRE: Record<FilaPilar, string> = {
  esquina: "Esquinas",
  b: "Fila caras b",
  h: "Fila caras h",
};

/**
 * La armadura se arma sobre el dibujo: se elige las esquinas o la fila de un
 * par de caras, y abajo aparecen sólo sus datos. El tirador del dibujo, el
 * − / + y el Ø escriben los mismos campos que la carga numérica, que sigue al
 * lado. Las barras se reparten solas contra el cerco; el editor no deja pasar
 * de las que entran por el art. 8.2(2), así no chocan.
 */
export function EditorSeccionPilar({ geometria, armadura, separacionBarras, onCambiar, grande, onAmpliar }: EditorSeccionPilarProps) {
  const [seleccion, setSeleccion] = useState<FilaPilar | null>(null);

  // La fila b es la de las caras de ancho b, que en el motor es la dirección h.
  const dirDe = (fila: "b" | "h") => (fila === "b" ? "h" : "b");
  const barrasDe = (fila: "b" | "h") => (fila === "b" ? armadura.barrasCaraB : armadura.barrasCaraH);
  const maximoDe = (fila: "b" | "h") => Math.max(2, maximoBarrasCara(geometria, armadura, dirDe(fila)));
  const fallan = { b: !separacionBarras.h.verifica, h: !separacionBarras.b.verifica };

  const ponerBarras = (fila: "b" | "h", barrasCara: number) => {
    const n = Math.min(Math.max(barrasCara, 2), Math.max(maximoDe(fila), barrasDe(fila)));
    if (n !== barrasDe(fila)) onCambiar(fila === "b" ? "nCaraB" : "nCaraH", String(n));
  };
  // El tirador nunca pasa del máximo; el + tampoco. Si la carga numérica ya
  // puso más, se puede bajar pero no subir.
  const arrastrar = (fila: "b" | "h", pedido: number) =>
    ponerBarras(fila, Math.min(pedido, maximoDe(fila)));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {(Object.keys(NOMBRE) as FilaPilar[]).map((f) => (
          <Button key={f} variant={seleccion === f ? "default" : "outline"} size="sm" onClick={() => setSeleccion(f)}>
            {NOMBRE[f]}
          </Button>
        ))}
        <Button variant="ghost" size="sm" className="ml-auto" onClick={onAmpliar}>
          {grande ? "Achicar" : "Ampliar"}
        </Button>
      </div>

      <SeccionPilarDiagrama
        geometria={geometria}
        armadura={armadura}
        grande={grande}
        edicion={{ seleccion, onSeleccionar: setSeleccion, onArrastrar: arrastrar, fallan }}
      />

      <div className="min-h-24 rounded-md bg-muted/40 p-4">
        {seleccion === null && (
          <p className="text-sm text-muted-foreground">
            Tocá las esquinas o una cara del dibujo para editar esa fila. Con la fila elegida, arrastrá el tirador hacia la
            esquina para agregar barras.
          </p>
        )}
        {seleccion === "esquina" && (
          <div className="w-40">
            <CampoDiametro id="editor-phi" etiqueta="Ø esquinas" valor={String(armadura.diametroEsquinaMm)} onChange={(v) => onCambiar("phi", v)} />
          </div>
        )}
        {(seleccion === "b" || seleccion === "h") && (
          <PanelFila
            fila={seleccion}
            barrasCara={barrasDe(seleccion)}
            maximo={maximoDe(seleccion)}
            diametroMm={seleccion === "b" ? armadura.diametroCaraBMm : armadura.diametroCaraHMm}
            separacion={separacionBarras[dirDe(seleccion)]}
            onBarras={(n) => ponerBarras(seleccion, n)}
            onDiametro={(v) => onCambiar(seleccion === "b" ? "phiCaraB" : "phiCaraH", v)}
          />
        )}
      </div>
    </div>
  );
}

function PanelFila({
  fila,
  barrasCara,
  maximo,
  diametroMm,
  separacion,
  onBarras,
  onDiametro,
}: {
  fila: "b" | "h";
  barrasCara: number;
  maximo: number;
  diametroMm: number;
  separacion: SeparacionBarrasCara;
  onBarras: (n: number) => void;
  onDiametro: (valor: string) => void;
}) {
  const intermedias = barrasCara - 2;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <p className="text-sm leading-none font-medium">Intermedias por cara {fila}</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" aria-label="Una barra menos" disabled={intermedias <= 0} onClick={() => onBarras(barrasCara - 1)}>
              −
            </Button>
            <span className="w-8 text-center font-mono text-sm tabular-nums">{intermedias}</span>
            <Button variant="outline" size="sm" aria-label="Una barra más" disabled={barrasCara >= maximo} onClick={() => onBarras(barrasCara + 1)}>
              +
            </Button>
          </div>
        </div>
        <div className="w-40">
          <CampoDiametro id={`editor-phi-${fila}`} etiqueta="Ø intermedias" valor={String(diametroMm)} onChange={onDiametro} />
        </div>
        <Button variant="ghost" size="sm" disabled={intermedias <= 0} onClick={() => onBarras(2)}>
          Quitar fila
        </Button>
      </div>
      <p className={`text-xs ${separacion.verifica ? "text-muted-foreground" : "text-destructive"}`}>
        Entran hasta {maximo - 2} intermedias por cara. Libre entre barras {fmt(separacion.libreM * 1000, 0)} mm; el art. 8.2(2)
        pide {fmt(separacion.exigidaM * 1000, 0)} mm.
      </p>
    </div>
  );
}
