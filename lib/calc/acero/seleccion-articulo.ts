/**
 * Elección del artículo que corresponde a cada sección.
 *
 * El capítulo F y el G no son un artículo cada uno: son familias de artículos, y
 * cuál aplica lo decide la forma de la sección, no quien la usa. Concentrar esa
 * decisión acá evita que cada página la repita —y que alguna la repita mal—.
 *
 *   Flexión   abierta → F2      rectangular o cajón → F7      redonda → F8
 *   Corte     abierta → G2      rectangular o cajón → G4      redonda → G5
 */

import {
  calcularFlexion,
  calcularFlexionEjeDebil,
  type DatosFlexion,
  type ResultadoFlexion,
} from "@/lib/calc/acero/flexion";
import {
  calcularF7,
  calcularF8,
  type DatosFlexionCerrada,
  type ResultadoF7,
  type ResultadoF8,
} from "@/lib/calc/acero/flexion-cerradas";
import { calcularCorte, type DatosCorte, type ResultadoCorte } from "@/lib/calc/acero/corte";
import {
  calcularG4,
  calcularG5,
  type DatosCorteCerrada,
  type ResultadoG4,
  type ResultadoG5,
} from "@/lib/calc/acero/corte-cerradas";
import { propiedades } from "@/lib/calc/acero/perfiles";

export type ResultadoFlexionCualquiera = ResultadoFlexion | ResultadoF7 | ResultadoF8;
export type ResultadoCorteCualquiera = ResultadoCorte | ResultadoG4 | ResultadoG5;

export function calcularFlexionSegunSeccion(
  datos: DatosFlexion & DatosFlexionCerrada
): ResultadoFlexionCualquiera {
  const p = propiedades(datos.familia, datos.params);
  if (!p.esCerrada) return calcularFlexion(datos);
  return datos.familia === "tubo-redondo" ? calcularF8(datos) : calcularF7(datos);
}

/**
 * Momento admisible alrededor del eje débil, para la interacción del art. H1.
 * En sección abierta lo da F6; en cerrada, F7 girado 90° o F8, que por ser
 * axisimétrico devuelve lo mismo que el eje fuerte.
 */
export function momentoAdmisibleEjeDebil(
  datos: DatosFlexion & DatosFlexionCerrada
): number {
  const p = propiedades(datos.familia, datos.params);
  if (!p.esCerrada) return calcularFlexionEjeDebil(datos).admisibleKNm;
  if (datos.familia === "tubo-redondo") return calcularF8(datos).admisibleKNm;
  return calcularF7({ ...datos, eje: "débil" }).admisibleKNm;
}

export function calcularCorteSegunSeccion(
  datos: DatosCorte & DatosCorteCerrada
): ResultadoCorteCualquiera {
  const p = propiedades(datos.familia, datos.params);
  if (!p.esCerrada) return calcularCorte(datos);
  return datos.familia === "tubo-redondo" ? calcularG5(datos) : calcularG4(datos);
}
