/**
 * Con qué combinación de acciones trabaja cada verificación.
 *
 * No todas piden lo mismo: algunas esperan las solicitaciones ya mayoradas,
 * otras las características y mayoran por dentro, y las de servicio no mayoran
 * nada. Cargar valores del régimen equivocado no da error, da un resultado
 * silenciosamente mal dimensionado, así que cada página lo declara en pantalla.
 */

import type { IdVerificacion } from "./registry";

export type RegimenCombinacion =
  | "elu"
  | "mixta"
  | "servicio"
  | "caracteristica"
  | "herramienta";

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

/*
 * El muro portante es el caso inverso al de contención, y por eso no comparten
 * régimen: acá la acción dominante es el axil que baja de la estructura, que
 * llega de la combinación de cálculo ya mayorado, y la verificación es de
 * agotamiento de la sección.
 */
const MURO_PORTANTE: Combinacion = {
  regimen: "elu",
  etiqueta: "ELU · axil y momentos mayorados",
  detalle:
    "NEd y los momentos de extremo entran ya mayorados. La herramienta no los vuelve a mayorar: sólo les suma la excentricidad mínima y, si el muro es esbelto, el momento de segundo orden.",
};

const PRETENSADO: Combinacion = {
  regimen: "mixta",
  etiqueta: "Cargas de servicio · sin mayorar",
  detalle:
    "Las cargas se introducen sin mayorar. Las tensiones en servicio y las flechas las usan tal cual, y la flexión última aplica 1,2·D + 1,6·L por dentro.",
};

/*
 * La madera es el único material donde la combinación no basta para fijar la
 * resistencia: kmod depende además de cuánto dura la acción de MENOR duración
 * de esa combinación (art. 3.1.3(2)). Por eso el aviso no habla sólo de si los
 * esfuerzos vienen mayorados, sino de que la duración es un dato de entrada más.
 */
const MADERA_ELU: Combinacion = {
  regimen: "elu",
  etiqueta: "ELU · esfuerzos mayorados + clase de duración",
  detalle:
    "Los esfuerzos entran ya mayorados. Además hay que declarar la clase de duración de la carga: kmod la toma de la acción de menor duración de la combinación, no de la dominante.",
};

/*
 * Servicio en madera pide separar G de Q, cosa que ninguna otra verificación
 * necesita: las ecs. (2.3) a (2.5) aplican kdef entero a la permanente y sólo
 * ψ2·kdef a la variable, porque la parte de la sobrecarga que no está siempre
 * puesta no fluye. Por eso el formulario tiene dos casillas de carga y no una.
 */
const MADERA_SERVICIO: Combinacion = {
  regimen: "servicio",
  etiqueta: "ELS · cargas sin mayorar, separadas en G y Q",
  detalle:
    "Las cargas se introducen de servicio y por separado: la permanente fluye entera y la variable sólo en su fracción casi permanente ψ2. Los módulos son los medios, no los del quinto percentil.",
};

/*
 * Incendio es combinación accidental, y eso cambia dos cosas a la vez que se
 * confunden: los esfuerzos bajan —las variables entran con ψ1 o ψ2, no con γQ—
 * y las resistencias suben, porque γM pasa a 1,0 y encima se aplica kfi. Cargar
 * acá los esfuerzos de ELU es el error típico, y da una pieza mucho más gorda
 * de lo necesario.
 */
const MADERA_INCENDIO: Combinacion = {
  regimen: "mixta",
  etiqueta: "Accidental · esfuerzos de la combinación de incendio",
  detalle:
    "Los esfuerzos son los de la combinación accidental, bastante menores que los de ELU. La herramienta aplica por dentro kmod,fi = 1, γM,fi = 1 y el kfi de la tabla 2.1 del EC5-1-2.",
};

/*
 * La losa mixta junta dos comprobaciones con regímenes distintos, y por eso no
 * alcanza con "mayorado" o "característico": hay que decir cuál va con cuál.
 *
 * La flexión recibe MEd ya mayorado, igual que ELU_MAYORADAS. El rasante no:
 * carga las cargas características y los propios γG/γQ, porque la planilla
 * original los deja como dato ajustable ("ajustar a combinación normativa") en
 * vez de fijarlos, y la herramienta mayora adentro con esos coeficientes.
 * Cargar MEd de cálculo en la primera tarjeta y Gk/Qk característicos en la de
 * acciones es lo que hay que tener presente para no cruzarlos.
 */
