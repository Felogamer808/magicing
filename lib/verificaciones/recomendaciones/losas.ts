import { resolverLosa, type ResueltoLosa } from "@/lib/calc/hormigon/losas/resolver-losa";
import { recomendarTodas, type Palanca, type Recomendacion } from "./motor";
import { campo, m, palancaDiametro, palancaFck, palancaValor, type Campos } from "./palancas";

/** Las cuatro mallas, con el sufijo de sus campos: phiPosX, sPosX… */
const MALLAS = ["PosX", "PosY", "NegX", "NegY"] as const;
type Malla = (typeof MALLAS)[number];
export type ClaveLosa = `as${Malla}` | `sep${Malla}`;
export type RecomendacionesLosa = Partial<Record<ClaveLosa, Recomendacion[]>>;

const NOMBRE_MALLA: Record<Malla, string> = {
  PosX: "positivo X",
  PosY: "positivo Y",
  NegX: "negativo X",
  NegY: "negativo Y",
};

const NOMBRES = Object.fromEntries(
  MALLAS.flatMap((k) => [
    [`as${k}`, `armado ${NOMBRE_MALLA[k]}`],
    [`sep${k}`, `separación ${NOMBRE_MALLA[k]}`],
  ])
) as Record<ClaveLosa, string>;

const direccion = (r: ResueltoLosa, k: Malla) =>
  k === "PosX" ? r.losa.positivo.x : k === "PosY" ? r.losa.positivo.y : k === "NegX" ? r.losa.negativo.x : r.losa.negativo.y;

/** Separación máxima constructiva, Anejo 19 art. 9.3.1.1 (3): mín(3h, 300 mm). */
const separacionMaxima = (r: ResueltoLosa) => Math.min(3 * r.v.e, 0.3);

function utilizaciones(r: ResueltoLosa): Record<ClaveLosa, number> {
  const s: Record<Malla, number> = { PosX: r.v.sPosX, PosY: r.v.sPosY, NegX: r.v.sNegX, NegY: r.v.sNegY };
  return Object.fromEntries(
    MALLAS.flatMap((k) => [
      [`as${k}`, direccion(r, k).aprovechamiento],
      [`sep${k}`, s[k] / separacionMaxima(r)],
    ])
  ) as Record<ClaveLosa, number>;
}

// ── Palancas ────────────────────────────────────────────────────────────────

const ESPESOR = palancaValor(campo("e"), {
  paso: 0.01,
  tope: (e) => e + 0.2,
  decimales: 2,
  rotulo: "h = ",
  texto: m,
  efectoColateral: "Más espesor: más peso propio, que hay que volver a sumar a los momentos.",
});
const FCK = palancaFck(campo("fck"));

const textoMalla = (d: number, s: number) => `Ø${d} c/${s.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;

const separacion = (k: Malla) =>
  palancaValor(campo(`s${k}`), {
    paso: -0.01,
    tope: () => 0.05,
    decimales: 2,
    rotulo: `${NOMBRE_MALLA[k]}: `,
    texto: (s, e) => textoMalla(campo(`phi${k}`).leer(e), s),
    efectoColateral: "Más barras por metro.",
  });

const diametro = (k: Malla) =>
  palancaDiametro(campo(`phi${k}`), "mayor", (e, d) => textoMalla(d, campo(`s${k}`).leer(e)), {
    rotulo: `${NOMBRE_MALLA[k]}: `,
    efectoColateral: "Diámetro mayor: pide más anclaje.",
  });

function palancasPorClave(clave: ClaveLosa): readonly Palanca<Campos>[] {
  const k = clave.slice(clave.startsWith("as") ? 2 : 3) as Malla;
  if (clave.startsWith("sep")) return [separacion(k)];
  return [separacion(k), diametro(k), ESPESOR, FCK];
}

/** Propuestas para cada malla de la losa que no cumple o queda justa. */
export function recomendarLosa(campos: Campos): RecomendacionesLosa {
  return recomendarTodas({ datos: campos, calcular: resolverLosa, utilizaciones, nombres: NOMBRES }, palancasPorClave);
}
