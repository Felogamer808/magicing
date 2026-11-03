/**
 * Flexión de tes cargadas en su plano de simetría — AISC 360-16, art. F9, por
 * el método ASD — y flexión local del ala trabajando en ménsula.
 *
 * El F9 tiene cuatro estados límite y manda el menor:
 *
 *   1. plastificación                           (F9-1 a F9-4)
 *   2. pandeo lateral-torsional                 (F9-6 a F9-13)
 *   3. pandeo local del ala, si está comprimida (F9-14, F9-15)
 *   4. pandeo local del alma, si su punta está comprimida (F9-16 a F9-19)
 *
 * Qué lado queda comprimido lo cambia todo: con la punta del alma comprimida
 * la reserva plástica desaparece (Mp = My) y el pandeo lateral pasa a la
 * rama con B negativo, mucho más desfavorable. Por eso es un dato y no se
 * deduce: depende de la orientación de la pieza y del signo del momento.
 *
 * En la edición 2016 el F9 no afecta por Cb: el diagrama de momentos no entra.
 *
 * Pendiente: contrastar coeficientes y ecuaciones contra el texto de AISC
 * 360-16, que no está en el proyecto.
 */

import { designacion, propiedades, type Familia, type ParametrosPerfil } from "@/lib/calc/acero/perfiles";
import { OMEGA_B, SeccionFueraDeAlcance } from "@/lib/calc/acero/flexion";

export type PuntaAlma = "comprimida" | "traccionada";

export interface DatosFlexionTe {
  familia: Familia;
  params: ParametrosPerfil;
  /** Longitud sin arriostrar lateralmente, Lb, en metros. */
  lbM: number;
  puntaAlma: PuntaAlma;
  fyPa: number;
  ePa: number;
  /** Momento requerido, en kN·m. Opcional: solo para verificar. */
  mRequeridoKNm?: number;
}

export interface EstadoLimiteTe {
  nombre: string;
  ecuacion: string;
  /** Infinity cuando el estado no aplica con esta orientación o esta esbeltez. */
  mnKNm: number;
  detalle: string;
}

export interface ResultadoF9 {
  articulo: "F9";
  designacion: string;
  puntaAlma: PuntaAlma;
  /** My = Fy·Sx con el menor módulo elástico (F9-3). */
  myKNm: number;
  mpKNm: number;
  /** Sólo con el alma traccionada; null con la punta comprimida, donde F9 no define Lp ni Lr. */
  lpM: number | null;
  lrM: number | null;
  /** B de la ec. (F9-11) o (F9-12), con su signo. */
  coeficienteB: number;
  mcrKNm: number;
  estados: EstadoLimiteTe[];
  gobierna: string;
  mnKNm: number;
  admisibleKNm: number;
  verifica: boolean | null;
  aprovechamiento: number | null;
}

