import { resolverPilote, type ResueltoPilote } from "@/lib/calc/hormigon/cimentaciones/resolver-pilote";
import { recomendarTodas, type Palanca, type Recomendacion } from "./motor";
import { campo, m, palancaDiametro, palancaFck, palancaValor, type Campos } from "./palancas";

export type ClavePilote = "capacidad" | "fuste" | "asMin";
export type RecomendacionesPilote = Partial<Record<ClavePilote, Recomendacion[]>>;

const NOMBRES: Record<ClavePilote, string> = {
  capacidad: "capacidad geotécnica",
  fuste: "compresión del fuste",
  asMin: "armadura mínima",
};

const utilizaciones = ({ pilote, v }: ResueltoPilote): Record<ClavePilote, number> => ({
  capacidad: v.Nk / pilote.geotecnico.qAdmisibleKN,
  fuste: pilote.estructural.ndKN / pilote.estructural.nRdKN,
  asMin: pilote.estructural.asMinCm2 / pilote.estructural.areaAceroCm2,
});

const LONGITUD = palancaValor(campo("longitud"), {
  paso: 0.5,
  tope: (l) => l + 15,
  decimales: 1,
  rotulo: "L = ",
  texto: m,
  efectoColateral: "Más largo: más perforación; revisar que el estrato siga dando ese fuste.",
});
const DIAMETRO = palancaValor(campo("diametro"), {
  paso: 0.05,
  tope: (d) => d + 0.6,
  decimales: 2,
  rotulo: "Ø pilote = ",
  texto: m,
  efectoColateral: "Más diámetro: más hormigón y crece la armadura mínima.",
});
const BARRAS = palancaValor(campo("numero"), {
  paso: 1,
  tope: (n) => n + 12,
  decimales: 0,
  rotulo: "Armadura: ",
  texto: (n, e) => `${n} Ø${campo("diametroBarra").leer(e)}`,
});
const DIAMETRO_BARRA = palancaDiametro(campo("diametroBarra"), "mayor", (e, d) => `${campo("numero").leer(e)} Ø${d}`, {
  rotulo: "Armadura: ",
});

function palancasPorClave(clave: ClavePilote): readonly Palanca<Campos>[] {
  if (clave === "capacidad") return [LONGITUD, DIAMETRO];
  if (clave === "fuste") return [DIAMETRO, palancaFck(campo("fck")), BARRAS];
  return [BARRAS, DIAMETRO_BARRA];
}

/** Propuestas para cada comprobación del pilote que no cumple o queda justa. */
export function recomendarPilote(campos: Campos): RecomendacionesPilote {
  return recomendarTodas({ datos: campos, calcular: resolverPilote, utilizaciones, nombres: NOMBRES }, palancasPorClave);
}
