/**
 * Qué respalda cada número que devuelve la herramienta.
 *
 * El motivo de que esto exista: citar artículo y página genera confianza, y esa
 * confianza es justamente lo que hace que nadie vuelva a comprobar el resultado
 * a mano. Si un coeficiente quedó mal transcripto o la norma cambió de edición,
 * el error no se nota — llega con la misma autoridad que el que está bien. Un
 * fallo silencioso en cálculo estructural es mucho peor que uno ruidoso.
 *
 * La respuesta no es prometer más, es declarar menos: cada módulo dice en qué
 * nivel de comprobación está, para que quien lo usa sepa cuánto apoyarse. Un
 * módulo "probado" no es malo; es que todavía no pasó por la auditoría, y eso
 * tiene que estar a la vista y no escondido.
 *
 * Los niveles salen de `AUDITORIA.md`, no de una impresión. Ante la duda, el
 * nivel más bajo.
 */

import type { IdVerificacion } from "@/lib/verificaciones/registry";

export type NivelValidacion = "auditada" | "probada" | "preliminar";

export interface NivelMeta {
  etiqueta: string;
  /** Qué significa, en los términos de quien va a firmar la memoria. */
  significado: string;
}

export const NIVELES_VALIDACION: Record<NivelValidacion, NivelMeta> = {
  auditada: {
    etiqueta: "Auditada contra el articulado",
    significado:
      "Repasada artículo por artículo contra el texto de la norma, con los hallazgos corregidos y anotados. Es el nivel más alto que tiene hoy la herramienta.",
  },
  probada: {
    etiqueta: "Probada, sin auditoría",
    significado:
      "Implementada siguiendo el articulado y con tests automáticos que fijan los resultados, pero sin un repaso independiente artículo por artículo. Contrastá el primer caso contra tu propio cálculo.",
  },
  preliminar: {
    etiqueta: "Preliminar",
    significado:
      "Todavía sin tests automáticos. Tratala como un borrador: sirve para explorar, no para apoyar una memoria sin recalcular.",
  },
};

export interface ValidacionVerificacion {
  nivel: NivelValidacion;
  /** Qué se auditó o qué falta, cuando decirlo cambia cómo hay que leer el resultado. */
  nota?: string;
}

/**
 * Nivel de cada verificación.
 *
 * Las seis `auditada` son exactamente las que `AUDITORIA.md` lista como
 * auditadas a fondo el 2026-08-05, con la nota de hasta dónde llegó cada
 * repaso: en `losas` la auditoría cubrió los mínimos y las separaciones, no el
 * módulo entero, y decirlo importa más que la insignia.
 *
 * Las que ese mismo documento deja anotadas como pendientes llevan la nota
 * puesta, para que el pendiente se vea desde la página y no sólo desde el repo.
 */
export const VALIDACION_POR_VERIFICACION: Record<IdVerificacion, ValidacionVerificacion> = {
  "vigas-flexion-cortante": {
    nivel: "auditada",
    nota: "Flexión y cortante repasados completos. La auditoría corrigió el cortante sin estribos, que iba un 43 % por encima de la norma.",
  },
  "vigas-torsion": {
    nivel: "auditada",
    nota: "Repasada completa, incluida la interacción torsión + cortante, que antes no se comprobaba.",
  },
  zapatas: {
    // Bajó de "auditada": la auditoría cubría cortante y punzonamiento, no la
    // flexión, que sigue siendo EHE-08 (AUDITORIA.md, hallazgo 6).
    nivel: "probada",
    nota: "Terreno, cortante y punzonamiento con momento repasados contra el Anejo 19. La flexión, las cuantías mínimas y el anclaje todavía siguen la EHE-08.",
  },
  fisuracion: {
    nivel: "auditada",
    nota: "Repasada contra el articulado. Al pasar de la EHE-08 al Anejo 19 cambiaron los resultados: el caso de referencia fue de 0,215 a 0,473 mm.",
  },
  losas: {
    nivel: "auditada",
    nota: "La auditoría cubrió los mínimos y las separaciones. El resto del módulo no pasó por ese repaso.",
  },
  cabezales: {
    nivel: "auditada",
    nota: "Modelo de bielas y tirantes repasado; se agregaron las comprobaciones de biela y nudo que faltaban.",
  },

  "zapata-corrida": { nivel: "probada", nota: "Pendiente de auditoría contra el articulado." },
  "zapata-medianeria": { nivel: "probada", nota: "Pendiente de auditoría contra el articulado." },
  "zapata-combinada": { nivel: "probada", nota: "Pendiente de auditoría contra el articulado." },
  "losa-fundacion": { nivel: "probada", nota: "Pendiente de auditoría contra el articulado." },
  pilotes: { nivel: "probada", nota: "Pendiente de auditoría contra el articulado." },
  deformaciones: { nivel: "probada", nota: "Pendiente de auditoría contra el articulado." },
  "longitudes-anclaje": { nivel: "probada", nota: "Pendiente de auditoría contra el articulado." },

  punzonamiento: { nivel: "probada" },
  "vigas-apeo-bielas": { nivel: "probada" },
  "carga-colgada": { nivel: "probada" },
  "mensula-corta": { nivel: "probada" },
  muros: { nivel: "probada" },
  "muros-contencion": {
    nivel: "probada",
    nota: "La parte geotécnica (EC7) queda fuera de la auditoría de hormigón.",
  },
  "losa-steel-deck": { nivel: "probada" },
  "secciones-mixtas": { nivel: "probada" },
  pretensado: { nivel: "probada" },

  viento: {
    nivel: "probada",
    nota: "UNIT 50-84 no está cubierta por la auditoría de hormigón: es otro cuerpo normativo.",
  },

  "compresion-acero": { nivel: "probada" },
  "traccion-acero": { nivel: "probada" },
  "flexion-acero": { nivel: "probada" },
  "corte-acero": { nivel: "probada" },
  "flexo-compresion": { nivel: "probada" },
  soldaduras: { nivel: "probada" },
  "tornillos-acero": { nivel: "probada" },

  "madera-flexion": { nivel: "probada" },
  "madera-cortante": { nivel: "probada" },
  "madera-axil": { nivel: "probada" },
  "madera-flexion-compuesta": { nivel: "probada" },
  "madera-deformaciones": { nivel: "probada" },
  "madera-fuego": { nivel: "probada" },
  "madera-uniones": { nivel: "probada" },
  "madera-seccion-variable": { nivel: "probada" },

  "propiedades-geometricas": { nivel: "probada" },
  "formulario-vigas": { nivel: "probada" },

  "formulario-torsion": {
    nivel: "preliminar",
    nota: "Los casos de torsión todavía no tienen tests automáticos.",
  },
};

