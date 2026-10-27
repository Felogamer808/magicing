export interface Materiales {
  /** Resistencia característica del hormigón a compresión (MPa) */
  fck: number;
  /** Límite elástico característico del acero (MPa) */
  fyk: number;
  /** Límite elástico de cálculo del acero de estribos (MPa). Por defecto mín(fyd; 0,8·fyk). */
  fydEstribos?: number;
  /** Coeficientes parciales del hormigón y del acero. Por defecto los de la situación persistente. */
  gammaC?: number;
  gammaS?: number;
}

export interface MaterialesDerivados extends Required<Materiales> {
  /** Resistencia de cálculo del hormigón a compresión (MPa) */
  fcd: number;
  /** Resistencia media a tracción del hormigón (MPa), EC2 Tabla 3.1 */
  fctm: number;
  /** Límite elástico de cálculo del acero (MPa) */
  fyd: number;
}

export interface GeometriaViga {
  /** Ancho de la sección (m) */
  b: number;
  /** Canto total de la sección (m) */
  h: number;
  /** Recubrimiento geométrico de armadura (m), medido de la cara exterior al estribo */
  recubrimiento: number;
  /**
   * Diámetro del estribo (mm). Las barras longitudinales apoyan en su cara
   * interior: corre el canto útil y achica el ancho disponible.
   */
  diametroEstriboMm: number;
}

export interface ArmaduraElegida {
  /** Número de barras */
  numero: number;
  /** Diámetro de barra (mm) */
  diametroMm: number;
}

export interface DatosFlexion {
  /** Momento de cálculo (kN·m), en valor absoluto */
  momento: number;
  /**
   * Armadura real, en grupos: cada uno con su propio número y diámetro (una
   * segunda capa de Ø distinto, por ejemplo). Un solo grupo es el caso de
   * siempre.
   */
  armaduraReal: readonly ArmaduraElegida[];
  /** Armadura longitudinal extra a sumar al As necesario (cm²), p. ej. la parte que aporta la torsión. */
  asAdicionalCm2?: number;
  /**
   * Sección en T (o T invertida): el ala y si este momento la comprime. Sin
   * esto la sección es un rectángulo de ancho b. Con el ala, b es el alma.
   */
  seccionT?: SeccionTFlexion;
}

export interface SeccionTFlexion {
  /** b_eff, ec. (5.7) (m) */
  anchoEficazM: number;
  /** hf (m) */
  espesorAlaM: number;
  /** El momento comprime el ala: colabora. Si no, el ala está traccionada y lleva las barras. */
  alaComprimida: boolean;
}

import type { FlexionAlaComprimida } from "@/lib/calc/hormigon/vigas/seccion-t";

export interface ResultadoFlexion {
  /** Canto útil (m), calculado a partir de h, recubrimiento y diámetro de la armadura real */
  d: number;
  /** Momento reducido de cálculo μ = M / (b·d²·fcd) */
  mu: number;
  /** Cuantía mecánica ω = 1 - √(1 - 2μ) */
  omega: number;
  /**
   * Profundidad de la fibra neutra (m). Sale de ω: el bloque rectangular
   * equivalente tiene canto 0,8·x y tensión fcd, así que igualar compresión y
   * tracción da ω·d = 0,8·x.
   */
  xM: number;
  /** Brazo mecánico z = d·(1 − ω/2) (m). */
  zM: number;
  /**
   * Deformación de la armadura traccionada en agotamiento, con εcu = 3,5 ‰.
   * Por debajo de la de fluencia la sección está sobrearmada y rompe frágil.
   */
  deformacionAcero: number;
  /** As requerido por momento (cm²) */
  asCalculadoCm2: number;
  /**
   * Momento reducido límite: el mayor μ con el que la armadura de tracción
   * todavía fluye (εs ≥ εyd) al agotarse el hormigón (εc = εcu3).
   */
  muLim: number;
  /**
   * μ > μlim: con sólo armadura de tracción el acero no llega a fluir y la
   * sección rompe frágil. As, ω, x y z quedan sin valor (NaN): no hay una
   * armadura de tracción sola que verifique, hace falta armadura de compresión
   * o más canto.
   */
  sobrearmada: boolean;
  /** Resistencia media a flexotracción fctm,fl (MPa), Anejo 19 art. 3.1.8, ec. (3.23). */
  fctmFlMPa: number;
  /** As,min de la armadura de tracción (cm²), Anejo 19 art. 9.2.1.1 (1), ec. (9.1). */
  asMinCm2: number;
  /** As necesario = máx(calculado, mínimos) (cm²) */
  asNecCm2: number;
  /** As real de la armadura elegida (cm²) */
  asRealCm2: number;
  /** Ratio de aprovechamiento As,nec / As,real */
  aprovechamiento: number;
  verificaAs: boolean;
  /** Filas físicas, de la más cercana a la fibra traccionada hacia adentro. Más de un elemento = varias capas. */
  capas: FilaArmadura[];
  /** Capacidad por fila de cada grupo cargado, según su propio diámetro. */
  capacidadPorGrupo: number[];
  /** Distancia desde la fibra traccionada extrema al centroide de la armadura (m). */
  distanciaCentroideM: number;
  /** La armadura entra en el ancho disponible (aunque sea en varias filas). */
  verificaEntraEnAncho: boolean;
  /** Con el ala comprimida de una T: cómo se repartió la compresión entre ala y alma. */
  alaComprimida?: FlexionAlaComprimida;
}

