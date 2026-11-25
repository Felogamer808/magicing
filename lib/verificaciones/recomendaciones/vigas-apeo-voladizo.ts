import { resolverApeoVoladizo, type ResueltoApeoVoladizo } from "@/lib/calc/hormigon/vigas/resolver-apeo-voladizo";
import { recomendarTodas, type Palanca, type Recomendacion } from "./motor";
import {
  CITA_LBD_DIAMETRO,
  CITA_PATILLA,
  campo,
  m,
  palancaDiametro,
  palancaFck,
  palancaOpcion,
  palancaValor,
  type Campos,
} from "./palancas";

export type ClaveApeoVoladizo =
  | "tirante"
  | "nudoCargaApoyo"
  | "nudoCargaBiela"
  | "nudoApoyoCercano"
  | "nudoElementoLejano"
  | "nudoApoyoLejano"
  | "anclajeCarga"
  | "anclajeLejano"
  | "pilarLejano"
  | "anclajePilar"
  | "horquillasArea"
  | "horquillasSeparacion"
  | "horquillasSolape"
  | "horquillasMandril"
  | "mallaVertical"
  | "mallaHorizontal";
export type RecomendacionesApeoVoladizo = Partial<Record<ClaveApeoVoladizo, Recomendacion[]>>;

const NOMBRES: Record<ClaveApeoVoladizo, string> = {
  tirante: "tirante superior",
  nudoCargaApoyo: "nudo bajo el pilar apeado (cara cargada)",
  nudoCargaBiela: "nudo bajo el pilar apeado (cara de la biela)",
  nudoApoyoCercano: "nudo sobre el apoyo cercano",
  nudoElementoLejano: "nudo bajo el elemento lejano",
  nudoApoyoLejano: "nudo sobre el apoyo lejano",
  anclajeCarga: "anclaje del tirante en el voladizo",
  anclajeLejano: "anclaje del tirante sobre el apoyo lejano",
  pilarLejano: "pilar lejano a tracción",
  anclajePilar: "anclaje del pilar lejano",
  horquillasArea: "horquillas, armadura suficiente",
  horquillasSeparacion: "horquillas, separación en la capa",
  horquillasSolape: "horquillas, solape con el tirante",
  horquillasMandril: "horquillas, doblado de la U interior",
  mallaVertical: "estribos, malla vertical",
  mallaHorizontal: "barras horizontales de las caras",
};

const nudo = (x: { sigmaMPa: number; sigmaMaxMPa: number }) => x.sigmaMPa / x.sigmaMaxMPa;
const anclaje = (x: { lbdMm: number; disponibleMm: number }) => x.lbdMm / x.disponibleMm;
/** Cuantía y separación juntas: manda la más exigida de las dos. */
const malla = (x: { asCm2PorM: number; separacionM: number }, minimaCm2PorM: number, separacionMaxM: number) =>
  Math.max(minimaCm2PorM / x.asCm2PorM, x.separacionM / separacionMaxM);

function utilizaciones({ r }: ResueltoApeoVoladizo): Partial<Record<ClaveApeoVoladizo, number>> {
  const h = r.horquillas;
  const usoHorquillas = h
    ? {
        horquillasArea: h.asNecCm2 / h.asRealCm2,
        horquillasSeparacion: h.separacionLibreMinMm / h.separacionLibreMm,
        horquillasSolape: h.l0Mm / h.disponibleSolapeMm,
        horquillasMandril: h.mandrilNecMm / h.mandrilDisponibleMm,
      }
    : null;
  // Con horquillas, el anclaje de cada extremo es lo que ellas den: así la
  // propuesta de pasar a horquillas se mide contra el mismo problema.
  const anclajeConHorquillas = usoHorquillas ? Math.max(...Object.values(usoHorquillas)) : null;
  return {
    tirante: r.asNecTiranteCm2 / r.asRealTiranteCm2,
    nudoCargaApoyo: nudo(r.nudoCargaApoyo),
    nudoCargaBiela: nudo(r.nudoCargaBiela),
    nudoApoyoCercano: nudo(r.nudoApoyoCercano),
    nudoElementoLejano: nudo(r.nudoElementoLejano),
    nudoApoyoLejano: nudo(r.nudoApoyoLejano),
    anclajeCarga: r.anclajeTiranteCarga ? anclaje(r.anclajeTiranteCarga) : anclajeConHorquillas!,
    anclajeLejano: r.anclajeTiranteLejano ? anclaje(r.anclajeTiranteLejano) : anclajeConHorquillas!,
    ...(usoHorquillas ?? {}),
    mallaVertical: malla(r.mallaVertical, r.mallaMinimaCm2PorM, r.separacionMaximaMallaM),
    mallaHorizontal: malla(r.mallaHorizontal, r.mallaMinimaCm2PorM, r.separacionMaximaMallaM),
    ...(r.traccionPilarLejanoKN > 0
      ? {
          pilarLejano: r.asNecPilarLejanoCm2 / r.asRealPilarLejanoCm2,
          ...(r.anclajePilarLejano ? { anclajePilar: anclaje(r.anclajePilarLejano) } : {}),
        }
      : {}),
  };
}

// ── Palancas ────────────────────────────────────────────────────────────────

const metros = (nombre: string, rotulo: string, extra: number, efectoColateral?: string) =>
  palancaValor(campo(nombre), { paso: 0.05, tope: (x) => x + extra, decimales: 2, rotulo, texto: m, efectoColateral });

