import { aNumero } from "@/lib/verificaciones/formato";
import {
  parametrosDe,
  parametrosPorDefecto,
  type ClaveParametro,
  type Familia,
  type ParametrosPerfil,
} from "./perfiles";

/** Los parámetros de una familia como texto, con coma decimal, como se guardan. */
export function textoDeParametros(valores: ParametrosPerfil): Record<string, string> {
  const texto: Record<string, string> = {};
  for (const [clave, valor] of Object.entries(valores)) {
    texto[clave] = String(valor).replace(".", ",");
  }
  return texto;
}

/**
 * La sección elegida a partir de lo guardado: la familia y sus parámetros
 * serializados en un único campo.
 *
 * Es la lógica de `useSeccionAcero` sin React, para que la pantalla y las
 * recomendaciones lean la sección igual. Lo que no se guardó toma el valor por
 * defecto de la familia.
 */
export function seccionDesdeCampos(familia: Familia, crudo: string) {
  let guardado: Record<string, string> = {};
  try {
    const leido: unknown = JSON.parse(crudo);
    if (leido && typeof leido === "object") guardado = leido as Record<string, string>;
  } catch {
    // Un campo corrupto no rompe la página: queda con los valores por defecto.
  }
  const paramsTexto: Record<string, string> = { ...textoDeParametros(parametrosPorDefecto(familia)) };
  for (const p of parametrosDe(familia)) {
    if (guardado[p.clave] !== undefined) paramsTexto[p.clave] = guardado[p.clave];
  }

  const params: ParametrosPerfil = {};
  for (const [clave, texto] of Object.entries(paramsTexto)) {
    const v = aNumero(texto);
    if (Number.isFinite(v)) params[clave as ClaveParametro] = v;
  }

  // Todos los parámetros con un número válido y positivo (la separación puede ser 0).
  const completos = parametrosDe(familia).every((p) => {
    const v = params[p.clave];
    if (v === undefined) return false;
    return p.clave === "separacion" ? v >= 0 : v > 0;
  });

  return { familia, paramsTexto, params, completos };
}
