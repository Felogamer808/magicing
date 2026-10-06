import { resolverDeformaciones, type ResueltoDeformaciones } from "@/lib/calc/hormigon/resolver-deformaciones";
import { recomendarTodas, type Palanca, type Recomendacion } from "./motor";
import { campo, m, palancaFck, palancaValor, type Campos } from "./palancas";

export type ClaveDeformaciones = "apariencia" | "danio" | "luzCanto";
export type RecomendacionesDeformaciones = Partial<Record<ClaveDeformaciones, Recomendacion[]>>;

const NOMBRES: Record<ClaveDeformaciones, string> = {
  apariencia: "flecha total",
  danio: "flecha diferida",
  luzCanto: "relación luz/canto",
};

const utilizaciones = ({ flecha, luzCanto }: ResueltoDeformaciones): Record<ClaveDeformaciones, number> => ({
  apariencia: flecha.flechaTotalMm / flecha.limiteAparienciaMm,
  danio: flecha.flechaDiferidaMm / flecha.limiteDanioMm,
  luzCanto: luzCanto.ldReal / luzCanto.ldAdm,
});

/** Más canto: h y d suben juntos, que es como cambia en obra. */
const CANTO: Palanca<Campos> = {
  efectoColateral: "Más canto: más peso propio, que sube el momento cuasipermanente.",
  *candidatos(e) {
    const h0 = campo("h").leer(e);
    const d0 = campo("d").leer(e);
    for (let i = 1; i <= 16; i++) {
      const h = Math.round((h0 + 0.05 * i) * 100) / 100;
      const d = Math.round((d0 + 0.05 * i) * 1000) / 1000;
      yield { datos: { ...e, h: String(h), d: String(d) }, accion: `h = ${m(h)} y d = ${m(d)} (hoy ${m(h0)} y ${m(d0)})` };
    }
  },
};

const textoBarras = (n: number, e: Campos, phi: string) => `${n} Ø${campo(phi).leer(e)}`;

const TRACCION = palancaValor(campo("numeroAs"), {
  paso: 1,
  tope: (n) => n + 10,
  decimales: 0,
  rotulo: "Armadura traccionada: ",
  texto: (n, e) => textoBarras(n, e, "phiAs"),
  efectoColateral: "Más acero que el que pide la resistencia: sube la inercia fisurada.",
});

/** Armadura comprimida: frena la fluencia y la retracción, que hacen la flecha diferida. */
const COMPRIMIDA = palancaValor(campo("numeroAsComp"), {
  paso: 1,
  tope: (n) => n + 8,
  decimales: 0,
  rotulo: "Armadura comprimida: ",
  texto: (n, e) => textoBarras(n, e, "phiAsComp"),
  efectoColateral: "Barras en la cara comprimida, ancladas y con estribos que las abracen.",
});

const FCK = palancaFck(campo("fck"));

function palancasPorClave(clave: ClaveDeformaciones): readonly Palanca<Campos>[] {
  if (clave === "luzCanto") return [CANTO, TRACCION, FCK];
  if (clave === "danio") return [COMPRIMIDA, CANTO, TRACCION];
  return [CANTO, TRACCION, COMPRIMIDA, FCK];
}

/** Propuestas para las flechas y la relación luz/canto, si no cumplen o quedan justas. */
export function recomendarDeformaciones(campos: Campos): RecomendacionesDeformaciones {
  return recomendarTodas({ datos: campos, calcular: resolverDeformaciones, utilizaciones, nombres: NOMBRES }, palancasPorClave);
}
