import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";
import {
  calcularZapataCorrida,
  type DatosZapataCorrida,
  type GeometriaZapataCorrida,
  type ResultadoZapataCorrida,
} from "@/lib/calc/hormigon/cimentaciones/zapata-corrida";
import type { ResultadoDireccionZapata } from "@/lib/calc/hormigon/cimentaciones/zapata-aislada";
import { fmt } from "@/lib/verificaciones/formato";
import { recomendar, type Palanca, type Problema, type Recomendacion } from "./motor";
import {
  CITA_LBD_DIAMETRO,
  CITA_PATILLA,
  CITA_TIRANTE,
  EFECTO_BRAZO,
  EFECTO_H,
  m,
  palancaDiametro,
  palancaFck,
  palancaOpcion,
  palancaValor,
} from "./palancas";

export interface EntradaZapataCorrida {
  fck: number;
  fyk: number;
  geometria: GeometriaZapataCorrida;
  sigmaAdmisibleKPa: number;
  datos: DatosZapataCorrida;
}

/** Con el muro centrado se muestra un vuelo; descentrado, los dos. */
export type LadoCorrida = "gobernante" | "inicio" | "fin";
type ClaveVuelo = `${LadoCorrida}.${"as" | "anclaje" | "corte"}`;
export type ClaveCorrida = "tension" | "deslizamiento" | "vuelco" | "reparto" | ClaveVuelo;
export type RecomendacionesCorrida = Partial<Record<ClaveCorrida, Recomendacion[]>>;

const NOMBRE_LADO: Record<LadoCorrida, string> = { gobernante: "del vuelo", inicio: "del vuelo izquierdo", fin: "del vuelo derecho" };
const TIPO = { as: "armadura", anclaje: "anclaje", corte: "cortante" } as const;
const NOMBRES = {
  tension: "tensión del terreno",
  deslizamiento: "deslizamiento",
  vuelco: "vuelco",
  reparto: "armadura de reparto",
  ...Object.fromEntries(
    (["gobernante", "inicio", "fin"] as const).flatMap((l) =>
      (["as", "anclaje", "corte"] as const).map((t) => [`${l}.${t}`, `${TIPO[t]} ${NOMBRE_LADO[l]}`])
    )
  ),
} as Record<ClaveCorrida, string>;

function calcular(e: EntradaZapataCorrida): ResultadoZapataCorrida | null {
  const z = calcularZapataCorrida(derivarMateriales({ fck: e.fck, fyk: e.fyk }), e.geometria, e.sigmaAdmisibleKPa, e.datos);
  return Number.isFinite(z.geotecnico.sigmaKPa) ? z : null;
}

function utilizacionesVuelo(lado: LadoCorrida, v: ResultadoDireccionZapata): Partial<Record<ClaveCorrida, number>> {
  return {
    [`${lado}.as`]: v.asNecCm2 / v.asRealCm2,
    ...(v.anclaje.comprobado ? { [`${lado}.anclaje`]: v.anclaje.lbdMm / v.anclaje.disponibleMm } : {}),
    ...(v.vRdCKN > 0 ? { [`${lado}.corte`]: v.vEdKN / v.vRdCKN } : {}),
  };
}

function utilizaciones(e: EntradaZapataCorrida) {
  return (z: ResultadoZapataCorrida): Partial<Record<ClaveCorrida, number>> => ({
    tension: z.geotecnico.sigmaKPa / e.sigmaAdmisibleKPa,
    reparto: z.secundario.asNecCm2 / z.secundario.asRealCm2,
    ...(z.deslizamiento && z.deslizamiento.horizontalKN > 0 ? { deslizamiento: z.deslizamiento.aprovechamiento } : {}),
    ...(z.vuelco && z.vuelco.borde !== "ninguno" ? { vuelco: z.vuelco.aprovechamiento } : {}),
    ...(z.muroCentrado
      ? utilizacionesVuelo("gobernante", z.principal)
      : { ...utilizacionesVuelo("inicio", z.vuelos.inicio), ...utilizacionesVuelo("fin", z.vuelos.fin) }),
  });
}

// ── Palancas ────────────────────────────────────────────────────────────────

type E = EntradaZapataCorrida;

const geo = (campo: "A" | "H") => ({
  leer: (e: E) => e.geometria[campo],
  escribir: (e: E, v: number): E => ({ ...e, geometria: { ...e.geometria, [campo]: v } }),
});

const H = palancaValor(geo("H"), { paso: 0.05, tope: (h) => h + 1, rotulo: "H = ", texto: m, efectoColateral: EFECTO_H });
const ANCHO = palancaValor(geo("A"), {
  paso: 0.05,
  tope: (a) => a + 2,
  rotulo: "A = ",
  texto: m,
  efectoColateral: "Más ancho: baja la tensión pero crece el vuelo y su armadura.",
});
const FCK = palancaFck<E>({ leer: (e) => e.fck, escribir: (e, fck) => ({ ...e, fck }) });