export function calcularF9(datos: DatosFlexionTe): ResultadoF9 {
  const p = propiedades(datos.familia, datos.params);
  if (!p.te) {
    throw new SeccionFueraDeAlcance("F2", "El artículo F9 es para tes; esta sección va por otro artículo del capítulo F.");
  }
  const { fyPa: fy, ePa: e, lbM: lb } = datos;
  const { sxAlaM3, sxPuntaM3 } = p.te;
  const d = p.hM;
  const raiz = Math.sqrt(e / fy);
  const almaComprimida = datos.puntaAlma === "comprimida";

  // 1. Plastificación.
  const myNm = fy * p.sxM3; // (F9-3)
  const mpNm = almaComprimida ? myNm : Math.min(fy * p.zxM3, 1.6 * myNm); // (F9-4) / (F9-2)

  // 2. Pandeo lateral-torsional: Mcr de la ec. (F9-10), con B positivo si el
  // alma está traccionada (F9-11) y negativo si está comprimida (F9-12).
  const signo = almaComprimida ? -1 : 1;
  const coeficienteB = signo * 2.3 * (d / lb) * Math.sqrt(p.iyM4 / p.jM4);
  const mcrNm = ((1.95 * e) / lb) * Math.sqrt(p.iyM4 * p.jM4) * (coeficienteB + Math.sqrt(1 + coeficienteB ** 2));

  let lpM: number | null = null;
  let lrM: number | null = null;
  let mnLtbNm: number;
  let detalleLtb: string;
  if (almaComprimida) {
    mnLtbNm = Math.min(mcrNm, myNm); // (F9-13)
    detalleLtb = "Alma comprimida: Mn = Mcr ≤ My";
  } else {
    lpM = 1.76 * p.ryM * raiz; // (F9-8)
    lrM = 1.95 * (e / fy) * (Math.sqrt(p.iyM4 * p.jM4) / p.sxM3) * Math.sqrt(2.36 * (fy / e) * ((d * p.sxM3) / p.jM4) + 1); // (F9-9)
    if (lb <= lpM) {
      mnLtbNm = Infinity;
      detalleLtb = "Lb ≤ Lp: no aplica";
    } else if (lb <= lrM) {
      mnLtbNm = mpNm - (mpNm - myNm) * ((lb - lpM) / (lrM - lpM)); // (F9-6)
      detalleLtb = "Lp < Lb ≤ Lr: interpolación entre Mp y My";
    } else {
      mnLtbNm = mcrNm; // (F9-7)
      detalleLtb = "Lb > Lr: Mn = Mcr";
    }
  }

  const estados: EstadoLimiteTe[] = [
    {
      nombre: "Plastificación",
      ecuacion: almaComprimida ? "F9-4: Mp = My" : "F9-2: Mp = Fy·Zx ≤ 1,6·My",
      mnKNm: mpNm / 1000,
      detalle: almaComprimida ? "Alma comprimida: sin reserva plástica" : "Alma traccionada",
    },
    {
      nombre: "Pandeo lateral-torsional",
      ecuacion: almaComprimida ? "F9-10 con F9-12, F9-13" : lb <= (lpM ?? 0) ? "F9-8" : lb <= (lrM ?? 0) ? "F9-6" : "F9-7",
      mnKNm: mnLtbNm / 1000,
      detalle: detalleLtb,
    },
  ];

  if (almaComprimida) {
    // 4. Pandeo local del alma comprimida (F9-16), con el módulo hacia la punta.
    const relacion = d / p.twM;
    let fcr: number;
    let tramo: string;
    if (relacion <= 0.84 * raiz) {
      fcr = fy; // (F9-17)
      tramo = "F9-17: Fcr = Fy";
    } else if (relacion <= 1.52 * raiz) {
      fcr = (1.43 - 0.515 * relacion * Math.sqrt(fy / e)) * fy; // (F9-18)
      tramo = "F9-18";
    } else {
      fcr = (1.52 * e) / relacion ** 2; // (F9-19)
      tramo = "F9-19";
    }
    estados.push({
      nombre: "Pandeo local del alma",
      ecuacion: `F9-16 (${tramo})`,
      mnKNm: (fcr * sxPuntaM3) / 1000,
      detalle: `d/tw = ${relacion.toFixed(1)}; límites ${(0.84 * raiz).toFixed(1)} y ${(1.52 * raiz).toFixed(1)}`,
    });
  } else {
    // 3. Pandeo local del ala comprimida, con el módulo hacia el ala.
    const lambda = p.bM / (2 * p.tfM);
    const lp = 0.38 * raiz;
    const lr = 1.0 * raiz;
    let mn: number;
    let ecuacion: string;
    if (lambda <= lp) {
      mn = Infinity;
      ecuacion = "ala compacta: no aplica";
    } else if (lambda <= lr) {
      mn = Math.min(mpNm - (mpNm - 0.7 * fy * sxAlaM3) * ((lambda - lp) / (lr - lp)), 1.6 * myNm); // (F9-14)
      ecuacion = "F9-14";
    } else {
      mn = (0.7 * e * sxAlaM3) / lambda ** 2; // (F9-15)
      ecuacion = "F9-15";
    }
    estados.push({
      nombre: "Pandeo local del ala",
      ecuacion,
      mnKNm: mn / 1000,
      detalle: `bf/2tf = ${lambda.toFixed(1)}; límites ${lp.toFixed(1)} y ${lr.toFixed(1)}`,
    });
  }

  const manda = estados.reduce((a, b) => (b.mnKNm < a.mnKNm ? b : a));
  const mnKNm = manda.mnKNm;
  const admisibleKNm = mnKNm / OMEGA_B;
  const requerido = datos.mRequeridoKNm;

  return {
    articulo: "F9",
    designacion: designacion(datos.familia, datos.params),
    puntaAlma: datos.puntaAlma,
    myKNm: myNm / 1000,
    mpKNm: mpNm / 1000,
    lpM,
    lrM,
    coeficienteB,
    mcrKNm: mcrNm / 1000,
    estados,
    gobierna: manda.nombre,
    mnKNm,
    admisibleKNm,
    verifica: requerido === undefined ? null : requerido <= admisibleKNm,
    aprovechamiento: requerido === undefined ? null : requerido / admisibleKNm,
  };
}