const LOSA_STEEL_DECK: Combinacion = {
  regimen: "mixta",
  etiqueta: "Flexión: MEd mayorado · Rasante: Gk/Qk con γG y γQ como dato",
  detalle:
    "La tarjeta de flexión recibe MEd ya mayorado, sin volver a afectarlo. La de rasante recibe Gk y Qk sin mayorar: wEd sale de aplicarles γG y γQ, que también son datos de entrada.",
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
 * Las dos herramientas de geometría y estática no verifican nada contra una
 * norma, así que no tienen combinación de acciones. Se declara igual, y se
 * declara explícita: dejarlas fuera de la tabla obligaría a aflojar el Record y
 * con eso perderíamos el chequeo que reclama el régimen de las que sí verifican.
 */
const SIN_COMBINACION: Combinacion = {
  regimen: "herramienta",
  etiqueta: "Herramienta · sin combinación de acciones",
  detalle:
    "Es geometría pura: no interviene ninguna acción ni coeficiente de mayoración, y el resultado sirve igual para ELU que para ELS.",
};

/*
 * Longitudes de anclaje no pide ninguna acción: la barra se ancla para la
 * fuerza que desarrollaría en fluencia plena (σsd = fyd), la hipótesis más
 * conservadora. Es la misma razón por la que no hay "carga" que cargar acá.
 */
const ANCLAJE_REFERENCIA: Combinacion = {
  regimen: "herramienta",
  etiqueta: "Herramienta · asume fluencia plena (σsd = fyd)",
  detalle:
    "No pide ninguna acción: la longitud sale de anclar la barra a la fuerza que desarrollaría al 100% de fyd, del lado seguro. Si As real supera bastante a As necesaria, el anclaje real puede ser más corto que el que da acá.",
};

const ESTATICA_LINEAL: Combinacion = {
  regimen: "herramienta",
  etiqueta: "Herramienta · el resultado hereda el régimen de la carga",
  detalle:
    "No mayora ni minora nada. Si se cargan acciones características salen esfuerzos característicos; si se cargan mayoradas, salen de cálculo. La flecha sólo tiene sentido con cargas de servicio.",
};

const TORSION_ESTATICA: Combinacion = {
  regimen: "herramienta",
  etiqueta: "Herramienta · el resultado hereda el régimen de la carga",
  detalle: "No mayora ni minora nada: el par o la carga que se cargue define el régimen del torsor que devuelve.",
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
  "vigas-apeo-bielas": ELU_MAYORADAS,
  "carga-colgada": ELU_MAYORADAS,
  "mensula-corta": ELU_MAYORADAS,
  losas: ELU_MAYORADAS,
  zapatas: ZAPATAS,
  "zapata-corrida": ZAPATAS,
  "zapata-medianeria": ZAPATAS,
  "zapata-combinada": ZAPATAS,
  "losa-fundacion": ZAPATAS,
  pilotes: PILOTES,
  cabezales: CABEZAL,
  fisuracion: SERVICIO_CUASIPERMANENTE,
  "longitudes-anclaje": ANCLAJE_REFERENCIA,
  "muros-contencion": MURO,
  muros: MURO_PORTANTE,
  "secciones-mixtas": SERVICIO_ASD,
  soldaduras: SERVICIO_ASD,
  "compresion-acero": SERVICIO_ASD,
  "traccion-acero": SERVICIO_ASD,
  "flexion-acero": SERVICIO_ASD,
  "corte-acero": SERVICIO_ASD,
  "flexo-compresion": SERVICIO_ASD,
  pretensado: PRETENSADO,
  viento: VIENTO,
  "conducto-circular": CAUDAL_DE_PROYECTO,
  "propiedades-geometricas": SIN_COMBINACION,
  "formulario-vigas": ESTATICA_LINEAL,
  "formulario-torsion": TORSION_ESTATICA,
  "madera-flexion": MADERA_ELU,
  "madera-cortante": MADERA_ELU,
  "madera-axil": MADERA_ELU,
  "madera-flexion-compuesta": MADERA_ELU,
  "madera-deformaciones": MADERA_SERVICIO,
  "madera-fuego": MADERA_INCENDIO,
  "madera-uniones": MADERA_ELU,
  "madera-seccion-variable": MADERA_ELU,
  "losa-steel-deck": LOSA_STEEL_DECK,
};

export function combinacionDe(idVerificacion: IdVerificacion): Combinacion {
  return COMBINACION_POR_VERIFICACION[idVerificacion];
}
