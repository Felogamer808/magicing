import { Label } from "@/components/ui/label";

interface CampoPilotesProps {
  id: string;
  valor: string;
  onChange: (valor: string) => void;
}

/** Los centros de los pilotes, «A B» por pilote, como los lee `leerPilotes`. */
export function CampoPilotes({ id, valor, onChange }: CampoPilotesProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        Centros de los pilotes <span className="text-muted-foreground">(m)</span>
      </Label>
      <textarea
        id={id}
        rows={4}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-input bg-transparent px-3 py-2 font-mono text-sm"
        aria-describedby={`${id}-ayuda`}
      />
      <p id={`${id}-ayuda`} className="text-xs text-muted-foreground">
        Un pilote por línea o separados por «;»: A y B desde el centro del cabezal, con un espacio entre los dos. Tres o más.
      </p>
    </div>
  );
}
