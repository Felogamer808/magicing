"use client";

import type { Interpretacion } from "@/lib/cad-revit/interpretar";
import { fmt } from "@/lib/verificaciones/formato";
import type { Seleccion } from "@/components/cad-revit/PlantaInterpretada";
import { CampoMetros } from "@/components/cad-revit/CampoMetros";

/** Qué es la pieza elegida en el plano y de dónde salió. Medidas en m. */
export function PanelPieza({
  interpretacion,
  seleccion,
  escala,
  desniveles,
  onDesnivel,
}: {
  interpretacion: Interpretacion;
  seleccion: Seleccion;
  escala: number;
  /** Desnivel de la cara superior de cada cabezal, por índice, m. */
  desniveles: Record<number, number>;
  onDesnivel: (indice: number, metros: number) => void;
}) {
  const m = (x: number) => fmt(x * escala, 2);
  const fila = (nombre: string, valor: string) => (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{nombre}</dt>
      <dd className="text-right tabular-nums">{valor}</dd>
    </div>
  );

  if (!seleccion) {
    return (
      <p className="rounded-md border p-4 text-sm text-muted-foreground">
        Tocá un cabezal, una viga o un nodo en el plano para ver cómo se interpretó.
      </p>
    );
  }

  if (seleccion.tipo === "cabezal") {
    const c = interpretacion.cabezales[seleccion.indice];
    return (
      <div className="space-y-3 rounded-md border p-4 text-sm">
        <p className="text-lg font-semibold">{c.nombre}</p>
        <dl className="space-y-1">
          {fila("Planta", `${m(c.rect.largo)} × ${m(c.rect.ancho)} m`)}
          {fila("Canto", `${m(c.canto)} m`)}
          {fila("Giro", `${fmt(c.rect.angulo, 1)}°`)}
          {fila("Pilotes", String(c.pilotes.length))}
          {fila("Borde dibujado", `${fmt(c.cobertura * 100, 0)} %`)}
          {c.dibujado && fila("Dibujado", `${m(c.dibujado[0])} × ${m(c.dibujado[1])} m`)}
        </dl>
        <p className="text-xs text-muted-foreground">
          {c.origen === "contorno"
            ? "Ubicado sobre el contorno dibujado, con las medidas del rótulo."
            : "No encajó en el contorno: se ubicó sobre su pilote. Revisar."}
        </p>
        {/*
          La cara superior de todos es la misma salvo excepciones, como un
          cabezal de ascensor más abajo. Sus pilotes bajan con él.
        */}
        <div className="flex items-center justify-between gap-3 border-t pt-3">
          <label htmlFor={`desnivel-${seleccion.indice}`} className="text-muted-foreground">
            Desnivel de la cara superior (m)
          </label>
          <CampoMetros
            key={seleccion.indice}
            id={`desnivel-${seleccion.indice}`}
            valor={desniveles[seleccion.indice] ?? 0}
            onCambio={(n) => onDesnivel(seleccion.indice, n)}
          />
        </div>
      </div>
    );
  }

  if (seleccion.tipo === "viga") {
    const v = interpretacion.vigas[seleccion.indice];
    const largo = Math.hypot(v.fin[0] - v.inicio[0], v.fin[1] - v.inicio[1]);
    return (
      <div className="space-y-3 rounded-md border p-4 text-sm">
        <p className="text-lg font-semibold">{v.nombre}</p>
        <dl className="space-y-1">
          {fila("Sección", `${m(v.ancho)} × ${m(v.alto)} m`)}
          {fila("Largo", `${m(largo)} m`)}
          {v.anchoDibujado !== undefined && fila("Ancho dibujado", `${m(v.anchoDibujado)} m`)}
        </dl>
        <p className="text-xs text-muted-foreground">
          De cara a cara de los cabezales donde termina, o hasta el pilote de un pilar sobre viga.
        </p>
      </div>
    );
  }

  const n = interpretacion.nodos[seleccion.indice];
  return (
    <div className="space-y-3 rounded-md border p-4 text-sm">
      <p className="text-lg font-semibold">{n.nombre}</p>
      <p className="text-muted-foreground">
        Rótulo sin medidas: un pilar que descarga en una viga sobre {n.pilotes.length === 1 ? "un pilote" : `${n.pilotes.length} pilotes`}. No
        tiene sólido propio; es parte de la viga.
      </p>
    </div>
  );
}
