"use client";

import { CampoSeleccion } from "@/components/verificaciones/comun/CampoSeleccion";
import { ROTULOS_TIPO_SECCION, tipoSeccionPorRotulo } from "@/lib/calc/hormigon/vigas/seccion-t";
import type { EstadoSeccionT } from "@/lib/hooks/useSeccionT";

/** Selector rectangular / T / T invertida. */
export function CampoTipoSeccion({ seccion }: { seccion: EstadoSeccionT }) {
  return (
    <CampoSeleccion
      id="tipoSeccion"
      etiqueta="Tipo de sección"
      valor={ROTULOS_TIPO_SECCION[seccion.tipo]}
      opciones={Object.values(ROTULOS_TIPO_SECCION)}
      onChange={(x) => seccion.setTipoSeccion(tipoSeccionPorRotulo(x))}
    />
  );
}
