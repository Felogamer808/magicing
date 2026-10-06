import { resolverMaderaAxil } from "@/lib/calc/madera/resolver-madera-axil";
import { resolverMaderaCortante } from "@/lib/calc/madera/resolver-madera-cortante";
import { resolverMaderaDeformaciones } from "@/lib/calc/madera/resolver-madera-deformaciones";
import { resolverMaderaFlexion } from "@/lib/calc/madera/resolver-madera-flexion";
import { resolverMaderaFlexionCompuesta } from "@/lib/calc/madera/resolver-madera-flexion-compuesta";
import { resolverMaderaSeccionVariable } from "@/lib/calc/madera/resolver-madera-seccion-variable";
import { resolverMaderaUniones } from "@/lib/calc/madera/resolver-madera-uniones";
import { resolverMaderaFuego } from "@/lib/calc/madera/resolver-madera-fuego";
import { recomendarTodas, siNo, type Palanca, type Recomendacion } from "./motor";
import { campo, m, palancaValor, type Campos } from "./palancas";

/**
 * Recomendaciones de las páginas de madera (EC5). Las palancas son las de la
 * escuadría —más canto rinde más que más ancho en flexión, al revés en
 * pandeo lateral— y las de arriostramiento; la clase resistente no se mueve
 * sola porque viene con todas sus resistencias juntas.
 */

type Recs<K extends string> = Partial<Record<K, Recomendacion[]>>;

const escuadria = (nombre: string, rotulo: string, paso: number, extra: number, efectoColateral: string) =>
  palancaValor(campo(nombre), { paso, tope: (x) => x + extra, decimales: 3, rotulo, texto: m, efectoColateral });

const CANTO = escuadria("canto", "h = ", 0.02, 0.6, "Más canto: más madera y más peso propio.");
const ANCHO = escuadria("ancho", "b = ", 0.01, 0.3, "Más ancho: más madera.");

const arriostrar = (nombre: string, rotulo: string) =>
  palancaValor(campo(nombre), {
    paso: -0.25,
    tope: () => 0.25,
    decimales: 2,
    rotulo,
    texto: m,
    efectoColateral: "Hace falta un arriostramiento más a esa distancia.",
  });

// ── Axil ────────────────────────────────────────────────────────────────────

export function recomendarMaderaAxil(campos: Campos): Recs<"traccion" | "compresion" | "perpendicular"> {
  return recomendarTodas(
    {
      datos: campos,
      calcular: resolverMaderaAxil,
      utilizaciones: (r) => ({
        ...(r.rTraccion ? { traccion: r.rTraccion.sigmaT0dMPa / r.rTraccion.ft0dMPa } : {}),
        ...(r.rCompresion ? { compresion: r.rCompresion.sigmaC0dMPa / r.rCompresion.resistenciaReducidaMPa } : {}),
        ...(r.rPerpendicular ? { perpendicular: r.rPerpendicular.sigmaC90dMPa / r.rPerpendicular.resistenciaReducidaMPa } : {}),
      }),
      nombres: { traccion: "tracción paralela", compresion: "compresión paralela", perpendicular: "compresión perpendicular" },
    },
    (clave): readonly Palanca<Campos>[] => {
      if (clave === "perpendicular") {
        return [
          escuadria("largoApoyo", "Largo de apoyo = ", 0.01, 0.3, "Apoyo más largo."),
          escuadria("anchoApoyo", "Ancho de apoyo = ", 0.01, 0.3, "Apoyo más ancho."),
        ];
      }
      if (clave === "compresion") return [ANCHO, CANTO, arriostrar("lkz", "Lk,z = "), arriostrar("lky", "Lk,y = ")];
      return [ANCHO, CANTO];
    }
  );
}

// ── Cortante ────────────────────────────────────────────────────────────────

export function recomendarMaderaCortante(campos: Campos): Recs<"cortante" | "entalladura" | "torsion"> {
  return recomendarTodas(
    {
      datos: campos,
      calcular: resolverMaderaCortante,
      utilizaciones: (r) => ({
        cortante: r.cortante.tauDMPa / r.cortante.fvdMPa,
        ...(r.hay && r.entalladura ? { entalladura: r.entalladura.tauDMPa / r.entalladura.resistenciaReducidaMPa } : {}),
        ...(r.torsion ? { torsion: r.torsion.tauTorDMPa / r.torsion.resistenciaReducidaMPa } : {}),
      }),
      nombres: { cortante: "cortante", entalladura: "entalladura", torsion: "torsión" },
    },
    (clave): readonly Palanca<Campos>[] =>
      clave === "entalladura"
        ? [escuadria("hef", "hef = ", 0.02, 0.5, "Entalladura menos profunda: menos corte en el apoyo."), ANCHO]
        : [ANCHO, CANTO]
  );
}

// ── Deformaciones ───────────────────────────────────────────────────────────

/** Las claves son los rótulos de cada flecha, como los muestra la página. */
export function recomendarMaderaDeformaciones(campos: Campos): Recs<string> {
  return recomendarTodas<Campos, NonNullable<ReturnType<typeof resolverMaderaDeformaciones>>, string>(
    {
      datos: campos,
      calcular: resolverMaderaDeformaciones,
      utilizaciones: (r) => Object.fromEntries(r.comprobaciones.map((c) => [c.etiqueta, c.valorMm / c.limiteMm])),
      nombres: new Proxy({} as Record<string, string>, { get: (_, k) => String(k) }),
    },
    () => [CANTO, ANCHO]
  );
}

