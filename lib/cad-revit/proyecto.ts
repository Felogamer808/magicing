/**
 * De la planta interpretada a elementos de un proyecto: cada cabezal, nodo,
 * viga y pilote pasa a ser un elemento con su verificación y la geometría ya
 * cargada. Las cargas, la armadura y el suelo se cargan después, a mano.
 *
 * Qué verificación lleva cada pieza (criterio del usuario, 2026-10-19):
 * - cabezal de 2 pilotes → "cabezales" (bielas y tirantes, Anejo 19);
 * - cada pilote → "pilotes";
 * - viga riostra (VR) → "viga-atado", con la luz de cara a cara;
 * - el resto queda "no evaluable" hasta que haya una verificación para él:
 *   cabezales de 1, 4 o más pilotes, vigas centradoras (la que existe es de
 *   zapata medianera, no de cabezal sobre pilotes) y los nodos de pilar sobre
 *   viga (de ellos se verifica el pilote).
 *
 * Las marcas son las mismas que van a Revit (`numerarMarcas`), así un
 * elemento del proyecto y su pieza en Revit se llaman igual.
 */

import type { Punto } from "@/lib/dxf/leer";
import type { MaterialesProyecto } from "@/lib/proyectos/tipos";
import type { PiezaPlantaLeida } from "@/lib/proyectos/modelo";
import { contiene } from "./geometria";
import type { Interpretacion } from "./interpretar";
import { numerarMarcas } from "./exportar";

/** Campos de cada verificación que se cargan a mano: entran vacíos. */
export const A_MANO = {
  cabezales: ["anchoPilar", "ndPilar", "nPrinc", "phiPrinc", "nSec", "phiSec", "nEstV", "phiEstV", "nCercos", "nEstH", "phiEstH"],
  pilotes: ["friccion", "punta", "factorSeguridad", "numero", "diametroBarra", "diametroEstribo", "Nk"],
  "viga-atado": ["n1d", "n2d", "numeroCara", "diametroCara", "diametroEstribo", "numeroRamas"],
} as const;

export interface OpcionesPlanta {
  /** Metros por unidad del dibujo. */
  escala: number;
  largoPiloteM: number;
  materiales: MaterialesProyecto;
}

/** Hasta dónde se busca la pieza en el extremo de una viga, m. */
const TOLERANCIA_EXTREMO_M = 0.05;
/**
 * Hasta dónde, desde el extremo, puede estar el pilote del nodo bajo una viga,
 * m. En el REV08 las centradoras pasan hasta 1,2 m más allá del pilote.
 */
const ALCANCE_NODO_M = 1.5;

/** A texto como lo escribiría alguien en el campo: en m, al mm. */
const m = (x: number) => String(Math.round(x * 1000) / 1000);

const medio = (a: Punto, b: Punto): Punto => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
const distancia = (a: Punto, b: Punto) => Math.hypot(b[0] - a[0], b[1] - a[1]);

