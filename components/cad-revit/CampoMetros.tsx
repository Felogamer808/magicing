"use client";

import { useState } from "react";
import { aNumero } from "@/lib/verificaciones/formato";

/**
 * Un valor en metros que se puede tipear con coma. Guarda el texto mientras
 * se escribe ("-1," es válido a mitad de camino) y avisa el número sólo
 * cuando lo que hay escrito es un número.
 */
export function CampoMetros({
  id,
  valor,
  onCambio,
  className,
}: {
  id: string;
  valor: number;
  onCambio: (n: number) => void;
  className?: string;
}) {
  const [texto, setTexto] = useState(String(valor).replace(".", ","));
  return (
    <input
      id={id}
      inputMode="decimal"
      value={texto}
      onChange={(e) => {
        setTexto(e.target.value);
        const n = aNumero(e.target.value);
        if (Number.isFinite(n)) onCambio(n);
      }}
      className={`h-8 w-24 rounded-md border border-input bg-transparent px-2 text-right text-sm tabular-nums ${className ?? ""}`}
    />
  );
}
