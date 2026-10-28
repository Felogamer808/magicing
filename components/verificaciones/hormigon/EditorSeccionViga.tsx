"use client";

import { useState, type ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { CampoDiametro } from "@/components/verificaciones/comun/CampoDiametro";
import {
  SeccionVigaDiagrama,
  type SeleccionSeccionViga,
} from "@/components/verificaciones/hormigon/SeccionVigaDiagrama";

/** Los campos de la página que toca el editor: los mismos de la carga numérica. */
export type CampoArmadoViga =
  | "numeroPos" | "diametroPos" | "numeroPos2" | "diametroPos2"
  | "numeroNeg" | "diametroNeg" | "numeroNeg2" | "diametroNeg2"
  | "diametroEstribo" | "numeroRamas" | "diametroEstriboVano" | "numeroRamasVano";

/** Una capa cargada, como la lee la página. */
export interface CapaEditable {
  numero: number;
  diametroMm: number;
  /** Cuántas barras entran en una fila con su Ø (art. 8.2(2)). */
  capacidadPorFila: number;
  /** Filas en que la reparte el motor. */
  filas: number;
}

interface EditorSeccionVigaProps {
  /** El dibujo de la sección, tal como lo arma la página para mostrarlo. */
  diagrama: Omit<ComponentProps<typeof SeccionVigaDiagrama>, "edicion" | "numeroRamas">;
  /** Capas cargadas de cada cara; la 2.ª sólo si tiene barras. */
  capas: { inferior: readonly CapaEditable[]; superior: readonly CapaEditable[] };
  estribo: { diametroMm: number; ramas: number; vano?: { diametroMm: number; ramas: number } };
  onCambiar: (campo: CampoArmadoViga, valor: string) => void;
  grande: boolean;
  onAmpliar: () => void;
}

const CAMPOS: Record<"inferior" | "superior", [numero: CampoArmadoViga, diametro: CampoArmadoViga][]> = {
  inferior: [["numeroPos", "diametroPos"], ["numeroPos2", "diametroPos2"]],
  superior: [["numeroNeg", "diametroNeg"], ["numeroNeg2", "diametroNeg2"]],
};

const nombreCapa = (cara: "inferior" | "superior", grupo: number) => `${cara === "inferior" ? "Inferior" : "Superior"} ${grupo + 1}`;

/**
 * La armadura de la viga se arma sobre el dibujo, como en pilares: se elige
 * una capa o el estribo, y abajo aparecen sólo sus datos. El tirador, el − / +
 * y el Ø escriben los mismos campos que la carga numérica. Si una capa no
 * entra en una fila, el motor la reparte en más y el dibujo las marca
 * (criterio del usuario, 2026-10-28): el editor no le pone tope.
 */
export function EditorSeccionViga({ diagrama, capas, estribo, onCambiar, grande, onAmpliar }: EditorSeccionVigaProps) {
  const [seleccion, setSeleccion] = useState<SeleccionSeccionViga>(null);

  const ponerNumero = (cara: "inferior" | "superior", grupo: number, numero: number) => {
    // La 1.ª capa tiene al menos una barra; la 2.ª, con 0, desaparece.
    const n = Math.max(grupo === 0 ? 1 : 0, Math.round(numero));
    if (n !== capas[cara][grupo]?.numero) onCambiar(CAMPOS[cara][grupo][0], String(n));
    if (n === 0) setSeleccion(null);
  };
  const agregarSegunda = (cara: "inferior" | "superior") => {
    onCambiar(CAMPOS[cara][1][0], "2");
    setSeleccion({ tipo: "capa", cara, grupo: 1 });
  };

  const elegida = seleccion?.tipo === "capa" ? capas[seleccion.cara][seleccion.grupo] : undefined;
  const boton = (s: SeleccionSeccionViga, texto: string) => (
    <Button
      key={texto}
      variant={JSON.stringify(seleccion) === JSON.stringify(s) ? "default" : "outline"}
      size="sm"
      onClick={() => setSeleccion(s)}
    >
      {texto}
    </Button>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {(["superior", "inferior"] as const).flatMap((cara) =>
          capas[cara].map((_, grupo) => boton({ tipo: "capa", cara, grupo }, nombreCapa(cara, grupo)))
        )}
        {boton({ tipo: "estribo" }, "Estribo")}
        <Button variant="ghost" size="sm" className="ml-auto" onClick={onAmpliar}>
          {grande ? "Achicar" : "Ampliar"}
        </Button>
      </div>

      <div className={`mx-auto w-full ${grande ? "max-w-[34rem]" : ""}`}>
        <SeccionVigaDiagrama
          {...diagrama}
          numeroRamas={estribo.ramas}
          edicion={{
            seleccion,
            onSeleccionar: setSeleccion,
            filasPorGrupo: { inferior: capas.inferior.map((c) => c.filas), superior: capas.superior.map((c) => c.filas) },
            onArrastrar: ponerNumero,
          }}
        />
      </div>

      <div className="min-h-24 rounded-md bg-muted/40 p-4">
        {seleccion === null && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Tocá una capa o el estribo en el dibujo para editarlo. Con la capa elegida, arrastrá el tirador hacia la
              primera barra para agregar barras.
            </p>
            <div className="flex flex-wrap gap-2">
              {capas.inferior.length < 2 && (
                <Button variant="outline" size="sm" onClick={() => agregarSegunda("inferior")}>+ 2.ª capa inferior</Button>
              )}
              {capas.superior.length < 2 && (
                <Button variant="outline" size="sm" onClick={() => agregarSegunda("superior")}>+ 2.ª capa superior</Button>
              )}
            </div>
          </div>
        )}
        {seleccion?.tipo === "capa" && elegida && (
          <PanelCapa
            nombre={nombreCapa(seleccion.cara, seleccion.grupo)}
            capa={elegida}
            idDiametro={`editor-${CAMPOS[seleccion.cara][seleccion.grupo][1]}`}
            quitable={seleccion.grupo > 0}
            onNumero={(n) => ponerNumero(seleccion.cara, seleccion.grupo, n)}
            onDiametro={(v) => onCambiar(CAMPOS[seleccion.cara][seleccion.grupo][1], v)}
          />
        )}
        {seleccion?.tipo === "estribo" && (
          <div className="space-y-3">
            <FilaEstribo
              titulo={estribo.vano ? "Zona de apoyo" : undefined}
              id="editor-estribo"
              diametroMm={estribo.diametroMm}
              ramas={estribo.ramas}
              onDiametro={(v) => onCambiar("diametroEstribo", v)}
              onRamas={(n) => onCambiar("numeroRamas", String(n))}
            />
            {estribo.vano && (
              <FilaEstribo
                titulo="Zona de vano"
                id="editor-estribo-vano"
                diametroMm={estribo.vano.diametroMm}
                ramas={estribo.vano.ramas}
                onDiametro={(v) => onCambiar("diametroEstriboVano", v)}
                onRamas={(n) => onCambiar("numeroRamasVano", String(n))}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Contador({ etiqueta, valor, minimo, onCambiar }: { etiqueta: string; valor: number; minimo: number; onCambiar: (n: number) => void }) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm leading-none font-medium">{etiqueta}</p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" aria-label={`${etiqueta}: una menos`} disabled={valor <= minimo} onClick={() => onCambiar(valor - 1)}>
          −
        </Button>
        <span className="w-8 text-center font-mono text-sm tabular-nums">{valor}</span>
        <Button variant="outline" size="sm" aria-label={`${etiqueta}: una más`} onClick={() => onCambiar(valor + 1)}>
          +
        </Button>
      </div>
    </div>
  );
}

function PanelCapa({
  nombre,
  capa,
  idDiametro,
  quitable,
  onNumero,
  onDiametro,
}: {
  nombre: string;
  capa: CapaEditable;
  idDiametro: string;
  quitable: boolean;
  onNumero: (n: number) => void;
  onDiametro: (valor: string) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{nombre}</p>
      <div className="flex flex-wrap items-end gap-4">
        <Contador etiqueta="Barras" valor={capa.numero} minimo={1} onCambiar={onNumero} />
        <div className="w-40">
          <CampoDiametro id={idDiametro} etiqueta="Ø" valor={String(capa.diametroMm)} onChange={onDiametro} />
        </div>
        {quitable && (
          <Button variant="ghost" size="sm" onClick={() => onNumero(0)}>
            Quitar capa
          </Button>
        )}
      </div>
      <p className={`text-xs ${capa.capacidadPorFila >= 1 ? "text-muted-foreground" : "text-destructive"}`}>
        {capa.capacidadPorFila >= 1
          ? `Entran ${capa.capacidadPorFila} por fila con la separación del art. 8.2(2).` +
            (capa.filas > 1 ? ` Con ${capa.numero} barras van en ${capa.filas} filas: las de más, punteadas en el dibujo.` : "")
          : "Con este Ø no entra ni una barra en el ancho."}
      </p>
    </div>
  );
}

function FilaEstribo({
  titulo,
  id,
  diametroMm,
  ramas,
  onDiametro,
  onRamas,
}: {
  titulo?: string;
  id: string;
  diametroMm: number;
  ramas: number;
  onDiametro: (valor: string) => void;
  onRamas: (n: number) => void;
}) {
  return (
    <div className="space-y-2">
      {titulo && <p className="text-sm font-medium">{titulo}</p>}
      <div className="flex flex-wrap items-end gap-4">
        <div className="w-40">
          <CampoDiametro id={id} etiqueta="Ø estribo" valor={String(diametroMm)} onChange={onDiametro} />
        </div>
        <Contador etiqueta="Ramas" valor={ramas} minimo={2} onCambiar={onRamas} />
      </div>
    </div>
  );
}
