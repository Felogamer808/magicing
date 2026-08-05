"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SelectorNormaProps {
  normas: string[];
  valor: string;
  onChange: (valor: string) => void;
}

export function SelectorNorma({ normas, valor, onChange }: SelectorNormaProps) {
  return (
    <Select value={valor} onValueChange={(v) => v && onChange(v)} disabled={normas.length <= 1}>
      <SelectTrigger className="w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {normas.map((norma) => (
          <SelectItem key={norma} value={norma}>
            {norma}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
