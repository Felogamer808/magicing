import { Card, CardContent } from "@/components/ui/card";
import type { SeccionFueraDeAlcance } from "@/lib/calc/aisc/flexion";

/**
 * Cartel para cuando la sección elegida queda fuera del artículo que resuelve la
 * página. Se muestra en lugar del resultado, a propósito: devolver un número
 * calculado con un artículo que no corresponde sería peor que no dar ninguno.
 */
export function AvisoFueraDeAlcance({ error }: { error: SeccionFueraDeAlcance }) {
  return (
    <Card className="border-amber-600/40">
      <CardContent className="space-y-2 py-6 text-sm">
        <p className="font-medium">Esta sección se verifica por otro artículo</p>
        <p className="text-muted-foreground">{error.message}</p>
        <p className="font-mono text-xs text-muted-foreground">
          Artículo aplicable: AISC 360-16 {error.articuloAplicable}
        </p>
      </CardContent>
    </Card>
  );
}
