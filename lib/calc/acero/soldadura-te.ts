/**
 * Soldadura alma–ala de una T armada con chapas: dos cordones de filete
 * corridos, uno a cada lado del alma. Método ASD, con la misma tensión
 * admisible y la misma suma vectorial que el cordón perimetral de la página de
 * uniones (planilla SOLDADURA H).
 *
 * Por metro de viga, los cordones toman:
 *
 *  1. El cuelgue del ala: la losa apoya sobre el ala y el ala cuelga del alma,
 *     así que la suma de las reacciones (qi + qd) tracciona los dos cordones,
 *     mitad cada uno.
 *  2. El momento desbalanceado (qi − qd)·bf/2 cuando los dos lados no cargan
 *     igual. Con cargas iguales se anula: el ala es continua bajo el alma. Lo
 *     toma el par de cordones con brazo tw + garganta.
 *  3. El rasante de la flexión de la viga, V·Q/Ix con Q el del ala: es lo que
 *     hace que ala y alma trabajen como una sola sección.
 *
 * 1 y 2 son normales al cordón; 3 es paralelo. Se suman vectorialmente sobre la
 * garganta del cordón más cargado.
 *
 * Pendiente: contrastar contra el texto de AISC 360-16 (J2), que no está en el
 * proyecto. El metal base no se verifica acá.
 */

import { propiedades, type ParametrosPerfil } from "@/lib/calc/acero/perfiles";
import { ladoMinimoCordonMm, tensionAdmisibleSoldadura, type Electrodo } from "@/lib/calc/acero/uniones";

export interface DatosSoldaduraTe {
  /** Parámetros de la T en mm: anchoAla, espesorAla, alto, espesorAlma. */
  params: ParametrosPerfil;
  /** Lado del filete (mm), el mismo a los dos lados del alma. */
  ladoMm: number;
  electrodo: Electrodo;
  /** Reacciones de la losa por lado (kN/m), en combinación ASD. */
  reaccionIzqKNm: number;
  reaccionDerKNm: number;
  /** Corte de la viga en la sección que se verifica (kN), en combinación ASD. */
  corteKN: number;
}

export interface ResultadoSoldaduraTe {
  gargantaMm: number;
  ladoMinimoMm: number;
  ladoEnRango: boolean;
  /** Tracción por cordón del cuelgue del ala (kN/m). */
  cuelgueKNm: number;
  /** Momento desbalanceado (kN·m/m) y brazo del par (m). */
  momentoDesbalanceadoKNmM: number;
  brazoM: number;
  /** Fuerza normal en el cordón más cargado (kN/m). */
  normalKNm: number;
  /** Momento estático del ala respecto del baricentro (m³). */
  qAlaM3: number;
  /** Rasante total V·Q/Ix (kN/m), que se reparte entre los dos cordones. */
  rasanteKNm: number;
  tauNormalKPa: number;
  tauParaleloKPa: number;
  tauKPa: number;
  tauAdmKPa: number;
  aprovechamiento: number;
  verifica: boolean;
}

export function calcularSoldaduraTe(datos: DatosSoldaduraTe): ResultadoSoldaduraTe {
  const p = propiedades("te-armada", datos.params);
  if (!p.te) throw new Error("La soldadura alma–ala es para una T armada.");
  if (!(datos.ladoMm > 0)) throw new Error("El lado del cordón tiene que ser positivo.");

  const gargantaMm = datos.ladoMm / Math.SQRT2;
  const gM = gargantaMm / 1000;
  const ladoMinimoMm = ladoMinimoCordonMm(Math.min(p.tfM, p.twM) * 1000);

  const qi = datos.reaccionIzqKNm;
  const qd = datos.reaccionDerKNm;
  const cuelgueKNm = (qi + qd) / 2;
  const momentoDesbalanceadoKNmM = (qi - qd) * (p.bM / 2);
  const brazoM = p.twM + gM;
  const normalKNm = cuelgueKNm + Math.abs(momentoDesbalanceadoKNmM) / brazoM;

  const qAlaM3 = p.bM * p.tfM * (p.te.yGM - p.tfM / 2);
  const rasanteKNm = (datos.corteKN * qAlaM3) / p.ixM4;

  // Fuerza por metro de cordón sobre su garganta: kN/m ÷ m = kPa.
  const tauNormalKPa = normalKNm / gM;
  const tauParaleloKPa = rasanteKNm / 2 / gM;
  const tauKPa = Math.hypot(tauNormalKPa, tauParaleloKPa);
  const tauAdmKPa = tensionAdmisibleSoldadura(datos.electrodo);

  return {
    gargantaMm,
    ladoMinimoMm,
    ladoEnRango: datos.ladoMm >= ladoMinimoMm,
    cuelgueKNm,
    momentoDesbalanceadoKNmM,
    brazoM,
    normalKNm,
    qAlaM3,
    rasanteKNm,
    tauNormalKPa,
    tauParaleloKPa,
    tauKPa,
    tauAdmKPa,
    aprovechamiento: tauKPa / tauAdmKPa,
    verifica: tauKPa <= tauAdmKPa,
  };
}
