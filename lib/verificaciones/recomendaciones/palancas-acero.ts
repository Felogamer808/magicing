import { parametrosDe, type ClaveParametro, type Familia } from "@/lib/calc/acero/perfiles";
import { seccionDesdeCampos } from "@/lib/calc/acero/seccion-campos";
import { fmt } from "@/lib/verificaciones/formato";
import type { Palanca } from "./motor";
import { campo, m, palancaValor, type Campos } from "./palancas";

/**
 * Palancas de las páginas de metálicas. La sección se guarda como familia más
 * un campo con los parámetros serializados, así que cambiar el perfil es
 * reescribir ese campo con un parámetro distinto.
 */

const NOMBRE_CORTO: Record<Familia, string> = {
  PNI: "PNI",
  PNC: "PNC",
  "2PNC-almas": "2 PNC",
  "2PNC-cajon": "2 PNC en cajón",
  HEB: "HEB",
  "tubo-redondo": "Tubo",
  "tubo-rectangular": "Tubo",
};

function conParametro(e: Campos, clave: ClaveParametro, valor: number): Campos {
  const sec = seccionDesdeCampos((e.familia ?? "") as Familia, e.params ?? "");
  return { ...e, params: JSON.stringify({ ...sec.paramsTexto, [clave]: String(valor).replace(".", ",") }) };
}

/** El perfil siguiente del catálogo, en las familias que se eligen por altura. */
export const PERFIL_SIGUIENTE: Palanca<Campos> = {
  efectoColateral: "Perfil más pesado: revisar uniones y apoyos.",
  *candidatos(e) {
    const familia = (e.familia ?? "") as Familia;
    const sec = seccionDesdeCampos(familia, e.params ?? "");
    for (const p of parametrosDe(familia)) {
      if (p.tipo !== "lista" || !p.opciones) continue;
      const hoy = sec.params[p.clave] ?? 0;
      for (const o of p.opciones.filter((x) => x > hoy)) {
        yield {
          datos: conParametro(e, p.clave, o),
          accion: `${NOMBRE_CORTO[familia]} ${o} (hoy ${NOMBRE_CORTO[familia]} ${fmt(hoy, 0)})`,
        };
      }
    }
  },
};

/** En los tubos, que se cargan por medidas: más espesor de pared. */
export const ESPESOR_TUBO: Palanca<Campos> = {
  efectoColateral: "Tubo más pesado, mismas medidas exteriores.",
  *candidatos(e) {
    const familia = (e.familia ?? "") as Familia;
    if (!familia.startsWith("tubo")) return;
    const hoy = seccionDesdeCampos(familia, e.params ?? "").params.espesor ?? 0;
    for (let t = Math.floor(hoy) + 1; t <= hoy + 10; t++) {
      yield { datos: conParametro(e, "espesor", t), accion: `Espesor = ${t} mm (hoy ${fmt(hoy, 1)} mm)` };
    }
  },
};

/** En los tubos: la medida exterior principal, de a 20 mm. */
export const MEDIDA_TUBO: Palanca<Campos> = {
  efectoColateral: "Tubo más grande: revisar que entre en el detalle.",
  *candidatos(e) {
    const familia = (e.familia ?? "") as Familia;
    const clave: ClaveParametro | null = familia === "tubo-redondo" ? "diametro" : familia === "tubo-rectangular" ? "alto" : null;
    if (!clave) return;
    const hoy = seccionDesdeCampos(familia, e.params ?? "").params[clave] ?? 0;
    const rotulo = clave === "diametro" ? "Diámetro" : "Alto";
    for (let i = 1; i <= 15; i++) {
      const v = Math.round(hoy + 20 * i);
      yield { datos: conParametro(e, clave, v), accion: `${rotulo} = ${v} mm (hoy ${fmt(hoy, 1)} mm)` };
    }
  },
};

/** Las palancas de sección, en orden: el catálogo primero. */
export const SECCION: readonly Palanca<Campos>[] = [PERFIL_SIGUIENTE, ESPESOR_TUBO, MEDIDA_TUBO];

/** Arriostrar más seguido: la longitud no arriostrada que se carga, de a 0,25 m. */
export const longitudMenor = (nombre: string, rotulo: string, efectoColateral: string) =>
  palancaValor(campo(nombre), {
    paso: -0.25,
    tope: () => 0.25,
    decimales: 2,
    rotulo,
    texto: m,
    efectoColateral,
  });

/** Un acero de mayor fluencia; sólo los grados habituales. */
export const fyMayor = (nombre: string): Palanca<Campos> => ({
  efectoColateral: "Otro grado de acero: confirmar disponibilidad.",
  *candidatos(e) {
    const hoy = campo(nombre).leer(e);
    for (const fy of [345, 355, 450].filter((x) => x > hoy)) {
      yield { datos: campo(nombre).escribir(e, fy), accion: `Fy = ${fy} MPa (hoy ${fmt(hoy, 0)})` };
    }
  },
});
