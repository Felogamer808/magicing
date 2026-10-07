import { resolverLosaFundacion, type ResueltoLosaFundacion } from "@/lib/calc/hormigon/losas/resolver-losa-fundacion";
import { recomendarTodas, type Palanca, type Recomendacion } from "./motor";
import { EFECTO_H, campo, m, palancaDiametro, palancaFck, palancaValor, type Campos } from "./palancas";

export type ClaveLosaFundacion = "inferior" | "superior" | "cortante" | `punzonamiento${1 | 2 | 3}`;
export type RecomendacionesLosaFundacion = Partial<Record<ClaveLosaFundacion, Recomendacion[]>>;

const NOMBRES: Record<ClaveLosaFundacion, string> = {
  inferior: "armadura inferior",
  superior: "armadura superior",
  cortante: "cortante",
  punzonamiento1: "punzonamiento P1",
  punzonamiento2: "punzonamiento P2",
  punzonamiento3: "punzonamiento P3",
};

/**
 * Sin la tensión del terreno: en una losa de fundación el ancho tributario lo
 * fija la separación entre pilares, no es un dato que se elija.
 */
const utilizaciones = ({ franja }: ResueltoLosaFundacion): Record<ClaveLosaFundacion, number> => {
  const punz = (i: number) => {
    const p = franja.punzonamiento[i];
    return p.motivoNoEvaluado ? 0 : p.vEdKN / p.vRdCKN;
  };
  return {
    inferior: franja.inferior.flexion.aprovechamiento,
    superior: franja.superior.necesaria ? franja.superior.flexion.aprovechamiento : 0,
    cortante: franja.cortante.vEdKN / franja.cortante.vRdCKN,
    punzonamiento1: punz(0),
    punzonamiento2: punz(1),
    punzonamiento3: punz(2),
  };
};

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


function palancasPorClave(clave: ClaveLosaFundacion): readonly Palanca<Campos>[] {
  if (clave === "inferior") return [...malla("Inferior"), H];
  if (clave === "superior") return [...malla("Superior"), H];
  // Cortante y punzonamiento: canto y hormigón; más armadura inferior sube el ρl.
  return [H, FCK, ...malla("Inferior")];
}

/** Propuestas para cada comprobación de la franja de losa que no cumple o queda justa. */
export function recomendarLosaFundacion(campos: Campos): RecomendacionesLosaFundacion {
  return recomendarTodas({ datos: campos, calcular: resolverLosaFundacion, utilizaciones, nombres: NOMBRES }, palancasPorClave);
}
