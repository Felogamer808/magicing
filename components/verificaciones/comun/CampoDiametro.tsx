"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DIAMETROS_ARMADURA } from "@/lib/calc/armaduras";

const OTRO = "otro";

interface CampoDiametroProps {
  id: string;
  etiqueta: string;
  valor: string;
  onChange: (valor: string) => void;
}

/**
 * Diámetro de armadura: desplegable con la serie comercial (6 a 25 mm) y una
 * opción "Otro" para cualquier valor que no esté en la lista — un φ13, por
 * ejemplo, no se puede comprar pero puede hacer falta cargarlo igual para
 * contrastar un cálculo.
 *
 * Es sólo para barras y estribos de acero corrugado. Otros diámetros del
 * sitio (pilotes, pernos, perfiles huecos) siguen con CampoNumerico: no
 * comparten la serie comercial de armaduras.
 */
export function CampoDiametro({ id, etiqueta, valor, onChange }: CampoDiametroProps) {
  const esComercial = (DIAMETROS_ARMADURA as readonly number[]).some((d) => String(d) === valor);
  const [otroForzado, setOtroForzado] = useState(false);
  const enModoOtro = otroForzado || (valor !== "" && !esComercial);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{etiqueta}</Label>
      <div className="flex gap-2">
        <Select
          value={enModoOtro ? OTRO : valor}
          onValueChange={(v) => {
            if (!v) return;
            if (v === OTRO) {
              setOtroForzado(true);
              return;
            }
            setOtroForzado(false);
            onChange(v);
          }}
        >
          <SelectTrigger id={id} className="w-full">
            <SelectValue placeholder="mm">{(v: string) => (v === OTRO ? "Otro…" : v ? `Ø${v}` : "mm")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {DIAMETROS_ARMADURA.map((d) => (
              <SelectItem key={d} value={String(d)}>
                Ø{d}
              </SelectItem>
            ))}
            <SelectItem value={OTRO}>Otro…</SelectItem>
          </SelectContent>
        </Select>
        {enModoOtro && (
          <Input
            id={`${id}-otro`}
            type="text"
            inputMode="decimal"
            placeholder="mm"
            className="w-20 shrink-0"
            value={valor}
            onChange={(e) => onChange(e.target.value)}
            autoFocus
          />
        )}
      </div>
    </div>
  );
}
