import { resolverPilar, type ResueltoPilar } from "@/lib/calc/hormigon/pilares/resolver-pilar";
import { recomendarTodas, siNo, type Palanca, type Recomendacion } from "./motor";
import { campo, m, palancaDiametro, palancaFck, palancaValor, type Campos, type Dato } from "./palancas";

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
  | "sujecion"
  | "separacionBarrasH"
  | "separacionBarrasB";
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
  separacionBarrasH: "separación entre barras de las caras b",
  separacionBarrasB: "separación entre barras de las caras h",
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
  separacionBarrasH: r.armado.separacionBarras.h.exigidaM / r.armado.separacionBarras.h.libreM,
  separacionBarrasB: r.armado.separacionBarras.b.exigidaM / r.armado.separacionBarras.b.libreM,
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

/** Ø de una fila: sin el campo, el de las esquinas, como lo lee el resolver. */
const diametroFila = (e: Campos, nombre: "phiCaraB" | "phiCaraH") =>
  e[nombre] === undefined ? campo("phi").leer(e) : campo(nombre).leer(e);

/** "4Ø20 + 4Ø16": las barras agrupadas por Ø, de mayor a menor. */
const textoArmado = (e: Campos) => {
  const nB = campo("nCaraB").leer(e);
  const nH = campo("nCaraH").leer(e);
  const cuenta = new Map<number, number>();
  const sumar = (d: number, n: number) => n > 0 && cuenta.set(d, (cuenta.get(d) ?? 0) + n);
  sumar(campo("phi").leer(e), 4);
  sumar(diametroFila(e, "phiCaraB"), 2 * (nB - 2));
  sumar(diametroFila(e, "phiCaraH"), 2 * (nH - 2));
  return [...cuenta].sort(([a], [b]) => b - a).map(([d, n]) => `${n}Ø${d}`).join(" + ");
};

/** Todas las barras a un mismo Ø, partiendo del de las esquinas. */
const TODAS: Dato<Campos> = {
  leer: (e) => campo("phi").leer(e),
  escribir: (e, d) => ({ ...e, phi: String(d), phiCaraB: String(d), phiCaraH: String(d) }),
};
/** El armado con el Ø cambiado; con el de hoy, el armado tal como está. */
const conDiametro = (dato: Dato<Campos>) => (e: Campos, d: number) =>
  textoArmado(d === dato.leer(e) ? e : dato.escribir(e, d));

const DIAMETRO = palancaDiametro(TODAS, "mayor", conDiametro(TODAS));

/** Sólo la fila de un par de caras; la otra queda como estaba. */
const fila = (nombre: "phiCaraB" | "phiCaraH"): Dato<Campos> => ({
  leer: (e) => diametroFila(e, nombre),
  escribir: (e, d) => ({
    ...e,
    phiCaraB: String(diametroFila(e, "phiCaraB")),
    phiCaraH: String(diametroFila(e, "phiCaraH")),
    [nombre]: String(d),
  }),
});
const DIAMETRO_FILA_B = palancaDiametro(fila("phiCaraB"), "mayor", conDiametro(fila("phiCaraB")));
const DIAMETRO_FILA_H = palancaDiametro(fila("phiCaraH"), "mayor", conDiametro(fila("phiCaraH")));

const barras = (nombre: "nCaraB" | "nCaraH") =>
  palancaValor(campo(nombre), {
    paso: 1,
    tope: (n) => n + 4,
    decimales: 0,
    rotulo: nombre === "nCaraB" ? "Por cara b: " : "Por cara h: ",
    texto: (n) => `${n} barras`,
  });

const menosBarras = (nombre: "nCaraB" | "nCaraH") =>
  palancaValor(campo(nombre), {
    paso: -1,
    tope: () => 2,
    decimales: 0,
    rotulo: nombre === "nCaraB" ? "Por cara b: " : "Por cara h: ",
    texto: (n) => `${n} barras`,
  });

const SEPARACION = palancaValor(campo("sepCercos"), {
  paso: -0.05,
  tope: () => 0.05,
  decimales: 3,
  rotulo: "Cercos c/",
  texto: m,
});

const SEPARACION_NUDO = palancaValor(campo("sepCercosNudo"), {
  paso: -0.05,
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
      return [DIAMETRO, barras("nCaraB"), DIAMETRO_FILA_B, lado("h"), palancaFck(campo("fck"))];
    case "flexionB":
      return [DIAMETRO, barras("nCaraH"), DIAMETRO_FILA_H, lado("b"), palancaFck(campo("fck"))];
    case "esviada":
      return [DIAMETRO, barras("nCaraB"), barras("nCaraH"), lado("h"), lado("b")];
    case "cortanteH":
      return [SEPARACION, ramas("ramasH"), DIAMETRO_CERCO, lado("h")];
    case "cortanteB":
      return [SEPARACION, ramas("ramasB"), DIAMETRO_CERCO, lado("b")];
    case "minimaH":
      return [DIAMETRO, barras("nCaraB"), DIAMETRO_FILA_B];
    case "minimaB":
      return [DIAMETRO, barras("nCaraH"), DIAMETRO_FILA_H];
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
    case "separacionBarrasH":
      return [menosBarras("nCaraB"), lado("b")];
    case "separacionBarrasB":
      return [menosBarras("nCaraH"), lado("h")];
  }
}

/** Propuestas para cada comprobación del pilar que no cumple o queda justa. */
export function recomendarPilar(campos: Campos): RecomendacionesPilar {
  return recomendarTodas(
    { datos: campos, calcular: resolverPilar, utilizaciones, nombres: NOMBRES, binarias: BINARIAS },
    palancasPorClave
  );
}
