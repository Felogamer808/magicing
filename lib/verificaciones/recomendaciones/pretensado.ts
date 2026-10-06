import { resolverPretensado, type ResueltoPretensado } from "@/lib/calc/hormigon/resolver-pretensado";
import { recomendarTodas, type Palanca, type Recomendacion } from "./motor";
import { campo, palancaValor, type Campos } from "./palancas";

/**
 * Recomendaciones del pretensado (ACI 318). La sección se carga por sus
 * propiedades —h, área, inercia, baricentro— que van juntas: mover una sola
 * daría una sección que no existe. Por eso las palancas son los torones, la
 * armadura pasiva y el hormigón, no la geometría.
 */

export type ClavePretensado = "flexion" | "flechas" | "areaPretensado" | "cuantiaMinima";
export type RecomendacionesPretensado = Partial<Record<ClavePretensado, Recomendacion[]>>;

const NOMBRES: Record<ClavePretensado, string> = {
  flexion: "flexión última",
  flechas: "flechas",
  areaPretensado: "área de pretensado",
  cuantiaMinima: "cuantía mínima",
};

const utilizaciones = (r: ResueltoPretensado): Record<ClavePretensado, number> => ({
  flexion: r.cargas.momentoUltimoKNm / r.flexion.momentoAdmisibleKNm,
  flechas: r.deformaciones.totalMm / r.deformaciones.limiteTotalMm,
  areaPretensado: r.armaduraActiva.apMinimoMm2 / r.armaduraActiva.apRealMm2,
  cuantiaMinima: (1.2 * r.cuantiaMinima.mcrKNm) / r.flexion.momentoAdmisibleKNm,
});

const TORONES = palancaValor(campo("torones"), {
  paso: 1,
  tope: (n) => n + 12,
  decimales: 0,
  rotulo: "Torones: ",
  texto: String,
  efectoColateral: "Más pretensado: revisar las tensiones en el tesado.",
});
const PASIVA = palancaValor(campo("nPas"), {
  paso: 1,
  tope: (n) => n + 8,
  decimales: 0,
  rotulo: "Barras pasivas: ",
  texto: (n, e) => `${n} Ø${campo("diamPas").leer(e)}`,
});
const HORMIGON: Palanca<Campos> = {
  efectoColateral: "Hormigón premoldeado de mayor resistencia.",
  *candidatos(e) {
    const hoy = campo("fc").leer(e);
    for (const fc of [35, 40, 45, 50, 55, 60].filter((x) => x > hoy)) {
      yield { datos: { ...e, fc: String(fc) }, accion: `f'c = ${fc} MPa (hoy ${hoy})` };
    }
  },
};

function palancasPorClave(clave: ClavePretensado): readonly Palanca<Campos>[] {
  if (clave === "flexion") return [TORONES, PASIVA, HORMIGON];
  if (clave === "cuantiaMinima") return [PASIVA, TORONES];
  return [TORONES];
}

/** Propuestas para las comprobaciones del pretensado que no cumplen o quedan justas. */
export function recomendarPretensado(campos: Campos): RecomendacionesPretensado {
  return recomendarTodas({ datos: campos, calcular: resolverPretensado, utilizaciones, nombres: NOMBRES }, palancasPorClave);
}
