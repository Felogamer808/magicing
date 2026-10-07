"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { aNumero } from "@/lib/verificaciones/formato";

/**
 * Casilla numérica de un material del proyecto.
 *
 * Guarda el texto que se va escribiendo y sólo entrega el número cuando es
 * válido y positivo. Si mostrara directamente el número guardado, "0," se
 * leería como 0 y la coma desaparecería, así que no se podría escribir 0,035;
 * y borrar la casilla guardaría un 0.
 */
export function CampoMaterial({
  id,
  valor,
  onCambio,
}: {
  id: string;
  valor: number;
  onCambio: (n: number) => void;
}) {
  // null: no se está editando, se muestra el valor guardado.
  const [texto, setTexto] = useState<string | null>(null);
  const guardado = String(valor).replace(".", ",");
  // Mientras se escribe, el texto manda si todavía no es un número válido o si
  // es el mismo que está guardado; si el valor cambió desde afuera, manda ése.
  const n = texto === null ? NaN : aNumero(texto);
  const mostrado = texto !== null && (!(n > 0) || n === valor) ? texto : guardado;

  return (
    <Input
      id={id}
      inputMode="decimal"
      value={mostrado}
      onChange={(e) => {
        const t = e.target.value;
        setTexto(t);
        const m = aNumero(t);
        if (t.trim() !== "" && m > 0) onCambio(m);
      }}
      onBlur={() => setTexto(null)}
    />
  );
}
