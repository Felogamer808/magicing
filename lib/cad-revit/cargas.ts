/**
 * De las cargas de cada pilar y del suelo del proyecto a los campos de cada
 * verificación de una planta de CAD.
 *
 * Criterio del usuario (2026-10-19):
 * - Nd del pilar = γG·G + γQ·Q (1,35·G + 1,5·Q), salvo que se cargue a mano:
 *   la envolvente ELU de Robot, que trae el viento y esa combinación no
 *   (criterio del usuario, 2026-10-19). Al cabezal va sólo el del
 *   pilar: su propio peso ya lo suma la verificación (cabezal-pilotes.ts).
 * - Nk de cada pilote = (G + Q + peso propio del cabezal) / nº de pilotes,
 *   con el hormigón armado a 25 kN/m³. En un nodo (pilar sobre viga) no hay
 *   cabezal: va G + Q entero a su pilote.
 * - Viga de atado: N₁d y N₂d son los Nd de los pilares de sus extremos.
 * - Viga centradora: N₁d es el Nd del pilar del extremo medianero (el primero
 *   de `extremos`). Su pilote recibe la reacción de la palanca en servicio,
 *   R₁ = ((G + Q)·l + q·l²/2)/(l − e) con q = 25·b·h, en lugar de G + Q; sin
 *   e cargada sigue G + Q.
 * - Dos centradoras en el mismo nodo (pilar de esquina, descentrado en x y en
 *   y): la pieza medianera y los dos apoyos lejanos son tres apoyos de una
 *   placa rígida. Con las VC en cruz, sus tres ecuaciones dan la
 *   superposición R₁ = N + ΔR_x + ΔR_y, con ΔRᵢ = R₁ᵢ − N el exceso de cada VC
 *   calculada sola (su M_acc incluida: en las dos direcciones). Vale para el
 *   Nk del pilote y para el R₁d del cabezal (criterio del usuario, 2026-10-23).
 * - Cabezal de 2 pilotes medianero de una centradora (CT11, CT12 del REV08):
 *   el pilar cae descentrado y la VC centra ese momento, así que el cabezal
 *   se verifica con R₁d = (N₁d·l + q·l²/2 + M_acc)/(l − e), la misma de la
 *   VC, centrada, en lugar del Nd (criterio del usuario, 2026-10-22).
 * - Suelo (fs, qp, FS): uno para todo el proyecto.
 *
 * La combinación la remite el Anejo 19, art. 2.4.3 (1), pág. 21, al Anejo 18,
 * que no está entre las fuentes; los coeficientes son los de `coeficientes.ts`.
 *
 * Los campos que salen de acá son derivados: se reescriben cada vez, y si falta
 * un dato quedan vacíos (la pieza no se evalúa) en lugar de conservar un valor
 * viejo que ya no corresponde.
 */

import { reaccionApoyoMedianero } from "@/lib/calc/hormigon/cimentaciones/viga-centradora-pilotes";
import { GAMMA_G, GAMMA_Q } from "@/lib/calc/hormigon/comun/coeficientes";
import type { CalculoGuardado, ElementoProyecto, PilarCargado, Proyecto } from "@/lib/proyectos/tipos";
import { aNumero } from "@/lib/verificaciones/formato";

/** Peso específico del hormigón armado del cabezal, kN/m³ (criterio del usuario). */
export const PESO_ESPECIFICO_HA_KNM3 = 25;

/** Al décimo de kN, como lo escribiría alguien en el campo. */
const kN = (x: number) => String(Math.round(x * 10) / 10);
const texto = (x: number | undefined) => (x === undefined ? "" : String(x));

/** Nd del pilar, kN: el cargado a mano si lo hay; si no, γG·G + γQ·Q, o null si falta G o Q. */
export function ndPilar(p: PilarCargado | undefined): number | null {
  if (p?.ndKN !== undefined) return p.ndKN;
  if (p?.gKN === undefined || p.qKN === undefined) return null;
  return GAMMA_G * p.gKN + GAMMA_Q * p.qKN;
}

