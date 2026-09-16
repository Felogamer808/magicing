"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { guardarCamposDeRuta } from "@/lib/hooks/useCampo";
import type { DatosVigaCompartidos, Vinculo } from "@/lib/verificaciones/vinculos";

/**
 * Botonera para seguir con otra verificación llevándose lo ya cargado.
 *
 * Cada botón dice qué se lleva y qué queda por cargar del otro lado antes de
 * apretarlo: el arrastre pisa los datos del destino, así que conviene que no
 * sea una sorpresa. Ver lib/verificaciones/vinculos.ts para el porqué del
 * diseño.
 */

interface Props {
  vinculos: Vinculo[];
  datos: DatosVigaCompartidos;
}

export function PanelVinculos({ vinculos, datos }: Props) {
  const router = useRouter();

  const seguirCon = (vinculo: Vinculo) => {
    guardarCamposDeRuta(vinculo.ruta, vinculo.campos(datos), vinculo.blanquear);
    router.push(vinculo.ruta);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Seguir con esta misma viga</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Lleva lo cargado acá a otra verificación, para no tipear dos veces la misma viga. Pisa los
          datos que haya en la verificación de destino.
        </p>
        <div className="space-y-2">
          {vinculos.map((v) => (
            <div key={v.id} className="rounded-md border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-sm">{v.titulo}</p>
                <Button type="button" variant="outline" size="sm" onClick={() => seguirCon(v)}>
                  Llevar los datos <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Se lleva {v.lleva}.</p>
              {v.falta && (
                <p className="text-xs text-muted-foreground">
                  Allá hay que cargar {v.falta}.
                </p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