export interface FilaArmadura {
  numero: number;
  diametroMm: number;
  /** Distancia desde la fibra traccionada extrema al centro de esta fila (m). */
  distanciaM: number;
}

export interface DatosCortante {
  /** Cortante de cálculo (kN) */
  vd: number;
  /** Diámetro de los estribos (mm) */
  diametroEstriboMm: number;
  /** Número de ramas del estribo */
  numeroRamas: number;
  /**
   * Armadura de torsión que necesita **cada rama** del cerco (cm²/m), At/s de
   * la ec. (6.28). Se suma por rama, no una vez al total.
   */
  atPorRamaCm2PorM?: number;
  /** Paso al que se redondea hacia abajo la separación adoptada (m). Por defecto 0.05. */
  pasoSeparacionM?: number;
  /**
   * Otro tope para la separación adoptada (m): el que pide otra armadura que
   * va con los estribos, como el cerco del ala para el rasante en la T.
   */
  topeSeparacionM?: number;
}

export interface ResultadoCortante {
  /** Resistencia a compresión oblicua del alma VRd,max (kN) */
  vRdMax: number;
  verificaVRdMax: boolean;
  /** Factor de escala k = min(1 + √(200/d_mm), 2) */
  k: number;
  /** Cuantía de armadura longitudinal traccionada, limitada a 0.02 */
  rhoL: number;
  /** Resistencia a cortante sin armadura transversal VRd,c (kN) */
  vRdC: number;
  /** VRd,c mínimo (kN) */
  vRdCMin: number;
  /** VEd > VRd,c: hace falta armadura de cálculo, art. 6.2.3. */
  requiereEstribos: boolean;
  /** Cortante que toma la armadura transversal (kN): VEd entero si hace falta, 0 si no. */
  vEdEstribos: number;
  /** Área de estribos necesaria (cm²/m) */
  a90NecCm2PorM: number;
  /** Área de estribos mínima ρw,min·b (cm²/m), art. 9.2.2(5) */
  a90MinCm2PorM: number;
  /** Área de estribos de cálculo = máx(necesaria, mínima) (cm²/m) */
  a90Cm2PorM: number;
  /** Área de un cerco/estribo (cm²) según diámetro y número de ramas elegidos */
  aEstriboCm2: number;
  /** Separación necesaria entre estribos para dar el área de cálculo (m) */
  separacionNecM: number;
  /** Separación máxima sl,max = 0,75·d (m), art. 9.2.2(6) */
  separacionMaxM: number;
  /** Separación final adoptada (m) = mín(necesaria, máxima), redondeada a múltiplos de 0.05 y con el tope de oficina de 0.25 */
  separacionAdoptadaM: number;
  /** Armadura real dada la separación adoptada (cm²/m) */
  areaRealCm2PorM: number;
  /** Separación transversal entre ejes de ramas (m), con las interiores repartidas parejo */
  separacionTransversalM: number;
  /** Separación transversal máxima st,max = 0,75·d ≤ 0,6 m, art. 9.2.2(8) */
  separacionTransversalMaxM: number;
  verificaSeparacionTransversal: boolean;
}
