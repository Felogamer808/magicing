import type { ReactNode } from "react";

/**
 * Hoja técnica: la calculadora se lee de arriba abajo como una memoria —
 * definir el elemento, cargar acciones, revisar, leer resultados— en lugar de
 * repartirse en columnas de tarjetas que se miran a la vez sin orden.
 *
 * Las etapas se separan con número, título y una línea fina. Las superficies
 * con fondo quedan para lo que de verdad tiene que destacarse: avisos,
 * revisión y conclusión.
 */

export interface EtapaIndice {
  id: string;
  titulo: string;
}

/**
 * Índice discreto de etapas. No es un asistente: no bloquea ni obliga a pasar
 * por cada paso, sólo muestra el recorrido y deja saltar a una etapa.
 */
export function IndiceEtapas({ etapas }: { etapas: readonly EtapaIndice[] }) {
  return (
    <nav aria-label="Etapas del cálculo" className="sticky top-16 z-10 -mx-2 overflow-x-auto [scrollbar-width:none] bg-background/90 px-2 py-2 backdrop-blur">
      <ol className="flex gap-x-5 whitespace-nowrap text-[13px] text-muted-foreground">
        {etapas.map((e, i) => (
          <li key={e.id}>
            <a href={`#${e.id}`} className="inline-flex items-baseline gap-1.5 hover:text-foreground">
              <span className="font-mono text-[11px] tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              {e.titulo}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

interface EtapaProps {
  id: string;
  numero: number;
  titulo: string;
  /** Una línea: qué se define en esta etapa. */
  descripcion?: string;
  children: ReactNode;
}

export function Etapa({ id, numero, titulo, descripcion, children }: EtapaProps) {
  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className="scroll-mt-28 border-t border-border/70 pt-6">
      <header className="mb-5 flex items-baseline gap-3">
        <span className="font-mono text-sm tabular-nums text-muted-foreground">
          {String(numero).padStart(2, "0")}
        </span>
        <div>
          <h2 id={`${id}-titulo`} className="text-lg font-semibold tracking-tight">
            {titulo}
          </h2>
          {descripcion && <p className="text-sm text-muted-foreground">{descripcion}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}

/**
 * Encabezado de etapa suelto: número, título y línea, con el id para el
 * índice. Para páginas largas donde envolver cada bloque en una Etapa
 * obligaría a reacomodar todo el JSX; el efecto visual es el mismo.
 */
export function EncabezadoEtapa({ id, numero, titulo, descripcion }: Omit<EtapaProps, "children">) {
  return (
    <header id={id} className="scroll-mt-28 flex items-baseline gap-3 border-t border-border/70 pt-6">
      <span className="font-mono text-sm tabular-nums text-muted-foreground">{String(numero).padStart(2, "0")}</span>
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{titulo}</h2>
        {descripcion && <p className="text-sm text-muted-foreground">{descripcion}</p>}
      </div>
    </header>
  );
}

/**
 * Datos a la izquierda, el dibujo que los explica a la derecha. En pantalla
 * chica el dibujo va debajo de los datos que explica, no en otra columna.
 */
export function DatosConDibujo({ datos, dibujo }: { datos: ReactNode; dibujo: ReactNode }) {
  return (
    <div className="grid items-start gap-x-10 gap-y-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      <div className="space-y-5">{datos}</div>
      <div className="mx-auto flex w-full max-w-[22rem] justify-center lg:sticky lg:top-32">{dibujo}</div>
    </div>
  );
}

/** Subtítulo dentro de una etapa, sin caja alrededor. */
export function Subgrupo({ titulo, detalle, children }: { titulo: string; detalle?: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h3 className="text-sm font-medium">{titulo}</h3>
        {detalle && <span className="font-mono text-[11px] text-muted-foreground">{detalle}</span>}
      </div>
      {children}
    </div>
  );
}
