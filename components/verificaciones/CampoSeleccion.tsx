"use client";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CampoSeleccionProps {
  id: string;
  etiqueta: string;
  valor: string;
  opciones: readonly string[];
  onChange: (valor: string) => void;
}

/**
 * Desplegable con etiqueta, hermano de CampoNumerico, para los datos que se
 * eligen de una lista cerrada (tipo de terreno, electrodo, topografía).
 *
 * Ignora el valor vacío que emite Base UI al cerrar sin elegir: si no se
 * filtrara, el campo quedaría en blanco y el cálculo se caería.
 */
export function CampoSeleccion({ id, etiqueta, valor, opciones, onChange }: CampoSeleccionProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{etiqueta}</Label>
      <Select value={valor} onValueChange={(v) => v && onChange(v)}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {opciones.map((o) => (
            <SelectItem key={o} value={o}>{o}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
