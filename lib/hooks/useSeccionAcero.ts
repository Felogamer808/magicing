"use client";

import { useCallback, useMemo } from "react";
import { useCampo } from "./useCampo";
import { parametrosPorDefecto, type ClaveParametro, type Familia } from "@/lib/calc/acero/perfiles";
import { seccionDesdeCampos, textoDeParametros } from "@/lib/calc/acero/seccion-campos";

/**
 * Estado de la sección elegida en una página de metálicas.
 *
 * Los parámetros no son fijos: dependen de la familia. Un PNI necesita altura;
 * un tubo redondo, diámetro y espesor. Como no se puede llamar a un hook por
 * parámetro cuando la lista cambia, se guardan todos juntos en un único campo
 * serializado y se derivan de ahí.
 *
 * Se conserva el texto tal como se tipea, no el número, para no pelear con la
 * coma decimal ni con los estados intermedios de escritura.
 */
export function useSeccionAcero(familiaInicial: Familia) {
  const porDefecto = useMemo(() => textoDeParametros(parametrosPorDefecto(familiaInicial)), [familiaInicial]);

  const [familia, guardarFamilia] = useCampo<Familia>("familia", familiaInicial);
  const [crudo, guardarCrudo] = useCampo("params", JSON.stringify(porDefecto));

  const { paramsTexto, params, completos } = useMemo(() => seccionDesdeCampos(familia, crudo), [crudo, familia]);

  const cambiarFamilia = useCallback(
    (nueva: Familia) => {
      guardarFamilia(nueva);
      // Los parámetros de la familia anterior no valen para la nueva: una altura
      // de catálogo no es un diámetro. Se reinician a los valores por defecto.
      guardarCrudo(JSON.stringify(textoDeParametros(parametrosPorDefecto(nueva))));
    },
    [guardarFamilia, guardarCrudo]
  );

  const cambiarParam = useCallback(
    (clave: ClaveParametro, valor: string) => {
      guardarCrudo(JSON.stringify({ ...paramsTexto, [clave]: valor }));
    },
    [guardarCrudo, paramsTexto]
  );

  // `crudo` es lo guardado tal cual: lo usan los resolvers de cada página.
  return { familia, cambiarFamilia, paramsTexto, params, cambiarParam, completos, crudo };
}

