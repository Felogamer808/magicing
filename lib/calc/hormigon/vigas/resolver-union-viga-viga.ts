import { aNumero } from "@/lib/verificaciones/formato";
import {
  calcularUnionVigaViga,
  type GrupoBarras,
  type PosicionBarras,
  type Rugosidad,
} from "@/lib/calc/hormigon/vigas/union-viga-viga";

/** Cuántos grupos de barras ofrece la página. */
export const GRUPOS_UNION = 3;

/**
 * Cálculo de la página a partir de sus campos, tal como se cargaron. Vive acá
 * y no en la página para que la pantalla y el MCP calculen lo mismo.
 *
 * Los esfuerzos entran en kN y kN·m, como en el resto de la herramienta, y se
 * pasan acá a N y N·mm, que son las unidades del motor.
 */
export function resolverUnionVigaViga(campos: Record<string, string>) {
  const num = (clave: string) => aNumero(campos[clave] ?? "");
  const falla = (motivo: string) => ({ ok: false as const, motivo });

  const v = {
    fck: num("fck"), gammaC: num("gammaC"), fyk: num("fyk"), gammaS: num("gammaS"),
    b: num("b"), h: num("h"), d: num("d"), vd: num("vd"),
  };
  if (!Object.values(v).every((n) => Number.isFinite(n) && n > 0)) {
    return falla("Hay datos vacíos o no válidos: fck, fyk, γc, γs, b, h, d y Vd tienen que ser positivos.");
  }
  if (v.fck > 50) return falla("fct,d = 0,21·fck^(2/3)/γc vale sólo para fck ≤ 50 MPa.");
  if (v.d >= v.h) return falla("El canto útil d tiene que ser menor que h.");

  // Opcionales: en blanco valen 0.
  const ndTexto = aNumero(campos.nd ?? "");
  const nd = Number.isFinite(ndTexto) ? ndTexto : 0;
  const rugosidad: Rugosidad = campos.rugosidad === "alta" ? "alta" : "baja";
  const conMomento = campos.union === "momento";
  const cargaDinamica = campos.dinamica === "si";

  let md = 0;
  let z = 0.9 * v.d;
  let zPorDefecto = true;
  if (conMomento) {
    md = aNumero(campos.md ?? "");
    if (!(Number.isFinite(md) && md >= 0)) return falla("Con unión con momento, Md tiene que ser un número no negativo.");
    const zTexto = aNumero(campos.z ?? "");
    if (Number.isFinite(zTexto) && zTexto > 0) {
      z = zTexto;
      zPorDefecto = false;
    }
  }

  const grupos: GrupoBarras[] = [];
  for (let i = 1; i <= GRUPOS_UNION; i++) {
    const numero = aNumero(campos[`numero${i}`] ?? "");
    if (!Number.isFinite(numero) || numero === 0) continue; // grupo vacío
    const diametro = aNumero(campos[`diametro${i}`] ?? "");
    if (numero < 0 || !Number.isInteger(numero) || !(Number.isFinite(diametro) && diametro > 0)) {
      return falla(`Grupo ${i}: la cantidad tiene que ser un entero positivo y el Ø mayor que 0.`);
    }
    const posicion: PosicionBarras = campos[`posicion${i}`] === "inferior" ? "inferior" : "superior";
    grupos.push({ numero, diametroMm: diametro, posicion });
  }
  if (grupos.length === 0) return falla("Falta al menos un grupo de barras que cosa la junta.");

  const r = calcularUnionVigaViga(
    { fckMPa: v.fck, gammaC: v.gammaC, fykMPa: v.fyk, gammaS: v.gammaS },
    {
      bMm: v.b,
      hMm: v.h,
      grupos,
      vdN: v.vd * 1000,
      ndN: nd * 1000,
      rugosidad,
      mdNmm: md * 1e6,
      zMm: z,
      cargaDinamica,
    }
  );
  return {
    ok: true as const,
    v: { ...v, nd, md, z, zPorDefecto, rugosidad, conMomento, cargaDinamica, grupos },
    r,
  };
}

export type ResueltoUnionVigaViga = Extract<ReturnType<typeof resolverUnionVigaViga>, { ok: true }>;
