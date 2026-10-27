"use client";

import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { CampoSeleccion } from "@/components/verificaciones/comun/CampoSeleccion";
import { aNumero, fmt } from "@/lib/verificaciones/formato";
import {
  LUCES_TRAMO_L0,
  ROTULOS_TRAMO_L0,
  calcularL0,
  leerSeccionT,
  tramoL0PorRotulo,
  type TramoL0,
} from "@/lib/calc/hormigon/vigas/seccion-t";
import type { EstadoSeccionT } from "@/lib/hooks/useSeccionT";

const ETIQUETAS_LUZ: Record<TramoL0, { luz1?: string; luz2?: string }> = {
  simple: { luz1: "l (luz del vano)" },
  extremo: { luz1: "l1 (luz del vano extremo)" },
  interior: { luz1: "l2 (luz de este vano)" },
  apoyo: { luz1: "l1 (vano de un lado)", luz2: "l2 (vano del otro lado)" },
  voladizo: { luz1: "l3 (largo del voladizo)", luz2: "l2 (vano contiguo)" },
  manual: {},
};

interface CamposAlaTProps {
  seccion: EstadoSeccionT;
  /** Ancho del alma y canto, para calcular b_eff en pantalla */
  almaTxt: string;
  cantoTxt: string;
  /**
   * Qué hace el ala con el momento que se verifica (comprimida o traccionada),
   * en las palabras de cada página: cambia todo el cálculo, así que se dice.
   */
  textoLado?: string;
}

/**
 * El ala de la T en las páginas de servicio: ancho real, espesor y el l0 de
 * la fig. A19.5.2 para b_eff. Son los mismos datos que en flexión y cortante.
 */
export function CamposAlaT({ seccion, almaTxt, cantoTxt, textoLado }: CamposAlaTProps) {
  if (!seccion.conAla) return null;
  const { tramo, campos } = seccion;
  const l0 = tramo === "manual" ? aNumero(campos.l0) : calcularL0(tramo, aNumero(campos.luz1), aNumero(campos.luz2));
  const leida = leerSeccionT(campos, aNumero(almaTxt), aNumero(cantoTxt));
  const beff = leida && leida !== "rectangular" ? leida.anchoEficaz : null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4">
        <CampoNumerico id="anchoAla" etiqueta="Ancho del ala" sufijo="m" valor={campos.anchoAla} onChange={seccion.setAnchoAla} />
        <CampoNumerico id="espesorAla" etiqueta="hf" sufijo="m" valor={campos.espesorAla} onChange={seccion.setEspesorAla} />
      </div>
      <p className="text-xs text-muted-foreground">
        El ancho del ala es el real, de borde a borde, con los vuelos iguales a los dos lados.
        {textoLado && ` ${textoLado}`}
      </p>
      <div className="space-y-3 rounded-md border border-border/60 p-3">
        <p className="text-sm font-medium">Ancho eficaz: ¿cuánta ala trabaja?</p>
        <p className="text-xs text-muted-foreground">
          No toda el ala colabora: la que está lejos del alma se queda atrás. Cuánta trabaja depende
          de l0, la distancia entre los puntos donde el momento se anula (Anejo 19, art. 5.3.2.1 y
          fig. A19.5.2). Es el mismo b_eff que en flexión y cortante; en una viga prefabricada
          biapoyada suele mandar el ancho real.
        </p>
        <CampoSeleccion
          id="tramoL0"
          etiqueta="¿En qué zona de la viga está la sección?"
          valor={ROTULOS_TRAMO_L0[tramo]}
          opciones={Object.values(ROTULOS_TRAMO_L0)}
          onChange={(x) => seccion.setTramoL0(tramoL0PorRotulo(x))}
        />
        <div className="grid grid-cols-2 gap-4">
          {LUCES_TRAMO_L0[tramo].includes("l1") && (
            <CampoNumerico id="luz1" etiqueta={ETIQUETAS_LUZ[tramo].luz1 ?? "l1"} sufijo="m" valor={campos.luz1} onChange={seccion.setLuz1} />
          )}
          {LUCES_TRAMO_L0[tramo].includes("l2") && (
            <CampoNumerico id="luz2" etiqueta={ETIQUETAS_LUZ[tramo].luz2 ?? "l2"} sufijo="m" valor={campos.luz2} onChange={seccion.setLuz2} />
          )}
          {tramo === "manual" && <CampoNumerico id="l0" etiqueta="l0" sufijo="m" valor={campos.l0} onChange={seccion.setL0} />}
        </div>
        <p className="font-mono text-[13px] tabular-nums">
          l0 = {Number.isFinite(l0) && l0 > 0 ? `${fmt(l0, 2)} m` : "—"}
          {beff && (
            <span className="ml-3">
              b_eff = <strong>{fmt(beff.anchoEficazM, 3)} m</strong>
              <span className="ml-2 font-sans text-xs text-muted-foreground">
                {beff.mandaAnchoReal ? "(manda el ancho real del ala)" : "(ec. 5.7)"}
              </span>
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
