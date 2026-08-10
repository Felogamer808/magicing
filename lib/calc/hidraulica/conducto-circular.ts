/**
 * Escurrimiento a superficie libre en un conducto circular, por Manning.
 *
 * Es el cálculo con el que se dimensiona un colector cloacal o un pluvial: dado
 * un caudal, un diámetro y una pendiente, encontrar a qué altura va a correr el
 * agua y comprobar que la velocidad quede entre lo que no sedimenta y lo que no
 * erosiona.
 *
 * La ecuación de Manning es empírica y no pertenece a ninguna norma: vale igual
 * en cualquier país. Lo que sí cambia con la norma —y por eso son datos de
 * entrada y no constantes— son los límites que se le exigen al resultado: la
 * velocidad mínima de autolimpieza, la máxima admisible y el grado de llenado
 * tope. Cada reglamento pone los suyos.
 */

/** Relación de llenado a la que el caudal es máximo, no en el conducto lleno. */
export const LLENADO_CAUDAL_MAXIMO = 0.938;

export interface DatosConducto {
  /** Caudal de diseño (m³/s) */
  caudalM3s: number;
  /** Diámetro interno del conducto (m) */
  diametroM: number;
  /** Pendiente longitudinal (m/m), no en por mil */
  pendiente: number;
  /** Coeficiente de rugosidad de Manning (s/m^⅓) */
  manning: number;
}

export interface LimitesConducto {
  /** Velocidad mínima de autolimpieza (m/s) */
  velocidadMinimaMs: number;
  /** Velocidad máxima admisible, por erosión (m/s) */
  velocidadMaximaMs: number;
  /** Grado de llenado máximo admitido, y/D */
  llenadoMaximo: number;
}

export interface SeccionMojada {
  /** Altura de agua (m) */
  alturaM: number;
  /** Grado de llenado y/D */
  llenado: number;
  /** Ángulo central mojado (rad) */
  anguloRad: number;
  /** Área mojada (m²) */
  areaM2: number;
  /** Perímetro mojado (m) */
  perimetroM: number;
  /** Radio hidráulico A/P (m) */
  radioHidraulicoM: number;
}

export interface ResultadoConducto {
  seccion: SeccionMojada;
  /** Velocidad media (m/s) */
  velocidadMs: number;
  /** Caudal que efectivamente transporta esa sección (m³/s), para control. */
  caudalVerificacionM3s: number;
  /** Caudal máximo que admite el conducto, al llenado de caudal máximo (m³/s). */
  caudalMaximoM3s: number;
  /** El conducto no da: el caudal pedido supera su capacidad. */
  desborda: boolean;
  verificaVelocidadMinima: boolean;
  verificaVelocidadMaxima: boolean;
  verificaLlenado: boolean;
}

/**
 * Geometría de la sección mojada para un grado de llenado dado.
 *
 * El ángulo sale de la cuerda: con y/D = 0,5 el agua llega al eje y θ = π; lleno,
 * θ = 2π. Área y perímetro son los del sector circular menos el triángulo.
 */
export function seccionMojada(diametroM: number, llenado: number): SeccionMojada {
  const y = Math.min(Math.max(llenado, 0), 1);
  const anguloRad = 2 * Math.acos(1 - 2 * y);
  const areaM2 = ((diametroM ** 2) / 8) * (anguloRad - Math.sin(anguloRad));
  const perimetroM = (diametroM * anguloRad) / 2;

  return {
    alturaM: y * diametroM,
    llenado: y,
    anguloRad,
    areaM2,
    perimetroM,
    radioHidraulicoM: perimetroM > 0 ? areaM2 / perimetroM : 0,
  };
}

/** Caudal por Manning para un llenado dado: Q = A · (1/n) · R^(2/3) · √i. */
export function caudalParaLlenado(d: DatosConducto, llenado: number): number {
  const s = seccionMojada(d.diametroM, llenado);
  if (s.areaM2 <= 0) return 0;
  return (s.areaM2 * s.radioHidraulicoM ** (2 / 3) * Math.sqrt(d.pendiente)) / d.manning;
}

/**
 * Llenado que transporta el caudal pedido, por bisección.
 *
 * Se busca sólo hasta y/D = 0,938 y no hasta el conducto lleno, porque el caudal
 * no crece de forma monótona: pasado ese punto el perímetro mojado crece más
 * rápido que el área y el caudal vuelve a bajar. Buscar en todo el rango daría
 * dos soluciones y la bisección podría devolver la de arriba, que es físicamente
 * inestable —el conducto entraría en carga— y no es la que se proyecta.
 */
function resolverLlenado(d: DatosConducto, caudalObjetivo: number): number {
  let bajo = 0;
  let alto = LLENADO_CAUDAL_MAXIMO;

  for (let i = 0; i < 60; i++) {
    const medio = (bajo + alto) / 2;
    if (caudalParaLlenado(d, medio) < caudalObjetivo) bajo = medio;
    else alto = medio;
  }
  return (bajo + alto) / 2;
}

export function calcularConductoCircular(
  d: DatosConducto,
  limites: LimitesConducto
): ResultadoConducto {
  const caudalMaximoM3s = caudalParaLlenado(d, LLENADO_CAUDAL_MAXIMO);
  const desborda = d.caudalM3s > caudalMaximoM3s;

  const llenado = desborda ? LLENADO_CAUDAL_MAXIMO : resolverLlenado(d, d.caudalM3s);
  const seccion = seccionMojada(d.diametroM, llenado);
  const velocidadMs =
    seccion.areaM2 > 0 ? caudalParaLlenado(d, llenado) / seccion.areaM2 : 0;

  return {
    seccion,
    velocidadMs,
    caudalVerificacionM3s: caudalParaLlenado(d, llenado),
    caudalMaximoM3s,
    desborda,
    verificaVelocidadMinima: !desborda && velocidadMs >= limites.velocidadMinimaMs,
    verificaVelocidadMaxima: !desborda && velocidadMs <= limites.velocidadMaximaMs,
    verificaLlenado: !desborda && llenado <= limites.llenadoMaximo,
  };
}
