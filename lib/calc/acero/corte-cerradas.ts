/**
 * Corte de secciones cerradas — AISC 360-16, por el método ASD:
 *
 *   art. G4  tubos rectangulares y cajones
 *   art. G5  tubos redondos
 *
 * G4 es el mismo planteo que G2 —área de alma por 0,6·Fy, afectada por un
 * coeficiente de pandeo— con dos diferencias: hay dos almas, y el coeficiente es
 * `Cv2` con kv = 5 fijo, sin la excepción de Ωv = 1,50 que tienen los perfiles I
 * laminados. G5 es distinto: la resistencia del tubo redondo depende de la
 * distancia entre el corte máximo y el nulo, que es un dato del diagrama y no de
 * la sección.
 */

import { propiedades, designacion, type Familia, type ParametrosPerfil } from "@/lib/calc/acero/perfiles";

/** Coeficiente de seguridad al corte fuera de la excepción del art. G1(a). */
export const OMEGA_V = 1.67;

export interface DatosCorteCerrada {
  familia: Familia;
  params: ParametrosPerfil;
  fyPa: number;
  ePa: number;
  /** Distancia del corte máximo al corte nulo, Lv, en metros. Solo en G5. */
  lvM?: number;
  vRequeridoKN?: number;
}

export interface ResultadoG4 {
  articulo: "G4";
  designacion: string;
  /** Área de las dos almas, Aw = 2·h·t. */
  awM2: number;
  esbeltezAlma: number;
  kv: number;
  cv2: number;
  omegaV: number;
  vnKN: number;
  admisibleKN: number;
  verifica: boolean | null;
  aprovechamiento: number | null;
}

export interface ResultadoG5 {
  articulo: "G5";
  designacion: string;
  areaM2: number;
  relacionDt: number;
  /** Las dos tensiones críticas candidatas, en Pa. */
  fcrPandeoLargo: number;
  fcrPandeoLocal: number;
  /** Tope de fluencia al corte, 0,6·Fy. */
  topeFluencia: number;
  fcrPa: number;
  gobierna: "fluencia" | "pandeo";
  omegaV: number;
  vnKN: number;
  admisibleKN: number;
  verifica: boolean | null;
  aprovechamiento: number | null;
}

/**
 * Coeficiente de pandeo por corte del alma, art. G2.2 (ecs. G2-9 a G2-11).
 * Es el mismo que usa G4, con kv = 5.
 */
export function coeficienteCv2(esbeltez: number, kv: number, fyPa: number, ePa: number) {
  const limite = 1.1 * Math.sqrt((kv * ePa) / fyPa);
  if (esbeltez <= limite) return 1.0; // (G2-9)
  if (esbeltez <= 1.37 * Math.sqrt((kv * ePa) / fyPa)) return limite / esbeltez; // (G2-10)
  return (1.51 * kv * ePa) / (esbeltez ** 2 * fyPa); // (G2-11)
}

/** Corte de tubos rectangulares y cajones, art. G4. */
export function calcularG4(datos: DatosCorteCerrada): ResultadoG4 {
  const p = propiedades(datos.familia, datos.params);
  const { fyPa, ePa } = datos;

  // Las dos caras verticales resisten el corte: Aw = 2·h·t.
  const awM2 = 2 * p.hAlmaM * p.twM;
  const esbeltezAlma = p.hAlmaM / p.twM;
  const kv = 5; // fijo en G4, sin rigidizadores intermedios
  const cv2 = coeficienteCv2(esbeltezAlma, kv, fyPa, ePa);

  const vnKN = (0.6 * fyPa * awM2 * cv2) / 1000; // (G4-1)
  const admisibleKN = vnKN / OMEGA_V;
  const requerido = datos.vRequeridoKN;

  return {
    articulo: "G4",
    designacion: designacion(datos.familia, datos.params),
    awM2,
    esbeltezAlma,
    kv,
    cv2,
    omegaV: OMEGA_V,
    vnKN,
    admisibleKN,
    verifica: requerido === undefined ? null : requerido <= admisibleKN,
    aprovechamiento: requerido === undefined ? null : requerido / admisibleKN,
  };
}

/**
 * Corte de tubos redondos, art. G5.
 *
 * Solo la mitad del área trabaja al corte (ec. G5-1), y la tensión crítica es la
 * mayor de dos expresiones de pandeo, acotada por la fluencia. Para secciones
 * corrientes manda la fluencia y Fcr vale 0,6·Fy; el pandeo aparece con D/t por
 * encima de 100, aceros de alta resistencia o tramos largos.
 */
export function calcularG5(datos: DatosCorteCerrada): ResultadoG5 {
  const p = propiedades(datos.familia, datos.params);
  const { fyPa, ePa } = datos;
  const lvM = datos.lvM ?? 1;

  const relacionDt = p.hM / p.twM;

  // (G5-2a) depende del largo; (G5-2b) no.
  const fcrPandeoLargo = (1.6 * ePa) / ((lvM / p.hM) * relacionDt ** 1.25);
  const fcrPandeoLocal = (0.78 * ePa) / relacionDt ** 1.5;
  const topeFluencia = 0.6 * fyPa;

  const fcrPandeo = Math.max(fcrPandeoLargo, fcrPandeoLocal);
  const fcrPa = Math.min(fcrPandeo, topeFluencia);

  const vnKN = (fcrPa * p.areaM2) / 2 / 1000; // (G5-1)
  const admisibleKN = vnKN / OMEGA_V;
  const requerido = datos.vRequeridoKN;

  return {
    articulo: "G5",
    designacion: designacion(datos.familia, datos.params),
    areaM2: p.areaM2,
    relacionDt,
    fcrPandeoLargo,
    fcrPandeoLocal,
    topeFluencia,
    fcrPa,
    gobierna: fcrPa === topeFluencia ? "fluencia" : "pandeo",
    omegaV: OMEGA_V,
    vnKN,
    admisibleKN,
    verifica: requerido === undefined ? null : requerido <= admisibleKN,
    aprovechamiento: requerido === undefined ? null : requerido / admisibleKN,
  };
}
