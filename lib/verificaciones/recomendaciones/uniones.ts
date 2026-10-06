import {
  resolverChapaBase,
  resolverSoldadura,
  type ResueltoChapaBase,
  type ResueltoSoldadura,
} from "@/lib/calc/acero/resolver-uniones";
import { recomendarTodas, type Palanca, type Recomendacion } from "./motor";
import { campo, palancaFck, palancaValor, type Campos } from "./palancas";

export type ClaveUniones =
  | "soldadura"
  | "aplastamientoHormigon"
  | "aplastamientoChapa"
  | "traccionChapa"
  | "cortePernos"
  | "traccionPernos";
export type RecomendacionesUniones = Partial<Record<ClaveUniones, Recomendacion[]>>;

const NOMBRES: Record<ClaveUniones, string> = {
  soldadura: "tensión en el cordón",
  aplastamientoHormigon: "aplastamiento del hormigón",
  aplastamientoChapa: "aplastamiento de la chapa",
  traccionChapa: "tracción en la chapa",
  cortePernos: "corte en los pernos",
  traccionPernos: "tracción en los pernos",
};

interface Uniones {
  soldadura: ResueltoSoldadura | null;
  chapa: ResueltoChapaBase | null;
}

const cociente = (x: { solicitacionKN: number; admisibleKN: number }) => x.solicitacionKN / x.admisibleKN;

function utilizaciones({ soldadura, chapa }: Uniones): Partial<Record<ClaveUniones, number>> {
  return {
    ...(soldadura ? { soldadura: soldadura.tauKPa / soldadura.tauAdmKPa } : {}),
    ...(chapa
      ? {
          aplastamientoHormigon: cociente(chapa.aplastamientoHormigon),
          aplastamientoChapa: cociente(chapa.aplastamientoChapa),
          traccionChapa: cociente(chapa.traccionChapa),
          cortePernos: cociente(chapa.cortePernos),
          traccionPernos: cociente(chapa.traccionPernos),
        }
      : {}),
  };
}

// ── Palancas ────────────────────────────────────────────────────────────────

const LADO = palancaValor(campo("lado"), {
  paso: 1.5,
  tope: (d) => d + 10,
  decimales: 1,
  rotulo: "Lado del cordón = ",
  texto: (d) => `${d.toLocaleString("es-AR")} mm`,
  efectoColateral: "Cordón más grande: revisar que quede dentro del rango para los espesores.",
});

const ELECTRODO: Palanca<Campos> = {
  efectoColateral: "Electrodo de mayor resistencia.",
  *candidatos(e) {
    const orden = ["E60", "E70", "E80"];
    for (const el of orden.slice(orden.indexOf(e.electrodo ?? "E60") + 1)) {
      yield { datos: { ...e, electrodo: el }, accion: `Electrodo ${el} (hoy ${e.electrodo})` };
    }
  },
};

const metros = (nombre: string, rotulo: string) =>
  palancaValor(campo(nombre), {
    paso: 0.05,
    tope: (x) => x + 0.5,
    decimales: 2,
    rotulo,
    texto: (v) => `${v.toLocaleString("es-AR", { minimumFractionDigits: 2 })} m`,
    efectoColateral: "Chapa de base más grande.",
  });

const ESPESOR_CHAPA: Palanca<Campos> = {
  efectoColateral: "Chapa más gruesa.",
  *candidatos(e) {
    const hoy = campo("tChapa").leer(e);
    // Espesores comerciales en mm.
    for (const t of [9.5, 12.7, 15.9, 19.1, 22.2, 25.4, 31.8, 38.1].filter((x) => x / 1000 > hoy + 1e-9)) {
      yield { datos: { ...e, tChapa: String(t / 1000) }, accion: `Chapa de ${t.toLocaleString("es-AR")} mm (hoy ${(hoy * 1000).toLocaleString("es-AR")} mm)` };
    }
  },
};

const PERNO: Palanca<Campos> = {
  efectoColateral: "Perno más grueso: agujeros más grandes en la chapa.",
  *candidatos(e) {
    const hoy = campo("dPerno").leer(e);
    for (const d of [12, 15, 16, 19, 20, 22, 24, 25, 27, 30].filter((x) => x > hoy)) {
      yield { datos: { ...e, dPerno: String(d) }, accion: `Pernos Ø${d} mm (hoy Ø${hoy})` };
    }
  },
};

const MAS_PERNOS = palancaValor(campo("nPernos"), {
  paso: 2,
  tope: (n) => n + 8,
  decimales: 0,
  rotulo: "Pernos: ",
  texto: String,
  efectoColateral: "Más pernos: la chapa tiene que alcanzar para ubicarlos.",
});

function palancasPorClave(clave: ClaveUniones): readonly Palanca<Campos>[] {
  switch (clave) {
    case "soldadura":
      return [LADO, ELECTRODO];
    case "aplastamientoHormigon":
      return [metros("lx", "Lx = "), metros("ly", "Ly = "), palancaFck(campo("fck"))];
    case "aplastamientoChapa":
    case "traccionChapa":
      return [ESPESOR_CHAPA];
    case "cortePernos":
    case "traccionPernos":
      return [PERNO, MAS_PERNOS];
  }
}

/** Propuestas para el cordón y la chapa de base, si algo no cumple o queda justo. */
export function recomendarUniones(campos: Campos): RecomendacionesUniones {
  return recomendarTodas(
    {
      datos: campos,
      calcular: (c): Uniones | null => {
        const r = { soldadura: resolverSoldadura(c), chapa: resolverChapaBase(c) };
        return r.soldadura || r.chapa ? r : null;
      },
      utilizaciones,
      nombres: NOMBRES,
    },
    palancasPorClave
  );
}
