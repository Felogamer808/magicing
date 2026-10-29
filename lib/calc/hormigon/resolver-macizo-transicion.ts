import { aNumero } from "@/lib/verificaciones/formato";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";
import type { FormaAnclaje } from "@/lib/calc/hormigon/comun/anclaje";
import { calcularMacizoTransicion } from "@/lib/calc/hormigon/macizo-transicion";

/**
 * Cálculo de la página a partir de sus campos, tal como se cargaron. Vive acá
 * y no en la página para que la pantalla y el MCP calculen lo mismo.
 *
 * Devuelve el motivo cuando los datos no alcanzan, para que la revisión diga
 * cuál falta en vez de un aviso genérico.
 */
export function resolverMacizoTransicion(campos: Record<string, string>) {
  const num = (clave: string) => aNumero(campos[clave] ?? "");

  const v = {
    fck: num("fck"), fyk: num("fyk"), nEd: num("nEd"),
    h: num("h"), ancho: num("ancho"), profundidad: num("profundidad"), recubrimiento: num("recubrimiento"),
    supPlano: num("supPlano"), supTransversal: num("supTransversal"),
    infPlano: num("infPlano"), infTransversal: num("infTransversal"),
    e: num("e"),
    numeroTirante: num("numeroTirante"), diametroTirante: num("diametroTirante"),
    numeroEsperas: num("numeroEsperas"), diametroEsperas: num("diametroEsperas"),
    diametroEstribo: num("diametroEstribo"),
  };
  // Opcionales: en blanco valen 0.
  const mEd = aNumero(campos.mEd ?? "") || 0;
  const borde = aNumero(campos.bordeTraccionado ?? "") || 0;
  const forma: FormaAnclaje = campos.formaTirante === "recta" ? "recta" : "gancho";

  const falla = (motivo: string) => ({ ok: false as const, motivo });
  const { e, ...positivos } = v;
  if (!Object.values(positivos).every((n) => Number.isFinite(n) && n > 0) || !(Number.isFinite(e) && e >= 0)) {
    return falla("Hay datos vacíos o no válidos: todos tienen que ser positivos (e puede ser 0; Md y el borde pueden quedar en blanco).");
  }
  if (borde < 0) return falla("El borde del lado de las esperas no puede ser negativo.");
  const eTotal = v.e + mEd / v.nEd;
  if (eTotal < 0) {
    return falla("Con ese Md la carga pasa al otro lado del eje del pilar inferior: cargar la excentricidad hacia ese lado y el Md con el signo cambiado.");
  }
  // Los dos pilares dentro del macizo, en el plano y transversalmente.
  const yIni = -v.infPlano / 2 - borde;
  const yFin = yIni + v.ancho;
  if (v.infPlano / 2 > yFin + 1e-9) return falla("El pilar inferior no entra en el macizo: el ancho no alcanza con ese borde.");
  if (eTotal - v.supPlano / 2 < yIni - 1e-9 || eTotal + v.supPlano / 2 > yFin + 1e-9) {
    return falla("El pilar superior, con su excentricidad, se sale del macizo en el plano.");
  }
  if (v.supTransversal > v.profundidad + 1e-9 || v.infTransversal > v.profundidad + 1e-9) {
    return falla("Un pilar es más ancho que el macizo en la dirección transversal.");
  }

  const materiales = derivarMateriales({ fck: v.fck, fyk: v.fyk });
  const r = calcularMacizoTransicion(
    materiales,
    {
      hM: v.h,
      anchoM: v.ancho,
      profundidadM: v.profundidad,
      recubrimientoM: v.recubrimiento,
      pilarSuperior: { enPlanoM: v.supPlano, transversalM: v.supTransversal },
      pilarInferior: { enPlanoM: v.infPlano, transversalM: v.infTransversal },
      excentricidadM: v.e,
      bordeTraccionadoM: borde,
    },
    {
      nEdKN: v.nEd,
      mEdKNm: mEd,
      tirante: { numero: v.numeroTirante, diametroMm: v.diametroTirante },
      esperas: { numero: v.numeroEsperas, diametroMm: v.diametroEsperas },
      diametroEstriboMm: v.diametroEstribo,
      formaAnclajeTirante: forma,
    }
  );
  return { ok: true as const, v: { ...v, mEd, borde, forma }, materiales, r };
}

export type ResueltoMacizoTransicion = Extract<ReturnType<typeof resolverMacizoTransicion>, { ok: true }>;
