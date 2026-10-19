"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { aNumero } from "@/lib/verificaciones/formato";

/**
 * Casilla numérica que puede quedar vacía (una carga que todavía no se cargó)
 * y que acepta 0 (un pilar sin sobrecarga). Como CampoMaterial, guarda el
 * texto mientras se escribe para no comerse la coma de "0,3".
 */
export function CampoNumeroOpcional({
  valor,
  onCambio,
  etiqueta,
  className,
}: {
  valor: number | undefined;
  onCambio: (n: number | undefined) => void;
  etiqueta: string;
  className?: string;
}) {
  const [texto, setTexto] = useState<string | null>(null);
  const guardado = valor === undefined ? "" : String(valor).replace(".", ",");
  const n = texto === null ? NaN : aNumero(texto);
  const mostrado = texto !== null && (!(n >= 0) || n === valor) ? texto : guardado;

  return (
    <Input
      aria-label={etiqueta}
      inputMode="decimal"
      className={className}
      value={mostrado}
      onChange={(e) => {
        const t = e.target.value;
        setTexto(t);
        if (t.trim() === "") return onCambio(undefined);
        const m = aNumero(t);
        if (m >= 0) onCambio(m);
      }}
      onBlur={() => setTexto(null)}
    />
  );
}