/* ------------------------------------------------------------------------ */

export interface DatosAlaMensula {
  bfM: number;
  tfM: number;
  twM: number;
  fyPa: number;
  /** Reacción de la losa sobre cada lado del ala, por metro de viga (kN/m), en combinación ASD. */
  reaccionIzqKNm: number;
  reaccionDerKNm: number;
}

export interface LadoAla {
  reaccionKNm: number;
  /** Momento en la cara del alma, por metro (kN·m/m). */
  momentoKNmM: number;
  verificaFlexion: boolean;
  verificaCorte: boolean;
}

export interface ResultadoAlaMensula {
  /** Vuelo desde la cara del alma: (bf − tw)/2. */
  vueloM: number;
  /** Mn = Fy·Z ≤ 1,6·Fy·S de una faja de 1 m (F11-1), en kN·m/m. */
  mnKNmM: number;
  mAdmisibleKNmM: number;
  /** Vn = 0,6·Fy·tf por metro (J4-3), en kN/m. */
  vnKNM: number;
  vAdmisibleKNM: number;
  izquierdo: LadoAla;
  derecho: LadoAla;
  /** Reacción máxima por lado que admite el ala, la menor entre flexión y corte (kN/m). */
  reaccionAdmisibleKNm: number;
  /** Torsión sobre la viga por metro si los dos lados no cargan igual (kN·m/m). */
  torsionKNmM: number;
  verifica: boolean;
}

/** Coeficiente de la fluencia por corte de elementos afectados, art. J4.2(a). */
export const OMEGA_CORTE_CHAPA = 1.5;

/**
 * El ala como ménsula empotrada en la cara del alma, con la reacción de la
 * losa en la punta, que es lo conservador. Se toma una faja de 1 m de viga
 * como barra rectangular flexada por su eje débil, art. F11 (no hay pandeo
 * lateral en esa dirección), y su corte como fluencia por corte del art. J4.2.
 *
 * No se superpone con la tensión de la flexión general de la viga, que en el
 * ala es longitudinal: AISC no plantea esa interacción.
 */
export function calcularAlaMensula(datos: DatosAlaMensula): ResultadoAlaMensula {
  const { bfM, tfM, twM, fyPa: fy } = datos;
  const vueloM = (bfM - twM) / 2;
  const z = (1 * tfM ** 2) / 4;
  const s = (1 * tfM ** 2) / 6;
  const mnKNmM = Math.min(fy * z, 1.6 * fy * s) / 1000; // (F11-1)
  const mAdmisibleKNmM = mnKNmM / OMEGA_B;
  const vnKNM = (0.6 * fy * tfM * 1) / 1000; // (J4-3)
  const vAdmisibleKNM = vnKNM / OMEGA_CORTE_CHAPA;

  const lado = (q: number): LadoAla => {
    const momentoKNmM = q * vueloM;
    return {
      reaccionKNm: q,
      momentoKNmM,
      verificaFlexion: momentoKNmM <= mAdmisibleKNmM,
      verificaCorte: q <= vAdmisibleKNM,
    };
  };
  const izquierdo = lado(datos.reaccionIzqKNm);
  const derecho = lado(datos.reaccionDerKNm);

  return {
    vueloM,
    mnKNmM,
    mAdmisibleKNmM,
    vnKNM,
    vAdmisibleKNM,
    izquierdo,
    derecho,
    reaccionAdmisibleKNm: Math.min(mAdmisibleKNmM / vueloM, vAdmisibleKNM),
    // Las reacciones en las puntas, a bf/2 del eje del alma.
    torsionKNmM: (datos.reaccionIzqKNm - datos.reaccionDerKNm) * (bfM / 2),
    verifica: izquierdo.verificaFlexion && izquierdo.verificaCorte && derecho.verificaFlexion && derecho.verificaCorte,
  };
}
