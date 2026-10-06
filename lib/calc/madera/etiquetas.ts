import { NOMBRE_DURACION, NOMBRE_MADERA, type ClaseServicio, type DuracionCarga, type TipoMadera } from "./materiales";

/**
 * Cómo se rotulan en las páginas el tipo de madera, la clase de servicio y la
 * duración de la carga, y cómo se vuelve del rótulo al valor. Viven acá y no
 * en el selector porque los usan también los resolvers, que no tocan React.
 */

export const TIPOS_MADERA: readonly string[] = Object.values(NOMBRE_MADERA);
export const CLASES_SERVICIO = ["Clase 1", "Clase 2", "Clase 3"] as const;
export const DURACIONES: readonly string[] = Object.values(NOMBRE_DURACION);

export function tipoDesdeEtiqueta(etiqueta: string): TipoMadera {
  const par = (Object.entries(NOMBRE_MADERA) as [TipoMadera, string][]).find(
    ([, nombre]) => nombre === etiqueta
  );
  return par ? par[0] : "maciza";
}

export function duracionDesdeEtiqueta(etiqueta: string): DuracionCarga {
  const par = (Object.entries(NOMBRE_DURACION) as [DuracionCarga, string][]).find(
    ([, nombre]) => nombre === etiqueta
  );
  return par ? par[0] : "media";
}

export function servicioDesdeEtiqueta(etiqueta: string): ClaseServicio {
  if (etiqueta === CLASES_SERVICIO[0]) return 1;
  if (etiqueta === CLASES_SERVICIO[2]) return 3;
  return 2;
}
