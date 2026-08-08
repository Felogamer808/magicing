/**
 * Con qué combinación de acciones trabaja cada verificación.
 *
 * No todas piden lo mismo: algunas esperan las solicitaciones ya mayoradas,
 * otras las características y mayoran por dentro, y las de servicio no mayoran
 * nada. Cargar valores del régimen equivocado no da error, da un resultado
 * silenciosamente mal dimensionado, así que cada página lo declara en pantalla.
 */

import type { IdVerificacion } from "./registry";

export type RegimenCombinacion = "elu" | "mixta" | "servicio" | "caracteristica";

export interface Combinacion {
  regimen: RegimenCombinacion;
  /** Título corto para la insignia. */
  etiqueta: string;
  /** Qué tiene que cargar el usuario y qué hace la herramienta con eso. */
  detalle: string;
}

const ELU_MAYORADAS: Combinacion = {
  regimen: "elu",
  etiqueta: "ELU · solicitaciones mayoradas",
  detalle:
    "Los esfuerzos se introducen con los coeficientes de mayoración ya aplicados. La herramienta no los vuelve a mayorar.",
};

const ZAPATAS: Combinacion = {
  regimen: "mixta",
  etiqueta: "Cargas características · sin mayorar",
  detalle:
    "Nk y Mk se cargan sin mayorar. La verificación del terreno los usa tal cual, y el armado y el punzonamiento aplican γ = 1,5 internamente.",
};

const PILOTES: Combinacion = {
  regimen: "mixta",
  etiqueta: "Cargas características · sin mayorar",
  detalle:
    "Nk se carga sin mayorar. La capacidad geotécnica se compara contra Nk con el factor de seguridad indicado, y la verificación estructural aplica γ = 1,5.",
};

const CABEZAL: Combinacion = {
  regimen: "elu",
  etiqueta: "ELU · carga del pilar mayorada",
  detalle:
    "Nd del pilar se carga ya mayorado. Al peso propio del cabezal la herramienta le aplica γ = 1,35 por su cuenta.",
};

const SERVICIO_CUASIPERMANENTE: Combinacion = {
  regimen: "servicio",
  etiqueta: "ELS · combinación cuasipermanente",
  detalle:
    "El momento es el de servicio en combinación cuasipermanente, no el de cálculo. Usar el mayorado da aberturas de fisura irreales.",
};

const SERVICIO_ASD: Combinacion = {
  regimen: "servicio",
  etiqueta: "ASD · cargas de servicio",
  detalle:
    "Método de tensiones admisibles: las solicitaciones son de servicio y se comparan contra la resistencia nominal dividida por Ω.",
};

const MURO: Combinacion = {
  regimen: "servicio",
  etiqueta: "Valores característicos · servicio",
  detalle:
    "Empujes y pesos sin mayorar. La seguridad se verifica con factores FS ≥ 1,5 sobre vuelco y deslizamiento, no mayorando las acciones.",
};

const PRETENSADO: Combinacion = {
  regimen: "mixta",
  etiqueta: "Cargas de servicio · sin mayorar",
  detalle:
    "Las cargas se introducen sin mayorar. Las tensiones en servicio y las flechas las usan tal cual, y la flexión última aplica 1,2·D + 1,6·L por dentro.",
};

const VIENTO: Combinacion = {
  regimen: "caracteristica",
  etiqueta: "Acción característica",
  detalle:
    "La presión y las cargas por nivel que devuelve son características. Hay que mayorarlas al entrar en la combinación de cálculo.",
};

/*
 * Hidráulica no trabaja con estados límite ni mayora acciones: se dimensiona con
 * un caudal de proyecto y se comprueba que el escurrimiento quede dentro de
 * ciertos límites. El régimen "característica" es el que corresponde —el dato
 * entra tal cual— y el detalle aclara de dónde tiene que salir ese caudal, que
 * es la decisión que más condiciona el resultado.
 */
const CAUDAL_DE_PROYECTO: Combinacion = {
  regimen: "caracteristica",
  etiqueta: "Caudal de proyecto",
  detalle:
    "El caudal se introduce ya mayorado por el coeficiente de pico y el horizonte de diseño que corresponda. La herramienta no lo afecta: lo toma tal cual para resolver el escurrimiento.",
};

/**
 * Combinación de cada verificación, por su id en el registro.
 *
 * El Record va sobre `IdVerificacion` y no sobre `string` a propósito: agregar
 * una verificación sin declarar con qué régimen trabaja tiene que romper la
 * compilación. Antes no lo hacía, y cinco se quedaron sin declarar —las cuatro
 * de acero y la de pretensado—, con lo cual `AvisoCombinacion` no mostraba nada
 * y la página quedaba sin el cartel que evita cargar el régimen equivocado.
 */
export const COMBINACION_POR_VERIFICACION: Record<IdVerificacion, Combinacion> = {
  "vigas-flexion-cortante": ELU_MAYORADAS,
  "vigas-torsion": ELU_MAYORADAS,
  "vigas-apeo": ELU_MAYORADAS,
  "vigas-apeo-bielas": ELU_MAYORADAS,
  losas: ELU_MAYORADAS,
  zapatas: ZAPATAS,
  "zapata-corrida": ZAPATAS,
  "zapata-medianeria": ZAPATAS,
  "zapata-combinada": ZAPATAS,
  "losa-fundacion": ZAPATAS,
  pilotes: PILOTES,
  cabezales: CABEZAL,
  fisuracion: SERVICIO_CUASIPERMANENTE,
  "muros-contencion": MURO,
  "secciones-mixtas": SERVICIO_ASD,
  soldaduras: SERVICIO_ASD,
  "compresion-acero": SERVICIO_ASD,
  "flexion-acero": SERVICIO_ASD,
  "corte-acero": SERVICIO_ASD,
  "flexo-compresion": SERVICIO_ASD,
  pretensado: PRETENSADO,
  viento: VIENTO,
  "conducto-circular": CAUDAL_DE_PROYECTO,
};

export function combinacionDe(idVerificacion: IdVerificacion): Combinacion {
  return COMBINACION_POR_VERIFICACION[idVerificacion];
}
