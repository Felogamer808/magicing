import { LAMBDA_BLOQUE } from "@/lib/calc/hormigon/comun/coeficientes";

/**
 * Sección en T y en T invertida, todo por el Anejo 19.
 *
 * La T tiene el ala arriba: con momento positivo el ala está comprimida y
 * colabora; con negativo queda traccionada y la sección comprimida es el alma.
 * La T invertida es al revés: el ala abajo colabora con momento negativo.
 * Cuando el ala está traccionada no aporta a compresión y la flexión es la de
 * un rectángulo del ancho del alma.
 *
 * Criterios decididos por el usuario (2026-10-23):
 * - El ancho eficaz se calcula con la ec. (5.7) a partir del ancho real del
 *   ala, que también es el tope: en una prefabricada de ala angosta manda el
 *   ancho real. Alas simétricas a los dos lados del alma.
 * - Rasante entre ala y alma (art. 6.2.4) con Δx = l0/4: la mitad de la
 *   distancia entre el momento nulo y el máximo de un tramo de largo l0.
 * - El ala de la T invertida como apoyo de losas o vigas (talón) no entra:
 *   es una región D que se verifica aparte.
 */

export type TipoSeccion = "rectangular" | "t" | "t-invertida";

/** Rótulos del tipo de sección en pantalla; el campo guarda la clave. */
export const ROTULOS_TIPO_SECCION: Record<TipoSeccion, string> = {
  rectangular: "Rectangular",
  t: "T (ala arriba)",
  "t-invertida": "T invertida (ala abajo)",
};

export const tipoSeccionPorRotulo = (rotulo: string): TipoSeccion =>
  (Object.keys(ROTULOS_TIPO_SECCION) as TipoSeccion[]).find((k) => ROTULOS_TIPO_SECCION[k] === rotulo) ?? "rectangular";

export interface GeometriaAla {
  /** Ancho real del ala, de borde a borde (m) */
  anchoM: number;
  /** Espesor del ala, hf (m) */
  espesorM: number;
  /** l0: distancia entre puntos de momento nulo, fig. A19.5.2 (m) */
  l0M: number;
}

export interface AnchoEficaz {
  /** b_i: vuelo real de cada lado del alma (m) */
  vueloM: number;
  /** b_eff,i de cada lado, ec. (5.7a) y (5.7b) (m) */
  vueloEficazM: number;
  /** b_eff = Σ b_eff,i + bw ≤ b, ec. (5.7) (m) */
  anchoEficazM: number;
  /** El ancho real del ala es el que manda */
  mandaAnchoReal: boolean;
}

/**
 * Ancho eficaz del ala, Anejo 19, art. 5.3.2.1 (3), ec. (5.7), pág. 49:
 *   b_eff,i = 0,2·b_i + 0,1·l0 ≤ 0,2·l0,  b_eff,i ≤ b_i
 *   b_eff   = Σ b_eff,i + bw ≤ b
 */
export function anchoEficazAla(anchoAlmaM: number, ala: GeometriaAla): AnchoEficaz {
  const vueloM = Math.max((ala.anchoM - anchoAlmaM) / 2, 0);
  const vueloEficazM = Math.min(0.2 * vueloM + 0.1 * ala.l0M, 0.2 * ala.l0M, vueloM);
  const sinTope = 2 * vueloEficazM + anchoAlmaM;
  return {
    vueloM,
    vueloEficazM,
    anchoEficazM: Math.min(sinTope, ala.anchoM),
    mandaAnchoReal: sinTope >= ala.anchoM - 1e-12,
  };
}

/** Propiedades de la sección bruta en T, para el mínimo de la ec. (9.1). */
export interface PropiedadesT {
  areaM2: number;
  /** Del borde del ala al baricentro (m) */
  baricentroDesdeAlaM: number;
  inerciaM4: number;
}

export function propiedadesT(anchoAlmaM: number, cantoM: number, anchoAlaM: number, espesorAlaM: number): PropiedadesT {
  const aAla = anchoAlaM * espesorAlaM;
  const altoAlma = cantoM - espesorAlaM;
  const aAlma = anchoAlmaM * altoAlma;
  const yAla = espesorAlaM / 2;
  const yAlma = espesorAlaM + altoAlma / 2;
  const area = aAla + aAlma;
  const yc = (aAla * yAla + aAlma * yAlma) / area;
  const inercia =
    (anchoAlaM * espesorAlaM ** 3) / 12 + aAla * (yc - yAla) ** 2 +
    (anchoAlmaM * altoAlma ** 3) / 12 + aAlma * (yAlma - yc) ** 2;
  return { areaM2: area, baricentroDesdeAlaM: yc, inerciaM4: inercia };
}

/**
 * Módulo resistente de la T respecto de la fibra más traccionada (m³): la del
 * borde del ala o la del borde del alma, según qué cara tracciona.
 */
export function moduloResistenteT(p: PropiedadesT, cantoM: number, traccionEnAla: boolean): number {
  const distancia = traccionEnAla ? p.baricentroDesdeAlaM : cantoM - p.baricentroDesdeAlaM;
  return p.inerciaM4 / distancia;
}

