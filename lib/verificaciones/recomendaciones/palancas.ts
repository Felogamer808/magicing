import { DIAMETROS_ARMADURA } from "@/lib/calc/armaduras";
import { fmt } from "@/lib/verificaciones/formato";
import { CLASES_FCK, pasos, type Palanca } from "./motor";

/**
 * Palancas que se repiten entre verificaciones, escritas sobre un dato
 * cualquiera de la entrada: se le dice cómo leerlo y cómo escribirlo, y la
 * palanca arma los pasos y el texto "valor nuevo (hoy valor actual)".
 */

interface Dato<E> {
  leer: (e: E) => number;
  escribir: (e: E, v: number) => E;
}

interface Extra {
  efectoColateral?: string;
  cita?: string;
  /** Lo que se cambia, delante del valor nuevo y no del de hoy: "H = ", "A: ". */
  rotulo?: string;
}

/** Un dato que se agranda (o se achica, con `paso` negativo) hasta un tope. */
export function palancaValor<E>(
  dato: Dato<E>,
  opciones: Extra & { paso: number; tope: (hoy: number) => number; texto: (v: number, e: E) => string; decimales?: number }
): Palanca<E> {
  const { paso, tope, texto, decimales = 3, rotulo = "", ...extra } = opciones;
  return {
    ...extra,
    *candidatos(e) {
      const hoy = dato.leer(e);
      const sube = paso > 0;
      const valores = sube
        ? pasos(hoy, paso, tope(hoy), decimales)
        : [...pasos(-hoy, -paso, -tope(hoy), decimales)].map((v) => -v);
      for (const v of valores) {
        if (!(v > 0)) return;
        yield { datos: dato.escribir(e, v), accion: `${rotulo}${texto(v, e)} (hoy ${texto(hoy, e)})` };
      }
    },
  };
}

/** Metros con dos decimales. */
export const m = (v: number) => `${fmt(v, 2)} m`;

/** Clases de hormigón por encima de la actual. */
export function palancaFck<E>(dato: Dato<E>): Palanca<E> {
  return {
    efectoColateral: "Cambia el hormigón de todo el elemento.",
    *candidatos(e) {
      const hoy = dato.leer(e);
      for (const fck of CLASES_FCK.filter((c) => c > hoy)) {
        yield { datos: dato.escribir(e, fck), accion: `fck = ${fck} MPa (hoy ${fmt(hoy, 0)})` };
      }
    },
  };
}

/** Diámetros comerciales mayores, o menores, que el actual. */
export function palancaDiametro<E>(
  dato: Dato<E>,
  sentido: "mayor" | "menor",
  texto: (e: E, d: number) => string,
  { rotulo = "", ...extra }: Extra = {}
): Palanca<E> {
  return {
    ...extra,
    *candidatos(e) {
      const hoy = dato.leer(e);
      const lista = DIAMETROS_ARMADURA.filter((d) => (sentido === "mayor" ? d > hoy : d < hoy));
      for (const d of sentido === "mayor" ? lista : [...lista].reverse()) {
        yield { datos: dato.escribir(e, d), accion: `${rotulo}${texto(e, d)} (hoy ${texto(e, hoy)})` };
      }
    },
  };
}

/** Un cambio de una sola opción, como pasar a patilla. */
export function palancaOpcion<E>(aplica: (e: E) => boolean, datos: (e: E) => E, accion: string, extra: Extra = {}): Palanca<E> {
  return {
    ...extra,
    *candidatos(e) {
      if (aplica(e)) yield { datos: datos(e), accion };
    },
  };
}

export const CITA_LBD_DIAMETRO = "Anejo 19, art. 8.4.3 (2), ec. (8.3), pág. 124";
export const CITA_PATILLA = "Anejo 19, art. 8.4.3 (3), pág. 124: la patilla cuenta a lo largo del eje";
export const CITA_TIRANTE = "CTE DB SE-C, art. 4.1.1 (6), pág. 25";

export const EFECTO_H = "Más canto: más hormigón y excavación, y crece la armadura mínima.";
export const EFECTO_PILAR = "Cambia la sección del pilar: hay que revisarlo también.";
export const EFECTO_BRAZO = "El tirante va más arriba: tiene que haber dónde anclarlo a esa altura.";
