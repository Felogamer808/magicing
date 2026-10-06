import { CLASES, resolverTornillos, type ResueltoTornillos } from "@/lib/calc/acero/resolver-tornillos";
import { recomendarTodas, type Palanca, type Recomendacion } from "./motor";
import { campo, palancaOpcion, palancaValor, type Campos } from "./palancas";

export type ClaveTornillos = "bulon" | "traccion" | "deslizamiento" | "bloque";
export type RecomendacionesTornillos = Partial<Record<ClaveTornillos, Recomendacion[]>>;

const NOMBRES: Record<ClaveTornillos, string> = {
  bulon: "bulón más exigido",
  traccion: "tracción con corte",
  deslizamiento: "deslizamiento",
  bloque: "bloque de corte",
};

function utilizaciones(r: ResueltoTornillos): Partial<Record<ClaveTornillos, number>> {
  return {
    bulon: r.critico.vKN / r.bulon.admisibleKN,
    ...(r.traccion ? { traccion: r.traccionReqKN / r.traccion.admisibleKN } : {}),
    ...(r.deslizamiento ? { deslizamiento: r.critico.vKN / r.deslizamiento.admisibleKN } : {}),
    ...(r.bloque ? { bloque: r.fuerzaUnionKN / r.bloque.admisibleKN } : {}),
  };
}

// ── Palancas ────────────────────────────────────────────────────────────────

/** Diámetros de bulón habituales, en mm. */
const DIAMETROS_BULON = [12, 16, 20, 22, 24, 27, 30];

const DIAMETRO: Palanca<Campos> = {
  efectoColateral: "Bulón más grueso: agujeros y distancias a bordes mayores.",
  *candidatos(e) {
    const hoy = campo("diametro").leer(e);
    for (const d of DIAMETROS_BULON.filter((x) => x > hoy)) {
      yield { datos: { ...e, diametro: String(d) }, accion: `Bulones Ø${d} mm (hoy Ø${hoy})` };
    }
  },
};

const unaMas = (nombre: "filas" | "columnas", rotulo: string) =>
  palancaValor(campo(nombre), {
    paso: 1,
    tope: (n) => n + 4,
    decimales: 0,
    rotulo,
    texto: String,
    efectoColateral: "Más bulones: la chapa tiene que alcanzar para la grilla.",
  });

const GRADO = palancaOpcion<Campos>((e) => e.grado === "A307", (e) => ({ ...e, grado: "A325" }), "Bulones A325 (hoy A307)", {
  efectoColateral: "Bulón de alta resistencia.",
});

const DOBLE_CORTE = palancaOpcion<Campos>(
  (e) => campo("planosDeCorte").leer(e) < 2,
  (e) => ({ ...e, planosDeCorte: "2" }),
  "Doble cortadura: cubrejuntas a los dos lados (hoy simple)",
  { efectoColateral: "Una chapa más del otro lado." }
);

const ESPESOR = palancaValor(campo("espesor1"), {
  paso: 2,
  tope: (t) => t + 16,
  decimales: 0,
  rotulo: "Chapa = ",
  texto: (t) => `${t} mm`,
  efectoColateral: "Chapa más gruesa: más aplastamiento admisible en el agujero.",
});

const CLASE_B = palancaOpcion<Campos>((e) => e.clase !== CLASES[1], (e) => ({ ...e, clase: CLASES[1] }), `Superficie ${CLASES[1]} (hoy ${CLASES[0]})`, {
  efectoColateral: "Preparación de superficie de clase B: arenado sin pintar.",
});

const LARGO_BLOQUE = palancaValor(campo("corteLargo"), {
  paso: 20,
  tope: (l) => l + 300,
  decimales: 0,
  rotulo: "Largo en corte = ",
  texto: (l) => `${l} mm`,
  efectoColateral: "Bulones más separados o una fila más a lo largo.",
});

function palancasPorClave(clave: ClaveTornillos): readonly Palanca<Campos>[] {
  switch (clave) {
    case "bulon":
      return [DIAMETRO, unaMas("filas", "Filas: "), unaMas("columnas", "Columnas: "), DOBLE_CORTE, GRADO, ESPESOR];
    case "traccion":
      return [DIAMETRO, GRADO];
    case "deslizamiento":
      return [CLASE_B, unaMas("filas", "Filas: "), unaMas("columnas", "Columnas: ")];
    case "bloque":
      return [LARGO_BLOQUE];
  }
}

/** Propuestas para cada comprobación de la unión abulonada que no cumple o queda justa. */
export function recomendarTornillos(campos: Campos): RecomendacionesTornillos {
  return recomendarTodas({ datos: campos, calcular: resolverTornillos, utilizaciones, nombres: NOMBRES }, palancasPorClave);
}
