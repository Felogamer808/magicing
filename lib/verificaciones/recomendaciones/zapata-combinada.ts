import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";
import { DIAMETROS_ARMADURA } from "@/lib/calc/armaduras";
import {
  calcularZapataCombinada,
  type DatosZapataCombinada,
  type GeometriaZapataCombinada,
  type PilarCombinada,
  type ResultadoZapataCombinada,
} from "@/lib/calc/hormigon/cimentaciones/zapata-combinada";
import type { ResultadoDireccionZapata } from "@/lib/calc/hormigon/cimentaciones/zapata-aislada";
import { fmt } from "@/lib/verificaciones/formato";
import {
  CLASES_FCK,
  pasos,
  recomendar,
  type Candidato,
  type Palanca,
  type Problema,
  type Recomendacion,
} from "./motor";

/** Todo lo que entra al cálculo de la combinada, para poder mover cualquier dato. */
export interface EntradaZapataCombinada {
  fck: number;
  fyk: number;
  geometria: GeometriaZapataCombinada;
  sigmaAdmisibleKPa: number;
  datos: DatosZapataCombinada;
}

type Lado = "inicio" | "fin" | "gobernante";
type ClaveVuelo = `${Lado}.${"as" | "anclaje" | "corte"}`;
export type ClaveCombinada =
  | "tension"
  | "deslizamiento"
  | "inferior"
  | "superior"
  | "cortante"
  | ClaveVuelo
  | `punzonamiento${1 | 2}`
  | `bielas${1 | 2}`;

export type RecomendacionesCombinada = Partial<Record<ClaveCombinada, Recomendacion[]>>;

const NOMBRE_LADO: Record<Lado, string> = {
  inicio: "vuelo de la medianera",
  fin: "vuelo hacia adentro",
  gobernante: "vuelo a lo ancho",
};

const NOMBRES: Record<ClaveCombinada, string> = {
  tension: "tensión del terreno",
  deslizamiento: "deslizamiento",
  inferior: "armadura inferior",
  superior: "armadura superior",
  cortante: "cortante a lo largo",
  ...(Object.fromEntries(
    (Object.keys(NOMBRE_LADO) as Lado[]).flatMap((l) => [
      [`${l}.as`, `armadura del ${NOMBRE_LADO[l]}`],
      [`${l}.anclaje`, `anclaje del ${NOMBRE_LADO[l]}`],
      [`${l}.corte`, `cortante del ${NOMBRE_LADO[l]}`],
    ])
  ) as Record<ClaveVuelo, string>),
  punzonamiento1: "punzonamiento P1",
  punzonamiento2: "punzonamiento P2",
  bielas1: "bielas en la cara de P1",
  bielas2: "bielas en la cara de P2",
};

function calcular(e: EntradaZapataCombinada): ResultadoZapataCombinada | null {
  const z = calcularZapataCombinada(
    derivarMateriales({ fck: e.fck, fyk: e.fyk }),
    e.geometria,
    e.sigmaAdmisibleKPa,
    e.datos
  );
  return z.pilaresDentro ? z : null;
}

function utilizacionesVuelo(lado: Lado, v: ResultadoDireccionZapata): Partial<Record<ClaveCombinada, number>> {
  return {
    [`${lado}.as`]: v.asNecCm2 / v.asRealCm2,
    ...(v.anclaje.comprobado ? { [`${lado}.anclaje`]: v.anclaje.lbdMm / v.anclaje.disponibleMm } : {}),
    ...(v.vRdCKN > 0 ? { [`${lado}.corte`]: v.vEdKN / v.vRdCKN } : {}),
  };
}

/** Utilización de cada comprobación, con el mismo cociente que dibuja la barra en la página. */
function utilizaciones(e: EntradaZapataCombinada) {
  const descentrado = e.geometria.distanciaBordeB !== undefined;
  return (z: ResultadoZapataCombinada): Partial<Record<ClaveCombinada, number>> => {
    const u: Partial<Record<ClaveCombinada, number>> = {
      tension: z.geotecnico.sigmaKPa / e.sigmaAdmisibleKPa,
      inferior: z.inferior.flexion.asNecCm2 / z.inferior.flexion.asRealCm2,
      cortante: z.cortante.vEdKN / z.cortante.vRdCKN,
      ...(descentrado
        ? { ...utilizacionesVuelo("inicio", z.transversal.inicio), ...utilizacionesVuelo("fin", z.transversal.fin) }
        : utilizacionesVuelo("gobernante", z.transversal.gobernante)),
    };
    if (z.superior.necesaria) u.superior = z.superior.flexion.asNecCm2 / z.superior.flexion.asRealCm2;
    if (z.tirante) u.deslizamiento = Math.abs(z.tirante.global.tkKN) / z.tirante.global.rozamientoResistenteKN;
    z.punzonamiento.forEach((p, i) => {
      const n = (i + 1) as 1 | 2;
      if (!p.motivoNoEvaluado) u[`punzonamiento${n}`] = p.vEdKN / p.vRdCKN;
      u[`bielas${n}`] = p.caraPilar.vEdMPa / p.caraPilar.vRdMaxMPa;
    });
    return u;
  };
}

