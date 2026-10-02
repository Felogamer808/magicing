/**
 * Leyenda de un croquis: qué significa cada relleno.
 *
 * Va con el dibujo siempre que el dibujo use más de un material o más de un
 * estado del mismo material. Es la pieza que hace que el color sea un lenguaje
 * y no una decoración, y la que permite leer la figura impresa en blanco y
 * negro, donde el relleno se pierde pero el rótulo queda.
 */

export interface EntradaLeyenda {
  /** Color del relleno, normalmente una variable de la gramática de material. */
  color: string;
  etiqueta: string;
  /** Qué es, en una frase corta, cuando el rótulo solo no alcanza. */
  nota?: string;
  /** Rayado en diagonal, para distinguir sin depender del tono. */
  rayado?: boolean;
}

export function LeyendaTecnica({ entradas }: { entradas: EntradaLeyenda[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2">
      {entradas.map((e) => (
        <li key={e.etiqueta} className="flex items-start gap-2 text-xs">
          <span
            aria-hidden="true"
            className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-[3px] border border-foreground/25"
            style={{
              backgroundColor: e.color,
              backgroundImage: e.rayado
                ? "repeating-linear-gradient(45deg, rgba(0,0,0,0.28) 0 2px, transparent 2px 4px)"
                : undefined,
            }}
          />
          <span>
            <span className="font-medium">{e.etiqueta}</span>
            {e.nota && <span className="block text-muted-foreground">{e.nota}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}
