import { resolverApeoBielas, type ResueltoApeoBielas } from "@/lib/calc/hormigon/vigas/resolver-apeo-bielas";
import { recomendarTodas, type Palanca, type Recomendacion } from "./motor";
import { CITA_LBD_DIAMETRO, campo, m, palancaDiametro, palancaFck, palancaValor, type Campos } from "./palancas";

export type ClaveApeoBielas =
  | "tirante"
  | "bielaIzq"
  | "bielaDer"
  | "nudoSuperior"
  | "nudoApoyoIzq"
  | "nudoApoyoDer"
  | "traccionTransversal"
  | "cuelgue"
  | "anchoTirante"
  | "anclajeIzq"
  | "anclajeDer"
  | "mallaH"
  | "mallaV";
export type RecomendacionesApeoBielas = Partial<Record<ClaveApeoBielas, Recomendacion[]>>;

const NOMBRES: Record<ClaveApeoBielas, string> = {
  tirante: "tirante",
  bielaIzq: "biela izquierda",
  bielaDer: "biela derecha",
  nudoSuperior: "nudo bajo el pilar apeado",
  nudoApoyoIzq: "nudo de apoyo izquierdo",
  nudoApoyoDer: "nudo de apoyo derecho",
  traccionTransversal: "malla para la tracción transversal",
  cuelgue: "estribos de cuelgue",
  anchoTirante: "barras del tirante en el ancho",
  anclajeIzq: "anclaje recto izquierdo",
  anclajeDer: "anclaje recto derecho",
  mallaH: "malla horizontal mínima",
  mallaV: "malla vertical mínima",
};

type Tension = { sigmaMPa: number; sigmaMaxMPa: number };
const tension = (x: Tension) => x.sigmaMPa / x.sigmaMaxMPa;

function utilizaciones({ r, n }: ResueltoApeoBielas): Partial<Record<ClaveApeoBielas, number>> {
  const bi = r.bielas;
  const a = r.anclaje;
  return {
    tirante: r.tirante.asNecCm2 / r.tirante.asRealCm2,
    bielaIzq: tension(bi.bielaIzq),
    bielaDer: tension(bi.bielaDer),
    nudoSuperior: tension(bi.nudoSuperior),
    nudoApoyoIzq: tension(bi.nudoApoyoIzq),
    nudoApoyoDer: tension(bi.nudoApoyoDer),
    traccionTransversal: r.traccionTransversal.asNecCm2 / r.traccionTransversal.asRealCm2,
    ...(r.cuelgue
      ? { cuelgue: r.cuelgue.asNecCm2 / r.cuelgue.asRealCm2 }
      : {}),
    anchoTirante: r.tirante.bNecM / n.b,
    anclajeIzq: a.recto.lbdMm / (a.disponibleIzqM * 1000),
    anclajeDer: a.recto.lbdMm / (a.disponibleDerM * 1000),
    mallaH: r.malla.asMinCm2PorM / r.malla.horizontalCm2PorM,
    mallaV: r.malla.asMinCm2PorM / r.malla.verticalCm2PorM,
  };
}

// ── Palancas ────────────────────────────────────────────────────────────────

const metros = (nombre: string, rotulo: string, extra: number, efectoColateral?: string) =>
  palancaValor(campo(nombre), { paso: 0.05, tope: (x) => x + extra, decimales: 2, rotulo, texto: m, efectoColateral });

const ANCHO = metros("b", "b = ", 0.5, "Viga más ancha: más peso propio.");
const CANTO = metros("h", "h = ", 1, "Más canto: las bielas se paran y baja la tracción del tirante.");
const FCK = palancaFck(campo("fck"));

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

