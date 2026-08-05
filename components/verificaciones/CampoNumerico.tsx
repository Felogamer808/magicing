import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CampoNumericoProps {
  id: string;
  etiqueta: string;
  sufijo?: string;
  valor: string;
  onChange: (valor: string) => void;
  /**
   * Valores habituales que se ofrecen como sugerencia al escribir. No restringe:
   * el campo sigue aceptando cualquier número, sólo evita tipear los de siempre
   * y deja a la vista la serie comercial.
   */
  sugerencias?: readonly number[];
  /** Aviso al pie del campo cuando el valor cargado es válido pero llamativo. */
  advertencia?: string;
}

export function CampoNumerico({
  id,
  etiqueta,
  sufijo,
  valor,
  onChange,
  sugerencias,
  advertencia,
}: CampoNumericoProps) {
  const listaId = `${useId()}-sugerencias`;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {etiqueta} {sufijo && <span className="text-muted-foreground">({sufijo})</span>}
      </Label>
      <Input
        id={id}
        type="text"
        inputMode="decimal"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        list={sugerencias ? listaId : undefined}
        aria-describedby={advertencia ? `${id}-aviso` : undefined}
      />
      {sugerencias && (
        <datalist id={listaId}>
          {sugerencias.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
      {advertencia && (
        <p id={`${id}-aviso`} className="text-xs text-muted-foreground">
          {advertencia}
        </p>
      )}
    </div>
  );
}
