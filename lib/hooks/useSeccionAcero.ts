"use client";

import { useCallback, useMemo } from "react";
import { useCampo } from "./useCampo";
import {
  parametrosDe,
  parametrosPorDefecto,
  type ClaveParametro,
  type Familia,
  type ParametrosPerfil,
} from "@/lib/calc/aisc/perfiles";
import { aNumero } from "@/lib/verificaciones/formato";

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
  const porDefecto = useMemo(() => textoDe(parametrosPorDefecto(familiaInicial)), [familiaInicial]);

  const [familia, guardarFamilia] = useCampo<Familia>("familia", familiaInicial);
  const [crudo, guardarCrudo] = useCampo("params", JSON.stringify(porDefecto));

  const paramsTexto = useMemo(() => {
    let guardado: Record<string, string> = {};
    try {
      const leido: unknown = JSON.parse(crudo);
      if (leido && typeof leido === "object") guardado = leido as Record<string, string>;
    } catch {
      // Valor corrupto en el almacenamiento: se cae a los valores por defecto.
    }
    // Al cambiar de familia el valor guardado puede no tener las claves nuevas.
    const completo: Record<string, string> = { ...textoDe(parametrosPorDefecto(familia)) };
    for (const p of parametrosDe(familia)) {
      if (guardado[p.clave] !== undefined) completo[p.clave] = guardado[p.clave];
    }
    return completo;
  }, [crudo, familia]);

  const params: ParametrosPerfil = useMemo(() => {
    const n: ParametrosPerfil = {};
    for (const [clave, texto] of Object.entries(paramsTexto)) {
      const v = aNumero(texto);
      if (Number.isFinite(v)) n[clave as ClaveParametro] = v;
    }
    return n;
  }, [paramsTexto]);

  const cambiarFamilia = useCallback(
    (nueva: Familia) => {
      guardarFamilia(nueva);
      // Los parámetros de la familia anterior no valen para la nueva: una altura
      // de catálogo no es un diámetro. Se reinician a los valores por defecto.
      guardarCrudo(JSON.stringify(textoDe(parametrosPorDefecto(nueva))));
    },
    [guardarFamilia, guardarCrudo]
  );

  const cambiarParam = useCallback(
    (clave: ClaveParametro, valor: string) => {
      guardarCrudo(JSON.stringify({ ...paramsTexto, [clave]: valor }));
    },
    [guardarCrudo, paramsTexto]
  );

  /** true si todos los parámetros de la familia tienen un número válido y positivo. */
  const completos = useMemo(
    () =>
      parametrosDe(familia).every((p) => {
        const v = params[p.clave];
        if (v === undefined) return false;
        // La separación entre perfiles puede ser cero: son perfiles en contacto.
        return p.clave === "separacion" ? v >= 0 : v > 0;
      }),
    [familia, params]
  );

  return { familia, cambiarFamilia, paramsTexto, params, cambiarParam, completos };
}

function textoDe(valores: ParametrosPerfil): Record<string, string> {
  const texto: Record<string, string> = {};
  for (const [clave, valor] of Object.entries(valores)) {
    texto[clave] = String(valor).replace(".", ",");
  }
  return texto;
}