/** La palanca de una viga centradora vista desde su nodo medianero, en servicio. */
export interface PalancaCentradora {
  /** e: del pilar al apoyo medianero, m */
  excentricidadM: number;
  /** l − e: del apoyo medianero al apoyo lejano, m */
  luzApoyosM: number;
  /** Peso propio de la viga sin mayorar, kN/m */
  qKNm: number;
}

/**
 * Reacción en servicio sobre el apoyo medianero, kN: la palanca rígida con
 * G + Q en el pilar y el peso propio de la viga en toda la luz.
 */
export function reaccionPalanca(nKN: number, p: PalancaCentradora): number {
  const l = p.excentricidadM + p.luzApoyosM;
  return (nKN * l + (p.qKNm * l ** 2) / 2) / p.luzApoyosM;
}

/**
 * Nk de cada pilote bajo la pieza, kN, o null si falta G o Q. Si el pilar es
 * el medianero de una o dos centradoras, a G + Q se suma el exceso de cada
 * palanca.
 */
export function nkPilote(pieza: ElementoProyecto, pilotes: number, palancas: readonly PalancaCentradora[] = []): number | null {
  const p = pieza.pilar;
  if (p?.gKN === undefined || p.qKN === undefined || pilotes === 0) return null;
  const m = pieza.cad?.medidasM;
  const pesoPropio = pieza.cad?.pieza === "cabezal" && m ? PESO_ESPECIFICO_HA_KNM3 * m[0] * m[1] * m[2] : 0;
  const n = p.gKN + p.qKN;
  const pilar = palancas.reduce((r, palanca) => r + reaccionPalanca(n, palanca) - n, n);
  return (pilar + pesoPropio) / pilotes;
}

/** La palanca de una centradora tal como está cargada en su cálculo, o null si falta e o la geometría. */
function palancaDe(vc: ElementoProyecto): PalancaCentradora | null {
  const c = vc.calculos.find((x) => x.verificacion === "viga-centradora-pilotes")?.campos;
  if (!c) return null;
  // Vacío no es cero: sin e cargada no hay palanca (aNumero("") da 0).
  const [e, luz, b, h] = [c.excentricidad, c.luzApoyos, c.b, c.h].map((t) => ((t ?? "").trim() === "" ? NaN : aNumero(t)));
  if (![e, luz, b, h].every(Number.isFinite) || e < 0 || luz <= 0 || b <= 0 || h <= 0) return null;
  return { excentricidadM: e, luzApoyosM: luz, qKNm: PESO_ESPECIFICO_HA_KNM3 * b * h };
}

/**
 * R₁d de una centradora con el Nd de su pilar medianero, kN, o null si en su
 * cálculo falta e, la luz, la sección o e_acc: sin palanca completa no hay
 * reacción que dar.
 */
function reaccionCalculoDe(vc: ElementoProyecto, ndKN: number): number | null {
  const c = vc.calculos.find((x) => x.verificacion === "viga-centradora-pilotes")?.campos;
  if (!c) return null;
  const [e, luz, b, h, eacc] = [c.excentricidad, c.luzApoyos, c.b, c.h, c.eacc].map((t) =>
    (t ?? "").trim() === "" ? NaN : aNumero(t)
  );
  if (![e, luz, b, h, eacc].every(Number.isFinite) || e < 0 || luz <= 0 || b <= 0 || h <= 0 || eacc < 0) return null;
  return reaccionApoyoMedianero({ b, h, excentricidadM: e, luzApoyosM: luz, n1dKN: ndKN, excentricidadAccidentalM: eacc });
}

