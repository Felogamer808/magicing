import { FS_DESLIZAMIENTO_MINIMO, FS_VUELCO_MINIMO } from "@/lib/calc/hormigon/muros/contencion";
import {
  resolverMuroContencion,
  type ResueltoMuroContencion,
} from "@/lib/calc/hormigon/muros/resolver-muro-contencion";
import { recomendarTodas, type Palanca, type Recomendacion } from "./motor";
import { campo, m, palancaDiametro, palancaValor, type Campos } from "./palancas";

type Pieza = "Hastial" | "Talon" | "Puntera";
export type ClaveMuroContencion = "vuelco" | "deslizamiento" | "tension" | `armado${Pieza}`;
export type RecomendacionesMuroContencion = Partial<Record<ClaveMuroContencion, Recomendacion[]>>;

const NOMBRES: Record<ClaveMuroContencion, string> = {
  vuelco: "vuelco",
  deslizamiento: "deslizamiento",
  tension: "tensión del suelo",
  armadoHastial: "armadura del hastial",
  armadoTalon: "armadura del talón",
  armadoPuntera: "armadura de la puntera",
};

function utilizaciones({ r, n, armado }: ResueltoMuroContencion): Partial<Record<ClaveMuroContencion, number>> {
  const u: Partial<Record<ClaveMuroContencion, number>> = {
    vuelco: FS_VUELCO_MINIMO / r.vuelco.factorSeguridad,
    deslizamiento: FS_DESLIZAMIENTO_MINIMO / r.deslizamientoSoloZapata.factorSeguridad,
    tension: r.tensionSueloCaso1.sigmaKPa / n.sigmaAdm,
  };
  if (armado) {
    u.armadoHastial = armado.hastial.calculo.asNecesarioCm2 / armado.hastial.asRealCm2;
    u.armadoTalon = armado.talon.calculo.asNecesarioCm2 / armado.talon.asRealCm2;
    if (armado.puntera) u.armadoPuntera = armado.puntera.calculo.asNecesarioCm2 / armado.puntera.asRealCm2;
  }
  return u;
}

// ── Palancas ────────────────────────────────────────────────────────────────

const ANCHO = palancaValor(campo("anchoZap"), {
  paso: 0.05,
  tope: (b) => b + 3,
  decimales: 2,
  rotulo: "Ancho de zapata = ",
  texto: m,
  efectoColateral: "Talón más largo: más tierra encima que estabiliza, y más excavación.",
});
const PUNTERA = palancaValor(campo("puntera"), {
  paso: 0.05,
  tope: (p) => p + 1.5,
  decimales: 2,
  rotulo: "Puntera = ",
  texto: m,
  efectoColateral: "Hace falta lugar del lado de afuera; la puntera se arma a flexión.",
});
const CANTO_ZAPATA = palancaValor(campo("cantoZap"), {
  paso: 0.05,
  tope: (h) => h + 0.6,
  decimales: 2,
  rotulo: "Canto de zapata = ",
  texto: m,
  efectoColateral: "Más hormigón y más excavación.",
});
const ESPESOR_MURO = palancaValor(campo("espMuro"), {
  paso: 0.05,
  tope: (e) => e + 0.4,
  decimales: 2,
  rotulo: "Espesor del muro = ",
  texto: m,
  efectoColateral: "Achica el talón si no se agranda la zapata.",
});

/** Separación más chica y diámetro mayor, en mm como se cargan. */
function malla(p: Pieza): Palanca<Campos>[] {
  const rotulo = `${p === "Talon" ? "Talón" : p}: `;
  const texto = (d: number, s: number) => `Ø${d} c/${s} mm`;
  return [
    palancaValor(campo(`sep${p}`), {
      paso: -10,
      tope: () => 50,
      decimales: 0,
      rotulo,
      texto: (s, e) => texto(campo(`phi${p}`).leer(e), s),
    }),
    palancaDiametro(campo(`phi${p}`), "mayor", (e, d) => texto(d, campo(`sep${p}`).leer(e)), { rotulo }),
  ];
}

function palancasPorClave(clave: ClaveMuroContencion): readonly Palanca<Campos>[] {
  switch (clave) {
    case "vuelco":
      return [ANCHO, PUNTERA];
    case "deslizamiento":
      return [ANCHO, CANTO_ZAPATA];
    case "tension":
      return [ANCHO, PUNTERA];
    case "armadoHastial":
      return [...malla("Hastial"), ESPESOR_MURO];
    case "armadoTalon":
      return [...malla("Talon"), CANTO_ZAPATA];
    case "armadoPuntera":
      return [...malla("Puntera"), CANTO_ZAPATA];
  }
}

/** Propuestas para el muro de contención solo (caso 1), si algo no cumple o queda justo. */
export function recomendarMuroContencion(campos: Campos): RecomendacionesMuroContencion {
  return recomendarTodas({ datos: campos, calcular: resolverMuroContencion, utilizaciones, nombres: NOMBRES }, palancasPorClave);
}
