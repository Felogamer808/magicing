"use client";

import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { CampoDiametro } from "@/components/verificaciones/comun/CampoDiametro";
import { CampoSeleccion } from "@/components/verificaciones/comun/CampoSeleccion";
import { Subgrupo } from "@/components/verificaciones/comun/HojaTecnica";

type Campo = { valor: string; onChange: (v: string) => void };

interface CamposArmaduraTiranteProps {
  /** Aislada: cantidad de barras; corrida: separación, porque va por metro. */
  modo: "cantidad" | "separacion";
  diametro: Campo;
  cantidadOSeparacion: Campo;
  recubrimiento: Campo;
  extremo: Campo;
  pata: Campo;
  adherencia: Campo;
}

export const EXTREMOS_TIRANTE = ["Barra recta", "Patilla a 90°"] as const;
export const ADHERENCIAS_TIRANTE = ["Buena", "Mala"] as const;

/** Barras del tirante, en la losa, y cómo se anclan en el pilar o muro. */
export function CamposArmaduraTirante({
  modo, diametro, cantidadOSeparacion, recubrimiento, extremo, pata, adherencia,
}: CamposArmaduraTiranteProps) {
  const conPatilla = extremo.valor === EXTREMOS_TIRANTE[1];
  return (
    <Subgrupo titulo="Tirante (armadura de la losa)">
      <div className="grid grid-cols-2 gap-4">
        <CampoDiametro id="diametroTirante" etiqueta="Ø" valor={diametro.valor} onChange={diametro.onChange} />
        {modo === "cantidad" ? (
          <CampoNumerico id="numeroTirante" etiqueta="Nº barras" valor={cantidadOSeparacion.valor} onChange={cantidadOSeparacion.onChange} />
        ) : (
          <CampoNumerico id="separacionTirante" etiqueta="Separación" sufijo="m" valor={cantidadOSeparacion.valor} onChange={cantidadOSeparacion.onChange} />
        )}
        <CampoNumerico id="recubrimientoTirante" etiqueta="Recubrimiento" sufijo="m" valor={recubrimiento.valor} onChange={recubrimiento.onChange} />
        <CampoSeleccion id="adherenciaTirante" etiqueta="Adherencia" valor={adherencia.valor} opciones={ADHERENCIAS_TIRANTE} onChange={adherencia.onChange} />
        <CampoSeleccion id="extremoTirante" etiqueta="Extremo en el apoyo" valor={extremo.valor} opciones={EXTREMOS_TIRANTE} onChange={extremo.onChange} />
        {conPatilla && (
          <CampoNumerico id="pataTirante" etiqueta="Largo de la pata" sufijo="mm" valor={pata.valor} onChange={pata.onChange} />
        )}
        <p className="col-span-2 text-xs text-muted-foreground">
          Las barras que hacen de tirante, en la cara superior de la losa. Se anclan desde la cara
          interior del {modo === "cantidad" ? "pilar" : "muro"} hacia la medianera. Adherencia buena con
          losas de hasta 250 mm de canto; más gruesas, las barras de arriba quedan en adherencia mala
          (fig. A19.8.2).
        </p>
      </div>
    </Subgrupo>
  );
}
