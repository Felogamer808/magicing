"use client";

/**
 * Selector de vista: alternar entre representaciones de la misma pieza.
 *
 * Una sección, un alzado y una deformada son la misma cosa mirada de tres
 * maneras, y apilarlas en la página hace scrollear para comparar justo lo que
 * hay que comparar. Con un selector se superponen en el mismo lugar y el ojo no
 * se tiene que mover.
 *
 * Es un grupo de radios y no un juego de botones: son opciones excluyentes, y
 * así las flechas del teclado funcionan solas.
 */

export interface OpcionVista<T extends string> {
  valor: T;
  etiqueta: string;
  /** Qué muestra, para quien no reconoce el nombre de la vista. */
  descripcion?: string;
}

interface SelectorVistaProps<T extends string> {
  opciones: readonly OpcionVista<T>[];
  valor: T;
  onChange: (valor: T) => void;
  /** Qué se está eligiendo; va al lector de pantalla. */
  etiqueta: string;
}

export function SelectorVista<T extends string>({
  opciones,
  valor,
  onChange,
  etiqueta,
}: SelectorVistaProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={etiqueta}
      className="inline-flex flex-wrap gap-0.5 rounded-lg border border-border bg-muted/60 p-0.5 print:hidden"
    >
      {opciones.map((o) => {
        const activa = o.valor === valor;
        return (
          <button
            key={o.valor}
            type="button"
            role="radio"
            aria-checked={activa}
            title={o.descripcion}
            onClick={() => onChange(o.valor)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              activa
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {o.etiqueta}
          </button>
        );
      })}
    </div>
  );
}
