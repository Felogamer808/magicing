import { aNumero } from "@/lib/verificaciones/formato";
import { calcularMuro } from "@/lib/calc/hormigon/muros/portante";
import { derivarMateriales } from "@/lib/calc/hormigon/comun/materiales";
import {
  calcularFluencia,
  cementoDesdeNombre,
  exposicionDesdeNombre,
  perimetroExpuestoM,
  tamanoTeoricoMm,
} from "@/lib/calc/hormigon/comun/diferidas";

/** Casos de coacción de la figura A19.5.7, con su factor de longitud efectiva. */
export const COACCIONES = [
  "Biarticulado (β = 1,0)",
  "Un extremo empotrado (β = 0,7)",
  "Biempotrado (β = 0,5)",
  "En ménsula (β = 2,0)",
] as const;

export const BETA: Record<string, number> = {
  [COACCIONES[0]]: 1,
  [COACCIONES[1]]: 0.7,
  [COACCIONES[2]]: 0.5,
  [COACCIONES[3]]: 2,
};

/**
 * Cálculo de la página a partir de sus campos, tal como se cargaron.
 *
 * Vive acá y no en la página porque lo corren la pantalla y las
 * recomendaciones, que lo repiten con un dato cambiado: con dos copias, tarde
 * o temprano dirían números distintos.
 */
export function resolverMuro(campos: Record<string, string>) {
  const num = (clave: string) => aNumero(campos[clave] ?? "");

  // En un muro las dos caras grandes son las que secan: h0 = 2·(L·h)/u. Se
  // recalcula acá para que un cambio de espesor arrastre la fluencia.
  const exposicion = exposicionDesdeNombre(campos.exposicion ?? "", "cuatro-caras");
  const h0Mm = tamanoTeoricoMm(num("longitud") * num("espesor"), perimetroExpuestoM(exposicion, num("longitud"), num("espesor")));
  const phiBasica = calcularFluencia({
    fckMPa: num("fck"),
    hrPct: num("hr"),
    t0Dias: num("t0"),
    claseCemento: cementoDesdeNombre(campos.cemento ?? ""),
    h0Mm,
  }).phi;

  const n = {
    fck: num("fck"), fyk: num("fyk"),
    espesor: num("espesor"), longitud: num("longitud"), altura: num("altura"),
    rec: num("rec"), nEd: num("nEd"), m01: num("m01"), m02: num("m02"),
    relacionMqp: num("relacionMqp"),
    phiV: num("phiV"), sepV: num("sepV"), phiH: num("phiH"), sepH: num("sepH"),
  };
  const positivos = [n.fck, n.fyk, n.espesor, n.longitud, n.altura, n.rec, n.nEd,
                     n.phiV, n.sepV, n.phiH, n.sepH];
  if (!positivos.every((x) => Number.isFinite(x) && x > 0)) return null;
  if (![n.m01, n.m02, n.relacionMqp].every((x) => Number.isFinite(x) && x >= 0)) return null;
  // La fracción cuasipermanente no puede pasar del momento total.
  if (n.relacionMqp > 1) return null;
  // El recubrimiento tiene que dejar canto útil de los dos lados.
  if (2 * n.rec >= n.espesor) return null;
  if (Math.abs(n.m01) > Math.abs(n.m02)) return null;

  return {
    n,
    r: calcularMuro(
      derivarMateriales({ fck: n.fck, fyk: n.fyk }),
      {
        espesorM: n.espesor, longitudM: n.longitud, alturaLibreM: n.altura,
        beta: BETA[campos.coaccion] ?? 1, recubrimientoMecanicoM: n.rec,
      },
      {
        diametroVerticalMm: n.phiV, separacionVerticalMm: n.sepV,
        diametroHorizontalMm: n.phiH, separacionHorizontalMm: n.sepH,
        dosCaras: true,
      },
      {
        nEdKN: n.nEd, m01KNm: n.m01, m02KNm: n.m02,
        fluenciaBasica: phiBasica,
        relacionMomentoCuasipermanente: n.relacionMqp,
      },
      n.fyk
    ),
  };
}

export type ResueltoMuro = NonNullable<ReturnType<typeof resolverMuro>>;
