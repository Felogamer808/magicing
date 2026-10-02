"use client";

import type { ReactNode } from "react";
import { DatosConDibujo } from "@/components/verificaciones/comun/HojaTecnica";
import { CampoNumerico } from "@/components/verificaciones/comun/CampoNumerico";
import { CampoSeleccion } from "@/components/verificaciones/comun/CampoSeleccion";
import { CroquisSeccionAcero } from "@/components/verificaciones/acero/CroquisSeccionAcero";
import {
  familias,
  nombreFamilia,
  parametrosDe,
  type ClaveParametro,
  type Familia,
  type ParametrosPerfil,
} from "@/lib/calc/acero/perfiles";

interface Props {
  familia: Familia;
  paramsTexto: Record<string, string>;
  params: ParametrosPerfil;
  onFamiliaChange: (familia: Familia) => void;
  onParamChange: (clave: ClaveParametro, valor: string) => void;
  /** Campos que van debajo de los de la sección, del mismo lado del croquis. */
  children?: ReactNode;
}

const etiquetas = familias.map((f) => nombreFamilia[f]);

/**
 * Elección de la sección, con el croquis al lado.
 *
 * Los campos que siguen a la familia no son fijos: los declara la propia familia
 * en `parametrosDe`. Es lo que permite que al pasar de un PNI a un tubo redondo
 * el segundo campo deje de ser una altura de catálogo y pase a ser un diámetro
 * con su espesor.
 */
export function SelectorSeccionAcero({
  familia,
  paramsTexto,
  params,
  onFamiliaChange,
  onParamChange,
  children,
}: Props) {
  const parametros = parametrosDe(familia);

  return (
    <DatosConDibujo
      dibujo={<CroquisSeccionAcero familia={familia} params={params} />}
      datos={
        <>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-full">
            <CampoSeleccion
              id="familia"
              etiqueta="Familia"
              valor={nombreFamilia[familia]}
              opciones={etiquetas}
              onChange={(etiqueta) => {
                const elegida = familias.find((f) => nombreFamilia[f] === etiqueta);
                if (elegida) onFamiliaChange(elegida);
              }}
            />
          </div>

          {parametros.map((p) =>
            p.tipo === "lista" ? (
              <CampoSeleccion
                key={p.clave}
                id={p.clave}
                etiqueta={p.etiqueta}
                valor={paramsTexto[p.clave] ?? ""}
                opciones={(p.opciones ?? []).map(String)}
                onChange={(v) => onParamChange(p.clave, v)}
              />
            ) : (
              <CampoNumerico
                key={p.clave}
                id={p.clave}
                etiqueta={p.etiqueta}
                sufijo={p.sufijo}
                valor={paramsTexto[p.clave] ?? ""}
                onChange={(v) => onParamChange(p.clave, v)}
              />
            )
          )}
        </div>
        {children}
        </>
      }
    />
  );
}
