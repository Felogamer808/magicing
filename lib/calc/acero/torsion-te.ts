/**
 * Torsión de una T armada por el desbalance de la losa — AISC 360-16, art.
 * H3.3 (secciones que no son tubos), por análisis elástico y ASD.
 *
 * Criterios acordados con el usuario (2026-10-30):
 *
 *  - La única torsión es la de las dos reacciones distintas sobre el ala:
 *    mt = |qi − qd|·bf/2 por metro, con las reacciones en las puntas.
 *  - Los dos extremos tienen el giro torsional impedido; la torsión máxima,
 *    en el apoyo, es T = mt·L/2.
 *  - Sólo torsión uniforme (Saint-Venant): en una T el alabeo es
 *    despreciable, así que no hay tensión normal por torsión y la flexión ya
 *    quedó verificada en su página. τt = T·t/J en cada chapa.
 *  - En el alma se suma el corte de flexión en el eje neutro, τv = V·Q/(Ix·tw),
 *    porque V máximo y T máximo coinciden en el apoyo. Se compara contra la
 *    fluencia por corte del H3.3: 0,6·Fy/Ω con Ω = 1,67.
 *  - El giro en el centro, φ = mt·L²/(8·G·J), es sólo informativo.
 *
 * Pendiente: contrastar contra el texto de AISC 360-16, que no está en el
 * proyecto.
 */

import { propiedades, type ParametrosPerfil } from "@/lib/calc/acero/perfiles";

/** Módulo de corte del acero, notación de AISC 360-16. */
export const G_ACERO_PA = 77_200e6;
const OMEGA_H3 = 1.67;

export interface DatosTorsionTe {
  params: ParametrosPerfil;
  fyPa: number;
  luzM: number;
  /** Reacciones de la losa por lado (kN/m), en combinación ASD. */
  reaccionIzqKNm: number;
  reaccionDerKNm: number;
  /** Corte de la viga en el apoyo (kN). */
  corteKN: number;
}

export interface ResultadoTorsionTe {
  /** Torsión repartida (kN·m/m). */
  mtKNmM: number;
  /** Torsión en el apoyo (kN·m). */
  tKNm: number;
  jM4: number;
  /** Tensión de torsión en el alma y en el ala (MPa). */
  tauTorsionAlmaMPa: number;
  tauTorsionAlaMPa: number;
  /** Momento estático en el eje neutro elástico (m³) y corte de flexión ahí (MPa). */
  qEjeNeutroM3: number;
  tauCorteMPa: number;
  /** Lo que se verifica: el mayor entre alma (torsión + corte) y ala (torsión). */
  tauAlmaMPa: number;
  tauMaxMPa: number;
  gobierna: "alma" | "ala";
  tauAdmMPa: number;
  aprovechamiento: number;
  verifica: boolean;
  /** Giro en el centro de la luz (grados), informativo. */
  giroGrados: number;
}

export function calcularTorsionTe(datos: DatosTorsionTe): ResultadoTorsionTe {
  const p = propiedades("te-armada", datos.params);
  if (!p.te) throw new Error("La torsión de esta página es para una T armada.");
  if (!(datos.luzM > 0)) throw new Error("La luz tiene que ser positiva.");

  const mtKNmM = Math.abs(datos.reaccionIzqKNm - datos.reaccionDerKNm) * (p.bM / 2);
  const tKNm = (mtKNmM * datos.luzM) / 2;
  const tNm = tKNm * 1000;

  const tauTorsionAlmaMPa = (tNm * p.twM) / p.jM4 / 1e6;
  const tauTorsionAlaMPa = (tNm * p.tfM) / p.jM4 / 1e6;

  // Q del lado del ala respecto del eje neutro elástico, y el espesor que corta ahí.
  const yG = p.te.yGM;
  const enAla = yG <= p.tfM;
  const qEjeNeutroM3 = enAla
    ? (p.bM * yG ** 2) / 2
    : p.bM * p.tfM * (yG - p.tfM / 2) + (p.twM * (yG - p.tfM) ** 2) / 2;
  const espesor = enAla ? p.bM : p.twM;
  const tauCorteMPa = (datos.corteKN * 1000 * qEjeNeutroM3) / (p.ixM4 * espesor) / 1e6;

  const tauAlmaMPa = tauTorsionAlmaMPa + tauCorteMPa;
  const gobierna = tauAlmaMPa >= tauTorsionAlaMPa ? "alma" : "ala";
  const tauMaxMPa = Math.max(tauAlmaMPa, tauTorsionAlaMPa);
  const tauAdmMPa = (0.6 * datos.fyPa) / OMEGA_H3 / 1e6;

  const giroRad = (mtKNmM * 1000 * datos.luzM ** 2) / (8 * G_ACERO_PA * p.jM4);

  return {
    mtKNmM,
    tKNm,
    jM4: p.jM4,
    tauTorsionAlmaMPa,
    tauTorsionAlaMPa,
    qEjeNeutroM3,
    tauCorteMPa,
    tauAlmaMPa,
    tauMaxMPa,
    gobierna,
    tauAdmMPa,
    aprovechamiento: tauMaxMPa / tauAdmMPa,
    verifica: tauMaxMPa <= tauAdmMPa,
    giroGrados: (giroRad * 180) / Math.PI,
  };
}
