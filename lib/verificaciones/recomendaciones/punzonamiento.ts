import { resolverPunzonamiento, type ResueltoPunzonamiento } from "@/lib/calc/hormigon/losas/resolver-punzonamiento";
import { recomendarTodas, siNo, type Palanca, type Recomendacion } from "./motor";
import { campo, m, palancaDiametro, palancaFck, palancaValor, type Campos } from "./palancas";

export type ClavePunzonamiento =
  | "caraPilar"
  | "critico"
  | "fueraDeAlcance"
  | "armadura"
  | "uOut"
  | "perimetros"
  | "sr"
  | "st"
  | "primerPerimetro"
  | "aswMin";
export type RecomendacionesPunzonamiento = Partial<Record<ClavePunzonamiento, Recomendacion[]>>;

const NOMBRES: Record<ClavePunzonamiento, string> = {
  caraPilar: "biela en la cara del pilar",
  critico: "perímetro crítico sin armadura",
  fueraDeAlcance: "techo de la armadura de punzonamiento",
  armadura: "armadura de punzonamiento",
  uOut: "alcance hasta uout",
  perimetros: "número de perímetros",
  sr: "separación radial",
  st: "separación tangencial",
  primerPerimetro: "distancia al 1.er perímetro",
  aswMin: "Asw,min por rama",
};

function utilizaciones({ r, n }: ResueltoPunzonamiento): Partial<Record<ClavePunzonamiento, number>> {
  const u: Partial<Record<ClavePunzonamiento, number>> = {
    caraPilar: r.caraPilar.vEdMPa / r.caraPilar.vRdMaxMPa,
    critico: r.critico.vEdMPa / r.critico.vRdCMPa,
  };
  const a = r.armadura;
  if (a) {
    if (a.fueraDeAlcance) u.fueraDeAlcance = siNo(false);
    else u.armadura = r.critico.vEdMPa / a.vRdCsMPa;
  }
  const d = r.detallado;
  if (a && d) {
    u.uOut = a.distUltimoPerimetroExigidaM / a.distUltimoPerimetroRealM;
    u.perimetros = 2 / n.nPerimetros;
    u.sr = n.sr / d.srMaxM;
    u.st = n.st / d.stMaxM;
    u.primerPerimetro = n.distPrimer / d.distPrimerPerimetroMaxM;
    u.aswMin = d.aswMinRamaMm2 / d.aswRamaMm2;
  }
  return u;
}

// ── Palancas ────────────────────────────────────────────────────────────────

const ESPESOR = palancaValor(campo("espesor"), {
  paso: 0.01,
  tope: (h) => h + 0.3,
  decimales: 2,
  rotulo: "h = ",
  texto: m,
  efectoColateral: "Más espesor en toda la losa, o un ábaco solo alrededor del pilar.",
});
const FCK = palancaFck(campo("fck"));

const lado = (c: "c1" | "c2") =>
  palancaValor(campo(c), {
    paso: 0.05,
    tope: (v) => v + 0.5,
    decimales: 2,
    rotulo: `${c} = `,
    texto: m,
    efectoColateral: "Cambia la sección del pilar: hay que revisarlo también.",
  });

/** Negativos más juntos en las dos direcciones: sube ρl y con ella vRd,c. */
const NEGATIVOS: Palanca<Campos> = {
  efectoColateral: "Más negativos en la banda de 3d a cada lado del pilar.",
  cita: "Anejo 19, art. 6.4.4 (1), ec. (6.47), pág. 94",
  *candidatos(e) {
    const sy = campo("sNegY").leer(e);
    const sz = campo("sNegZ").leer(e);
    const fy = campo("phiNegY").leer(e);
    const fz = campo("phiNegZ").leer(e);
    for (let k = 1; k <= 10; k++) {
      const nsy = Math.round((sy - 0.01 * k) * 100) / 100;
      const nsz = Math.round((sz - 0.01 * k) * 100) / 100;
      if (nsy < 0.05 || nsz < 0.05) return;
      yield {
        datos: { ...e, sNegY: String(nsy), sNegZ: String(nsz) },
        accion: `Negativos Ø${fy} c/${nsy.toLocaleString("es-AR", { minimumFractionDigits: 2 })} y Ø${fz} c/${nsz.toLocaleString("es-AR", { minimumFractionDigits: 2 })} (hoy c/${sy.toLocaleString("es-AR", { minimumFractionDigits: 2 })} y c/${sz.toLocaleString("es-AR", { minimumFractionDigits: 2 })})`,
      };
    }
  },
};

const RAMAS = palancaValor(campo("ramas"), {
  paso: 1,
  tope: (n) => n + 24,
  decimales: 0,
  rotulo: "Ramas por perímetro: ",
  texto: (n) => String(n),
  efectoColateral: "Baja la separación tangencial.",
});
const CERCO = palancaDiametro(campo("phiCerco"), "mayor", (_, d) => `Ø${d}`, { rotulo: "Rama " });
const separacion = (nombre: "sr" | "st" | "distPrimer", rotulo: string) =>
  palancaValor(campo(nombre), { paso: -0.01, tope: () => 0.03, decimales: 2, rotulo, texto: m });
const PERIMETROS = palancaValor(campo("nPerimetros"), {
  paso: 1,
  tope: (n) => n + 10,
  decimales: 0,
  rotulo: "Perímetros: ",
  texto: (n) => String(n),
});

function palancasPorClave(clave: ClavePunzonamiento): readonly Palanca<Campos>[] {
  switch (clave) {
    case "caraPilar":
      return [ESPESOR, lado("c1"), lado("c2"), FCK];
    case "critico":
      return [NEGATIVOS, ESPESOR, FCK, lado("c1"), lado("c2")];
    case "fueraDeAlcance":
      return [ESPESOR, lado("c1"), lado("c2"), FCK];
    case "armadura":
      return [RAMAS, CERCO, separacion("sr", "sr = "), ESPESOR];
    case "uOut":
      return [PERIMETROS];
    case "perimetros":
      return [PERIMETROS];
    case "sr":
      return [separacion("sr", "sr = ")];
    case "st":
      return [RAMAS, separacion("st", "st = ")];
    case "primerPerimetro":
      return [separacion("distPrimer", "al 1.er perímetro = ")];
    case "aswMin":
      return [CERCO];
  }
}

/** Propuestas para cada comprobación de punzonamiento que no cumple o queda justa. */
export function recomendarPunzonamiento(campos: Campos): RecomendacionesPunzonamiento {
  return recomendarTodas(
    { datos: campos, calcular: resolverPunzonamiento, utilizaciones, nombres: NOMBRES, binarias: ["fueraDeAlcance"] },
    palancasPorClave
  );
}
