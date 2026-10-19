/**
 * De las cargas de cada pilar y del suelo del proyecto a los campos de cada
 * verificación de una planta de CAD.
 *
 * Criterio del usuario (2026-10-19):
 * - Nd del pilar = γG·G + γQ·Q (1,35·G + 1,5·Q). Al cabezal va sólo el del
 *   pilar: su propio peso ya lo suma la verificación (cabezal-pilotes.ts).
 * - Nk de cada pilote = (G + Q + peso propio del cabezal) / nº de pilotes,
 *   con el hormigón armado a 25 kN/m³. En un nodo (pilar sobre viga) no hay
 *   cabezal: va G + Q entero a su pilote.
 * - Viga de atado: N₁d y N₂d son los Nd de los pilares de sus extremos.
 * - Suelo (fs, qp, FS): uno para todo el proyecto.
 *
 * La combinación la remite el Anejo 19, art. 2.4.3 (1), pág. 21, al Anejo 18,
 * que no está entre las fuentes; los coeficientes son los de `coeficientes.ts`.
 *
 * Los campos que salen de acá son derivados: se reescriben cada vez, y si falta
 * un dato quedan vacíos (la pieza no se evalúa) en lugar de conservar un valor
 * viejo que ya no corresponde.
 */

import { GAMMA_G, GAMMA_Q } from "@/lib/calc/hormigon/comun/coeficientes";
import type { CalculoGuardado, ElementoProyecto, PilarCargado, Proyecto } from "@/lib/proyectos/tipos";

/** Peso específico del hormigón armado del cabezal, kN/m³ (criterio del usuario). */
export const PESO_ESPECIFICO_HA_KNM3 = 25;

/** Al décimo de kN, como lo escribiría alguien en el campo. */
const kN = (x: number) => String(Math.round(x * 10) / 10);
const texto = (x: number | undefined) => (x === undefined ? "" : String(x));

/** Nd del pilar, kN, o null si falta G o Q. */
export function ndPilar(p: PilarCargado | undefined): number | null {
  if (p?.gKN === undefined || p.qKN === undefined) return null;
  return GAMMA_G * p.gKN + GAMMA_Q * p.qKN;
}

/** Nk de cada pilote bajo la pieza, kN, o null si falta G o Q. */
export function nkPilote(pieza: ElementoProyecto, pilotes: number): number | null {
  const p = pieza.pilar;
  if (p?.gKN === undefined || p.qKN === undefined || pilotes === 0) return null;
  const m = pieza.cad?.medidasM;
  const pesoPropio = pieza.cad?.pieza === "cabezal" && m ? PESO_ESPECIFICO_HA_KNM3 * m[0] * m[1] * m[2] : 0;
  return (p.gKN + p.qKN + pesoPropio) / pilotes;
}

/** Los campos derivados de un elemento, según su verificación. */
function derivados(
  e: ElementoProyecto,
  proyecto: Proyecto,
  porMarca: Map<string, ElementoProyecto>,
  pilotesBajo: Map<string, number>
): Record<string, Record<string, string>> {
  const cad = e.cad!;
  if (cad.pieza === "cabezal") {
    const nd = ndPilar(e.pilar);
    return { cabezales: { ndPilar: nd === null ? "" : kN(nd), anchoPilar: texto(e.pilar?.ladoPilotesM) } };
  }
  if (cad.pieza === "pilote") {
    const pieza = cad.bajo ? porMarca.get(cad.bajo) : undefined;
    const nk = pieza ? nkPilote(pieza, pilotesBajo.get(cad.bajo!) ?? 0) : null;
    const s = proyecto.suelo;
    return {
      pilotes: {
        Nk: nk === null ? "" : kN(nk),
        friccion: texto(s?.friccionKNm2),
        punta: texto(s?.puntaKNm2),
        factorSeguridad: texto(s?.factorSeguridad),
      },
    };
  }
  if (cad.pieza === "viga") {
    const [a, b] = (cad.extremos ?? [null, null]).map((m) => (m ? ndPilar(porMarca.get(m)?.pilar) : null));
    return { "viga-atado": { n1d: a === null ? "" : kN(a), n2d: b === null ? "" : kN(b) } };
  }
  return {};
}

/**
 * Reescribe en cada elemento de la planta los campos que salen de las cargas
 * de los pilares y del suelo. No toca nada más: geometría y armadura quedan.
 */
export function derivarCargas(proyecto: Proyecto): Proyecto {
  const deCad = proyecto.elementos.filter((e) => e.cad);
  if (deCad.length === 0) return proyecto;
  const porMarca = new Map(deCad.map((e) => [e.cad!.marca, e]));
  const pilotesBajo = new Map<string, number>();
  for (const e of deCad) {
    if (e.cad!.pieza === "pilote" && e.cad!.bajo) pilotesBajo.set(e.cad!.bajo, (pilotesBajo.get(e.cad!.bajo) ?? 0) + 1);
  }

  let cambio = false;
  const elementos = proyecto.elementos.map((e) => {
    if (!e.cad) return e;
    const porVerificacion = derivados(e, proyecto, porMarca, pilotesBajo);
    let tocado = false;
    const calculos = e.calculos.map((c): CalculoGuardado => {
      const nuevos = porVerificacion[c.verificacion];
      if (!nuevos || Object.entries(nuevos).every(([k, v]) => c.campos[k] === v)) return c;
      tocado = true;
      return { ...c, campos: { ...c.campos, ...nuevos } };
    });
    if (!tocado) return e;
    cambio = true;
    return { ...e, calculos };
  });
  return cambio ? { ...proyecto, elementos } : proyecto;
}
