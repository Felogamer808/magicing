"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { nombreNorma } from "@/lib/verificaciones/validacion";

interface SelectorNormaProps {
  normas: string[];
  valor: string;
  onChange: (valor: string) => void;
}

export function SelectorNorma({ normas, valor, onChange }: SelectorNormaProps) {
  return (
    <Select value={valor} onValueChange={(v) => v && onChange(v)} disabled={normas.length <= 1}>
      <SelectTrigger className="w-36">
        <SelectValue>{(valor: string) => nombreNorma(valor)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {normas.map((norma) => (
          <SelectItem key={norma} value={norma}>
            {nombreNorma(norma)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
