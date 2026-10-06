import type { ClaseSuperficie } from "@/lib/calc/acero/tornillos";
import type { TipoAgujeroDeslizamiento } from "@/lib/calc/acero/tornillos";
import type { PosicionBulon } from "@/lib/calc/acero/tornillos";
import { aNumero } from "@/lib/verificaciones/formato";
import { bulonMasExigido, calcularBloqueDeCorte, interaccionTraccionCorteKN, repartoElasticoBulones, resistenciaBulonKN, resistenciaDeslizamientoKN, type GradoBulon } from "@/lib/calc/acero/tornillos";

export const GRADOS: readonly GradoBulon[] = ["A325", "A307"];
export const DEFORMACION = ["Controlada (agujeros estándar)", "No controlada"] as const;
export const DOS_CHAPAS = ["Una chapa", "Dos chapas"] as const;
export const HAY_BLOQUE = ["No corresponde", "Sí, verificar"] as const;
export const HAY_TRACCION = ["No corresponde", "Sí, verificar"] as const;
export const UBS = ["Uniforme (Ubs = 1,0)", "No uniforme (Ubs = 0,5)"] as const;
export const HAY_DESLIZAMIENTO = ["No, conexión de contacto", "Sí, slip-critical"] as const;
export const CLASES = ["Clase A (μ = 0,30)", "Clase B (μ = 0,50)"] as const;
export const CLASE_MAP: Record<(typeof CLASES)[number], ClaseSuperficie> = {
  "Clase A (μ = 0,30)": "A",
  "Clase B (μ = 0,50)": "B",
};
export const TIPOS_AGUJERO = ["Estándar (φ=1,00)", "Agrandado o ranura corta paralela (φ=0,85)", "Ranura alargada (φ=0,70)"] as const;
export const TIPO_AGUJERO_MAP: Record<(typeof TIPOS_AGUJERO)[number], TipoAgujeroDeslizamiento> = {
  "Estándar (φ=1,00)": "estandar",
  "Agrandado o ranura corta paralela (φ=0,85)": "agrandado",
  "Ranura alargada (φ=0,70)": "ranuraAlargada",
};

/** Grilla centrada en su propio centroide: es la hipótesis que pide el método elástico. */
export function grillaBulones(filas: number, columnas: number, sxM: number, syM: number): PosicionBulon[] {
  const posiciones: PosicionBulon[] = [];
  for (let f = 0; f < filas; f++) {
    for (let c = 0; c < columnas; c++) {
      posiciones.push({
        xM: (c - (columnas - 1) / 2) * sxM,
        yM: (f - (filas - 1) / 2) * syM,
      });
    }
  }
  return posiciones;
}

/**
 * Cálculo de la página a partir de sus campos, tal como se cargaron.
 *
 * Vive acá y no en la página porque lo corren la pantalla y las
 * recomendaciones, que lo repiten con un dato cambiado: con dos copias, tarde
 * o temprano dirían números distintos.
 */