const CANTO = metros("h", "h = ", 0.8, "Más canto: el brazo del par crece y baja la tracción del tirante.");
const FCK = palancaFck(campo("fck"));

/** Agrandar las dos medidas de un apoyo o elemento, por separado. */
const apoyo = (prefijo: string, nombre: string): Palanca<Campos>[] => [
  metros(`${prefijo}Ancho`, `${nombre}, ancho = `, 0.5, "Placa de apoyo más grande."),
  metros(`${prefijo}Prof`, `${nombre}, profundidad = `, 0.5, "Placa de apoyo más grande."),
];

const barras = (numero: string, diametro: string, rotulo: string): Palanca<Campos>[] => [
  palancaValor(campo(numero), {
    paso: 1,
    tope: (n) => n + 12,
    decimales: 0,
    rotulo,
    texto: (n, e) => `${n} Ø${campo(diametro).leer(e)}`,
  }),
  palancaDiametro(campo(diametro), "mayor", (e, d) => `${campo(numero).leer(e)} Ø${d}`, { rotulo }),
];

/** Más fino y más barras, con al menos la misma área: lbd baja con el diámetro. */
const masFinas = (numero: string, diametro: string, rotulo: string): Palanca<Campos> => ({
  efectoColateral: "Misma área con más barras finas.",
  cita: CITA_LBD_DIAMETRO,
  *candidatos(e) {
    const n0 = campo(numero).leer(e);
    const d0 = campo(diametro).leer(e);
    for (const p of palancaDiametro(campo(diametro), "menor", () => "").candidatos(e)) {
      const d = campo(diametro).leer(p.datos);
      const n = Math.ceil(n0 * (d0 / d) ** 2);
      yield { datos: { ...p.datos, [numero]: String(n) }, accion: `${rotulo}${n} Ø${d} (hoy ${n0} Ø${d0})` };
    }
  },
});

const PATILLA = palancaOpcion<Campos>(
  (e) => e.forma !== "gancho",
  (e) => ({ ...e, forma: "gancho" }),
  "Terminar el tirante en patilla (hoy recto)",
  { cita: CITA_PATILLA }
);

const HORQUILLAS = palancaOpcion<Campos>(
  (e) => e.forma !== "horquilla",
  (e) => ({ ...e, forma: "horquilla" }),
  "Anclar el tirante con horquillas en U",
  { cita: "Anejo 19, art. 9.7 (3), pág. 152" }
);

const diametroHorquilla = (sentido: "mayor" | "menor") =>
  palancaDiametro(campo("phiHorquilla"), sentido, (_e, d) => `Ø${d}`, { rotulo: "Horquillas: " });

/** Achicar la separación de una dirección de la malla, o engrosar su barra. */
const mallaCara = (separacion: string, diametro: string, rotulo: string): Palanca<Campos>[] => [
  palancaValor(campo(separacion), { paso: -0.025, tope: () => 0.05, decimales: 3, rotulo: `${rotulo} cada `, texto: m }),
  palancaDiametro(campo(diametro), "mayor", (e, d) => `Ø${d} cada ${m(campo(separacion).leer(e))}`, { rotulo }),
];

const ESPESOR = metros("b", "b = ", 0.5, "Viga más ancha: más hormigón y más malla mínima.");

function palancasPorClave(clave: ClaveApeoVoladizo): readonly Palanca<Campos>[] {
  switch (clave) {
    case "tirante":
      return [...barras("nTirante", "phiTirante", "Tirante: "), CANTO];
    case "nudoCargaApoyo":
    case "nudoCargaBiela":
      return [...apoyo("carga", "Pilar apeado"), FCK];
    case "nudoApoyoCercano":
      return [...apoyo("apoyoC", "Apoyo cercano"), FCK];
    case "nudoElementoLejano":
      return [...apoyo("elemL", "Elemento lejano"), FCK];
    case "nudoApoyoLejano":
      return [...apoyo("apoyoL", "Apoyo lejano"), FCK];
    case "anclajeCarga":
      return [PATILLA, HORQUILLAS, masFinas("nTirante", "phiTirante", "Tirante: "), metros("extremoLibre", "Extremo libre = ", 1)];
    case "anclajeLejano":
      return [PATILLA, HORQUILLAS, masFinas("nTirante", "phiTirante", "Tirante: "), metros("extremoLejano", "Extremo lejano = ", 1)];
    case "pilarLejano":
      return barras("nPilar", "phiPilar", "Pilar lejano: ");
    case "anclajePilar":
      return [masFinas("nPilar", "phiPilar", "Pilar lejano: "), CANTO];
    case "horquillasArea":
      return [diametroHorquilla("mayor")];
    case "horquillasSeparacion":
      return [diametroHorquilla("menor"), ESPESOR];
    case "horquillasSolape":
      return [masFinas("nTirante", "phiTirante", "Tirante: "), diametroHorquilla("menor")];
    case "horquillasMandril":
      return [diametroHorquilla("mayor"), diametroHorquilla("menor"), ESPESOR, PATILLA];
    case "mallaVertical":
      return mallaCara("sepEstribo", "phiEstribo", "Estribos: ");
    case "mallaHorizontal":
      return mallaCara("sepPiel", "phiPiel", "Barras horizontales: ");
  }
}

/** Propuestas para cada comprobación de la viga de apeo en voladizo que no cumple o queda justa. */
export function recomendarApeoVoladizo(campos: Campos): RecomendacionesApeoVoladizo {
  return recomendarTodas({ datos: campos, calcular: resolverApeoVoladizo, utilizaciones, nombres: NOMBRES }, palancasPorClave);
}
