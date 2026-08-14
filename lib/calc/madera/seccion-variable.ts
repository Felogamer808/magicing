/**
 * Piezas de canto variable y de forma curva: art. 6.4.
 *
 * Son las vigas laminadas de gran luz, y tienen dos problemas que las de canto
 * constante no tienen:
 *
 * 1. **En el borde inclinado la fibra ya no es paralela al borde.** Cortar la
 *    lámina en pendiente deja las fibras terminando contra la cara, así que la
 *    tensión de flexión llega ahí acompañada de tracción perpendicular y de
 *    rasante. Eso lo recoge km,α.
 * 2. **En el vértice aparece tracción perpendicular a la fibra.** El momento
 *    intenta enderezar las láminas curvadas y las despega entre sí. Es la
 *    debilidad estructural de la madera —ft,90,k anda por 0,5 MPa, cuarenta
 *    veces menos que fm,k— y la razón de que estas vigas fallen por
 *    delaminación en el vértice y no por flexión.
 *
 * El apartado 6.4.3 **sólo se aplica a laminada encolada y microlaminada**,
 * art. 6.4.3(1): en maciza no hay láminas que despegar ni radio de curvatura
 * que penalizar.
 */

/** Qué le pasa al borde inclinado, que es lo que elige entre (6.39) y (6.40). */
export type EstadoBordeInclinado = "traccionado" | "comprimido";

/**
 * km,α, ecs. (6.39) y (6.40).
 *
 * La elección entre las dos expresiones **no depende del signo del momento**
 * sino de si el borde inclinado queda traccionado o comprimido, que además
 * depende de hacia dónde se cortó la pendiente. La planilla original lo pide
 * como «momento positivo o negativo», y esa traducción falla en cuanto la
 * pendiente cambia de cara.
 *
 * La diferencia no es menor: la rama de tracción divide el rasante por 0,75 y
 * la de compresión por 1,5 —factor dos— y compara contra ft,90,d en vez de
 * fc,90,d, que en madera difieren en un factor cinco. Equivocar la rama puede
 * duplicar el km,α.
 */
export function kmAlpha(
  estado: EstadoBordeInclinado,
  anguloGrados: number,
  fmdMPa: number,
  fvdMPa: number,
  f90dMPa: number
): number {
  const tan = Math.tan((anguloGrados * Math.PI) / 180);
  const coeficienteRasante = estado === "traccionado" ? 0.75 : 1.5;

  const terminoRasante = (fmdMPa * tan) / (coeficienteRasante * fvdMPa);
  const termino90 = (fmdMPa * tan ** 2) / f90dMPa;

  return 1 / Math.sqrt(1 + terminoRasante ** 2 + termino90 ** 2);
}

export interface SeccionCriticaTaper {
  /** Distancia del apoyo a la sección crítica a flexión. */
  posicionM: number;
  /** Canto en esa sección. */
  cantoM: number;
  /** Momento en esa sección, con carga uniformemente distribuida. */
  momentoKNm: number;
  sigmaMdMPa: number;
}

/**
 * Sección crítica de una viga de canto variable a un agua con carga uniforme.
 *
 * No está en el vértice ni en el centro de la luz: la tensión de flexión es
 * M(x)/W(x) y las dos crecen a distinto ritmo, así que el máximo cae en
 * x = 0,5·l·he/hc. Con he/hc = 0,46 —proporciones habituales— eso es el 23 % de
 * la luz, muy lejos del centro. Verificar en el centro de la luz, que es el
 * reflejo natural, deja pasar la sección que realmente manda.
 */
export function seccionCriticaTaper(
  luzM: number,
  cantoMenorM: number,
  cantoMayorM: number,
  anchoM: number,
  cargaKNm: number
): SeccionCriticaTaper {
  const posicionM = 0.5 * luzM * (cantoMenorM / cantoMayorM);
  const tanAlpha = (cantoMayorM - cantoMenorM) / (luzM / 2);
  const cantoM = cantoMenorM + tanAlpha * posicionM;

  // Momento de una viga biapoyada con carga uniforme, en la abscisa x.
  const momentoKNm = ((cargaKNm * posicionM) / 2) * (luzM - posicionM);
  const wM3 = (anchoM * cantoM ** 2) / 6;

  return {
    posicionM,
    cantoM,
    momentoKNm,
    sigmaMdMPa: wM3 > 0 ? momentoKNm / (wM3 * 1000) : Infinity,
  };
}

/** Ángulo de inclinación del canto, en grados. */
export function anguloInclinacionGrados(
  luzM: number,
  cantoMenorM: number,
  cantoMayorM: number
): number {
  return (Math.atan((cantoMayorM - cantoMenorM) / (luzM / 2)) * 180) / Math.PI;
}

