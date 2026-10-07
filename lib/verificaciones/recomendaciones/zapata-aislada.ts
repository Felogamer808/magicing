import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";
import {
  calcularZapataAislada,
  type DatosZapataAislada,
  type GeometriaZapataAislada,
  type ResultadoDireccionZapata,
  type ResultadoZapataAislada,
} from "@/lib/calc/hormigon/cimentaciones/zapata-aislada";
import { recomendar, type Palanca, type Problema, type Recomendacion } from "./motor";
import {
  CITA_LBD_DIAMETRO,
  CITA_PATILLA,
  CITA_TIRANTE,
  EFECTO_BRAZO,
  EFECTO_H,
  EFECTO_PILAR,
  m,
  palancaDiametro,
  palancaFck,
  palancaOpcion,
  palancaValor,
} from "./palancas";

export interface EntradaZapataAislada {
  fck: number;
  fyk: number;
  geometria: GeometriaZapataAislada;
  sigmaAdmisibleKPa: number;
  datos: DatosZapataAislada;
}

type Dir = "A" | "B";
/** Con el pilar centrado se muestra un vuelo por dirección; descentrado, los dos. */
export type LadoAislada = "gobernante" | "inicio" | "fin";
type ClaveVuelo = `${Dir}.${LadoAislada}.${"as" | "anclaje" | "corte"}`;
export type ClaveAislada = "tension" | "deslizamiento" | "vuelcoA" | "vuelcoB" | "punzonamiento" | "bielas" | ClaveVuelo;
export type RecomendacionesAislada = Partial<Record<ClaveAislada, Recomendacion[]>>;

const NOMBRE_LADO: Record<LadoAislada, string> = { gobernante: "", inicio: " (vuelo de inicio)", fin: " (vuelo final)" };
const TIPO = { as: "armadura", anclaje: "anclaje", corte: "cortante" } as const;

const NOMBRES = {
  tension: "tensión del terreno",
  deslizamiento: "deslizamiento",
  vuelcoA: "vuelco en A",
  vuelcoB: "vuelco en B",
  punzonamiento: "punzonamiento",
  bielas: "bielas en la cara del pilar",
  ...Object.fromEntries(
    (["A", "B"] as const).flatMap((d) =>
      (["gobernante", "inicio", "fin"] as const).flatMap((l) =>
        (["as", "anclaje", "corte"] as const).map((t) => [`${d}.${l}.${t}`, `${TIPO[t]} en ${d}${NOMBRE_LADO[l]}`])
      )
    )
  ),
} as Record<ClaveAislada, string>;

const descentrado = (e: EntradaZapataAislada) =>
  e.geometria.distanciaBordeA !== undefined || e.geometria.distanciaBordeB !== undefined;

function calcular(e: EntradaZapataAislada): ResultadoZapataAislada | null {
  const z = calcularZapataAislada(derivarMateriales({ fck: e.fck, fyk: e.fyk }), e.geometria, e.sigmaAdmisibleKPa, e.datos);
  return Number.isFinite(z.geotecnico.sigmaKPa) ? z : null;
}

function utilizacionesVuelo(prefijo: `${Dir}.${LadoAislada}`, v: ResultadoDireccionZapata): Partial<Record<ClaveAislada, number>> {
  return {
    [`${prefijo}.as`]: v.asNecCm2 / v.asRealCm2,
    ...(v.anclaje.comprobado ? { [`${prefijo}.anclaje`]: v.anclaje.lbdMm / v.anclaje.disponibleMm } : {}),
    ...(v.vRdCKN > 0 ? { [`${prefijo}.corte`]: v.vEdKN / v.vRdCKN } : {}),
  };
}

