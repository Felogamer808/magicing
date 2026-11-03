"use client";

import { usePathname, useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { guardarCamposDeRuta } from "@/lib/hooks/useCampo";
import { heredarElementoAbierto } from "@/lib/proyectos/activo";

export interface DestinoDatos {
  titulo: string;
  ruta: string;
  /** Qué viaja, en lenguaje llano. */
  lleva: string;
  /** Qué queda por cargar del otro lado, si algo. */
  falta?: string;
  /** Los campos del destino, ya armados. */
  campos: Record<string, string>;
  /** Campos que el destino pide sí o sí: se dejan en blanco si nunca se cargaron. */
  blanquear?: string[];
}

/**
 * Botonera para seguir con otra verificación llevándose lo ya cargado, cuando
 * los datos no son los de una viga de hormigón (ésos van por PanelVinculos).
 * Mismo criterio: el arrastre es explícito y pisa el destino, así que cada
 * botón dice antes qué se lleva.
 */
export function PanelLlevarDatos({ titulo, destinos }: { titulo: string; destinos: DestinoDatos[] }) {
  const router = useRouter();
  const ruta = usePathname();

  const seguirCon = (d: DestinoDatos) => {
    guardarCamposDeRuta(d.ruta, d.campos, d.blanquear);
    heredarElementoAbierto(ruta, d.ruta);
    router.push(d.ruta);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {destinos.map((d) => (
          <div key={d.ruta} className="rounded-md border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">{d.titulo}</p>
              <Button type="button" variant="outline" size="sm" onClick={() => seguirCon(d)}>
                Llevar los datos <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Se lleva {d.lleva}.</p>
            {d.falta && <p className="text-xs text-muted-foreground">Allá hay que cargar {d.falta}.</p>}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
