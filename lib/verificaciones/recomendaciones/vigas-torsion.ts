import { resolverVigaTorsion, type ResueltoVigaTorsion } from "@/lib/calc/hormigon/vigas/resolver-torsion";
import { recomendarTodas, siNo, type Palanca, type Recomendacion } from "./motor";
import type { Campos } from "./palancas";
import { ANCHO, CANTO, ESPESOR_ALA, FCK, RAMAS, diametroMayor, masBarras, masBarrasFinas } from "./vigas-flexion-cortante";

export type ClaveTorsion =
  | "bielasTorsion"
  | "interaccion"
  | "positiva"
  | "negativa"
  | "bielas"
  | "anchoInferior"
  | "anchoSuperior"
  | "ramas"
  | "bielasVuelo";
export type RecomendacionesTorsion = Partial<Record<ClaveTorsion, Recomendacion[]>>;

const NOMBRES: Record<ClaveTorsion, string> = {
  bielasTorsion: "bielas de torsión",
  interaccion: "interacción torsión + cortante",
  positiva: "flexión positiva",
  negativa: "flexión negativa",
  bielas: "compresión oblicua del alma",
  anchoInferior: "armadura inferior en el ancho",
  anchoSuperior: "armadura superior en el ancho",
  ramas: "separación transversal entre ramas",
  bielasVuelo: "bielas de torsión del vuelo",
};

const utilizaciones = (r: ResueltoVigaTorsion): Partial<Record<ClaveTorsion, number>> => ({
  // Con sección en T el alma toma sólo su parte del torsor.
  bielasTorsion: (r.seccionT?.tdAlma ?? r.v.td) / r.torsion.tRdMaxKNm,
  interaccion: r.interaccionBielas,
  positiva: r.flexionPositiva.asNecCm2 / r.flexionPositiva.asRealCm2,
  negativa: r.flexionNegativa.asNecCm2 / r.flexionNegativa.asRealCm2,
  bielas: r.v.vd / r.cortante.vRdMax,
  anchoInferior: siNo(r.flexionPositiva.verificaEntraEnAncho),
  anchoSuperior: siNo(r.flexionNegativa.verificaEntraEnAncho),
  ramas: r.cortante.separacionTransversalM / r.cortante.separacionTransversalMaxM,
  ...(r.seccionT?.vuelo?.modelable
    ? { bielasVuelo: r.seccionT.vuelo.tdKNm / r.seccionT.vuelo.torsion.tRdMaxKNm }
    : {}),
});

function palancasPorClave(clave: ClaveTorsion): readonly Palanca<Campos>[] {
  switch (clave) {
    case "bielasTorsion":
    case "interaccion":
    case "bielas":
      // TRd,max y VRd,max crecen con la sección y con fcd.
      return [ANCHO, CANTO, FCK];
    case "positiva":
      return [masBarras("Pos"), diametroMayor("Pos"), CANTO, FCK];
    case "negativa":
      return [masBarras("Neg"), diametroMayor("Neg"), CANTO, FCK];
    case "anchoInferior":
      return [masBarrasFinas("Pos"), ANCHO];
    case "anchoSuperior":
      return [masBarrasFinas("Neg"), ANCHO];
    case "ramas":
      return [RAMAS];
    case "bielasVuelo":
      return [ESPESOR_ALA, FCK];
  }
}

/** Propuestas para cada comprobación de la viga con torsión que no cumple o queda justa. */
export function recomendarVigaTorsion(campos: Campos): RecomendacionesTorsion {
  return recomendarTodas(
    {
      datos: campos,
      calcular: resolverVigaTorsion,
      utilizaciones,
      nombres: NOMBRES,
      binarias: ["anchoInferior", "anchoSuperior"],
    },
    palancasPorClave
  );
}
