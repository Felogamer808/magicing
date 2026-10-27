"use client";

import { usePathname, useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { guardarCamposDeRuta, leerCamposDeRuta } from "@/lib/hooks/useCampo";
import { BLANQUEAR_CAPITELES, RUTA_CAPITELES, camposCapitelDesdePunzonamiento } from "@/lib/verificaciones/vinculos";

/**
 * La salida cuando la losa no punzona bien sola: pasar al mismo pilar con
 * capitel, con los datos ya cargados. Se muestra sólo si no verifica (criterio
 * del usuario, 2026-10-26), como la de la viga centradora en la zapata.
 *
 * Pisa los datos de la página de capiteles, como todo encadenado; por eso el
 * texto lo dice antes de apretar.
 */
export function PropuestaCapitel({ motivo }: { motivo: string }) {
  const ruta = usePathname();
  const router = useRouter();

  const resolver = () => {
    guardarCamposDeRuta(RUTA_CAPITELES, camposCapitelDesdePunzonamiento(leerCamposDeRuta(ruta)), BLANQUEAR_CAPITELES);
    router.push(RUTA_CAPITELES);
  };

  return (
    <div className="space-y-2 rounded-md border border-dashed p-4">
      <p className="text-sm font-medium">Opción: capitel</p>
      <p className="text-sm text-muted-foreground">
        {motivo} Un capitel engrosa la losa sobre el pilar: sube el canto en la cara del pilar y aleja de él el
        perímetro de la losa.
      </p>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Lleva la losa, el pilar, los negativos y la carga. Allá falta el vuelo y el canto del capitel.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={resolver}>
          Resolver con capitel <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
