import { resolverCompresionAcero } from "@/lib/calc/acero/resolver-compresion";
import { resolverCorteAcero } from "@/lib/calc/acero/resolver-corte";
import { resolverFlexionAcero } from "@/lib/calc/acero/resolver-flexion";
import { resolverFlexoCompresion } from "@/lib/calc/acero/resolver-flexo-compresion";
import { resolverTraccionAcero } from "@/lib/calc/acero/resolver-traccion";
import { aNumero } from "@/lib/verificaciones/formato";
import { recomendarTodas, type Palanca, type Recomendacion } from "./motor";
import { campo, m, palancaValor, type Campos } from "./palancas";
import { SECCION, fyMayor, longitudMenor } from "./palancas-acero";

/**
 * Recomendaciones de las páginas de metálicas de una sola comprobación
 * resistente. La demanda (P, M o V requeridos) no se mueve: es dato de la
 * estructura, así que se lee de los campos de hoy y se divide por la
 * capacidad que da cada propuesta.
 */

const EFECTO_ARRIOSTRAR = "Hace falta un arriostramiento más: una correa, un tensor o una riostra.";

// ── Tracción ────────────────────────────────────────────────────────────────

export type RecomendacionesTraccion = Partial<Record<"traccion", Recomendacion[]>>;

export function recomendarTraccionAcero(campos: Campos): RecomendacionesTraccion {
  const p = aNumero(campos.pRequerida ?? "");
  return recomendarTodas(
    {
      datos: campos,
      calcular: resolverTraccionAcero,
      utilizaciones: (r) => ({ traccion: p / r.admisibleKN }),
      nombres: { traccion: "tracción admisible" },
    },
    () => [...SECCION, fyMayor("fy")]
  );
}

// ── Compresión ──────────────────────────────────────────────────────────────

export type RecomendacionesCompresion = Partial<Record<"compresion" | "conectores", Recomendacion[]>>;

export function recomendarCompresionAcero(campos: Campos): RecomendacionesCompresion {
  const p = aNumero(campos.pRequerida ?? "");
  const a = aNumero(campos.separacionConectores ?? "");
  return recomendarTodas(
    {
      datos: campos,
      calcular: resolverCompresionAcero,
      utilizaciones: (r) => ({
        compresion: p / r.admisibleKN,
        ...(r.columnaArmada ? { conectores: a / r.columnaArmada.separacionMaximaM } : {}),
      }),
      nombres: { compresion: "compresión admisible", conectores: "separación entre conectores" },
    },
    (clave): readonly Palanca<Campos>[] =>
      clave === "conectores"
        ? [palancaValor(campo("separacionConectores"), { paso: -0.05, tope: () => 0.05, decimales: 2, rotulo: "a = ", texto: m })]
        : [
            ...SECCION,
            longitudMenor("lcy", "Lc,y = ", EFECTO_ARRIOSTRAR),
            longitudMenor("lcx", "Lc,x = ", EFECTO_ARRIOSTRAR),
            fyMayor("fy"),
          ]
  );
}

// ── Flexión ─────────────────────────────────────────────────────────────────

export type RecomendacionesFlexion = Partial<Record<"flexion", Recomendacion[]>>;

export function recomendarFlexionAcero(campos: Campos): RecomendacionesFlexion {
  const mReq = aNumero(campos.mRequerido ?? "");
  return recomendarTodas(
    {
      datos: campos,
      calcular: resolverFlexionAcero,
      utilizaciones: (r) => ({ flexion: mReq / r.admisibleKNm }),
      nombres: { flexion: "momento admisible" },
    },
    () => [...SECCION, longitudMenor("lb", "Lb = ", EFECTO_ARRIOSTRAR), fyMayor("fyFlexion")]
  );
}

// ── Corte ───────────────────────────────────────────────────────────────────

export type RecomendacionesCorte = Partial<Record<"corte", Recomendacion[]>>;

export function recomendarCorteAcero(campos: Campos): RecomendacionesCorte {
  const v = aNumero(campos.vRequerido ?? "");
  return recomendarTodas(
    {
      datos: campos,
      calcular: resolverCorteAcero,
      utilizaciones: (r) => ({ corte: v / r.admisibleKN }),
      nombres: { corte: "corte admisible" },
    },
    () => [...SECCION, fyMayor("fyCorte")]
  );
}

// ── Flexocompresión ─────────────────────────────────────────────────────────

export type RecomendacionesFlexoCompresion = Partial<Record<"interaccion", Recomendacion[]>>;

export function recomendarFlexoCompresion(campos: Campos): RecomendacionesFlexoCompresion {
  return recomendarTodas(
    {
      datos: campos,
      calcular: resolverFlexoCompresion,
      utilizaciones: (r) => ({ interaccion: r.interaccion }),
      nombres: { interaccion: "interacción" },
    },
    () => [
      ...SECCION,
      longitudMenor("lbFC", "Lb = ", EFECTO_ARRIOSTRAR),
      longitudMenor("lcyFC", "Lc,y = ", EFECTO_ARRIOSTRAR),
      fyMayor("fyFC"),
    ]
  );
}
