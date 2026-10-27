/**
 * Sección de hormigón descrita por franjas horizontales, medidas desde la cara
 * comprimida. Sirve para lo que en servicio depende de la forma: la inercia
 * homogeneizada sin fisurar y fisurada, el momento de fisuración y el área
 * eficaz traccionada de la fisuración.
 *
 * Un rectángulo es una franja; una T, dos. Con eso las mismas funciones valen
 * para la T con el ala comprimida (ala en la cara comprimida) y con el ala
 * traccionada (T invertida en vano, o T sobre un apoyo), sin una rama por caso.
 */

/** Franja de hormigón entre dos profundidades, desde la cara comprimida (m). */
export interface Franja {
  desdeM: number;
  hastaM: number;
  anchoM: number;
}

/** Ala de una sección en T, vista desde el cálculo en servicio. */
export interface AlaServicio {
  /** Ancho del ala que colabora: b_eff (m) */
  anchoM: number;
  /** Espesor del ala hf (m) */
  espesorM: number;
  /** True si el ala está del lado comprimido por el momento que se verifica */
  comprimida: boolean;
}

/** Propiedades de una sección homogeneizada, en un estado de fisuración. */
export interface EstadoSeccion {
  /** Profundidad de la fibra neutra desde la cara comprimida (m) */
  xM: number;
  /** Inercia homogeneizada (m⁴) */
  iM4: number;
  /** Momento estático de la armadura respecto al cdg, ec. (7.21) (m³) */
  sM3: number;
}

/**
 * Las franjas de la sección. Sin ala, o con un ala que no es más ancha que el
 * alma, es el rectángulo bw × h.
 */
export function franjasSeccion(bwM: number, hM: number, ala?: AlaServicio): Franja[] {
  if (!ala || !(ala.anchoM > bwM) || !(ala.espesorM > 0) || !(ala.espesorM < hM)) {
    return [{ desdeM: 0, hastaM: hM, anchoM: bwM }];
  }
  const hf = ala.espesorM;
  return ala.comprimida
    ? [
        { desdeM: 0, hastaM: hf, anchoM: ala.anchoM },
        { desdeM: hf, hastaM: hM, anchoM: bwM },
      ]
    : [
        { desdeM: 0, hastaM: hM - hf, anchoM: bwM },
        { desdeM: hM - hf, hastaM: hM, anchoM: ala.anchoM },
      ];
}

/** Ancho en la cara traccionada: donde están las barras. */
export function anchoCaraTraccionadaM(franjas: Franja[]): number {
  return franjas[franjas.length - 1].anchoM;
}

/**
 * Área de hormigón entre dos profundidades y su momento estático respecto de
 * la cara comprimida.
 */
export function areaEntre(franjas: Franja[], y0M: number, y1M: number): { areaM2: number; momentoM3: number } {
  let areaM2 = 0;
  let momentoM3 = 0;
  for (const f of franjas) {
    const a = Math.max(f.desdeM, y0M);
    const b = Math.min(f.hastaM, y1M);
    if (b <= a) continue;
    areaM2 += f.anchoM * (b - a);
    momentoM3 += (f.anchoM * (b * b - a * a)) / 2;
  }
  return { areaM2, momentoM3 };
}

/**
 * Estado I: entra todo el hormigón, y la armadura pesa (αe−1) porque el
 * hormigón que ocupa ya está contado en las franjas.
 */
export function estadoSinFisurar(
  franjas: Franja[], dM: number, dCompM: number,
  asM2: number, asCompM2: number, alphaE: number
): EstadoSeccion {
  const nMenosUno = alphaE - 1;
  const hM = franjas[franjas.length - 1].hastaM;
  const hormigon = areaEntre(franjas, 0, hM);
  const area = hormigon.areaM2 + nMenosUno * (asM2 + asCompM2);
  const momentoEstatico = hormigon.momentoM3 + nMenosUno * (asM2 * dM + asCompM2 * dCompM);
  const xM = area > 0 ? momentoEstatico / area : 0;

  let iM4 = nMenosUno * asM2 * (dM - xM) ** 2 + nMenosUno * asCompM2 * (xM - dCompM) ** 2;
  for (const f of franjas) {
    const t = f.hastaM - f.desdeM;
    const yc = (f.desdeM + f.hastaM) / 2;
    iM4 += (f.anchoM * t ** 3) / 12 + f.anchoM * t * (yc - xM) ** 2;
  }

  // S de la ec. (7.21): momento estático de la ARMADURA respecto al cdg. La de
  // compresión resta: está del otro lado y su retracción coartada curva al revés.
  const sM3 = asM2 * (dM - xM) - asCompM2 * (xM - dCompM);
  return { xM, iM4, sM3 };
}

/** Momento estático del hormigón comprimido respecto de la fibra neutra x. */
function momentoComprimido(franjas: Franja[], xM: number): number {
  let s = 0;
  for (const f of franjas) {
    const tope = Math.min(f.hastaM, xM);
    if (tope <= f.desdeM) continue;
    s += (f.anchoM * ((xM - f.desdeM) ** 2 - (xM - tope) ** 2)) / 2;
  }
  return s;
}

/**
 * Estado II: el hormigón traccionado no cuenta. La fibra neutra iguala
 * momentos estáticos respecto de ella,
 * S_c(x) + (αe−1)·As'·(x−d') = αe·As·(d−x).
 *
 * Con una franja es la cuadrática de siempre. Con dos, la fibra neutra puede
 * caer en una u otra y la expresión cambia de forma; se busca por bisección,
 * que no necesita saber en cuál cae: el primer miembro crece con x.
 */
export function estadoFisurado(
  franjas: Franja[], dM: number, dCompM: number,
  asM2: number, asCompM2: number, alphaE: number
): EstadoSeccion {
  const f = (x: number) =>
    momentoComprimido(franjas, x) + (alphaE - 1) * asCompM2 * (x - dCompM) - alphaE * asM2 * (dM - x);

  let xM = 0;
  if (asM2 > 0 && dM > 0) {
    let a = 0;
    let b = dM;
    for (let i = 0; i < 200 && b - a > 1e-15; i++) {
      const m = (a + b) / 2;
      if (f(m) > 0) b = m;
      else a = m;
    }
    xM = (a + b) / 2;
  }

  let iM4 = (alphaE - 1) * asCompM2 * (xM - dCompM) ** 2 + alphaE * asM2 * (dM - xM) ** 2;
  for (const fr of franjas) {
    const tope = Math.min(fr.hastaM, xM);
    if (tope <= fr.desdeM) continue;
    iM4 += (fr.anchoM * ((xM - fr.desdeM) ** 3 - (xM - tope) ** 3)) / 3;
  }

  const sM3 = asM2 * (dM - xM) - asCompM2 * (xM - dCompM);
  return { xM, iM4, sM3 };
}