export function validacionDe(id: IdVerificacion): ValidacionVerificacion {
  return VALIDACION_POR_VERIFICACION[id];
}

export interface EdicionNorma {
  /** Nombre completo del documento, para que se pueda ir a buscar. */
  titulo: string;
  /** La edición concreta que implementa el motor. */
  edicion: string;
  /** Lo que haya que advertir sobre esa edición. */
  observacion?: string;
}

/**
 * Edición concreta detrás de cada insignia de norma.
 *
 * Decir "EC2" no alcanza: entre dos ediciones cambian coeficientes sin cambiar
 * el número de artículo, y ésa es la vía por la que la trazabilidad se rompe
 * sin que nadie se entere. Lo que está acá sale de las citas del propio código;
 * donde el motor no declara edición, se dice que no la declara en vez de
 * suponer la más nueva.
 */
export const EDICIONES_NORMAS: Record<string, EdicionNorma> = {
  EC2: {
    titulo: "Código Estructural español, Anejo 19 — Proyecto de estructuras de hormigón",
    edicion: "RD 470/2021 (BOE-A-2021-13681)",
    observacion:
      "Es la transposición española del EC2: misma formulación y casi la misma numeración que UNE-EN 1992-1-1. Sustituye a la EHE-08, y donde la planilla original seguía la EHE-08 los resultados cambian.",
  },
  EC4: {
    titulo: "Estructuras mixtas de acero y hormigón",
    edicion: "EN 1994-1-1 y EN 1994-1-2 (situación de incendio)",
  },
  EC5: {
    titulo: "Proyecto de estructuras de madera",
    edicion: "UNE-EN 1995-1-1:2016 y UNE-EN 1995-1-2:2015 (incendio)",
  },
  EC7: {
    titulo: "Proyecto geotécnico",
    edicion: "Edición no declarada en el motor",
    observacion:
      "La parte geotécnica del muro de contención cita el EC7 sin fijar edición. Pendiente de declarar.",
  },
  "AISC 360": {
    titulo: "Specification for Structural Steel Buildings",
    edicion: "AISC 360-16, en los ocho módulos de acero",
    observacion:
      "Es la edición con la que trabaja la herramienta, por decisión de proyecto y no por omisión. Tracción y tornillos llegaron a decir 360-22, que era un rótulo equivocado: lo implementado era 360-16 en los dos casos, comprobado contra el documento —numeración de ecuaciones, valores de la tabla J3.2 y el Du del art. J3.8—. Se corrigió el rótulo sin tocar ningún cálculo.",
  },
  "ACI 318": {
    titulo: "Building Code Requirements for Structural Concrete",
    edicion: "ACI 318-19",
    observacion:
      "Sólo la usa pretensado. No se cruza con el EC2: cada módulo se resuelve entero con la norma que declara.",
  },
  "UNIT 50-84": {
    titulo: "Acción del viento sobre las construcciones (Uruguay)",
    edicion: "UNIT 50-84",
  },
  Geometría: {
    titulo: "Propiedades geométricas de la sección",
    edicion: "Sin norma: es geometría",
    observacion: "Vale igual bajo cualquier reglamento.",
  },
  Estática: {
    titulo: "Estática lineal de vigas",
    edicion: "Sin norma: es resistencia de materiales",
    observacion:
      "No mayora ni minora nada: el resultado hereda el régimen de la carga que se cargue.",
  },
};