// ── Flexión ─────────────────────────────────────────────────────────────────

export function recomendarMaderaFlexion(campos: Campos): Recs<"flexion" | "vuelco"> {
  return recomendarTodas(
    {
      datos: campos,
      calcular: resolverMaderaFlexion,
      utilizaciones: (r) => ({
        flexion: r.esviada.aprovechamiento,
        ...(r.vuelco ? { vuelco: r.vuelco.sigmaMdMPa / r.vuelco.resistenciaReducidaMPa } : {}),
      }),
      nombres: { flexion: "flexión", vuelco: "vuelco lateral" },
    },
    (clave): readonly Palanca<Campos>[] =>
      // El vuelco lateral depende de b²: el ancho rinde más que el canto.
      clave === "vuelco" ? [ANCHO, CANTO] : [CANTO, ANCHO]
  );
}

// ── Flexión compuesta ───────────────────────────────────────────────────────

export function recomendarMaderaFlexionCompuesta(campos: Campos): Recs<"interaccion"> {
  return recomendarTodas(
    {
      datos: campos,
      calcular: resolverMaderaFlexionCompuesta,
      utilizaciones: (r) => ({ interaccion: r.resultado.aprovechamiento }),
      nombres: { interaccion: "interacción" },
    },
    () => [CANTO, ANCHO, arriostrar("lkz", "Lk,z = "), arriostrar("lky", "Lk,y = ")]
  );
}

// ── Sección variable ────────────────────────────────────────────────────────

export function recomendarMaderaSeccionVariable(campos: Campos): Recs<"borde" | "vertice" | "traccion90"> {
  const vertice = escuadria("cantoVertice", "Canto en el vértice = ", 0.05, 1, "Más madera en la cumbrera.");
  const apoyo = escuadria("cantoApoyo", "Canto en el apoyo = ", 0.05, 1, "Más madera en los apoyos.");
  return recomendarTodas(
    {
      datos: campos,
      calcular: resolverMaderaSeccionVariable,
      utilizaciones: (r) => ({
        borde: r.critica.sigmaMdMPa / r.resistenciaBorde,
        ...(r.vertice
          ? {
              vertice: r.vertice.sigmaMdMPa / r.vertice.resistenciaFlexionMPa,
              traccion90: r.vertice.sigmaT90dMPa / r.vertice.resistenciaT90MPa,
            }
          : {}),
      }),
      nombres: { borde: "borde inclinado", vertice: "flexión en el vértice", traccion90: "tracción perpendicular en el vértice" },
    },
    (clave): readonly Palanca<Campos>[] => (clave === "borde" ? [apoyo, ANCHO] : [vertice, ANCHO])
  );
}

// ── Uniones ─────────────────────────────────────────────────────────────────

const DIAMETROS_CLAVIJA = [6, 8, 10, 12, 16, 20, 24];

export function recomendarMaderaUniones(campos: Campos): Recs<"union"> {
  const diametro: Palanca<Campos> = {
    efectoColateral: "Clavija más gruesa: distancias mínimas mayores.",
    *candidatos(e) {
      const hoy = campo("d").leer(e);
      for (const d of DIAMETROS_CLAVIJA.filter((x) => x > hoy)) {
        yield { datos: { ...e, d: String(d) }, accion: `Ø${d} mm (hoy Ø${hoy})` };
      }
    },
  };
  const medios = palancaValor(campo("nMedios"), {
    paso: 1,
    tope: (n) => n + 8,
    decimales: 0,
    rotulo: "Medios de unión: ",
    texto: String,
    efectoColateral: "Más clavijas: la pieza tiene que alcanzar para las separaciones.",
  });
  return recomendarTodas(
    {
      datos: campos,
      calcular: resolverMaderaUniones,
      utilizaciones: (r) => ({ union: r.aprovechamiento }),
      nombres: { union: "capacidad de la unión" },
    },
    () => [medios, diametro]
  );
}

// ── Incendio ────────────────────────────────────────────────────────────────

type ClaveFuego = "seccion" | "flexion" | "compresion";

export function recomendarMaderaFuego(campos: Campos): Recs<ClaveFuego> {
  return recomendarTodas<Campos, NonNullable<ReturnType<typeof resolverMaderaFuego>>, ClaveFuego>(
    {
      datos: campos,
      calcular: resolverMaderaFuego,
      utilizaciones: (r): Partial<Record<ClaveFuego, number>> =>
        r.agotada
          ? { seccion: siNo(false) }
          : { flexion: r.aprovechaFlexion, ...(r.sigmaC > 0 ? { compresion: r.aprovechaCompresion } : {}) },
      nombres: { seccion: "sección eficaz", flexion: "flexión en incendio", compresion: "compresión en incendio" },
      binarias: ["seccion"],
    },
    // La carbonización come lo mismo de cada cara expuesta: la escuadría
    // que más rinde es la que queda más chica después de quemarse.
    (clave): readonly Palanca<Campos>[] => (clave === "flexion" ? [CANTO, ANCHO] : [ANCHO, CANTO])
  );
}
