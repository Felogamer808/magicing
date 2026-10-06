import { resolverMuro, type ResueltoMuro } from "@/lib/calc/hormigon/muros/resolver-muro";
import { recomendarTodas, type Palanca, type Recomendacion } from "./motor";
import { campo, m, palancaDiametro, palancaFck, palancaValor, type Campos } from "./palancas";

export type ClaveMuro = "resistencia" | "verticalMin" | "verticalMax" | "horizontalMin" | "sepV" | "sepH";
export type RecomendacionesMuro = Partial<Record<ClaveMuro, Recomendacion[]>>;

const NOMBRES: Record<ClaveMuro, string> = {
  resistencia: "resistencia a flexocompresión",
  verticalMin: "cuantía vertical mínima",
  verticalMax: "cuantía vertical máxima",
  horizontalMin: "cuantía horizontal mínima",
  sepV: "separación vertical",
  sepH: "separación horizontal",
};

/** Separación horizontal máxima del art. 9.6.3 (2), la misma que muestra la página. */
const SEP_H_MAX_MM = 400;

const utilizaciones = ({ r, n }: ResueltoMuro): Record<ClaveMuro, number> => ({
  resistencia: r.momentos.mEdKNm / r.resistencia.mRdKNm,
  verticalMin: r.armado.asVerticalMinimaCm2 / r.armado.asVerticalCm2,
  verticalMax: r.armado.asVerticalCm2 / r.armado.asVerticalMaximaCm2,
  horizontalMin: r.armado.asHorizontalMinimaCm2 / r.armado.asHorizontalCm2,
  sepV: n.sepV / r.armado.separacionVerticalMaximaMm,
  sepH: n.sepH / SEP_H_MAX_MM,
});

const textoMalla = (d: number, s: number) => `Ø${d} c/${s} mm`;

const separacion = (lado: "V" | "H", sentido: 1 | -1) =>
  palancaValor(campo(`sep${lado}`), {
    paso: 10 * sentido,
    tope: (s) => (sentido > 0 ? s + 300 : 50),
    decimales: 0,
    rotulo: lado === "V" ? "Vertical: " : "Horizontal: ",
    texto: (s, e) => textoMalla(campo(`phi${lado}`).leer(e), s),
  });

const diametro = (lado: "V" | "H", sentido: "mayor" | "menor") =>
  palancaDiametro(campo(`phi${lado}`), sentido, (e, d) => textoMalla(d, campo(`sep${lado}`).leer(e)), {
    rotulo: lado === "V" ? "Vertical: " : "Horizontal: ",
  });

const ESPESOR = palancaValor(campo("espesor"), {
  paso: 0.05,
  tope: (h) => h + 0.5,
  decimales: 2,
  rotulo: "h = ",
  texto: m,
  efectoColateral: "Más espesor: más peso y sube la cuantía mínima.",
});

function palancasPorClave(clave: ClaveMuro): readonly Palanca<Campos>[] {
  switch (clave) {
    case "resistencia":
      return [ESPESOR, separacion("V", -1), diametro("V", "mayor"), palancaFck(campo("fck"))];
    case "verticalMin":
      return [separacion("V", -1), diametro("V", "mayor")];
    case "verticalMax":
      return [separacion("V", 1), diametro("V", "menor"), ESPESOR];
    case "horizontalMin":
      return [separacion("H", -1), diametro("H", "mayor")];
    case "sepV":
      return [separacion("V", -1)];
    case "sepH":
      return [separacion("H", -1)];
  }
}

/** Propuestas para cada comprobación del muro que no cumple o queda justa. */
export function recomendarMuro(campos: Campos): RecomendacionesMuro {
  return recomendarTodas({ datos: campos, calcular: resolverMuro, utilizaciones, nombres: NOMBRES }, palancasPorClave);
}