// ── Palancas ────────────────────────────────────────────────────────────────

const m = (v: number) => `${fmt(v, 2)} m`;

function palancaGeometria(
  campo: "H" | "B" | "L",
  paso: number,
  maximoExtra: number,
  rotulo: string,
  extra: Pick<Palanca<EntradaZapataCombinada>, "efectoColateral" | "cita">
): Palanca<EntradaZapataCombinada> {
  return {
    ...extra,
    *candidatos(e) {
      const hoy = e.geometria[campo];
      for (const v of pasos(hoy, paso, hoy + maximoExtra)) {
        yield { datos: { ...e, geometria: { ...e.geometria, [campo]: v } }, accion: `${rotulo} = ${m(v)} (hoy ${m(hoy)})` };
      }
    },
  };
}

const PALANCA_H = palancaGeometria("H", 0.05, 1, "H", {
  efectoColateral: "Más canto: más hormigón y excavación, y crece la armadura mínima.",
});
const PALANCA_B = palancaGeometria("B", 0.05, 2, "B", {
  efectoColateral: "Más ancho: baja la tensión pero crece el vuelo transversal y su armadura.",
});
const PALANCA_L = palancaGeometria("L", 0.05, 1.5, "L", {
  efectoColateral: "Se alarga por el extremo derecho: el pilar del borde deja de estar en esquina.",
});

const PALANCA_FCK: Palanca<EntradaZapataCombinada> = {
  efectoColateral: "Cambia el hormigón de toda la zapata.",
  *candidatos(e) {
    for (const fck of CLASES_FCK.filter((c) => c > e.fck)) {
      yield { datos: { ...e, fck }, accion: `fck = ${fck} MPa (hoy ${fmt(e.fck, 0)})` };
    }
  },
};

/** Más barras del mismo diámetro, y si no alcanza con 30, el diámetro siguiente con las mismas barras. */
function palancasArmadura(cara: "inferior" | "superior"): Palanca<EntradaZapataCombinada>[] {
  const texto = (n: number, d: number) => `${n} Ø${d}`;
  return [
    {
      efectoColateral: "Más acero; revisar la separación libre entre barras.",
      *candidatos(e) {
        const hoy = e.datos[cara];
        for (let n = hoy.numero + 1; n <= 30; n++) {
          yield {
            datos: { ...e, datos: { ...e.datos, [cara]: { ...hoy, numero: n } } },
            accion: `${cara === "inferior" ? "Inferior" : "Superior"}: ${texto(n, hoy.diametroMm)} (hoy ${texto(hoy.numero, hoy.diametroMm)})`,
          };
        }
      },
    },
    {
      efectoColateral: "Diámetro mayor: pide más anclaje.",
      *candidatos(e) {
        const hoy = e.datos[cara];
        for (const d of DIAMETROS_ARMADURA.filter((x) => x > hoy.diametroMm)) {
          yield {
            datos: { ...e, datos: { ...e.datos, [cara]: { ...hoy, diametroMm: d } } },
            accion: `${cara === "inferior" ? "Inferior" : "Superior"}: ${texto(hoy.numero, d)} (hoy ${texto(hoy.numero, hoy.diametroMm)})`,
          };
        }
      },
    },
  ];
}

const transversalTexto = (d: number, s: number) => `Ø${d} c/${fmt(s, 2)}`;

const PALANCA_SEPARACION: Palanca<EntradaZapataCombinada> = {
  efectoColateral: "Más barras transversales en todo el largo.",
  *candidatos(e) {
    const hoy = e.datos.transversal;
    for (let s = Math.round(hoy.separacionM * 100) - 1; s >= 7; s--) {
      yield {
        datos: { ...e, datos: { ...e.datos, transversal: { ...hoy, separacionM: s / 100 } } },
        accion: `Transversal ${transversalTexto(hoy.diametroMm, s / 100)} (hoy ${transversalTexto(hoy.diametroMm, hoy.separacionM)})`,
      };
    }
  },
};

const PALANCA_DIAMETRO_TRANSVERSAL: Palanca<EntradaZapataCombinada> = {
  efectoColateral: "Diámetro mayor: pide más anclaje en el vuelo.",
  *candidatos(e) {
    const hoy = e.datos.transversal;
    for (const d of DIAMETROS_ARMADURA.filter((x) => x > hoy.diametroMm)) {
      yield {
        datos: { ...e, datos: { ...e.datos, transversal: { ...hoy, diametroMm: d } } },
        accion: `Transversal ${transversalTexto(d, hoy.separacionM)} (hoy ${transversalTexto(hoy.diametroMm, hoy.separacionM)})`,
      };
    }
  },
};

/**
 * Para el anclaje: barras más finas y más juntas, con la misma cuantía. La
 * longitud de anclaje es proporcional al diámetro (ec. (8.3)), así que es la
 * palanca que actúa directo sobre lbd sin tocar la geometría.
 */