/** Los campos derivados de un elemento, según su verificación. */
function derivados(
  e: ElementoProyecto,
  proyecto: Proyecto,
  porMarca: Map<string, ElementoProyecto>,
  pilotesBajo: Map<string, number>,
  centradoras: Map<string, ElementoProyecto[]>
): Record<string, Record<string, string>> {
  const cad = e.cad!;
  // Un campo derivado sólo se maneja desde el proyecto si su fuente se cargó
  // ahí: el pilar (aunque después se haya vaciado: queda {}) o el suelo. Si
  // nunca se cargó, lo que se escribió en la página del cálculo no se pisa
  // (prueba en el navegador, 2026-10-21: el Nd del CT9-2 cargado en la página
  // se borraba al editar otra pieza).
  if (cad.pieza === "cabezal") {
    if (!e.pilar) return {};
    const nd = ndPilar(e.pilar);
    const ndTexto = nd === null ? "" : kN(nd);
    // Cabezal de 2 pilotes como nodo medianero de una centradora: la VC centra
    // el momento del pilar descentrado y el cabezal recibe R₁d centrada, no el
    // Nd; con dos, N + ΔR_x + ΔR_y. Si a alguna le falta la palanca queda
    // vacío: verificarlo con menos carga sería del lado inseguro.
    const vcs = centradoras.get(cad.marca) ?? [];
    const reacciones = nd === null ? [] : vcs.map((vc) => reaccionCalculoDe(vc, nd));
    const completas = nd !== null && reacciones.every((r) => r !== null);
    const r1d = completas ? reacciones.reduce((s: number, r) => s + r! - nd, nd) : null;
    const ndCabezal = vcs.length === 0 ? ndTexto : r1d === null ? "" : kN(r1d);
    // Los lados, sólo si alguno se cargó en el proyecto.
    const conLados = e.pilar.ladoPilotesM !== undefined || e.pilar.ladoTransversalM !== undefined;
    return {
      cabezales: { ndPilar: ndCabezal, ...(conLados ? { anchoPilar: texto(e.pilar.ladoPilotesM) } : {}) },
      // De 3 o más pilotes: A es el largo del cabezal, como el lado A del panel.
      "cabezal-n-pilotes": {
        ndPilar: ndCabezal,
        ...(conLados ? { pilarA: texto(e.pilar.ladoPilotesM), pilarB: texto(e.pilar.ladoTransversalM) } : {}),
      },
      // Con un pilote no hay dirección que una pilotes: el primer lado va en x,
      // el largo del cabezal (ver proyecto.ts).
      "cabezal-un-pilote": {
        ndPilar: ndTexto,
        ...(conLados ? { pilarX: texto(e.pilar.ladoPilotesM), pilarY: texto(e.pilar.ladoTransversalM) } : {}),
      },
    };
  }
  if (cad.pieza === "pilote") {
    const pieza = cad.bajo ? porMarca.get(cad.bajo) : undefined;
    const vcs = cad.bajo ? (centradoras.get(cad.bajo) ?? []) : [];
    // Una VC sin e cargada no suma palanca (sigue G + Q, como con una sola).
    const palancas = vcs.map(palancaDe).filter((p): p is PalancaCentradora => p !== null);
    const nk = !pieza ? null : nkPilote(pieza, pilotesBajo.get(cad.bajo!) ?? 0, palancas);
    const s = proyecto.suelo;
    return {
      pilotes: {
        ...(pieza?.pilar ? { Nk: nk === null ? "" : kN(nk) } : {}),
        ...(s ? { friccion: texto(s.friccionKNm2), punta: texto(s.puntaKNm2), factorSeguridad: texto(s.factorSeguridad) } : {}),
      },
    };
  }
  if (cad.pieza === "viga") {
    const extremos = (cad.extremos ?? [null, null]).map((m) => (m ? porMarca.get(m) : undefined));
    const nd = (x: ElementoProyecto | undefined) => {
      const n = ndPilar(x?.pilar);
      return n === null ? "" : kN(n);
    };
    const [a, b] = extremos;
    return {
      "viga-atado": { ...(a?.pilar ? { n1d: nd(a) } : {}), ...(b?.pilar ? { n2d: nd(b) } : {}) },
      "viga-centradora-pilotes": a?.pilar ? { n1d: nd(a) } : {},
    };
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
  // Centradoras por su nodo medianero, el primer extremo.
  const centradoras = new Map<string, ElementoProyecto[]>();
  for (const e of deCad) {
    const med = e.cad!.extremos?.[0];
    if (med && e.calculos.some((c) => c.verificacion === "viga-centradora-pilotes")) {
      centradoras.set(med, [...(centradoras.get(med) ?? []), e]);
    }
  }

  let cambio = false;
  const elementos = proyecto.elementos.map((e) => {
    if (!e.cad) return e;
    const porVerificacion = derivados(e, proyecto, porMarca, pilotesBajo, centradoras);
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
