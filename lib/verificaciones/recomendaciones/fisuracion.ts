import { resolverFisuracion, type ResueltoFisuracion } from "@/lib/calc/hormigon/resolver-fisuracion";
import { recomendarTodas, type Palanca, type Recomendacion } from "./motor";
import { campo, m, palancaDiametro, palancaValor, type Campos } from "./palancas";

export type ClaveFisuracion = "wk";
export type RecomendacionesFisuracion = Partial<Record<ClaveFisuracion, Recomendacion[]>>;

const utilizaciones = ({ r, n }: ResueltoFisuracion) => ({ wk: r.wkMm / n.wAdm });

const textoBarras = (n: number, d: number) => `${n} Ø${d}`;

/** Más barras del mismo diámetro: baja σs y la separación entre fisuras. */
const MAS_BARRAS = palancaValor(campo("numero1"), {
  paso: 1,
  tope: (n) => n + 12,
  decimales: 0,
  rotulo: "Armadura: ",
  texto: (n, e) => textoBarras(n, campo("phi1").leer(e)),
  efectoColateral: "Más acero que el que pide la resistencia.",
});

/** Barras más finas con al menos la misma área: sr,max baja con Ø/ρp,ef. */
const MAS_FINAS: Palanca<Campos> = {
  efectoColateral: "Más barras, más finas.",
  cita: "Anejo 19, art. 7.3.4 (3), ec. (7.11), pág. 115",
  *candidatos(e) {
    const n0 = campo("numero1").leer(e);
    const d0 = campo("phi1").leer(e);
    for (const p of palancaDiametro(campo("phi1"), "menor", () => "").candidatos(e)) {
      const d = campo("phi1").leer(p.datos);
      const n = Math.ceil(n0 * (d0 / d) ** 2);
      yield { datos: { ...p.datos, numero1: String(n) }, accion: `Armadura: ${textoBarras(n, d)} (hoy ${textoBarras(n0, d0)})` };
    }
  },
};

const CANTO = palancaValor(campo("h"), {
  paso: 0.05,
  tope: (h) => h + 0.6,
  decimales: 2,
  rotulo: "h = ",
  texto: m,
  efectoColateral: "Más canto: más peso propio.",
});

/** Propuestas para la abertura de fisura, si no cumple o queda justa. */
export function recomendarFisuracion(campos: Campos): RecomendacionesFisuracion {
  return recomendarTodas(
    { datos: campos, calcular: resolverFisuracion, utilizaciones, nombres: { wk: "abertura de fisura" } },
    () => [MAS_BARRAS, MAS_FINAS, CANTO]
  );
}