/* ------------------------------------------------------------------ *
 * 6.4.3 — Zona del vértice
 * ------------------------------------------------------------------ */

export type FormaViga = "dos-aguas" | "curva" | "curva-dos-aguas";

export const NOMBRE_FORMA: Record<FormaViga, string> = {
  "dos-aguas": "Viga a dos aguas (recta)",
  curva: "Viga curva",
  "curva-dos-aguas": "Viga curva a dos aguas",
};

/** Ec. (6.52). */
export function kdis(forma: FormaViga): number {
  return forma === "curva-dos-aguas" ? 1.7 : 1.4;
}

export interface FactoresVertice {
  k1: number;
  k2: number;
  k3: number;
  k4: number;
  /** kl de la ec. (6.43), que amplifica la tensión de flexión en el vértice. */
  kl: number;
  k5: number;
  k6: number;
  k7: number;
  /** kp de la ec. (6.56), que da la tracción perpendicular. */
  kp: number;
  /** r = rin + 0,5·hap, ec. (6.48). Infinito en la viga recta a dos aguas. */
  rM: number;
}

/**
 * Factores k de las ecs. (6.43) a (6.47) y (6.56) a (6.59).
 *
 * En la viga recta a dos aguas el radio interior es infinito, y entonces todos
 * los términos en hap/r se anulan: kl se reduce a k1 y kp a k5 = 0,2·tan αap.
 * Se resuelve con `radioInteriorM = Infinity` en vez de con un caso aparte,
 * porque el límite es el correcto y evita duplicar las expresiones.
 */
export function factoresVertice(
  anguloVerticeGrados: number,
  cantoVerticeM: number,
  radioInteriorM: number
): FactoresVertice {
  const tan = Math.tan((anguloVerticeGrados * Math.PI) / 180);

  const k1 = 1 + 1.4 * tan + 5.4 * tan ** 2;
  const k2 = 0.35 - 8 * tan;
  const k3 = 0.6 + 8.3 * tan - 7.8 * tan ** 2;
  const k4 = 6 * tan ** 2;

  const k5 = 0.2 * tan;
  const k6 = 0.25 - 1.5 * tan + 2.6 * tan ** 2;
  const k7 = 2.1 * tan - 4 * tan ** 2;

  const rM = radioInteriorM + 0.5 * cantoVerticeM;
  const q = Number.isFinite(rM) && rM > 0 ? cantoVerticeM / rM : 0;

  return {
    k1, k2, k3, k4,
    kl: k1 + k2 * q + k3 * q ** 2 + k4 * q ** 3,
    k5, k6, k7,
    kp: k5 + k6 * q + k7 * q ** 2,
    rM,
  };
}

/**
 * kr, ec. (6.49). Penaliza haber curvado las láminas en fábrica.
 *
 * Vale 1 en las vigas rectas a dos aguas —no se curvó nada— y baja en cuanto
 * el radio interior es menor que 240 veces el espesor de lámina. Es lo que
 * limita cuánto se puede cerrar el radio de una viga curva: por debajo de
 * rin/t = 240 cada punto de radio se paga en resistencia.
 */
export function kr(forma: FormaViga, radioInteriorM: number, espesorLaminaM: number): number {
  if (forma === "dos-aguas") return 1;
  if (!(espesorLaminaM > 0)) return 1;
  const relacion = radioInteriorM / espesorLaminaM;
  return relacion >= 240 ? 1 : 0.76 + 0.001 * relacion;
}

/** Ec. (6.51). En maciza vale 1, pero el apartado no aplica a maciza. */
export function kvol(volumenM3: number, laminada: boolean): number {
  if (!laminada) return 1;
  if (!(volumenM3 > 0)) return 1;
  return Math.pow(0.01 / volumenM3, 0.2);
}

/**
 * Volumen de la zona del vértice, con el tope del art. 6.4.3(6).
 *
 * La norma no da una expresión cerrada: define la zona en la figura 6.9 y sólo
 * pone el límite de que V no se tome mayor que 2/3 del volumen total de la
 * viga. Se calcula la sugerencia geométrica habitual de la viga a dos aguas y
 * se aplica el tope, que la planilla original no aplica.
 */