const PALANCA_DIAMETRO_MENOR: Palanca<EntradaZapataCombinada> = {
  efectoColateral: "Misma cuantía con más barras: más mano de obra.",
  cita: "Anejo 19, art. 8.4.3 (2), ec. (8.3), pág. 124",
  *candidatos(e) {
    const hoy = e.datos.transversal;
    for (const d of DIAMETROS_ARMADURA.filter((x) => x < hoy.diametroMm).reverse()) {
      const s = Math.floor(hoy.separacionM * (d / hoy.diametroMm) ** 2 * 100) / 100;
      if (s < 0.07) return;
      yield {
        datos: { ...e, datos: { ...e.datos, transversal: { diametroMm: d, separacionM: s } } },
        accion: `Transversal ${transversalTexto(d, s)} (hoy ${transversalTexto(hoy.diametroMm, hoy.separacionM)})`,
      };
    }
  },
};

const PALANCA_PATILLA: Palanca<EntradaZapataCombinada> = {
  cita: "Anejo 19, art. 8.4.3 (3), pág. 124: la patilla cuenta a lo largo del eje",
  *candidatos(e) {
    if (e.datos.formaAnclaje === "gancho") return;
    yield { datos: { ...e, datos: { ...e.datos, formaAnclaje: "gancho" } }, accion: "Terminar las transversales en patilla a 90° (hoy rectas)" };
  },
};

const PALANCA_BRAZO_TIRANTE: Palanca<EntradaZapataCombinada> = {
  efectoColateral: "El tirante va más arriba: tiene que haber dónde anclarlo a esa altura.",
  cita: "CTE DB SE-C, art. 4.1.1 (6), pág. 25",
  *candidatos(e) {
    const t = e.datos.tirante;
    if (!t) return;
    for (const h of pasos(t.brazoM, 0.25, t.brazoM + 6, 2)) {
      yield { datos: { ...e, datos: { ...e.datos, tirante: { ...t, brazoM: h } } }, accion: `h del tirante = ${m(h)} (hoy ${m(t.brazoM)})` };
    }
  },
};

/** Agrandar el pilar a lo ancho y a lo largo: es lo que agranda u0 en la ec. (6.53). */
function palancaPilar(i: 0 | 1, campo: "anchoAnchoM" | "anchoLargoM"): Palanca<EntradaZapataCombinada> {
  const rotulo = campo === "anchoAnchoM" ? "a lo ancho" : "a lo largo";
  return {
    efectoColateral: "Cambia la sección del pilar: hay que revisarlo también.",
    *candidatos(e) {
      const hoy = e.datos.pilares[i][campo];
      for (const v of pasos(hoy, 0.05, hoy + 0.6, 2)) {
        const pilares = [...e.datos.pilares] as [PilarCombinada, PilarCombinada];
        pilares[i] = { ...pilares[i], [campo]: v };
        const candidato: Candidato<EntradaZapataCombinada> = {
          datos: { ...e, datos: { ...e.datos, pilares } },
          accion: `P${i + 1} ${rotulo} = ${m(v)} (hoy ${m(hoy)})`,
        };
        yield candidato;
      }
    },
  };
}

function palancasPorClave(clave: ClaveCombinada): Palanca<EntradaZapataCombinada>[] {
  if (clave === "tension") return [PALANCA_B, PALANCA_L];
  if (clave === "deslizamiento") return [PALANCA_BRAZO_TIRANTE];
  if (clave === "inferior" || clave === "superior") return [...palancasArmadura(clave), PALANCA_H];
  if (clave === "cortante") return [PALANCA_H, PALANCA_FCK];
  if (clave.endsWith(".as")) return [PALANCA_SEPARACION, PALANCA_DIAMETRO_TRANSVERSAL, PALANCA_H];
  if (clave.endsWith(".anclaje")) return [PALANCA_PATILLA, PALANCA_DIAMETRO_MENOR, PALANCA_H];
  if (clave.endsWith(".corte")) return [PALANCA_H, PALANCA_FCK];
  if (clave.startsWith("punzonamiento")) return [PALANCA_H, PALANCA_FCK];
  // Bielas en la cara del pilar: en el orden en que más rinden para un pilar
  // de borde o de esquina.
  const i = (clave === "bielas1" ? 0 : 1) as 0 | 1;
  return [PALANCA_L, PALANCA_H, palancaPilar(i, "anchoAnchoM"), palancaPilar(i, "anchoLargoM"), PALANCA_FCK];
}

/**
 * Propuestas para cada comprobación de la combinada que no cumple o queda
 * justa. Las que cumplen con margen no aparecen.
 */
export function recomendarZapataCombinada(entrada: EntradaZapataCombinada): RecomendacionesCombinada {
  const problema: Problema<EntradaZapataCombinada, ResultadoZapataCombinada, ClaveCombinada> = {
    datos: entrada,
    calcular,
    utilizaciones: utilizaciones(entrada),
    nombres: NOMBRES,
  };
  const actual = calcular(entrada);
  if (!actual) return {};
  const salida: RecomendacionesCombinada = {};
  for (const clave of Object.keys(problema.utilizaciones(actual)) as ClaveCombinada[]) {
    const r = recomendar(problema, clave, palancasPorClave(clave), actual);
    if (r.length) salida[clave] = r;
  }
  return salida;
}
