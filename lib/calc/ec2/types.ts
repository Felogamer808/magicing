export interface Materiales {
  /** Resistencia característica del hormigón a compresión (MPa) */
  fck: number;
  /** Límite elástico característico del acero (MPa) */
  fyk: number;
  /** Límite elástico de cálculo del acero de estribos (MPa). Por defecto min(fyd, 400). */
  fydEstribos?: number;
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
  /** Recubrimiento geométrico de armadura (m) */
  recubrimiento: number;
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
  armaduraReal: ArmaduraElegida;
  /** Armadura longitudinal extra a sumar al As necesario (cm²), p. ej. la parte que aporta la torsión. */
  asAdicionalCm2?: number;
}

export interface ResultadoFlexion {
  /** Canto útil (m), calculado a partir de h, recubrimiento y diámetro de la armadura real */
  d: number;
  /** Momento reducido de cálculo μ = M / (b·d²·fcd) */
  mu: number;
  /** Cuantía mecánica ω = 1 - √(1 - 2μ) */
  omega: number;
  /** As requerido por momento (cm²) */
  asCalculadoCm2: number;
  /** As mínimo mecánico (cm²) */
  asMinMecanicoCm2: number;
  /** As mínimo geométrico (cm²) */
  asMinGeometricoCm2: number;
  /** As necesario = máx(calculado, mínimos) (cm²) */
  asNecCm2: number;
  /** As real de la armadura elegida (cm²) */
  asRealCm2: number;
  /** Ratio de aprovechamiento As,nec / As,real */
  aprovechamiento: number;
  verificaAs: boolean;
  /** Barras por fila, de la más cercana a la fibra traccionada hacia adentro. Más de un elemento = varias capas. */
  capas: number[];
  /** Máximo de barras que entran en una fila dado el ancho disponible. */
  capacidadPorFila: number;
  /** Distancia desde la fibra traccionada extrema al centroide de la armadura (m). */
  distanciaCentroideM: number;
  /** La armadura entra en el ancho disponible (aunque sea en varias filas). */
  verificaEntraEnAncho: boolean;
}

export interface DatosCortante {
  /** Cortante de cálculo (kN) */
  vd: number;
  /** Diámetro de los estribos (mm) */
  diametroEstriboMm: number;
  /** Número de ramas del estribo */
  numeroRamas: number;
  /** Armadura transversal extra a sumar a A90 (cm²/m), p. ej. la que aporta la torsión. */
  a90AdicionalCm2PorM?: number;
  /** Paso al que se redondea hacia abajo la separación adoptada (m). Por defecto 0.05. */
  pasoSeparacionM?: number;
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
  /** Cortante que debe resistir la armadura transversal (kN) */
  vEdEstribos: number;
  /** Área de estribos necesaria (cm²/m) */
  a90NecCm2PorM: number;
  /** Área de estribos mínima (cm²/m) */
  a90MinCm2PorM: number;
  /** Área de estribos de cálculo = máx(necesaria, mínima) (cm²/m) */
  a90Cm2PorM: number;
  /** Área de un cerco/estribo (cm²) según diámetro y número de ramas elegidos */
  aEstriboCm2: number;
  /** Separación necesaria entre estribos para dar el área de cálculo (m) */
  separacionNecM: number;
  /** Separación máxima admitida según relación Vd/VRd,max (m) */
  separacionMaxM: number;
  /** Separación final adoptada (m) = mín(necesaria, máxima), redondeada a múltiplos de 0.05 hasta 0.25 */
  separacionAdoptadaM: number;
  /** Armadura real dada la separación adoptada (cm²/m) */
  areaRealCm2PorM: number;
}