const principal = {
  separacion: {
    leer: (e: E) => e.datos.armadoPrincipal.separacionM,
    escribir: (e: E, s: number): E => ({ ...e, datos: { ...e.datos, armadoPrincipal: { ...e.datos.armadoPrincipal, separacionM: s } } }),
  },
  diametro: {
    leer: (e: E) => e.datos.armadoPrincipal.diametroMm,
    escribir: (e: E, d: number): E => ({ ...e, datos: { ...e.datos, armadoPrincipal: { ...e.datos.armadoPrincipal, diametroMm: d } } }),
  },
  texto: (d: number, s: number) => `Ø${d} c/${fmt(s, 2)}`,
};

const SEPARACION = palancaValor(principal.separacion, {
  paso: -0.01,
  tope: () => 0.07,
  decimales: 2,
  texto: (s, e) => principal.texto(principal.diametro.leer(e), s),
  efectoColateral: "Más barras por metro.",
});

const DIAMETRO_MAYOR = palancaDiametro(principal.diametro, "mayor", (e, d) => principal.texto(d, principal.separacion.leer(e)), {
  efectoColateral: "Diámetro mayor: pide más anclaje.",
});

/** Más fino y más junto, con la misma área por metro: lbd baja con el diámetro. */
const DIAMETRO_MENOR: Palanca<E> = {
  efectoColateral: "Misma área con más barras finas.",
  cita: CITA_LBD_DIAMETRO,
  *candidatos(e) {
    const d0 = principal.diametro.leer(e);
    const s0 = principal.separacion.leer(e);
    for (const c of palancaDiametro(principal.diametro, "menor", () => "").candidatos(e)) {
      const d = principal.diametro.leer(c.datos);
      const s = Math.floor(s0 * (d / d0) ** 2 * 100) / 100;
      if (s < 0.07) return;
      yield { datos: principal.separacion.escribir(c.datos, s), accion: `${principal.texto(d, s)} (hoy ${principal.texto(d0, s0)})` };
    }
  },
};

const PATILLA = palancaOpcion<E>(
  (e) => e.datos.formaAnclaje !== "gancho",
  (e) => ({ ...e, datos: { ...e.datos, formaAnclaje: "gancho" } }),
  "Terminar las barras en patilla a 90° (hoy rectas)",
  { cita: CITA_PATILLA }
);

const REPARTO_MAS_BARRAS = palancaValor<E>(
  {
    leer: (e) => e.datos.armadoSecundario.numero,
    escribir: (e, n) => ({ ...e, datos: { ...e.datos, armadoSecundario: { ...e.datos.armadoSecundario, numero: n } } }),
  },
  { paso: 1, tope: (n) => n + 20, decimales: 0, rotulo: "Reparto: ", texto: (n, e) => `${n} Ø${e.datos.armadoSecundario.diametroMm}` }
);

const REPARTO_DIAMETRO = palancaDiametro<E>(
  {
    leer: (e) => e.datos.armadoSecundario.diametroMm,
    escribir: (e, d) => ({ ...e, datos: { ...e.datos, armadoSecundario: { ...e.datos.armadoSecundario, diametroMm: d } } }),
  },
  "mayor",
  (e, d) => `${e.datos.armadoSecundario.numero} Ø${d}`,
  { rotulo: "Reparto: " }
);

const BRAZO = palancaValor<E>(
  {
    leer: (e) => e.datos.tirante?.brazoM ?? 0,
    escribir: (e, h) => ({ ...e, datos: { ...e.datos, tirante: e.datos.tirante && { ...e.datos.tirante, brazoM: h } } }),
  },
  { paso: 0.25, tope: (h) => h + 6, decimales: 2, rotulo: "h del tirante = ", texto: m, efectoColateral: EFECTO_BRAZO, cita: CITA_TIRANTE }
);

function palancasPorClave(clave: ClaveCorrida): readonly Palanca<E>[] {
  if (clave === "tension") return [ANCHO];
  // Más zapata es más peso que frena y estabiliza.
  if (clave === "deslizamiento") return [BRAZO, ANCHO, H];
  if (clave === "vuelco") return [ANCHO, H];
  if (clave === "reparto") return [REPARTO_MAS_BARRAS, REPARTO_DIAMETRO];
  if (clave.endsWith(".as")) return [SEPARACION, DIAMETRO_MAYOR, H];
  if (clave.endsWith(".anclaje")) return [PATILLA, DIAMETRO_MENOR, H];
  return [H, FCK];
}

/** Propuestas para cada comprobación de la zapata corrida que no cumple o queda justa. */
export function recomendarZapataCorrida(entrada: EntradaZapataCorrida): RecomendacionesCorrida {
  const actual = calcular(entrada);
  if (!actual) return {};
  const problema: Problema<E, ResultadoZapataCorrida, ClaveCorrida> = {
    datos: entrada,
    calcular,
    utilizaciones: utilizaciones(entrada),
    nombres: NOMBRES,
  };
  const salida: RecomendacionesCorrida = {};
  for (const clave of Object.keys(problema.utilizaciones(actual)) as ClaveCorrida[]) {
    const r = recomendar(problema, clave, palancasPorClave(clave), actual);
    if (r.length) salida[clave] = r;
  }
  return salida;
}
