import { resolverCargaColgada, type ResueltoCargaColgada } from "@/lib/calc/hormigon/vigas/resolver-carga-colgada";
import { recomendarTodas, type Recomendacion } from "./motor";
import { campo, m, palancaValor, type Campos } from "./palancas";

export type ClaveCargaColgada = "canto";
export type RecomendacionesCargaColgada = Partial<Record<ClaveCargaColgada, Recomendacion[]>>;

const utilizaciones = ({ r, v }: ResueltoCargaColgada) => ({ canto: r.cantoMinimoM / v.h });

const CANTO = palancaValor(campo("h"), {
  paso: 0.05,
  tope: (h) => h + 1,
  decimales: 2,
  rotulo: "h = ",
  texto: m,
  efectoColateral: "Más canto en la viga que recibe: más peso propio.",
});

/** Propuestas para el canto mínimo del cuelgue, si no cumple o queda justo. */
export function recomendarCargaColgada(campos: Campos): RecomendacionesCargaColgada {
  return recomendarTodas(
    { datos: campos, calcular: resolverCargaColgada, utilizaciones, nombres: { canto: "canto para las bielas" } },
    () => [CANTO]
  );
}
