import { aNumero } from "@/lib/verificaciones/formato";
import { seccionDesdeCampos } from "@/lib/calc/acero/seccion-campos";
import type { Familia } from "@/lib/calc/acero/perfiles";
import { calcularTraccion, factorUCaso2, type AgujeroTraccion, type PasoZigzag } from "@/lib/calc/acero/traccion";

export const SECCION_CRITICA = ["Sin agujeros", "Con agujeros"] as const;
export const CADENA = ["Recta", "En zigzag"] as const;
export const TRANSMISION = [
  "Toda la sección (U = 1)",
  "Parcial — Caso 2: U = 1 − x̄/L",
  "U conocido, de otro caso de la tabla D3.1",
] as const;

/**
 * Cálculo de la página a partir de sus campos, tal como se cargaron.
 *
 * Vive acá y no en la página porque lo corren la pantalla y las
 * recomendaciones, que lo repiten con un dato cambiado: con dos copias, tarde
 * o temprano dirían números distintos.
 */
export function resolverTraccionAcero(campos: Record<string, string>) {
  const num = (clave: string) => aNumero(campos[clave] ?? "");
  const sec = seccionDesdeCampos((campos.familia ?? "") as Familia, campos.params ?? "");

  const n = { l: num("lM"), fy: num("fy"), fu: num("fu"), p: num("pRequerida") };
  if (!sec.completos) return null;
  if (!Object.values(n).every((x) => Number.isFinite(x) && x > 0)) return null;

  const hayAgujeros = campos.seccionCritica === SECCION_CRITICA[1];
  let agujeros: AgujeroTraccion[] | undefined;
  let zigzag: PasoZigzag[] | undefined;

  if (hayAgujeros) {
    const cantidad = num("nAgujeros");
    const diametro = num("diametroAgujero");
    const espesor = num("espesorAgujero");
    if (![cantidad, diametro, espesor].every((x) => Number.isFinite(x) && x > 0)) return null;
    agujeros = Array.from({ length: Math.round(cantidad) }, () => ({
      diametroMm: diametro,
      espesorMm: espesor,
    }));

    if (campos.cadena === CADENA[1]) {
      const s = num("zigzagS");
      const g = num("zigzagG");
      if (![s, g].every((x) => Number.isFinite(x) && x > 0)) return null;
      zigzag = [{ sMm: s, gMm: g, espesorMm: espesor }];
    }
  }

  let u: number | undefined;
  if (campos.transmision === TRANSMISION[1]) {
    const x = num("xBarra");
    const largo = num("largoConexion");
    if (![x, largo].every((v) => Number.isFinite(v) && v >= 0) || largo <= 0) return null;
    u = factorUCaso2(x, largo);
  } else if (campos.transmision === TRANSMISION[2]) {
    const uv = num("uManual");
    if (!Number.isFinite(uv) || uv <= 0 || uv > 1) return null;
    u = uv;
  }

  try {
    return calcularTraccion({
      familia: sec.familia,
      params: sec.params,
      lM: n.l,
      fyPa: n.fy * 1e6,
      fuPa: n.fu * 1e6,
      agujeros,
      zigzag,
      u,
      pRequeridaKN: n.p,
    });
  } catch {
    return null;
  }
}

export type ResueltoTraccionAcero = NonNullable<ReturnType<typeof resolverTraccionAcero>>;
