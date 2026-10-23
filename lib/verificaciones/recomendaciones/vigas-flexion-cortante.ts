import { resolverVigaFlexionCortante, type ResueltoVigaFlexionCortante } from "@/lib/calc/hormigon/vigas/resolver";
import { recomendarTodas, siNo, type Palanca, type Recomendacion } from "./motor";
import { campo, m, palancaDiametro, palancaFck, palancaValor, type Campos } from "./palancas";

export type ClaveViga =
  | "positiva"
  | "negativa"
  | "bielas"
  | "anchoInferior"
  | "anchoSuperior"
  | "ramas"
  | "rasanteBielas"
  | "rasanteArmadura";
export type RecomendacionesViga = Partial<Record<ClaveViga, Recomendacion[]>>;

const NOMBRES: Record<ClaveViga, string> = {
  positiva: "flexión positiva",
  negativa: "flexión negativa",
  bielas: "compresión oblicua del alma",
  anchoInferior: "armadura inferior en el ancho",
  anchoSuperior: "armadura superior en el ancho",
  ramas: "separación transversal entre ramas",
  rasanteBielas: "bielas del ala",
  rasanteArmadura: "armadura transversal del ala",
};

const utilizaciones = (r: ResueltoVigaFlexionCortante): Partial<Record<ClaveViga, number>> => ({
  positiva: r.flexionPositiva.asNecCm2 / r.flexionPositiva.asRealCm2,
  negativa: r.flexionNegativa.asNecCm2 / r.flexionNegativa.asRealCm2,
  bielas: r.v.vd / r.cortante.vRdMax,
  anchoInferior: siNo(r.flexionPositiva.verificaEntraEnAncho),
  anchoSuperior: siNo(r.flexionNegativa.verificaEntraEnAncho),
  ramas: r.cortante.separacionTransversalM / r.cortante.separacionTransversalMaxM,
  // Sólo con sección en T y el ala comprimida por un momento.
  ...(r.seccionT?.rasante
    ? {
        rasanteBielas: r.seccionT.rasante.vEdMPa / r.seccionT.rasante.vRdMaxMPa,
        ...(r.seccionT.rasante.requiereArmadura
          ? { rasanteArmadura: r.seccionT.rasante.asNecCm2PorM / r.seccionT.rasante.asRealCm2PorM }
          : {}),
      }
    : {}),
});

// ── Palancas ────────────────────────────────────────────────────────────────

type Cara = "Pos" | "Neg";
const NOMBRE_CARA: Record<Cara, string> = { Pos: "Inferior", Neg: "Superior" };
const leer = (e: Campos, nombre: string) => campo(nombre).leer(e);

export const CANTO = palancaValor(campo("h"), {
  paso: 0.05,
  tope: (h) => h + 0.6,
  rotulo: "h = ",
  texto: m,
  efectoColateral: "Más canto: más peso propio y menos altura libre.",
});
export const ANCHO = palancaValor(campo("b"), {
  paso: 0.05,
  tope: (b) => b + 0.5,
  rotulo: "b = ",
  texto: m,
  efectoColateral: "Más ancho: más peso propio; entran más barras por fila.",
});
export const FCK = palancaFck(campo("fck"));

/** Más ramas por estribo: achica la separación transversal entre ellas. */
export const RAMAS = palancaValor(campo("numeroRamas"), {
  paso: 1,
  tope: (n) => n + 4,
  decimales: 0,
  rotulo: "Estribos: ",
  texto: (n) => `${n} ramas`,
  efectoColateral: "Más ramas: más acero por estribo; la separación longitudinal puede abrirse.",
});

const textoCapa = (n: number, d: number) => `${n} Ø${d}`;

/** Más barras en la primera capa, con su diámetro. */
export const masBarras = (c: Cara) =>
  palancaValor(campo(`numero${c}`), {
    paso: 1,
    tope: (n) => n + 12,
    decimales: 0,
    rotulo: `${NOMBRE_CARA[c]} capa 1: `,
    texto: (n, e) => textoCapa(n, leer(e, `diametro${c}`)),
    efectoColateral: "Más barras por fila: revisar que entren en el ancho.",
  });

/** El diámetro siguiente con las mismas barras. */
export const diametroMayor = (c: Cara) =>
  palancaDiametro(campo(`diametro${c}`), "mayor", (e, d) => textoCapa(leer(e, `numero${c}`), d), {
    rotulo: `${NOMBRE_CARA[c]} capa 1: `,
    efectoColateral: "Diámetro mayor: más longitud de anclaje y de solape.",
  });

