/**
 * Vuelco y deslizamiento de una zapata, por el CTE DB SE-C.
 *
 * El Anejo 19 resuelve la pieza de hormigón; el equilibrio de la zapata contra
 * el terreno es del DB SE-C. Son dos dominios del mismo sistema normativo y el
 * propio DB lo prevé (ver la skill `cte-db-se-c`), así que no es mezclar
 * normas.
 *
 * Situación persistente o transitoria, tabla 2.1, pág. 12, con las acciones
 * sin mayorar (γF = 1):
 *
 * - **Vuelco**, ec. (2.1), pág. 9-10: E_d,dst ≤ E_d,stb, con γE = 1,8 sobre lo
 *   que vuelca y γE = 0,9 sobre lo que estabiliza. Se toman momentos respecto
 *   del borde hacia el que empujan el momento y la horizontal del pilar. Sin
 *   empuje pasivo (nota (3) de la tabla y art. 4.2.2.1.3 (3), pág. 30).
 * - **Deslizamiento**, ec. (2.2) con γR = 1,5: la horizontal en la base no puede
 *   superar el rozamiento de cálculo, N·tan δ′ / γR, con δ′ = 3/4·φ′ y sin
 *   adherencia (art. 4.2.3.1 (4), pág. 34, términos efectivos).
 *
 * Criterios decididos por el usuario (2026-10-07):
 * - Lo que estabiliza es la parte permanente de la carga del pilar, que se pide
 *   aparte: la sobrecarga puede no estar cuando actúa la horizontal.
 * - No se cuenta el peso de las tierras sobre la zapata.
 * - Sólo situación persistente.
 */

/** DB SE-C, tabla 2.1, pág. 12, situación persistente o transitoria. */
export const GAMMA_E_VUELCO_ESTABILIZADORAS = 0.9;
export const GAMMA_E_VUELCO_DESESTABILIZADORAS = 1.8;
export const GAMMA_R_DESLIZAMIENTO = 1.5;

/** Una dirección en planta de la zapata. */
export interface DireccionEstabilidad {
  /** Lado de la zapata en esta dirección (m) */
  dimM: number;
  /** Posición del eje del pilar, medida desde el borde de inicio (m) */
  posicionPilarM: number;
  /** Momento característico que baja por el pilar, + hacia el borde final (kN·m) */
  mkKNm: number;
  /** Horizontal característica en el arranque del pilar, + hacia el borde final (kN) */
  hkKN: number;
}

export interface DatosVuelco {
  direccion: DireccionEstabilidad;
  /** Carga permanente característica del pilar: la que estabiliza (kN) */
  nkPermanenteKN: number;
  pesoZapataKN: number;
  /** Canto de la zapata: brazo de la horizontal respecto de la base (m) */
  cantoM: number;
}

export interface ResultadoVuelco {
  /** Borde respecto del que se vuelca. "ninguno" si nada empuja. */
  borde: "inicio" | "fin" | "ninguno";
  /** Momento desestabilizador característico, Mk + Hk·H, en valor absoluto (kN·m) */
  momentoDesestabilizadorKNm: number;
  /** Momento estabilizador característico respecto de ese borde (kN·m) */
  momentoEstabilizadorKNm: number;
  /** 1,8·Mdst (kN·m) */
  efectoDesestabilizadorKNm: number;
  /** 0,9·Mstb (kN·m) */
  efectoEstabilizadorKNm: number;
  aprovechamiento: number;
  verifica: boolean;
}

/**
 * Vuelco en una dirección. Todas las cargas verticales caen dentro de la base,
 * así que respecto de un borde todas estabilizan, también la del pilar
 * descentrado: su brazo es la distancia del eje del pilar a ese borde.
 */
export function calcularVuelco(datos: DatosVuelco): ResultadoVuelco {
  const { direccion: d, nkPermanenteKN, pesoZapataKN, cantoM } = datos;
  const momentoBaseKNm = d.mkKNm + d.hkKN * cantoM;

  if (momentoBaseKNm === 0) {
    return {
      borde: "ninguno", momentoDesestabilizadorKNm: 0, momentoEstabilizadorKNm: 0,
      efectoDesestabilizadorKNm: 0, efectoEstabilizadorKNm: 0, aprovechamiento: 0, verifica: true,
    };
  }

  const borde = momentoBaseKNm > 0 ? "fin" : "inicio";
  const brazoPilarM = borde === "fin" ? d.dimM - d.posicionPilarM : d.posicionPilarM;
  const momentoEstabilizadorKNm = nkPermanenteKN * brazoPilarM + (pesoZapataKN * d.dimM) / 2;
  const momentoDesestabilizadorKNm = Math.abs(momentoBaseKNm);

  const efectoEstabilizadorKNm = GAMMA_E_VUELCO_ESTABILIZADORAS * momentoEstabilizadorKNm;
  const efectoDesestabilizadorKNm = GAMMA_E_VUELCO_DESESTABILIZADORAS * momentoDesestabilizadorKNm;

  return {
    borde,
    momentoDesestabilizadorKNm,
    momentoEstabilizadorKNm,
    efectoDesestabilizadorKNm,
    efectoEstabilizadorKNm,
    aprovechamiento: efectoEstabilizadorKNm > 0 ? efectoDesestabilizadorKNm / efectoEstabilizadorKNm : Infinity,
    verifica: efectoDesestabilizadorKNm <= efectoEstabilizadorKNm,
  };
}

export interface DatosDeslizamiento {
  /** Horizontal característica en la base, en cada dirección (kN) */
  horizontalAKN: number;
  horizontalBKN: number;
  nkPermanenteKN: number;
  pesoZapataKN: number;
  /** Ángulo de rozamiento interno efectivo del terreno, φ′ (grados) */
  phiGrados: number;
}

export interface ResultadoDeslizamiento {
  /** Resultante horizontal en la base, √(HA² + HB²) (kN) */
  horizontalKN: number;
  /** δ′ = 3/4·φ′ (grados) */
  deltaGrados: number;
  /** Rozamiento característico, (Nk,perm + PP)·tan δ′ (kN) */
  rozamientoKN: number;
  /** Rozamiento de cálculo, rozamiento / γR (kN) */
  rozamientoCalculoKN: number;
  aprovechamiento: number;
  verifica: boolean;
}

export function calcularDeslizamiento(datos: DatosDeslizamiento): ResultadoDeslizamiento {
  const { horizontalAKN, horizontalBKN, nkPermanenteKN, pesoZapataKN, phiGrados } = datos;
  const horizontalKN = Math.hypot(horizontalAKN, horizontalBKN);
  const deltaGrados = 0.75 * phiGrados;
  const rozamientoKN = (nkPermanenteKN + pesoZapataKN) * Math.tan((deltaGrados * Math.PI) / 180);
  const rozamientoCalculoKN = rozamientoKN / GAMMA_R_DESLIZAMIENTO;
  return {
    horizontalKN,
    deltaGrados,
    rozamientoKN,
    rozamientoCalculoKN,
    aprovechamiento: rozamientoCalculoKN > 0 ? horizontalKN / rozamientoCalculoKN : horizontalKN > 0 ? Infinity : 0,
    verifica: horizontalKN <= rozamientoCalculoKN,
  };
}