export function volumenVertice(
  anchoM: number,
  cantoVerticeM: number,
  anguloVerticeGrados: number,
  volumenTotalM3: number
): { sugeridoM3: number; topeM3: number; adoptadoM3: number; topado: boolean } {
  const tan = Math.tan((anguloVerticeGrados * Math.PI) / 180);
  const sugeridoM3 = anchoM * cantoVerticeM ** 2 * (1 - 0.25 * tan);
  const topeM3 = (2 * volumenTotalM3) / 3;
  const topado = volumenTotalM3 > 0 && sugeridoM3 > topeM3;
  return {
    sugeridoM3,
    topeM3,
    adoptadoM3: topado ? topeM3 : sugeridoM3,
    topado,
  };
}

export interface ResultadoVertice {
  factores: FactoresVertice;
  kr: number;
  kdis: number;
  kvol: number;
  /** σm,d = kl·6·Map,d/(b·hap²), ec. (6.42). */
  sigmaMdMPa: number;
  /** kr·fm,d, contra lo que se compara la flexión. */
  resistenciaFlexionMPa: number;
  aprovechamientoFlexion: number;
  /** σt,90,d = kp·6·Map,d/(b·hap²), ec. (6.54). */
  sigmaT90dMPa: number;
  /** kdis·kvol·ft,90,d. */
  resistenciaT90MPa: number;
  aprovechamientoT90: number;
  /** Ec. (6.53): interacción de rasante con tracción perpendicular. */
  aprovechamientoCombinado: number;
  verifica: boolean;
}

export function verificarVertice(opciones: {
  forma: FormaViga;
  anchoM: number;
  cantoVerticeM: number;
  anguloVerticeGrados: number;
  radioInteriorM: number;
  espesorLaminaM: number;
  momentoVerticeKNm: number;
  volumenM3: number;
  laminada: boolean;
  fmdMPa: number;
  ft90dMPa: number;
  fvdMPa: number;
  tauDMPa: number;
}): ResultadoVertice {
  const {
    forma, anchoM: b, cantoVerticeM: hap, anguloVerticeGrados, radioInteriorM,
    espesorLaminaM, momentoVerticeKNm: map, volumenM3, laminada,
    fmdMPa, ft90dMPa, fvdMPa, tauDMPa,
  } = opciones;

  const factores = factoresVertice(anguloVerticeGrados, hap, radioInteriorM);
  const factorKr = kr(forma, radioInteriorM, espesorLaminaM);
  const factorKdis = kdis(forma);
  const factorKvol = kvol(volumenM3, laminada);

  // 6·Map/(b·hap²) en MPa, con Map en kN·m y las longitudes en metros.
  const base = b * hap ** 2 > 0 ? (6 * map) / (b * hap ** 2 * 1000) : Infinity;

  const sigmaMdMPa = factores.kl * base;
  const resistenciaFlexionMPa = factorKr * fmdMPa;

  const sigmaT90dMPa = factores.kp * base;
  const resistenciaT90MPa = factorKdis * factorKvol * ft90dMPa;

  const aprovechamientoFlexion =
    resistenciaFlexionMPa > 0 ? sigmaMdMPa / resistenciaFlexionMPa : Infinity;
  const aprovechamientoT90 =
    resistenciaT90MPa > 0 ? sigmaT90dMPa / resistenciaT90MPa : Infinity;
  const aprovechamientoCombinado =
    (fvdMPa > 0 ? tauDMPa / fvdMPa : Infinity) + aprovechamientoT90;

  return {
    factores,
    kr: factorKr,
    kdis: factorKdis,
    kvol: factorKvol,
    sigmaMdMPa,
    resistenciaFlexionMPa,
    aprovechamientoFlexion,
    sigmaT90dMPa,
    resistenciaT90MPa,
    aprovechamientoT90,
    aprovechamientoCombinado,
    verifica:
      aprovechamientoFlexion <= 1 &&
      aprovechamientoT90 <= 1 &&
      aprovechamientoCombinado <= 1,
  };
}

/**
 * Espesor máximo de lámina admisible para un radio de curvatura dado.
 *
 * No es del EC5 sino de EN 14080, y la planilla original lo trae porque en
 * obra decide qué se puede fabricar: una viga de radio chico necesita láminas
 * finas, y con láminas finas el kr de la ec. (6.49) mejora. Las dos cosas
 * empujan en el mismo sentido.
 */
export function espesorMaximoLaminaMm(
  radioMm: number,
  resistenciaEmpalmeMPa: number
): number {
  return (radioMm / 250) * (1 + resistenciaEmpalmeMPa / 150);
}

/** Tensión de flexión que aparece al curvar una lámina de espesor t. */
export function tensionCurvadoMPa(
  moduloElasticoMPa: number,
  espesorMm: number,
  radioMm: number
): number {
  return radioMm > 0 ? (moduloElasticoMPa * espesorMm) / (2 * radioMm) : Infinity;
}