/** Agregar o agrandar la segunda capa, con el diámetro de la primera si estaba apagada. */
const segundaCapa = (c: Cara): Palanca<Campos> => ({
  efectoColateral: "Segunda capa: baja un poco el canto útil.",
  *candidatos(e) {
    const n0 = leer(e, `numero${c}2`);
    const d = n0 > 0 ? leer(e, `diametro${c}2`) : leer(e, `diametro${c}`);
    for (let n = n0 + 1; n <= n0 + 10; n++) {
      yield {
        datos: { ...e, [`numero${c}2`]: String(n), [`diametro${c}2`]: String(d) },
        accion: `${NOMBRE_CARA[c]} capa 2: ${textoCapa(n, d)} (hoy ${n0 > 0 ? textoCapa(n0, d) : "sin segunda capa"})`,
      };
    }
  },
});

/** Barras más finas con al menos la misma área: entran donde no entraba una gruesa. */
export const masBarrasFinas = (c: Cara): Palanca<Campos> => ({
  efectoColateral: "Más barras, más finas.",
  *candidatos(e) {
    const n0 = leer(e, `numero${c}`);
    const d0 = leer(e, `diametro${c}`);
    for (const p of palancaDiametro(campo(`diametro${c}`), "menor", () => "").candidatos(e)) {
      const d = leer(p.datos, `diametro${c}`);
      const n = Math.ceil(n0 * (d0 / d) ** 2);
      yield {
        datos: { ...p.datos, [`numero${c}`]: String(n) },
        accion: `${NOMBRE_CARA[c]} capa 1: ${textoCapa(n, d)} (hoy ${textoCapa(n0, d0)})`,
      };
    }
  },
});

/** Ala más gruesa: más sección para el rasante y más compresión en el ala. */
const ESPESOR_ALA = palancaValor(campo("espesorAla"), {
  paso: 0.01,
  tope: (hf) => hf + 0.1,
  decimales: 2,
  rotulo: "hf = ",
  texto: m,
  efectoColateral: "Ala más gruesa: más peso propio; en una prefabricada no se puede cambiar.",
});
const textoAla = (e: Campos, d = leer(e, "diametroAla"), s = leer(e, "separacionAla"), c = leer(e, "capasAla")) =>
  `${c > 1 ? `${c} capas ` : ""}Ø${d} c/${s.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
const SEPARACION_ALA = palancaValor(campo("separacionAla"), {
  paso: -0.01,
  tope: () => 0.05,
  decimales: 2,
  rotulo: "Transversal del ala: ",
  texto: (s, e) => textoAla(e, leer(e, "diametroAla"), s),
});
const DIAMETRO_ALA = palancaDiametro(campo("diametroAla"), "mayor", (e, d) => textoAla(e, d), {
  rotulo: "Transversal del ala: ",
});

function palancasPorClave(clave: ClaveViga): readonly Palanca<Campos>[] {
  switch (clave) {
    case "positiva":
      return [masBarras("Pos"), diametroMayor("Pos"), segundaCapa("Pos"), CANTO, FCK];
    case "negativa":
      return [masBarras("Neg"), diametroMayor("Neg"), segundaCapa("Neg"), CANTO, FCK];
    case "bielas":
      // VRd,max crece con b·z y con fcd: el ancho es lo que más rinde.
      return [ANCHO, FCK, CANTO];
    case "anchoInferior":
      return [masBarrasFinas("Pos"), ANCHO];
    case "anchoSuperior":
      return [masBarrasFinas("Neg"), ANCHO];
    case "ramas":
      return [RAMAS];
    case "rasanteBielas":
      return [ESPESOR_ALA, FCK];
    case "rasanteArmadura":
      return [SEPARACION_ALA, DIAMETRO_ALA, ESPESOR_ALA];
  }
}

/** Propuestas para cada comprobación de la viga que no cumple o queda justa. */
export function recomendarVigaFlexionCortante(campos: Campos): RecomendacionesViga {
  return recomendarTodas(
    {
      datos: campos,
      calcular: resolverVigaFlexionCortante,
      utilizaciones,
      nombres: NOMBRES,
      binarias: ["anchoInferior", "anchoSuperior"],
    },
    palancasPorClave
  );
}
