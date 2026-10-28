import { resolverPilar, type ResueltoPilar } from "@/lib/calc/hormigon/pilares/resolver-pilar";
import { recomendarTodas, siNo, type Palanca, type Recomendacion } from "./motor";
import { campo, m, palancaDiametro, palancaFck, palancaValor, type Campos } from "./palancas";

export type ClavePilar =
  | "axil"
  | "flexionH"
  | "flexionB"
  | "esviada"
  | "cortanteH"
  | "cortanteB"
  | "minimaH"
  | "minimaB"
  | "maxima"
  | "diametro"
  | "diametroCerco"
  | "separacion"
  | "separacionNudo"
  | "sujecion";
export type RecomendacionesPilar = Partial<Record<ClavePilar, Recomendacion[]>>;

const NOMBRES: Record<ClavePilar, string> = {
  axil: "compresión centrada",
  flexionH: "flexocompresión en la dirección h",
  flexionB: "flexocompresión en la dirección b",
  esviada: "flexión esviada",
  cortanteH: "cortante en la dirección h",
  cortanteB: "cortante en la dirección b",
  minimaH: "armadura mínima de las caras b",
  minimaB: "armadura mínima de las caras h",
  maxima: "armadura máxima",
  diametro: "diámetro mínimo de las barras",
  diametroCerco: "diámetro del cerco",
  separacion: "separación de los cercos",
  separacionNudo: "separación de los cercos junto a nudos y solapes",
  sujecion: "barras sujetas por los cercos",
};

const BINARIAS: readonly ClavePilar[] = ["diametro", "diametroCerco", "sujecion"];

/** Utilización del cortante: la de VRd,c si no hacen falta cercos; si no, la peor entre VRd,s y VRd,max. */
const usoCortante = (c: ResueltoPilar["r"]["cortante"]["h"]) =>
  c.requiereCercos ? Math.max(c.vEdKN / c.vRdSKN, c.vEdKN / c.vRdMaxKN) : c.vEdKN / c.vRdCKN;

const utilizaciones = ({ r, v }: ResueltoPilar): Record<ClavePilar, number> => ({
  axil: v.nEd / r.nRdMaxKN,
  flexionH: r.flexion.h.mEdKNm / r.flexion.h.mRdKNm,
  flexionB: r.flexion.b.mEdKNm / r.flexion.b.mRdKNm,
  esviada: r.esviada.cumple538 ? 0 : r.esviada.valor,
  cortanteH: usoCortante(r.cortante.h),
  cortanteB: usoCortante(r.cortante.b),
  minimaH: r.armado.asMinimaCaraCm2 / r.armado.asCara.h,
  minimaB: r.armado.asMinimaCaraCm2 / r.armado.asCara.b,
  maxima: r.asTotalCm2 / r.armado.asMaximaCm2,
  diametro: siNo(r.armado.verificaDiametro),
  diametroCerco: siNo(r.armado.verificaDiametroCerco),
  separacion: v.sepCercos / r.armado.separacionMaximaM,
  separacionNudo: v.sepCercosNudo / r.armado.separacionZonaNudoM,
  sujecion: siNo(r.armado.verificaSujecion),
});

const EFECTO_SECCION = "Cambia la sección del pilar: las vigas y la fundación que llegan también.";

const lado = (nombre: "b" | "h") =>
  palancaValor(campo(nombre), {
    paso: 0.05,
    tope: (x) => x + 0.5,
    decimales: 2,
    rotulo: `${nombre} = `,
    texto: m,
    efectoColateral: EFECTO_SECCION,
  });

const textoArmado = (e: Campos, d = campo("phi").leer(e)) => {
  const nB = campo("nCaraB").leer(e);
  const nH = campo("nCaraH").leer(e);
  return `${2 * nB + 2 * nH - 4}Ø${d}`;
};

const DIAMETRO = palancaDiametro(campo("phi"), "mayor", (e, d) => textoArmado(e, d));

const barras = (nombre: "nCaraB" | "nCaraH") =>
  palancaValor(campo(nombre), {
    paso: 1,
    tope: (n) => n + 4,
    decimales: 0,
    rotulo: nombre === "nCaraB" ? "Por cara b: " : "Por cara h: ",
    texto: (n) => `${n} barras`,
  });

const SEPARACION = palancaValor(campo("sepCercos"), {
  paso: -0.025,
  tope: () => 0.05,
  decimales: 3,
  rotulo: "Cercos c/",
  texto: m,
});

const SEPARACION_NUDO = palancaValor(campo("sepCercosNudo"), {
  paso: -0.025,
  tope: () => 0.05,
  decimales: 3,
  rotulo: "Junto a nudos c/",
  texto: m,
});

const DIAMETRO_CERCO = palancaDiametro(campo("phiCerco"), "mayor", (_e, d) => `cerco Ø${d}`);

const ramas = (nombre: "ramasH" | "ramasB") =>
  palancaValor(campo(nombre), {
    paso: 1,
    tope: (n) => n + 3,
    decimales: 0,
    rotulo: nombre === "ramasH" ? "Ramas // h: " : "Ramas // b: ",
    texto: (n) => `${n}`,
  });

function palancasPorClave(clave: ClavePilar): readonly Palanca<Campos>[] {
  switch (clave) {
    case "axil":
      return [lado("b"), lado("h"), palancaFck(campo("fck")), DIAMETRO];
    case "flexionH":
      return [DIAMETRO, barras("nCaraB"), lado("h"), palancaFck(campo("fck"))];
    case "flexionB":
      return [DIAMETRO, barras("nCaraH"), lado("b"), palancaFck(campo("fck"))];
    case "esviada":
      return [DIAMETRO, barras("nCaraB"), barras("nCaraH"), lado("h"), lado("b")];
    case "cortanteH":
      return [SEPARACION, ramas("ramasH"), DIAMETRO_CERCO, lado("h")];
    case "cortanteB":
      return [SEPARACION, ramas("ramasB"), DIAMETRO_CERCO, lado("b")];
    case "minimaH":
      return [DIAMETRO, barras("nCaraB")];
    case "minimaB":
      return [DIAMETRO, barras("nCaraH")];
    case "maxima":
      return [lado("b"), lado("h")];
    case "diametro":
      return [DIAMETRO];
    case "diametroCerco":
      return [DIAMETRO_CERCO];
    case "separacion":
      return [SEPARACION];
    case "separacionNudo":
      return [SEPARACION_NUDO];
    case "sujecion":
      return [ramas("ramasH"), ramas("ramasB")];
  }
}

/** Propuestas para cada comprobación del pilar que no cumple o queda justa. */
export function recomendarPilar(campos: Campos): RecomendacionesPilar {
  return recomendarTodas(
    { datos: campos, calcular: resolverPilar, utilizaciones, nombres: NOMBRES, binarias: BINARIAS },
    palancasPorClave
  );
}