export interface FlexionAlaComprimida {
  /** El bloque comprimido entra en el espesor del ala: rectángulo de ancho b_eff */
  bloqueEnAla: boolean;
  /** μ con el que se comprueba el límite: el de b_eff o el del alma, según el caso */
  mu: number;
  omega: number;
  /** Profundidad del bloque y = λ·x (m) */
  bloqueM: number;
  xM: number;
  zM: number;
  /** Compresión total en el hormigón (kN) */
  compresionKN: number;
  /** Compresión en los vuelos del ala, fuera del alma (kN) */
  compresionVuelosKN: number;
  asCalculadoCm2: number;
}

/**
 * Flexión con el ala comprimida, con el mismo bloque rectangular del motor de
 * vigas (λ = 0,8, tensión fcd).
 *
 * Si el momento entra con el bloque dentro del ala, es un rectángulo de ancho
 * b_eff. Si no, los vuelos del ala toman (b_eff − bw)·hf·fcd en el centro del
 * ala y el resto del momento lo toma el alma como un rectángulo de ancho bw:
 * así el μ que se compara con el límite es el del alma, que es donde se
 * agota el hormigón.
 */
export function flexionAlaComprimida(
  momentoKNm: number,
  anchoAlmaM: number,
  anchoEficazM: number,
  espesorAlaM: number,
  dM: number,
  fcdMPa: number,
  fydMPa: number
): FlexionAlaComprimida {
  const fcd = fcdMPa * 1000;
  const momentoAla = anchoEficazM * espesorAlaM * fcd * (dM - espesorAlaM / 2);

  if (momentoKNm <= momentoAla) {
    const mu = momentoKNm / (anchoEficazM * dM ** 2 * fcd);
    const omega = 1 - Math.sqrt(1 - 2 * mu);
    const bloqueM = omega * dM;
    const compresionKN = omega * anchoEficazM * dM * fcd;
    return {
      bloqueEnAla: true,
      mu,
      omega,
      bloqueM,
      xM: bloqueM / LAMBDA_BLOQUE,
      zM: dM * (1 - omega / 2),
      compresionKN,
      compresionVuelosKN: compresionKN * ((anchoEficazM - anchoAlmaM) / anchoEficazM),
      asCalculadoCm2: (compresionKN / (fydMPa * 1000)) * 100 ** 2,
    };
  }

  const compresionVuelosKN = (anchoEficazM - anchoAlmaM) * espesorAlaM * fcd;
  const momentoVuelos = compresionVuelosKN * (dM - espesorAlaM / 2);
  const mu = (momentoKNm - momentoVuelos) / (anchoAlmaM * dM ** 2 * fcd);
  const omega = 1 - Math.sqrt(1 - 2 * mu);
  const bloqueM = omega * dM;
  const compresionKN = compresionVuelosKN + omega * anchoAlmaM * dM * fcd;
  return {
    bloqueEnAla: false,
    mu,
    omega,
    bloqueM,
    xM: bloqueM / LAMBDA_BLOQUE,
    zM: momentoKNm / compresionKN,
    compresionKN,
    compresionVuelosKN,
    asCalculadoCm2: (compresionKN / (fydMPa * 1000)) * 100 ** 2,
  };
}

export interface DatosRasante {
  momentoKNm: number;
  flexion: FlexionAlaComprimida;
  anchoAlmaM: number;
  anchoEficazM: number;
  espesorAlaM: number;
  l0M: number;
  fckMPa: number;
  fcdMPa: number;
  fydMPa: number;
  fctmMPa: number;
  /** Armadura transversal del ala que cruza la unión con el alma (cm²/m) */
  asTransversalRealCm2PorM: number;
}

export interface ResultadoRasante {
  /** ΔFd: compresión en el vuelo de un lado del ala (kN) */
  deltaFKN: number;
  /** Δx = l0/4 (m) */
  deltaXM: number;
  /** vEd = ΔFd/(hf·Δx), ec. (6.20) (MPa) */
  vEdMPa: number;
  /** 0,4·fctd: por debajo no hace falta armadura adicional, art. 6.2.4 (6) (MPa) */
  limiteSinArmaduraMPa: number;
  requiereArmadura: boolean;
  /** ν·fcd·sen θf·cos θf con el θf adoptado, ec. (6.22) (MPa) */
  vRdMaxMPa: number;
  verificaBielas: boolean;
  /** cot θf adoptado: el mayor del rango que cumple la ec. (6.22) */
  cotTheta: number;
  /** Asf/sf necesaria, ec. (6.21) (cm²/m); 0 si no hace falta */
  asNecCm2PorM: number;
  asRealCm2PorM: number;
  verificaArmadura: boolean;
}

/**
 * Rasante entre el alma y un ala comprimida, Anejo 19, art. 6.2.4, págs. 81-82.
 *
 * ΔFd es la compresión que el ala de un lado acumula entre el momento nulo y
 * el máximo; se reparte en Δx = l0/4 (criterio del usuario). Para alas
 * comprimidas 1,0 ≤ cot θf ≤ 2,0: se toma el mayor que cumple la ec. (6.22),
 * que es el que pide menos armadura.
 */