const malla = (lado: "H" | "V", rotulo: string): Palanca<Campos>[] => {
  const texto = (d: number, s: number) => `Ø${d} c/${s.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
  return [
    palancaValor(campo(`sepMalla${lado}`), {
      paso: -0.01,
      tope: () => 0.05,
      decimales: 2,
      rotulo,
      texto: (s, e) => texto(campo(`phiMalla${lado}`).leer(e), s),
    }),
    palancaDiametro(campo(`phiMalla${lado}`), "mayor", (e, d) => texto(d, campo(`sepMalla${lado}`).leer(e)), { rotulo }),
  ];
};

/** Más fino y más barras en el tirante, con al menos la misma área: lbd baja con el diámetro. */
const TIRANTE_MAS_FINO: Palanca<Campos> = {
  efectoColateral: "Misma área con más barras finas: revisar que entren en el ancho.",
  cita: CITA_LBD_DIAMETRO,
  *candidatos(e) {
    const n0 = campo("nTirante").leer(e);
    const d0 = campo("phiTirante").leer(e);
    for (const p of palancaDiametro(campo("phiTirante"), "menor", () => "").candidatos(e)) {
      const d = campo("phiTirante").leer(p.datos);
      const n = Math.ceil(n0 * (d0 / d) ** 2);
      yield { datos: { ...p.datos, nTirante: String(n) }, accion: `Tirante: ${n} Ø${d} (hoy ${n0} Ø${d0})` };
    }
  },
};

/** Menos barras más gruesas en el tirante, con al menos la misma área: piden menos ancho. */
const TIRANTE_MAS_GRUESO: Palanca<Campos> = {
  efectoColateral: "Diámetro mayor: pide más anclaje.",
  *candidatos(e) {
    const n0 = campo("nTirante").leer(e);
    const d0 = campo("phiTirante").leer(e);
    for (const p of palancaDiametro(campo("phiTirante"), "mayor", () => "").candidatos(e)) {
      const d = campo("phiTirante").leer(p.datos);
      const n = Math.max(2, Math.ceil(n0 * (d0 / d) ** 2));
      if (n >= n0) continue;
      yield { datos: { ...p.datos, nTirante: String(n) }, accion: `Tirante: ${n} Ø${d} (hoy ${n0} Ø${d0})` };
    }
  },
};

function palancasPorClave(clave: ClaveApeoBielas): readonly Palanca<Campos>[] {
  switch (clave) {
    case "tirante":
      return [...barras("nTirante", "phiTirante", "Tirante: "), CANTO];
    case "bielaIzq":
    case "bielaDer":
      return [ANCHO, CANTO, FCK];
    case "nudoSuperior":
      return [metros("anchoPilar", "Pilar apeado = ", 0.5, "Pilar más grande: hay que revisarlo también."), ANCHO, FCK];
    case "nudoApoyoIzq":
      return [metros("anchoApoyoIzq", "Apoyo izquierdo = ", 0.5, "Apoyo más ancho."), ANCHO, FCK];
    case "nudoApoyoDer":
      return [metros("anchoApoyoDer", "Apoyo derecho = ", 0.5, "Apoyo más ancho."), ANCHO, FCK];
    case "traccionTransversal":
      return malla("V", "Malla vertical: ");
    case "cuelgue":
      return [
        palancaValor(campo("ramasCuelgue"), { paso: 1, tope: (n) => n + 8, decimales: 0, rotulo: "Ramas de cuelgue: ", texto: String }),
        palancaDiametro(campo("phiCuelgue"), "mayor", (_, d) => `Ø${d}`, { rotulo: "Cuelgue " }),
      ];
    case "anchoTirante":
      return [TIRANTE_MAS_GRUESO, ANCHO];
    case "anclajeIzq":
      return [TIRANTE_MAS_FINO, metros("voladizoIzq", "Voladizo izquierdo = ", 1)];
    case "anclajeDer":
      return [TIRANTE_MAS_FINO, metros("voladizoDer", "Voladizo derecho = ", 1)];
    case "mallaH":
      return malla("H", "Malla horizontal: ");
    case "mallaV":
      return malla("V", "Malla vertical: ");
  }
}

/** Propuestas para cada comprobación de la viga de apeo que no cumple o queda justa. */
export function recomendarApeoBielas(campos: Campos): RecomendacionesApeoBielas {
  return recomendarTodas({ datos: campos, calcular: resolverApeoBielas, utilizaciones, nombres: NOMBRES }, palancasPorClave);
}