function utilizaciones(e: EntradaZapataAislada) {
  const desc = descentrado(e);
  return (z: ResultadoZapataAislada): Partial<Record<ClaveAislada, number>> => ({
    tension: z.geotecnico.sigmaKPa / e.sigmaAdmisibleKPa,
    // Sin horizontal no hay deslizamiento que proponer: utilización 0 no entra.
    ...(z.deslizamiento && z.deslizamiento.horizontalKN > 0 ? { deslizamiento: z.deslizamiento.aprovechamiento } : {}),
    ...(z.vuelcoA && z.vuelcoA.borde !== "ninguno" ? { vuelcoA: z.vuelcoA.aprovechamiento } : {}),
    ...(z.vuelcoB.borde !== "ninguno" ? { vuelcoB: z.vuelcoB.aprovechamiento } : {}),
    ...(desc
      ? {
          ...utilizacionesVuelo("A.inicio", z.vuelosA.inicio),
          ...utilizacionesVuelo("A.fin", z.vuelosA.fin),
          ...utilizacionesVuelo("B.inicio", z.vuelosB.inicio),
          ...utilizacionesVuelo("B.fin", z.vuelosB.fin),
        }
      : { ...utilizacionesVuelo("A.gobernante", z.direccionA), ...utilizacionesVuelo("B.gobernante", z.direccionB) }),
    ...(z.punzonamiento.motivoNoEvaluado
      ? {}
      : {
          punzonamiento: z.punzonamiento.vEdKN / z.punzonamiento.vRdCKN,
          bielas: z.punzonamiento.caraPilar.vEdMPa / z.punzonamiento.caraPilar.vRdMaxMPa,
        }),
  });
}

// ── Palancas ────────────────────────────────────────────────────────────────

type E = EntradaZapataAislada;
type CampoGeometria = "A" | "B" | "H" | "anchoPilarA" | "anchoPilarB";

const geo = (campo: CampoGeometria) => ({
  leer: (e: E) => e.geometria[campo],
  escribir: (e: E, v: number): E => ({ ...e, geometria: { ...e.geometria, [campo]: v } }),
});

const H = palancaValor(geo("H"), { paso: 0.05, tope: (h) => h + 1, rotulo: "H = ", texto: m, efectoColateral: EFECTO_H });
const FCK = palancaFck<E>({ leer: (e) => e.fck, escribir: (e, fck) => ({ ...e, fck }) });

const lado = (d: Dir) =>
  palancaValor(geo(d), {
    paso: 0.05,
    tope: (v) => v + 2,
    rotulo: `${d} = `,
    texto: m,
    efectoColateral: "Más superficie de apoyo; crece el vuelo y su armadura.",
  });

/** A y B a la vez, en el mismo paso: la zapata crece sin cambiar de forma. */
const AMBOS_LADOS: Palanca<E> = {
  efectoColateral: "Más superficie de apoyo; crecen los vuelos y su armadura.",
  *candidatos(e) {
    for (let i = 1; i <= 40; i++) {
      const A = Math.round((e.geometria.A + 0.05 * i) * 100) / 100;
      const B = Math.round((e.geometria.B + 0.05 * i) * 100) / 100;
      yield {
        datos: { ...e, geometria: { ...e.geometria, A, B } },
        accion: `A × B = ${m(A)} × ${m(B)} (hoy ${m(e.geometria.A)} × ${m(e.geometria.B)})`,
      };
    }
  },
};

const pilar = (campo: "anchoPilarA" | "anchoPilarB") =>
  palancaValor(geo(campo), {
    paso: 0.05,
    tope: (v) => v + 0.6,
    rotulo: `pilar // ${campo === "anchoPilarA" ? "A" : "B"} = `,
    texto: m,
    efectoColateral: EFECTO_PILAR,
  });

const armado = (d: Dir) => {
  const clave = d === "A" ? "armadoA" : "armadoB";
  return {
    numero: {
      leer: (e: E) => e.datos[clave].numero,
      escribir: (e: E, n: number): E => ({ ...e, datos: { ...e.datos, [clave]: { ...e.datos[clave], numero: n } } }),
    },
    diametro: {
      leer: (e: E) => e.datos[clave].diametroMm,
      escribir: (e: E, dm: number): E => ({ ...e, datos: { ...e.datos, [clave]: { ...e.datos[clave], diametroMm: dm } } }),
    },
    rotulo: `${d}: `,
    texto: (n: number, dm: number) => `${n} Ø${dm}`,
  };
};

