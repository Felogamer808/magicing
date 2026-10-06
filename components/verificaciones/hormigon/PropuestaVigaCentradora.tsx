"use client";

import { usePathname, useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { guardarCamposDeRuta, leerCamposDeRuta } from "@/lib/hooks/useCampo";
import {
  BLANQUEAR_VIGA_CENTRADORA,
  RUTA_VIGA_CENTRADORA,
  camposVigaCentradoraDesdeZapata,
} from "@/lib/verificaciones/vinculos";

/**
 * La salida cuando una zapata con el pilar descentrado no da: pasar a viga
 * centradora con los mismos datos. Se ofrece siempre que el pilar está
 * descentrado en A, y se destaca cuando la resultante sale del núcleo, que es
 * cuando agrandar la zapata deja de servir.
 *
 * Pisa los datos de la página de destino, como todo encadenado; por eso el
 * texto lo dice antes de apretar.
 */
export function PropuestaVigaCentradora({ necesaria }: { necesaria: boolean }) {
  const ruta = usePathname();
  const router = useRouter();

  const resolver = () => {
    const destino = camposVigaCentradoraDesdeZapata(leerCamposDeRuta(ruta));
    guardarCamposDeRuta(RUTA_VIGA_CENTRADORA, destino, BLANQUEAR_VIGA_CENTRADORA);
    router.push(RUTA_VIGA_CENTRADORA);
  };

  return (
    <div className="space-y-2 rounded-md border border-dashed p-4">
      <p className="text-sm font-medium">
        {necesaria ? "Agrandar la zapata no va a resolverlo" : "Opción: viga centradora"}
      </p>
      <p className="text-sm text-muted-foreground">
        {necesaria
          ? "Con el pilar contra el límite, la resultante queda a c/2 del borde y el terreno apoya en una cuña de 1,5·c, sea cual sea el largo. La salida es una viga centradora que tome el momento y deje la zapata con presión centrada."
          : "Con el pilar descentrado, una viga centradora hacia una zapata interior toma el momento del descentramiento y deja esta zapata con presión centrada."}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Lleva la zapata, el pilar y las cargas. Allá falta la luz hasta la zapata interior y la viga.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={resolver}>
          Resolver con viga centradora <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
