import { DIAMETROS_ARMADURA } from "@/lib/calc/armaduras";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";
import {
  verificarArmaduraTirante,
  type DatosArmaduraTirante,
  type ResultadoArmaduraTirante,
} from "@/lib/calc/hormigon/cimentaciones/tirante-rozamiento";
import { fmt } from "@/lib/verificaciones/formato";
import { recomendar, type Palanca, type Problema, type Recomendacion } from "./motor";

/**
 * Cómo se eligieron las barras del tirante: por cantidad en cada pilar
 * (aislada, combinada) o por separación a lo largo del muro (corrida). Las
 * propuestas se escriben en la misma forma en que se cargaron.
 */
export type BarrasTirante =
  | { tipo: "numero"; numero: number; diametroMm: number }
  | { tipo: "separacion"; separacionM: number; diametroMm: number };

export interface EntradaArmaduraTirante extends Omit<DatosArmaduraTirante, "diametroMm" | "asRealCm2" | "separacionM"> {
  fck: number;
  fyk: number;
  barras: BarrasTirante;
}

export type ClaveTirante = "as" | "anclaje";
export type RecomendacionesTirante = Partial<Record<ClaveTirante, Recomendacion[]>>;

function areaDe(b: BarrasTirante): number {
  const una = (Math.PI * (b.diametroMm / 10) ** 2) / 4;
  return b.tipo === "numero" ? b.numero * una : una / b.separacionM;
}

function textoBarras(b: BarrasTirante): string {
  return b.tipo === "numero" ? `${b.numero} Ø${b.diametroMm}` : `Ø${b.diametroMm} c/${fmt(b.separacionM, 2)}`;
}

/** La misma verificación del tirante, a partir de las barras como se cargaron. */
export function verificarTirante(e: EntradaArmaduraTirante): ResultadoArmaduraTirante {
  const { fck, fyk, barras, ...resto } = e;
  return verificarArmaduraTirante(derivarMateriales({ fck, fyk }), {
    ...resto,
    diametroMm: barras.diametroMm,
    asRealCm2: areaDe(barras),
    ...(barras.tipo === "separacion" ? { separacionM: barras.separacionM } : {}),
  });
}

const utilizaciones = (r: ResultadoArmaduraTirante): Record<ClaveTirante, number> => ({
  as: r.asNecCm2 / r.asRealCm2,
  anclaje: r.lbdMm / r.disponibleMm,
});

const conBarras = (e: EntradaArmaduraTirante, barras: BarrasTirante) => ({
  datos: { ...e, barras },
  accion: `Tirante ${textoBarras(barras)} (hoy ${textoBarras(e.barras)})`,
});

/**
 * Más barras del mismo diámetro. Sirve para el área y también para el
 * anclaje: con más área baja σsd, y lbd es proporcional a σsd (ec. (8.3)).
 */
const MAS_BARRAS: Palanca<EntradaArmaduraTirante> = {
  efectoColateral: "Más barras en el mismo ancho: revisar que entren.",
  cita: "Anejo 19, art. 8.4.3 (2), ec. (8.3), pág. 124",
  *candidatos(e) {
    const b = e.barras;
    if (b.tipo === "numero") {
      for (let n = b.numero + 1; n <= b.numero + 20; n++) yield conBarras(e, { ...b, numero: n });
    } else {
      for (let s = Math.round(b.separacionM * 100) - 1; s >= 7; s--) yield conBarras(e, { ...b, separacionM: s / 100 });
    }
  },
};

const DIAMETRO_MAYOR: Palanca<EntradaArmaduraTirante> = {
  efectoColateral: "Diámetro mayor: pide más anclaje.",
  *candidatos(e) {
    for (const d of DIAMETROS_ARMADURA.filter((x) => x > e.barras.diametroMm)) yield conBarras(e, { ...e.barras, diametroMm: d });
  },
};

/** Barras más finas con la misma área: lbd es proporcional a Ø (ec. (8.3)). */
const DIAMETRO_MENOR: Palanca<EntradaArmaduraTirante> = {
  efectoColateral: "Misma área con más barras finas.",
  cita: "Anejo 19, art. 8.4.3 (2), ec. (8.3), pág. 124",
  *candidatos(e) {
    const b = e.barras;
    for (const d of DIAMETROS_ARMADURA.filter((x) => x < b.diametroMm).reverse()) {
      const k = (b.diametroMm / d) ** 2;
      if (b.tipo === "numero") {
        yield conBarras(e, { tipo: "numero", numero: Math.ceil(b.numero * k), diametroMm: d });
      } else {
        const s = Math.floor((b.separacionM / k) * 100) / 100;
        if (s < 0.07) return;
        yield conBarras(e, { tipo: "separacion", separacionM: s, diametroMm: d });
      }
    }
  },
};

/** Patilla, o una pata más larga, que baja dentro del pilar o muro y cuenta sobre el eje. */
const PATILLA: Palanca<EntradaArmaduraTirante> = {
  efectoColateral: "La pata baja por dentro del pilar o muro: tiene que caber en su altura.",
  cita: "Anejo 19, art. 8.4.3 (3), pág. 124",
  *candidatos(e) {
    const desde = e.forma === "gancho" ? e.pataMm : 0;
    for (let p = Math.max(100, Math.ceil((desde + 1) / 25) * 25); p <= 1000; p += 25) {
      yield {
        datos: { ...e, forma: "gancho", pataMm: p },
        accion:
          e.forma === "gancho"
            ? `Pata de ${p} mm (hoy ${fmt(e.pataMm, 0)} mm)`
            : `Terminar en patilla con pata de ${p} mm (hoy recta)`,
      };
    }
  },
};

/** Propuestas para el área y el anclaje del tirante, si alguno no cumple o queda justo. */
export function recomendarArmaduraTirante(entrada: EntradaArmaduraTirante): RecomendacionesTirante {
  const problema: Problema<EntradaArmaduraTirante, ResultadoArmaduraTirante, ClaveTirante> = {
    datos: entrada,
    calcular: verificarTirante,
    utilizaciones,
    nombres: { as: "área del tirante", anclaje: "anclaje del tirante" },
  };
  const actual = verificarTirante(entrada);
  const salida: RecomendacionesTirante = {};
  const as = recomendar(problema, "as", [MAS_BARRAS, DIAMETRO_MAYOR], actual);
  const anclaje = recomendar(problema, "anclaje", [MAS_BARRAS, DIAMETRO_MENOR, PATILLA], actual);
  if (as.length) salida.as = as;
  if (anclaje.length) salida.anclaje = anclaje;
  return salida;
}
