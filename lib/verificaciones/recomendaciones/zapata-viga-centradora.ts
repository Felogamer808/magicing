import {
  resolverVigaCentradora,
  type ResueltoVigaCentradora,
} from "@/lib/calc/hormigon/cimentaciones/resolver-viga-centradora";
import { recomendarTodas, type Palanca, type Recomendacion } from "./motor";
import {
  CITA_LBD_DIAMETRO,
  CITA_PATILLA,
  EFECTO_H,
  campo,
  m,
  palancaDiametro,
  palancaFck,
  palancaOpcion,
  palancaValor,
  type Campos,
} from "./palancas";

export type ClaveVigaCentradora =
  | "tension"
  | "vueloAs"
  | "vueloAnclaje"
  | "vueloCorte"
  | "reparto"
  | "vigaFlexion"
  | "vigaBielas";
export type RecomendacionesVigaCentradora = Partial<Record<ClaveVigaCentradora, Recomendacion[]>>;

const NOMBRES: Record<ClaveVigaCentradora, string> = {
  tension: "tensión del terreno",
  vueloAs: "armadura de los vuelos",
  vueloAnclaje: "anclaje de los vuelos",
  vueloCorte: "cortante de los vuelos",
  reparto: "reparto",
  vigaFlexion: "armadura de la viga",
  vigaBielas: "bielas del alma de la viga",
};

function utilizaciones({ r, v }: ResueltoVigaCentradora): Partial<Record<ClaveVigaCentradora, number>> {
  const b = r.zapataDireccionB;
  return {
    tension: r.sigmaKPa / v.sigmaAdmisible,
    vueloAs: b.asNecCm2 / b.asRealCm2,
    ...(b.anclaje.comprobado ? { vueloAnclaje: b.anclaje.lbdMm / b.anclaje.disponibleMm } : {}),
    ...(b.vRdCKN > 0 ? { vueloCorte: b.vEdKN / b.vRdCKN } : {}),
    reparto: r.asRepartoNecCm2PorM / r.asRepartoRealCm2PorM,
    vigaFlexion: r.vigaFlexion.asNecCm2 / r.vigaFlexion.asRealCm2,
    vigaBielas: r.cortanteVigaKN / r.vigaCortante.vRdMax,
  };
}

// ── Palancas ────────────────────────────────────────────────────────────────

const metros = (nombre: string, rotulo: string, paso: number, extra: number, efectoColateral?: string) =>
  palancaValor(campo(nombre), { paso, tope: (x) => x + extra, decimales: 2, rotulo, texto: m, efectoColateral });

const H = metros("H", "H = ", 0.05, 1, EFECTO_H);
const A = metros("A", "A = ", 0.05, 2, "Más superficie de apoyo; crece el vuelo y su armadura.");
const B = metros("B", "B = ", 0.05, 2, "Más superficie de apoyo; crece el vuelo y su armadura.");
const H_VIGA = metros("hViga", "Viga h = ", 0.05, 1, "Más canto de viga: más excavación.");
const B_VIGA = metros("bViga", "Viga b = ", 0.05, 0.5);
const FCK = palancaFck(campo("fck"));

/** Más barras y diámetro mayor para un grupo con número y diámetro. */
function barras(numero: string, diametro: string, rotulo: string): Palanca<Campos>[] {
  return [
    palancaValor(campo(numero), {
      paso: 1,
      tope: (n) => n + 15,
      decimales: 0,
      rotulo,
      texto: (n, e) => `${n} Ø${campo(diametro).leer(e)}`,
    }),
    palancaDiametro(campo(diametro), "mayor", (e, d) => `${campo(numero).leer(e)} Ø${d}`, { rotulo }),
  ];
}

const PATILLA = palancaOpcion<Campos>(
  (e) => e.formaAnclaje !== "gancho",
  (e) => ({ ...e, formaAnclaje: "gancho" }),
  "Terminar la parrilla en patilla a 90° (hoy recta)",
  { cita: CITA_PATILLA }
);

/** Más fino y más barras en B, con la misma área: lbd baja con el diámetro. */
const MAS_FINAS_B: Palanca<Campos> = {
  efectoColateral: "Misma área con más barras finas.",
  cita: CITA_LBD_DIAMETRO,
  *candidatos(e) {
    const n0 = campo("numeroB").leer(e);
    const d0 = campo("diametroB").leer(e);
    for (const p of palancaDiametro(campo("diametroB"), "menor", () => "").candidatos(e)) {
      const d = campo("diametroB").leer(p.datos);
      const n = Math.ceil(n0 * (d0 / d) ** 2);
      yield { datos: { ...p.datos, numeroB: String(n) }, accion: `B: ${n} Ø${d} (hoy ${n0} Ø${d0})` };
    }
  },
};

function palancasPorClave(clave: ClaveVigaCentradora): readonly Palanca<Campos>[] {
  switch (clave) {
    case "tension":
      return [B, A];
    case "vueloAs":
      return [...barras("numeroB", "diametroB", "B: "), H];
    case "vueloAnclaje":
      return [PATILLA, MAS_FINAS_B, H];
    case "vueloCorte":
      return [H, FCK];
    case "reparto":
      return barras("numeroA", "diametroA", "A: ");
    case "vigaFlexion":
      return [...barras("numeroViga", "diametroViga", "Viga: "), H_VIGA];
    case "vigaBielas":
      return [B_VIGA, H_VIGA, FCK];
  }
}

/** Propuestas para cada comprobación de la zapata con viga centradora que no cumple o queda justa. */
export function recomendarVigaCentradora(campos: Campos): RecomendacionesVigaCentradora {
  return recomendarTodas({ datos: campos, calcular: resolverVigaCentradora, utilizaciones, nombres: NOMBRES }, palancasPorClave);
}
