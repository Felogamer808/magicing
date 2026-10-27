"use client";

import { useMemo } from "react";
import { useCampo } from "./useCampo";
import { tipoSeccionDesdeCampo, tramoL0DesdeCampo, type TipoSeccion, type TramoL0 } from "@/lib/calc/hormigon/vigas/seccion-t";

/**
 * Campos de la sección en T de las páginas de servicio (fisuración y
 * deformaciones). Tienen los mismos nombres que en flexión y cortante, así el
 * resolver los lee con leerSeccionT igual que allá, y un vínculo desde la viga
 * los copia 1:1.
 *
 * l0 arranca en "vano simple" y no a mano: acá no hay cálculos guardados de
 * antes que respetar.
 */
export function useSeccionT() {
  const [tipoSeccion, setTipoSeccion] = useCampo<TipoSeccion>("tipoSeccion", "rectangular");
  const [anchoAla, setAnchoAla] = useCampo("anchoAla", "1.2");
  const [espesorAla, setEspesorAla] = useCampo("espesorAla", "0.15");
  const [tramoL0, setTramoL0] = useCampo<TramoL0>("tramoL0", "simple");
  const [luz1, setLuz1] = useCampo("luz1", "6");
  const [luz2, setLuz2] = useCampo("luz2", "6");
  const [l0, setL0] = useCampo("l0", "6");

  const tipo = tipoSeccionDesdeCampo(tipoSeccion);
  const campos = useMemo(
    () => ({ tipoSeccion, anchoAla, espesorAla, tramoL0, luz1, luz2, l0 }),
    [tipoSeccion, anchoAla, espesorAla, tramoL0, luz1, luz2, l0]
  );

  return {
    tipo,
    conAla: tipo !== "rectangular",
    tramo: tramoL0DesdeCampo(tramoL0),
    campos,
    setTipoSeccion, setAnchoAla, setEspesorAla, setTramoL0, setLuz1, setLuz2, setL0,
  };
}

export type EstadoSeccionT = ReturnType<typeof useSeccionT>;
