import type { ResultadoArmaduraTirante } from "@/lib/calc/hormigon/cimentaciones/tirante-rozamiento";
import type { ResultadoPunzonamientoDescentrado } from "@/lib/calc/hormigon/cimentaciones/punzonamiento-descentrado";
import type { ResultadoDireccionZapata, ResultadoPunzonamiento } from "@/lib/calc/hormigon/cimentaciones/zapata-aislada";
import type { ResultadoCaraCombinada, ResultadoCortanteCombinada } from "@/lib/calc/hormigon/cimentaciones/zapata-combinada";
import { fmt } from "@/lib/verificaciones/formato";

/**
 * Las comprobaciones de hormigón de una zapata en la situación extraordinaria,
 * escritas una sola vez para las tres zapatas: cada página arma sus filas con
 * estas funciones y las dibuja con `HormigonExtraordinario`, y la conclusión
 * las toma de la misma lista.
 */
/** Los estados que puede tener una fila; es un subconjunto de los de la interfaz. */
export type EstadoVerificacion = "cumple" | "no-cumple" | "no-aplica" | "no-evaluado";

export interface FilaExtraordinaria {
  etiqueta: string;
  estado: EstadoVerificacion;
  detalle?: string;
  comparacion?: {
    real: { etiqueta: string; valor: number };
    limite: { etiqueta: string; valor: number };
    unidad: string;
    exige: "≤" | "≥";
  };
  utilizacion?: number;
}

const estado = (v: boolean): EstadoVerificacion => (v ? "cumple" : "no-cumple");

/**
 * Armadura, anclaje y cortante de los vuelos de una dirección: el peor de cada uno.
 *
 * La armadura se compara con la que pide la resistencia, sin la mínima: la
 * mínima es una regla de detalle que no depende de la situación (criterio del
 * usuario) y ya se comprueba en la persistente. La del código usa fyd, y con
 * γs = 1,0 bajaría.
 */
export function filasVuelos(nombre: string, vuelos: readonly ResultadoDireccionZapata[]): FilaExtraordinaria[] {
  const peor = (f: (r: ResultadoDireccionZapata) => number) => vuelos.reduce((a, b) => (f(b) > f(a) ? b : a));
  const as = peor((r) => r.asCalculadoCm2 / r.asRealCm2);
  const anc = peor((r) => (r.anclaje.comprobado ? r.anclaje.lbdMm / r.anclaje.disponibleMm : 0));
  const cor = peor((r) => (r.vRdCKN > 0 ? r.vEdKN / r.vRdCKN : 0));
  return [
    {
      etiqueta: `Armadura ${nombre}`,
      estado: estado(as.asRealCm2 >= as.asCalculadoCm2),
      detalle: `Md = ${fmt(as.momentoKNm, 1)} kN·m en la sección de cálculo. Sin la mínima, que no depende de la situación.`,
      comparacion: { real: { etiqueta: "As real", valor: as.asRealCm2 }, limite: { etiqueta: "As calc", valor: as.asCalculadoCm2 }, unidad: "cm²", exige: "≥" },
      utilizacion: as.asCalculadoCm2 / as.asRealCm2,
    },
    {
      etiqueta: `Anclaje ${nombre}`,
      estado: anc.anclaje.comprobado ? estado(anc.anclaje.verifica) : "no-aplica",
      comparacion: anc.anclaje.comprobado
        ? { real: { etiqueta: "lbd", valor: anc.anclaje.lbdMm }, limite: { etiqueta: "disponible", valor: anc.anclaje.disponibleMm }, unidad: "mm", exige: "≤" }
        : undefined,
      utilizacion: anc.anclaje.comprobado ? anc.anclaje.lbdMm / anc.anclaje.disponibleMm : undefined,
    },
    {
      etiqueta: `Cortante ${nombre}`,
      estado: cor.vRdCKN > 0 ? estado(cor.verificaCorte) : "no-aplica",
      comparacion:
        cor.vRdCKN > 0
          ? { real: { etiqueta: "Vd", valor: cor.vEdKN }, limite: { etiqueta: "VRd,c", valor: cor.vRdCKN }, unidad: "kN", exige: "≤" }
          : undefined,
      utilizacion: cor.vRdCKN > 0 ? cor.vEdKN / cor.vRdCKN : undefined,
    },
  ];
}

