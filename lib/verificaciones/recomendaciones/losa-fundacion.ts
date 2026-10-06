import { resolverLosaFundacion, type ResueltoLosaFundacion } from "@/lib/calc/hormigon/losas/resolver-losa-fundacion";
import { recomendarTodas, type Palanca, type Recomendacion } from "./motor";
import { EFECTO_H, campo, m, palancaDiametro, palancaFck, palancaValor, type Campos } from "./palancas";

export type ClaveLosaFundacion = "inferior" | "superior" | "cortante" | "reparto";
export type RecomendacionesLosaFundacion = Partial<Record<ClaveLosaFundacion, Recomendacion[]>>;

const NOMBRES: Record<ClaveLosaFundacion, string> = {
  inferior: "armadura inferior",
  superior: "armadura superior",
  cortante: "cortante",
  reparto: "armadura de reparto",
};

/**
 * Sin la tensión del terreno: en una losa de fundación el ancho tributario lo
 * fija la separación entre pilares, no es un dato que se elija.
 */
const utilizaciones = ({ franja }: ResueltoLosaFundacion): Record<ClaveLosaFundacion, number> => ({
  inferior: franja.inferior.asNecCm2PorM / franja.inferior.asRealCm2PorM,
  superior: franja.superior.asNecCm2PorM / franja.superior.asRealCm2PorM,
  cortante: franja.cortante.vEdKN / franja.cortante.vRdCKN,
  reparto: franja.secundario.asNecCm2 / franja.secundario.asRealCm2,
});

const H = palancaValor(campo("H"), { paso: 0.05, tope: (h) => h + 1, decimales: 2, rotulo: "H = ", texto: m, efectoColateral: EFECTO_H });
const FCK = palancaFck(campo("fck"));

const textoMalla = (d: number, s: number) => `Ø${d} c/${s.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;

function malla(cara: "Inferior" | "Superior"): Palanca<Campos>[] {
  const rotulo = `${cara}: `;
  return [
    palancaValor(campo(`separacion${cara}`), {
      paso: -0.01,
      tope: () => 0.05,
      decimales: 2,
      rotulo,
      texto: (s, e) => textoMalla(campo(`diametro${cara}`).leer(e), s),
    }),
    palancaDiametro(campo(`diametro${cara}`), "mayor", (e, d) => textoMalla(d, campo(`separacion${cara}`).leer(e)), { rotulo }),
  ];
}

const REPARTO: Palanca<Campos>[] = [
  palancaValor(campo("numeroSecundario"), {
    paso: 1,
    tope: (n) => n + 20,
    decimales: 0,
    rotulo: "Reparto: ",
    texto: (n, e) => `${n} Ø${campo("diametroSecundario").leer(e)}`,
  }),
  palancaDiametro(campo("diametroSecundario"), "mayor", (e, d) => `${campo("numeroSecundario").leer(e)} Ø${d}`, {
    rotulo: "Reparto: ",
  }),
];

function palancasPorClave(clave: ClaveLosaFundacion): readonly Palanca<Campos>[] {
  if (clave === "inferior") return [...malla("Inferior"), H];
  if (clave === "superior") return [...malla("Superior"), H];
  if (clave === "cortante") return [H, FCK];
  return REPARTO;
}

/** Propuestas para cada comprobación de la franja de losa que no cumple o queda justa. */
export function recomendarLosaFundacion(campos: Campos): RecomendacionesLosaFundacion {
  return recomendarTodas({ datos: campos, calcular: resolverLosaFundacion, utilizaciones, nombres: NOMBRES }, palancasPorClave);
}
