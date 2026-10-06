import {
  resolverZonaParcialmenteCargada,
  type ResueltoZonaParcialmenteCargada,
} from "@/lib/calc/hormigon/resolver-zona-parcialmente-cargada";
import { recomendarTodas, type Recomendacion } from "./motor";
import { campo, m, palancaFck, palancaValor, type Campos } from "./palancas";

export type ClaveZonaCargada = "aplastamiento";
export type RecomendacionesZonaCargada = Partial<Record<ClaveZonaCargada, Recomendacion[]>>;

const utilizaciones = ({ r, v }: ResueltoZonaParcialmenteCargada) => ({ aplastamiento: v.nEd / r.fRduKN });

/** Agrandar el área cargada: una placa de apoyo más grande reparte la carga. */
const lado = (nombre: "b1" | "d1") =>
  palancaValor(campo(nombre), {
    paso: 0.01,
    tope: (v) => v + 0.5,
    decimales: 2,
    rotulo: `${nombre} = `,
    texto: m,
    efectoColateral: "Placa de apoyo más grande.",
    cita: "Anejo 19, art. 6.7 (2), ec. (6.63), pág. 101",
  });

/** Propuestas para la compresión concentrada, si no cumple o queda justa. */
export function recomendarZonaParcialmenteCargada(campos: Campos): RecomendacionesZonaCargada {
  return recomendarTodas(
    {
      datos: campos,
      calcular: resolverZonaParcialmenteCargada,
      utilizaciones,
      nombres: { aplastamiento: "compresión concentrada" },
    },
    () => [lado("b1"), lado("d1"), palancaFck(campo("fck"))]
  );
}
