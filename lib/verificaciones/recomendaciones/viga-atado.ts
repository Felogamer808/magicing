import { resolverVigaAtado, type ResueltoVigaAtado } from "@/lib/calc/hormigon/cimentaciones/resolver-viga-atado";
import { recomendarTodas, siNo, type Palanca, type Recomendacion } from "./motor";
import { campo, m, palancaDiametro, palancaFck, palancaValor, type Campos } from "./palancas";

export type ClaveVigaAtado = "traccion" | "compresion" | "minima" | "diametro" | "bielas";
export type RecomendacionesVigaAtado = Partial<Record<ClaveVigaAtado, Recomendacion[]>>;

const NOMBRES: Record<ClaveVigaAtado, string> = {
  traccion: "tracción",
  compresion: "compresión",
  minima: "armadura mínima",
  diametro: "diámetro mínimo",
  bielas: "bielas del alma",
};

const utilizaciones = ({ r }: ResueltoVigaAtado): Record<ClaveVigaAtado, number> => ({
  traccion: r.traccionCaraKN / r.capacidadCaraKN,
  compresion: r.utilizacionCompresion,
  minima: r.asMinCaraCm2 / r.asCaraCm2,
  diametro: siNo(r.verificaDiametro),
  bielas: r.cortanteKN / r.cortante.vRdMax,
});

const POR_CARA = (n: number, e: Campos) => `${n} Ø${campo("diametroCara").leer(e)}`;
const MAS_BARRAS = palancaValor(campo("numeroCara"), {
  paso: 1, tope: (n) => n + 8, decimales: 0, rotulo: "Por cara: ", texto: POR_CARA,
});
const DIAMETRO_MAYOR = palancaDiametro(
  campo("diametroCara"),
  "mayor",
  (e, d) => `${campo("numeroCara").leer(e)} Ø${d}`,
  { rotulo: "Por cara: " }
);
const CANTO = palancaValor(campo("h"), {
  paso: 0.05, tope: (x) => x + 0.5, decimales: 2, rotulo: "h = ", texto: m,
  efectoColateral: "Más sección: crece la armadura mínima.",
});
const ANCHO = palancaValor(campo("b"), {
  paso: 0.05, tope: (x) => x + 0.5, decimales: 2, rotulo: "b = ", texto: m,
  efectoColateral: "Más sección: crece la armadura mínima.",
});
const FCK = palancaFck(campo("fck"));

function palancasPorClave(clave: ClaveVigaAtado): readonly Palanca<Campos>[] {
  switch (clave) {
    case "traccion":
      return [MAS_BARRAS, DIAMETRO_MAYOR, CANTO];
    case "compresion":
      return [ANCHO, CANTO, FCK, MAS_BARRAS];
    case "minima":
      return [MAS_BARRAS, DIAMETRO_MAYOR];
    case "diametro":
      return [DIAMETRO_MAYOR];
    case "bielas":
      return [ANCHO, CANTO, FCK];
  }
}

/** Propuestas para cada comprobación de la viga de atado que no cumple o queda justa. */
export function recomendarVigaAtado(campos: Campos): RecomendacionesVigaAtado {
  return recomendarTodas(
    { datos: campos, calcular: resolverVigaAtado, utilizaciones, nombres: NOMBRES, binarias: ["diametro"] },
    palancasPorClave
  );
}
