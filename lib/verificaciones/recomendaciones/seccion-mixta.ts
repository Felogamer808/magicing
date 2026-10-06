import { resolverSeccionMixta, type ResueltoSeccionMixta } from "@/lib/calc/acero/resolver-seccion-mixta";
import { recomendarTodas, type Palanca, type Recomendacion } from "./motor";
import { campo, palancaDiametro, palancaValor, type Campos } from "./palancas";

export type ClaveSeccionMixta = "axil" | "momento" | "corte" | "asMin";
export type RecomendacionesSeccionMixta = Partial<Record<ClaveSeccionMixta, Recomendacion[]>>;

const NOMBRES: Record<ClaveSeccionMixta, string> = {
  axil: "carga axial",
  momento: "momento",
  corte: "cortante",
  asMin: "armadura mínima",
};

const utilizaciones = ({ r, n }: ResueltoSeccionMixta): Record<ClaveSeccionMixta, number> => ({
  axil: n.p / r.compresion.pAdmKN,
  momento: n.m / r.flexion.mAdmKNm,
  corte: n.v / r.corte.vAdmKN,
  asMin: r.propiedades.asrMinM2 / r.propiedades.asrM2,
});

const mm = (v: number) => `${v.toLocaleString("es-AR", { maximumFractionDigits: 1 })} mm`;

const DIAMETRO_TUBO = palancaValor(campo("dMm"), {
  paso: 20,
  tope: (d) => d + 300,
  decimales: 1,
  rotulo: "Tubo Ø ",
  texto: mm,
  efectoColateral: "Tubo más grande: más hormigón de relleno y más peso.",
});
const ESPESOR_TUBO = palancaValor(campo("tMm"), {
  paso: 1,
  tope: (t) => t + 10,
  decimales: 1,
  rotulo: "Espesor de pared = ",
  texto: mm,
  efectoColateral: "Pared más gruesa: mismo diámetro exterior.",
});
const BARRAS = palancaValor(campo("nBarras"), {
  paso: 1,
  tope: (n) => n + 8,
  decimales: 0,
  rotulo: "Barras: ",
  texto: (n, e) => `${n} Ø${campo("phiBarra").leer(e)}`,
});
const DIAMETRO_BARRA = palancaDiametro(campo("phiBarra"), "mayor", (e, d) => `${campo("nBarras").leer(e)} Ø${d}`, { rotulo: "Barras: " });
const HORMIGON = palancaValor(campo("fc"), {
  paso: 5,
  tope: (f) => Math.max(f, 50),
  decimales: 0,
  rotulo: "f'c = ",
  texto: (f) => `${f} MPa`,
  efectoColateral: "Hormigón de relleno de mayor resistencia.",
});

function palancasPorClave(clave: ClaveSeccionMixta): readonly Palanca<Campos>[] {
  if (clave === "asMin") return [BARRAS, DIAMETRO_BARRA];
  if (clave === "corte") return [ESPESOR_TUBO, DIAMETRO_TUBO];
  if (clave === "momento") return [ESPESOR_TUBO, DIAMETRO_TUBO, BARRAS];
  return [DIAMETRO_TUBO, ESPESOR_TUBO, HORMIGON, BARRAS];
}

/** Propuestas para cada comprobación de la columna mixta que no cumple o queda justa. */
export function recomendarSeccionMixta(campos: Campos): RecomendacionesSeccionMixta {
  return recomendarTodas({ datos: campos, calcular: resolverSeccionMixta, utilizaciones, nombres: NOMBRES }, palancasPorClave);
}