export function resolverTornillos(campos: Record<string, string>) {
  const num = (clave: string) => aNumero(campos[clave] ?? "");

  const n = {
    filas: Math.round(num("filas")), columnas: Math.round(num("columnas")),
    sx: num("sx"), sy: num("sy"),
    fx: num("fx"), fy: num("fy"), m: num("momento"),
    d: num("diametro"), planos: Math.round(num("planosDeCorte")),
    e1: num("espesor1"), fu1: num("fu1"), lc1: num("lc1"),
  };
  if (![n.filas, n.columnas].every((x) => Number.isInteger(x) && x > 0)) return null;
  if (![n.sx, n.sy, n.d, n.e1, n.fu1, n.lc1].every((x) => Number.isFinite(x) && x > 0)) return null;
  if (![n.fx, n.fy, n.m].every((x) => Number.isFinite(x))) return null;
  if (!Number.isInteger(n.planos) || n.planos <= 0) return null;

  const bulones = grillaBulones(n.filas, n.columnas, n.sx, n.sy);
  const fuerzas = repartoElasticoBulones(bulones, n.fx, n.fy, n.m);
  const critico = bulonMasExigido(fuerzas);
  if (!critico) return null;

  const chapas = [
    {
      espesorMm: n.e1, distanciaLibreMm: n.lc1, fuPa: n.fu1 * 1e6,
      deformacionControlada: campos.deformacion1 === DEFORMACION[0],
    },
  ];
  if (campos.dosChapas === DOS_CHAPAS[1]) {
    const e2 = num("espesor2");
    const f2 = num("fu2");
    const l2 = num("lc2");
    if (![e2, f2, l2].every((x) => Number.isFinite(x) && x > 0)) return null;
    chapas.push({
      espesorMm: e2, distanciaLibreMm: l2, fuPa: f2 * 1e6,
      deformacionControlada: campos.deformacion2 === DEFORMACION[0],
    });
  }

  const bulon = resistenciaBulonKN({
    diametroMm: n.d,
    grado: campos.grado as GradoBulon,
    planosDeCorte: n.planos,
    chapas,
  });

  let traccion: ReturnType<typeof interaccionTraccionCorteKN> | null = null;
  let traccionReqKN = 0;
  if (campos.hayTraccion === HAY_TRACCION[1]) {
    traccionReqKN = num("traccionReq");
    if (!(Number.isFinite(traccionReqKN) && traccionReqKN >= 0)) return null;
    traccion = interaccionTraccionCorteKN({
      diametroMm: n.d,
      grado: campos.grado as GradoBulon,
      vReqKN: critico.vKN,
      planosDeCorte: n.planos,
    });
  }

  let deslizamiento: ReturnType<typeof resistenciaDeslizamientoKN> | null = null;
  if (campos.hayDeslizamiento === HAY_DESLIZAMIENTO[1]) {
    const tbKN = num("tb");
    const relleno = Math.round(num("chapasDeRelleno"));
    if (!(Number.isFinite(tbKN) && tbKN > 0)) return null;
    if (!(Number.isInteger(relleno) && relleno >= 0)) return null;
    deslizamiento = resistenciaDeslizamientoKN({
      clase: CLASE_MAP[campos.clase as (typeof CLASES)[number]],
      tipoAgujero: TIPO_AGUJERO_MAP[campos.tipoAgujeroDesl as (typeof TIPOS_AGUJERO)[number]],
      tbKN,
      planosDeFriccion: n.planos,
      chapasDeRelleno: relleno,
    });
  }

  let bloque: ReturnType<typeof calcularBloqueDeCorte> | null = null;
  if (campos.hayBloque === HAY_BLOQUE[1]) {
    const cl = num("corteLargo");
    const ce = num("corteEspesor");
    const ca = Math.round(num("corteAgujeros"));
    const ta = num("traccionAncho");
    const te = num("traccionEspesor");
    const tan = Math.round(num("traccionAgujeros"));
    const dAg = num("diametroAgujeroBloque");
    if (![cl, ce, ta, te, dAg].every((x) => Number.isFinite(x) && x > 0)) return null;
    if (![ca, tan].every((x) => Number.isInteger(x) && x >= 0)) return null;

    bloque = calcularBloqueDeCorte({
      planoCorte: {
        areaBrutaM2: (cl * ce) / 1e6,
        agujeros: Array.from({ length: ca }, () => ({ diametroMm: dAg, espesorMm: ce })),
      },
      planoTraccion: {
        areaBrutaM2: (ta * te) / 1e6,
        agujeros: Array.from({ length: tan }, () => ({ diametroMm: dAg, espesorMm: te })),
      },
      ubs: campos.ubs === UBS[0] ? 1.0 : 0.5,
      fyPa: 248e6, // A36; se podría exponer como dato si hiciera falta otro acero
      fuPa: n.fu1 * 1e6,
    });
  }

  // El bloque se arranca con toda la fuerza que la unión le pasa a la pieza,
  // no con la de un bulón: es la resultante en el plano. El campos.momento sólo
  // reparte entre bulones y no suma fuerza neta.
  const fuerzaUnionKN = Math.hypot(n.fx, n.fy);

  return { bulones, fuerzas, critico, bulon, traccion, traccionReqKN, deslizamiento, bloque, fuerzaUnionKN, n };
}

export type ResueltoTornillos = NonNullable<ReturnType<typeof resolverTornillos>>;