export function rasanteAlaAlma(d: DatosRasante): ResultadoRasante {
  const { flexion, espesorAlaM: hf } = d;
  const deltaFKN = flexion.compresionVuelosKN / 2;
  const deltaXM = d.l0M / 4;
  const vEdMPa = deltaXM > 0 ? deltaFKN / (hf * deltaXM) / 1000 : Infinity;

  // fctd = αct·fctk,0.05/γc, con fctk,0.05 = 0,7·fctm (tabla A19.3.1) y αct = 1,0.
  const fctdMPa = (0.7 * d.fctmMPa) / 1.5;
  const limiteSinArmaduraMPa = 0.4 * fctdMPa;
  const requiereArmadura = vEdMPa > limiteSinArmaduraMPa;

  // ν = 0,6·(1 − fck/250), ec. (6.6N). Con r = vEd/(ν·fcd), la ec. (6.22) es
  // cot/(1 + cot²) ≥ r: cot ≤ (1 + √(1 − 4r²))/(2r).
  const nuFcd = 0.6 * (1 - d.fckMPa / 250) * d.fcdMPa;
  const r = vEdMPa / nuFcd;
  const cotMax = r > 0 ? (r <= 0.5 ? (1 + Math.sqrt(1 - 4 * r * r)) / (2 * r) : 0) : Infinity;
  const cotTheta = Math.min(2, Math.max(cotMax, 1));
  const vRdMaxMPa = (nuFcd * cotTheta) / (1 + cotTheta ** 2);
  const verificaBielas = vEdMPa <= vRdMaxMPa + 1e-12;

  const asNecCm2PorM = requiereArmadura ? ((vEdMPa * hf) / (cotTheta * d.fydMPa)) * 100 ** 2 : 0;
  return {
    deltaFKN,
    deltaXM,
    vEdMPa,
    limiteSinArmaduraMPa,
    requiereArmadura,
    vRdMaxMPa,
    verificaBielas,
    cotTheta,
    asNecCm2PorM,
    asRealCm2PorM: d.asTransversalRealCm2PorM,
    verificaArmadura: d.asTransversalRealCm2PorM >= asNecCm2PorM - 1e-12,
  };
}

/**
 * Coeficiente β de Saint-Venant para la rigidez a torsión de un rectángulo
 * macizo, K = β·a·b³ con a el lado mayor y b el menor. Serie exacta de la
 * teoría de la elasticidad:
 *   β = 1/3 · [1 − 192/(π⁵·r) · Σ tanh(n·π·r/2)/n⁵],  n impar, r = a/b
 *
 * No es del Anejo 19: el art. 6.3.1 (4) pide repartir según las rigideces no
 * fisuradas sin dar una fórmula, y ésta es la de la mecánica (criterio del
 * usuario, 2026-10-23).
 */
export function betaSaintVenant(ladoMayorM: number, ladoMenorM: number): number {
  const r = ladoMayorM / ladoMenorM;
  let suma = 0;
  for (let n = 1; n <= 39; n += 2) suma += Math.tanh((n * Math.PI * r) / 2) / n ** 5;
  return (1 - (192 / (Math.PI ** 5 * r)) * suma) / 3;
}

/** Rigidez a torsión no fisurada de un rectángulo, sin el módulo G (m⁴). */
export function rigidezTorsionRectangulo(ladoAM: number, ladoBM: number): number {
  const mayor = Math.max(ladoAM, ladoBM);
  const menor = Math.min(ladoAM, ladoBM);
  if (!(menor > 0)) return 0;
  return betaSaintVenant(mayor, menor) * mayor * menor ** 3;
}

export interface RepartoTorsionT {
  /** Rigidez del alma de canto total h × bw (m⁴) */
  rigidezAlmaM4: number;
  /** Rigidez de cada vuelo eficaz b_eff,i × hf (m⁴) */
  rigidezVueloM4: number;
  /** Fracción del torsor que toma el alma */
  fraccionAlma: number;
  /** Fracción que toma cada vuelo */
  fraccionVuelo: number;
}

/**
 * Reparto del torsor entre el alma y los dos vuelos, art. 6.3.1 (3) y (4),
 * pág. 84: proporcional a las rigideces no fisuradas. El alma va con su canto
 * total (es la que tiene los estribos) y cada vuelo con el ancho eficaz de la
 * flexión (criterio del usuario, 2026-10-23).
 */
export function repartoTorsionT(anchoAlmaM: number, cantoM: number, vueloEficazM: number, espesorAlaM: number): RepartoTorsionT {
  const rigidezAlmaM4 = rigidezTorsionRectangulo(cantoM, anchoAlmaM);
  const rigidezVueloM4 = vueloEficazM > 0 ? rigidezTorsionRectangulo(vueloEficazM, espesorAlaM) : 0;
  const total = rigidezAlmaM4 + 2 * rigidezVueloM4;
  return {
    rigidezAlmaM4,
    rigidezVueloM4,
    fraccionAlma: rigidezAlmaM4 / total,
    fraccionVuelo: rigidezVueloM4 / total,
  };
}
