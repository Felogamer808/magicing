import { aNumero } from "@/lib/verificaciones/formato";
import { seccionDesdeCampos } from "@/lib/calc/acero/seccion-campos";
import { calcularCompresion, type DatosColumnaArmada, type TipoConectorArmada } from "@/lib/calc/acero/compresion";
import { propiedades, type Familia } from "@/lib/calc/acero/perfiles";

export const CONEXION = ["Continua (soldadura corrida)", "Intermitente (conectores espaciados)"] as const;
export const TIPO_CONECTOR = ["Atornillado sin pretensar", "Soldado o atornillado pretensado (clase A/B)"] as const;

export function tipoConectorDesde(etiqueta: string): TipoConectorArmada {
  return etiqueta === TIPO_CONECTOR[0] ? "atornillado-sin-pretensar" : "soldado-o-pretensado";
}

/**
 * Cálculo de la página a partir de sus campos, tal como se cargaron.
 *
 * Vive acá y no en la página porque lo corren la pantalla y las
 * recomendaciones, que lo repiten con un dato cambiado: con dos copias, tarde
 * o temprano dirían números distintos.
 */
export function resolverCompresionAcero(campos: Record<string, string>) {
  const num = (clave: string) => aNumero(campos[clave] ?? "");
  const sec = seccionDesdeCampos((campos.familia ?? "") as Familia, campos.params ?? "");

  // El art. E4 sólo aplica a secciones doblemente simétricas: el PNC suelto
  // queda afuera, todo lo demás del catálogo de este módulo lo es.
  let esDoblementeSimetrica = false;
  if (sec.completos) {
    try {
      esDoblementeSimetrica = propiedades(sec.familia, sec.params).doblementeSimetrica;
    } catch {
      esDoblementeSimetrica = false;
    }
  }
  const pideColumnaArmada = sec.familia === "2PNC-almas" && campos.conexion === CONEXION[1];

  const n = { lcx: num("lcx"), lcy: num("lcy"), fy: num("fy"), e: num("e"), p: num("pRequerida") };
  if (!sec.completos) return null;
  if (!Object.values(n).every((x) => Number.isFinite(x) && x > 0)) return null;

  const nKzl = num("kzl");
  if (esDoblementeSimetrica && !(Number.isFinite(nKzl) && nKzl > 0)) return null;

  let columnaArmada: DatosColumnaArmada | undefined;
  if (pideColumnaArmada) {
    const aM = num("separacionConectores");
    if (!Number.isFinite(aM) || aM <= 0) return null;
    columnaArmada = { aM, tipo: tipoConectorDesde(campos.tipoConector ?? "") };
  }

  try {
    return calcularCompresion({
      familia: sec.familia,
      params: sec.params,
      lcxM: n.lcx,
      lcyM: n.lcy,
      fyPa: n.fy * 1e6,
      ePa: n.e * 1e6,
      pRequeridaKN: n.p,
      kzLM: esDoblementeSimetrica ? nKzl : undefined,
      columnaArmada,
    });
  } catch {
    return null;
  }
}

export type ResueltoCompresionAcero = NonNullable<ReturnType<typeof resolverCompresionAcero>>;