const masBarras = (d: Dir) => {
  const a = armado(d);
  return palancaValor(a.numero, {
    paso: 1,
    tope: (n) => n + 20,
    decimales: 0,
    rotulo: a.rotulo,
    texto: (n, e) => a.texto(n, a.diametro.leer(e)),
    efectoColateral: "Más acero; revisar la separación libre entre barras.",
  });
};

const diametroMayor = (d: Dir) => {
  const a = armado(d);
  return palancaDiametro(a.diametro, "mayor", (e, dm) => a.texto(a.numero.leer(e), dm), {
    rotulo: a.rotulo,
    efectoColateral: "Diámetro mayor: pide más anclaje.",
  });
};

/** Más fino y más barras, con la misma área: lbd baja con el diámetro. */
const diametroMenor = (d: Dir): Palanca<E> => {
  const a = armado(d);
  return {
    efectoColateral: "Misma área con más barras finas.",
    cita: CITA_LBD_DIAMETRO,
    *candidatos(e) {
      const n0 = a.numero.leer(e);
      const d0 = a.diametro.leer(e);
      for (const c of palancaDiametro(a.diametro, "menor", () => "").candidatos(e)) {
        const dm = a.diametro.leer(c.datos);
        const n = Math.ceil(n0 * (d0 / dm) ** 2);
        yield { datos: a.numero.escribir(c.datos, n), accion: `${a.rotulo}${a.texto(n, dm)} (hoy ${a.texto(n0, d0)})` };
      }
    },
  };
};

const PATILLA = palancaOpcion<E>(
  (e) => e.datos.formaAnclaje !== "gancho",
  (e) => ({ ...e, datos: { ...e.datos, formaAnclaje: "gancho" } }),
  "Terminar la parrilla en patilla a 90° (hoy recta)",
  { cita: CITA_PATILLA }
);

const BRAZO: Palanca<E> = palancaValor<E>(
  {
    leer: (e) => e.datos.tirante?.brazoM ?? 0,
    escribir: (e, h) => ({ ...e, datos: { ...e.datos, tirante: e.datos.tirante && { ...e.datos.tirante, brazoM: h } } }),
  },
  { paso: 0.25, tope: (h) => h + 6, decimales: 2, rotulo: "h del tirante = ", texto: m, efectoColateral: EFECTO_BRAZO, cita: CITA_TIRANTE }
);

function palancasPorClave(clave: ClaveAislada): readonly Palanca<E>[] {
  if (clave === "tension") return [AMBOS_LADOS, lado("A"), lado("B")];
  // Más zapata es más peso que frena y estabiliza; el brazo del tirante sólo
  // existe con tirante (con brazoM 0 la palanca no propone nada).
  if (clave === "deslizamiento") return [BRAZO, AMBOS_LADOS, H];
  if (clave === "vuelcoA") return [lado("A"), AMBOS_LADOS, H];
  if (clave === "vuelcoB") return [lado("B"), AMBOS_LADOS, H];
  if (clave === "punzonamiento") return [H, FCK];
  if (clave === "bielas") return [H, pilar("anchoPilarA"), pilar("anchoPilarB"), FCK];
  const d = clave[0] as Dir;
  if (clave.endsWith(".as")) return [masBarras(d), diametroMayor(d), H];
  if (clave.endsWith(".anclaje")) return [PATILLA, diametroMenor(d), H];
  return [H, FCK];
}

/** Propuestas para cada comprobación de la zapata aislada que no cumple o queda justa. */
export function recomendarZapataAislada(entrada: EntradaZapataAislada): RecomendacionesAislada {
  const actual = calcular(entrada);
  if (!actual) return {};
  const problema: Problema<E, ResultadoZapataAislada, ClaveAislada> = {
    datos: entrada,
    calcular,
    utilizaciones: utilizaciones(entrada),
    nombres: NOMBRES,
  };
  const salida: RecomendacionesAislada = {};
  for (const clave of Object.keys(problema.utilizaciones(actual)) as ClaveAislada[]) {
    const r = recomendar(problema, clave, palancasPorClave(clave), actual);
    if (r.length) salida[clave] = r;
  }
  return salida;
}