export function piezasDePlanta(r: Interpretacion, o: OpcionesPlanta): PiezaPlantaLeida[] {
  const e = o.escala;
  const mat = o.materiales;
  const piezas: PiezaPlantaLeida[] = [];

  // --- Cabezales y nodos: las piezas sobre las que apoyan pilotes y vigas ----
  const marcasCab = numerarMarcas(r.cabezales.map((c) => ({ nombre: c.nombre, centro: c.rect.centro })));
  const marcasNodo = numerarMarcas(r.nodos.map((n) => ({ nombre: n.nombre, centro: n.rotulo })));
  /** De qué pieza es cada pilote (por índice), para nombrarlo y bajarle la carga. */
  const duenio = new Map<number, string>();

  r.cabezales.forEach((c, i) => {
    const marca = marcasCab[i];
    c.pilotes.forEach((k) => duenio.set(k, marca));
    const medidasM: [number, number, number] = [c.rect.largo * e, c.rect.ancho * e, c.canto * e];
    const n = c.pilotes.length;
    if (n !== 2) {
      piezas.push({
        origen: {
          marca,
          pieza: "cabezal",
          medidasM,
          sinVerificacion:
            n === 0
              ? "Cabezal sin pilotes: revisar la planta."
              : `Cabezal de ${n} ${n === 1 ? "pilote" : "pilotes"}: todavía no hay verificación para él.`,
        },
        geometria: {},
        aMano: [],
        materiales: {},
      });
      return;
    }
    // "Lado x" es el que une los pilotes: el largo del rectángulo si los
    // pilotes están alineados con él, si no el ancho.
    const [p1, p2] = c.pilotes.map((k) => r.pilotes[k].centro);
    const rad = (c.rect.angulo * Math.PI) / 180;
    const d: Punto = [p2[0] - p1[0], p2[1] - p1[1]];
    const aLoLargo = Math.abs(d[0] * Math.cos(rad) + d[1] * Math.sin(rad)) >= Math.abs(-d[0] * Math.sin(rad) + d[1] * Math.cos(rad));
    piezas.push({
      origen: { marca, pieza: "cabezal", medidasM },
      verificacion: "cabezales",
      geometria: {
        ladoX: m((aLoLargo ? c.rect.largo : c.rect.ancho) * e),
        ladoY: m((aLoLargo ? c.rect.ancho : c.rect.largo) * e),
        hCab: m(c.canto * e),
        dPilote: m(r.pilotes[c.pilotes[0]].diametro * e),
      },
      aMano: A_MANO.cabezales,
      materiales: { fck: String(mat.fckMPa), fyk: String(mat.fykMPa), rg: m(mat.recubrimientoM) },
    });
  });

  r.nodos.forEach((nodo, i) => {
    nodo.pilotes.forEach((k) => duenio.set(k, marcasNodo[i]));
    piezas.push({
      origen: { marca: marcasNodo[i], pieza: "nodo", sinVerificacion: "Pilar sobre viga: se verifica su pilote." },
      geometria: {},
      aMano: [],
      materiales: {},
    });
  });

  // --- Vigas -----------------------------------------------------------------
  const tol = TOLERANCIA_EXTREMO_M / e;
  const alcanceNodo = ALCANCE_NODO_M / e;
  /**
   * La pieza en la que termina la viga, en el extremo `p` (el otro es `q`):
   * - el cabezal que toca; se suma medio ancho de viga porque una viga que
   *   llega en ángulo toca la cara con el borde antes que con el eje;
   * - o el nodo cuyo pilote queda bajo la viga cerca de ese extremo (la
   *   centradora pasa por encima del pilote del pilar, no termina en él).
   */
  const piezaEn = (p: Punto, q: Punto, ancho: number): { marca: string; centro: Punto } | null => {
    const ic = r.cabezales.findIndex((c) => contiene(c.rect, p, -(tol + ancho / 2)));
    if (ic >= 0) return { marca: marcasCab[ic], centro: r.cabezales[ic].rect.centro };
    const largo = distancia(p, q);
    const u: Punto = [(q[0] - p[0]) / largo, (q[1] - p[1]) / largo];
    let mejor: { inodo: number; dist: number } | null = null;
    r.nodos.forEach((n, inodo) => {
      for (const k of n.pilotes) {
        const c = r.pilotes[k].centro;
        const w: Punto = [c[0] - p[0], c[1] - p[1]];
        const aLoLargo = w[0] * u[0] + w[1] * u[1];
        const transversal = Math.abs(-w[0] * u[1] + w[1] * u[0]);
        const enLaFranja = transversal <= ancho / 2 + r.pilotes[k].diametro / 2 + tol;
        if (enLaFranja && aLoLargo >= -alcanceNodo && aLoLargo <= Math.min(alcanceNodo, largo / 2)) {
          const dist = Math.abs(aLoLargo);
          if (!mejor || dist < mejor.dist) mejor = { inodo, dist };
        }
      }
    });
    if (!mejor) return null;
    const { inodo } = mejor as { inodo: number; dist: number };
    const pil = r.nodos[inodo].pilotes.map((k) => r.pilotes[k].centro);
    return { marca: marcasNodo[inodo], centro: pil.reduce(medio) };
  };

  const marcasViga = numerarMarcas(r.vigas.map((v) => ({ nombre: v.nombre, centro: medio(v.inicio, v.fin) })));
  r.vigas.forEach((v, i) => {
    let a = piezaEn(v.inicio, v.fin, v.ancho);
    let b = piezaEn(v.fin, v.inicio, v.ancho);
    // Las dos puntas en la misma pieza: la viga corre al costado de ella (VR12
    // del REV08, 0,78 m junto a un CT9). Ata sólo en la punta más cercana.
    if (a && b && a.marca === b.marca) {
      if (distancia(v.inicio, a.centro) <= distancia(v.fin, b.centro)) b = null;
      else a = null;
    }
    const extremos: [string | null, string | null] = [a?.marca ?? null, b?.marca ?? null];
    const marca = marcasViga[i];
    if (/^VR/i.test(v.nombre)) {
      piezas.push({
        origen: { marca, pieza: "viga", extremos },
        verificacion: "viga-atado",
        geometria: {
          b: m(v.ancho * e),
          h: m(v.alto * e),
          // Riostra: de cara a cara del cabezal (criterio del usuario), que es
          // como quedó el eje al interpretar.
          luz: m(distancia(v.inicio, v.fin) * e),
          // Entre ejes de las piezas que ata; si falta una, se carga a mano.
          distanciaEjes: a && b ? m(distancia(a.centro, b.centro) * e) : "",
        },
        aMano: A_MANO["viga-atado"],
        materiales: { fck: String(mat.fckMPa), fyk: String(mat.fykMPa), recubrimiento: m(mat.recubrimientoM) },
      });
      return;
    }
    piezas.push({
      origen: {
        marca,
        pieza: "viga",
        extremos,
        sinVerificacion: /^VC/i.test(v.nombre)
          ? "Viga centradora sobre pilotes: todavía no hay verificación para ella."
          : "No se reconoce el tipo de viga por su rótulo (se esperaba VR o VC).",
      },
      geometria: {},
      aMano: [],
      materiales: {},
    });
  });

  // --- Pilotes: uno por uno, nombrados por la pieza que tienen encima ---------
  const porDuenio = new Map<string, number[]>();
  for (let k = 0; k < r.pilotes.length; k++) {
    const d = duenio.get(k) ?? "";
    porDuenio.set(d, [...(porDuenio.get(d) ?? []), k]);
  }
  for (const [d, ks] of porDuenio) {
    const orden = numerarMarcas(ks.map((k) => ({ nombre: "P", centro: r.pilotes[k].centro })));
    ks.forEach((k, j) => {
      // numerarMarcas deja "P" sola si hay un único pilote: igual se numera.
      const numero = orden[j] === "P" ? "P1" : orden[j].replace("-", "");
      piezas.push({
        origen: { marca: d ? `${d}-${numero}` : numero, pieza: "pilote", ...(d ? { bajo: d } : {}) },
        verificacion: "pilotes",
        geometria: { diametro: m(r.pilotes[k].diametro * e), longitud: m(o.largoPiloteM) },
        aMano: A_MANO.pilotes,
        materiales: { fck: String(mat.fckMPa), fyk: String(mat.fykMPa) },
      });
    });
  }

  return piezas;
}
