import { resolverCapitel, type ResueltoCapitel } from "@/lib/calc/hormigon/losas/resolver-capitel";
import { recomendarTodas, type Palanca, type Recomendacion } from "./motor";
import { campo, m, palancaFck, palancaValor, type Campos } from "./palancas";

export type ClaveCapitel = "caraPilar" | "losa" | "capitel";
export type RecomendacionesCapitel = Partial<Record<ClaveCapitel, Recomendacion[]>>;

const NOMBRES: Record<ClaveCapitel, string> = {
  caraPilar: "biela en la cara del pilar",
  losa: "sección crítica en la losa",
  capitel: "sección crítica en el capitel",
};

function utilizaciones({ r }: ResueltoCapitel): Partial<Record<ClaveCapitel, number>> {
  const u: Partial<Record<ClaveCapitel, number>> = { caraPilar: r.caraPilar.aprovechamiento };
  for (const s of r.secciones) u[s.donde] = s.aprovechamiento;
  return u;
}

const vuelo = (clave: "lH1" | "lH2", rotulo: string) =>
  palancaValor(campo(clave), {
    paso: 0.05,
    tope: (v) => v + 1,
    decimales: 2,
    rotulo,
    texto: m,
    efectoColateral: "Capitel más ancho: el perímetro de la losa se aleja del pilar.",
  });
const CANTO_CAPITEL = palancaValor(campo("hH"), {
  paso: 0.05,
  tope: (v) => v + 0.6,
  decimales: 2,
  rotulo: "h_H = ",
  texto: m,
  efectoColateral: "Capitel más alto: sube d_H; si l_H queda por debajo de 2·h_H, pasa a capitel chico.",
});
const ESPESOR = palancaValor(campo("espesor"), {
  paso: 0.01,
  tope: (h) => h + 0.2,
  decimales: 2,
  rotulo: "losa h = ",
  texto: m,
  efectoColateral: "Más espesor en toda la losa.",
});
const FCK = palancaFck(campo("fck"));

function palancasPorClave(clave: ClaveCapitel): readonly Palanca<Campos>[] {
  switch (clave) {
    case "caraPilar":
      return [CANTO_CAPITEL, FCK];
    case "losa":
      return [vuelo("lH1", "l_H1 = "), vuelo("lH2", "l_H2 = "), ESPESOR, FCK];
    case "capitel":
      return [CANTO_CAPITEL, FCK];
  }
}

/** Propuestas para cada comprobación del capitel que no cumple o queda justa. */
export function recomendarCapitel(campos: Campos): RecomendacionesCapitel {
  return recomendarTodas({ datos: campos, calcular: resolverCapitel, utilizaciones, nombres: NOMBRES }, palancasPorClave);
}