/** Punzonamiento y bielas en la cara del pilar. */
export function filasPunzonamiento(
  p: ResultadoPunzonamiento | ResultadoPunzonamientoDescentrado,
  sufijo = ""
): FilaExtraordinaria[] {
  const evaluado = !p.motivoNoEvaluado;
  return [
    {
      etiqueta: `Punzonamiento${sufijo}`,
      estado: evaluado ? estado(p.verificaPunzonamiento) : "no-evaluado",
      detalle: evaluado ? undefined : p.motivoNoEvaluado,
      comparacion: { real: { etiqueta: "Vd", valor: p.vEdKN }, limite: { etiqueta: "VRd,c", valor: p.vRdCKN }, unidad: "kN", exige: "≤" },
      utilizacion: evaluado ? p.aprovechamiento : undefined,
    },
    {
      etiqueta: `Bielas en la cara del pilar${sufijo}`,
      estado: evaluado ? estado(p.caraPilar.verifica) : "no-evaluado",
      comparacion: { real: { etiqueta: "vEd", valor: p.caraPilar.vEdMPa }, limite: { etiqueta: "vRd,max", valor: p.caraPilar.vRdMaxMPa }, unidad: "MPa", exige: "≤" },
      utilizacion: evaluado ? p.caraPilar.vEdMPa / p.caraPilar.vRdMaxMPa : undefined,
    },
  ];
}

/** Una cara de la combinada a lo largo. */
export function filaCaraCombinada(nombre: string, c: ResultadoCaraCombinada): FilaExtraordinaria {
  return {
    etiqueta: `Armadura ${nombre}`,
    estado: c.necesaria ? estado(!c.flexion.sobrearmada && c.flexion.asRealCm2 >= c.flexion.asCalculadoCm2) : "no-aplica",
    detalle: c.necesaria ? `Md = ${fmt(c.mEdKNm, 1)} kN·m en x = ${fmt(c.xM, 2)} m. Sin la mínima.` : "Ningún tramo tracciona esta cara.",
    comparacion: c.necesaria
      ? { real: { etiqueta: "As real", valor: c.flexion.asRealCm2 }, limite: { etiqueta: "As calc", valor: c.flexion.asCalculadoCm2 }, unidad: "cm²", exige: "≥" }
      : undefined,
    utilizacion: c.necesaria ? c.flexion.asCalculadoCm2 / c.flexion.asRealCm2 : undefined,
  };
}

export function filaCortanteCombinada(c: ResultadoCortanteCombinada): FilaExtraordinaria {
  return {
    etiqueta: "Cortante a lo largo",
    estado: c.vRdCKN > 0 ? estado(c.verifica) : "no-aplica",
    comparacion:
      c.vRdCKN > 0
        ? { real: { etiqueta: "Vd", valor: c.vEdKN }, limite: { etiqueta: "VRd,c", valor: c.vRdCKN }, unidad: "kN", exige: "≤" }
        : undefined,
    utilizacion: c.vRdCKN > 0 ? c.vEdKN / c.vRdCKN : undefined,
  };
}

/** Área y anclaje de la armadura del tirante con su Td accidental. */
export function filasTirante(t: ResultadoArmaduraTirante, sufijo = ""): FilaExtraordinaria[] {
  return [
    {
      etiqueta: `Tirante: área${sufijo}`,
      estado: estado(t.verificaAs),
      comparacion: { real: { etiqueta: "As real", valor: t.asRealCm2 }, limite: { etiqueta: "As nec", valor: t.asNecCm2 }, unidad: "cm²", exige: "≥" },
      utilizacion: t.asNecCm2 / t.asRealCm2,
    },
    {
      etiqueta: `Tirante: anclaje${sufijo}`,
      estado: estado(t.verificaAnclaje),
      comparacion: { real: { etiqueta: "lbd", valor: t.lbdMm }, limite: { etiqueta: "disponible", valor: t.disponibleMm }, unidad: "mm", exige: "≤" },
      utilizacion: t.lbdMm / t.disponibleMm,
    },
  ];
}

/** Las mismas filas para la conclusión de arriba, marcadas como extraordinarias. */
export function resumenExtraordinario(filas: readonly FilaExtraordinaria[]) {
  return filas.map((f) => ({
    etiqueta: `${f.etiqueta.charAt(0).toLowerCase()}${f.etiqueta.slice(1)} (extraordinaria)`,
    estado: f.estado,
    utilizacion: f.utilizacion,
  }));
}
